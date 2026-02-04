import { multiselect, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import type { ParsedSkill } from '../../types/index.js';

export async function selectSkills(
  skills: ParsedSkill[]
): Promise<ParsedSkill[] | null> {
  if (skills.length === 0) {
    return [];
  }

  // Sort skills: global first, then project
  const sortedSkills = [...skills].sort((a, b) => {
    if (a.location === b.location) return 0;
    return a.location === 'global' ? -1 : 1;
  });

  const options = sortedSkills.map((skill) => ({
    value: skill,
    label:
      skill.location === 'global'
        ? `${pc.blue('(global)')} ${skill.metadata.name}`
        : `${pc.green('(project)')} ${skill.metadata.name}`,
    hint: skill.metadata.description || undefined,
  }));

  const result = await multiselect({
    message: 'Select skills to embed:',
    options,
    required: false,
  });

  if (isCancel(result)) {
    return null;
  }

  return result as ParsedSkill[];
}
