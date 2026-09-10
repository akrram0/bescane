import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';
import { findBinary } from '../utils/search';

interface AgentConfig {
  id: string;
  name: string;
  binaryNames: string[];
  versionArgs?: string[];
  versionRegex?: RegExp;
  cacheDirs?: string[];
}

class BaseAgentScanner implements Scanner {
  id: string;
  name: string;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
  }

  async scan(): Promise<ScannedDevTool | null> {
    const foundPath = await findBinary({
      names: this.config.binaryNames,
      shallowSubdirSearch: true
    });

    if (!foundPath || !existsSync(foundPath)) {
      return null;
    }

    let foundVersion: string | null = null;
    const vArgs = this.config.versionArgs || ['--version'];
    try {
      const out = await safeExec(foundPath, vArgs);
      if (this.config.versionRegex) {
        const m = out.match(this.config.versionRegex);
        foundVersion = m ? m[0] : out.split(/\r?\n/)[0].trim();
      } else {
        const m = out.match(/\d+(\.\d+)+/);
        foundVersion = m ? m[0] : out.split(/\r?\n/)[0].trim();
      }
    } catch {
      try {
        const out = await safeExec(foundPath, ['-v']);
        const m = out.match(/\d+(\.\d+)+/);
        foundVersion = m ? m[0] : null;
      } catch {}
    }

    // Collect existing cache dirs
    const existingCaches: string[] = [];
    if (this.config.cacheDirs) {
      for (const dir of this.config.cacheDirs) {
        const exp = expandEnvironmentStrings(dir);
        if (existsSync(exp)) {
          existingCaches.push(getCanonicalPath(exp));
        }
      }
    }

    // Parallel size computation
    const allPaths = [path.dirname(foundPath), ...existingCaches];
    const sizeMap = await calculateMultipleSizes(allPaths);

    const binarySize = sizeMap.get(path.dirname(foundPath)) || 0;
    let cacheSize = 0;
    for (const cp of existingCaches) {
      cacheSize += sizeMap.get(cp) || 0;
    }

    return {
      id: this.id,
      name: this.name,
      canonicalPath: foundPath,
      version: foundVersion,
      diskUsageBytes: binarySize + cacheSize,
      associatedCachePaths: existingCaches,
      isVerifiedPath: isVerifiedPath(foundPath)
    };
  }
}

export class ClaudeCodeScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'claude-code',
      name: 'Claude Code (AI Agent)',
      binaryNames: ['claude', 'claude-code'],
      cacheDirs: [
        '%USERPROFILE%\\.claude',
        '%LOCALAPPDATA%\\claude'
      ]
    });
  }
}

export class AiderScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'aider',
      name: 'Aider (AI Agent)',
      binaryNames: ['aider'],
      cacheDirs: [
        '%USERPROFILE%\\.aider'
      ]
    });
  }
}

export class OllamaScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'ollama',
      name: 'Ollama (Local LLM Engine)',
      binaryNames: ['ollama'],
      cacheDirs: [
        '%USERPROFILE%\\.ollama',
        '%LOCALAPPDATA%\\Ollama'
      ]
    });
  }
}

export class CursorScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'cursor',
      name: 'Cursor AI CLI',
      binaryNames: ['cursor'],
      cacheDirs: [
        '%USERPROFILE%\\.cursor',
        '%APPDATA%\\Cursor'
      ]
    });
  }
}

export class CopilotScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'copilot',
      name: 'GitHub Copilot CLI',
      binaryNames: ['copilot', 'github-copilot-cli'],
      cacheDirs: [
        '%USERPROFILE%\\.copilot'
      ]
    });
  }
}

export class AntigravityScanner extends BaseAgentScanner {
  constructor() {
    super({
      id: 'antigravity',
      name: 'Antigravity (AI Engine)',
      binaryNames: ['agy', 'antigravity'],
      cacheDirs: [
        '%USERPROFILE%\\.gemini\\antigravity',
        '%USERPROFILE%\\.antigravity'
      ]
    });
  }
}
