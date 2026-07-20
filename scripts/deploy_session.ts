import * as fs from 'fs';
import * as path from 'path';
import { request, getApiKey, JulesSource } from './jules_client';
import { parseArgs, getProjectDirs, loadSessions, saveSessions, runGit, SessionRecord } from './utils';

function getCurrentBranch(): string {
  const res = runGit(['branch', '--show-current']);
  return res.success && res.stdout ? res.stdout : 'main';
}

function getGitRemoteRepo(): string | null {
  const res = runGit(['config', '--get', 'remote.origin.url']);
  if (!res.success) return null;
  const url = res.stdout;
  const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }
  return null;
}

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

    for (const agent of agentList) {
      console.log(`\nPreparing deployment for agent: ${agent} (Mode: ${mode.toUpperCase()})...`);

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

      // Structured Prompt Fusion: Agent Role System Template + Custom User Task Request + Mode Directive
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

      console.log(`Sending session request to Google REST API...`);
      const sessionResult = await request('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers
      }, payload);

      const sessionId = sessionResult.id || (sessionResult.name ? sessionResult.name.split('/').pop() : 'UNKNOWN');
      console.log(`Session deployed successfully! Session ID: ${sessionId} (Mode: ${mode})`);

      localSessions.push({
        id: sessionId,
        agent,
        mode,
        task: String(params.task),
        status: 'launched',
        timestamp: new Date().toISOString()
      });
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
