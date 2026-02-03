export { discoverSkills } from './skill-discovery.js';
export { discoverCommands } from './command-discovery.js';

import { discoverSkills } from './skill-discovery.js';
import { discoverCommands } from './command-discovery.js';
import type { DiscoveryResult } from '../types/index.js';

interface DiscoverAllOptions {
  cwd?: string;
  includeGlobalSkills?: boolean;
}

/**
 * Discover all skills and commands.
 * Convenience function that runs both discoveries in parallel.
 */
export async function discoverAll(options: DiscoverAllOptions = {}): Promise<DiscoveryResult> {
  const { cwd, includeGlobalSkills = true } = options;

  const [skills, commands] = await Promise.all([
    discoverSkills({
      cwd,
      includeGlobal: includeGlobalSkills,
      includeProject: true
    }),
    discoverCommands({ cwd })
  ]);

  return { skills, commands };
}
