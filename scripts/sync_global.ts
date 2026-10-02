/**
 * Global IDE skill and MCP schema synchronizer.
 * @module sync_global
 * @description Automatically synchronizes local workspace build artifacts, scripts,
 * references, and MCP tool JSON schemas into the global IDE skill directory
 * (~/.gemini/skills/jules-companion and ~/.gemini/config/skills/jules-companion),
 * the workspace skill directory (.agents/skills/jules-companion),
 * and the MCP schema repository (~/.gemini/antigravity-ide/mcp/jules-companion).
 * This ensures that local developments immediately reflect across the entire IDE without version drift.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getAllTools } from './mcp/registry';

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

  // 1. Target skill directories for multi-path Antigravity discovery
  const targetSkillDirs = [
    globalSkillDir,
    path.join(homeDir, '.gemini', 'skills', 'jules-companion'),
    path.join(targetWorkspaceDir, '.agents', 'skills', 'jules-companion')
  ];

  for (const skillDir of targetSkillDirs) {
    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const isSelf = path.resolve(targetWorkspaceDir).toLowerCase() === path.resolve(skillDir).toLowerCase();
    if (!isSelf) {
      // Sync dist directory
      const localDist = path.join(targetWorkspaceDir, 'dist');
      const destDist = path.join(skillDir, 'dist');
      if (fs.existsSync(localDist)) {
        fs.cpSync(localDist, destDist, { recursive: true });
        syncedFilesCount += fs.readdirSync(localDist).length;
      }

      // Sync scripts directory
      const localScripts = path.join(targetWorkspaceDir, 'scripts');
      const destScripts = path.join(skillDir, 'scripts');
      if (fs.existsSync(localScripts)) {
        fs.cpSync(localScripts, destScripts, { recursive: true });
        syncedFilesCount += fs.readdirSync(localScripts).length;
      }

      // Sync references directory
      const localRef = path.join(targetWorkspaceDir, 'references');
      const destRef = path.join(skillDir, 'references');
      if (fs.existsSync(localRef)) {
        fs.cpSync(localRef, destRef, { recursive: true });
      }

      // Sync key root configuration & documentation files
      const rootFiles = ['SKILL.md', 'README.md', 'README.id.md', 'package.json', 'AGENT.md', 'NOTE.md'];
      for (const rf of rootFiles) {
        const src = path.join(targetWorkspaceDir, rf);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(skillDir, rf));
          syncedFilesCount++;
        }
      }

      // Purge obsolete residue if present
      const obsoleteResidues = ['.ignore'];
      for (const ob of obsoleteResidues) {
        const obPath = path.join(skillDir, ob);
        if (fs.existsSync(obPath)) {
          try { fs.unlinkSync(obPath); } catch (_) {}
        }
      }
    }
  }

  // 2. Sync all specialized jules-* skills from workspace .agents/skills to global skills
  const workspaceSkillsDir = path.join(targetWorkspaceDir, '.agents', 'skills');
  if (fs.existsSync(workspaceSkillsDir)) {
    const skillEntries = fs.readdirSync(workspaceSkillsDir, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (entry.isDirectory() && entry.name.startsWith('jules-')) {
        const srcDir = path.join(workspaceSkillsDir, entry.name);
        const destConfig = path.join(homeDir, '.gemini', 'config', 'skills', entry.name);
        const destUser = path.join(homeDir, '.gemini', 'skills', entry.name);
        for (const dest of [destConfig, destUser]) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          fs.cpSync(srcDir, dest, { recursive: true });
        }
      }
    }
  }

  // 3. Sync slash commands to Antigravity global commands directories
  const localCommands = path.join(targetWorkspaceDir, 'commands');
  if (fs.existsSync(localCommands)) {
    const geminiCmdDirs = [
      path.join(homeDir, '.gemini', 'commands'),
      path.join(homeDir, '.gemini', 'config', 'commands')
    ];
    for (const cmdDir of geminiCmdDirs) {
      if (!fs.existsSync(cmdDir)) {
        fs.mkdirSync(cmdDir, { recursive: true });
      }
      for (const file of fs.readdirSync(localCommands)) {
        if (file.endsWith('.md')) {
          fs.copyFileSync(path.join(localCommands, file), path.join(cmdDir, file));
          syncedFilesCount++;
        }
      }
    }
  }

  // 4. Export 20 MCP Tool JSON Schemas to IDE directory
  if (!fs.existsSync(globalMcpDir)) {
    fs.mkdirSync(globalMcpDir, { recursive: true });
  }

  for (const tool of getAllTools()) {
    const schemaFile = path.join(globalMcpDir, `${tool.name}.json`);
    fs.writeFileSync(schemaFile, JSON.stringify({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }, null, 2), 'utf8');
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
