import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

/**
 * Remark plugin that shifts all heading levels down by one (increments depth by 1).
 * Caps at maximum heading depth of 6.
 */
const remarkShiftHeadings: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'heading', (node) => {
      node.depth = Math.min(node.depth + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    });
  };
};

/**
 * Transform markdown content by shifting all headings down one level.
 *
 * @param content - The markdown content to transform
 * @returns The transformed content with shifted headings
 */
export async function transformHeadings(content: string): Promise<string> {
  // Return unchanged if content is empty or whitespace-only
  if (!content || !content.trim()) {
    return content;
  }

  // Check if content contains any headings
  if (!content.match(/^#{1,6}\s/m)) {
    return content;
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkShiftHeadings)
    .use(remarkStringify)
    .process(content);

  return String(file);
}

export default remarkShiftHeadings;
