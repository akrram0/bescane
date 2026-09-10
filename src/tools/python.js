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
exports.PythonScanner = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("fs");
const types_1 = require("../types");
const paths_1 = require("../utils/paths");
const exec_1 = require("../utils/exec");
const fs_2 = require("../utils/fs");
class PythonScanner {
    id = 'python';
    name = 'Python';
    async scan() {
        const searchDirs = [
            (0, paths_1.expandEnvironmentStrings)('%LOCALAPPDATA%\\Programs\\Python'),
            (0, paths_1.expandEnvironmentStrings)('%PROGRAMFILES%\\Python')
        ];
        let foundPath = null;
        // Priority 1: Check standard installation directories
        for (const dir of searchDirs) {
            if ((0, fs_1.existsSync)(dir)) {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory() && entry.name.toLowerCase().startsWith('python')) {
                        const pyExe = path.join(dir, entry.name, 'python.exe');
                        if ((0, fs_1.existsSync)(pyExe)) {
                            foundPath = (0, paths_1.getCanonicalPath)(pyExe);
                            break;
                        }
                    }
                }
            }
            if (foundPath)
                break;
        }
        // Priority 2: Fallback to where.exe
        if (!foundPath) {
            try {
                const whereOut = await (0, exec_1.safeExec)('where.exe', ['python']);
                const lines = whereOut.split('\n').filter(Boolean);
                if (lines.length > 0) {
                    // Take the first non-WindowsApps path if possible
                    const realPath = lines.find(l => !l.toLowerCase().includes('windowsapps')) || lines[0];
                    foundPath = (0, paths_1.getCanonicalPath)(realPath.trim());
                }
            }
            catch (e) {
                // Ignore where.exe errors
            }
        }
        if (!foundPath || !(0, fs_1.existsSync)(foundPath)) {
            return null;
        }
        let foundVersion = null;
        try {
            const versionStr = await (0, exec_1.safeExec)(foundPath, ['--version']);
            // Usually "Python 3.10.x"
            foundVersion = versionStr.replace('Python ', '').trim();
        }
        catch (e) {
            // Proceed even if version extraction fails
        }
        // Evaluate caches
        const pipCache = (0, paths_1.expandEnvironmentStrings)('%LOCALAPPDATA%\\pip\\Cache');
        let cacheSize = 0;
        const caches = [];
        if ((0, fs_1.existsSync)(pipCache)) {
            const resolved = (0, paths_1.getCanonicalPath)(pipCache);
            caches.push(resolved);
            cacheSize = await (0, fs_2.calculateDirectorySize)(resolved);
        }
        const binarySize = await (0, fs_2.calculateDirectorySize)(path.dirname(foundPath));
        return {
            id: this.id,
            name: this.name,
            canonicalPath: foundPath,
            version: foundVersion,
            diskUsageBytes: binarySize + cacheSize,
            associatedCachePaths: caches,
            isVerifiedPath: (0, paths_1.isVerifiedPath)(foundPath)
        };
    }
}
exports.PythonScanner = PythonScanner;
//# sourceMappingURL=python.js.map