import { multiselect, isCancel } from '@clack/prompts';
import type { ParsedCommand } from '../../types/index.js';

export async function selectCommands(
  commands: ParsedCommand[]
): Promise<ParsedCommand[] | null> {
  if (commands.length === 0) {
    return [];
  }

  const options = commands.map((command) => ({
    value: command,
    label: command.name,
  }));

  const result = await multiselect({
    message: 'Select commands to embed:',
    options,
    required: false,
  });

  if (isCancel(result)) {
    return null;
  }

  return result as ParsedCommand[];
}
