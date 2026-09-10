"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDirectorySize = calculateDirectorySize;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Calculates the size of a directory safely by traversing it.
 * It prevents cyclic traversals using inode tracking and handles symlinks safely.
 * Ignores EPERM and other access errors without crashing.
 */
async function calculateDirectorySize(dirPath) {
    const visited = new Set();
    let totalSize = 0;
    async function walk(currentPath) {
        try {
            const stats = await fs.lstat(currentPath);
            if (stats.isSymbolicLink()) {
                // Do not traverse symlinks to avoid cycles, just add their size.
                totalSize += stats.size;
                return;
            }
            // Track inodes to prevent infinite loops with hard links
            if (visited.has(stats.ino)) {
                return;
            }
            visited.add(stats.ino);
            if (stats.isDirectory()) {
                const entries = await fs.readdir(currentPath);
                // Process in small batches to throttle concurrency and prevent IO starvation/too many open files
                for (let i = 0; i < entries.length; i += 10) {
                    const batch = entries.slice(i, i + 10);
                    await Promise.all(batch.map(name => walk(path.join(currentPath, name))));
                }
            }
            else {
                totalSize += stats.size;
            }
        }
        catch (e) {
            // Gracefully ignore permission (EPERM), locked files (EBUSY), and missing (ENOENT)
            return;
        }
    }
    await walk(dirPath);
    return totalSize;
}
//# sourceMappingURL=fs.js.map