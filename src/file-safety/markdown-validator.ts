/**
 * Result of markdown structure validation
 */
export interface ValidationResult {
  /** Whether the content passed all validation checks */
  valid: boolean;
  /** List of validation failure reasons (empty if valid) */
  errors: string[];
}

/**
 * Validates markdown structure to detect obviously broken output.
 *
 * This is intentionally minimal validation - we're checking for clearly broken output,
 * not enforcing strict markdown spec. A file that's completely empty is wrong,
 * but a file with just text and no headings is questionable (not an error).
 *
 * Validation rules:
 * - Content must not be empty or whitespace-only
 * - Content must contain at least one markdown heading (# through ######)
 *
 * @param content - Markdown content to validate
 * @returns ValidationResult with valid flag and any error messages
 */
export function validateMarkdownStructure(content: string): ValidationResult {
  const errors: string[] = [];

  // Check if content is empty or whitespace-only
  if (!content.trim()) {
    errors.push('Content is empty');
  }

  // Check if content contains at least one markdown heading
  // Pattern: ^#{1,6}\s+.+$ (one or more #, followed by space, followed by text)
  // Multiline mode to check each line
  const hasHeadings = /^#{1,6}\s+.+$/m.test(content);
  if (!hasHeadings) {
    errors.push('Missing markdown headings');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
