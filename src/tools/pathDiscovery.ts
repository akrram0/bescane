import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';

/**
 * System binaries and known non-developer tools to skip.
 * Keeps the discovery focused on developer tools & CLI agents.
 */
const SYSTEM_IGNORE = new Set([
  'cmd', 'cmd.exe',
  'powershell', 'powershell.exe',
  'pwsh', 'pwsh.exe',
  'conhost', 'conhost.exe',
  'explorer', 'explorer.exe',
  'notepad', 'notepad.exe',
  'where', 'where.exe',
  'findstr', 'findstr.exe',
  'tasklist', 'tasklist.exe',
  'taskkill', 'taskkill.exe',
  'reg', 'reg.exe',
  'regedit', 'regedit.exe',
  'msiexec', 'msiexec.exe',
  'sfc', 'sfc.exe',
  'chkdsk', 'chkdsk.exe',
  'shutdown', 'shutdown.exe',
  'whoami', 'whoami.exe',
  'hostname', 'hostname.exe',
  'ipconfig', 'ipconfig.exe',
  'ping', 'ping.exe',
  'netsh', 'netsh.exe',
  'net', 'net.exe',
  'net1', 'net1.exe',
  'certutil', 'certutil.exe',
  'attrib', 'attrib.exe',
  'xcopy', 'xcopy.exe',
  'robocopy', 'robocopy.exe',
  'mode', 'mode.com',
  'more', 'more.com',
  'clip', 'clip.exe',
  'sort', 'sort.exe',
  'timeout', 'timeout.exe',
  'choice', 'choice.exe',
  'fc', 'fc.exe',
  'comp', 'comp.exe',
  'tree', 'tree.com',
  'cacls', 'cacls.exe',
  'icacls', 'icacls.exe',
  'wmic', 'wmic.exe',
  'systeminfo', 'systeminfo.exe',
  'gpupdate', 'gpupdate.exe',
  'mshta', 'mshta.exe',
  'wscript', 'wscript.exe',
  'cscript', 'cscript.exe',
  'rundll32', 'rundll32.exe',
  'mstsc', 'mstsc.exe',
  'calc', 'calc.exe',
  'control', 'control.exe',
  'msconfig', 'msconfig.exe',
  'dxdiag', 'dxdiag.exe',
  'winver', 'winver.exe',
]);

/**
 * Sub-tools that belong to known ecosystems detected in Phase 1.
 * These are binaries shipped alongside or managed by already-detected tools.
 */
const ECOSYSTEM_SUBTOOLS = new Set([
  // Node.js / npm / pnpm ecosystem
  'npm', 'npx', 'corepack',
  'pnpm', 'pnpx', 'pn', 'pnx',
  'yarn', 'yarnpkg',
  'node-gyp', 'node-pre-gyp',
  'tsc', 'tsserver', 'tslib',
  'nopt', 'semver', 'which', 'rimraf',
  // VS Code sub-binaries
  'code', 'code-tunnel', 'code-insiders',
  'new_code', 'new_code-tunnel',
  // Antigravity internal
  'agy-node', 'agy-npx', 'agy-npm',
  // Rust sub-tools
  'rustup', 'rustc', 'rustdoc', 'rustfmt', 'clippy-driver',
  'cargo-fmt', 'cargo-clippy', 'cargo-miri',
  // Python sub-tools
  'pip', 'pip3', 'python3', 'pydoc', 'idle',
  // Git sub-tools
  'gitk', 'git-gui', 'git-bash', 'bash', 'sh',
  'tig', 'scalar',
]);

/**
 * Developer file extensions that indicate a CLI tool.
 * We prefer .exe over .cmd over .bat — deduplicate by base name.
 */
const DEV_EXTENSIONS = new Set(['.exe', '.cmd', '.bat', '.ps1', '']);

/**
 * Generic PATH Discovery Scanner
 *
 * Scans all directories on the user's PATH for executables not already
 * covered by dedicated scanners. This catches newly installed tools
 * like Deno, Zig, Go, uv, etc. without needing a hardcoded scanner.
 *
 * Security:
 * - Only inspects verified directories (isVerifiedPath)
 * - Skips Windows system directories (System32, SysWOW64)
 * - Skips WindowsApps reparse point redirects
 * - Version probing uses sandboxed safeExec
 */
