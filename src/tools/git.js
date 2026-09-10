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
exports.GitScanner = void 0;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const types_1 = require("../types");
const paths_1 = require("../utils/paths");
const exec_1 = require("../utils/exec");
const fs_2 = require("../utils/fs");
class GitScanner {
    id = 'git';
    name = 'Git';
    async scan() {
        let foundPath = null;
        let foundVersion = null;
        const possiblePaths = [
            (0, paths_1.expandEnvironmentStrings)('%PROGRAMFILES%\\Git\\cmd\\git.exe'),
            (0, paths_1.expandEnvironmentStrings)('%LOCALAPPDATA%\\Programs\\Git\\cmd\\git.exe')
        ];
        for (const p of possiblePaths) {
            if ((0, fs_1.existsSync)(p)) {
                foundPath = (0, paths_1.getCanonicalPath)(p);
                break;
            }
        }
        if (!foundPath) {
            try {
                const whereOut = await (0, exec_1.safeExec)('where.exe', ['git']);
                const lines = whereOut.split('\n').filter(Boolean);
                if (lines.length > 0) {
                    foundPath = (0, paths_1.getCanonicalPath)(lines[0].trim());
                }
            }
            catch (e) { }
        }
        if (!foundPath || !(0, fs_1.existsSync)(foundPath)) {
            return null;
        }
        try {
            const versionStr = await (0, exec_1.safeExec)(foundPath, ['--version']);
            // "git version 2.x.y.windows.1"
            foundVersion = versionStr.replace('git version ', '').trim();
        }
        catch (e) { }
        // Git usually doesn't have huge isolated caches like npm/cargo in AppData,
        // its size footprint is mainly the installation directory.
        const installDir = path.dirname(path.dirname(foundPath)); // up from cmd/git.exe to Git/
        let totalSize = 0;
        if ((0, fs_1.existsSync)(installDir)) {
            totalSize = await (0, fs_2.calculateDirectorySize)(installDir);
        }
        else {
            totalSize = await (0, fs_2.calculateDirectorySize)(path.dirname(foundPath));
        }
        return {
            id: this.id,
            name: this.name,
            canonicalPath: foundPath,
            version: foundVersion,
            diskUsageBytes: totalSize,
            associatedCachePaths: [],
            isVerifiedPath: (0, paths_1.isVerifiedPath)(foundPath)
        };
    }
}
exports.GitScanner = GitScanner;
//# sourceMappingURL=git.js.map