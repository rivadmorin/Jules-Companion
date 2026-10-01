/**
 * Native VS Code QuickPick Action Center for Jules Companion.
 * @module ui/action_center
 * @description Provides a fast, keyboard-navigable interactive hub replacing HTML webview dashboards.
 */

import * as vscode from 'vscode';
import { loadSessions, getProjectDirs } from '../core/storage';
import { SessionRecord } from '../core/types';
import {
  isSessionActive,
  isSessionAwaitingApproval,
  isSessionAwaitingInput,
  isSessionCompleted
} from '../utils';
import { cleanAgentName } from './sessions_provider';
import { JulesActivityChannel } from './activity_channel';

/**
 * Interface representing an actionable choice within the session Action Center.
 */
interface SessionActionItem extends vscode.QuickPickItem {
  actionId: string;
}

/**
 * Opens the native Session Action Center.
 * If no session ID is supplied, prompts the developer to select from active sessions.
 *
 * @param targetSessionId - Optional specific session ID to operate upon.
 * @param targetDir - Optional root workspace directory context.
 */
export async function openSessionActionCenter(
  targetSessionId?: string,
  targetDir?: string
): Promise<void> {
  const root = targetDir || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd());
  const sessions = loadSessions(root);

  let selectedSession: SessionRecord | undefined;

  if (targetSessionId) {
    selectedSession = sessions.find(s => s.id === targetSessionId);
  }

  // If no specific session was targeted or found, prompt user to select one
  if (!selectedSession) {
    if (sessions.length === 0) {
      const choice = await vscode.window.showInformationMessage(
        'No Jules sessions found in this workspace.',
        'Deploy New Session',
        'Schedule Task'
      );
      if (choice === 'Deploy New Session') {
        vscode.commands.executeCommand('jules.deploySession');
      } else if (choice === 'Schedule Task') {
        vscode.commands.executeCommand('jules.scheduleTask');
      }
      return;
    }

    const sessionPickItems = sessions.map(s => {
      const shortId = (s.id || '').slice(0, 8) || 'unknown';
      const agent = cleanAgentName(s.agent);
      let statusIcon = '$(circle-outline)';
      if (isSessionAwaitingApproval(s.status)) statusIcon = '$(alert)';
      else if (isSessionAwaitingInput(s.status)) statusIcon = '$(comment-discussion)';
      else if (isSessionActive(s.status)) statusIcon = '$(sync~spin)';
      else if (isSessionCompleted(s.status)) statusIcon = '$(check)';

      return {
        label: `${statusIcon} #${shortId} • ${agent}`,
        description: `[${s.status}] • ${s.branch || 'main'}`,
        detail: s.task,
        session: s
      };
    });

    const picked = await vscode.window.showQuickPick(sessionPickItems, {
      placeHolder: 'Select a Jules session to inspect or control:',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!picked) return;
    selectedSession = picked.session;
  }

  // Build native action menu items for selected session
  const s = selectedSession;
  const shortId = (s.id || '').slice(0, 8) || 'unknown';
  const actions: SessionActionItem[] = [];

  // 1. High-priority approval action
  if (isSessionAwaitingApproval(s.status)) {
    actions.push({
      label: '$(pass) Approve Proposed Execution Plan',
      description: 'Pending Approval',
      detail: 'Authorize cloud agent to proceed with implementation.',
      actionId: 'approve_plan'
    });
  }

  // 2. High-priority reply / feedback action
  if (isSessionAwaitingInput(s.status)) {
    actions.push({
      label: '$(comment-discussion) Send Response / Instructions to Agent',
      description: 'Awaiting User Input',
      detail: 'Provide prompt clarification or response to agent question.',
      actionId: 'send_message'
    });
  }

  // 3. Native Visual Diff
  actions.push({
    label: '$(diff) Side-by-Side Visual Diff (vscode.diff)',
    description: 'Native Diff Editor',
    detail: 'Inspect proposed code changes and diffs without disk scratch files.',
    actionId: 'visual_diff'
  });

  // 4. Live Activity Log Stream
  actions.push({
    label: '$(output) View Live Activity Stream & Logs',
    description: 'Output Panel',
    detail: 'Stream execution steps, bash outputs, and progress in Output tab.',
    actionId: 'activity_stream'
  });

  // 5. Execution Plan Step Inspection
  if (s.plan?.steps && s.plan.steps.length > 0) {
    actions.push({
      label: `$(checklist) View Execution Plan Steps (${s.plan.steps.length} steps)`,
      description: 'Plan Details',
      detail: 'View sequential execution milestones and status of each step.',
      actionId: 'view_plan_steps'
    });
  }

  // 6. Branch & SCM Actions
  actions.push({
    label: `$(git-branch) Checkout Branch: ${s.branch || 'main'}`,
    description: 'Git Checkout',
    detail: 'Switch active local Git workspace to this session branch.',
    actionId: 'checkout_branch'
  });

  // 7. Completion Actions
  if (isSessionCompleted(s.status)) {
    actions.push({
      label: '$(git-merge) Merge Session to Current Branch',
      description: 'Safety Gate Merge',
      detail: 'Validate clean working tree and merge session branch locally.',
      actionId: 'merge_session'
    });
    actions.push({
      label: '$(git-pull-request) Create GitHub Pull Request',
      description: 'GitHub CLI',
      detail: 'Open Pull Request from session branch to base branch.',
      actionId: 'create_pr'
    });
  }

  // 8. Jules Web Console
  actions.push({
    label: '$(globe) Open Session in Google Jules Web',
    description: 'jules.google.com',
    detail: 'Open session in default web browser.',
    actionId: 'open_web'
  });

  // 9. Session Management (Archive / Delete / Cancel)
  if (isSessionActive(s.status)) {
    actions.push({
      label: '$(stop-circle) Cancel Running Session',
      description: 'Danger',
      detail: 'Halt cloud execution immediately.',
      actionId: 'cancel_session'
    });
  }

  if (s.archived) {
    actions.push({
      label: '$(package) Unarchive Session',
      description: 'Restore',
      detail: 'Move back to active sessions sidebar.',
      actionId: 'unarchive_session'
    });
  } else {
    actions.push({
      label: '$(archive) Archive Session',
      description: 'Clean Up',
      detail: 'Move to archived sessions group.',
      actionId: 'archive_session'
    });
  }

  actions.push({
    label: '$(trash) Delete Session',
    description: 'Danger',
    detail: 'Permanently remove session from storage and cloud.',
    actionId: 'delete_session'
  });

  const selectedAction = await vscode.window.showQuickPick(actions, {
    placeHolder: `Jules Session #${shortId} [${s.status}] • Choose Action:`,
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!selectedAction) return;

  // Execute selected action routing
  switch (selectedAction.actionId) {
    case 'approve_plan':
      vscode.commands.executeCommand('jules.approvePlan', s);
      break;
    case 'send_message':
      vscode.commands.executeCommand('jules.sendMessage', s);
      break;
    case 'visual_diff':
      vscode.commands.executeCommand('jules.viewVisualDiff', s);
      break;
    case 'activity_stream':
      JulesActivityChannel.getInstance().streamSessionActivities(s.id, root);
      break;
    case 'view_plan_steps': {
      const stepItems = (s.plan?.steps || []).map((step, idx) => {
        let icon = '$(circle-outline)';
        if (step.status === 'COMPLETED') icon = '$(pass)';
        else if (step.status === 'IN_PROGRESS') icon = '$(sync~spin)';
        return {
          label: `${icon} Step ${idx + 1}: ${step.title}`,
          description: step.status || 'PENDING',
          detail: step.description || 'No description'
        };
      });
      vscode.window.showQuickPick(stepItems, {
        placeHolder: `Execution Plan for #${shortId} (${stepItems.length} steps)`
      });
      break;
    }
    case 'checkout_branch':
      if (s.branch) {
        vscode.commands.executeCommand('jules.checkoutSessionBranch', s);
      }
      break;
    case 'merge_session':
      vscode.commands.executeCommand('jules.mergeSession', s);
      break;
    case 'create_pr':
      vscode.commands.executeCommand('jules.createGitHubPR', s);
      break;
    case 'open_web':
      vscode.commands.executeCommand('jules.openInWeb', s);
      break;
    case 'cancel_session':
      vscode.commands.executeCommand('jules.cancelSession', s);
      break;
    case 'archive_session':
      vscode.commands.executeCommand('jules.archiveSession', s);
      break;
    case 'unarchive_session':
      vscode.commands.executeCommand('jules.unarchiveSession', s);
      break;
    case 'delete_session':
      vscode.commands.executeCommand('jules.deleteSession', s);
      break;
  }
}
