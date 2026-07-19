import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { request, getApiKey, JulesSource } from './jules_client';

function parseArgs(args: string[]): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        params[key] = value;
        i++;
      } else {
        params[key] = true;
      }
    }
  }
  return params;
}

function getCurrentBranch(): string {
  const res = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
  return res.status === 0 && res.stdout.trim() ? res.stdout.trim() : 'main';
}

function getGitRemoteRepo(): string | null {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = res.stdout.trim();
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
    const invalidAgents = inputAgents.filter(a => !registry.agents[a]);
    return invalidAgents;
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
  node dist/deploy_session.js --type <interactive|review|start> --agents <agent1,agent2> --task "<task description>" [--branch <branch>]

Options:
  --type      Session type: 'interactive' (interactive plan), 'review' (require plan approval), 'start' (auto-approve plan and execute)
  --agents    Comma-separated list of agent names (e.g. bolt,sentinel)
  --task      Specific task instructions for the agents
  --branch    Repository branch to start from (defaults to current git branch)
`);
    process.exit(1);
  }

  // 1. Local Agent Name Validation
  const registryPath = path.join(__dirname, '..', 'references', 'agents', 'registry.json');
  const invalidAgents = validateAgents(String(params.agents), registryPath);
  if (invalidAgents.length > 0) {
    console.error(`Error: Invalid agent name(s) specified: ${invalidAgents.join(', ')}`);
    if (fs.existsSync(registryPath)) {
      try {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
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

    const sessionsPath = path.join(process.cwd(), '.jules-companion', 'sessions.json');
    let localSessions: any[] = [];
    if (fs.existsSync(sessionsPath)) {
      try {
        localSessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      } catch (e) {
        localSessions = [];
      }
    }
    if (!Array.isArray(localSessions)) localSessions = [];

    for (const agent of agentList) {
      console.log(`\nPreparing deployment for agent: ${agent}...`);

      const templatePaths = [
        path.join(process.cwd(), '.jules-companion', 'references', 'agents', `${agent}.md`),
        path.join(__dirname, '..', 'references', 'agents', `${agent}.md`)
      ];

      let templateContent = '';
      for (const tp of templatePaths) {
        if (fs.existsSync(tp)) {
          templateContent = fs.readFileSync(tp, 'utf8');
          break;
        }
      }

      const combinedPrompt = templateContent
        ? `${templateContent}\n\n---\n## Specific Task Requirements for this Session:\n${params.task}`
        : String(params.task);

      const payload = {
        prompt: combinedPrompt,
        title: `${agent}-session`,
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
      console.log(`Session deployed successfully! Session ID: ${sessionId}`);

      localSessions.push({
        id: sessionId,
        agent,
        task: params.task,
        status: 'launched',
        timestamp: new Date().toISOString()
      });
    }

    fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
    fs.writeFileSync(sessionsPath, JSON.stringify(localSessions, null, 2), 'utf8');
    console.log(`\nAll sessions registered in ${sessionsPath}`);

  } catch (error: any) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  deploySession();
}
