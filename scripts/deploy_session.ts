/**
 * Jules session deployment, prompt fusion, and orchestration engine.
 * @module deploy_session
 */

import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey, JulesSource } from './jules_client';
import { parseArgs, getProjectDirs, runGit, loadSessions, saveSessions, getFormattedDateDDMMYYYY } from './utils';

/**
 * Determines the currently active local Git branch name by executing a child process.
 * This is used to ensure the Jules cloud agent operates within the correct branch context matching the user's local state.
 *
 * @param {string} [targetDir] - Optional directory path to execute the git command within. Defaults to the current working directory if omitted.
 * @returns {string} The name of the current branch, or a safe fallback to 'main' if parsing fails or the command exits with an error.
 */
function getCurrentBranch(targetDir?: string): string {
  // Execute the standard git CLI command to retrieve the current branch name
  const res = runGit(['branch', '--show-current'], targetDir);
  // Verify successful execution and non-empty output to prevent assigning undefined or empty strings; fallback to 'main'
  return res.success && res.stdout ? res.stdout : 'main';
}

/**
 * Parses the Git remote origin URL to extract the `owner/repository` slug.
 * This is critical for matching local repositories to their corresponding Jules Cloud sources.
 *
 * @returns {string | null} The repository slug (e.g., 'rivadmorin/Jules-Companion') or null if parsing fails or no remote exists.
 */
