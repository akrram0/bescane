import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';
import { findBinary } from '../utils/search';

export class RustScanner implements Scanner {
  id = 'rust';
  name = 'Rust (cargo)';

  async scan(): Promise<ScannedDevTool | null> {
    const defaultCargoPath = expandEnvironmentStrings('%USERPROFILE%\\.cargo\\bin\\cargo.exe');
    let foundPath: string | null = null;

    if (existsSync(defaultCargoPath)) {
      foundPath = getCanonicalPath(defaultCargoPath);
    } else {
      foundPath = await findBinary({ names: ['cargo'] });
    }

    if (!foundPath || !existsSync(foundPath)) return null;

    let foundVersion: string | null = null;
    try {
      const versionStr = await safeExec(foundPath, ['--version']);
      foundVersion = versionStr.split(' ')[1] || versionStr;
    } catch {}

    const cacheCandidates = [
      expandEnvironmentStrings('%USERPROFILE%\\.cargo'),
      expandEnvironmentStrings('%USERPROFILE%\\.rustup')
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
