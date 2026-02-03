export type DiscoveryLocation = 'global' | 'project';

export interface DiscoveredFile {
  path: string;
  location: DiscoveryLocation;
}

export interface DiscoveryResult {
  skills: DiscoveredFile[];
  commands: DiscoveredFile[];
}
