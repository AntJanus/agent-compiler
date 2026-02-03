import fg from 'fast-glob';
import { getGlobalSkillsDir, getProjectSkillsDir } from '../utils/path-resolver.js';
import type { DiscoveredFile, DiscoveryLocation } from '../types/index.js';

interface DiscoveryOptions {
  cwd?: string;
  includeGlobal?: boolean;
  includeProject?: boolean;
}

/**
 * Discover skill SKILL.md files from global and project locations.
 * Silently skips missing directories.
 * Follows symlinks.
 */
export async function discoverSkills(options: DiscoveryOptions = {}): Promise<DiscoveredFile[]> {
  const {
    cwd = process.cwd(),
    includeGlobal = true,
    includeProject = true
  } = options;

  const results: DiscoveredFile[] = [];

  // Discover from global ~/.claude/skills/
  if (includeGlobal) {
    const globalDir = getGlobalSkillsDir();
    const globalPaths = await fg('*/SKILL.md', {
      cwd: globalDir,
      absolute: true,
      followSymbolicLinks: true,
      onlyFiles: true,
      suppressErrors: true  // Silently skip if directory doesn't exist
    }).catch(() => []);

    results.push(...globalPaths.map(path => ({
      path,
      location: 'global' as DiscoveryLocation
    })));
  }

  // Discover from project ./.claude/skills/
  if (includeProject) {
    const projectDir = getProjectSkillsDir(cwd);
    const projectPaths = await fg('*/SKILL.md', {
      cwd: projectDir,
      absolute: true,
      followSymbolicLinks: true,
      onlyFiles: true,
      suppressErrors: true
    }).catch(() => []);

    results.push(...projectPaths.map(path => ({
      path,
      location: 'project' as DiscoveryLocation
    })));
  }

  return results;
}
