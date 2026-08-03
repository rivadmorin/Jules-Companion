import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey, JulesSource } from './jules_client';
import { parseArgs, getProjectDirs, loadSessions, saveSessions, runGit, SessionRecord } from './utils';

/**
 * Retrieves the name of the currently active Git branch.
 *
 * @returns {string} The name of the current branch, or 'main' if it cannot be determined.
 */
function getCurrentBranch(): string {
  const res = runGit(['branch', '--show-current']);
  return res.success && res.stdout ? res.stdout : 'main';
}

/**
 * Extracts the repository slug (owner/repo) from the configured Git remote 'origin' URL.
 *
 * @returns {string | null} The repository slug, or null if parsing fails or no remote exists.
 */
function getGitRemoteRepo(): string | null {
  const res = runGit(['config', '--get', 'remote.origin.url']);
  if (!res.success) return null;
  const url = res.stdout;
  // Match standard HTTPS and SSH github.com URLs to extract the owner (match[1]) and repo name (match[2]).
  const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
  if (match) {
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
    const inputAgents = agentsStr.split(',').map(a => a.trim().toLowerCase());
    return inputAgents.filter(a => !registry.agents[a]);
  } catch {
    return [];
  }
}

/**
 * Orchestrates the deployment of a new Jules session by preparing the environment,
 * matching local Git state with Jules cloud sources, formatting the appropriate agent prompt,
 * and executing the API request.
 *
 * This function operates entirely based on parsed CLI arguments (via process.argv).
 * It handles validation of agent names, verification of Git remote origins,
 * and concurrent API dispatching if multiple agents are requested.
 *
 * @returns {Promise<void>}
 * @throws Will exit the process (process.exit(1)) if critical validation fails (e.g., missing API key, missing git remote).
 */
export async function deploySession() {
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

  // Mode validation
  const modeStr = String(params.mode || 'code').toLowerCase();
  if (modeStr !== 'code' && modeStr !== 'review') {
    console.error(`Error: Invalid mode '${params.mode}'. Allowed modes are 'code' or 'review'.`);
    process.exit(1);
  }
  const mode = modeStr as 'code' | 'review';

  const dirs = getProjectDirs();
  const registryPath = path.join(dirs.agentsDir, 'registry.json');
  const fallbackRegistryPath = path.join(__dirname, '..', 'references', 'agents', 'registry.json');
  const activeRegistryPath = fs.existsSync(registryPath) ? registryPath : fallbackRegistryPath;

  // 1. Agent Name Validation
  const invalidAgents = validateAgents(String(params.agents), activeRegistryPath);
  if (invalidAgents.length > 0) {
    console.error(`Error: Invalid agent name(s) specified: ${invalidAgents.join(', ')}`);
    if (fs.existsSync(activeRegistryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(activeRegistryPath, 'utf8'));
        console.log('Available valid agents:', Object.keys(registry.agents).join(', '));
      } catch (_) {}
    }
    process.exit(1);
  }

  // 2. Git Remote Check
  const gitRepo = getGitRemoteRepo();
  if (!gitRepo) {
    console.error('Error: No git remote origin url configured.');
    console.error('Jules-Companion requires that this repository is pushed to GitHub before deploying cloud sessions.');
    process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: JULES_API_KEY not found in environment or .env file.');
    process.exit(1);
  }

  const headers = { 'X-Goog-Api-Key': apiKey };
  const startingBranch = String(params.branch || getCurrentBranch());

  try {
    console.log(`Matching repository '${gitRepo}' with Jules sources...`);
    const sourcesData = await request('https://jules.googleapis.com/v1alpha/sources', { headers });
    const sources: JulesSource[] = sourcesData.sources || [];

    let matchedSource: JulesSource | null = null;
    // Search for a Jules Cloud source that includes the local Git repository's slug (owner/repo).
    // This mapping is crucial because Jules API expects a predefined cloud source ID (e.g., github.com/user/repo)
    // rather than just arbitrary local paths, ensuring the cloud agent has access to the correct remote codebase.
    const searchStr = gitRepo.toLowerCase();
    matchedSource = sources.find(s => s.name.toLowerCase().includes(searchStr)) || null;

    if (!matchedSource && sources.length > 0) {
      matchedSource = sources[0];
      console.warn(`Warning: Exact origin '${gitRepo}' not matched. Falling back to source: ${matchedSource.name}`);
    }

    if (!matchedSource) {
      console.error(`Error: Could not find any Jules source for repository: ${gitRepo}`);
      console.log('Available sources:');
      sources.forEach(s => console.log(` - ${s.name}`));
      process.exit(1);
    }

    const sourceName = matchedSource.name;
    console.log(`Using source: ${sourceName}`);

    const typeStr = String(params.type).toLowerCase();
    const requirePlanApproval = typeStr === 'review' || typeStr === 'interactive';
    const agentList = String(params.agents).split(',').map(a => a.trim().toLowerCase());

    const localSessions = loadSessions();
    const today = new Date().toISOString().split('T')[0];
    const taskSlug = params.task ? String(params.task).slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'task';

    // We use Promise.all to concurrently deploy multiple specialized agents for the same task.
    // This dramatically speeds up orchestration compared to sequential deployments,
    // especially when spinning up teams (e.g., --agents=bolt,sentinel,annotator).
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

      const reviewFileName = `docs/jules-reviews/${today}-${agent}-${taskSlug}.md`;
      const modeDirective = mode === 'review'
        ? `⚠️ MODE STRICT DIRECTIVE: REVIEW-ONLY MODE\nYou are operating in REVIEW-ONLY mode.\n1. DO NOT modify, edit, or delete any application code files (.ts, .js, .py, .go, .rs, .json, etc.).\n2. Write ALL your findings, analysis, code snippets, and refactoring recommendations exclusively into a single Markdown file located at:\n   \`${reviewFileName}\`\n3. Provide clear line numbers, problem descriptions, and proposed code fixes inside the Markdown document so the main agent can review them.`
        : `⚠️ MODE DIRECTIVE: CODE IMPLEMENTATION MODE\nYou are operating in CODE mode. Perform direct code implementation and modifications as required.`;

      const combinedPrompt = `# AGENT SYSTEM & ROLE DIRECTIVES\n${templateContent}\n\n---\n# USER TASK & SPECIFIC REQUIREMENTS\n${params.task}\n\n---\n# EXECUTION MODE DIRECTIVE\n${modeDirective}`;

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
          task: String(params.task),
          status: 'launched',
          timestamp: new Date().toISOString()
        }
      };
    });

    const results = await Promise.all(deployPromises);

    for (const res of results) {
      console.log(res.output);
      localSessions.push(res.sessionRecord);
    }

    saveSessions(localSessions);
    console.log(`\nAll sessions registered in .jules-companion/sessions.json`);

  } catch (error: any) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  deploySession();
}
