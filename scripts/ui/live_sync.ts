/**
 * Real-time background sync and proactive notifications for Jules cloud sessions.
 * @module ui/live_sync
 */

import * as vscode from 'vscode';
import { listSessionsApi, approvePlanApi } from '../client/jules_api';
import { SessionRecord } from '../core/types';
import { isSessionAwaitingApproval, isSessionAwaitingInput } from '../utils';

/**
 * Manages periodic background polling of cloud session states and dispatches notifications on transitions.
 */
export class LiveSyncManager {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private previousStatuses = new Map<string, string>();

  /**
   * Initializes a new LiveSyncManager instance.
   *
   * @param getWorkspaceRoot - Function returning the active workspace root path.
   * @param onUpdate - Callback invoked when remote states are refreshed.
   */
  constructor(
    private readonly getWorkspaceRoot: () => string,
    private readonly onUpdate: () => void
  ) {}

  /**
   * Starts background polling at the specified interval.
   *
   * @param intervalMs - Polling interval in milliseconds (defaults to 15,000ms).
   */
  start(intervalMs: number = 15000): void {
    if (this.running) return;
    this.running = true;
    this.pollOnce();
    this.timer = setInterval(() => {
      this.pollOnce().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stops background polling and clears active timers.
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Toggles the live sync background polling state.
   *
   * @returns True if live sync is now active; false otherwise.
   */
  toggle(): boolean {
    if (this.running) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  /**
   * Checks whether background live sync polling is currently active.
   *
   * @returns True if running; false otherwise.
   */
  isActive(): boolean {
    return this.running;
  }

  /**
   * Performs a single fetch of remote sessions, detects state transitions, and raises actionable alerts.
   *
   * @returns A promise resolving when poll iteration completes.
   */
  async pollOnce(): Promise<void> {
    const root = this.getWorkspaceRoot();
    if (!root) return;

    try {
      const sessions = await listSessionsApi(root);
      if (!sessions || sessions.length === 0) return;

      for (const s of sessions) {
        const id = s.id;
        const currentStatus = (s.status || '').toUpperCase();
        const prevStatus = this.previousStatuses.get(id);

        if (prevStatus && prevStatus !== currentStatus) {
          this.handleStateTransition(s, prevStatus, currentStatus, root);
        }

        this.previousStatuses.set(id, currentStatus);
      }

      this.onUpdate();
    } catch {
      // Ignore background transient network hiccups
    }
  }

  /**
   * Dispatches proactive user-facing notifications based on lifecycle transitions.
   *
   * @param session - The session that transitioned state.
   * @param prevStatus - The previous status string.
   * @param nextStatus - The new status string.
   * @param root - Workspace root directory.
   */
  private handleStateTransition(
    session: SessionRecord,
    prevStatus: string,
    nextStatus: string,
    root: string
  ): void {
    const idPrefix = session.id.slice(0, 8);
    const agent = session.agent || 'Jules Agent';

    if (isSessionAwaitingInput(nextStatus)) {
      vscode.window.showInformationMessage(
        `💬 Jules Session #${idPrefix} (${agent}) is waiting for your response/input!`,
        '💬 Reply to Agent',
        '🧭 Mission Control'
      ).then(action => {
        if (action === '💬 Reply to Agent') {
          vscode.commands.executeCommand('jules.sendMessage', { session });
        } else if (action === '🧭 Mission Control') {
          vscode.commands.executeCommand('jules.openMissionControl', { session });
        }
      });
    } else if (isSessionAwaitingApproval(nextStatus)) {
      vscode.window.showWarningMessage(
        `🔔 Jules Session #${idPrefix} (${agent}) is awaiting your Plan Approval!`,
        '✅ Approve Plan',
        '🧭 Mission Control'
      ).then(async action => {
        if (action === '✅ Approve Plan') {
          try {
            await approvePlanApi(session.id, root);
            vscode.window.showInformationMessage(`Plan approved for #${idPrefix}!`);
            this.onUpdate();
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to approve plan: ${err.message}`);
          }
        } else if (action === '🧭 Mission Control') {
          vscode.commands.executeCommand('jules.openMissionControl', { session });
        }
      });
    } else if (nextStatus === 'COMPLETED' || nextStatus === 'SUCCEEDED') {
      vscode.window.showInformationMessage(
        `🎉 Jules Session #${idPrefix} (${agent}) completed successfully!`,
        '🔍 Visual Diff',
        '🔀 Merge Session',
        '🐙 Create PR'
      ).then(action => {
        if (action === '🔍 Visual Diff') {
          vscode.commands.executeCommand('jules.viewVisualDiff', { session });
        } else if (action === '🔀 Merge Session') {
          vscode.commands.executeCommand('jules.mergeSession', { session });
        } else if (action === '🐙 Create PR') {
          vscode.commands.executeCommand('jules.createGitHubPR', { session });
        }
      });
    } else if (nextStatus === 'FAILED' || nextStatus === 'ERROR') {
      vscode.window.showErrorMessage(
        `❌ Jules Session #${idPrefix} (${agent}) failed.`,
        '📜 View Activities'
      ).then(action => {
        if (action === '📜 View Activities') {
          vscode.commands.executeCommand('jules.viewActivities', { session });
        }
      });
    }
  }
}
