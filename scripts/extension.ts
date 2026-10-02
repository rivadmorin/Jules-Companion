/**
 * VS Code extension main entrypoint for Jules Companion.
 * @module extension
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WorkspaceTreeDataProvider } from './ui/workspace_provider';
import { SessionsTreeDataProvider, SessionTreeItem, cleanAgentName } from './ui/sessions_provider';
import { AgentsTreeDataProvider, AgentTreeItem } from './ui/agents_provider';
import { JournalsTreeDataProvider } from './ui/journals_provider';
import { deploySessionCore } from './deploy_session';
import { mergeSessionCore, rollbackSession, checkoutSessionBranch } from './merge_session';
import {
  cancelSessionApi,
  deleteSessionApi,
  sendMessageApi,
  approvePlanApi,
  pullDiffApi,
  getActivitiesApi
} from './client/jules_api';
import { loadSessions, saveSessions } from './core/storage';
import { GitHubAuthManager } from './ui/github_auth';
import { createGitHubPullRequest, runGh } from './core/github';
import { parseGitOrigin } from './ui/workspace_provider';
import {
  runDoctorChecks,
  isSessionActive,
  isSessionCompleted,
  isSessionFailed,
  isSessionAwaitingApproval,
  isSessionAwaitingInput,
  archiveSession,
  unarchiveSession,
  loadScheduledTasks,
  addScheduledTask,
  cancelScheduledTask,
  deleteScheduledTask,
  executeDueTasks,
  runScheduledTaskNow,
  setTaskExecutor
} from './utils';
import { openVisualDiff, openUnifiedDiff, JulesDiffContentProvider, JULES_DIFF_SCHEME } from './ui/visual_diff';
import { LiveSyncManager } from './ui/live_sync';
import { openSessionActionCenter } from './ui/action_center';
import { JulesActivityChannel } from './ui/activity_channel';
import { JulesStatusBar } from './ui/status_bar';
import { runCustomAgentWizard } from './ui/custom_agent_wizard';
import { runGit, checkPatchConflict } from './core/git';

let statusBarItem: vscode.StatusBarItem;
let liveSyncBarItem: vscode.StatusBarItem;
let liveSyncManager: LiveSyncManager;
let outputChannel: vscode.OutputChannel;

/**
 * Resolves the primary workspace root folder path.
 */
function getWorkspaceRoot(): string {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }
  return process.cwd();
}

/**
 * Updates the Jules status bar item with active session metrics.
 */
function updateStatusBar(): void {
  const root = getWorkspaceRoot();
  try {
    const sessions = loadSessions(root);
    const awaitingInputSessions = sessions.filter(s => isSessionAwaitingInput(s.status));
    const awaitingPlanSessions = sessions.filter(s => isSessionAwaitingApproval(s.status));
    const activeSessions = sessions.filter(s => isSessionActive(s.status));

    if (awaitingInputSessions.length > 0) {
      statusBarItem.text = `$(comment-discussion) Jules: ${awaitingInputSessions.length} Response Needed`;
      statusBarItem.tooltip = `${awaitingInputSessions.length} Jules session(s) waiting for your response/input. Click to view.`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (awaitingPlanSessions.length > 0) {
      statusBarItem.text = `$(shield) Jules: ${awaitingPlanSessions.length} Plan Approval Needed`;
      statusBarItem.tooltip = `${awaitingPlanSessions.length} Jules session(s) awaiting your plan approval. Click to view.`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else if (activeSessions.length > 0) {
      statusBarItem.text = `$(sync~spin) Jules: ${activeSessions.length} Active`;
      statusBarItem.tooltip = `${activeSessions.length} active Jules session(s) in progress. Click to refresh.`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      statusBarItem.text = `$(check) Jules`;
      statusBarItem.tooltip = `Jules Companion ready. ${sessions.length} session(s) recorded.`;
      statusBarItem.backgroundColor = undefined;
    }
    statusBarItem.show();
  } catch {
    statusBarItem.text = `$(hubot) Jules`;
    statusBarItem.show();
  }
}

/**
 * Resolves target session ID cleanly from various invocation contexts:
 * - SessionTreeItem (arg.session.id)
 * - SessionRecord (arg.id)
 * - Wrapper object ({ session: { id } } or { session: SessionRecord })
 * - Direct string identifier
 *
 * @param arg - Command argument from TreeView, menus, webview, or code.
 * @returns Clean session ID or undefined if cannot be extracted.
 */
export function resolveSessionId(arg?: any): string | undefined {
  if (!arg) return undefined;
  if (typeof arg === 'string') return arg.trim() || undefined;
  if (typeof arg.session === 'object' && arg.session !== null) {
    if (typeof arg.session.id === 'string') return arg.session.id.trim();
  }
  if (typeof arg.id === 'string') return arg.id.trim();
  return undefined;
}

/**
 * Extension activation entrypoint.
 * @param context - The VS Code extension context provided by the runtime.
 */
export function activate(context: vscode.ExtensionContext): void {
  // Wire task executor into scheduler to maintain clean layer separation
  setTaskExecutor((opts) => deploySessionCore(opts as any));

  outputChannel = vscode.window.createOutputChannel('Jules Companion');
  context.subscriptions.push(outputChannel);

  // In-Memory Virtual Document Provider for Native Diffs (zero disk writes)
  const diffProvider = JulesDiffContentProvider.getInstance();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(JULES_DIFF_SCHEME, diffProvider)
  );

  // Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  statusBarItem.command = 'jules.refreshSessions';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();

  // Live Sync Background Manager & Status Bar Item
  liveSyncManager = new LiveSyncManager(getWorkspaceRoot, () => refreshAll());
  liveSyncBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 9);
  liveSyncBarItem.command = 'jules.toggleLiveSync';
  context.subscriptions.push(liveSyncBarItem);

  const updateLiveSyncBar = () => {
    if (liveSyncManager.isActive()) {
      liveSyncBarItem.text = '$(radio-tower) Jules Live: ON';
      liveSyncBarItem.tooltip = 'Jules Live Sync: ACTIVE (click to pause)';
    } else {
      liveSyncBarItem.text = '$(circle-slash) Jules Live: OFF';
      liveSyncBarItem.tooltip = 'Jules Live Sync: PAUSED (click to activate)';
    }
    liveSyncBarItem.show();
  };
  updateLiveSyncBar();

  // Sidebar Tree Data Providers
  const workspaceProvider = new WorkspaceTreeDataProvider(getWorkspaceRoot);
  const sessionsProvider = new SessionsTreeDataProvider(getWorkspaceRoot);
  const agentsProvider = new AgentsTreeDataProvider(context.extensionPath, getWorkspaceRoot);
  const journalsProvider = new JournalsTreeDataProvider(getWorkspaceRoot);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('jules.workspaceView', workspaceProvider),
    vscode.window.registerTreeDataProvider('jules.sessionsView', sessionsProvider),
    vscode.window.registerTreeDataProvider('jules.agentsView', agentsProvider),
    vscode.window.registerTreeDataProvider('jules.journalsView', journalsProvider)
  );

  const refreshAll = () => {
    workspaceProvider.refresh();
    sessionsProvider.refresh();
    agentsProvider.refresh();
    journalsProvider.refresh();
    updateStatusBar();
    updateLiveSyncBar();
    JulesStatusBar.getInstance().update(loadSessions(getWorkspaceRoot()));
  };

  // Synchronize API key from settings or secrets on activate
  const configApiKey = vscode.workspace.getConfiguration('jules').get<string>('apiKey');
  if (configApiKey && configApiKey.trim()) {
    process.env.JULES_API_KEY = configApiKey.trim();
  } else {
    context.secrets.get('jules.apiKey').then(secretKey => {
      if (secretKey && secretKey.trim() && !process.env.JULES_API_KEY) {
        process.env.JULES_API_KEY = secretKey.trim();
      }
    });
  }

  // 1. Refresh Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.refreshSessions', () => {
      refreshAll();
      vscode.window.showInformationMessage('Jules Companion state refreshed.');
    })
  );

  // Refresh Workspace Context Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.refreshWorkspace', () => {
      workspaceProvider.refresh();
      vscode.window.showInformationMessage('Jules workspace context refreshed.');
    })
  );

  // Show Full Task Detail Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.showTaskDetail', async (taskText: string) => {
      if (!taskText) return;
      if (taskText.length > 200 || taskText.includes('\n')) {
        const doc = await vscode.workspace.openTextDocument({
          content: `# Jules Session Task Detail\n\n${taskText}\n`,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, { preview: true });
      } else {
        vscode.window.showInformationMessage(taskText, { modal: true });
      }
    })
  );

  // Checkout Session Review Branch Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.checkoutSessionBranch', async (item?: any) => {
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);
      if (!sessionId) {
        vscode.window.showWarningMessage('No session selected for checkout.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Checking out review branch for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            const msg = await checkoutSessionBranch(sessionId, undefined, root);
            vscode.window.showInformationMessage(`🌿 ${msg}`);
            refreshAll();
          } catch (err: any) {
            vscode.window.showErrorMessage(`Checkout failed: ${err.message}`);
          }
        }
      );
    })
  );

  // Set API Key Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.setApiKey', async () => {
      const root = getWorkspaceRoot();
      const currentKey = process.env.JULES_API_KEY || '';
      const masked = currentKey ? `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}` : 'None';

      const apiKey = await vscode.window.showInputBox({
        title: 'Configure Google Jules API Key',
        prompt: `Current Key: [${masked}]. Enter your Google Jules API Key:`,
        placeHolder: 'AIzaSy...',
        password: true,
        ignoreFocusOut: true
      });

      if (apiKey === undefined) return;

      const trimmed = apiKey.trim();
      if (!trimmed) {
        vscode.window.showWarningMessage('API Key cannot be empty.');
        return;
      }

      // 1. In-memory env
      process.env.JULES_API_KEY = trimmed;

      // 2. Secret Storage
      await context.secrets.store('jules.apiKey', trimmed);

      // 3. Write to local .env in workspace root for CLI & MCP interoperability
      try {
        const envPath = path.join(root, '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        if (envContent.includes('JULES_API_KEY=')) {
          envContent = envContent.replace(/JULES_API_KEY\s*=\s*.*/g, `JULES_API_KEY=${trimmed}`);
        } else {
          envContent = envContent ? `${envContent.trim()}\nJULES_API_KEY=${trimmed}\n` : `JULES_API_KEY=${trimmed}\n`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
      } catch {
        // Fallback silently if disk write not permitted
      }

      vscode.window.showInformationMessage('✅ Google Jules API Key saved successfully.');
      refreshAll();
    })
  );