function getGitRemoteRepo(targetDir?: string): string | null {
  const res = runGit(['config', '--get', 'remote.origin.url'], targetDir);
  if (!res.success) return null;
  const url = res.stdout;

  // Match standard HTTPS and SSH github.com URLs to extract the owner (match[1]) and repo name (match[2]).
  // Captures both git@github.com:owner/repo.git and https://github.com/owner/repo.git forms.
  const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
  if (match) {
    // Return clean slug stripped of trailing .git
    return `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }
  return null;
}

/**
 * Validates a comma-separated list of agent names against the known agents registry.
 *
 * @param {string} agentsStr - A comma-separated string of agent names provided by the user.
 * @param {string} registryPath - The file path to the `registry.json` file.
 * @returns {string[]} An array of invalid agent names found in the input string.
 */
function validateAgents(agentsStr: string, registryPath: string): string[] {
  if (!fs.existsSync(registryPath)) return [];
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    // Normalize input to lowercase for case-insensitive matching
    const inputAgents = agentsStr.split(',').map(a => a.trim().toLowerCase());
    // Filter out names that do not exist as keys in the registry
    return inputAgents.filter(a => !registry.agents[a]);
  } catch {
    return [];
  }
}

/**
 * Options for deploying a Jules session.
 */
export interface DeploySessionOptions {
  type: 'interactive' | 'review' | 'start';
  agents: string;
  task: string;
  mode?: 'code' | 'review';
  branch?: string;
  targetDir?: string;
}

/**
 * Result of deploying a Jules session.
 */
export interface DeploySessionResult {
  success: boolean;
  output: string;
  sessions?: any[];
  error?: string;
}

/**
 * Core programmatic deployment function for Jules sessions.
 *
 * @param options - Deployment configuration parameters.
 * @returns Object indicating success status, output logs, and session records.
 */
export async function deploySessionCore(options: DeploySessionOptions): Promise<DeploySessionResult> {
  const modeStr = String(options.mode || 'code').toLowerCase();
  if (modeStr !== 'code' && modeStr !== 'review') {
    return {
      success: false,
      output: '',
      error: `Invalid mode '${options.mode}'. Allowed modes are 'code' or 'review'.`
    };
  }
  const mode = modeStr as 'code' | 'review';

  const targetDir = options.targetDir ? String(options.targetDir) : process.cwd();
  const dirs = getProjectDirs(targetDir);

  const registryPath = path.join(dirs.agentsDir, 'registry.json');
  const fallbackRegistryPath = path.join(__dirname, '..', 'references', 'agents', 'registry.json');
  const activeRegistryPath = fs.existsSync(registryPath) ? registryPath : fallbackRegistryPath;

  // 1. Agent Name Validation
  const invalidAgents = validateAgents(String(options.agents), activeRegistryPath);
  if (invalidAgents.length > 0) {
    let errorMsg = `Invalid agent name(s) specified: ${invalidAgents.join(', ')}`;
    if (fs.existsSync(activeRegistryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(activeRegistryPath, 'utf8'));
        errorMsg += `\nAvailable valid agents: ${Object.keys(registry.agents).join(', ')}`;
      } catch (_) {}
    }
    return { success: false, output: '', error: errorMsg };
  }

  // 2. Git Remote Check
  const gitRepo = getGitRemoteRepo(targetDir);
  if (!gitRepo) {
    return {
      success: false,
      output: '',
      error: 'No git remote origin url configured.\nJules-Companion requires that this repository is pushed to GitHub before deploying cloud sessions.'
    };
  }

  const apiKey = getApiKey(targetDir);
  if (!apiKey) {
    return {
      success: false,
      output: '',
      error: 'JULES_API_KEY not found in environment or .env file.'
    };
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  const startingBranch = String(options.branch || getCurrentBranch(targetDir));
  const outputLogs: string[] = [];

  try {
    outputLogs.push(`Matching repository '${gitRepo}' with Jules sources...`);
    const sourcesData = await request('https://jules.googleapis.com/v1alpha/sources', { headers });
    const sources: JulesSource[] = sourcesData.sources || [];

    let matchedSource: JulesSource | null = null;
    const searchStr = gitRepo.toLowerCase();
    matchedSource = sources.find(s => s.name.toLowerCase().includes(searchStr)) || null;

    if (!matchedSource && sources.length > 0) {
      matchedSource = sources[0];
      outputLogs.push(`Warning: Exact origin '${gitRepo}' not matched. Falling back to source: ${matchedSource.name}`);
    }

    if (!matchedSource) {
      let err = `Could not find any Jules source for repository: ${gitRepo}\nAvailable sources:`;
      sources.forEach(s => err += `\n - ${s.name}`);
      return { success: false, output: outputLogs.join('\n'), error: err };
    }

    const sourceName = matchedSource.name;
    outputLogs.push(`Using source: ${sourceName}`);

    const typeStr = String(options.type).toLowerCase();
    const requirePlanApproval = typeStr === 'review' || typeStr === 'interactive';
    const agentList = String(options.agents).split(',').map(a => a.trim().toLowerCase());

    const localSessions = loadSessions(targetDir);
    const today = new Date().toISOString().split('T')[0];
    const taskSlug = options.task ? String(options.task).slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'task';

    const deployPromises = agentList.map(async (agent) => {
      let outputBuffer = `\nPreparing deployment for agent: ${agent} (Mode: ${mode.toUpperCase()})...\n`;

      const templatePaths = [
        path.join(dirs.agentsDir, `${agent}.md`),
        path.join(__dirname, '..', 'references', 'agents', `${agent}.md`)
      ];

      let templateContent = '';
      for (const tp of templatePaths) {
        if (fs.existsSync(tp)) {
          templateContent = fs.readFileSync(tp, 'utf8');
          break;
        }
      }

      const currentDateDDMMYYYY = getFormattedDateDDMMYYYY();

      const dateAndJournalDirective = `⚠️ DATE & JOURNAL STRICT DIRECTIVES:
1. CURRENT SESSION DATE: ${currentDateDDMMYYYY} (Format: DD-MM-YYYY).
2. Target Journal File: .jules/${agent}.md
3. Format entry header strictly as: ## ${currentDateDDMMYYYY} - [Title]
4. ALWAYS APPEND new entries to the end of .jules/${agent}.md. NEVER overwrite, clear, or delete existing entries.
5. NEVER invent or hallucinate past dates. Use strictly '${currentDateDDMMYYYY}'.`;

      const reviewFileName = `docs/jules-reviews/${today}-${agent}-${taskSlug}.md`;

      const modeDirective = mode === 'review'
        ? `⚠️ MODE STRICT DIRECTIVE: REVIEW-ONLY MODE\nYou are operating in REVIEW-ONLY mode.\n1. DO NOT modify, edit, or delete any application code files (.ts, .js, .py, .go, .rs, .json, etc.).\n2. Write ALL your findings, analysis, code snippets, and refactoring recommendations exclusively into a single Markdown file located at:\n   \`${reviewFileName}\`\n3. Provide clear line numbers, problem descriptions, and proposed code fixes inside the Markdown document so the main agent can review them.`
        : `⚠️ MODE DIRECTIVE: CODE IMPLEMENTATION MODE\nYou are operating in CODE mode. Perform direct code implementation and modifications as required.`;

      const combinedPrompt = `# AGENT SYSTEM & ROLE DIRECTIVES\n${templateContent}\n\n---\n# DATE & JOURNAL DIRECTIVES\n${dateAndJournalDirective}\n\n---\n# USER TASK & SPECIFIC REQUIREMENTS\n${options.task}\n\n---\n# EXECUTION MODE DIRECTIVE\n${modeDirective}`;

      const payload = {
        prompt: combinedPrompt,
        title: `${agent}-session-${mode}`,
        sourceContext: {
          source: sourceName,
          githubRepoContext: {
            startingBranch
          }
        },
        requirePlanApproval
      };

      outputBuffer += `Sending session request to Google REST API...\n`;
      const sessionResult = await request('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers
      }, payload);

      const sessionId = sessionResult.id || (sessionResult.name ? sessionResult.name.split('/').pop() : 'UNKNOWN');
      outputBuffer += `Session deployed successfully! Session ID: ${sessionId} (Mode: ${mode})`;

      return {
        agent,
        output: outputBuffer,
        sessionRecord: {
          id: sessionId,
          agent,
          mode,
          task: String(options.task),
          status: 'launched',
          timestamp: new Date().toISOString()
        }
      };
    });

    const results = await Promise.all(deployPromises);

    for (const res of results) {
      outputLogs.push(res.output);
      localSessions.push(res.sessionRecord);
    }

    saveSessions(localSessions, targetDir);
    outputLogs.push(`\nAll sessions registered in .jules-companion/sessions.json`);

    return {
      success: true,
      output: outputLogs.join('\n'),
      sessions: results.map(r => r.sessionRecord)
    };

  } catch (error: any) {
    return {
      success: false,
      output: outputLogs.join('\n'),
      error: `Deployment failed: ${error.message}`
    };
  }
}

