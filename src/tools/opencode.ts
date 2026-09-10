import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';
import { findBinary } from '../utils/search';

export class OpenCodeScanner implements Scanner {
  id = 'opencode';
  name = 'OpenCode (AI Agent)';

  async scan(): Promise<ScannedDevTool | null> {
    const foundPath = await findBinary({
      names: ['opencode', 'opencode-cli'],
      customDirs: [
        expandEnvironmentStrings('%LOCALAPPDATA%\\pnpm\\bin'),
        expandEnvironmentStrings('%LOCALAPPDATA%\\pnpm'),
        expandEnvironmentStrings('%APPDATA%\\npm'),
        expandEnvironmentStrings('%LOCALAPPDATA%\\Programs\\OpenCode')
      ],
      shallowSubdirSearch: true
    });

    if (!foundPath || !existsSync(foundPath)) {
      return null;
    }

    let foundVersion: string | null = null;
    try {
      const versionStr = await safeExec(foundPath, ['--version']);
      const match = versionStr.match(/\d+(\.\d+)+/);
      foundVersion = match ? match[0] : versionStr.split(/\r?\n/)[0].trim();
    } catch {
      try {
        const vStr = await safeExec(foundPath, ['-v']);
        const match = vStr.match(/\d+(\.\d+)+/);
        foundVersion = match ? match[0] : null;
      } catch {}
    }

    const cacheCandidates = [
      expandEnvironmentStrings('%USERPROFILE%\\.opencode'),
      expandEnvironmentStrings('%LOCALAPPDATA%\\opencode'),
      expandEnvironmentStrings('%APPDATA%\\opencode')
    ];

    const existingCaches = cacheCandidates
      .filter(c => existsSync(c))
      .map(c => getCanonicalPath(c));

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
