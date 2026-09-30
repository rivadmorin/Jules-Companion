/**
 * Native VS Code Status Bar Item for Jules Companion.
 * @module ui/status_bar
 * @description Provides a persistent, native status indicator at the bottom of the IDE window.
 */

import * as vscode from 'vscode';
import { SessionRecord } from '../core/types';
import {
  isSessionActive,
  isSessionAwaitingApproval,
  isSessionAwaitingInput,
  isSessionCompleted
} from '../utils';

/**
 * Singleton managing the native Jules Status Bar Item.
 */
export class JulesStatusBar {
  private static instance: JulesStatusBar;
  private statusBarItem: vscode.StatusBarItem;

  private constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'jules.openSessionActionCenter';
    this.statusBarItem.name = 'Jules Companion Status';
    this.update([]);
  }

  /**
   * Retrieves the singleton instance of the JulesStatusBar.
   * @returns Active status bar controller instance.
   */
  public static getInstance(): JulesStatusBar {
    if (!JulesStatusBar.instance) {
      JulesStatusBar.instance = new JulesStatusBar();
    }
    return JulesStatusBar.instance;
  }

  /**
   * Evaluates the active sessions array and updates status bar label, icon, and tooltip.
   * @param sessions - Current array of session records.
   */
  public update(sessions: SessionRecord[] = []): void {
    const active = sessions.filter(s => !s.archived);

    // 1. Highest priority: Awaiting Plan Approval
    const awaitingApproval = active.find(s => isSessionAwaitingApproval(s.status));
    if (awaitingApproval) {
      this.statusBarItem.text = `$(alert) Jules: Plan Approval Needed`;
      this.statusBarItem.tooltip = new vscode.MarkdownString(
        `### Jules Session #${awaitingApproval.id.slice(0, 8)}\n\n` +
        `**Status:** Awaiting Plan Approval\n` +
        `**Task:** ${awaitingApproval.task}\n\n` +
        `*Click to open Action Center and review/approve.*`
      );
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.show();
      return;
    }

    // 2. Second priority: Awaiting User Feedback / Input
    const awaitingInput = active.find(s => isSessionAwaitingInput(s.status));
    if (awaitingInput) {
      this.statusBarItem.text = `$(comment-discussion) Jules: Input Needed`;
      this.statusBarItem.tooltip = new vscode.MarkdownString(
        `### Jules Session #${awaitingInput.id.slice(0, 8)}\n\n` +
        `**Status:** Awaiting User Response\n` +
        `**Task:** ${awaitingInput.task}\n\n` +
        `*Click to open Action Center and send response.*`
      );
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.show();
      return;
    }

    // 3. Third priority: Active / Running Session
    const running = active.find(s => isSessionActive(s.status));
    if (running) {
      const shortId = running.id.slice(0, 8);
      this.statusBarItem.text = `$(sync~spin) Jules: #${shortId}`;
      this.statusBarItem.tooltip = new vscode.MarkdownString(
        `### Jules Session #${shortId}\n\n` +
        `**Status:** Running\n` +
        `**Agent:** ${running.agent}\n` +
        `**Task:** ${running.task}\n\n` +
        `*Click to open Action Center or view live diff.*`
      );
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.show();
      return;
    }

    // 4. Completed session awaiting merge / PR
    const completed = active.find(s => isSessionCompleted(s.status));
    if (completed) {
      this.statusBarItem.text = `$(check) Jules: #${completed.id.slice(0, 8)}`;
      this.statusBarItem.tooltip = new vscode.MarkdownString(
        `### Jules Session #${completed.id.slice(0, 8)}\n\n` +
        `**Status:** Completed\n` +
        `**Task:** ${completed.task}\n\n` +
        `*Click to open Action Center to merge or create PR.*`
      );
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.show();
      return;
    }

    // 5. Idle state
    this.statusBarItem.text = `$(source-control) Jules`;
    this.statusBarItem.tooltip = new vscode.MarkdownString(
      `**Jules Companion**\n\nReady for new sessions. Click to open Action Center.`
    );
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.show();
  }

  /**
   * Disposes the status bar item.
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
