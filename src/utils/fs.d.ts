/**
 * Calculates the size of a directory safely by traversing it.
 * It prevents cyclic traversals using inode tracking and handles symlinks safely.
 * Ignores EPERM and other access errors without crashing.
 */
export declare function calculateDirectorySize(dirPath: string): Promise<number>;
//# sourceMappingURL=fs.d.ts.map