export class PathDiscoveryScanner {
  /**
   * Discover all unknown executables on PATH, excluding those already found.
   * @param knownIds Set of tool IDs already discovered by dedicated scanners
   * @param knownPaths Set of canonical paths already claimed by dedicated scanners
   */
  async discover(knownIds: Set<string>, knownPaths: Set<string>): Promise<ScannedDevTool[]> {
    const results: ScannedDevTool[] = [];
    const pathDirs = this.getDevPathDirs();
    const seen = new Set<string>(); // Deduplicate across PATH dirs

    for (const dir of pathDirs) {
      let entries: string[];
      try {
        entries = await fs.readdir(dir);
      } catch {
        continue;
      }

      for (const entry of entries) {
        const lowerEntry = entry.toLowerCase();
        const ext = path.extname(lowerEntry);
        const baseName = path.basename(lowerEntry, ext);

        // Skip non-executable extensions
        if (!DEV_EXTENSIONS.has(ext)) continue;
        // Skip system binaries
        if (SYSTEM_IGNORE.has(entry.toLowerCase())) continue;
        if (SYSTEM_IGNORE.has(baseName)) continue;
        // Skip known ecosystem sub-tools (pnpm, tsc, code-tunnel, etc.)
        if (ECOSYSTEM_SUBTOOLS.has(baseName)) continue;
        // Deduplicate by base name (e.g. tsc.exe and tsc.cmd → keep first)
        if (seen.has(baseName)) continue;

        const fullPath = path.join(dir, entry);
        let canonical: string;
        try {
          canonical = getCanonicalPath(fullPath);
        } catch {
          continue;
        }

        // Skip if already claimed by a dedicated scanner
        if (knownPaths.has(canonical.toLowerCase())) continue;
        if (knownPaths.has(path.dirname(canonical).toLowerCase())) continue;
        if (knownIds.has(baseName)) continue;

        // Verify the file actually exists and is in a trusted location
        if (!existsSync(canonical)) continue;
        if (!isVerifiedPath(canonical)) continue;

        // Skip directories posing as executables
        try {
          const stat = statSync(canonical);
          if (stat.isDirectory()) continue;
        } catch {
          continue;
        }

        seen.add(baseName);

        // Try to extract version (best effort, non-blocking with timeout)
        let version: string | null = null;
        try {
          const out = await safeExec(canonical, ['--version']);
          const match = out.match(/v?\d+\.\d+(\.\d+)*/);
          version = match ? match[0] : null;
        } catch {
          // Many binaries don't support --version — that's fine
        }

        // Capitalize display name: "fastfetch" → "Fastfetch", "dotnet" → "Dotnet"
        const displayName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

        results.push({
          id: `discovered:${baseName}`,
          name: displayName,
          canonicalPath: canonical,
          version,
          diskUsageBytes: 0, // Skip size computation for speed
          associatedCachePaths: [],
          isVerifiedPath: true
        });
      }
    }

    return results;
  }

  /**
   * Extract developer-relevant directories from PATH.
   * Filters out Windows system dirs, WindowsApps, and unverified locations.
   */
  private getDevPathDirs(): string[] {
    const pathStr = process.env.PATH || process.env.Path || '';
    const dirs = pathStr.split(';').map(d => d.trim()).filter(Boolean);

    const systemRoot = (process.env.SystemRoot || 'C:\\Windows').toLowerCase();

    return dirs.filter(dir => {
      const lower = dir.toLowerCase();

      // Skip Windows system directories
      if (lower.includes(path.join(systemRoot, 'system32').toLowerCase())) return false;
      if (lower.includes(path.join(systemRoot, 'syswow64').toLowerCase())) return false;
      if (lower.includes('windowsapps')) return false;
      if (lower === systemRoot) return false;

      // Must exist and be in a verified location
      if (!existsSync(dir)) return false;
      if (!isVerifiedPath(dir)) return false;

      return true;
    });
  }
}
