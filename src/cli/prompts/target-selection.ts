import { select, isCancel } from '@clack/prompts';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface TargetFileResult {
  path: string;
  isNew: boolean;
}

export async function selectTargetFile(
  cwd: string = process.cwd()
): Promise<TargetFileResult | null> {
  const claudePath = resolve(cwd, 'CLAUDE.md');
  const agentsPath = resolve(cwd, 'AGENTS.md');

  const claudeExists = existsSync(claudePath);
  const agentsExists = existsSync(agentsPath);

  const options: Array<{ value: string; label: string; hint?: string }> = [];

  if (claudeExists) {
    options.push({
      value: `existing:${claudePath}`,
      label: 'Use existing CLAUDE.md',
      hint: 'Update current CLAUDE.md file',
    });
  }

  if (agentsExists) {
    options.push({
      value: `existing:${agentsPath}`,
      label: 'Use existing AGENTS.md',
      hint: 'Update current AGENTS.md file',
    });
  }

  options.push(
    {
      value: `new:${claudePath}`,
      label: 'Create new CLAUDE.md',
      hint: 'Create fresh CLAUDE.md file',
    },
    {
      value: `new:${agentsPath}`,
      label: 'Create new AGENTS.md',
      hint: 'Create fresh AGENTS.md file',
    }
  );

  const result = await select({
    message: 'Select target file:',
    options,
  });

  if (isCancel(result)) {
    return null;
  }

  const [type, path] = (result as string).split(':');
  return {
    path,
    isNew: type === 'new',
  };
}
