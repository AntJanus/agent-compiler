/**
 * Validation issue with severity, location, and diagnostic code
 */
export interface ValidationIssue {
  severity: 'error' | 'warning';
  file: string;
  message: string;
  code: string;
}

/**
 * Result of validating a set of files
 */
export interface ValidationResult {
  /** Whether validation passed (errors === 0; warnings don't affect validity) */
  valid: boolean;
  /** Number of files validated */
  fileCount: number;
  /** Number of errors found */
  errors: number;
  /** Number of warnings found */
  warnings: number;
  /** List of all issues found */
  issues: ValidationIssue[];
}

/**
 * Summary of validation across skills and commands
 */
export interface ValidationSummary {
  skills: ValidationResult;
  commands: ValidationResult;
  totalFiles: number;
  totalErrors: number;
  totalWarnings: number;
}

/**
 * JSON output format for CI/CD integration (ESLint-style)
 */
export interface JsonValidationOutput {
  version: string;
  timestamp: string;
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    errorCount: number;
    warningCount: number;
  };
  results: Array<{
    filePath: string;
    errorCount: number;
    warningCount: number;
    issues: Array<{
      severity: 'error' | 'warning';
      message: string;
      code: string;
    }>;
  }>;
}
