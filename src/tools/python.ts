import * as path from 'path';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import { ScannedDevTool, Scanner } from '../types';
import { expandEnvironmentStrings, getCanonicalPath, isVerifiedPath } from '../utils/paths';
import { safeExec } from '../utils/exec';
import { calculateDirectorySize, calculateMultipleSizes } from '../utils/fs';

export class PythonScanner implements Scanner {
  id = 'python';
  name = 'Python';

  async scan(): Promise<ScannedDevTool | null> {
    const searchDirs = [
      expandEnvironmentStrings('%LOCALAPPDATA%\\Programs\\Python'),
      expandEnvironmentStrings('%PROGRAMFILES%\\Python')
    ];

    let foundPath: string | null = null;

    for (const dir of searchDirs) {
      if (existsSync(dir)) {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.toLowerCase().startsWith('python')) {
            const pyExe = path.join(dir, entry.name, 'python.exe');
            if (existsSync(pyExe)) {
               foundPath = getCanonicalPath(pyExe);
               break;
            }
          }
        }
      }
      if (foundPath) break;
    }

    if (!foundPath) {
       try {
         const whereOut = await safeExec('where.exe', ['python']);
         const lines = whereOut.split(/\r?\n/).filter(Boolean);
         for (const line of lines) {
            if (line.toLowerCase().includes('windowsapps')) continue;
            const p = getCanonicalPath(line.trim());
            if (existsSync(p)) {
              foundPath = p;
              break;
            }
         }
       } catch {}
    }

    if (!foundPath || !existsSync(foundPath)) return null;

    let foundVersion: string | null = null;
    try {
      const versionStr = await safeExec(foundPath, ['--version']);
      foundVersion = versionStr.replace('Python ', '').trim();
    } catch {}

    const pipCache = expandEnvironmentStrings('%LOCALAPPDATA%\\pip\\Cache');
    const existingCaches = [pipCache].filter(c => existsSync(c)).map(c => getCanonicalPath(c));

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
