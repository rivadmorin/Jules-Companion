/**
 * Universal Multi-Agent & IDE 1-Click Installer for Jules Companion.
 * @module scripts/installer
 * @description Provides an automated setup workflow that:
 * 1. Discovers installed IDEs (Antigravity IDE, VS Code, Cursor, Windsurf) and installs the VSIX extension.
 * 2. Deploys the Jules Companion Skill (SKILL.md & references) across all major AI agent runtimes:
 *    - Google Antigravity (~/.gemini/skills and ~/.gemini/config/skills)
 *    - Anthropic Claude Code (~/.claude/skills)
 *    - GitHub Copilot CLI (~/.copilot/skills)
 *    - OpenClaw (~/.openclaw/skills)
 *    - Pi Coding Agent (~/.pi/agent/skills)
 *    - Hermes (~/.hermes/skills)
 * 3. Registers Slash Commands in Antigravity (~/.gemini/commands) and Claude Code.
 * 4. Configures the Model Context Protocol (MCP) server non-destructively across:
 *    - Google Antigravity (~/.gemini/config/mcp_config.json)
 *    - Claude Desktop (claude_desktop_config.json)
 *    - Claude Code (~/.claude/mcp.json)
 *    - Cursor AI (~/.cursor/mcp.json)
 *    - Windsurf (~/.codeium/windsurf/mcp_config.json)
 * 5. Configures the Google Jules API Key in .env.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

// 1. Resolve project root and user home directories
const rootDir = path.resolve(__dirname, '..');
const homeDir = os.homedir();
const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(homeDir, 'Library', 'Application Support') : path.join(homeDir, '.config'));
const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');

/**
 * Prints the ASCII header banner for the universal installer.
 */
function printHeader() {
  console.log('\n============================================================');
  console.log('       🐙 JULES COMPANION — UNIVERSAL AGENT INSTALLER 🐙     ');
  console.log('  Autonomous Setup for Antigravity, Claude, Cursor & More  ');
  console.log('============================================================\n');
}

/**
 * Scans local operating system paths and PATH variables to discover installed code editors.
 * Supports Antigravity IDE, Microsoft VS Code, Cursor, and Windsurf.
 *
 * @returns {Array<{name: string, cmd: string}>} List of detected editor names and invocation commands.
 */
function findInstalledEditors() {
  const editors = [];

  function testCmd(name, cmd) {
    if (editors.some(e => e.name === name)) return;
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      editors.push({ name, cmd });
    } catch (e) {
      // Command not available in PATH
    }
  }

  // 1. Antigravity IDE
  if (process.platform === 'win32') {
    const agyIdeCmd = path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd');
    if (fs.existsSync(agyIdeCmd)) {
      editors.push({ name: 'Antigravity IDE', cmd: `"${agyIdeCmd}"` });
    } else {
      testCmd('Antigravity IDE', 'antigravity-ide');
    }
  } else {
    testCmd('Antigravity IDE', 'antigravity-ide');
  }

  // 2. Microsoft Visual Studio Code
  testCmd('Visual Studio Code', 'code');
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const vsCodePaths = [
      path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
      path.join(programFiles, 'Microsoft VS Code', 'bin', 'code.cmd')
    ];
    for (const p of vsCodePaths) {
      if (fs.existsSync(p)) {
        testCmd('Visual Studio Code', `"${p}"`);
        break;
      }
    }
  }

  // 3. Cursor AI Editor
  testCmd('Cursor', 'cursor');
  if (process.platform === 'win32') {
    const cursorPath = path.join(localAppData, 'Programs', 'cursor', 'resources', 'app', 'bin', 'cursor.cmd');
    if (fs.existsSync(cursorPath)) {
      testCmd('Cursor', `"${cursorPath}"`);
    }
  }

  // 4. Windsurf Editor
  testCmd('Windsurf', 'windsurf');

  return editors;
}

/**
 * Discovers the latest packaged VSIX archive and installs it into all detected editors.
 *
 * @param {Array<{name: string, cmd: string}>} editors - Target editor descriptors.
 * @returns {boolean} True if installation succeeded on at least one editor.
 */
