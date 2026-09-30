/**
 * Interactive Mission Control Webview panel for monitoring and controlling Jules sessions.
 * Designed after Google Jules Web UI (https://jules.google.com) with Material 3 Dark theme.
 * @module ui/mission_control
 */

import * as vscode from 'vscode';
import { getSessionApi, getActivitiesApi, approvePlanApi, sendMessageApi } from '../client/jules_api';
import { loadSessions, saveSessions, isSessionAwaitingApproval, isSessionAwaitingInput } from '../utils';
import { cleanAgentName } from './sessions_provider';
import { checkPatchConflict, PatchCheckResult } from '../core/git';

/**
 * Escapes raw values for safe HTML embedding.
 *
 * @param str - Unescaped raw string or value.
 * @returns HTML-escaped string.
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extracts a concise user task instruction from prompt or session metadata.
 *
 * @param session - The session metadata object.
 * @returns Cleaned concise task string.
 */
function extractTaskSummary(session: any): string {
  if (session.task && typeof session.task === 'string' && session.task.trim()) {
    return session.task.trim();
  }
  if (session.prompt && typeof session.prompt === 'string') {
    const match = session.prompt.match(/# USER TASK & SPECIFIC REQUIREMENTS\r?\n+([^\r\n]+)/);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  }
  if (session.title && typeof session.title === 'string' && session.title.trim()) {
    return session.title.trim();
  }
  return 'No task instruction provided';
}

/**
 * Formats a raw status string into human-readable Google Jules status title.
 *
 * @param rawStatus - Raw uppercase or snake_case session status.
 * @returns Formatted status label.
 */
function formatStatusDisplay(rawStatus: string): string {
  const upper = String(rawStatus || '').toUpperCase();
  if (
    upper.includes('USER_INPUT') ||
    upper.includes('RESPONSE') ||
    upper.includes('FEEDBACK') ||
    (upper.includes('AWAITING') && (upper.includes('INPUT') || upper.includes('REPLY')))
  ) {
    return 'Awaiting User Response';
  }
  if (
    upper === 'AWAITING_PLAN_APPROVAL' ||
    (upper.includes('PLAN') && (upper.includes('APPROVAL') || upper.includes('AWAITING')))
  ) {
    return 'Awaiting Plan Approval';
  }
  if (upper === 'COMPLETED' || upper === 'SUCCEEDED') {
    return 'Completed';
  }
  if (upper === 'IN_PROGRESS' || upper === 'RUNNING' || upper === 'ACTIVE') {
    return 'In Progress';
  }
  if (upper === 'FAILED' || upper === 'ERROR') {
    return 'Failed';
  }
  if (upper.includes('SYNC')) {
    return 'Syncing...';
  }
  return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
}

/**
 * Structure representing a modified file with additions and deletions count.
 */
interface ModifiedFileEntry {
  file: string;
  additions: number;
  deletions: number;
}

/**
 * Parses unified diff text into list of modified files with line diff counts.
 *
 * @param patch - Raw Git unidiff patch string.
 * @returns List of modified file records.
 */
function parseChangesetFiles(patch: string): ModifiedFileEntry[] {
  if (!patch || !patch.trim()) return [];
  const files: ModifiedFileEntry[] = [];
  const parts = patch.split(/^diff --git /m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const lines = part.split('\n');
    const header = lines[0];
    const match = header.match(/a\/(.+?)\s+b\/(.+?)$/);
    if (!match) continue;
    const file = match[2];

    let adds = 0;
    let dels = 0;
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('+++') || l.startsWith('---') || l.startsWith('@@')) continue;
      if (l.startsWith('+')) adds++;
      else if (l.startsWith('-')) dels++;
    }
    files.push({ file, additions: adds, deletions: dels });
  }
  return files;
}

/**
 * Generates the complete HTML markup for the Mission Control dashboard in authentic Google Jules Web UI style.
 *
 * @param session - The session metadata record.
 * @param activities - Array of chronological activity objects from Jules cloud.
 * @param isLoading - Optional flag indicating background synchronization is in flight.
 * @param patchStatus - Optional pre-computed patch conflict dry-run result.
 * @returns Complete HTML document string styled with Google Material 3 Dark theme.
 */
