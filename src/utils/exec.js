"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeExec = safeExec;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/**
 * Executes a binary safely by dropping unnecessary/dangerous environment variables.
 * @param binaryPath Absolute path to the executable.
 * @param args Arguments to pass.
 */
async function safeExec(binaryPath, args) {
    // Sanitize environment variables
    const safeEnv = {};
    const allowedVars = [
        'SystemRoot',
        'SystemDrive',
        'USERPROFILE',
        'LOCALAPPDATA',
        'APPDATA',
        'TEMP',
        'TMP',
        'ProgramFiles',
        'ProgramFiles(x86)'
    ];
    for (const key of allowedVars) {
        if (process.env[key]) {
            safeEnv[key] = process.env[key];
        }
    }
    // We explicitly disable shell to prevent command injection
    try {
        const { stdout } = await execFileAsync(binaryPath, args, {
            env: safeEnv,
            shell: false,
            windowsHide: true,
            timeout: 10000 // 10s max
        });
        return stdout.trim();
    }
    catch (error) {
        // If it's a version command that returns in stderr, handle it safely
        if (error && error.stdout) {
            return error.stdout.trim();
        }
        if (error && error.stderr) {
            return error.stderr.trim();
        }
        throw error;
    }
}
//# sourceMappingURL=exec.js.map