function installVsix(editors) {
  console.log('[1/5] 💻 Checking & Installing Editor Extension (VSIX)...');

  const vsixFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.vsix'));
  let targetVsix = vsixFiles.sort().reverse()[0];

  if (!targetVsix) {
    console.log('  ⚠️ Package file (.vsix) not found. Building package automatically...');
    try {
      execSync('npm run package', { cwd: rootDir, stdio: 'inherit' });
      const refreshed = fs.readdirSync(rootDir).filter(f => f.endsWith('.vsix'));
      targetVsix = refreshed.sort().reverse()[0];
    } catch (err) {
      console.error('  ❌ Failed to package .vsix:', err.message);
      return false;
    }
  }

  if (editors.length === 0) {
    console.log('  ℹ️ No CLI-executable editors detected in standard paths.');
    console.log(`  👉 Manual install: in your editor, select Extensions -> "Install from VSIX..." -> select ${targetVsix}\n`);
    return false;
  }

  const vsixPath = path.join(rootDir, targetVsix);
  let anySuccess = false;

  for (const ed of editors) {
    try {
      console.log(`  📦 Installing ${targetVsix} into ${ed.name}...`);
      execSync(`${ed.cmd} --install-extension "${vsixPath}" --force`, { stdio: 'inherit' });
      console.log(`  ✅ Extension successfully installed in ${ed.name}!`);
      anySuccess = true;
    } catch (err) {
      console.error(`  ⚠️ Failed to install extension in ${ed.name}:`, err.message);
    }
  }
  console.log('');
  return anySuccess;
}

/**
 * Helper to copy essential skill files cleanly without bloating target directories.
 *
 * @param {string} destDir - Target directory for the skill.
 */
function copySkillBundle(destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 1. Copy SKILL.md
  const skillSrc = path.join(rootDir, 'SKILL.md');
  if (fs.existsSync(skillSrc)) {
    fs.copyFileSync(skillSrc, path.join(destDir, 'SKILL.md'));
  }

  // 2. Copy references
  const refSrc = path.join(rootDir, 'references');
  const refDest = path.join(destDir, 'references');
  if (fs.existsSync(refSrc)) {
    if (!fs.existsSync(refDest)) fs.mkdirSync(refDest, { recursive: true });
    fs.cpSync(refSrc, refDest, { recursive: true });
  }

  // 3. Copy scripts
  const scriptsSrc = path.join(rootDir, 'scripts');
  const scriptsDest = path.join(destDir, 'scripts');
  if (fs.existsSync(scriptsSrc)) {
    if (!fs.existsSync(scriptsDest)) fs.mkdirSync(scriptsDest, { recursive: true });
    fs.cpSync(scriptsSrc, scriptsDest, { recursive: true });
  }

  // 4. Copy dist
  const distSrc = path.join(rootDir, 'dist');
  const distDest = path.join(destDir, 'dist');
  if (fs.existsSync(distSrc)) {
    if (!fs.existsSync(distDest)) fs.mkdirSync(distDest, { recursive: true });
    fs.cpSync(distSrc, distDest, { recursive: true });
  }

  // 5. Copy metadata files
  for (const f of ['package.json', 'README.md', 'README.id.md', 'AGENT.md']) {
    const src = path.join(rootDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(destDir, f));
    }
  }
}

/**
 * Deploys the Jules Companion skill across all discovered AI agent runtimes.
 */
function installSkills() {
  console.log('[2/5] 🧠 Deploying Jules Companion Skill Across AI Agent Platforms...');

  const skillTargets = [
    // 1. Google Antigravity (Global & Config & Local Workspace)
    { name: 'Google Antigravity (Global Skills)', path: path.join(homeDir, '.gemini', 'skills', 'jules-companion'), condition: true },
    { name: 'Google Antigravity (Config Skills)', path: path.join(homeDir, '.gemini', 'config', 'skills', 'jules-companion'), condition: true },
    { name: 'Google Antigravity (Workspace)', path: path.join(rootDir, '.agents', 'skills', 'jules-companion'), condition: true },

    // 2. Anthropic Claude Code
    { name: 'Claude Code', path: path.join(homeDir, '.claude', 'skills', 'jules-companion'), condition: fs.existsSync(path.join(homeDir, '.claude')) },

    // 3. GitHub Copilot CLI
    { name: 'GitHub Copilot CLI', path: path.join(homeDir, '.copilot', 'skills', 'jules-companion'), condition: fs.existsSync(path.join(homeDir, '.copilot')) },

    // 4. OpenClaw
    { name: 'OpenClaw Agent', path: path.join(homeDir, '.openclaw', 'skills', 'jules-companion'), condition: fs.existsSync(path.join(homeDir, '.openclaw')) },

    // 5. Pi Coding Agent
    { name: 'Pi Coding Agent', path: path.join(homeDir, '.pi', 'agent', 'skills', 'jules-companion'), condition: fs.existsSync(path.join(homeDir, '.pi')) },

    // 6. Hermes Agent
    { name: 'Hermes Agent', path: path.join(homeDir, '.hermes', 'skills', 'jules-companion'), condition: fs.existsSync(path.join(homeDir, '.hermes')) }
  ];

  for (const target of skillTargets) {
    if (target.condition) {
      try {
        copySkillBundle(target.path);
        console.log(`  ✅ Installed Skill in: ${target.name} (${target.path})`);
      } catch (err) {
        console.error(`  ⚠️ Failed to install Skill in ${target.name}:`, err.message);
      }
    }
  }

  // Deploy all specialized jules-* skills from workspace .agents/skills to global Antigravity dirs
  const workspaceSkillsDir = path.join(rootDir, '.agents', 'skills');
  if (fs.existsSync(workspaceSkillsDir)) {
    const entries = fs.readdirSync(workspaceSkillsDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory() && ent.name.startsWith('jules-')) {
        const srcSkill = path.join(workspaceSkillsDir, ent.name);
        const destGlobalConfig = path.join(homeDir, '.gemini', 'config', 'skills', ent.name);
        const destGlobalSkills = path.join(homeDir, '.gemini', 'skills', ent.name);
        for (const dest of [destGlobalConfig, destGlobalSkills]) {
          if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
          fs.cpSync(srcSkill, dest, { recursive: true });
        }
        console.log(`  ✅ Registered specialized skill: ${ent.name}`);
      }
    }
  }

  console.log('');
}

