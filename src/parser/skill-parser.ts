import matter from 'gray-matter';
import yaml from 'js-yaml';
import type { SkillMetadata } from '../types/index.js';

export interface ParsedSkillContent {
  metadata: SkillMetadata;
  content: string;
  warnings: string[];
}

/**
 * Parse a SKILL.md file, extracting YAML frontmatter and markdown content.
 * Uses YAML 1.2 JSON_SCHEMA to avoid edge cases (Norway problem, octal, sexagesimal).
 * Fails fast on malformed YAML with clear error message.
 */
export function parseSkillFile(filepath: string, fileContent: string): ParsedSkillContent {
  const warnings: string[] = [];

  try {
    const parsed = matter(fileContent, {
      engines: {
        yaml: (str) => yaml.load(str, {
          schema: yaml.JSON_SCHEMA  // YAML 1.2 safe parsing
        }) as Record<string, unknown>
      }
    });

    const metadata = parsed.data as SkillMetadata;

    // Validate required fields - warn if missing, don't fail
    if (!metadata.name) {
      warnings.push(`Warning: ${filepath} missing "name" in frontmatter`);
    }
    if (!metadata.description) {
      warnings.push(`Warning: ${filepath} missing "description" in frontmatter`);
    }

    return {
      metadata: {
        ...metadata,
        name: metadata.name || '',
        description: metadata.description || ''
      },
      content: parsed.content,
      warnings
    };
  } catch (error) {
    // Fail fast with clear error for malformed YAML
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse ${filepath}\n` +
      `YAML frontmatter is malformed.\n` +
      `Original error: ${message}`
    );
  }
}
