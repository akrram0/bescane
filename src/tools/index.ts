import { PythonScanner } from './python';
import { NodeScanner } from './node';
import { BunScanner } from './bun';
import { RustScanner } from './rust';
import { GitScanner } from './git';
import { VSCodeScanner } from './vscode';
import { OpenCodeScanner } from './opencode';
import {
  ClaudeCodeScanner,
  AiderScanner,
  OllamaScanner,
  CursorScanner,
  CopilotScanner,
  AntigravityScanner
} from './aiAgents';
import { AndroidScanner } from './android';
import { Scanner } from '../types';

export const scanners: Scanner[] = [
  new NodeScanner(),
  new BunScanner(),
  new PythonScanner(),
  new RustScanner(),
  new GitScanner(),
  new VSCodeScanner(),
  new OpenCodeScanner(),
  new ClaudeCodeScanner(),
  new AiderScanner(),
  new OllamaScanner(),
  new CursorScanner(),
  new CopilotScanner(),
  new AntigravityScanner(),
  new AndroidScanner()
];
