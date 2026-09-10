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
exports.expandEnvironmentStrings = expandEnvironmentStrings;
exports.getCanonicalPath = getCanonicalPath;
exports.isVerifiedPath = isVerifiedPath;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function expandEnvironmentStrings(value) {
    if (!value)
        return value;
    return value.replace(/%([^%]+)%/g, (match, envVar) => {
        return process.env[envVar] || match;
    });
}
function getCanonicalPath(p) {
    try {
        const expanded = expandEnvironmentStrings(p);
        if (!fs.existsSync(expanded)) {
            return expanded;
        }
        return fs.realpathSync(expanded);
    }
    catch (e) {
        return p;
    }
}
function isVerifiedPath(targetPath) {
    const p = getCanonicalPath(targetPath).toLowerCase();
    const safeRoots = [
        process.env.LOCALAPPDATA,
        process.env.APPDATA,
        process.env.PROGRAMFILES,
        process.env['ProgramFiles(x86)'],
        process.env.USERPROFILE
    ]
        .filter(Boolean)
        .map(root => getCanonicalPath(root).toLowerCase());
    return safeRoots.some(root => p.startsWith(root));
}
//# sourceMappingURL=paths.js.map