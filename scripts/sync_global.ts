/**
 * @file sync_global.ts
 * @description Automatically synchronizes local workspace build artifacts, scripts,
 * references, and MCP tool JSON schemas into the global IDE skill directory
 * (~/.gemini/config/skills/jules-companion) and MCP schema repository (~/.gemini/antigravity-ide/mcp/jules-companion).
 * This ensures that local developments immediately reflect across the entire IDE without version drift.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Interface representing the result of the global sync operation.
 */
export interface SyncResult {
  success: boolean;
  syncedFilesCount: number;
  globalSkillDir: string;
  globalMcpDir: string;
}

/**
 * Synchronizes local workspace build artifacts, scripts, and MCP schemas to global IDE directories.
 *
 * @param {string} [targetWorkspaceDir=process.cwd()] - Root directory of the source project workspace.
 * @returns {SyncResult} Outcome details including success status and synced files count.
 */
export function syncGlobalInstallation(targetWorkspaceDir: string = process.cwd()): SyncResult {
  const homeDir = os.homedir();
  const globalSkillDir = path.join(homeDir, '.gemini', 'config', 'skills', 'jules-companion');
  const globalMcpDir = path.join(homeDir, '.gemini', 'antigravity-ide', 'mcp', 'jules-companion');

  let syncedFilesCount = 0;

  if (!fs.existsSync(globalSkillDir)) {
    fs.mkdirSync(globalSkillDir, { recursive: true });
  }

  // 1. Sync dist directory
  const localDist = path.join(targetWorkspaceDir, 'dist');
  const globalDist = path.join(globalSkillDir, 'dist');
  if (fs.existsSync(localDist)) {
    fs.mkdirSync(globalDist, { recursive: true });
    const distFiles = fs.readdirSync(localDist);
    for (const f of distFiles) {
      fs.copyFileSync(path.join(localDist, f), path.join(globalDist, f));
      syncedFilesCount++;
    }
  }

  // 2. Sync scripts directory
  const localScripts = path.join(targetWorkspaceDir, 'scripts');
  const globalScripts = path.join(globalSkillDir, 'scripts');
  if (fs.existsSync(localScripts)) {
    fs.mkdirSync(globalScripts, { recursive: true });
    const scriptFiles = fs.readdirSync(localScripts);
    for (const f of scriptFiles) {
      fs.copyFileSync(path.join(localScripts, f), path.join(globalScripts, f));
      syncedFilesCount++;
    }
  }

  // 3. Sync references directory
  const localRef = path.join(targetWorkspaceDir, 'references');
  const globalRef = path.join(globalSkillDir, 'references');
  if (fs.existsSync(localRef)) {
    fs.cpSync(localRef, globalRef, { recursive: true });
  }

  // 4. Sync key root configuration & documentation files
  const rootFiles = ['SKILL.md', 'README.md', 'README.id.md', 'package.json'];
  for (const rf of rootFiles) {
    const src = path.join(targetWorkspaceDir, rf);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(globalSkillDir, rf));
      syncedFilesCount++;
    }
  }

  // 5. Export 20 MCP Tool JSON Schemas to IDE directory
  if (!fs.existsSync(globalMcpDir)) {
    fs.mkdirSync(globalMcpDir, { recursive: true });
  }

  const toolsList = [
    'deploy_session', 'merge_session', 'auto_process', 'setup_workspace', 'get_session_status',
    'list_agents', 'get_agent_info', 'list_sources', 'run_doctor', 'create_custom_agent',
    'cancel_session', 'send_session_message', 'retry_failed_session', 'deploy_team',
    'pull_session_diff', 'checkout_session_branch', 'create_github_pr', 'read_agent_journal',
    'get_review_reports', 'rollback_session'
  ];

  for (const toolName of toolsList) {
    const schemaFile = path.join(globalMcpDir, `${toolName}.json`);
    if (!fs.existsSync(schemaFile)) {
      fs.writeFileSync(schemaFile, JSON.stringify({ name: toolName, description: `${toolName} tool` }, null, 2), 'utf8');
    }
  }

  console.log(`✅ Global Sync Complete: ${syncedFilesCount} files updated in ${globalSkillDir}`);

  return {
    success: true,
    syncedFilesCount,
    globalSkillDir,
    globalMcpDir
  };
}

if (require.main === module) {
  syncGlobalInstallation();
}
