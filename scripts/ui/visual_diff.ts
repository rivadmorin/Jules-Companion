/**
 * Native side-by-side visual diff viewer and virtual document provider for Jules session changesets.
 * @module ui/visual_diff
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { pullDiffApi } from '../client/jules_api';

/**
 * Custom URI scheme for Jules in-memory virtual diff documents.
 */
export const JULES_DIFF_SCHEME = 'jules-diff';

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
  /** Count of added lines in this patch */
  additions: number;
  /** Count of deleted lines in this patch */
  deletions: number;
}

/**
 * In-memory TextDocumentContentProvider for zero-disk-write diff and patch inspection.
 * Delivers virtual document buffers directly to VS Code's native side-by-side diff editor.
 */
export class JulesDiffContentProvider implements vscode.TextDocumentContentProvider {
  private static instance: JulesDiffContentProvider;
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  /** Internal memory cache mapping URI string keys to document text content */
  private contentCache = new Map<string, string>();

  /**
   * Returns the singleton instance of the JulesDiffContentProvider.
   *
   * @returns {JulesDiffContentProvider} The provider instance.
   */
  public static getInstance(): JulesDiffContentProvider {
    if (!JulesDiffContentProvider.instance) {
      JulesDiffContentProvider.instance = new JulesDiffContentProvider();
    }
    return JulesDiffContentProvider.instance;
  }

  /**
   * Sets in-memory document content for a target virtual URI and notifies VS Code.
   *
   * @param uri - Target virtual document URI.
   * @param content - Text content of the virtual document.
   */
  public setContent(uri: vscode.Uri, content: string): void {
    this.contentCache.set(uri.toString(), content);
    this._onDidChange.fire(uri);
  }

  /**
   * Retrieves currently cached content for a target virtual URI.
   *
   * @param uri - Target virtual document URI.
   * @returns {string | undefined} Cached content if present.
   */
  public getContent(uri: vscode.Uri): string | undefined {
    return this.contentCache.get(uri.toString());
  }

  /**
   * Cleans up all cached virtual documents associated with a specific session ID.
   *
   * @param sessionId - Target session ID to purge.
   */
  public clearSession(sessionId: string): void {
    for (const key of Array.from(this.contentCache.keys())) {
      if (key.includes(sessionId)) {
        this.contentCache.delete(key);
      }
    }
  }

  /**
   * VS Code TextDocumentContentProvider contract: provides virtual document text for a given URI.
   *
   * @param uri - Requested virtual document URI.
   * @returns {string} The text content of the document.
   */
  public provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contentCache.get(uri.toString()) || '';
  }
}

/**
 * Generates a virtual URI for the original (pre-patch) version of a modified file.
 *
 * @param sessionId - Jules session ID.
 * @param filePath - Relative path of the file.
 * @returns {vscode.Uri} Virtual URI pointing to the original document.
 */
export function getOriginalUri(sessionId: string, filePath: string): vscode.Uri {
  const safe = filePath.replace(/\\/g, '/');
  return vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/${sessionId}/original/${safe}`);
}

/**
 * Generates a virtual URI for the proposed (post-patch) version of a modified file.
 *
 * @param sessionId - Jules session ID.
 * @param filePath - Relative path of the file.
 * @returns {vscode.Uri} Virtual URI pointing to the proposed document.
 */
export function getProposedUri(sessionId: string, filePath: string): vscode.Uri {
  const safe = filePath.replace(/\\/g, '/');
  return vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/${sessionId}/proposed/${safe}`);
}

/**
 * Generates a virtual URI for the unified raw git patch of a session.
 *
 * @param sessionId - Jules session ID.
 * @returns {vscode.Uri} Virtual URI pointing to the unified patch document.
 */
