/**
 * TreeDataProvider and tree items for Workspace and Git context in the VS Code sidebar.
 * @module ui/workspace_provider
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { runGit, getCurrentBranch } from '../core/git';
import { listSourcesApi } from '../client/jules_api';
import { getApiKey } from '../client/http';

/**
 * Categories of workspace metadata items displayed in the tree view.
 */
export type WorkspaceItemCategory =
  | 'workspace'
  | 'git-origin'
  | 'git-branch'
  | 'cloud-link'
  | 'api-key';

/**
 * Structured Git remote origin repository metadata.
 */
export interface GitOriginInfo {
  /** Repository owner or organization account name */
  owner: string;
  /** Repository name */
  repo: string;
  /** Combined repository slug formatted as 'owner/repo' */
  slug: string;
  /** Browser URL to open repository on GitHub */
  webUrl: string;
}

/**
 * Resolved real-time Workspace and Git context details.
 */
export interface WorkspaceContextInfo {
  /** Absolute path to the active workspace folder */
  workspacePath: string;
  /** Name of the active workspace folder */
  workspaceName: string;
  /** Parsed remote Git origin metadata if available */
  gitOrigin?: GitOriginInfo;
  /** Active Git branch name */
  currentBranch: string;
  /** Current Git working tree state summary (e.g. clean, X uncommitted files) */
  workingTreeStatus: string;
  /** Whether this repository is linked and verified with Google Jules Cloud Sources */
  isCloudLinked: boolean;
  /** Detailed human-readable Google Jules Cloud verification status */
  cloudStatus: string;
  /** Whether the Google Jules API key is configured */
  isApiKeyConfigured: boolean;
}

/**
 * Parses a Git remote origin URL and extracts the repository slug and web URL.
 *
 * @param remoteUrl - The raw Git remote origin URL string.
 * @returns The parsed GitOriginInfo object or null if parsing fails.
 */
export function parseGitOrigin(remoteUrl: string): GitOriginInfo | null {
  if (!remoteUrl || typeof remoteUrl !== 'string') return null;
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  // Match GitHub URL patterns (SSH, HTTPS, git://)
  const ghMatch = trimmed.match(/github\.com[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    const repo = ghMatch[2].replace(/\.git$/i, '');
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      webUrl: `https://github.com/${owner}/${repo}`
    };
  }

  // Fallback for non-GitHub git remotes
  const genericMatch = trimmed.match(/[:/]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?$/i);
  if (genericMatch) {
    const owner = genericMatch[1];
    const repo = genericMatch[2].replace(/\.git$/i, '');
    const webUrl = trimmed.startsWith('http')
      ? trimmed.replace(/\.git$/i, '')
      : `https://github.com/${owner}/${repo}`;
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      webUrl
    };
  }

  return null;
}

/**
 * Resolves comprehensive Workspace and Git context for a target directory.
 *
 * @param rootPath - The target workspace root directory path.
 * @returns A promise resolving to the WorkspaceContextInfo object.
 */
