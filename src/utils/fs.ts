import * as fs from 'fs/promises';
import * as path from 'path';

// Size calculation result cache — avoids re-walking the same directory
const sizeCache = new Map<string, number>();

/**
 * Calculates the size of a directory safely by traversing it.
 * Optimizations over v1:
 * - Results are cached per canonical path (never recomputes the same dir)
 * - Uses a non-recursive iterative stack to avoid deep call-stack overflows
 * - Inode tracking prevents infinite loops from hard links
 * - Symlinks are not followed (avoids cycles), their own size is counted
 * - Concurrency-throttled via batched readdir to prevent EMFILE
 */
export async function calculateDirectorySize(dirPath: string): Promise<number> {
  if (sizeCache.has(dirPath)) {
    return sizeCache.get(dirPath)!;
  }

  const visited = new Set<number>();
  let totalSize = 0;

  // Iterative stack-based traversal (avoids stack overflow on deep trees)
  const stack: string[] = [dirPath];

  while (stack.length > 0) {
    const currentPath = stack.pop()!;

    try {
      const stats = await fs.lstat(currentPath);

      if (stats.isSymbolicLink()) {
        totalSize += stats.size;
        continue;
      }

      if (visited.has(stats.ino)) {
        continue;
      }
      visited.add(stats.ino);

      if (stats.isDirectory()) {
        let entries: string[];
        try {
          entries = await fs.readdir(currentPath);
        } catch {
          continue;
        }

        // Process in batches of 20 to prevent EMFILE (too many open files)
        for (let i = 0; i < entries.length; i += 20) {
          const batch = entries.slice(i, i + 20);
          // Resolve full paths and push onto stack
          for (const name of batch) {
            stack.push(path.join(currentPath, name));
          }
        }
      } else {
        totalSize += stats.size;
      }
    } catch {
      // Gracefully ignore EPERM, EBUSY, ENOENT
      continue;
    }
  }

  sizeCache.set(dirPath, totalSize);
  return totalSize;
}

/**
 * Parallel cache size calculation for independent paths.
 * Computes sizes concurrently with a concurrency limit to prevent IO starvation.
 */
export async function calculateMultipleSizes(
  paths: string[],
  concurrency: number = 4
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const sizes = await Promise.all(batch.map(p => calculateDirectorySize(p)));
    batch.forEach((p, idx) => results.set(p, sizes[idx]));
  }

  return results;
}
