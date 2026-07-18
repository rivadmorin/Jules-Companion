#!/usr/bin/env node
/**
 * merge_pipeline.js
 * Automated branch-based merge pipeline for completed Jules sessions.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { request, headers } = require('./jules_client');

function runGit(args, options = {}) {
  const res = spawnSync('git', args, { encoding: 'utf8', ...options });
  return { status: res.status, stdout: res.stdout.trim(), stderr: res.stderr.trim() };
}

const sessionsPath = path.join(process.cwd(), '.jules-companion', 'sessions.json');
if (!fs.existsSync(sessionsPath)) {
  console.error(`Error: sessions.json not found at ${sessionsPath}`);
  process.exit(1);
}

let sessions = [];
try {
  sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
} catch (e) {
  console.error("Error reading sessions.json:", e.message);
  process.exit(1);
}

if (!Array.isArray(sessions)) {
  // Try mapping object layout to array
  sessions = Object.entries(sessions.sessions || sessions).map(([name, id]) => ({
    id,
    agent: name,
    status: 'launched'
  }));
}

async function getSessionState(id) {
  const url = `https://jules.googleapis.com/v1alpha/sessions/${id}`;
  const data = await request(url, { headers });
  return data.state;
}

async function getSessionPatch(id) {
  const url = `https://jules.googleapis.com/v1alpha/sessions/${id}/activities`;
  const data = await request(url, { headers });
  const activities = data.activities || [];
  
  for (const act of activities) {
    if (act.artifacts) {
      for (const art of act.artifacts) {
        if (art.changeSet && art.changeSet.gitPatch && art.changeSet.gitPatch.unidiffPatch) {
          return art.changeSet.gitPatch.unidiffPatch;
        }
      }
    }
  }
  return null;
}

async function main() {
  console.log("=== STARTING CONSOLIDATED MERGE PIPELINE ===");
  
  // 1. Ensure working directory is clean
  const statusCheck = runGit(['status', '--porcelain']);
  if (statusCheck.stdout) {
    console.error("Error: Git working directory is not clean. Commit or stash changes first.");
    console.log(statusCheck.stdout);
    process.exit(1);
  }
  
  // Ensure we have a jules-integration branch
  const branchCheck = runGit(['branch', '--list', 'jules-integration']);
  if (!branchCheck.stdout) {
    console.log("Creating branch jules-integration from main...");
    runGit(['checkout', 'main']);
    runGit(['checkout', '-b', 'jules-integration']);
  }
  
  let mergedCount = 0;
  
  for (const s of sessions) {
    if (s.status === 'merged') {
      console.log(`Session ${s.agent} (${s.id}) already merged. Skipping.`);
      continue;
    }
    
    console.log(`\nChecking remote status for session ${s.agent} (${s.id})...`);
    try {
      const state = await getSessionState(s.id);
      console.log(`State: ${state}`);
      
      if (state !== 'COMPLETED') {
        console.log(`Session is ${state}, not COMPLETED. Skipping merge.`);
        continue;
      }
      
      console.log(`Fetching patch for ${s.agent}...`);
      const patch = await getSessionPatch(s.id);
      if (!patch) {
        console.error(`Error: Could not retrieve patch for session ${s.id}`);
        continue;
      }
      
      const diffPath = path.join(process.cwd(), 'scratch', `${s.agent}_pull.diff`);
      fs.mkdirSync(path.dirname(diffPath), { recursive: true });
      fs.writeFileSync(diffPath, patch, 'utf8');
      console.log(`Wrote patch to ${diffPath}`);
      
      // Execute branch isolation merge strategy
      console.log(`Preparing branch-bolt style isolation branch for ${s.agent}...`);
      runGit(['checkout', 'main']);
      runGit(['branch', '-D', `branch-${s.agent}`]); // clean old
      
      const createBranch = runGit(['checkout', '-b', `branch-${s.agent}`]);
      if (createBranch.status !== 0) {
        console.error(`Failed to create branch- ${s.agent}`);
        continue;
      }
      
      console.log("Applying patch...");
      const applyPatch = runGit(['apply', diffPath]);
      if (applyPatch.status !== 0) {
        console.error(`Error applying patch: ${applyPatch.stderr}`);
        console.log("Rolling back...");
        runGit(['checkout', 'main']);
        continue;
      }
      
      runGit(['add', '.']);
      runGit(['commit', '-m', `Apply ${s.agent} patch`]);
      console.log(`Committed patch on branch-${s.agent}`);
      
      // Checkout jules-integration and merge
      console.log("Merging into jules-integration...");
      runGit(['checkout', 'jules-integration']);
      const mergeRes = runGit(['merge', `branch-${s.agent}`, '--no-edit']);
      
      if (mergeRes.status !== 0) {
        console.warn(`\n⚠️ CONFLICT ENCOUNTERED merging branch-${s.agent} into jules-integration!`);
        console.warn("Please resolve conflicts manually using your IDE, then run git add & commit.");
        console.warn("Pipeline will stop here to allow conflict resolution.");
        s.status = 'conflict';
        fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
        process.exit(1);
      }
      
      console.log(`Successfully merged ${s.agent} patch.`);
      s.status = 'merged';
      mergedCount++;
      
    } catch (e) {
      console.error(`Error processing ${s.agent} (${s.id}): ${e.message}`);
    }
  }
  
  // Save updated session statuses
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');
  
  if (mergedCount > 0) {
    console.log("\nRunning validation check (cargo check)...");
    const checkRes = spawnSync('cargo', ['check'], { stdio: 'inherit' });
    if (checkRes.status !== 0) {
      console.warn("⚠️ Cargo check failed! Code has compilation errors.");
    } else {
      console.log("cargo check passed. Running unit tests...");
      spawnSync('cargo', ['test'], { stdio: 'inherit' });
    }
  }
  
  console.log("\n=== MERGE PIPELINE COMPLETE ===");
}

main();