export async function getWorkspaceContextInfo(rootPath: string): Promise<WorkspaceContextInfo> {
  const workspacePath = path.resolve(rootPath);
  const workspaceName = path.basename(workspacePath) || workspacePath;

  // 1. Resolve Git Remote Origin
  let gitOrigin: GitOriginInfo | undefined;
  const remoteRes = runGit(['config', '--get', 'remote.origin.url'], workspacePath);
  const rawUrl = remoteRes.success && remoteRes.stdout ? remoteRes.stdout : '';
  const parsed = parseGitOrigin(rawUrl);
  if (parsed) {
    gitOrigin = parsed;
  } else if (!rawUrl) {
    const fallbackRemote = runGit(['remote', 'get-url', 'origin'], workspacePath);
    if (fallbackRemote.success && fallbackRemote.stdout) {
      const parsedFallback = parseGitOrigin(fallbackRemote.stdout);
      if (parsedFallback) {
        gitOrigin = parsedFallback;
      }
    }
  }

  // 2. Resolve Active Branch
  let currentBranch = getCurrentBranch(workspacePath);
  if (currentBranch === 'unknown') {
    const revRes = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], workspacePath);
    if (revRes.success && revRes.stdout) {
      currentBranch = revRes.stdout;
    }
  }

  // 3. Resolve Working Tree Status
  let workingTreeStatus = 'clean';
  const statusRes = runGit(['status', '--porcelain'], workspacePath);
  if (statusRes.success) {
    const lines = statusRes.stdout
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    if (lines.length > 0) {
      workingTreeStatus = `${lines.length} uncommitted file${lines.length === 1 ? '' : 's'}`;
    }
  } else {
    workingTreeStatus = currentBranch === 'unknown' ? 'not a git repository' : 'status unavailable';
  }

  // 4. Resolve API Key Configuration
  const apiKey = getApiKey(workspacePath);
  const isApiKeyConfigured = Boolean(apiKey && apiKey.trim().length > 0);

  // 5. Resolve Jules Cloud Link Status
  let isCloudLinked = false;
  let cloudStatus = 'Unverified';

  if (!isApiKeyConfigured) {
    cloudStatus = 'Unverified (API key missing)';
  } else {
    try {
      const sources = await listSourcesApi(workspacePath);
      if (gitOrigin) {
        const matched = sources.some(s => {
          if (s.githubRepo) {
            return (
              s.githubRepo.owner.toLowerCase() === gitOrigin!.owner.toLowerCase() &&
              s.githubRepo.repo.toLowerCase() === gitOrigin!.repo.toLowerCase()
            );
          }
          return s.name.toLowerCase().includes(gitOrigin!.slug.toLowerCase());
        });

        if (matched) {
          isCloudLinked = true;
          cloudStatus = 'Verified (Linked)';
        } else {
          isCloudLinked = false;
          cloudStatus = sources.length > 0
            ? 'Unlinked (Repository not in Jules sources)'
            : 'Unlinked (No sources registered)';
        }
      } else {
        isCloudLinked = false;
        cloudStatus = 'Unlinked (No Git origin detected)';
      }
    } catch (err: any) {
      isCloudLinked = false;
      cloudStatus = `Unverified (${err?.message || 'Error querying sources'})`;
    }
  }

  return {
    workspacePath,
    workspaceName,
    gitOrigin,
    currentBranch,
    workingTreeStatus,
    isCloudLinked,
    cloudStatus,
    isApiKeyConfigured
  };
}

/**
 * Tree item representing an individual workspace or Git context property in the sidebar.
 */
export class WorkspaceTreeItem extends vscode.TreeItem {
  /**
   * Initializes a new WorkspaceTreeItem instance.
   *
   * @param label - The primary display label.
   * @param collapsibleState - The tree item collapsible state.
   * @param category - Category type of the workspace item.
   * @param detailValue - Optional secondary detail or description string.
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    public readonly category?: WorkspaceItemCategory,
    public readonly detailValue?: string
  ) {
    super(label, collapsibleState);
    if (category) {
      this.contextValue = `workspace-item-${category}`;
    }
  }
}

/**
 * TreeDataProvider displaying real-time Workspace and Git context in the Jules Companion sidebar.
 */
export class WorkspaceTreeDataProvider implements vscode.TreeDataProvider<WorkspaceTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void> =
    new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  /**
   * Initializes a new WorkspaceTreeDataProvider instance.
   *
   * @param getWorkspaceRoot - Function returning the active workspace root directory path.
   */
  constructor(private getWorkspaceRoot: () => string = () => process.cwd()) {}

  /**
   * Refreshes the workspace context tree view.
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Returns the tree item representation for the given element.
   *
   * @param element - The WorkspaceTreeItem to render.
   * @returns The tree item.
   */
  getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Fetches child tree items for the workspace context provider.
   *
   * @param element - Optional parent tree item when expanding.
   * @returns A promise resolving to an array of WorkspaceTreeItem elements.
   */
  async getChildren(element?: WorkspaceTreeItem): Promise<WorkspaceTreeItem[]> {
    if (element) {
      return [];
    }

    const rootPath = this.getWorkspaceRoot();
    if (!rootPath) {
      return [
        new WorkspaceTreeItem(
          'No workspace open',
          vscode.TreeItemCollapsibleState.None,
          'workspace',
          'Open a folder to inspect context'
        )
      ];
    }

    const context = await getWorkspaceContextInfo(rootPath);
    return this.buildTreeItems(context);
  }

