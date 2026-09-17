/**
 * Shared utility helpers for MCP server handlers.
 * @module mcp/utils
 */

/**
 * Intercepts stdout/stderr during CLI runner executions to prevent stdio stream corruption.
 *
 * @param fn - Asynchronous or synchronous execution callback to capture.
 * @returns Combined captured output string.
 */
export async function captureOutput(fn: () => Promise<any> | any): Promise<string> {
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  let buffer = '';

  process.stdout.write = (chunk: any) => {
    buffer += chunk.toString();
    return true;
  };
  process.stderr.write = (chunk: any) => {
    buffer += chunk.toString();
    return true;
  };

  try {
    await fn();
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return buffer.trim();
}
