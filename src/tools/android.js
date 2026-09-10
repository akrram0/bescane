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
exports.AndroidScanner = void 0;
const path = __importStar(require("path"));
const fs_1 = require("fs");
const types_1 = require("../types");
const paths_1 = require("../utils/paths");
const exec_1 = require("../utils/exec");
const fs_2 = require("../utils/fs");
class AndroidScanner {
    id = 'android';
    name = 'Android SDK';
    async scan() {
        const defaultSdkPath = (0, paths_1.expandEnvironmentStrings)('%LOCALAPPDATA%\\Android\\Sdk');
        if (!(0, fs_1.existsSync)(defaultSdkPath)) {
            return null;
        }
        const sdkRoot = (0, paths_1.getCanonicalPath)(defaultSdkPath);
        const adbPath = path.join(sdkRoot, 'platform-tools', 'adb.exe');
        let foundVersion = null;
        if ((0, fs_1.existsSync)(adbPath)) {
            try {
                const versionStr = await (0, exec_1.safeExec)(adbPath, ['--version']);
                // "Android Debug Bridge version 1.0.41\nVersion 34.0.5-10900879"
                const match = versionStr.match(/Version ([\d\.\-]+)/);
                if (match) {
                    foundVersion = `ADB ${match[1]}`;
                }
            }
            catch (e) { }
        }
        const cachesToVerify = [
            (0, paths_1.expandEnvironmentStrings)('%USERPROFILE%\\.gradle\\caches'),
            (0, paths_1.expandEnvironmentStrings)('%USERPROFILE%\\.android')
        ];
        let cacheSize = 0;
        const associatedCachePaths = [];
        for (const cacheDir of cachesToVerify) {
            if ((0, fs_1.existsSync)(cacheDir)) {
                const resolved = (0, paths_1.getCanonicalPath)(cacheDir);
                associatedCachePaths.push(resolved);
                cacheSize += await (0, fs_2.calculateDirectorySize)(resolved);
            }
        }
        const binarySize = await (0, fs_2.calculateDirectorySize)(sdkRoot);
        return {
            id: this.id,
            name: this.name,
            canonicalPath: sdkRoot, // Folder path representing the toolchain
            version: foundVersion,
            diskUsageBytes: binarySize + cacheSize,
            associatedCachePaths,
            isVerifiedPath: (0, paths_1.isVerifiedPath)(sdkRoot)
        };
    }
}
exports.AndroidScanner = AndroidScanner;
//# sourceMappingURL=android.js.map