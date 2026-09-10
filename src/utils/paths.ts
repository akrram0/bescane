import * as path from 'path';
import * as fs from 'fs';

// Memoization cache for canonical path resolution
const canonicalCache = new Map<string, string>();

// Pre-computed safe roots (initialized once on first call)
let safeRootsCache: string[] | null = null;

export function expandEnvironmentStrings(value: string): string {
  if (!value) return value;
  return value.replace(/%([^%]+)%/g, (match, envVar) => {
    return process.env[envVar] || match;
  });
}

export function getCanonicalPath(p: string): string {
  if (canonicalCache.has(p)) {
    return canonicalCache.get(p)!;
  }

  let result: string;
  try {
    const expanded = expandEnvironmentStrings(p);
    if (!fs.existsSync(expanded)) {
      result = expanded;
    } else {
      result = fs.realpathSync(expanded);
    }
  } catch (e) {
    result = p;
  }

  canonicalCache.set(p, result);
  return result;
}

function getSafeRoots(): string[] {
  if (safeRootsCache !== null) {
    return safeRootsCache;
  }

  safeRootsCache = [
    process.env.LOCALAPPDATA,
    process.env.APPDATA,
    process.env.PROGRAMFILES,
    process.env['ProgramFiles(x86)'],
    process.env.USERPROFILE
  ]
    .filter(Boolean)
    .map(root => getCanonicalPath(root!).toLowerCase());

  return safeRootsCache;
}

export function isVerifiedPath(targetPath: string): boolean {
  const p = getCanonicalPath(targetPath).toLowerCase();
  return getSafeRoots().some(root => p.startsWith(root));
}
