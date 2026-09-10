import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from './paths';
import { safeExec } from './exec';

// In-memory directory entry cache for sub-millisecond repeated searches
const dirCache = new Map<string, Set<string>>();

// Global where.exe result cache — avoids spawning duplicate processes
const whereCache = new Map<string, string | null>();

/**
 * High-speed cached directory reader. Returns a lowercase Set for O(1) lookups.
 */
async function getCachedEntries(dir: string): Promise<Set<string>> {
  const canonical = getCanonicalPath(dir);
  if (dirCache.has(canonical)) {
    return dirCache.get(canonical)!;
  }

  if (!existsSync(canonical)) {
    const empty = new Set<string>();
    dirCache.set(canonical, empty);
    return empty;
  }

  try {
    const entries = await fs.readdir(canonical);
    const set = new Set(entries.map(e => e.toLowerCase()));
    dirCache.set(canonical, set);
    return set;
  } catch {
    const empty = new Set<string>();
    dirCache.set(canonical, empty);
    return empty;
  }
}

/**
 * Cached where.exe lookup — spawns where.exe at most once per binary name across all scanners.
 */
async function cachedWhere(name: string): Promise<string | null> {
  if (whereCache.has(name)) {
    return whereCache.get(name)!;
  }

  try {
    const whereOut = await safeExec('where.exe', [name]);
    const lines = whereOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.toLowerCase().includes('windowsapps')) continue;
      const canonical = getCanonicalPath(line);
      if (existsSync(canonical) && isVerifiedPath(canonical)) {
        whereCache.set(name, canonical);
        return canonical;
      }
    }
  } catch {
    // where.exe exits with 1 when not found
  }

  whereCache.set(name, null);
  return null;
}

/**
 * Recognized standard developer and package manager binary roots
 */
let standardRootsCache: string[] | null = null;
function getStandardBinaryRoots(): string[] {
  if (standardRootsCache) return standardRootsCache;

  standardRootsCache = [
    expandEnvironmentStrings('%LOCALAPPDATA%\\pnpm\\bin'),
    expandEnvironmentStrings('%LOCALAPPDATA%\\pnpm'),
    expandEnvironmentStrings('%APPDATA%\\npm'),
    expandEnvironmentStrings('%LOCALAPPDATA%\\Yarn\\bin'),
    expandEnvironmentStrings('%USERPROFILE%\\.cargo\\bin'),
    expandEnvironmentStrings('%USERPROFILE%\\.local\\bin'),
    expandEnvironmentStrings('%USERPROFILE%\\.bun\\bin'),
    expandEnvironmentStrings('%USERPROFILE%\\bin'),
    expandEnvironmentStrings('%USERPROFILE%\\scoop\\shims'),
    expandEnvironmentStrings('%LOCALAPPDATA%\\Microsoft\\WinGet\\Links'),
    expandEnvironmentStrings('%PROGRAMFILES%\\nodejs'),
    expandEnvironmentStrings('%LOCALAPPDATA%\\Programs')
  ].filter(r => r && existsSync(r));

  return standardRootsCache;
}

export interface BinarySearchOptions {
  names: string[];
  customDirs?: string[];
  extensions?: string[];
  shallowSubdirSearch?: boolean;
}

/**
 * Smart, Fast, Secure Binary Locator (v2)
 *
 * Optimizations over v1:
 * - Directory entries cached as lowercase Sets for O(1) membership checks
 * - where.exe results cached globally — never spawns duplicate processes
 * - Standard binary roots computed once and reused
 * - Redundant existsSync calls eliminated (trust cache, verify only final candidate)
 * - getCanonicalPath is memoized upstream
 */
export async function findBinary(options: BinarySearchOptions): Promise<string | null> {
  const extensions = options.extensions || (process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']);
  const standardRoots = getStandardBinaryRoots();
  const searchRoots = [...(options.customDirs || []).filter(d => existsSync(d)), ...standardRoots];

  // Pass 1: Direct fast lookup across indexed binary roots
  for (const root of searchRoots) {
    const entrySet = await getCachedEntries(root);
    if (entrySet.size === 0) continue;

    for (const name of options.names) {
      for (const ext of extensions) {
        const candidate = (name + ext).toLowerCase();
        if (entrySet.has(candidate)) {
          const fullPath = path.join(root, candidate);
          const canonical = getCanonicalPath(fullPath);
          if (isVerifiedPath(canonical)) {
            return canonical;
          }
        }
      }
    }
  }

  // Pass 2: Shallow 1-level subfolder inspection in Programs & ProgramFiles
  if (options.shallowSubdirSearch) {
    const programRoots = [
      expandEnvironmentStrings('%LOCALAPPDATA%\\Programs'),
      expandEnvironmentStrings('%PROGRAMFILES%'),
      expandEnvironmentStrings('%PROGRAMFILES(X86)%')
    ].filter(r => r && existsSync(r));

    for (const pRoot of programRoots) {
      const subdirs = await getCachedEntries(pRoot);
      for (const sub of subdirs) {
        const subPath = path.join(pRoot, sub);
        // Check if subPath is actually a directory before scanning it
        const subEntries = await getCachedEntries(subPath);
        if (subEntries.size === 0) continue;

        for (const name of options.names) {
          for (const ext of extensions) {
            const candidate = (name + ext).toLowerCase();
            if (subEntries.has(candidate)) {
              const fullPath = path.join(subPath, candidate);
              const canonical = getCanonicalPath(fullPath);
              if (isVerifiedPath(canonical)) {
                return canonical;
              }
            }
          }
        }
      }
    }
  }

  // Pass 3: Cached where.exe fallback
  for (const name of options.names) {
    const result = await cachedWhere(name);
    if (result) return result;
  }

  return null;
}
