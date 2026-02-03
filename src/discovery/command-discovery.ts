import fg from 'fast-glob';
import { getCommandsDir } from '../utils/path-resolver.js';
import type { DiscoveredFile } from '../types/index.js';

interface CommandDiscoveryOptions {
  cwd?: string;
}

/**
 * Discover command markdown files from .claude/commands/.
 * Commands are project-only (no global commands directory).
 * Silently skips if directory doesn't exist.
 */
export async function discoverCommands(options: CommandDiscoveryOptions = {}): Promise<DiscoveredFile[]> {
  const { cwd = process.cwd() } = options;
  const commandsDir = getCommandsDir(cwd);

  const commandPaths = await fg('*.md', {
    cwd: commandsDir,
    absolute: true,
    followSymbolicLinks: true,
    onlyFiles: true,
    suppressErrors: true
  }).catch(() => []);

  // Commands are always project-local
  return commandPaths.map(path => ({
    path,
    location: 'project' as const
  }));
}