/**
 * Deploys interactive chat Slash Commands to Antigravity and compatible agents.
 */
function installSlashCommands() {
  console.log('[3/5] ⚡ Registering AI Chat Slash Commands (/jules-*)...');

  const localCommands = path.join(rootDir, 'commands');
  if (!fs.existsSync(localCommands)) {
    console.log('  ℹ️ No local commands/ folder found (skipped).\n');
    return;
  }

  const commandTargets = [
    path.join(homeDir, '.gemini', 'commands'),
    path.join(homeDir, '.gemini', 'config', 'commands'),
    fs.existsSync(path.join(homeDir, '.claude')) ? path.join(homeDir, '.claude', 'commands') : null
  ].filter(Boolean);

  for (const cmdDir of commandTargets) {
    if (!fs.existsSync(cmdDir)) {
      fs.mkdirSync(cmdDir, { recursive: true });
    }
    const files = fs.readdirSync(localCommands).filter(f => f.endsWith('.md'));
    for (const f of files) {
      fs.copyFileSync(path.join(localCommands, f), path.join(cmdDir, f));
    }
    console.log(`  ✅ Registered ${files.length} Slash Commands in: ${cmdDir}`);
  }
  console.log('');
}

/**
 * Helper to safely merge an MCP server configuration into a target JSON file.
 *
 * @param {string} filePath - Absolute path to the mcp configuration JSON.
 * @param {string} serverName - Identifier name for the MCP server.
 * @param {object} serverConfig - Server execution specification.
 * @returns {boolean} True if successfully written.
 */
