import * as path from 'path';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateDirectorySize } from '../utils/fs';
import { findBinary } from '../utils/search';

export class GitScanner implements Scanner {
  id = 'git';
  name = 'Git';

  async scan(): Promise<ScannedDevTool | null> {
    const possiblePaths = [
      expandEnvironmentStrings('%PROGRAMFILES%\\Git\\cmd\\git.exe'),
      expandEnvironmentStrings('%LOCALAPPDATA%\\Programs\\Git\\cmd\\git.exe')
    ];

    let foundPath: string | null = null;
    for (const p of possiblePaths) {
      if (existsSync(p)) {
        foundPath = getCanonicalPath(p);
        break;
      }
    }

    if (!foundPath) {
      foundPath = await findBinary({ names: ['git'] });
    }

    if (!foundPath || !existsSync(foundPath)) return null;

    let foundVersion: string | null = null;
    try {
      const versionStr = await safeExec(foundPath, ['--version']);
      foundVersion = versionStr.replace('git version ', '').trim();
    } catch {}

    const installDir = path.dirname(path.dirname(foundPath));
    const totalSize = existsSync(installDir)
      ? await calculateDirectorySize(installDir)
      : await calculateDirectorySize(path.dirname(foundPath));

    return {
      id: this.id, name: this.name, canonicalPath: foundPath, version: foundVersion,
      diskUsageBytes: totalSize, associatedCachePaths: [],
      isVerifiedPath: isVerifiedPath(foundPath)
    };
  }
}