export function getUnifiedDiffUri(sessionId: string): vscode.Uri {
  return vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/${sessionId}/patch.diff`);
}

/**
 * Parses a standard Git unidiff patch string into reconstructed before/after representations per file.
 *
 * @param diffText - Raw unidiff patch string.
 * @returns Array of ParsedDiffFile objects with line additions and deletions statistics.
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
    let additions = 0;
    let deletions = 0;

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
        deletions++;
      } else if (l.startsWith('+')) {
        afterLines.push(l.slice(1));
        additions++;
      } else if (l.startsWith(' ')) {
        beforeLines.push(l.slice(1));
        afterLines.push(l.slice(1));
      }
    }

    fileDiffs.push({
      file: filePath,
      before: beforeLines.join('\n'),
      after: afterLines.join('\n'),
      additions,
      deletions
    });
  }

  return fileDiffs;
}

/**
 * Fetches the session patch and launches VS Code's native visual side-by-side diff editor.
 * Operates 100% in-memory via virtual document URIs with zero disk scratch writes.
 *
 * @param sessionId - Target session ID to view diff for.
 * @param targetDir - Root workspace directory.
 * @returns A promise resolving when the native diff editor is launched.
 */
export async function openVisualDiff(sessionId: string, targetDir: string): Promise<void> {
  let diffContent = '';
  try {
    diffContent = await pullDiffApi(sessionId, targetDir);
  } catch (err: any) {
    if (err.message?.includes('No git patch found')) {
      vscode.window.showInformationMessage(`No code changes or git patch found for session #${sessionId.slice(0, 8)}.`);
      return;
    }
    throw err;
  }

  if (!diffContent || !diffContent.trim()) {
    vscode.window.showInformationMessage(`No diff changes found for session #${sessionId.slice(0, 8)}.`);
    return;
  }

  const files = parseDiffFiles(diffContent);
  if (files.length === 0) {
    vscode.window.showInformationMessage(`No modified files detected in diff for session #${sessionId.slice(0, 8)}.`);
    return;
  }

  let selected = files[0];
  if (files.length > 1) {
    const picked = await vscode.window.showQuickPick(
      files.map(f => ({
        label: `$(diff) ${f.file}`,
        description: `+${f.additions} -${f.deletions} (${f.after.split('\n').length} lines)`,
        item: f
      })),
      { title: `Select File to Inspect Diff (#${sessionId.slice(0, 8)})` }
    );
    if (!picked) return;
    selected = picked.item;
  }

  const provider = JulesDiffContentProvider.getInstance();
  const beforeUri = getOriginalUri(sessionId, selected.file);
  const afterUri = getProposedUri(sessionId, selected.file);

  // Serve virtual in-memory content directly (zero disk writes)
  provider.setContent(beforeUri, selected.before);
  provider.setContent(afterUri, selected.after);

  const title = `${path.basename(selected.file)} (#${sessionId.slice(0, 8)} Original ↔ Jules Patch)`;
  await vscode.commands.executeCommand('vscode.diff', beforeUri, afterUri, title, { preview: true });
}

/**
 * Fetches the session patch and opens it as a unified git diff in an in-memory virtual document tab.
 * Operates 100% in-memory with zero disk scratch writes.
 *
 * @param sessionId - Target session ID to view raw patch for.
 * @param targetDir - Root workspace directory.
 * @returns A promise resolving when the document is displayed.
 */
export async function openUnifiedDiff(sessionId: string, targetDir: string): Promise<void> {
  let diffContent = '';
  try {
    diffContent = await pullDiffApi(sessionId, targetDir);
  } catch (err: any) {
    if (err.message?.includes('No git patch found')) {
      vscode.window.showInformationMessage(`No code changes or git patch found for session #${sessionId.slice(0, 8)}.`);
      return;
    }
    throw err;
  }

  if (!diffContent || !diffContent.trim()) {
    vscode.window.showInformationMessage(`No diff changes found for session #${sessionId.slice(0, 8)}.`);
    return;
  }

  const provider = JulesDiffContentProvider.getInstance();
  const unifiedUri = getUnifiedDiffUri(sessionId);
  provider.setContent(unifiedUri, diffContent);

  const doc = await vscode.workspace.openTextDocument(unifiedUri);
  await vscode.window.showTextDocument(doc, { preview: true });
}