  /**
   * Constructs tree items representing each facet of the workspace context.
   *
   * @param context - The resolved workspace context metadata.
   * @returns An array of configured WorkspaceTreeItem entries.
   */
  buildTreeItems(context: WorkspaceContextInfo): WorkspaceTreeItem[] {
    const items: WorkspaceTreeItem[] = [];

    // 1. 📁 Workspace: Folder name and path (click to reveal in explorer)
    const wsItem = new WorkspaceTreeItem(
      `Workspace: ${context.workspaceName}`,
      vscode.TreeItemCollapsibleState.None,
      'workspace',
      context.workspacePath
    );
    wsItem.description = context.workspacePath;
    wsItem.tooltip = `Workspace Folder: ${context.workspacePath}\nClick to reveal in File Explorer`;
    wsItem.iconPath = new vscode.ThemeIcon('folder');
    wsItem.command = {
      command: 'revealFileInOS',
      title: 'Reveal in Explorer',
      arguments: [vscode.Uri.file(context.workspacePath)]
    };
    items.push(wsItem);

    // 2. 🐙 Git Origin: Remote repository slug, with command to open on GitHub
    const originSlug = context.gitOrigin?.slug;
    const originLabel = originSlug ? `Git Origin: ${originSlug}` : 'Git Origin: Not configured';
    const originItem = new WorkspaceTreeItem(
      originLabel,
      vscode.TreeItemCollapsibleState.None,
      'git-origin',
      originSlug || 'None'
    );
    originItem.description = originSlug || 'No remote origin';
    originItem.iconPath = new vscode.ThemeIcon('repo');
    if (context.gitOrigin?.webUrl) {
      originItem.tooltip = `Remote: ${originSlug}\nOrigin URL: ${context.gitOrigin.webUrl}\nClick to open on GitHub`;
      originItem.command = {
        command: 'vscode.open',
        title: 'Open on GitHub',
        arguments: [vscode.Uri.parse(context.gitOrigin.webUrl)]
      };
    } else {
      originItem.tooltip = 'No Git remote origin configured.';
    }
    items.push(originItem);

    // 3. 🌿 Current Branch: Active branch name and working tree status
    const branchItem = new WorkspaceTreeItem(
      `Current Branch: ${context.currentBranch}`,
      vscode.TreeItemCollapsibleState.None,
      'git-branch',
      context.workingTreeStatus
    );
    branchItem.description = context.workingTreeStatus;
    branchItem.tooltip = `Active Branch: ${context.currentBranch}\nWorking Tree: ${context.workingTreeStatus}\nClick to switch branch`;
    branchItem.iconPath = new vscode.ThemeIcon('git-branch');
    branchItem.command = {
      command: 'git.checkout',
      title: 'Checkout Branch'
    };
    items.push(branchItem);

    // 4. ☁️ Jules Cloud Link: Verified / Linked status checked against listSourcesApi
    const cloudItem = new WorkspaceTreeItem(
      `Jules Cloud Link: ${context.isCloudLinked ? 'Linked' : 'Unlinked'}`,
      vscode.TreeItemCollapsibleState.None,
      'cloud-link',
      context.cloudStatus
    );
    cloudItem.description = context.isCloudLinked ? 'Verified' : 'Unlinked';
    cloudItem.tooltip = `Jules Cloud Link Status: ${context.cloudStatus}\nClick to re-verify link with Google Jules Cloud Sources`;
    cloudItem.iconPath = context.isCloudLinked
      ? new vscode.ThemeIcon('cloud', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('cloud');
    cloudItem.command = {
      command: 'jules.refreshWorkspace',
      title: 'Re-verify Jules Cloud Link'
    };
    items.push(cloudItem);

    // 5. 🔑 API Key: Configured / Missing status
    const apiKeyItem = new WorkspaceTreeItem(
      `API Key: ${context.isApiKeyConfigured ? 'Configured' : 'Missing'}`,
      vscode.TreeItemCollapsibleState.None,
      'api-key',
      context.isApiKeyConfigured ? 'Active' : 'Missing'
    );
    apiKeyItem.description = context.isApiKeyConfigured ? 'Active' : 'Missing';
    apiKeyItem.tooltip = context.isApiKeyConfigured
      ? 'Google Jules API key is configured and active. Click to update.'
      : 'Google Jules API key is missing. Click to configure.';
    apiKeyItem.iconPath = context.isApiKeyConfigured
      ? new vscode.ThemeIcon('key', new vscode.ThemeColor('testing.iconPassed'))
      : new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconFailed'));
    apiKeyItem.command = {
      command: 'jules.setApiKey',
      title: 'Set Google Jules API Key'
    };
    items.push(apiKeyItem);

    return items;
  }
}
