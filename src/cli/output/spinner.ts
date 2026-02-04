import ora from 'ora';
import pc from 'picocolors';

/**
 * Wraps an async operation with a spinner for visual feedback
 * @param message Message to display during operation
 * @param operation Async operation to execute
 * @returns Result of the operation
 * @throws Error if operation fails
 */
export async function withSpinner<T>(
  message: string,
  operation: () => Promise<T>
): Promise<T> {
  const spinner = ora(message).start();
  try {
    const result = await operation();
    spinner.succeed(pc.green(message));
    return result;
  } catch (error) {
    spinner.fail(pc.red(message));
    throw error;
  }
}

/**
 * Creates a spinner instance for manual control
 * Useful for multi-step operations where spinner text needs updates
 * @param message Initial message
 * @returns Ora spinner instance
 */
export function createSpinner(message: string) {
  return ora(message);
}