/**
 * Orchestrates the deployment of a new Jules session by preparing the environment,
 * matching local Git state with Jules cloud sources, formatting the appropriate agent prompt,
 * and executing the API request.
 *
 * @returns A promise that resolves when deployment is complete.
 */
export async function deploySession(): Promise<void> {
  const params = parseArgs(process.argv.slice(2));

  if (!params.agents || !params.task || !params.type) {
    console.log(`
Jules Session Deployment Helper (TypeScript)

Usage:
  node dist/deploy_session.js --type <interactive|review|start> --agents <agent1,agent2> --task "<task description>" [--mode <code|review>] [--branch <branch>]

Options:
  --type      Session type: 'interactive' (interactive plan), 'review' (require plan approval), 'start' (auto-approve plan and execute)
  --agents    Comma-separated list of agent names (e.g. bolt,sentinel)
  --task      Specific task instructions for the agents
  --mode      Execution mode: 'code' (direct code implementation, default) or 'review' (audit-only, writes report to docs/jules-reviews/)
  --branch    Repository branch to start from (defaults to current git branch)
`);
    process.exit(1);
  }

  const modeStr = String(params.mode || 'code').toLowerCase();
  if (modeStr !== 'code' && modeStr !== 'review') {
    console.error(`Error: Invalid mode '${params.mode}'. Allowed modes are 'code' or 'review'.`);
    process.exit(1);
  }

  const targetDir = params.target ? String(params.target) : process.cwd();
  const res = await deploySessionCore({
    type: params.type as any,
    agents: String(params.agents),
    task: String(params.task),
    mode: modeStr as any,
    branch: params.branch ? String(params.branch) : undefined,
    targetDir
  });

  if (res.output) {
    console.log(res.output);
  }
  if (!res.success) {
    console.error(`Error: ${res.error}`);
    process.exit(1);
  }
}

/**
 * Programmatically deploys a session for specified agents without relying on process.argv CLI inputs.
 * Used internally by the deploy_team MCP tool and integration scripts.
 *
 * @param agentsStr - Comma-separated list of agent identifiers.
 * @param task - Detailed task instructions for the agents.
 * @param type - Session execution type.
 * @param mode - Execution mode (code implementation vs review-only).
 * @param branch - Starting git branch name.
 * @param targetDir - Target project root directory.
 * @returns Result of the programmatic session deployment.
 */
export async function deploySessionWithAgents(
  agentsStr: string,
  task: string,
  type: 'start' | 'review' | 'interactive',
  mode: 'code' | 'review' = 'code',
  branch?: string,
  targetDir: string = process.cwd()
): Promise<DeploySessionResult> {
  return deploySessionCore({
    agents: agentsStr,
    task,
    type,
    mode,
    branch,
    targetDir
  });
}

if (require.main === module) {
  deploySession();
}
