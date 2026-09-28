/**
 * Git execution and isolation primitives for Jules Companion.
 * @module core/git
 */

import * as fs from 'fs';
import * as os from 'os';
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
): GitExecutionResult {
  const resolvedCwd = path.resolve(cwd);
  let res = spawnSync('git', args, { encoding: 'utf8', cwd: resolvedCwd });
  if (res.error && (res.error as any).code === 'ENOENT' && process.platform === 'win32') {
    const fallbackGit = 'C:\\Program Files\\Git\\cmd\\git.exe';
    if (fs.existsSync(fallbackGit)) {
      res = spawnSync(fallbackGit, args, { encoding: 'utf8', cwd: resolvedCwd });
    }
  }
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

/**
 * Result of checking whether a unified diff patch can be applied cleanly without merge conflicts.
 */
export interface PatchCheckResult {
  /** True if the patch can be applied cleanly to the target working tree with 0 conflicts */
  canApplyCleanly: boolean;
  /** Captured diagnostic output or error reason from git apply */
  message: string;
}

/**
 * Checks whether a unified diff patch can be applied cleanly to the current working tree without conflicts.
 * Uses a temporary patch file and runs `git apply --check`.
 *
 * @param patchContent - The unidiff patch string to verify.
 * @param cwd - Working directory to test against (defaults to process.cwd()).
 * @returns An object indicating whether the patch is conflict-free and the status message.
 */
export function checkPatchConflict(
  patchContent: string,
  cwd: string = process.cwd()
): PatchCheckResult {
  if (!patchContent || !patchContent.trim()) {
    return { canApplyCleanly: true, message: 'Empty patch: no changes to apply.' };
  }

  const scratchDir = path.join(cwd, '.jules-companion', 'scratch');
  const tempDir = fs.existsSync(scratchDir) ? scratchDir : os.tmpdir();
  const tempPatchPath = path.join(tempDir, `patch-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.patch`);

  try {
    fs.writeFileSync(tempPatchPath, patchContent, 'utf8');
    const res = runGit(['apply', '--check', tempPatchPath], cwd);
    if (res.success) {
      return {
        canApplyCleanly: true,
        message: 'Patch applies cleanly with 0 conflicts.'
      };
    }
    return {
      canApplyCleanly: false,
      message: res.stderr || res.stdout || 'Conflict detected during patch dry-run.'
    };
  } catch (err: any) {
    return {
      canApplyCleanly: false,
      message: `Failed to execute patch check: ${err.message}`
    };
  } finally {
    try {
      if (fs.existsSync(tempPatchPath)) {
        fs.unlinkSync(tempPatchPath);
      }
    } catch (_) {}
  }
}

