/**
 * Real-time background sync and proactive notifications for Jules cloud sessions.
 * @module ui/live_sync
 */

import * as vscode from 'vscode';
import { listSessionsApi, approvePlanApi } from '../client/jules_api';
import { SessionRecord } from '../core/types';
import { isSessionAwaitingApproval, isSessionAwaitingInput, executeDueTasks } from '../utils';
import { JulesStatusBar } from './status_bar';
import { JulesActivityChannel } from './activity_channel';

/**
 * Manages periodic background polling of cloud session states and dispatches notifications on transitions.
 */
export class LiveSyncManager {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private previousStatuses = new Map<string, string>();
  private _isPolling = false;

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
    JulesActivityChannel.getInstance().appendLine(
      `[${new Date().toLocaleTimeString()}] [LIVE_SYNC] Background polling started (${Math.round(intervalMs / 1000)}s interval)`
    );
    this.pollOnce();
    this.timer = setInterval(() => {
      this.pollOnce().catch(() => {});
    }, intervalMs);
  }

  /**
   * Stops background polling and clears active timers.
   */
  stop(): void {
    if (this.running) {
      JulesActivityChannel.getInstance().appendLine(
        `[${new Date().toLocaleTimeString()}] [LIVE_SYNC] Background polling paused`
      );
    }
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
    if (this._isPolling) return;
    this._isPolling = true;
    try {
      const root = this.getWorkspaceRoot();
      if (!root) return;

      try {
        const sessions = await listSessionsApi(root);
        if (!sessions || sessions.length === 0) return;

        const currentSessionIds = new Set<string>();

        for (const s of sessions) {
          const id = s.id;
          currentSessionIds.add(id);
          const currentStatus = (s.status || '').toUpperCase();
          const prevStatus = this.previousStatuses.get(id);

          if (prevStatus && prevStatus !== currentStatus) {
            this.handleStateTransition(s, prevStatus, currentStatus, root);
          }

          this.previousStatuses.set(id, currentStatus);
        }

        // Prune deleted/archived sessions from previousStatuses map to prevent memory leak
        for (const id of this.previousStatuses.keys()) {
          if (!currentSessionIds.has(id)) {
            this.previousStatuses.delete(id);
          }
        }

        this.onUpdate();
        JulesStatusBar.getInstance().update(sessions);
      } catch {
        // Ignore background transient network hiccups
      }

      try {
        const executed = await executeDueTasks(root, (task) => {
          const idShort = task.sessionId ? `#${task.sessionId.slice(0, 8)}` : '';
          JulesActivityChannel.getInstance().appendLine(
            `[${new Date().toLocaleTimeString()}] [SCHEDULED] Task executed for ${task.agent} ${idShort}: "${task.task.slice(0, 40)}"`
          );
          vscode.window.showInformationMessage(
            `⏰ Scheduled Jules task "${task.task.slice(0, 30)}" executed for ${task.agent} ${idShort}!`,
            '🚀 Action Center'
          ).then(action => {
            if (action === '🚀 Action Center' && task.sessionId) {
              vscode.commands.executeCommand('jules.openSessionActionCenter', { session: { id: task.sessionId } });
            }
          });
        });
        if (executed > 0) {
          this.onUpdate();
        }
      } catch {
        // Ignore background transient scheduler hiccups
      }
    } finally {
      this._isPolling = false;
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
    const idPrefix = (session.id || '').slice(0, 8) || 'unknown';
    const agent = session.agent || 'Jules Agent';
    const time = new Date().toLocaleTimeString();

    JulesActivityChannel.getInstance().appendLine(
      `[${time}] [LIVE_SYNC] #${idPrefix} (${agent}) transition: [${prevStatus}] -> [${nextStatus}]`
    );

    if (isSessionAwaitingInput(nextStatus)) {
      vscode.window.showInformationMessage(
        `💬 Jules Session #${idPrefix} (${agent}) is waiting for your response/input!`,
        '💬 Reply to Agent',
        '🚀 Action Center'
      ).then(action => {
        if (action === '💬 Reply to Agent') {
          vscode.commands.executeCommand('jules.sendMessage', { session });
        } else if (action === '🚀 Action Center') {
          vscode.commands.executeCommand('jules.openSessionActionCenter', { session });
        }
      });
    } else if (isSessionAwaitingApproval(nextStatus)) {
      vscode.window.showWarningMessage(
        `🔔 Jules Session #${idPrefix} (${agent}) is awaiting your Plan Approval!`,
        '✅ Approve Plan',
        '🚀 Action Center'
      ).then(async action => {
        if (action === '✅ Approve Plan') {
          try {
            await approvePlanApi(session.id, root);
            vscode.window.showInformationMessage(`Plan approved for #${idPrefix}!`);
            this.onUpdate();
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to approve plan: ${err.message}`);
          }
        } else if (action === '🚀 Action Center') {
          vscode.commands.executeCommand('jules.openSessionActionCenter', { session });
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
        '📜 Stream Activity Log'
      ).then(action => {
        if (action === '📜 Stream Activity Log') {
          vscode.commands.executeCommand('jules.streamActivityLog', { session });
        }
      });
    }
  }
}