interface AgentPickItem extends vscode.QuickPickItem {
  agentValue: string;
}

/**
 * Loads all 44 agents and team presets into QuickPick items.
 */
function getAgentQuickPickList(extensionPath: string, root: string): AgentPickItem[] {
  const candidates = [
    path.join(root, 'references', 'agents', 'registry.json'),
    path.join(extensionPath, 'references', 'agents', 'registry.json')
  ];

  let rawAgents: Record<string, any> = {};
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
        rawAgents = parsed.agents || parsed;
        break;
      } catch {
        // fallback
      }
    }
  }

  const items: AgentPickItem[] = [
    {
      label: '$(organization) Team: Full Audit',
      description: 'sentinel, janitor, annotator, grader',
      detail: 'Comprehensive multi-agent code hygiene, linting, and security audit',
      agentValue: 'sentinel,janitor,annotator,grader'
    },
    {
      label: '$(organization) Team: Feature Sprint',
      description: 'innovator, builder, inspector',
      detail: 'Rapid prototype and implementation team',
      agentValue: 'innovator,builder,inspector'
    },
    {
      label: '$(organization) Team: Refactor Boost',
      description: 'modernizer, bolt, inspector',
      detail: 'Code modernization and performance optimization team',
      agentValue: 'modernizer,bolt,inspector'
    },
    {
      label: '$(organization) Team: GitHub Ops',
      description: 'octo, smith, scribe, archivist',
      detail: 'GitHub Actions, CI/CD, repository templates, Git hooks, and release management',
      agentValue: 'octo,smith,scribe,archivist'
    },
    {
      kind: vscode.QuickPickItemKind.Separator,
      label: `Specialist Agents (${Object.keys(rawAgents).length || 44})`,
      agentValue: ''
    }
  ];

  const agentList = Object.values(rawAgents).sort((a: any, b: any) =>
    (a.name || a.id).localeCompare(b.name || b.id)
  );

  for (const a of agentList) {
    items.push({
      label: `$(sparkle) ${a.name || a.id}`,
      description: `[${a.category || (a.group || 'general').toUpperCase()}] ${a.role || ''}`,
      detail: a.description || `Specialist agent: ${a.id}`,
      agentValue: a.id
    });
  }

  return items;
}

  // 2. Deploy Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.deploySession', async () => {
      const root = getWorkspaceRoot();

      if (!process.env.JULES_API_KEY) {
        const setKey = await vscode.window.showErrorMessage(
          'Google Jules API Key is missing. Please configure your API key first.',
          'Configure API Key'
        );
        if (setKey === 'Configure API Key') {
          vscode.commands.executeCommand('jules.setApiKey');
        }
        return;
      }

      let defaultPrompt = '';
      const editor = vscode.window.activeTextEditor;
      if (editor && !editor.selection.isEmpty) {
        const selectedText = editor.document.getText(editor.selection);
        const fileName = path.basename(editor.document.fileName);
        const choice = await vscode.window.showQuickPick(
          [
            { label: '$(code) Include Selected Code Context', description: `From ${fileName} (${selectedText.split('\n').length} lines)`, include: true },
            { label: '$(edit) Fresh Task Prompt Only', description: 'Enter instructions without code snippet', include: false }
          ],
          { title: 'Step 1/3: Task Context & Code Selection' }
        );
        if (choice === undefined) return;
        if (choice.include) {
          defaultPrompt = `Refactor or improve ${fileName}:\n\`\`\`\n${selectedText.slice(0, 1000)}\n\`\`\`\n\nTask: `;
        }
      }

      const taskPrompt = await vscode.window.showInputBox({
        title: 'Step 1/3: Task Description & Prompt',
        prompt: 'Describe the task or feature for Jules to execute in the cloud',
        placeHolder: 'e.g. Refactor authentication middleware to use JWT and add unit tests',
        value: defaultPrompt
      });

      if (!taskPrompt || !taskPrompt.trim()) return;

      const agentItems = getAgentQuickPickList(context.extensionPath, root);
      const agentSelection = await vscode.window.showQuickPick(agentItems, {
        title: 'Step 2/3: Select Primary Agent or Team Preset',
        placeHolder: 'Search across 44 specialized agents or select a team preset...',
        matchOnDescription: true,
        matchOnDetail: true
      });

      if (!agentSelection || !agentSelection.agentValue) return;
      const agent = agentSelection.agentValue;

      const modeChoice = await vscode.window.showQuickPick(
        [
          {
            label: '$(rocket) Start',
            description: 'Get started without plan approval',
            detail: 'Jules begins autonomous code implementation immediately.',
            type: 'start' as const
          },
          {
            label: '$(checklist) Review',
            description: 'Generate plan and wait for approval',
            detail: 'Jules formulates a comprehensive step-by-step plan and pauses for your authorization.',
            type: 'review' as const
          },
          {
            label: '$(comment-discussion) Interactive plan',
            description: 'Chat with Jules to understand goals before planning and approval',
            detail: 'Jules engages in a conversational dialogue to clarify goals before drafting the plan.',
            type: 'interactive' as const
          },
          {
            label: '$(clock) Scheduled task [NEW!]',
            description: 'Create tasks for Jules to work on when you\'re not there!',
            detail: 'Schedule this task to run automatically at a specific time or delay.',
            type: 'scheduled' as const
          }
        ],
        { title: 'Step 3/3: Execution Mode' }
      );

      if (!modeChoice) return;

      if (modeChoice.type === 'scheduled') {
        const scheduleChoice = await vscode.window.showQuickPick(
          [
            { label: '$(clock) In 15 minutes', minutes: 15 },
            { label: '$(clock) In 30 minutes', minutes: 30 },
            { label: '$(clock) In 1 hour', minutes: 60 },
            { label: '$(clock) In 2 hours', minutes: 120 },
            { label: '$(clock) Tonight at 23:00', special: 'tonight' },
            { label: '$(clock) Tomorrow morning at 09:00', special: 'tomorrow' },
            { label: '$(edit) Custom delay (minutes)', special: 'custom' }
          ],
          { title: 'Select Schedule Timing for Jules' }
        );

        if (!scheduleChoice) return;

        let delayMs = 15 * 60 * 1000;
        const now = new Date();

        if (scheduleChoice.minutes) {
          delayMs = scheduleChoice.minutes * 60 * 1000;
        } else if (scheduleChoice.special === 'tonight') {
          const target = new Date();
          target.setHours(23, 0, 0, 0);
          if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
          }
          delayMs = target.getTime() - now.getTime();
        } else if (scheduleChoice.special === 'tomorrow') {
          const target = new Date();
          target.setDate(target.getDate() + 1);
          target.setHours(9, 0, 0, 0);
          delayMs = target.getTime() - now.getTime();
        } else if (scheduleChoice.special === 'custom') {
          const val = await vscode.window.showInputBox({
            title: 'Enter Delay in Minutes',
            prompt: 'e.g. 45 for 45 minutes, or 180 for 3 hours',
            value: '30'
          });
          if (!val) return;
          const mins = parseInt(val, 10);
          if (isNaN(mins) || mins <= 0) {
            vscode.window.showErrorMessage('Invalid delay minutes entered.');
            return;
          }
          delayMs = mins * 60 * 1000;
        }

        const scheduledTime = new Date(Date.now() + delayMs);
        const scheduledIso = scheduledTime.toISOString();

        addScheduledTask(
          {
            agent,
            mode: 'code',
            type: 'start',
            task: taskPrompt.trim(),
            scheduledAt: scheduledIso
          },
          root
        );

        vscode.window.showInformationMessage(
          `⏰ Jules task scheduled for ${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Jules will run this autonomously.`
        );
        refreshAll();
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deploying Jules session (${agent})...`,
          cancellable: false
        },
        async () => {
          try {
            const res = await deploySessionCore({
              type: modeChoice.type,
              task: taskPrompt.trim(),
              agents: agent,
              targetDir: root
            });

            const created = res.sessions && res.sessions.length > 0 ? res.sessions[0] : null;
            const sessionId = created ? created.id : (res as any).sessionId;

            if (res.success && sessionId) {
              const webUrl = `https://jules.google.com/session/${sessionId}`;
              const action = await vscode.window.showInformationMessage(
                `🚀 Jules Session #${sessionId.slice(0, 8)} deployed (${agent})!`,
                '🌐 Open in Web',
                '💬 Send Follow-up',
                '📋 Copy ID'
              );

              if (action === '🌐 Open in Web') {
                vscode.env.openExternal(vscode.Uri.parse(webUrl));
              } else if (action === '💬 Send Follow-up') {
                vscode.commands.executeCommand('jules.sendMessage', { session: { id: sessionId } });
              } else if (action === '📋 Copy ID') {
                vscode.env.clipboard.writeText(sessionId);
              }
            } else {
              vscode.window.showErrorMessage(`Failed to deploy session: ${res.error || 'Unknown error'}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Deploy error: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // Deploy directly from Agent Roster selection
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.deployWithAgent', async (item?: AgentTreeItem) => {
      const root = getWorkspaceRoot();
      const agentId = item?.agent?.id;
      if (!agentId) return;

      if (!process.env.JULES_API_KEY) {
        const setKey = await vscode.window.showErrorMessage(
          'Google Jules API Key is missing. Please configure your API key first.',
          'Configure API Key'
        );
        if (setKey === 'Configure API Key') {
          vscode.commands.executeCommand('jules.setApiKey');
        }
        return;
      }

      const taskPrompt = await vscode.window.showInputBox({
        title: `Deploy Session with Agent: ${item.agent?.name || agentId}`,
        prompt: `Describe the task for ${item.agent?.name || agentId} to execute`,
        placeHolder: `e.g. ${item.agent?.role || 'Execute specialized task'}`
      });

      if (!taskPrompt || !taskPrompt.trim()) return;

      const modeChoice = await vscode.window.showQuickPick(
        [
          {
            label: '$(zap) Autonomous Execution (Recommended)',
            description: 'Directly execute code edits, run tests, and prepare review PR',
            type: 'start' as const
          },
          {
            label: '$(shield) Interactive Plan Approval',
            description: 'Generate step-by-step plan first and pause for your review & approval',
            type: 'interactive' as const
          }
        ],
        { title: 'Select Execution Mode' }
      );

      if (!modeChoice) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deploying Jules session (${agentId})...`,
          cancellable: false
        },
        async () => {
          try {
            const res = await deploySessionCore({
              type: modeChoice.type,
              task: taskPrompt.trim(),
              agents: agentId,
              targetDir: root
            });

            const created = res.sessions && res.sessions.length > 0 ? res.sessions[0] : null;
            const sessionId = created ? created.id : (res as any).sessionId;

            if (res.success && sessionId) {
              const webUrl = `https://jules.google.com/session/${sessionId}`;
              const action = await vscode.window.showInformationMessage(
                `🚀 Jules Session #${sessionId.slice(0, 8)} deployed (${agentId})!`,
                '🌐 Open in Web',
                '💬 Send Follow-up',
                '📋 Copy ID'
              );

              if (action === '🌐 Open in Web') {
                vscode.env.openExternal(vscode.Uri.parse(webUrl));
              } else if (action === '💬 Send Follow-up') {
                vscode.commands.executeCommand('jules.sendMessage', { session: { id: sessionId } });
              } else if (action === '📋 Copy ID') {
                vscode.env.clipboard.writeText(sessionId);
              }
            } else {
              vscode.window.showErrorMessage(`Failed to deploy session: ${res.error || 'Unknown error'}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Deploy error: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 3. Merge Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.mergeSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        const candidates = sessions.filter(s => isSessionCompleted(s.status));

        if (candidates.length === 0) {
          vscode.window.showInformationMessage('No completed sessions available to merge.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          candidates.map(s => ({
            label: `#${s.id}`,
            description: `${s.agent} - ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to Merge' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Merging Jules session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            const res = await mergeSessionCore({
              sessionId,
              targetDir: root
            });

            if (res.success) {
              vscode.window.showInformationMessage(`Session #${sessionId} merged successfully.`);
            } else {
              vscode.window.showErrorMessage(`Merge failed: ${res.error}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Merge error: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 4. View Session Diff Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.viewSessionDiff', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions found.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id}`,
            description: `[${s.status}] ${s.agent} - ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to View Diff' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '$(diff) Native Side-by-Side Diff Editor',
            description: 'Inspect modified files side-by-side using VS Code built-in diff editor',
            mode: 'visual'
          },
          {
            label: '$(file-code) Unified Git Patch Tab',
            description: 'Open complete unified diff in an in-memory virtual editor tab',
            mode: 'unified'
          }
        ],
        { title: `Inspect Diff for Session #${sessionId!.slice(0, 8)}` }
      );

      if (!choice) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Loading diff for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            if (choice.mode === 'visual') {
              await openVisualDiff(sessionId!, root);
            } else {
              await openUnifiedDiff(sessionId!, root);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to display diff: ${err.message}`);
          }
        }
      );
    })
  );

  // 5. Cancel Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.cancelSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);
      if (!sessionId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to cancel session #${sessionId}?`,
        { modal: true },
        'Cancel Session'
      );

      if (confirm !== 'Cancel Session') return;

      try {
        await cancelSessionApi(sessionId, root);
        vscode.window.showInformationMessage(`Session #${sessionId} cancelled.`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to cancel session: ${err.message}`);
      } finally {
        refreshAll();
      }
    })
  );

  // 6. Delete Session Command (Cloud & Local)
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.deleteSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions available to delete.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to Delete' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to permanently delete session #${sessionId}? This will remove it from Google Jules cloud and local registry.`,
        { modal: true },
        'Delete Session'
      );

      if (confirm !== 'Delete Session') return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Deleting session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            const delRes = await deleteSessionApi(sessionId!, root);
            const count = delRes.cleanedFiles?.length || 0;
            const cleanMsg = count > 0 ? ` (purged ${count} scratch file${count > 1 ? 's' : ''})` : '';
            vscode.window.showInformationMessage(`🗑️ Session #${sessionId} permanently deleted${cleanMsg}.`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to delete session: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 6b. Archive Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.archiveSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        const candidates = sessions.filter(s => !s.archived);
        if (candidates.length === 0) {
          vscode.window.showInformationMessage('No active sessions available to archive.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          candidates.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to Archive' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const res = archiveSession(sessionId!, root);
      if (res.success) {
        const count = res.cleanedFiles?.length || 0;
        const cleanMsg = count > 0 ? ` (purged ${count} scratch file${count > 1 ? 's' : ''})` : '';
        vscode.window.showInformationMessage(`📦 Session #${sessionId.slice(0, 8)} archived${cleanMsg}.`);
      } else {
        vscode.window.showWarningMessage(res.message);
      }
      refreshAll();
    })
  );

  // 6c. Unarchive Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.unarchiveSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        const candidates = sessions.filter(s => s.archived);
        if (candidates.length === 0) {
          vscode.window.showInformationMessage('No archived sessions to restore.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          candidates.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Archived Session to Restore' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const res = unarchiveSession(sessionId!, root);
      if (res.success) {
        vscode.window.showInformationMessage(`📤 Session #${sessionId.slice(0, 8)} restored from archive.`);
      } else {
        vscode.window.showWarningMessage(res.message);
      }
      refreshAll();
    })
  );

  // 6d. Copy Session URL Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.copySessionUrl', async (item?: any) => {
      const sessionId = resolveSessionId(item);
      if (!sessionId) {
        vscode.window.showWarningMessage('No session selected to copy URL.');
        return;
      }
      const url = item?.session?.url || item?.url || `https://jules.google.com/session/${sessionId}`;
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage(`📋 Copied session URL: ${url}`);
    })
  );

  // 6e. Retry Failed Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.retryFailedSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      const sessions = loadSessions(root);
      if (!sessionId) {
        const failedSessions = sessions.filter(s => isSessionFailed(s.status));
        if (failedSessions.length === 0) {
          vscode.window.showInformationMessage('No failed sessions found to retry.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          failedSessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Failed Session to Retry' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        vscode.window.showErrorMessage(`Session #${sessionId} not found.`);
        return;
      }

      const newTask = await vscode.window.showInputBox({
        title: `Retry Session #${sessionId.slice(0, 8)}`,
        prompt: 'Update task instructions for retry (leave as is to use original prompt)',
        value: session.task || ''
      });

      if (newTask === undefined) return;

      const taskToRun = newTask.trim() || session.task || 'Retry task';

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Retrying session #${sessionId.slice(0, 8)} with ${session.agent}...`,
          cancellable: false
        },
        async () => {
          try {
            const res = await deploySessionCore({
              agents: session.agent,
              task: taskToRun,
              type: 'start',
              mode: session.mode || 'code',
              targetDir: root
            });

            if (res.success) {
              vscode.window.showInformationMessage(`🚀 Retried session deployed successfully!`);
            } else {
              vscode.window.showErrorMessage(`Retry failed: ${res.error}`);
            }
          } catch (err: any) {
            vscode.window.showErrorMessage(`Retry failed: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 7. Send Message / Follow-up Instruction Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.sendMessage', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions found.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to Send Instruction' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const message = await vscode.window.showInputBox({
        title: `Send Instruction to Jules Session #${sessionId.slice(0, 8)}`,
        prompt: 'Enter follow-up instruction, clarification, or feedback for the agent:',
        placeHolder: 'e.g. Also make sure to add comprehensive unit tests and error handling'
      });

      if (!message || !message.trim()) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Sending instruction to session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            await sendMessageApi(sessionId!, message.trim(), root);
            vscode.window.showInformationMessage(`💬 Message sent to Jules session #${sessionId.slice(0, 8)}.`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to send message: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 8. Approve Proposed Plan Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.approvePlan', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        const candidates = sessions.filter(s => isSessionAwaitingApproval(s.status));

        if (candidates.length === 0) {
          vscode.window.showInformationMessage('No sessions currently awaiting plan approval.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          candidates.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: s.task || '',
            id: s.id
          })),
          { title: 'Select Session to Approve Plan' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Approving execution plan for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            await approvePlanApi(sessionId!, root);
            vscode.window.showInformationMessage(`✅ Execution plan for session #${sessionId.slice(0, 8)} approved!`);
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to approve plan: ${err.message}`);
          } finally {
            refreshAll();
          }
        }
      );
    })
  );

  // 9. Open Session in Jules Web Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.openInWeb', (item?: any) => {
      const sessionId = resolveSessionId(item);
      if (!sessionId) {
        vscode.env.openExternal(vscode.Uri.parse('https://jules.google.com'));
        return;
      }
      const targetUrl = item?.session?.url || item?.url || `https://jules.google.com/session/${sessionId}`;
      vscode.env.openExternal(vscode.Uri.parse(targetUrl));
    })
  );

  // 10. View Activities & Plan Logs Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.viewActivities', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions found.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to View Activities' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Loading activities for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            const activities = await getActivitiesApi(sessionId!, root);
            if (!activities || activities.length === 0) {
              vscode.window.showInformationMessage(`No activities logged yet for session #${sessionId}.`);
              return;
            }

            let md = `# 📋 Jules Session Activities: \`#${sessionId}\`\n\n`;
            md += `Generated at: ${new Date().toISOString()}\n\n---\n\n`;

            for (const act of activities) {
              const time = act.createTime ? new Date(act.createTime).toLocaleTimeString() : '';
              if (act.planGenerated && act.planGenerated.plan) {
                md += `## 🧭 Plan Generated (${time})\n\n`;
                const steps = act.planGenerated.plan.steps || [];
                for (let i = 0; i < steps.length; i++) {
                  md += `${i + 1}. ${steps[i].title}\n`;
                }
                md += '\n---\n\n';
              } else if (act.planApproved) {
                md += `## ✅ Plan Approved (${time})\n\n---\n\n`;
              } else if (act.progressUpdated) {
                md += `### ⚡ Progress Update (${time})\n\n`;
                if (act.artifacts) {
                  for (const art of act.artifacts) {
                    if (art.bashOutput) {
                      md += `**Command:** \`${art.bashOutput.command || ''}\`\n\n\`\`\`bash\n${art.bashOutput.stdout || ''}\n\`\`\`\n\n`;
                    }
                    if (art.changeSet) {
                      md += `**ChangeSet:** Source: \`${art.changeSet.source || ''}\`\n\n`;
                      if (art.changeSet.suggestedCommitMessage) {
                        md += `Commit: *${art.changeSet.suggestedCommitMessage}*\n\n`;
                      }
                    }
                  }
                }
              } else if (act.sessionCompleted) {
                md += `## 🏁 Session Completed (${time})\n\n---\n\n`;
              }
            }

            const doc = await vscode.workspace.openTextDocument({
              content: md,
              language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, { preview: true });
          } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to fetch activities: ${err.message}`);
          }
        }
      );
    })
  );

  // 11. Open Agent Documentation Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.openAgentDoc', async (agent?: any) => {
      const root = getWorkspaceRoot();
      const agentId = agent?.id || agent;
      if (!agentId) return;

      const candidates = [
        path.join(root, '.jules-companion', 'references', 'agents', `${agentId}.md`),
        path.join(root, 'references', 'agents', `${agentId}.md`),
        path.join(context.extensionPath, 'references', 'agents', `${agentId}.md`)
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(p));
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }
      }

      vscode.window.showWarningMessage(`No documentation template found for agent: ${agentId}`);
    })
  );

  // 6. Rollback Session Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.rollbackSession', async (item?: any) => {
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to rollback ${sessionId ? `session #${sessionId}` : 'the last session'}? Uncommitted changes will be restored to checkpoint.`,
        { modal: true },
        'Rollback'
      );

      if (confirm !== 'Rollback') return;

      try {
        const msg = await rollbackSession(sessionId, root);
        vscode.window.showInformationMessage(msg);
      } catch (err: any) {
        vscode.window.showErrorMessage(`Rollback failed: ${err.message}`);
      } finally {
        refreshAll();
      }
    })
  );

  // 7. Run Doctor Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.runDoctor', () => {
      const root = getWorkspaceRoot();
      outputChannel.clear();
      outputChannel.show(true);
      outputChannel.appendLine('=== Jules Companion System Doctor ===');
      outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
      outputChannel.appendLine(`Target Directory: ${root}\n`);

      const res = runDoctorChecks(root);
      for (const [key, msg] of Object.entries(res.checks)) {
        outputChannel.appendLine(`[${key}]: ${msg}`);
      }
      outputChannel.appendLine('\n' + (res.ok ? '✔ All critical checks passed.' : '⚠ Some checks failed. Review details above.'));
    })
  );

  // 9. View Visual Side-by-Side Diff Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.viewVisualDiff', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions found.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to View Visual Diff' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Loading visual diff for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            await openVisualDiff(sessionId!, root);
          } catch (err: any) {
            if (err.message?.includes('No git patch found')) {
              vscode.window.showInformationMessage(`No code changes or git patch found for session #${sessionId!.slice(0, 8)}.`);
            } else {
              vscode.window.showErrorMessage(`Failed to open visual diff: ${err.message}`);
            }
          }
        }
      );
    })
  );

  // 10. Pull Session .diff Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.pullSessionDiff', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No sessions found.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          sessions.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: `[${s.status}] ${s.task || ''}`,
            id: s.id
          })),
          { title: 'Select Session to Pull .diff File' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Pulling .diff for session #${sessionId.slice(0, 8)}...`,
          cancellable: false
        },
        async () => {
          try {
            const patchContent = await pullDiffApi(sessionId!, root);
            const diffsDir = path.join(root, '.jules-companion', 'diffs');
            fs.mkdirSync(diffsDir, { recursive: true });
            const diffFilePath = path.join(diffsDir, `session-${sessionId!.slice(0, 8)}.diff`);
            fs.writeFileSync(diffFilePath, patchContent, 'utf8');

            const doc = await vscode.workspace.openTextDocument(diffFilePath);
            await vscode.window.showTextDocument(doc, { preview: false });

            const check = checkPatchConflict(patchContent, root);
            if (check.canApplyCleanly) {
              vscode.window.showInformationMessage(
                `Saved and opened session-${sessionId!.slice(0, 8)}.diff (Applies cleanly with 0 conflicts)`
              );
            } else {
              vscode.window.showWarningMessage(
                `Saved and opened session-${sessionId!.slice(0, 8)}.diff (Conflict warning: ${check.message})`
              );
            }
          } catch (err: any) {
            if (err.message?.includes('No git patch found')) {
              vscode.window.showInformationMessage(`No code changes or git patch found for session #${sessionId!.slice(0, 8)}.`);
            } else {
              vscode.window.showErrorMessage(`Failed to pull .diff: ${err.message}`);
            }
          }
        }
      );
    })
  );

  // 11. Open Session Action Center Command (Native QuickPick Hub)
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.openSessionActionCenter', async (item?: any) => {
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);
      await openSessionActionCenter(sessionId, root);
    }),
    vscode.commands.registerCommand('jules.openMissionControl', async (item?: any) => {
      // Backward-compatible alias routing to native action center
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);
      await openSessionActionCenter(sessionId, root);
    }),
    vscode.commands.registerCommand('jules.streamActivityLog', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);
      if (!sessionId) {
        const sessions = loadSessions(root);
        if (sessions.length === 0) {
          vscode.window.showInformationMessage('No Jules sessions available to stream.');
          JulesActivityChannel.getInstance().show(true);
          return;
        }
        const pickItems = sessions.map(s => ({
          label: `#${s.id.slice(0, 8)} • ${cleanAgentName(s.agent)}`,
          description: `[${s.status}] • ${s.branch || 'main'}`,
          detail: s.task,
          session: s
        }));
        const picked = await vscode.window.showQuickPick(pickItems, {
          placeHolder: 'Select a Jules session to stream activities and logs:'
        });
        if (!picked) return;
        sessionId = picked.session.id;
      }
      await JulesActivityChannel.getInstance().streamSessionActivities(sessionId, root);
    })
  );

  // 11. Toggle Live Sync Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.toggleLiveSync', () => {
      const active = liveSyncManager.toggle();
      updateLiveSyncBar();
      if (active) {
        vscode.window.showInformationMessage('📡 Jules Live Sync activated (polling cloud sessions every 15s).');
      } else {
        vscode.window.showInformationMessage('⏸️ Jules Live Sync paused.');
      }
    })
  );

  // 12. GitHub Integration & PR Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.signInGitHub', async () => {
      const token = await GitHubAuthManager.signIn();
      if (token) {
        workspaceProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('jules.signOutGitHub', async () => {
      await GitHubAuthManager.signOut();
      workspaceProvider.refresh();
    }),

    vscode.commands.registerCommand('jules.openPRInBrowser', async (item?: any) => {
      const root = getWorkspaceRoot();
      const sessionId = resolveSessionId(item);
      let prUrl: string | undefined;

      if (sessionId) {
        const sessions = loadSessions(root);
        const session = sessions.find(s => s.id === sessionId) || item?.session;
        prUrl = session?.prUrl;
      } else if (item?.prUrl) {
        prUrl = item.prUrl;
      }

      if (prUrl) {
        vscode.env.openExternal(vscode.Uri.parse(prUrl));
      } else {
        vscode.window.showInformationMessage('No Pull Request URL found for this session.');
      }
    }),

    vscode.commands.registerCommand('jules.createGitHubPR', async (item?: any) => {
      const root = getWorkspaceRoot();
      let sessionId = resolveSessionId(item);

      if (!sessionId) {
        const sessions = loadSessions(root);
        const candidates = sessions.filter(s => isSessionCompleted(s.status));

        if (candidates.length === 0) {
          vscode.window.showInformationMessage('No completed sessions available to create PR.');
          return;
        }

        const picked = await vscode.window.showQuickPick(
          candidates.map(s => ({
            label: `#${s.id.slice(0, 8)} • ${s.agent}`,
            description: s.task || '',
            id: s.id,
            session: s
          })),
          { title: 'Select Completed Session to Create PR' }
        );

        if (!picked) return;
        sessionId = picked.id;
      }

      const sessions = loadSessions(root);
      const session = sessions.find(s => s.id === sessionId) || item?.session;
      const baseBranch = session?.branch || 'main';
      const headBranch = `jules/${sessionId}`;
      const defaultTitle = session?.task
        ? `Jules [${session.agent}]: ${session.task.slice(0, 60)}`
        : `Jules Patch for Session #${sessionId.slice(0, 8)}`;

      const prTitle = await vscode.window.showInputBox({
        title: 'Create GitHub Pull Request',
        prompt: 'Enter PR Title:',
        value: defaultTitle
      });

      if (!prTitle || !prTitle.trim()) return;

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Creating GitHub PR for session #${sessionId}...`,
          cancellable: false
        },
        async () => {
          try {
            await checkoutSessionBranch(sessionId!, undefined, root);
          } catch {
            // continue
          }

          // 1. Push review branch to remote origin
          runGit(['push', '-u', 'origin', headBranch], root);

          // 2. Parse Git remote origin slug
          const remoteRes = runGit(['config', '--get', 'remote.origin.url'], root);
          const originInfo = parseGitOrigin(remoteRes.stdout);
          let createdPrUrl: string | undefined;

          // 3. Tier 1: Create PR via official GitHub REST API if authenticated
          const token = await GitHubAuthManager.getToken();
          if (token && originInfo) {
            const apiRes = await createGitHubPullRequest(token, {
              owner: originInfo.owner,
              repo: originInfo.repo,
              title: prTitle.trim(),
              body: `Automated Pull Request generated by Jules Companion agent (\`${session?.agent || 'specialist'}\`) for session #${sessionId}.\n\n### Task\n${session?.task || 'N/A'}`,
              head: headBranch,
              base: baseBranch
            });
            if (apiRes.success && apiRes.url) {
              createdPrUrl = apiRes.url;
            }
          }

          // 4. Tier 2: Create PR via GitHub CLI (gh pr create) fallback
          if (!createdPrUrl) {
            const ghRes = runGh(
              [
                'pr',
                'create',
                '--title',
                prTitle.trim(),
                '--body',
                `Automated Pull Request generated by Jules Companion agent (\`${session?.agent || 'specialist'}\`) for session #${sessionId}.\n\n### Task\n${session?.task || 'N/A'}`,
                '--head',
                headBranch,
                '--base',
                baseBranch
              ],
              root
            );
            if (ghRes.success && ghRes.stdout) {
              createdPrUrl = ghRes.stdout.trim();
            }
          }

          // 5. Handle Outcome
          if (createdPrUrl) {
            // Persist prUrl on session record
            const allSessions = loadSessions(root);
            const currentSession = allSessions.find(s => s.id === sessionId);
            if (currentSession) {
              currentSession.prUrl = createdPrUrl;
              saveSessions(allSessions, root);
            }
            sessionsProvider.refresh();

            const action = await vscode.window.showInformationMessage(
              `🎉 Pull Request created: ${createdPrUrl}`,
              'Open in Browser'
            );
            if (action === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(createdPrUrl));
            }
          } else {
            // Tier 3: Browser Compare URL Fallback
            if (originInfo) {
              const webPrUrl = `https://github.com/${originInfo.slug}/compare/${baseBranch}...${headBranch}?expand=1&title=${encodeURIComponent(prTitle.trim())}&body=${encodeURIComponent(`Automated PR from Jules session #${sessionId}`)}`;
              const action = await vscode.window.showWarningMessage(
                'GitHub API & CLI submission could not be completed. Open GitHub in browser to submit PR?',
                'Open in Browser',
                'Sign in to GitHub'
              );
              if (action === 'Open in Browser') {
                vscode.env.openExternal(vscode.Uri.parse(webPrUrl));
              } else if (action === 'Sign in to GitHub') {
                vscode.commands.executeCommand('jules.signInGitHub');
              }
            } else {
              vscode.window.showErrorMessage('Failed to create PR: No valid GitHub remote origin found.');
            }
          }
        }
      );
    })
  );

  // 13. Create Custom Agent Wizard Command
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.createCustomAgent', async () => {
      const root = getWorkspaceRoot();
      await runCustomAgentWizard(context.extensionPath, root, () => refreshAll());
    })
  );

  /**
   * Displays quick pick actions for managing a specific scheduled task.
   *
   * @param taskId - The ID of the task to manage.
   * @param root - Workspace root path.
   */
  async function showScheduledTaskActions(taskId: string, root: string) {
    const tasks = loadScheduledTasks(root);
    const t = tasks.find(x => x.id === taskId);
    if (!t) {
      vscode.window.showErrorMessage(`Scheduled task ${taskId} not found.`);
      return;
    }

    const timeStr = new Date(t.scheduledAt).toLocaleString();
    const actions: vscode.QuickPickItem[] = [];

    if (t.status === 'pending') {
      actions.push({
        label: '$(play) Run Task Now',
        description: 'Immediately deploy this scheduled task to Jules'
      });
      actions.push({
        label: '$(close) Cancel Scheduled Task',
        description: 'Mark this task as cancelled'
      });
    }

    actions.push({
      label: '$(trash) Delete Task',
      description: 'Remove this scheduled task permanently'
    });

    actions.push({
      label: '$(info) View Details',
      description: `Target Time: ${timeStr} | Agent: ${t.agent}`
    });

    const action = await vscode.window.showQuickPick(actions, {
      title: `Task ${t.id} (${t.status.toUpperCase()})`
    });
    if (!action) return;

    if (action.label.includes('Run Task Now')) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing scheduled Jules task (${t.agent})...`,
          cancellable: false
        },
        async () => {
          const res = await runScheduledTaskNow(t.id, root);
          if (res.success) {
            vscode.window.showInformationMessage(
              `🚀 Scheduled task deployed successfully!${res.sessionId ? ` (Session: ${res.sessionId})` : ''}`
            );
          } else {
            vscode.window.showErrorMessage(`Failed to deploy task: ${res.error || 'Unknown error'}`);
          }
          refreshAll();
        }
      );
    } else if (action.label.includes('Cancel Scheduled Task')) {
      cancelScheduledTask(t.id, root);
      vscode.window.showInformationMessage(`Scheduled task ${t.id} has been cancelled.`);
      refreshAll();
    } else if (action.label.includes('Delete Task')) {
      deleteScheduledTask(t.id, root);
      vscode.window.showInformationMessage(`Scheduled task ${t.id} deleted.`);
      refreshAll();
    } else if (action.label.includes('View Details')) {
      vscode.window.showInformationMessage(
        `Task Details:\n\nPrompt: ${t.task}\nAgent: ${t.agent}\nScheduled At: ${timeStr}\nStatus: ${t.status}${t.sessionId ? `\nSession: ${t.sessionId}` : ''}`
      );
    }
  }

  // 14. Scheduler Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('jules.scheduleTask', async () => {
      const root = getWorkspaceRoot();
      const taskPrompt = await vscode.window.showInputBox({
        title: 'Schedule a Task for Jules',
        prompt: 'Describe what you want Jules to accomplish',
        placeHolder: 'e.g. Refactor API error handling and write comprehensive tests'
      });
      if (!taskPrompt || !taskPrompt.trim()) return;

      const agent = (await vscode.window.showInputBox({
        title: 'Agent to Assign (Optional)',
        prompt: 'Agent name or specialization (leave blank for default)',
        value: 'default'
      })) || 'default';

      const scheduleChoice = await vscode.window.showQuickPick(
        [
          { label: '$(clock) In 15 minutes', minutes: 15 },
          { label: '$(clock) In 30 minutes', minutes: 30 },
          { label: '$(clock) In 1 hour', minutes: 60 },
          { label: '$(clock) In 2 hours', minutes: 120 },
          { label: '$(clock) Tonight at 23:00', special: 'tonight' },
          { label: '$(clock) Tomorrow morning at 09:00', special: 'tomorrow' },
          { label: '$(edit) Custom delay (minutes)', special: 'custom' }
        ],
        { title: 'Select Schedule Timing for Jules' }
      );
      if (!scheduleChoice) return;

      let delayMs = 15 * 60 * 1000;
      const now = new Date();

      if (scheduleChoice.minutes) {
        delayMs = scheduleChoice.minutes * 60 * 1000;
      } else if (scheduleChoice.special === 'tonight') {
        const target = new Date();
        target.setHours(23, 0, 0, 0);
        if (target.getTime() <= now.getTime()) {
          target.setDate(target.getDate() + 1);
        }
        delayMs = target.getTime() - now.getTime();
      } else if (scheduleChoice.special === 'tomorrow') {
        const target = new Date();
        target.setDate(target.getDate() + 1);
        target.setHours(9, 0, 0, 0);
        delayMs = target.getTime() - now.getTime();
      } else if (scheduleChoice.special === 'custom') {
        const val = await vscode.window.showInputBox({
          title: 'Enter Delay in Minutes',
          prompt: 'e.g. 45 for 45 minutes, or 180 for 3 hours',
          value: '30'
        });
        if (!val) return;
        const mins = parseInt(val, 10);
        if (isNaN(mins) || mins <= 0) {
          vscode.window.showErrorMessage('Invalid delay minutes entered.');
          return;
        }
        delayMs = mins * 60 * 1000;
      }

      const scheduledTime = new Date(Date.now() + delayMs);
      const scheduledIso = scheduledTime.toISOString();

      addScheduledTask(
        {
          agent: agent.trim(),
          mode: 'code',
          type: 'start',
          task: taskPrompt.trim(),
          scheduledAt: scheduledIso
        },
        root
      );

      vscode.window.showInformationMessage(
        `⏰ Jules task scheduled for ${scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}! Jules will run this autonomously.`
      );
      refreshAll();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jules.viewScheduledTasks', async () => {
      const root = getWorkspaceRoot();
      const tasks = loadScheduledTasks(root);
      if (tasks.length === 0) {
        const ans = await vscode.window.showInformationMessage(
          'No scheduled tasks currently configured.',
          'Schedule New Task'
        );
        if (ans === 'Schedule New Task') {
          vscode.commands.executeCommand('jules.scheduleTask');
        }
        return;
      }

      const items = tasks.map(t => {
        const timeStr = new Date(t.scheduledAt).toLocaleString();
        const statusIcon =
          t.status === 'pending'
            ? '$(clock)'
            : t.status === 'completed'
            ? '$(check)'
            : t.status === 'running'
            ? '$(sync~spin)'
            : '$(x)';
        return {
          label: `${statusIcon} ${t.agent}: ${t.task.slice(0, 40)}`,
          description: `[${t.status.toUpperCase()}] Due: ${timeStr}`,
          detail: `ID: ${t.id} | Task: ${t.task}`,
          taskId: t.id
        };
      });

      const selected = await vscode.window.showQuickPick(items, {
        title: 'Scheduled Jules Tasks',
        placeHolder: 'Select a task to manage or view details'
      });
      if (!selected) return;

      await showScheduledTaskActions(selected.taskId, root);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jules.viewScheduledTaskDetail', async (taskIdArg?: any) => {
      const root = getWorkspaceRoot();
      let taskId = typeof taskIdArg === 'string' ? taskIdArg : undefined;
      if (!taskId && taskIdArg && typeof taskIdArg.detailKey === 'string' && taskIdArg.detailKey.startsWith('sched-')) {
        taskId = taskIdArg.detailKey.replace('sched-', '');
      }
      if (!taskId) {
        vscode.commands.executeCommand('jules.viewScheduledTasks');
        return;
      }
      await showScheduledTaskActions(taskId, root);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jules.runScheduledTaskNow', async (item?: any) => {
      const root = getWorkspaceRoot();
      let taskId: string | undefined;
      if (typeof item === 'string') {
        taskId = item;
      } else if (item && typeof item.detailKey === 'string' && item.detailKey.startsWith('sched-')) {
        taskId = item.detailKey.replace('sched-', '');
      }
      if (!taskId) {
        const tasks = loadScheduledTasks(root).filter(t => t.status === 'pending');
        if (tasks.length === 0) {
          vscode.window.showInformationMessage('No pending scheduled tasks.');
          return;
        }
        const choice = await vscode.window.showQuickPick(
          tasks.map(t => ({ label: `${t.agent}: ${t.task.slice(0, 40)}`, id: t.id })),
          { title: 'Select Task to Run Now' }
        );
        if (!choice) return;
        taskId = choice.id;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Executing scheduled Jules task...`,
          cancellable: false
        },
        async () => {
          const res = await runScheduledTaskNow(taskId!, root);
          if (res.success) {
            vscode.window.showInformationMessage(
              `🚀 Scheduled task deployed!${res.sessionId ? ` (Session: ${res.sessionId})` : ''}`
            );
          } else {
            vscode.window.showErrorMessage(`Failed to run task: ${res.error || 'Unknown error'}`);
          }
          refreshAll();
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jules.cancelScheduledTask', async (item?: any) => {
      const root = getWorkspaceRoot();
      let taskId: string | undefined;
      if (typeof item === 'string') {
        taskId = item;
      } else if (item && typeof item.detailKey === 'string' && item.detailKey.startsWith('sched-')) {
        taskId = item.detailKey.replace('sched-', '');
      }
      if (!taskId) {
        const tasks = loadScheduledTasks(root).filter(t => t.status === 'pending');
        if (tasks.length === 0) {
          vscode.window.showInformationMessage('No pending scheduled tasks.');
          return;
        }
        const choice = await vscode.window.showQuickPick(
          tasks.map(t => ({ label: `${t.agent}: ${t.task.slice(0, 40)}`, id: t.id })),
          { title: 'Select Task to Cancel' }
        );
        if (!choice) return;
        taskId = choice.id;
      }

      const ok = cancelScheduledTask(taskId, root);
      if (ok) {
        vscode.window.showInformationMessage(`Scheduled task cancelled.`);
      } else {
        vscode.window.showWarningMessage(`Could not cancel scheduled task (already completed or not found).`);
      }
      refreshAll();
    })
  );

  // File watcher to auto-refresh UI when .jules state files change
  const watcher = vscode.workspace.createFileSystemWatcher('**/.jules*/**/*.{json}');
  watcher.onDidChange(() => refreshAll());
  watcher.onDidCreate(() => refreshAll());
  watcher.onDidDelete(() => refreshAll());
  context.subscriptions.push(watcher);
  JulesStatusBar.getInstance().update(loadSessions(getWorkspaceRoot()));
}

/**
 * Extension deactivation cleanup hook.
 */
export function deactivate(): void {
  if (liveSyncManager) {
    liveSyncManager.stop();
  }
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (liveSyncBarItem) {
    liveSyncBarItem.dispose();
  }
  JulesStatusBar.getInstance().dispose();
  JulesActivityChannel.getInstance().dispose();
}
