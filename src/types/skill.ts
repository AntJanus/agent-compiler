export interface SkillMetadata {
  name: string;
  description: string;
  [key: string]: unknown;
}

export interface ParsedSkill {
  path: string;
  location: 'global' | 'project';
  metadata: SkillMetadata;
  content: string;
  referencedFiles: string[];
}

export interface Skill {
  name: string;
  description: string;
  location: 'global' | 'project';
  content: string;  // Final concatenated content
}
