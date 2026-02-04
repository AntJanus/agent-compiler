import { multiselect, isCancel } from '@clack/prompts';

export type ContentType = 'skills' | 'commands';

export async function selectContentTypes(): Promise<ContentType[] | null> {
  const result = await multiselect({
    message: 'Select content to embed:',
    options: [
      {
        value: 'skills',
        label: 'Skills',
        hint: 'Embed selected skills',
      },
      {
        value: 'commands',
        label: 'Commands',
        hint: 'Embed selected commands',
      },
    ],
    required: true,
  });

  if (isCancel(result)) {
    return null;
  }

  return result as ContentType[];
}
