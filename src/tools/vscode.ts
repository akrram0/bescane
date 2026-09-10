import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';
import { findBinary } from '../utils/search';

export class VSCodeScanner implements Scanner {
  id = 'vscode';
  name = 'VS Code';

  async scan(): Promise<ScannedDevTool | null> {
    const knownPaths = [
      expandEnvironmentStrings('%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe'),
      expandEnvironmentStrings('%PROGRAMFILES%\\Microsoft VS Code\\Code.exe')
    ];

    let foundPath: string | null = null;
    for (const p of knownPaths) {
      if (existsSync(p)) {
        foundPath = getCanonicalPath(p);
        break;
      }
    }

    if (!foundPath) {
      foundPath = await findBinary({ names: ['code'], extensions: ['.exe', '.cmd', ''] });
    }

    if (!foundPath || !existsSync(foundPath)) return null;

    let foundVersion: string | null = null;
    try {
      const versionStr = await safeExec(foundPath, ['--version']);
      const lines = versionStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const verLine = lines.find(l => /^v?\d+(\.\d+)+/.test(l));
      foundVersion = verLine || (lines[0] && !lines[0].includes('StorageMainService') ? lines[0] : 'Installed');
    } catch {}

    const cacheCandidates = [
      expandEnvironmentStrings('%USERPROFILE%\\.vscode\\extensions'),
      expandEnvironmentStrings('%APPDATA%\\Code\\Cache'),
      expandEnvironmentStrings('%APPDATA%\\Code\\CachedData')
    ];
    const existingCaches = cacheCandidates.filter(c => existsSync(c)).map(c => getCanonicalPath(c));

    const allPaths = [path.dirname(foundPath), ...existingCaches];
    const sizeMap = await calculateMultipleSizes(allPaths);

    const binarySize = sizeMap.get(path.dirname(foundPath)) || 0;
    let cacheSize = 0;
    for (const cp of existingCaches) cacheSize += sizeMap.get(cp) || 0;

    return {
      id: this.id, name: this.name, canonicalPath: foundPath, version: foundVersion,
      diskUsageBytes: binarySize + cacheSize, associatedCachePaths: existingCaches,
      isVerifiedPath: isVerifiedPath(foundPath)
    };
  }
}
