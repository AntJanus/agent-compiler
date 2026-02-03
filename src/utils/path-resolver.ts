import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * Expand tilde (~) in path to user's home directory
 */
export function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Resolve global skills directory path
 */
export function getGlobalSkillsDir(): string {
  return join(homedir(), '.claude', 'skills');
}

/**
 * Resolve project skills directory path (relative to cwd)
 */
export function getProjectSkillsDir(cwd: string = process.cwd()): string {
  return resolve(cwd, '.claude', 'skills');
}

/**
 * Resolve project commands directory path (relative to cwd)
 */
export function getCommandsDir(cwd: string = process.cwd()): string {
  return resolve(cwd, '.claude', 'commands');
}
