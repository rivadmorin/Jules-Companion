#!/usr/bin/env node
/**
 * deploy_session.js
 * Automate session deployment combining agent templates and user instructions via REST API.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { request, headers, getSessions } = require('./jules_client');

const args = process.argv.slice(2);

// Simple argument parser
const params = {};
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

if (!params.agents || !params.task || !params.type) {
  console.log(`
Jules Session Deployment Helper

Usage:
  node deploy_session.js --type <interactive|review|start> --agents <agent1,agent2> --task "<task description>" [--branch <branch>]

Options:
  --type      Interactive (interactive plan), review (require plan approval), start (auto-approve)
  --agents    Comma-separated list of agent names (e.g. bolt,watcher)
  --task      Specific task instructions for the agents
  --branch    Repository branch to start from (defaults to current git branch)
`);
  process.exit(1);
}

// Get current git branch
function getCurrentBranch() {
  const res = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim() : 'main';
}

// Get current git origin owner/repo to match source
function getGitRemoteRepo() {
  const res = spawnSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const url = res.stdout.trim();
  // Match git@github.com:owner/repo.git or https://github.com/owner/repo.git
  const match = url.match(/github\.com[/:]([^/]+)\/([^.]+)/);
  if (match) {
    return `${match[1]}/${match[2]}`.replace(/\.git$/, '');
  }
  return null;
}

const startingBranch = params.branch || getCurrentBranch();
const gitRepo = getGitRemoteRepo();

async function main() {
  try {
    // 1. Fetch sources from REST API to match our git repo
    console.log("Matching repository with Jules sources...");
    const sourcesData = await request('https://jules.googleapis.com/v1alpha/sources', { headers });
    const sources = sourcesData.sources || [];
    
    let matchedSource = null;
    if (gitRepo) {
      const searchStr = gitRepo.toLowerCase();
      matchedSource = sources.find(s => s.name.toLowerCase().includes(searchStr));
    }
    
    if (!matchedSource) {
      console.error(`Error: Could not find a matched Jules source for repository: ${gitRepo}`);
      console.log("Available sources:");
      sources.forEach(s => console.log(` - ${s.name}`));
      process.exit(1);
    }
    
    const sourceName = matchedSource.name;
    console.log(`Matched source: ${sourceName}`);
    
    // 2. Resolve deployment type parameters
    const requirePlanApproval = params.type.toLowerCase() === 'review' || params.type.toLowerCase() === 'interactive';
    
    // 3. Process each agent
    const agentList = params.agents.split(',').map(a => a.trim().toLowerCase());
    
    // Read current sessions.json to append
    let localSessions = [];
    const sessionsPath = path.join(process.cwd(), '.jules-companion', 'sessions.json');
    if (fs.existsSync(sessionsPath)) {
      try {
        localSessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
      } catch (e) {
        localSessions = [];
      }
    }
    if (!Array.isArray(localSessions)) {
      localSessions = [];
    }

    for (const agent of agentList) {
      console.log(`\nPreparing deployment for agent: ${agent}...`);
      
      // Load agent template
      const templatePaths = [
        path.join(process.cwd(), '.jules-companion', 'references', 'agents', `${agent}.md`),
        path.join(__dirname, '..', 'references', 'agents', `${agent}.md`)
      ];
      
      let templateContent = "";
      for (const tp of templatePaths) {
        if (fs.existsSync(tp)) {
          templateContent = fs.readFileSync(tp, 'utf8');
          break;
        }
      }
      
      if (!templateContent) {
        console.warn(`Warning: Template for agent "${agent}" not found. Proceeding with raw task description.`);
      }
      
      // Combine template and specific task instructions
      const combinedPrompt = `${templateContent}\n\n---\n## Specific Task Requirements for this Session:\n${params.task}`;
      
      // Construct session request body
      const payload = {
        prompt: combinedPrompt,
        title: `${agent}-session`,
        sourceContext: {
          source: sourceName,
          githubRepoContext: {
            startingBranch: startingBranch
          }
        },
        requirePlanApproval: requirePlanApproval
      };
      
      console.log(`Deploying session to Google REST API...`);
      const sessionResult = await request('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers
      }, payload);
      
      const sessionId = sessionResult.id || sessionResult.name.split('/').pop();
      console.log(`Session successfully deployed! ID: ${sessionId}`);
      
      // Append to local sessions.json
      localSessions.push({
        id: sessionId,
        agent: agent,
        task: params.task,
        status: 'launched',
        timestamp: new Date().toISOString()
      });
    }
    
    // Save updated sessions.json
    fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
    fs.writeFileSync(sessionsPath, JSON.stringify(localSessions, null, 2), 'utf8');
    console.log(`\nAll sessions registered in ${sessionsPath}`);
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  }
}

main();
