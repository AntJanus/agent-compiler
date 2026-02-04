import type { ParsedSkill, ParsedCommand } from '../types/index.js';

/**
 * Generate the ## SKILLS section from parsed skills.
 * Returns empty string if skills array is empty.
 */
export function generateSkillsSection(skills: ParsedSkill[]): string {
  if (skills.length === 0) {
    return '';
  }

  let section = '## SKILLS\n\n';

  for (const skill of skills) {
    section += `### ${skill.metadata.name}\n\n`;
    section += `${skill.content.trim()}\n\n`;
  }

  return section.trimEnd();
}

/**
 * Generate the ## COMMANDS section from parsed commands.
 * Returns empty string if commands array is empty.
 */
export function generateCommandsSection(commands: ParsedCommand[]): string {
  if (commands.length === 0) {
    return '';
  }

  let section = '## COMMANDS\n\n';

  for (const command of commands) {
    section += `### ${command.name}\n\n`;
    section += `${command.content.trim()}\n\n`;
  }

  return section.trimEnd();
}
