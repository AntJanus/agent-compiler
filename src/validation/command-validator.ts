import { readFile } from 'node:fs/promises';
import { parseCommandFile } from '../parser/index.js';
import { validateMarkdownStructure } from '../file-safety/index.js';
import type { DiscoveredFile, ValidationIssue, ValidationResult } from '../types/index.js';

/**
 * Validate a collection of command files.
 * Commands are simpler than skills - just check for empty content and basic structure.
 *
 * Errors (fatal):
 * - READ_ERROR: Failed to read command file
 *
 * Warnings (non-fatal):
 * - EMPTY_CONTENT: Command has no content
 * - INVALID_MARKDOWN: Markdown structure validation failed
 *
 * @param commands - List of discovered command files to validate
 * @returns ValidationResult with valid=true if no errors (warnings don't affect validity)
 */
export async function validateCommands(commands: DiscoveredFile[]): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const command of commands) {
    try {
      // Read and parse command file
      const content = await readFile(command.path, 'utf8');
      const parseResult = parseCommandFile(command.path, content);

      // Check for empty content
      if (!parseResult.content || !parseResult.content.trim()) {
        issues.push({
          severity: 'warning',
          file: command.path,
          message: 'Command has empty content',
          code: 'EMPTY_CONTENT'
        });
        warningCount++;
      } else {
        // Validate markdown structure (only if content exists)
        const structureResult = validateMarkdownStructure(parseResult.content);
        if (!structureResult.valid) {
          for (const error of structureResult.errors) {
            // Markdown structure issues are warnings, not errors
            issues.push({
              severity: 'warning',
              file: command.path,
              message: `Markdown structure: ${error}`,
              code: 'INVALID_MARKDOWN'
            });
            warningCount++;
          }
        }
      }
    } catch (error) {
      // Read/parse errors are true errors
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        severity: 'error',
        file: command.path,
        message: `Read error: ${message}`,
        code: 'READ_ERROR'
      });
      errorCount++;
    }
  }

  return {
    valid: errorCount === 0,
    fileCount: commands.length,
    errors: errorCount,
    warnings: warningCount,
    issues
  };
}
