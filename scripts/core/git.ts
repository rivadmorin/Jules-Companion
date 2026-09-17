/**
 * Git execution and isolation primitives for Jules Companion.
 * @module core/git
 */

import * as path from 'path';
import { spawnSync } from 'child_process';

/**
 * Result returned by a synchronous git execution.
 */
export interface GitExecutionResult {
  /** True if the command exited with status code 0 */
  success: boolean;
  /** Captured stdout string */
  stdout: string;
  /** Captured stderr or error message string */
  stderr: string;
}

/**
 * Executes a Git command synchronously and returns the structured output.
 * Preserves argument boundaries and spaces safely using spawnSync.
 *
 * @param args - An array of git command arguments (e.g., ['branch', '--show-current']).
 * @param cwd - The working directory to execute the command in (defaults to current working directory).
 * @returns An object containing the success status, standard output, and standard error.
 */
export function runGit(
  args: string[],
  cwd: string = process.cwd()
): { success: boolean; stdout: string; stderr: string } {
  const resolvedCwd = path.resolve(cwd);
  const res = spawnSync('git', args, { encoding: 'utf8', cwd: resolvedCwd });
  return {
    success: res.status === 0,
    stdout: res.stdout ? res.stdout.trim() : '',
    stderr: res.stderr ? res.stderr.trim() : ''
  };
}

/**
 * Returns the current active Git branch name.
 *
 * @param cwd - Working directory to query (defaults to process.cwd())
 * @returns The branch name or 'unknown' if not a git repository
 */
export function getCurrentBranch(cwd: string = process.cwd()): string {
  const res = runGit(['branch', '--show-current'], cwd);
  return res.success && res.stdout ? res.stdout : 'unknown';
}
