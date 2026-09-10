import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateMultipleSizes } from '../utils/fs';

export class AndroidScanner implements Scanner {
  id = 'android';
  name = 'Android SDK';

  async scan(): Promise<ScannedDevTool | null> {
    const defaultSdkPath = expandEnvironmentStrings('%LOCALAPPDATA%\\Android\\Sdk');
    if (!existsSync(defaultSdkPath)) return null;

    const sdkRoot = getCanonicalPath(defaultSdkPath);
    const adbPath = path.join(sdkRoot, 'platform-tools', 'adb.exe');
    let foundVersion: string | null = null;

    if (existsSync(adbPath)) {
      try {
        const versionStr = await safeExec(adbPath, ['--version']);
        const match = versionStr.match(/Version ([\d\.\-]+)/);
        if (match) foundVersion = `ADB ${match[1]}`;
      } catch {}
    }

    const cacheCandidates = [
      expandEnvironmentStrings('%USERPROFILE%\\.gradle\\caches'),
      expandEnvironmentStrings('%USERPROFILE%\\.android')
    ];
    const existingCaches = cacheCandidates.filter(c => existsSync(c)).map(c => getCanonicalPath(c));

    const allPaths = [sdkRoot, ...existingCaches];
    const sizeMap = await calculateMultipleSizes(allPaths);

    const binarySize = sizeMap.get(sdkRoot) || 0;
    let cacheSize = 0;
    for (const cp of existingCaches) cacheSize += sizeMap.get(cp) || 0;

    return {
      id: this.id, name: this.name, canonicalPath: sdkRoot, version: foundVersion,
      diskUsageBytes: binarySize + cacheSize, associatedCachePaths: existingCaches,
      isVerifiedPath: isVerifiedPath(sdkRoot)
    };
  }
}
