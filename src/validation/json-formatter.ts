import type { ValidationSummary, ValidationIssue, JsonValidationOutput } from '../types/index.js';

/**
 * Format validation results as JSON output for CI/CD integration.
 * Produces ESLint-style output grouped by file with version and timestamp.
 *
 * @param summary - Validation summary containing all issues from skills and commands
 * @param version - Package version (passed as parameter to avoid ESM import issues)
 * @returns JSON string with structured validation output
 */
export function formatJsonOutput(summary: ValidationSummary, version: string): string {
  // Group all issues by file path
  const issuesByFile = new Map<string, ValidationIssue[]>();

  // Collect issues from skills
  for (const issue of summary.skills.issues) {
    const existing = issuesByFile.get(issue.file) || [];
    existing.push(issue);
    issuesByFile.set(issue.file, existing);
  }

  // Collect issues from commands
  for (const issue of summary.commands.issues) {
    const existing = issuesByFile.get(issue.file) || [];
    existing.push(issue);
    issuesByFile.set(issue.file, existing);
  }

  // Build results array with per-file statistics
  const results = Array.from(issuesByFile.entries()).map(([filePath, issues]) => {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    return {
      filePath,
      errorCount,
      warningCount,
      issues: issues.map(issue => ({
        severity: issue.severity,
        message: issue.message,
        code: issue.code
      }))
    };
  });

  // Construct full output structure
  const output: JsonValidationOutput = {
    version,
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: summary.totalFiles,
      filesWithIssues: issuesByFile.size,
      errorCount: summary.totalErrors,
      warningCount: summary.totalWarnings
    },
    results
  };

  return JSON.stringify(output, null, 2);
}
