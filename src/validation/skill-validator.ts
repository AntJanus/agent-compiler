import { readFile } from 'node:fs/promises';
import { parseSkillFile } from '../parser/index.js';
import { validateMarkdownStructure } from '../file-safety/index.js';
import type { DiscoveredFile, ValidationIssue, ValidationResult } from '../types/index.js';

/**
 * Extract warning code from warning message text
 */
function extractWarningCode(warning: string): string {
  if (warning.includes('missing "name"')) {
    return 'MISSING_NAME';
  }
  if (warning.includes('missing "description"')) {
    return 'MISSING_DESCRIPTION';
  }
  return 'UNKNOWN';
}

/**
 * Validate a collection of skill files.
 * Surfaces issues from parseSkillFile and validateMarkdownStructure.
 *
 * Errors (fatal):
 * - PARSE_ERROR: YAML parsing failed
 *
 * Warnings (non-fatal):
 * - MISSING_NAME: Skill missing name in frontmatter
 * - MISSING_DESCRIPTION: Skill missing description in frontmatter
 * - INVALID_MARKDOWN: Markdown structure validation failed
 * - EMPTY_CONTENT: Skill has no markdown content
 *
 * @param skills - List of discovered skill files to validate
 * @returns ValidationResult with valid=true if no errors (warnings don't affect validity)
 */
export async function validateSkills(skills: DiscoveredFile[]): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const skill of skills) {
    try {
      // Read and parse skill file
      const content = await readFile(skill.path, 'utf8');
      const parseResult = parseSkillFile(skill.path, content);

      // Convert parser warnings to validation issues
      for (const warning of parseResult.warnings) {
        issues.push({
          severity: 'warning',
          file: skill.path,
          message: warning,
          code: extractWarningCode(warning)
        });
        warningCount++;
      }

      // Check for empty content
      if (!parseResult.content.trim()) {
        issues.push({
          severity: 'warning',
          file: skill.path,
          message: 'Skill has empty content',
          code: 'EMPTY_CONTENT'
        });
        warningCount++;
      } else {
        // Validate markdown structure (only if content exists)
        const structureResult = validateMarkdownStructure(parseResult.content);
        if (!structureResult.valid) {
          for (const error of structureResult.errors) {
            // Markdown structure issues are warnings, not errors (warn-but-allow)
            issues.push({
              severity: 'warning',
              file: skill.path,
              message: `Markdown structure: ${error}`,
              code: 'INVALID_MARKDOWN'
            });
            warningCount++;
          }
        }
      }
    } catch (error) {
      // Parse errors are true errors (YAML malformation)
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        severity: 'error',
        file: skill.path,
        message: `Parse error: ${message}`,
        code: 'PARSE_ERROR'
      });
      errorCount++;
    }
  }

  return {
    valid: errorCount === 0,
    fileCount: skills.length,
    errors: errorCount,
    warnings: warningCount,
    issues
  };
}
