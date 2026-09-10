import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateDirectorySize, calculateMultipleSizes } from '../utils/fs';

export class NodeScanner implements Scanner {
  id = 'node';
  name = 'Node.js';

  async scan(): Promise<ScannedDevTool | null> {
    let foundPath: string | null = null;
    let foundVersion: string | null = null;

    // Check standard location first (most common)
    const standardNode = expandEnvironmentStrings('%PROGRAMFILES%\\nodejs\\node.exe');
    if (existsSync(standardNode)) {
      foundPath = getCanonicalPath(standardNode);
    }

    // Fallback to where.exe
    if (!foundPath) {
      try {
        const whereOut = await safeExec('where.exe', ['node']);
        const lines = whereOut.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          const p = getCanonicalPath(line.trim());
          if (existsSync(p)) {
            foundPath = p;
            break;
          }
        }
      } catch (e) {}
    }

    if (!foundPath || !existsSync(foundPath)) {
      return null;
    }

    try {
      foundVersion = await safeExec(foundPath, ['--version']);
    } catch (e) {}

    const cacheCandidates = [
      expandEnvironmentStrings('%LOCALAPPDATA%\\npm-cache'),
      expandEnvironmentStrings('%APPDATA%\\npm-cache'),
      expandEnvironmentStrings('%LOCALAPPDATA%\\pnpm\\store'),
      expandEnvironmentStrings('%LOCALAPPDATA%\\Yarn\\Cache')
    ];

    const existingCaches = cacheCandidates
      .filter(c => existsSync(c))
      .map(c => getCanonicalPath(c));

    // Parallel size computation for all caches + binary dir
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
