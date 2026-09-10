import { ScannedDevTool } from './types';

// Zero-dependency ANSI colors and terminal styling
export const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  bgDark: '\x1b[100m'
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function getDisplayWidth(str: string): number {
  const clean = stripAnsi(str);
  let width = 0;
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    // Emoji, pictographs, and wide characters
    if (
      (code >= 0x1F300 && code <= 0x1FAFF) ||
      (code >= 0x2600 && code <= 0x27BF) ||
      (code >= 0x2300 && code <= 0x23FF) ||
      (code >= 0x2B00 && code <= 0x2BFF)
    ) {
      width += 2;
    } else if (code === 0xFE0F || code === 0xFE0E) {
      width += 0;
    } else {
      width += 1;
    }
  }
  return width;
}

export function padVisible(str: string, targetLength: number): string {
  const visibleLength = getDisplayWidth(str);
  const diff = targetLength - visibleLength;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

export const TOOL_ICONS: Record<string, string> = {
  node: '⬢',
  vscode: '💻',
  opencode: '🤖',
  'claude-code': '🧠',
  aider: '🦾',
  ollama: '🦙',
  cursor: '🖱️',
  copilot: '✈️',
  antigravity: '🌌',
  python: '🐍',
  bun: '🥟',
  rust: '🦀',
  git: '🌿',
  android: '📱'
};

export function renderBanner() {
  console.log(`
${c.brightCyan}  ██████╗ ███████╗███████╗ ██████╗ █████╗ ███╗   ██╗███████╗
  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗████╗  ██║██╔════╝
  ██████╔╝█████╗  ███████╗██║     ███████║██╔██╗ ██║█████╗  
  ██╔══██╗██╔══╝  ╚════██║██║     ██╔══██║██║╚██╗██║██╔══╝  
  ██████╔╝███████╗███████║╚██████╗██║  ██║██║ ╚████║███████╗
  ╚═════╝ ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝${c.reset}
  ${c.bold}${c.brightWhite}Zero-Trust Local Dev Tool Discovery & Storage Footprint${c.reset}
  ${c.dim}${c.cyan}100% Local • Zero Telemetry • Least-Privilege Execution${c.reset}
`);
}

export function renderMetrics(results: ScannedDevTool[]) {
  const totalDisk = results.reduce((acc, r) => acc + r.diskUsageBytes, 0);
  const totalTools = results.length;
  const verifiedCount = results.filter(r => r.isVerifiedPath).length;
  const verifiedPct = totalTools > 0 ? Math.round((verifiedCount / totalTools) * 100) : 100;

  const boxWidth = 76;
  const col1 = `  ${c.cyan}◈${c.reset} Tools: ${c.bold}${c.brightGreen}${totalTools} active${c.reset}`;
  const col2 = `  ${c.yellow}◈${c.reset} Storage: ${c.bold}${c.brightYellow}${formatBytes(totalDisk)}${c.reset}`;
  const col3 = `  ${c.brightGreen}◈${c.reset} Integrity: ${c.bold}${verifiedPct === 100 ? c.brightGreen : c.brightYellow}${verifiedPct}% Safe${c.reset}`;

  console.log(`${c.dim}╭──────────────────────────┬──────────────────────────┬──────────────────────────╮${c.reset}`);
  console.log(`${c.dim}│${c.reset}${padVisible(col1, 26)}${c.dim}│${c.reset}${padVisible(col2, 26)}${c.dim}│${c.reset}${padVisible(col3, 26)}${c.dim}│${c.reset}`);
  console.log(`${c.dim}╰──────────────────────────┴──────────────────────────┴──────────────────────────╯${c.reset}\n`);
}

export function renderToolCard(tool: ScannedDevTool) {
  const icon = TOOL_ICONS[tool.id] || '⚡';
  const nameDisplay = `${icon} ${tool.name}`;
  const versionBadge = tool.version ? `${c.brightGreen}${c.bold}[ ${tool.version} ]${c.reset}` : `${c.gray}[ Unknown ]${c.reset}`;
  const verifiedBadge = tool.isVerifiedPath
    ? `${c.brightGreen}✔ Verified Path${c.reset}`
    : `${c.brightRed}⚠️ Untrusted Path${c.reset}`;
  const sizeBadge = `${c.bold}${c.brightYellow}${formatBytes(tool.diskUsageBytes)}${c.reset}`;

  const headerLine = ` ${c.bold}${c.brightWhite}${nameDisplay}${c.reset} ${versionBadge}`;
  const width = 76;

  const headerLen = stripAnsi(headerLine).length;
  const fillWidth = Math.max(2, width - headerLen - 4);
  console.log(`${c.brightCyan}╭──${c.reset}${headerLine} ${c.dim}${'─'.repeat(fillWidth)}${c.brightCyan}╮${c.reset}`);
  console.log(`${c.dim}│${c.reset}  ${c.gray}Binary:${c.reset}    ${c.white}${tool.canonicalPath}${c.reset}`);
  console.log(`${c.dim}│${c.reset}  ${c.gray}Footprint:${c.reset} ${sizeBadge}  ${c.dim}•${c.reset}  ${verifiedBadge}`);

  if (tool.associatedCachePaths && tool.associatedCachePaths.length > 0) {
    console.log(`${c.dim}│${c.reset}  ${c.gray}Caches:${c.reset}`);
    tool.associatedCachePaths.forEach((cp, idx) => {
      const isLast = idx === tool.associatedCachePaths.length - 1;
      const prefix = isLast ? '└─' : '├─';
      console.log(`${c.dim}│${c.reset}    ${c.dim}${prefix}${c.reset} ${c.dim}${cp}${c.reset}`);
    });
  }

  console.log(`${c.brightCyan}╰${'─'.repeat(width - 2)}╯${c.reset}\n`);
}