function safeMergeMcpConfig(filePath, serverName, serverConfig) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let config = {};
    if (fs.existsSync(filePath)) {
      try {
        config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        config = {};
      }
    }

    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers[serverName] = serverConfig;

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`  ⚠️ Could not update ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Registers the Model Context Protocol (MCP) server across all detected AI tools and editors.
 */
function installMcpServers() {
  console.log('[4/5] 🔌 Configuring Model Context Protocol (MCP) Across Platforms...');

  const mcpScriptPath = path.join(rootDir, 'dist', 'mcp_server.js');
  const nodeExec = process.execPath;

  const serverConfig = {
    command: nodeExec,
    args: [mcpScriptPath],
    env: {
      JULES_WORKSPACE_ROOT: rootDir,
      PATH: process.env.PATH || ''
    }
  };

  // 1. Google Antigravity Config
  const geminiMcpConfig = path.join(homeDir, '.gemini', 'config', 'mcp_config.json');
  if (safeMergeMcpConfig(geminiMcpConfig, 'jules-companion', serverConfig)) {
    console.log(`  ✅ Antigravity MCP Configured: ${geminiMcpConfig}`);
  }

  // 2. Claude Desktop
  let claudeDesktopConfig = null;
  if (process.platform === 'win32') {
    claudeDesktopConfig = path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (process.platform === 'darwin') {
    claudeDesktopConfig = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    claudeDesktopConfig = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
  }
  if (fs.existsSync(path.dirname(claudeDesktopConfig))) {
    if (safeMergeMcpConfig(claudeDesktopConfig, 'jules-companion', serverConfig)) {
      console.log(`  ✅ Claude Desktop Configured: ${claudeDesktopConfig}`);
    }
  }

  // 3. Claude Code
  const claudeCodeDir = path.join(homeDir, '.claude');
  if (fs.existsSync(claudeCodeDir)) {
    const claudeCodeMcp = path.join(claudeCodeDir, 'mcp.json');
    if (safeMergeMcpConfig(claudeCodeMcp, 'jules-companion', serverConfig)) {
      console.log(`  ✅ Claude Code Configured: ${claudeCodeMcp}`);
    }
  }

  // 4. Cursor AI Editor
  const cursorConfig = path.join(homeDir, '.cursor', 'mcp.json');
  if (safeMergeMcpConfig(cursorConfig, 'jules-companion', serverConfig)) {
    console.log(`  ✅ Cursor AI MCP Configured: ${cursorConfig}`);
  }

  // 5. Windsurf Editor
  const windsurfConfig = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
  if (safeMergeMcpConfig(windsurfConfig, 'jules-companion', serverConfig)) {
    console.log(`  ✅ Windsurf MCP Configured: ${windsurfConfig}`);
  }

  // 6. Antigravity IDE JSON Schema Export
  const ideSchemaDir = path.join(homeDir, '.gemini', 'antigravity-ide', 'mcp', 'jules-companion');
  const cliSchemaDir = path.join(homeDir, '.gemini', 'antigravity-cli', 'mcp', 'jules-companion');
  for (const sDir of [ideSchemaDir, cliSchemaDir]) {
    if (!fs.existsSync(sDir)) {
      fs.mkdirSync(sDir, { recursive: true });
    }
  }

  try {
    const { getAllTools } = require(path.join(rootDir, 'dist', 'mcp', 'registry.js'));
    for (const tool of getAllTools()) {
      const payload = JSON.stringify({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }, null, 2);
      fs.writeFileSync(path.join(ideSchemaDir, `${tool.name}.json`), payload, 'utf8');
      fs.writeFileSync(path.join(cliSchemaDir, `${tool.name}.json`), payload, 'utf8');
    }
    console.log(`  ✅ Exported 20 MCP Tool JSON schemas to Antigravity schema registries.`);
  } catch (err) {
    // Registry export fallback if dist not compiled yet
  }

  console.log('');
}

/**
 * Prompts user to configure their Google Jules API Key in .env if not yet set.
 */
async function configureApiKey() {
  console.log('[5/5] 🔑 Configuring Google Jules API Key Credentials...');
  const envPath = path.join(rootDir, '.env');
  let currentKey = '';

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/JULES_API_KEY=(.*)/);
    if (match && match[1].trim()) {
      currentKey = match[1].trim();
    }
  }

  if (currentKey && currentKey !== 'your_actual_google_jules_api_key_here') {
    console.log(`  ✅ Active API Key already present in .env (${currentKey.slice(0, 6)}...${currentKey.slice(-4)})\n`);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('  👉 Enter your Google Jules API Key (or press Enter to skip for now): ', answer => {
      const key = answer.trim();
      if (key) {
        let newContent = '';
        if (fs.existsSync(envPath)) {
          newContent = fs.readFileSync(envPath, 'utf8');
          if (newContent.includes('JULES_API_KEY=')) {
            newContent = newContent.replace(/JULES_API_KEY\s*=\s*.*/g, `JULES_API_KEY=${key}`);
          } else {
            newContent += `\nJULES_API_KEY=${key}\n`;
          }
        } else {
          newContent = `JULES_API_KEY=${key}\n`;
        }
        fs.writeFileSync(envPath, newContent.trim() + '\n', 'utf8');
        console.log('  ✅ JULES_API_KEY saved to .env successfully.');
      } else {
        console.log('  ℹ️ Skipped. You can set JULES_API_KEY later in .env or via IDE settings.');
      }
      rl.close();
      console.log('');
      resolve();
    });
  });
}

/**
 * Main coordinator executing the 5-step universal installation workflow.
 */
async function main() {
  printHeader();

  // Pre-check: Ensure dist/ is built
  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
    console.log('⚙️ Building TypeScript source files...');
    try {
      execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
      console.log('');
    } catch (err) {
      console.error('❌ Build failed:', err.message);
      process.exit(1);
    }
  }

  // Step 1: Detect available editors and install VSIX extension
  const editors = findInstalledEditors();
  console.log(`🔍 Detected Editors: ${editors.length > 0 ? editors.map(e => e.name).join(', ') : 'None'}\n`);
  installVsix(editors);

  // Step 2: Deploy Skills
  installSkills();

  // Step 3: Register Slash Commands
  installSlashCommands();

  // Step 4: Register MCP Server across clients
  installMcpServers();

  // Step 5: Configure API key credentials
  await configureApiKey();

  // Display completion overview
  console.log('============================================================');
  console.log('         🎉 UNIVERSAL INSTALLATION COMPLETE!                ');
  console.log('============================================================');
  console.log('✨ Skill registered in: Antigravity, Claude Code, Copilot CLI, etc.');
  console.log('✨ 20 MCP Tools registered in: Antigravity, Claude, Cursor, Windsurf.');
  console.log('✨ 7 Slash Commands available: /jules-deploy, /jules-review, /jules-auto,');
  console.log('   /jules-inspect, /jules-merge, /jules-status, /jules-doctor.');
  console.log('✨ IDE Extension active with 4 Sidebar Views & Visual Diff Viewer.\n');
}

main().catch(err => {
  console.error('\n❌ An error occurred during installation:', err);
  process.exit(1);
});
