<div align="center">

```
  ██████╗ ███████╗███████╗ ██████╗ █████╗ ███╗   ██╗███████╗
  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗████╗  ██║██╔════╝
  ██████╔╝█████╗  ███████╗██║     ███████║██╔██╗ ██║█████╗  
  ██╔══██╗██╔══╝  ╚════██║██║     ██╔══██║██║╚██╗██║██╔══╝  
  ██████╔╝███████╗███████║╚██████╗██║  ██║██║ ╚████║███████╗
  ╚═════╝ ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝
```

**Zero-Trust Local Dev Tool Discovery & Storage Footprint Analyzer**

[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](#zero-dependency-architecture)
[![Air-Gapped](https://img.shields.io/badge/network-air--gapped-blue)](#security)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6)](#requirements)
[![License](https://img.shields.io/badge/license-ISC-yellow)](#license)

</div>

---

## What is Bescane?

Bescane is a lightweight, local-first CLI tool that discovers all development runtimes, editors, AI agents, and toolchains installed on your machine. It resolves their canonical absolute paths, verifies path integrity, calculates on-disk storage footprints, and displays everything in a modern terminal UI.

**No internet. No telemetry. No third-party dependencies. Just raw Node.js.**

---

## Features

- **Two-Phase Discovery Engine**
  - **Phase 1 — Known Registry:** Dedicated scanners for Node.js, Python, Bun, Rust, Git, VS Code, Android SDK, and AI agents (OpenCode, Claude Code, Aider, Ollama, Cursor, Copilot, Antigravity)
  - **Phase 2 — PATH Discovery:** Automatically catches any newly installed tool on your PATH without needing code changes

- **Security-First Architecture**
  - 100% local & air-gapped — zero outbound network calls
  - Sandboxed process execution with environment variable sanitization
  - Anti-spoofing canonical path resolution via `fs.realpathSync`
  - Verified path boundaries (only trusted system/user directories)
  - Safe `.cmd`/`.bat` execution via isolated `ComSpec`

- **Performance Optimizations**
  - Memoized canonical path resolution
  - In-memory directory entry caching with `Set<string>` for O(1) lookups
  - Global `where.exe` result cache (never spawns duplicate processes)
  - Iterative stack-based directory walker (no stack overflow risk)
  - Parallel cache size computation across independent paths
  - Size result caching (never walks the same directory twice)
  - Per-tool scan timing for bottleneck identification

- **Modern Terminal UI**
  - ASCII art banner with ANSI color styling
  - Live scan progress with per-tool timing
  - Executive summary metrics panel
  - Box-drawing table with version, disk usage, and integrity columns
  - Detailed storage & cache breakdown cards with tree visualization

---

## Quick Start

### Requirements

- **Node.js** v18+ (tested on v24)
- **pnpm** (or npm/yarn)
- **Windows** (currently Windows-only, uses `where.exe` and Windows paths)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/yourusername/bescane.git
cd bescane

# Install dev dependencies (only TypeScript + @types/node)
pnpm install

# Build
pnpm run build

# Run the scanner
pnpm run start
```

### JSON Output

```bash
pnpm run start --json
```

Returns machine-readable JSON with all discovered tools, versions, paths, and disk usage.

---

## Example Output

```
Phase 1: Known Toolchain Registry

  ✔ [1/14] Node.js → v24.16.0 (2.08 GB) 20.3s
  ○ [2/14] Bun (not found) 0.2s
  ✔ [6/14] VS Code → Installed (1.16 GB) 10.8s
  ✔ [7/14] OpenCode (AI Agent) → 1.18.23 (28.27 MB) 1.8s
  ✔ [13/14] Antigravity (AI Engine) → detected (2.45 GB) 1.1s

Phase 2: PATH Discovery (new/unknown tools)

  ✔ Found 8 additional tool(s) 11.4s
    ◆ Dotnet
    ◆ Fastfetch → 2.68.1
    ◆ Lms

╭──────────────────────────┬──────────────────────────┬──────────────────────────╮
│  ◈ Tools: 12 active      │  ◈ Storage: 5.71 GB      │  ◈ Integrity: 100% Safe  │
╰──────────────────────────┴──────────────────────────┴──────────────────────────╯
```

---

## Project Structure

```
bescane/
├── src/
│   ├── index.ts              # CLI entry point & TUI orchestrator
│   ├── types.ts              # ScannedDevTool & Scanner interfaces
│   ├── ui.ts                 # ANSI rendering (banner, table, cards)
│   ├── utils/
│   │   ├── paths.ts          # Env expansion, canonical paths, path verification
│   │   ├── exec.ts           # Sandboxed process execution (safeExec)
│   │   ├── fs.ts             # Safe directory size calculation
│   │   └── search.ts         # Smart binary locator engine (v2)
│   └── tools/
│       ├── index.ts          # Scanner registry
│       ├── node.ts           # Node.js scanner
│       ├── python.ts         # Python scanner
│       ├── bun.ts            # Bun scanner
│       ├── rust.ts           # Rust/Cargo scanner
│       ├── git.ts            # Git scanner
│       ├── vscode.ts         # VS Code scanner
│       ├── opencode.ts       # OpenCode AI agent scanner
│       ├── android.ts        # Android SDK scanner
│       ├── aiAgents.ts       # AI agent scanners (Claude, Aider, Ollama, etc.)
│       └── pathDiscovery.ts  # Generic PATH discovery (Phase 2)
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## Zero-Dependency Architecture

Bescane uses **zero runtime npm dependencies**. The only dev dependencies are TypeScript and `@types/node` for compilation. At runtime, it relies exclusively on Node.js built-in modules:

| Module | Purpose |
|--------|---------|
| `fs` / `fs/promises` | File existence checks, directory reading, size calculation |
| `path` | Cross-platform path manipulation |
| `child_process` | Sandboxed binary execution (`execFile`) |
| `util` | Promisify helpers |

---

## Security Model

| Principle | Implementation |
|-----------|----------------|
| **Air-Gapped** | No `http`, `https`, `net`, or `dns` modules used anywhere |
| **Least-Privilege Exec** | `safeExec` strips all env vars except a whitelist (`PATH`, `SystemRoot`, etc.) |
| **No Shell Injection** | `execFile` with `shell: false`; `.cmd` files routed through `ComSpec` with `/d` flag |
| **Anti-Spoofing** | All paths resolved via `fs.realpathSync` to defeat symlink attacks |
| **Verified Boundaries** | Only binaries under `%PROGRAMFILES%`, `%LOCALAPPDATA%`, `%USERPROFILE%`, `%APPDATA%` are trusted |
| **Cycle Prevention** | Inode tracking prevents infinite loops from circular symlinks/hard links |
| **Timeout Protection** | All child processes have a 10-second execution timeout |

---

## License

ISC
