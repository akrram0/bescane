import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Executes a binary safely by dropping unnecessary/dangerous environment variables.
 * @param binaryPath Absolute path to the executable.
 * @param args Arguments to pass.
 */
export async function safeExec(binaryPath: string, args: string[]): Promise<string> {
  // Sanitize environment variables
  const safeEnv: Record<string, string> = {};
  const allowedVars = [
    'SystemRoot',
    'SystemDrive',
    'USERPROFILE',
    'LOCALAPPDATA',
    'APPDATA',
    'TEMP',
    'TMP',
    'ProgramFiles',
    'ProgramFiles(x86)',
    'PATH',
    'Path',
    'PATHEXT',
    'ComSpec'
  ];

  for (const key of allowedVars) {
    if (process.env[key]) {
      safeEnv[key] = process.env[key]!;
    }
  }

  const isWindowsBatch = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binaryPath);
  const fileToExec = isWindowsBatch ? (process.env.ComSpec || 'cmd.exe') : binaryPath;
  const execArgs = isWindowsBatch ? ['/d', '/c', binaryPath, ...args] : args;

  try {
    const { stdout } = await execFileAsync(fileToExec, execArgs, {
      env: safeEnv,
      shell: false,
      windowsHide: true,
      timeout: 10000 // 10s max
    });
    return stdout.trim();
  } catch (error: any) {
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
