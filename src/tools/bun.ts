import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';
import { findBinary } from '../utils/search';

export class BunScanner implements Scanner {
  id = 'bun';
  name = 'Bun';

  async scan(): Promise<ScannedDevTool | null> {
    const defaultBunPath = expandEnvironmentStrings('%USERPROFILE%\\.bun\\bin\\bun.exe');
    let foundPath: string | null = null;

    if (existsSync(defaultBunPath)) {
      foundPath = getCanonicalPath(defaultBunPath);
    } else {
      foundPath = await findBinary({ names: ['bun'] });
    }

    if (!foundPath || !existsSync(foundPath)) return null;

    let foundVersion: string | null = null;
    try { foundVersion = await safeExec(foundPath, ['--version']); } catch {}

    const bunInstallDir = expandEnvironmentStrings('%USERPROFILE%\\.bun');
    const existingCaches = existsSync(bunInstallDir) ? [getCanonicalPath(bunInstallDir)] : [];

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
