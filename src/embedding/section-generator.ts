import type { ParsedSkill, ParsedCommand } from '../types/index.js';
import { transformHeadings } from './heading-transformer.js';

/**
 * Generate the ## SKILLS section from parsed skills.
 * Returns empty string if skills array is empty.
 */
export async function generateSkillsSection(skills: ParsedSkill[]): Promise<string> {
  if (skills.length === 0) {
    return '';
  }

  let section = '## SKILLS\n\n';

  for (const skill of skills) {
    section += `### ${skill.metadata.name}\n\n`;
    const transformedContent = await transformHeadings(skill.content);
    section += `${transformedContent.trim()}\n\n`;
  }

  return section.trimEnd();
}

/**
 * Generate the ## COMMANDS section from parsed commands.
 * Returns empty string if commands array is empty.
 */
export async function generateCommandsSection(commands: ParsedCommand[]): Promise<string> {
  if (commands.length === 0) {
    return '';
  }

  let section = '## COMMANDS\n\n';

  for (const command of commands) {
    section += `### ${command.name}\n\n`;
    const transformedContent = await transformHeadings(command.content);
    section += `${transformedContent.trim()}\n\n`;
  }

  return section.trimEnd();
}
