/**
 * Native side-by-side visual diff viewer for Jules session changesets.
 * @module ui/visual_diff
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { pullDiffApi } from '../client/jules_api';

/**
 * Representation of a file modified within a unified diff patch.
 */
export interface ParsedDiffFile {
  /** Relative repository path of the modified file */
  file: string;
  /** Reconstructed text content before the patch */
  before: string;
  /** Reconstructed text content after the patch */
  after: string;
}

/**
 * Parses a standard Git unidiff patch string into reconstructed before/after representations per file.
 *
 * @param diffText - Raw unidiff patch string.
 * @returns Array of ParsedDiffFile objects.
 */
export function parseDiffFiles(diffText: string): ParsedDiffFile[] {
  if (!diffText || !diffText.trim()) return [];
  const fileDiffs: ParsedDiffFile[] = [];
  const parts = diffText.split(/^diff --git /m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split('\n');
    const header = lines[0];
    const match = header.match(/a\/(.+?)\s+b\/(.+?)$/);
    if (!match) continue;
    const filePath = match[2];

    const beforeLines: string[] = [];
    const afterLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('@@')) {
        continue;
      } else if (
        l.startsWith('---') ||
        l.startsWith('+++') ||
        l.startsWith('index ') ||
        l.startsWith('new file ') ||
        l.startsWith('deleted file ')
      ) {
        continue;
      } else if (l.startsWith('-')) {
        beforeLines.push(l.slice(1));
      } else if (l.startsWith('+')) {
        afterLines.push(l.slice(1));
      } else if (l.startsWith(' ')) {
        beforeLines.push(l.slice(1));
        afterLines.push(l.slice(1));
      }
    }

    fileDiffs.push({
      file: filePath,
      before: beforeLines.join('\n'),
      after: afterLines.join('\n')
    });
  }

  return fileDiffs;
}

/**
 * Fetches the session patch and launches VS Code's native visual side-by-side diff editor.
 *
 * @param sessionId - Target session ID to view diff for.
 * @param targetDir - Root workspace directory.
 * @returns A promise resolving when the diff viewer is launched.
 */
export async function openVisualDiff(sessionId: string, targetDir: string): Promise<void> {
  const diffContent = await pullDiffApi(sessionId, targetDir);
  if (!diffContent || !diffContent.trim()) {
    vscode.window.showInformationMessage(`No diff changes found for session #${sessionId}.`);
    return;
  }

  const files = parseDiffFiles(diffContent);
  if (files.length === 0) {
    vscode.window.showInformationMessage(`No modified files detected in diff for session #${sessionId}.`);
    return;
  }

  let selected = files[0];
  if (files.length > 1) {
    const picked = await vscode.window.showQuickPick(
      files.map(f => ({
        label: `$(file) ${f.file}`,
        description: `${f.after.split('\n').length} lines`,
        item: f
      })),
      { title: `Select File to Inspect Diff (#${sessionId.slice(0, 8)})` }
    );
    if (!picked) return;
    selected = picked.item;
  }

  const scratchDir = path.join(targetDir, '.jules-companion', 'scratch', 'visual_diff', sessionId);
  fs.mkdirSync(scratchDir, { recursive: true });

  const safeFileName = path.basename(selected.file).replace(/[^a-zA-Z0-9._-]/g, '_');
  const beforeFile = path.join(scratchDir, `${safeFileName}.original`);
  const afterFile = path.join(scratchDir, `${safeFileName}.jules_patch`);

  fs.writeFileSync(beforeFile, selected.before, 'utf8');
  fs.writeFileSync(afterFile, selected.after, 'utf8');

  const beforeUri = vscode.Uri.file(beforeFile);
  const afterUri = vscode.Uri.file(afterFile);
  const title = `${path.basename(selected.file)} (#${sessionId.slice(0, 8)} Original ↔ Jules Patch)`;

  await vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, title);
}
