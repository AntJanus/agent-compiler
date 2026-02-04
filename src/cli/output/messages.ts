import pc from 'picocolors';

/**
 * Structured error with context and resolution steps
 * Provides formatted output for CLI display
 */
export class ActionableError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, string>,
    public readonly resolution: string[]
  ) {
    super(message);
    this.name = 'ActionableError';
  }

  /**
   * Formats error for CLI display with colors and structure
   * @returns Multi-line formatted string
   */
  format(): string {
    const lines = [
      pc.red(`Error: ${this.message}`),
      '',
      pc.dim('Context:')
    ];

    for (const [key, value] of Object.entries(this.context)) {
      lines.push(`  ${pc.cyan(key)}: ${value}`);
    }

    if (this.resolution.length > 0) {
      lines.push('', pc.dim('To resolve:'));
      this.resolution.forEach((step, i) => {
        lines.push(`  ${i + 1}. ${step}`);
      });
    }

    return lines.join('\n');
  }
}

/**
 * Creates an ActionableError for permission issues
 */
export function createPermissionError(filePath: string): ActionableError {
  return new ActionableError(
    'Permission denied',
    {
      file: filePath,
      reason: 'Insufficient permissions to access file'
    },
    [
      'Check file permissions with `ls -la`',
      'Ensure you have write access to the file or directory',
      'Try running with appropriate permissions'
    ]
  );
}

/**
 * Creates an ActionableError for missing files
 */
export function createFileNotFoundError(filePath: string): ActionableError {
  return new ActionableError(
    'File not found',
    {
      file: filePath,
      reason: 'The specified file does not exist'
    },
    [
      'Check the file path is correct',
      'Verify the file exists with `ls`',
      'Ensure you\'re in the correct directory'
    ]
  );
}

/**
 * Creates an ActionableError for parsing failures
 */
export function createParseError(filePath: string, details: string): ActionableError {
  return new ActionableError(
    'Failed to parse file',
    {
      file: filePath,
      details
    },
    [
      'Check file format is valid',
      'Verify YAML frontmatter syntax',
      'Look for unclosed quotes or invalid characters'
    ]
  );
}
