/**
 * TreeDataProvider and tree items for Jules sessions in the VS Code sidebar.
 * @module ui/sessions_provider
 */

import * as vscode from 'vscode';
import { loadSessions, saveSessions } from '../core/storage';
import { listSessionsApi } from '../client/jules_api';
import { SessionRecord } from '../core/types';
import {
  isSessionActive,
  isSessionCompleted,
  isSessionFailed,
  isSessionAwaitingApproval,
  isSessionAwaitingInput
} from '../utils';

/**
 * Sanitizes and formats an agent name for display.
 * @param agent - Raw agent identifier or team list.
 * @returns Clean, formatted agent name string.
 */
export function cleanAgentName(agent?: string): string {
  if (!agent || !agent.trim()) return 'default';
  return agent.trim();
}

/**
 * Cleans and truncates a task description for single-line display in tree item labels.
 * @param task - Raw task instruction or prompt.
 * @param maxLength - Maximum allowed length before truncation (default 28).
 * @returns Single-line sanitized task string.
 */
export function cleanTaskString(task?: string, maxLength: number = 28): string {
  if (!task) return 'No task';
  const singleLine = task.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 3)}...`;
}

/**
 * Formats an ISO timestamp or date string into a clean, human-readable date/time representation.
 * @param isoOrStr - ISO timestamp or date string to format.
 * @returns Cleanly formatted date/time string.
 */
export function formatDateTime(isoOrStr?: string): string {
  if (!isoOrStr) return 'N/A';
  const d = new Date(isoOrStr);
  if (isNaN(d.getTime())) return isoOrStr;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Computes a human-friendly relative time string (e.g. '5m ago', '2h ago').
 * @param timestamp - The timestamp or date string to compare against current time.
 * @returns Relative time description string or undefined if timestamp is invalid.
 */
export function getRelativeTime(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return undefined;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 0 || diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

/**
 * Tree item representing a Jules session or its details.
 */
export class SessionTreeItem extends vscode.TreeItem {
  /**
   * Creates a new instance of SessionTreeItem.
   * @param label - Display label for the tree item.
   * @param collapsibleState - Collapsible state (collapsed or none).
   * @param session - Associated session record.
   * @param detailKey - Optional key name when representing a detail item.
   * @param detailValue - Optional value when representing a detail item.
   */
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly session?: SessionRecord,
    public readonly detailKey?: string,
    public readonly detailValue?: string
  ) {
    super(label, collapsibleState);

    if (session && !detailKey) {
      this.id = session.id;

      // Status string and relative time or branch
      const statusStr = session.status || 'UNKNOWN';
      const relTime = getRelativeTime(session.timestamp || session.createdAt);
      const branchStr = session.branch;
      const relativeTimeOrBranch = relTime && branchStr ? `${relTime} • ${branchStr}` : (relTime || branchStr || 'main');
      const archivePrefix = session.archived ? '[ARCHIVED] • ' : '';
      this.description = `${archivePrefix}[${statusStr}] • ${relativeTimeOrBranch}`;

      // Rich Markdown tooltip with all metadata (Task, Branch, Agent, Status, Timestamps, Source)
      const tooltip = new vscode.MarkdownString();
      tooltip.isTrusted = true;
      tooltip.supportHtml = true;
      tooltip.appendMarkdown(`### Jules Session: \`#${session.id}\`\n\n`);
      tooltip.appendMarkdown(`- **Task:** ${session.task || 'No task description'}\n`);
      tooltip.appendMarkdown(`- **Branch:** \`${session.branch || 'main'}\`\n`);
      tooltip.appendMarkdown(`- **Agent:** \`${cleanAgentName(session.agent)}\`\n`);
      tooltip.appendMarkdown(`- **Status:** **${statusStr}**${session.archived ? ' *(Archived)*' : ''}\n`);

      const createdStr = session.createdAt || session.timestamp;
      if (createdStr) {
        const createdFmt = formatDateTime(createdStr);
        const relCreated = getRelativeTime(createdStr);
        tooltip.appendMarkdown(`- **Created:** ${createdFmt}${relCreated ? ` (${relCreated})` : ''}\n`);
      }
      if (session.updatedAt) {
        const updatedFmt = formatDateTime(session.updatedAt);
        const relUpdated = getRelativeTime(session.updatedAt);
        tooltip.appendMarkdown(`- **Updated:** ${updatedFmt}${relUpdated ? ` (${relUpdated})` : ''}\n`);
      }
      if (!session.createdAt && !session.updatedAt && session.timestamp) {
        tooltip.appendMarkdown(`- **Time:** ${session.timestamp}\n`);
      }

      const sourceVal = (session as any).source || (session.branch ? `GitHub (${session.branch})` : 'Jules Cloud');
      tooltip.appendMarkdown(`- **Source:** \`${sourceVal}\`\n`);

      if (session.prUrl) {
        tooltip.appendMarkdown(`- **Pull Request:** [${session.prUrl}](${session.prUrl})\n`);
      }
      if (session.message) {
        tooltip.appendMarkdown(`\n> ${session.message}\n`);
      }
      this.tooltip = tooltip;

      // Status icon and context values for inline action compatibility
      if (session.archived) {
        this.iconPath = new vscode.ThemeIcon('archive', new vscode.ThemeColor('disabledForeground'));
        this.contextValue = 'session-archived';
      } else if (isSessionAwaitingInput(session.status)) {
        this.iconPath = new vscode.ThemeIcon('comment-discussion', new vscode.ThemeColor('testing.iconQueued'));
        this.contextValue = 'session-awaiting-input';
      } else if (isSessionAwaitingApproval(session.status)) {
        this.iconPath = new vscode.ThemeIcon('bell-dot', new vscode.ThemeColor('testing.iconQueued'));
        this.contextValue = 'session-awaiting-plan';
      } else if (isSessionCompleted(session.status)) {
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        this.contextValue = 'session-succeeded';
      } else if (isSessionActive(session.status)) {
        this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
        this.contextValue = 'session-running';
      } else if (isSessionFailed(session.status)) {
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
        this.contextValue = 'session-failed';
      } else {
        this.iconPath = new vscode.ThemeIcon('circle-outline');
        this.contextValue = 'session';
      }
    } else if (detailKey && detailValue) {
      this.id = session ? `${session.id}-${detailKey.toLowerCase()}` : undefined;
      this.contextValue = `session-detail-${detailKey.toLowerCase().replace(/\s+/g, '-')}`;

      switch (detailKey.toLowerCase()) {
        case 'agent':
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('sparkle');
          this.tooltip = new vscode.MarkdownString(`**Agent:** \`${detailValue}\``);
          break;
        case 'branch':
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('git-branch');
          this.tooltip = new vscode.MarkdownString(`**Git Branch:** \`${detailValue}\`\n\n*(Click to checkout session branch)*`);
          this.command = {
            command: 'jules.checkoutSessionBranch',
            title: 'Checkout Session Review Branch',
            arguments: [session]
          };
          break;
        case 'checkout':
        case 'checkout branch': {
          this.description = detailValue || session?.branch || 'Checkout branch';
          this.iconPath = new vscode.ThemeIcon('git-branch');
          const checkoutTooltip = new vscode.MarkdownString(`Click to checkout session review branch \`${session?.branch || detailValue || 'branch'}\``);
          checkoutTooltip.isTrusted = true;
          this.tooltip = checkoutTooltip;
          this.command = {
            command: 'jules.checkoutSessionBranch',
            title: 'Checkout Session Review Branch',
            arguments: [session]
          };
          break;
        }
        case 'merge':
        case 'merge session': {
          this.description = detailValue || 'Merge to current branch';
          this.iconPath = new vscode.ThemeIcon('git-merge', new vscode.ThemeColor('testing.iconPassed'));
          const mergeTooltip = new vscode.MarkdownString('Click to merge session changes into the current branch');
          mergeTooltip.isTrusted = true;
          this.tooltip = mergeTooltip;
          this.command = {
            command: 'jules.mergeSession',
            title: 'Merge Session to Current Branch',
            arguments: [session]
          };
          break;
        }
        case 'delete':
        case 'delete session': {
          this.description = detailValue || 'Delete session';
          this.iconPath = new vscode.ThemeIcon('trash', new vscode.ThemeColor('testing.iconFailed'));
          const deleteTooltip = new vscode.MarkdownString('Click to delete session (both cloud and local records)');
          deleteTooltip.isTrusted = true;
          this.tooltip = deleteTooltip;
          this.command = {
            command: 'jules.deleteSession',
            title: 'Delete Session',
            arguments: [session]
          };
          break;
        }
        case 'retry':
        case 'retry session': {
          this.description = detailValue || 'Retry failed session';
          this.iconPath = new vscode.ThemeIcon('refresh', new vscode.ThemeColor('testing.iconQueued'));
          const retryTooltip = new vscode.MarkdownString('Click to redeploy and retry this failed session');
          retryTooltip.isTrusted = true;
          this.tooltip = retryTooltip;
          this.command = {
            command: 'jules.retryFailedSession',
            title: 'Retry Failed Session',
            arguments: [session]
          };
          break;
        }
        case 'task':
        case 'instruction': {
          this.description = detailValue.length > 50 ? `${detailValue.slice(0, 47)}...` : detailValue;
          this.iconPath = new vscode.ThemeIcon('note');
          const taskTooltip = new vscode.MarkdownString();
          taskTooltip.appendMarkdown(`### Task / Instruction\n\n${detailValue}\n\n*(Click to view full text)*`);
          this.tooltip = taskTooltip;
          this.command = {
            command: 'jules.showTaskDetail',
            title: 'Show Full Task',
            arguments: [detailValue]
          };
          break;
        }
        case 'created':
        case 'updated':
        case 'timestamp': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('clock');
          const rel = getRelativeTime(session?.createdAt || session?.timestamp || detailValue);
          this.tooltip = new vscode.MarkdownString(`**${detailKey}:** \`${detailValue}\`${rel ? ` (${rel})` : ''}`);
          break;
        }
        case 'pull request':
        case 'pr':
        case 'link': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('link-external');
          const prTooltip = new vscode.MarkdownString(`[Open Pull Request](${detailValue})\n\n${detailValue}`);
          prTooltip.isTrusted = true;
          this.tooltip = prTooltip;
          try {
            this.command = {
              command: 'vscode.open',
              title: 'Open Pull Request',
              arguments: [vscode.Uri.parse(detailValue)]
            };
          } catch {
            // fallback if URI parse fails
          }
          break;
        }
        case 'web':
        case 'jules web': {
          this.description = 'jules.google.com';
          this.iconPath = new vscode.ThemeIcon('globe');
          const webTooltip = new vscode.MarkdownString(`[Open Session in Jules Web](${detailValue})\n\n${detailValue}`);
          webTooltip.isTrusted = true;
          this.tooltip = webTooltip;
          this.command = {
            command: 'jules.openInWeb',
            title: 'Open in Jules Web',
            arguments: [session]
          };
          break;
        }
        case 'activities':
        case 'activities & logs':
        case 'logs': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('history');
          this.tooltip = new vscode.MarkdownString('Click to view execution activities, plans, and bash logs');
          this.command = {
            command: 'jules.viewActivities',
            title: 'View Activities & Plan Logs',
            arguments: [session]
          };
          break;
        }
        case 'reply':
        case 'reply to agent':
        case 'respond':
        case 'send response': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('comment-discussion', new vscode.ThemeColor('testing.iconQueued'));
          this.tooltip = new vscode.MarkdownString('Click to send response / instructions to agent');
          this.command = {
            command: 'jules.sendMessage',
            title: 'Send Response / Follow-up',
            arguments: [session]
          };
          break;
        }
        case 'send message':
        case 'send instruction': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('comment');
          this.tooltip = new vscode.MarkdownString('Click to send follow-up message / instructions');
          this.command = {
            command: 'jules.sendMessage',
            title: 'Send Message / Follow-up',
            arguments: [session]
          };
          break;
        }
        case 'approve plan': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
          this.tooltip = new vscode.MarkdownString('Click to approve the agent execution plan');
          this.command = {
            command: 'jules.approvePlan',
            title: 'Approve Execution Plan',
            arguments: [session]
          };
          break;
        }
        case 'mission control': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('dashboard');
          this.tooltip = new vscode.MarkdownString('Open full interactive Mission Control dashboard');
          this.command = {
            command: 'jules.openMissionControl',
            title: 'Open Mission Control',
            arguments: [session]
          };
          break;
        }
        case 'visual diff': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('diff');
          this.tooltip = new vscode.MarkdownString('Launch native side-by-side visual diff editor');
          this.command = {
            command: 'jules.viewVisualDiff',
            title: 'Visual Diff',
            arguments: [session]
          };
          break;
        }
        case 'create pr':
        case 'publish pr': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('git-pull-request');
          this.tooltip = new vscode.MarkdownString('Create a GitHub Pull Request for this session');
          this.command = {
            command: 'jules.createGitHubPR',
            title: 'Create GitHub PR',
            arguments: [session]
          };
          break;
        }
        case 'archive':
        case 'archive session': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('archive');
          this.tooltip = new vscode.MarkdownString('Move this session to archived sessions');
          this.command = {
            command: 'jules.archiveSession',
            title: 'Archive Session',
            arguments: [session]
          };
          break;
        }
        case 'unarchive':
        case 'unarchive session': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('package');
          this.tooltip = new vscode.MarkdownString('Restore this session to active sessions list');
          this.command = {
            command: 'jules.unarchiveSession',
            title: 'Unarchive Session',
            arguments: [session]
          };
          break;
        }
        case 'copy url':
        case 'copy session url': {
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('copy');
          this.tooltip = new vscode.MarkdownString('Copy Google Jules Web URL to clipboard');
          this.command = {
            command: 'jules.copySessionUrl',
            title: 'Copy Jules Web URL',
            arguments: [session]
          };
          break;
        }
        case 'status': {
          this.description = detailValue;
          const statusLower = detailValue.toLowerCase();
          if (statusLower === 'completed' || statusLower === 'succeeded' || statusLower === 'merged' || statusLower === 'success' || statusLower === 'done') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
          } else if (statusLower === 'active' || statusLower === 'pending' || statusLower === 'running' || statusLower === 'in_progress' || statusLower === 'in-progress' || statusLower === 'launched' || statusLower === 'queued' || statusLower === 'starting') {
            this.iconPath = new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('testing.iconQueued'));
          } else if (statusLower === 'failed' || statusLower === 'rejected' || statusLower === 'error' || statusLower === 'cancelled' || statusLower === 'canceled') {
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
          } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
          }
          this.tooltip = new vscode.MarkdownString(`**Status:** **${detailValue}**`);
          break;
        }
        default:
          this.description = detailValue;
          this.iconPath = new vscode.ThemeIcon('dash');
          this.tooltip = `${detailKey}: ${detailValue}`;
          break;
      }
    }
  }
}