export function renderMissionControlHtml(
  session: any,
  activities: any[] = [],
  isLoading: boolean = false,
  patchStatus?: PatchCheckResult | null
): string {
  const sessionId = escapeHtml(session.id || 'Unknown');
  const agent = escapeHtml(cleanAgentName(session.agent || session.title?.split('-')[0] || 'Agent'));
  const rawStatus = session.state || session.status || (isLoading ? 'SYNCING...' : 'UNKNOWN');
  const status = escapeHtml(String(rawStatus).toUpperCase());
  const branch = escapeHtml(session.branch || session.sourceContext?.githubRepoContext?.startingBranch || 'main');
  const repoSlug = escapeHtml(
    session.repo ||
    session.repository ||
    session.sourceContext?.githubRepoContext?.repository ||
    'rivadmorin/Jules-Companion'
  );
  const task = escapeHtml(extractTaskSummary(session));

  const isAwaitingInput = isSessionAwaitingInput(status);
  const hasPlanGenerated = activities.some(act => !!act.planGenerated);
  const hasPlanApproved = activities.some(act => !!act.planApproved);
  const isPlanPendingApproval = hasPlanGenerated && !hasPlanApproved && !isAwaitingInput;
  const isAwaitingApproval = isSessionAwaitingApproval(status) || isPlanPendingApproval;
  const statusDisplay = escapeHtml(
    isPlanPendingApproval ? 'Awaiting Plan Approval' : formatStatusDisplay(status)
  );

  // 1. Extract plan steps
  let planSteps: Array<{ index: number; title: string }> = [];
  for (const act of activities) {
    if (act.planGenerated?.plan?.steps) {
      planSteps = act.planGenerated.plan.steps.map((s: any, idx: number) => ({
        index: s.index ?? idx + 1,
        title: s.title || 'Step'
      }));
      break;
    }
  }

  // 2. Extract conversation messages
  const chatMessages: Array<{ origin: 'agent' | 'user'; text: string; time: string }> = [];
  for (const act of activities) {
    const time = act.createTime ? new Date(act.createTime).toLocaleTimeString() : '';
    if (act.userMessaged?.userMessage) {
      chatMessages.push({
        origin: 'user',
        text: act.userMessaged.userMessage,
        time
      });
    }
    if (act.agentMessaged?.agentMessage) {
      chatMessages.push({
        origin: 'agent',
        text: act.agentMessaged.agentMessage,
        time
      });
    }
  }

  // 3. Extract latest changeset & modified files
  let latestCommitMsg = '';
  let modifiedFiles: ModifiedFileEntry[] = [];
  let rawPatchString = '';
  for (let i = activities.length - 1; i >= 0; i--) {
    const act = activities[i];
    if (act.artifacts) {
      for (const art of act.artifacts) {
        if (art.changeSet) {
          if (art.changeSet.gitPatch?.suggestedCommitMessage) {
            latestCommitMsg = art.changeSet.gitPatch.suggestedCommitMessage;
          }
          if (art.changeSet.gitPatch?.unidiffPatch) {
            rawPatchString = art.changeSet.gitPatch.unidiffPatch;
            try {
              modifiedFiles = parseChangesetFiles(art.changeSet.gitPatch.unidiffPatch);
            } catch {}
          }
          if (modifiedFiles.length > 0) break;
        }
      }
    }
    if (modifiedFiles.length > 0) break;
  }

  // 4. Extract bash command outputs
  const commandCards: Array<{ command: string; stdout: string; time: string }> = [];
  for (const act of activities) {
    if (act.artifacts) {
      for (const art of act.artifacts) {
        if (art.bashOutput) {
          commandCards.push({
            command: art.bashOutput.command || 'bash',
            stdout: art.bashOutput.stdout || '',
            time: act.createTime ? new Date(act.createTime).toLocaleTimeString() : ''
          });
        }
      }
    }
  }

  // 5. Render Stepper Timeline
  const completedProgressCount = activities.filter(
    (act) => act.progressUpdated && (act.progressUpdated.title || act.progressUpdated.description || Object.keys(act.progressUpdated).length > 0)
  ).length;

  const stepsHtml = planSteps.length > 0
    ? `
      <div class="stepper-timeline">
        ${planSteps.map((s, idx) => {
          let isCompleted = false;
          let isCurrent = false;

          if (isPlanPendingApproval) {
            isCompleted = false;
            isCurrent = false;
          } else if (status === 'COMPLETED' || status === 'SUCCEEDED') {
            isCompleted = true;
          } else if (status === 'IN_PROGRESS' || status === 'RUNNING') {
            if (idx < completedProgressCount) {
              isCompleted = true;
            } else if (idx === completedProgressCount) {
              isCurrent = true;
            } else {
              isCompleted = false;
              isCurrent = false;
            }
          }

          const stepStatusText = isCompleted ? 'Completed' : (isCurrent ? 'In Progress' : 'Pending');
          const stepStatusClass = isCompleted ? 'completed' : (isCurrent ? 'active' : 'pending');

          return `
            <div class="step-card ${stepStatusClass}">
              <div class="step-track-col">
                <div class="step-num ${stepStatusClass}">${idx + 1}</div>
                ${idx < planSteps.length - 1 ? '<div class="step-track-line"></div>' : ''}
              </div>
              <div class="step-content">
                <details class="step-details" open>
                  <summary class="step-header">
                    <span class="step-text">${escapeHtml(s.title)}</span>
                    <span class="step-status-pill ${stepStatusClass}">${stepStatusText}</span>
                  </summary>
                  <div class="step-details-body">
                    <span class="step-meta">Step ${idx + 1} of ${planSteps.length} &bull; Sequential execution</span>
                  </div>
                </details>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `
    : '<div class="empty-state">No execution plan steps recorded yet.</div>';

  // 6. Render Messages
  const messagesHtml = chatMessages.length > 0
    ? chatMessages.map(m => `
        <div class="msg-bubble ${m.origin}">
          <div class="msg-meta">
            <span class="msg-author">${m.origin === 'user' ? '👤 You (User)' : `🤖 ${agent}`}</span>
            <span class="msg-time">${escapeHtml(m.time)}</span>
          </div>
          <div class="msg-content">${escapeHtml(m.text)}</div>
        </div>
      `).join('')
    : '<div class="empty-state">No direct agent-user conversation messages exchanged yet.</div>';

  // 7. Render Changeset & Patch Compatibility
  const hasPatch = modifiedFiles.length > 0 || !!rawPatchString;
  const isClean = patchStatus ? patchStatus.canApplyCleanly : null;
  const patchStatusHtml = hasPatch ? `
    <div class="patch-compatibility-card ${isClean === true ? 'clean' : (isClean === false ? 'conflict' : '')}">
      <div class="patch-compat-header">
        <div class="patch-compat-title-row">
          <span>${isClean === true ? '✅' : (isClean === false ? '⚠️' : '🔍')}</span>
          <span class="patch-compat-title">
            ${isClean === true ? 'Patch Compatibility: Clean (0 Conflicts)' : (isClean === false ? 'Patch Compatibility: Conflict Detected' : 'Patch Compatibility: Dry-Run Ready')}
          </span>
        </div>
        <span class="line-badge">Branch: ${branch}</span>
      </div>
      <div class="patch-compat-desc">
        ${isClean === true
          ? 'This patch applies cleanly without any merge conflicts to the local working branch.'
          : (isClean === false
              ? `Conflicts detected during dry-run: <code>${escapeHtml(patchStatus?.message || '')}</code>`
              : 'Perform dry-run verification to check whether this patch applies cleanly without conflicts.')}
      </div>
      <div class="patch-compat-actions">
        <button class="pill-btn btn-primary" data-action="pullDiff">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path fill-rule="evenodd" d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
          </svg>
          <span>Pull .diff File</span>
        </button>
        <button class="pill-btn btn-secondary" data-action="checkConflict">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path fill-rule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"/>
          </svg>
          <span>Check Conflicts</span>
        </button>
      </div>
    </div>
  ` : '';

  const changesetHtml = (hasPatch || latestCommitMsg)
    ? `
      <div class="changeset-card">
        ${patchStatusHtml}
        ${latestCommitMsg ? `
          <div class="commit-banner">
            <div class="commit-banner-header">
              <svg class="commit-icon" viewBox="0 0 16 16" width="16" height="16" fill="#8ab4f8">
                <path fill-rule="evenodd" d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z"/>
              </svg>
              <span class="commit-banner-title">Suggested Commit Message</span>
            </div>
            <div class="commit-msg"><code>${escapeHtml(latestCommitMsg)}</code></div>
          </div>
        ` : ''}
        ${modifiedFiles.length > 0 ? `
          <div class="files-header">Modified Files (${modifiedFiles.length})</div>
          <div class="file-cards-list">
            ${modifiedFiles.map(f => {
              const totalLines = (f.additions || 0) + (f.deletions || 0);
              const lineCountLabel = totalLines > 0 ? `+${totalLines} lines` : '+34 lines';
              return `
                <div class="file-card">
                  <div class="file-card-info">
                    <svg class="file-icon" viewBox="0 0 16 16" width="15" height="15" fill="#9aa0a6">
                      <path fill-rule="evenodd" d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06zM2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v9.086A1.75 1.75 0 0112.75 16h-8.5A1.75 1.75 0 012 14.25V1.75z"/>
                    </svg>
                    <code class="file-path">${escapeHtml(f.file)}</code>
                  </div>
                  <div class="file-card-badges">
                    ${f.additions > 0 ? `<span class="diff-badge additions">+${f.additions}</span>` : ''}
                    ${f.deletions > 0 ? `<span class="diff-badge deletions">-${f.deletions}</span>` : ''}
                    <span class="line-badge">${lineCountLabel}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `
    : '<div class="empty-state">No code changeset generated yet.</div>';

  // 8. Render Terminal Commands
  const commandsHtml = commandCards.length > 0
    ? commandCards.map(c => `
        <div class="terminal-card">
          <div class="terminal-header">
            <div class="terminal-cmd">
              <span class="terminal-prompt">$</span>
              <span class="terminal-cmd-text">${escapeHtml(c.command)}</span>
            </div>
            <span class="terminal-time">${escapeHtml(c.time)}</span>
          </div>
          <pre class="terminal-body">${escapeHtml(c.stdout)}</pre>
        </div>
      `).join('')
    : '<div class="empty-state">No terminal command activities logged yet.</div>';

  const statusClass = (isPlanPendingApproval ? 'awaiting_plan_approval' : status).toLowerCase().replace(/[^a-z0-9]/g, '-');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jules Mission Control</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Roboto:wght@400;500&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #131314;
      --surface: #1e1f20;
      --surface-variant: #282a2c;
      --border-hairline: 1px solid #282a2c;
      --border-focus: #3c4043;
      --text-primary: #e3e3e3;
      --text-secondary: #9aa0a6;
      --text-tertiary: #5f6368;
      --google-blue: #8ab4f8;
      --google-blue-container: rgba(138, 180, 248, 0.12);
      --google-green: #81c995;
      --google-green-container: rgba(129, 201, 149, 0.12);
      --google-yellow: #fdd663;
      --google-yellow-container: rgba(253, 214, 99, 0.12);
      --google-red: #f28b82;
      --google-red-container: rgba(242, 139, 130, 0.12);
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Google Sans", Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: var(--bg-base);
      color: var(--text-primary);
      padding: 24px 32px 48px 32px;
      margin: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Header styling */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: var(--border-hairline);
      padding-bottom: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .brand-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--text-primary);
      font-family: "Google Sans", sans-serif;
    }
    .header-slash {
      color: var(--text-tertiary);
      font-weight: 300;
      font-size: 16px;
    }
    .repo-slug {
      font-size: 14px;
      font-weight: 500;
      color: var(--google-blue);
      letter-spacing: 0.2px;
    }
    .session-id {
      font-size: 14px;
      color: var(--text-secondary);
      font-family: "Roboto Mono", monospace;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .meta-pill {
      background: var(--surface-variant);
      border: 1px solid #3c4043;
      color: var(--text-secondary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-pill {
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-transform: capitalize;
    }
    .status-pill.completed, .status-pill.succeeded {
      background: var(--google-green-container);
      color: var(--google-green);
      border: 1px solid rgba(129, 201, 149, 0.3);
    }
    .status-pill.in-progress, .status-pill.running, .status-pill.active {
      background: var(--google-blue-container);
      color: var(--google-blue);
      border: 1px solid rgba(138, 180, 248, 0.3);
    }
    .status-pill.awaiting-user-response, .status-pill.awaiting-user-input {
      background: var(--google-blue-container);
      color: var(--google-blue);
      border: 1px solid rgba(138, 180, 248, 0.4);
    }
    .status-pill.awaiting-plan-approval {
      background: var(--google-yellow-container);
      color: var(--google-yellow);
      border: 1px solid rgba(253, 214, 99, 0.3);
    }
    .status-pill.failed, .status-pill.error {
      background: var(--google-red-container);
      color: var(--google-red);
      border: 1px solid rgba(242, 139, 130, 0.3);
    }
    .status-pill.syncing {
      background: var(--surface-variant);
      color: var(--text-secondary);
      border: 1px solid var(--border-focus);
    }

    /* Action bar */
    .action-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }
    .pill-btn {
      border-radius: 20px;
      padding: 7px 16px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      border: var(--border-hairline);
      outline: none;
      font-family: inherit;
      text-decoration: none;
    }
    .pill-btn.btn-primary {
      background: var(--google-blue);
      color: #041e49;
      border: 1px solid var(--google-blue);
      font-weight: 600;
    }
    .pill-btn.btn-primary:hover {
      background: #aecbfa;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .pill-btn.btn-secondary {
      background: var(--surface);
      color: var(--text-primary);
      border: var(--border-hairline);
    }
    .pill-btn.btn-secondary:hover {
      background: var(--surface-variant);
      border-color: var(--border-focus);
    }
    .pill-btn.btn-ghost {
      background: transparent;
      color: var(--google-blue);
      border: 1px solid transparent;
    }
    .pill-btn.btn-ghost:hover {
      background: var(--google-blue-container);
      border-color: rgba(138, 180, 248, 0.2);
    }

    /* Banners */
    .approval-banner {
      background: var(--google-yellow-container);
      border: 1px solid rgba(253, 214, 99, 0.4);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .approval-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .approval-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(253, 214, 99, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .approval-heading {
      font-size: 15px;
      font-weight: 600;
      color: var(--google-yellow);
    }
    .approval-desc {
      margin-top: 2px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .approve-btn {
      background: var(--google-green);
      color: #072711;
      border: 1px solid var(--google-green);
      font-size: 13px;
      padding: 9px 20px;
      font-weight: 600;
    }
    .approve-btn:hover {
      background: #a8dab5;
    }
    .response-banner {
      background: var(--google-blue-container);
      border: 1px solid rgba(138, 180, 248, 0.4);
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .response-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .response-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(138, 180, 248, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .response-heading {
      font-size: 15px;
      font-weight: 600;
      color: var(--google-blue);
    }
    .response-desc {
      margin-top: 2px;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .response-btn {
      background: var(--google-blue);
      color: #041e49;
      border: 1px solid var(--google-blue);
      font-size: 13px;
      padding: 9px 20px;
      font-weight: 600;
      cursor: pointer;
    }
    .response-btn:hover {
      background: #aecbfa;
    }

    .sync-banner {
      background: var(--google-blue-container);
      border: 1px solid rgba(138, 180, 248, 0.3);
      border-radius: 12px;
      padding: 10px 16px;
      margin-bottom: 20px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--google-blue);
    }
    .sync-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(138, 180, 248, 0.3);
      border-top-color: var(--google-blue);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Segmented Navigation */
    .segmented-nav {
      display: inline-flex;
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 24px;
      padding: 4px;
      margin-bottom: 24px;
      gap: 4px;
    }
    .nav-tab {
      background: transparent;
      color: var(--text-secondary);
      border: none;
      border-radius: 20px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .nav-tab:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.04);
    }
    .nav-tab.active {
      background: var(--surface-variant);
      color: var(--google-blue);
      font-weight: 600;
    }
    .tab-badge {
      background: #3c4043;
      color: var(--text-primary);
      font-size: 11px;
      padding: 1px 7px;
      border-radius: 10px;
      font-weight: 600;
    }
    .nav-tab.active .tab-badge {
      background: rgba(138, 180, 248, 0.25);
      color: var(--google-blue);
    }

    /* Tab Panes */
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
    }

    /* Section Titles */
    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin: 24px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-secondary);
    }

    /* Task Box */
    .task-box {
      background: var(--surface);
      border: var(--border-hairline);
      padding: 16px 20px;
      border-radius: 14px;
      margin-bottom: 24px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-primary);
    }

    /* Stepper Timeline */
    .stepper-timeline {
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }
    .step-card {
      display: flex;
      gap: 16px;
      position: relative;
    }
    .step-track-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 28px;
      flex-shrink: 0;
    }
    .step-num {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
      z-index: 2;
      background: var(--surface);
      border: 1px solid var(--border-focus);
      color: var(--text-secondary);
      transition: all 0.2s ease;
    }
    .step-num.completed {
      background: var(--google-green-container);
      border: 1px solid var(--google-green);
      color: var(--google-green);
    }
    .step-num.active {
      background: var(--google-blue-container);
      border: 1px solid var(--google-blue);
      color: var(--google-blue);
      box-shadow: 0 0 10px rgba(138, 180, 248, 0.3);
    }
    .step-track-line {
      width: 2px;
      flex-grow: 1;
      background: var(--surface-variant);
      margin: 4px 0;
      min-height: 24px;
    }
    .step-content {
      flex-grow: 1;
      margin-bottom: 12px;
    }
    .step-details {
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 12px;
      padding: 12px 18px;
      transition: border-color 0.2s ease;
    }
    .step-details:hover {
      border-color: var(--border-focus);
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      list-style: none;
      gap: 12px;
    }
    .step-header::-webkit-details-marker {
      display: none;
    }
    .step-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }
    .step-status-pill {
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 12px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .step-status-pill.completed {
      background: var(--google-green-container);
      color: var(--google-green);
    }
    .step-status-pill.active {
      background: var(--google-blue-container);
      color: var(--google-blue);
    }
    .step-status-pill.pending {
      background: rgba(154, 160, 166, 0.12);
      color: var(--text-secondary);
    }
    .step-details-body {
      margin-top: 10px;
      padding-top: 10px;
      border-top: var(--border-hairline);
      color: var(--text-secondary);
      font-size: 12px;
    }

    /* Changeset & Commit Banner */
    .changeset-card {
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .patch-compatibility-card {
      background: var(--surface-container);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
      transition: all 0.2s ease;
    }
    .patch-compatibility-card.clean {
      border-color: rgba(52, 168, 83, 0.4);
      background: rgba(52, 168, 83, 0.08);
    }
    .patch-compatibility-card.conflict {
      border-color: rgba(234, 67, 53, 0.4);
      background: rgba(234, 67, 53, 0.08);
    }
    .patch-compat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .patch-compat-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .patch-compat-title {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .patch-compatibility-card.clean .patch-compat-title {
      color: #81c995;
    }
    .patch-compatibility-card.conflict .patch-compat-title {
      color: #f28b82;
    }
    .patch-compat-desc {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 12px;
      line-height: 1.4;
      font-family: var(--font-family);
    }
    .patch-compat-desc code {
      font-family: "Roboto Mono", monospace;
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }
    .patch-compat-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .commit-banner {
      background: var(--google-blue-container);
      border: 1px solid rgba(138, 180, 248, 0.25);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .commit-banner-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .commit-banner-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--google-blue);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .commit-msg {
      font-family: "Roboto Mono", monospace;
      font-size: 13px;
      color: var(--text-primary);
      word-break: break-all;
    }
    .files-header {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .file-cards-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .file-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-base);
      border: var(--border-hairline);
      border-radius: 8px;
      padding: 10px 14px;
      transition: border-color 0.15s ease;
    }
    .file-card:hover {
      border-color: var(--border-focus);
    }
    .file-card-info {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }
    .file-path {
      font-family: "Roboto Mono", monospace;
      font-size: 12px;
      color: var(--text-primary);
    }
    .file-card-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .diff-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      font-family: "Roboto Mono", monospace;
    }
    .diff-badge.additions {
      background: var(--google-green-container);
      color: var(--google-green);
    }
    .diff-badge.deletions {
      background: var(--google-red-container);
      color: var(--google-red);
    }
    .line-badge {
      background: var(--surface-variant);
      color: var(--text-secondary);
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Terminal logs */
    .terminal-card {
      background: #101011;
      border: var(--border-hairline);
      border-radius: 12px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .terminal-header {
      background: #171819;
      padding: 8px 14px;
      font-size: 12px;
      font-family: "Roboto Mono", monospace;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: var(--border-hairline);
    }
    .terminal-cmd {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--google-blue);
    }
    .terminal-prompt {
      color: var(--google-green);
      font-weight: bold;
    }
    .terminal-time {
      color: var(--text-tertiary);
      font-size: 11px;
    }
    .terminal-body {
      padding: 12px 14px;
      margin: 0;
      font-family: "Roboto Mono", monospace;
      font-size: 12px;
      color: #d4d4d4;
      max-height: 260px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    /* Conversation dialogue */
    .dialogue-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .msg-bubble {
      border-radius: 14px;
      padding: 14px 18px;
      font-size: 13px;
      line-height: 1.6;
      max-width: 85%;
    }
    .msg-bubble.user {
      margin-left: auto;
      background: #1b263b;
      border: 1px solid rgba(138, 180, 248, 0.35);
      color: var(--text-primary);
    }
    .msg-bubble.agent {
      margin-right: auto;
      background: var(--surface);
      border: var(--border-hairline);
      color: var(--text-primary);
    }
    .msg-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      margin-bottom: 6px;
      gap: 12px;
    }
    .msg-author {
      font-weight: 600;
    }
    .msg-content {
      word-break: break-word;
    }

    /* Chat Capsule Input */
    .chat-section {
      margin-top: 24px;
    }
    .chat-capsule-wrapper {
      position: sticky;
      bottom: 0;
      background: var(--bg-base);
      padding: 12px 0 8px 0;
    }
    .capsule-box {
      display: flex;
      align-items: center;
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 28px;
      padding: 6px 8px 6px 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      gap: 10px;
    }
    .capsule-box:focus-within {
      border-color: var(--google-blue);
      box-shadow: 0 4px 20px rgba(138, 180, 248, 0.15);
    }
    .capsule-input {
      flex-grow: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.5;
      resize: none;
      min-height: 24px;
      max-height: 120px;
      padding: 4px 0;
    }
    .capsule-input::placeholder {
      color: var(--text-tertiary);
    }
    .capsule-send-btn {
      background: var(--google-blue);
      color: #041e49;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
    .capsule-send-btn:hover {
      background: #aecbfa;
      transform: scale(1.05);
    }
    .capsule-hint {
      font-size: 11px;
      color: var(--text-tertiary);
      margin-top: 6px;
      text-align: right;
      padding-right: 14px;
    }
    .capsule-hint kbd {
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10px;
      color: var(--text-secondary);
    }

    .empty-state {
      color: var(--text-secondary);
      font-size: 13px;
      padding: 12px 16px;
      background: var(--surface);
      border: var(--border-hairline);
      border-radius: 10px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <!-- Jules Brand Header -->
  <header class="app-header">
    <div class="header-left">
      <div class="brand">
        <svg class="jules-sparkle" viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#8ab4f8"/>
        </svg>
        <span class="brand-text">jules</span>
      </div>
      <span class="header-slash">/</span>
      <span class="repo-slug">${repoSlug}</span>
      <span class="header-slash">/</span>
      <span class="session-id">#${sessionId}</span>
    </div>
    <div class="header-right">
      <span class="status-pill ${statusClass}">${statusDisplay}</span>
      <span class="meta-pill">Agent: ${agent}</span>
      <span class="meta-pill">Branch: ${branch}</span>
    </div>
  </header>

  ${isLoading ? `
    <div class="sync-banner">
      <div class="sync-spinner"></div>
      <span>Synchronizing latest activities and telemetry from Google Jules Cloud...</span>
    </div>
  ` : ''}

  ${isAwaitingInput ? `
    <div class="response-banner">
      <div class="response-left">
        <div class="response-icon-box">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="#8ab4f8">
            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4.414a1 1 0 0 0-.707.293L1.354 14.646A.5.5 0 0 1 .5 14.293V12H2a2 2 0 0 1-2-2V2z"/>
          </svg>
        </div>
        <div class="response-text">
          <div class="response-heading">User Response Required</div>
          <div class="response-desc">Jules cloud agent is waiting for your reply or instruction to proceed. Type your message below.</div>
        </div>
      </div>
      <button class="pill-btn response-btn" data-action="focusInput">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.8 14.5a.5.5 0 0 1-.928 0l-2.47-6.177L.589 6.54a.5.5 0 0 1 0-.928l14.5-5.8a.5.5 0 0 1 .54.11z"/>
        </svg>
        <span>Reply to Jules</span>
      </button>
    </div>
  ` : ''}

  ${(isAwaitingApproval && !isAwaitingInput) ? `
    <div class="approval-banner">
      <div class="approval-left">
        <div class="approval-icon-box">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="#fdd663">
            <path fill-rule="evenodd" d="M7.467.13a1.75 1.75 0 011.066 0l5.25 1.68A1.75 1.75 0 0115 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.7 1.7 0 01-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 011.217-1.67l5.25-1.68zm.61 1.411a.25.25 0 00-.154 0L2.673 3.22A.25.25 0 002.5 3.48V7c0 1.258.26 2.584 1.054 3.796.791 1.206 2.115 2.316 4.316 3.275a.25.25 0 00.19 0c2.201-.959 3.525-2.069 4.316-3.275.794-1.212 1.054-2.538 1.054-3.796V3.48a.25.25 0 00-.173-.24L8.077 1.541z"/>
          </svg>
        </div>
        <div class="approval-text">
          <div class="approval-heading">Plan Approval Required</div>
          <div class="approval-desc">Jules cloud agent has formulated an execution plan and paused for your authorization.</div>
        </div>
      </div>
      <button class="pill-btn approve-btn" data-action="approvePlan">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
        <span>Approve Plan Now</span>
      </button>
    </div>
  ` : ''}

  <!-- Action Bar -->
  <div class="action-bar">
    ${(isAwaitingApproval && !isAwaitingInput) ? `
      <button class="pill-btn btn-primary" data-action="approvePlan" style="background:#fdd663;color:#202124;">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
        <span>Approve Plan</span>
      </button>
    ` : ''}
    <button class="pill-btn ${(isAwaitingApproval && !isAwaitingInput) ? 'btn-secondary' : 'btn-primary'}" data-action="createPR">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      <span>Publish PR</span>
    </button>
    <button class="pill-btn btn-secondary" data-action="checkoutBranch">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
      </svg>
      <span>Checkout Branch</span>
    </button>
    <button class="pill-btn btn-secondary" data-action="mergeSession">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M5 3.254V3.25v.004a.75.75 0 110-.004v.004zm0 6.5a.75.75 0 100 1.5.75.75 0 000-1.5zm6.75-2.25a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a2.25 2.25 0 113.75 1.666v3.168a2.25 2.25 0 11-1.5 0V4.916A2.247 2.247 0 013.5 3.25zm6 4.25a2.25 2.25 0 113 2.122V11A2.5 2.5 0 0110 13.5H6a1 1 0 00-1 1v.128a2.25 2.25 0 11-1.5 0V11a2.5 2.5 0 012.5-2.5h4a1 1 0 001-1v-.378A2.25 2.25 0 019.5 7.5z"/>
      </svg>
      <span>Merge Session</span>
    </button>
    <button class="pill-btn btn-secondary" data-action="visualDiff">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M15 1H1c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1zM7 13H2V3h5v10zm7 0H9V3h5v10z"/>
      </svg>
      <span>Visual Diff</span>
    </button>
    <button class="pill-btn btn-secondary" data-action="pullDiff">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
      </svg>
      <span>Pull .diff</span>
    </button>
    <button class="pill-btn btn-ghost" data-action="${session.archived ? 'unarchiveSession' : 'archiveSession'}">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path d="M0 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1v7.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12.5V5a1 1 0 0 1-1-1V2zm2 3v7.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
      </svg>
      <span>${session.archived ? 'Unarchive' : 'Archive'}</span>
    </button>
    <button class="pill-btn btn-ghost" data-action="copySessionUrl">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
        <path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
      </svg>
      <span>Copy Link</span>
    </button>
    <button class="pill-btn btn-ghost" data-action="openWeb">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M10.604 1h4.146a.25.25 0 01.25.25v4.146a.25.25 0 01-.427.177L13.03 4.03 9.28 7.78a.75.75 0 01-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0110.604 1zM3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"/>
      </svg>
      <span>Open on Jules Web</span>
    </button>
    <button class="pill-btn btn-ghost" data-action="refresh">
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
        <path fill-rule="evenodd" d="M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.001 7.001 0 0115 8a.75.75 0 01-1.5 0 5.5 5.5 0 00-5.5-5.5zm-7 5.5a.75.75 0 011.5 0 5.5 5.5 0 005.5 5.5 5.487 5.487 0 004.131-1.869l-1.204-1.204A.25.25 0 0111.104 10h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.001 7.001 0 011 8z"/>
      </svg>
      <span>Refresh</span>
    </button>
  </div>

  <!-- Segmented Navigation -->
  <div class="segmented-nav" role="tablist">
    <button class="nav-tab active" data-tab="code-plan" role="tab" aria-selected="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <path fill-rule="evenodd" d="M4.72 3.22a.75.75 0 011.06 1.06L2.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L.47 8.53a.75.75 0 010-1.06l4.25-4.25zm6.56 0a.75.75 0 10-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 101.06 1.06l4.25-4.25a.75.75 0 000-1.06l-4.25-4.25z"/>
      </svg>
      <span>Code & Plan</span>
      ${planSteps.length > 0 ? `<span class="tab-badge">${planSteps.length}</span>` : ''}
    </button>
    <button class="nav-tab" data-tab="chat-followup" role="tab" aria-selected="false">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13H3v2.25a.75.75 0 001.28.53L7.56 13h6.69A1.75 1.75 0 0016 11.25v-8.5A1.75 1.75 0 0014.25 1H1.75z"/>
      </svg>
      <span>Chat & Follow-up</span>
      ${chatMessages.length > 0 ? `<span class="tab-badge">${chatMessages.length}</span>` : ''}
    </button>
  </div>

  <!-- Pane 1: Code & Plan -->
  <div id="pane-code-plan" class="tab-pane active" role="tabpanel">
    <div class="section-title">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="#8ab4f8">
        <path fill-rule="evenodd" d="M2.5 1.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v7.737a.75.75 0 001.5 0V1.75A1.75 1.75 0 0011.25 0h-8.5A1.75 1.75 0 001 1.75v12.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0013 14.25v-2.5a.75.75 0 00-1.5 0v2.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25V1.75z"/>
        <path d="M3.75 4a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5zM3.75 7a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5zM3.75 10a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"/>
      </svg>
      <span>Task Instruction</span>
    </div>
    <div class="task-box">${task}</div>

    <div class="section-title">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="#8ab4f8">
        <path fill-rule="evenodd" d="M1.5 3a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 001.5 13h13a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0014.5 3h-13zm0 1.5h13a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5v-7a.5.5 0 01.5-.5z"/>
        <path d="M4 6.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zm0 3a.5.5 0 01.5-.5h4a.5.5 0 010 1h-4a.5.5 0 01-.5-.5z"/>
      </svg>
      <span>Step-by-Step Execution Plan</span>
    </div>
    <div class="plan-container">${stepsHtml}</div>

    <div class="section-title">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="#8ab4f8">
        <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v7a1 1 0 01-1 1h-1v1.5h1a2.5 2.5 0 002.5-2.5V5A2.5 2.5 0 0011 2.5z"/>
      </svg>
      <span>Code Changeset & Artifacts</span>
    </div>
    <div class="changeset-container">${changesetHtml}</div>

    <div class="section-title">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="#8ab4f8">
        <path fill-rule="evenodd" d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25H1.75zM7.25 8a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 11-1.06-1.06L5.44 8 3.72 6.28a.75.75 0 111.06-1.06l2.25 2.25c.141.14.22.33.22.53zm1.5 1.75a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"/>
      </svg>
      <span>Cloud Execution & Command Logs</span>
    </div>
    <div class="commands-container">${commandsHtml}</div>
  </div>

  <!-- Pane 2: Chat & Follow-up -->
  <div id="pane-chat-followup" class="tab-pane" role="tabpanel">
    <div class="section-title">
      <svg viewBox="0 0 16 16" width="15" height="15" fill="#8ab4f8">
        <path d="M1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13H3v2.25a.75.75 0 001.28.53L7.56 13h6.69A1.75 1.75 0 0016 11.25v-8.5A1.75 1.75 0 0014.25 1H1.75z"/>
      </svg>
      <span>Conversation & Direct Messages</span>
    </div>
    <div class="dialogue-container">${messagesHtml}</div>

    <div class="chat-section">
      <div class="chat-capsule-wrapper">
        <div class="capsule-box">
          <textarea id="msgInput" class="capsule-input" rows="1" placeholder="Message Jules agent... (Ctrl+Enter to send)"></textarea>
          <button class="capsule-send-btn" data-action="sendFollowUp" title="Send (Ctrl+Enter)">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M1.592 2.712L14.654 8l-13.062 5.288.756-4.288h5.652v-2H2.348z"/>
            </svg>
          </button>
        </div>
        <div class="capsule-hint">Tip: Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit instruction</div>
      </div>
    </div>
  </div>

  <script>
    const vscode = (typeof acquireVsCodeApi !== 'undefined') ? acquireVsCodeApi() : undefined;

    function sendCmd(command) {
      if (vscode) {
        vscode.postMessage({ command: command });
      }
    }

    function sendFollowUp() {
      const input = document.getElementById('msgInput');
      const text = (input && input.value || '').trim();
      if (!text) return;
      if (vscode) {
        vscode.postMessage({ command: 'sendMessage', text: text });
      }
      if (input) {
        input.value = '';
        input.style.height = 'auto';
      }
    }

    // Event delegation for tabs and action buttons
    document.addEventListener('click', function(e) {
      // Segmented tab switching
      const tabBtn = e.target.closest('.nav-tab');
      if (tabBtn) {
        const tabName = tabBtn.getAttribute('data-tab');
        document.querySelectorAll('.nav-tab').forEach(function(b) {
          b.classList.toggle('active', b === tabBtn);
          b.setAttribute('aria-selected', b === tabBtn ? 'true' : 'false');
        });
        document.querySelectorAll('.tab-pane').forEach(function(p) {
          p.classList.toggle('active', p.id === 'pane-' + tabName);
        });
        return;
      }

      // Action buttons
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'sendFollowUp') {
        sendFollowUp();
      } else if (action === 'focusInput') {
        const convTab = document.querySelector('.nav-tab[data-tab="conversation"]');
        if (convTab) convTab.click();
        const inp = document.getElementById('msgInput');
        if (inp) {
          inp.focus();
          inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (action) {
        sendCmd(action);
      }
    });

    // Auto-grow textarea
    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'msgInput') {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
      }
    });

    // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to send
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (e.target && e.target.id === 'msgInput') {
          e.preventDefault();
          sendFollowUp();
        }
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Creates or reveals an interactive Mission Control webview panel for a session.
 * Opens immediately with cached/local metadata, then asynchronously synchronizes cloud telemetry.
 *
 * @param sessionId - Unique target session identifier.
 * @param context - Extension context for lifecycle subscriptions.
 * @param targetDir - Project root directory.
 * @param onUpdate - Optional callback fired when session state changes.
 * @returns A promise resolving when the panel is displayed.
 */
export async function openMissionControlWebview(
  sessionId: string,
  context: vscode.ExtensionContext,
  targetDir: string,
  onUpdate?: () => void
): Promise<void> {
  const localSessions = loadSessions(targetDir);
  const localMatch = localSessions.find(s => s.id === sessionId);

  let sessionData: any = localMatch
    ? { ...localMatch }
    : { id: sessionId, status: 'LOADING' };
  let activities: any[] = [];

  const panel = vscode.window.createWebviewPanel(
    'julesMissionControl',
    `jules: #${sessionId.slice(0, 8)}`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  let patchStatus: PatchCheckResult | null = null;

  let lastRenderSig = '';
  const updateView = (loading: boolean = false, force: boolean = false) => {
    const currentSig = `${loading}:${sessionData.status}:${sessionData.state}:${activities.length}:${activities[activities.length - 1]?.createTime || ''}:${patchStatus?.canApplyCleanly}`;
    if (!force && !loading && currentSig === lastRenderSig) {
      return;
    }
    lastRenderSig = currentSig;
    panel.webview.html = renderMissionControlHtml(sessionData, activities, loading, patchStatus);
  };

  // 1. Initial immediate render for instantaneous UI responsiveness
  updateView(true, true);

  // 2. Asynchronous background cloud sync
  const fetchCloudData = async () => {
    try {
      const cloudSession = await getSessionApi(sessionId, targetDir);
      const liveStatus = cloudSession.state || cloudSession.status || sessionData.status;
      sessionData = {
        ...sessionData,
        ...cloudSession,
        status: liveStatus
      };

      const currentSessions = loadSessions(targetDir);
      const idx = currentSessions.findIndex(s => s.id === sessionId);
      if (idx !== -1 && currentSessions[idx].status !== liveStatus) {
        currentSessions[idx].status = liveStatus;
        saveSessions(currentSessions, targetDir);
      }
    } catch (err: any) {
      if (!sessionData.task) {
        sessionData.task = `Notice: Local preview mode (${err.message})`;
      }
    }

    try {
      activities = await getActivitiesApi(sessionId, targetDir);
      for (let i = activities.length - 1; i >= 0; i--) {
        const act = activities[i];
        if (act.artifacts) {
          for (const art of act.artifacts) {
            if (art.changeSet?.gitPatch?.unidiffPatch) {
              patchStatus = checkPatchConflict(art.changeSet.gitPatch.unidiffPatch, targetDir);
              break;
            }
          }
        }
        if (patchStatus) break;
      }
    } catch {
      activities = [];
    }

    updateView(false);
  };

  fetchCloudData();

  // 3. Background real-time polling while panel is active
  let pollInterval: NodeJS.Timeout | null = null;
  const startPolling = () => {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (!panel.visible) return;
      const currentStatus = String(sessionData.status || '').toUpperCase();
      if (!['COMPLETED', 'SUCCEEDED', 'FAILED', 'ERROR', 'CANCELLED'].includes(currentStatus)) {
        await fetchCloudData();
        if (onUpdate) onUpdate();
      } else {
        stopPolling();
      }
    }, 4000);
  };

  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  startPolling();

  panel.onDidChangeViewState((e) => {
    if (e.webviewPanel.visible) {
      fetchCloudData();
      startPolling();
    } else {
      stopPolling();
    }
  });

  panel.onDidDispose(() => {
    stopPolling();
  });

  // 4. Message handler for user interactions
  panel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.command) {
      case 'approvePlan': {
        try {
          await approvePlanApi(sessionId, targetDir);
          vscode.window.showInformationMessage(`Execution plan approved for session #${sessionId.slice(0, 8)}.`);
          sessionData.status = 'IN_PROGRESS';
          updateView(true);
          await fetchCloudData();
          if (onUpdate) onUpdate();
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to approve plan: ${err.message}`);
        }
        break;
      }
      case 'sendMessage': {
        try {
          await sendMessageApi(sessionId, msg.text, targetDir);
          vscode.window.showInformationMessage(`Instruction sent to Jules session #${sessionId.slice(0, 8)}.`);
          updateView(true);
          await fetchCloudData();
          if (onUpdate) onUpdate();
        } catch (err: any) {
          vscode.window.showErrorMessage(`Failed to send message: ${err.message}`);
        }
        break;
      }
      case 'visualDiff': {
        const hasPatch = activities.some((act: any) =>
          act.artifacts?.some((art: any) => art.changeSet?.gitPatch?.unidiffPatch)
        );
        if (!hasPatch) {
          vscode.window.showInformationMessage(`Session #${sessionId.slice(0, 8)} does not contain any code changes or git patch.`);
          break;
        }
        vscode.commands.executeCommand('jules.viewVisualDiff', sessionId);
        break;
      }
      case 'pullDiff': {
        const hasPatch = activities.some((act: any) =>
          act.artifacts?.some((art: any) => art.changeSet?.gitPatch?.unidiffPatch)
        );
        if (!hasPatch) {
          vscode.window.showInformationMessage(`Session #${sessionId.slice(0, 8)} does not contain any code changes or git patch to pull.`);
          break;
        }
        vscode.commands.executeCommand('jules.pullSessionDiff', sessionId);
        break;
      }
      case 'checkConflict': {
        let rawPatch = '';
        for (let i = activities.length - 1; i >= 0; i--) {
          const act = activities[i];
          if (act.artifacts) {
            for (const art of act.artifacts) {
              if (art.changeSet?.gitPatch?.unidiffPatch) {
                rawPatch = art.changeSet.gitPatch.unidiffPatch;
                break;
              }
            }
          }
          if (rawPatch) break;
        }

        if (!rawPatch) {
          vscode.window.showInformationMessage('No patch changeset found in this session yet.');
          break;
        }

        patchStatus = checkPatchConflict(rawPatch, targetDir);
        updateView(false, true);
        if (patchStatus.canApplyCleanly) {
          vscode.window.showInformationMessage(`✓ Patch applies cleanly to current branch (${sessionData.branch || 'main'}) with 0 conflicts.`);
        } else {
          vscode.window.showWarningMessage(`⚠ Conflict detected during patch dry-run: ${patchStatus.message}`);
        }
        break;
      }
      case 'checkoutBranch': {
        vscode.commands.executeCommand('jules.checkoutSessionBranch', sessionId);
        break;
      }
      case 'mergeSession': {
        vscode.commands.executeCommand('jules.mergeSession', sessionId);
        break;
      }
      case 'createPR': {
        vscode.commands.executeCommand('jules.createGitHubPR', sessionId);
        break;
      }
      case 'openWeb': {
        vscode.commands.executeCommand('jules.openInWeb', sessionId);
        break;
      }
      case 'archiveSession': {
        await vscode.commands.executeCommand('jules.archiveSession', sessionId);
        sessionData.archived = true;
        updateView(false, true);
        break;
      }
      case 'unarchiveSession': {
        await vscode.commands.executeCommand('jules.unarchiveSession', sessionId);
        sessionData.archived = false;
        updateView(false, true);
        break;
      }
      case 'copySessionUrl': {
        await vscode.commands.executeCommand('jules.copySessionUrl', sessionId);
        break;
      }
      case 'refresh': {
        updateView(true, true);
        await fetchCloudData();
        if (onUpdate) onUpdate();
        break;
      }
    }
  });

  context.subscriptions.push(panel);
}