/**
 * TreeDataProvider displaying Jules sessions in the VS Code sidebar.
 */
export class SessionsTreeDataProvider implements vscode.TreeDataProvider<SessionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SessionTreeItem | undefined | null | void> =
    new vscode.EventEmitter<SessionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SessionTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  /**
   * Initializes a new SessionsTreeDataProvider.
   * @param getWorkspaceRoot - Callback returning the active workspace root directory path.
   */
  constructor(private getWorkspaceRoot: () => string) {}

  /**
   * Fetches sessions from the Google Jules Cloud API and merges them with local records.
   * @param rootPath - The target workspace root directory path.
   * @returns A promise resolving to the merged array of session records.
   */
  async syncCloudSessions(rootPath: string): Promise<SessionRecord[]> {
    try {
      const cloudSessions = await listSessionsApi(rootPath);
      if (cloudSessions.length > 0) {
        const local = loadSessions(rootPath);
        const map = new Map<string, SessionRecord>();
        for (const cs of cloudSessions) {
          map.set(cs.id, cs);
        }
        for (const ls of local) {
          const existing = map.get(ls.id);
          if (existing) {
            map.set(ls.id, { ...existing, ...ls, status: existing.status || ls.status });
          } else {
            map.set(ls.id, ls);
          }
        }
        const merged = Array.from(map.values());
        saveSessions(merged, rootPath);
        return merged;
      }
    } catch {
      // fallback
    }
    return loadSessions(rootPath);
  }

  /**
   * Refreshes the tree data provider view and optionally synchronizes with cloud sessions.
   * @param syncCloud - Whether to trigger cloud session synchronization before refreshing.
   * @returns A promise that resolves when refresh is completed.
   */
  async refresh(syncCloud: boolean = true): Promise<void> {
    if (syncCloud) {
      const root = this.getWorkspaceRoot();
      if (root) {
        await this.syncCloudSessions(root);
      }
    }
    this._onDidChangeTreeData.fire();
  }

  /**
   * Returns the tree item for presentation in the VS Code sidebar.
   * @param element - The session tree item to present.
   * @returns The element as a VS Code TreeItem.
   */
  getTreeItem(element: SessionTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Resolves children for the given tree element or root sessions when element is undefined.
   * @param element - Optional parent element; if undefined, retrieves root sessions.
   * @returns A promise resolving to an array of session tree items.
   */
  async getChildren(element?: SessionTreeItem): Promise<SessionTreeItem[]> {
    const rootPath = this.getWorkspaceRoot();
    if (!rootPath) {
      return [new SessionTreeItem('No workspace folder open', vscode.TreeItemCollapsibleState.None)];
    }

    if (!element) {
      // Root level: list active sessions and archived group
      try {
        let sessions = loadSessions(rootPath);
        if (!sessions || sessions.length === 0) {
          sessions = await this.syncCloudSessions(rootPath);
        }

        if (!sessions || sessions.length === 0) {
          return [new SessionTreeItem('No sessions found (Click Deploy to start)', vscode.TreeItemCollapsibleState.None)];
        }

        const activeSessions = sessions.filter(s => !s.archived);
        const archivedSessions = sessions.filter(s => s.archived);

        const items: SessionTreeItem[] = [];

        // Active sessions sorted latest first
        const sortedActive = [...activeSessions].reverse();
        for (const s of sortedActive) {
          const agentName = cleanAgentName(s.agent);
          const taskSummary = cleanTaskString(s.task, 28);
          const idPrefix = s.id ? s.id.slice(0, 8) : 'unknown';
          const label = `#${idPrefix} • ${agentName} (${taskSummary})`;
          items.push(new SessionTreeItem(
            label,
            vscode.TreeItemCollapsibleState.Collapsed,
            s
          ));
        }

        // Collapsible section for archived sessions if any exist
        if (archivedSessions.length > 0) {
          const archiveGroup = new SessionTreeItem(
            `📦 Archived Sessions (${archivedSessions.length})`,
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            'archived-sessions-group',
            `${archivedSessions.length} archived`
          );
          archiveGroup.iconPath = new vscode.ThemeIcon('archive');
          archiveGroup.contextValue = 'archived-sessions-group';
          items.push(archiveGroup);
        }

        return items;
      } catch (err: any) {
        return [new SessionTreeItem(`Error loading sessions: ${err.message}`, vscode.TreeItemCollapsibleState.None)];
      }
    } else if (element.detailKey === 'archived-sessions-group') {
      // Sub-level: show all archived sessions
      const sessions = loadSessions(rootPath);
      const archived = sessions.filter(s => s.archived).reverse();
      return archived.map(s => {
        const agentName = cleanAgentName(s.agent);
        const taskSummary = cleanTaskString(s.task, 28);
        const idPrefix = s.id ? s.id.slice(0, 8) : 'unknown';
        const label = `#${idPrefix} • ${agentName} (${taskSummary})`;
        return new SessionTreeItem(
          label,
          vscode.TreeItemCollapsibleState.Collapsed,
          s
        );
      });
    } else if (element.session && !element.detailKey) {
      // Sub-level: show expandable details of this session
      const s = element.session;
      const details: SessionTreeItem[] = [];

      // 1. 🤖 Agent
      const agentVal = cleanAgentName(s.agent);
      details.push(new SessionTreeItem('Agent', vscode.TreeItemCollapsibleState.None, s, 'Agent', agentVal));

      // 2. 🌿 Branch
      const branchVal = s.branch || 'main';
      details.push(new SessionTreeItem('Branch', vscode.TreeItemCollapsibleState.None, s, 'Branch', branchVal));

      // 3. 📌 Task / Instruction
      if (s.task) {
        details.push(new SessionTreeItem('Task', vscode.TreeItemCollapsibleState.None, s, 'Task', s.task));
      }

      // 4. ⏱️ Created / Updated
      if (s.createdAt || s.timestamp) {
        const createdVal = formatDateTime(s.createdAt || s.timestamp);
        details.push(new SessionTreeItem('Created', vscode.TreeItemCollapsibleState.None, s, 'Created', createdVal));
      }
      if (s.updatedAt) {
        const updatedVal = formatDateTime(s.updatedAt);
        details.push(new SessionTreeItem('Updated', vscode.TreeItemCollapsibleState.None, s, 'Updated', updatedVal));
      }

      // 5. 🔗 Pull Request / Link
      if (s.prUrl) {
        details.push(new SessionTreeItem('Pull Request', vscode.TreeItemCollapsibleState.None, s, 'Pull Request', s.prUrl));
      }

      // 6. 🌐 Jules Web
      const webUrl = s.url || `https://jules.google.com/session/${s.id}`;
      details.push(new SessionTreeItem('Jules Web', vscode.TreeItemCollapsibleState.None, s, 'Jules Web', webUrl));

      // 7. 🧭 Mission Control Dashboard
      details.push(new SessionTreeItem('Mission Control', vscode.TreeItemCollapsibleState.None, s, 'Mission Control', 'Open interactive dashboard'));

      // 8. 🔍 Visual Diff
      details.push(new SessionTreeItem('Visual Diff', vscode.TreeItemCollapsibleState.None, s, 'Visual Diff', 'Inspect side-by-side diff'));

      // 9. 📜 Activities & Logs
      details.push(new SessionTreeItem('Activities & Logs', vscode.TreeItemCollapsibleState.None, s, 'Activities', 'View step logs & commands'));

      // 10. 💬 Send Instruction
      details.push(new SessionTreeItem('Send Instruction', vscode.TreeItemCollapsibleState.None, s, 'Send Instruction', 'Add instructions or feedback'));

      // 11. 🌿 Checkout Branch (explicit action)
      details.push(new SessionTreeItem('Checkout Branch', vscode.TreeItemCollapsibleState.None, s, 'Checkout Branch', branchVal));

      // 12. 🔀 Merge Session (only when completed)
      if (isSessionCompleted(s.status)) {
        details.push(new SessionTreeItem('Merge Session', vscode.TreeItemCollapsibleState.None, s, 'Merge Session', 'Merge changes to current branch'));
      }

      // 13. 🐙 Publish PR (only when completed)
      if (isSessionCompleted(s.status)) {
        details.push(new SessionTreeItem('Publish PR', vscode.TreeItemCollapsibleState.None, s, 'Publish PR', 'Create GitHub Pull Request'));
      }

      // 14. 💬 User Response Needed (if awaiting user input)
      if (isSessionAwaitingInput(s.status)) {
        details.push(new SessionTreeItem('Reply to Agent', vscode.TreeItemCollapsibleState.None, s, 'Reply to Agent', 'Click to respond to agent question'));
      }

      // 15. 🛡️ Plan Approval (if awaiting plan approval)
      if (isSessionAwaitingApproval(s.status)) {
        details.push(new SessionTreeItem('Approve Plan', vscode.TreeItemCollapsibleState.None, s, 'Approve Plan', 'Click to approve proposed plan'));
      }

      // 15. 🔄 Retry Session (if failed)
      if (isSessionFailed(s.status)) {
        details.push(new SessionTreeItem('Retry Session', vscode.TreeItemCollapsibleState.None, s, 'Retry Session', 'Retry failed session'));
      }

      // 16. 📦 Archive or 📤 Unarchive Session
      if (s.archived) {
        details.push(new SessionTreeItem('Unarchive Session', vscode.TreeItemCollapsibleState.None, s, 'Unarchive Session', 'Restore to active sessions list'));
      } else {
        details.push(new SessionTreeItem('Archive Session', vscode.TreeItemCollapsibleState.None, s, 'Archive Session', 'Move to archived sessions'));
      }

      // 17. 📋 Copy Session URL
      details.push(new SessionTreeItem('Copy Session URL', vscode.TreeItemCollapsibleState.None, s, 'Copy Session URL', webUrl));

      // 18. 🗑️ Delete Session
      details.push(new SessionTreeItem('Delete Session', vscode.TreeItemCollapsibleState.None, s, 'Delete Session', 'Permanently delete session'));

      // 19. Status
      if (s.status) {
        details.push(new SessionTreeItem('Status', vscode.TreeItemCollapsibleState.None, s, 'Status', s.status));
      }

      return details;
    }

    return [];
  }
}
