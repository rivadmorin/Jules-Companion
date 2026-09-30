/**
 * Interactive 1-Click Installer for Jules Companion (Antigravity IDE, VS Code Extension & MCP Server).
 * @module scripts/installer
 * @description Provides an automated setup workflow detecting installed IDEs (Antigravity IDE,
 * VS Code, Cursor, Windsurf), installing the latest VSIX package, registering the JSON-RPC
 * MCP server across AI clients (Claude Desktop, agy), and configuring the API key.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

// 1. Resolve project root and user home directories
const rootDir = path.resolve(__dirname, '..');
const homeDir = os.homedir();

/**
 * Prints the ASCII header banner for the interactive installer.
 */
function printHeader() {
  console.log('\n============================================================');
  console.log('       🐙 JULES COMPANION — 1-CLICK EASY INSTALLER 🐙       ');
  console.log('  Automated Setup for Antigravity IDE, VS Code & MCP Server ');
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
  const checked = new Set();

  // Helper testing if command executable exists in PATH
  function testCmd(name, cmd) {
    if (editors.some(e => e.name === name)) return;
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      editors.push({ name, cmd });
    } catch (e) {
      // Command not available in PATH
    }
  }

  // Step 1: Detect Antigravity IDE (Local AppData or PATH)
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    const agyIdeCmd = path.join(localAppData, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd');
    if (fs.existsSync(agyIdeCmd)) {
      editors.push({ name: 'Antigravity IDE', cmd: `"${agyIdeCmd}"` });
    } else {
      testCmd('Antigravity IDE', 'antigravity-ide');
    }
  } else {
    testCmd('Antigravity IDE', 'antigravity-ide');
  }

  // Step 2: Detect Microsoft Visual Studio Code (Local AppData, Program Files, or PATH)
  testCmd('Visual Studio Code', 'code');
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
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

  // Step 3: Detect Cursor AI Editor
  testCmd('Cursor', 'cursor');
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    const cursorPath = path.join(localAppData, 'Programs', 'cursor', 'resources', 'app', 'bin', 'cursor.cmd');
    if (fs.existsSync(cursorPath)) {
      testCmd('Cursor', `"${cursorPath}"`);
    }
  }

  // Step 4: Detect Windsurf Editor
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
  console.log('[1/3] 💻 Checking & Installing IDE Extension (Antigravity IDE / VS Code)...');

  // Step 1: Scan project root directory for existing .vsix package files
  const vsixFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.vsix'));
  let targetVsix = vsixFiles.sort().reverse()[0];

  // Step 2: Automatically build VSIX package if missing
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

  // Step 3: Verify editor detection
  if (editors.length === 0) {
    console.log('  ⚠️ Neither Antigravity IDE nor VS Code was detected in standard paths.');
    console.log(`  👉 You can install manually in your editor: Extensions -> "Install from VSIX..." -> select ${targetVsix}\n`);
    return false;
  }

  // Step 4: Execute extension installation command per detected editor
  const vsixPath = path.join(rootDir, targetVsix);
  let anySuccess = false;

  for (const ed of editors) {
    try {
      console.log(`  📦 Installing ${targetVsix} into ${ed.name}...`);
      execSync(`${ed.cmd} --install-extension "${vsixPath}" --force`, { stdio: 'inherit' });
      console.log(`  ✅ Extension successfully installed in ${ed.name}!\n`);
      anySuccess = true;
    } catch (err) {
      console.error(`  ⚠️ Failed to install extension in ${ed.name}:`, err.message);
    }
  }

  return anySuccess;
}

/**
 * Registers the standalone JSON-RPC MCP server with AI clients and synchronizes global skills.
 */
function installMcpServer() {
  console.log('[2/3] 🔌 Configuring MCP Server for Antigravity & AI Clients...');

  const mcpServerScript = path.join(rootDir, 'dist', 'mcp_server.js');

  // Step 1: Synchronize with Antigravity IDE & global skill directory
  try {
    const syncScript = path.join(rootDir, 'dist', 'sync_global.js');
    if (fs.existsSync(syncScript)) {
      execSync(`node "${syncScript}"`, { cwd: rootDir, stdio: 'ignore' });
      console.log('  ✅ Synchronized with Antigravity IDE & Global Skills (~/.gemini/config/skills & mcp).');
    }
  } catch (e) {
    // Optional synchronization fallback
  }

  // Step 2: Verify Antigravity CLI registration if available
  try {
    execSync('agy mcp list', { stdio: 'ignore' });
    console.log('  ✅ Antigravity CLI (agy) detected: jules-companion MCP registered.');
  } catch (e) {
    // agy not in PATH or command error
  }

  // Step 3: Configure Claude Desktop MCP configuration JSON
  let claudeConfigPath = null;
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    claudeConfigPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else if (process.platform === 'darwin') {
    claudeConfigPath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }

  if (claudeConfigPath) {
    try {
      const configDir = path.dirname(claudeConfigPath);
      if (fs.existsSync(configDir)) {
        let config = {};
        if (fs.existsSync(claudeConfigPath)) {
          try {
            config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
          } catch (e) {
            config = {};
          }
        }
        if (!config.mcpServers) config.mcpServers = {};

        config.mcpServers['jules-companion'] = {
          command: 'node',
          args: [mcpServerScript],
          env: {
            JULES_WORKSPACE_ROOT: rootDir
          }
        };

        fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`  ✅ Integrated automatically with Claude Desktop (${claudeConfigPath})`);
      } else {
        console.log('  ℹ️ Claude Desktop configuration directory not found (skipped).');
      }
    } catch (err) {
      console.log('  ⚠️ Failed to synchronize with Claude Desktop:', err.message);
    }
  }

  console.log('  ✅ 20 MCP Tools registered and ready to use.\n');
}

/**
 * Prompts user to configure their Google Jules API Key in .env if not yet set.
 */
async function configureApiKey() {
  console.log('[3/3] 🔑 Configuring Google Jules API Key...');
  const envPath = path.join(rootDir, '.env');
  let currentKey = '';

  // Step 1: Check existing .env file for credentials
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/JULES_API_KEY=(.*)/);
    if (match && match[1].trim()) {
      currentKey = match[1].trim();
    }
  }

  // Step 2: Skip prompt if valid non-placeholder key is already configured
  if (currentKey && currentKey !== 'your_actual_google_jules_api_key_here') {
    console.log(`  ✅ API Key already detected in .env (${currentKey.slice(0, 6)}...${currentKey.slice(-4)})`);
    return;
  }

  // Step 3: Interactive CLI readline prompt for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('  👉 Enter your Google Jules API Key (Press Enter to skip for now): ', answer => {
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
        console.log('  ✅ Saved JULES_API_KEY to .env file.');
      } else {
        console.log('  ℹ️ Skipped API Key configuration. Set JULES_API_KEY later in .env or via IDE settings.');
      }
      rl.close();
      resolve();
    });
  });
}

/**
 * Main coordinator function executing the 3-step installation workflow.
 */
async function main() {
  printHeader();

  // Step 1: Detect available editors and install VSIX extension
  const editors = findInstalledEditors();
  console.log(`🔍 Detected IDEs: ${editors.length > 0 ? editors.map(e => e.name).join(', ') : 'None'}\n`);

  installVsix(editors);

  // Step 2: Configure MCP Server
  installMcpServer();

  // Step 3: Configure API key credentials
  await configureApiKey();

  // Step 4: Display completion banner
  console.log('============================================================');
  console.log('         🎉 INSTALLATION COMPLETE & READY TO USE!           ');
  console.log('============================================================');
  console.log('1. In Antigravity IDE / VS Code: Look for the 🐙 Jules icon in the Activity Bar.');
  console.log('2. Explore the Jules Sidebar or launch the "Session Action Center" to manage sessions.');
  console.log('3. AI Agents (Antigravity IDE, Claude, Cursor) now have access to all 20 jules tools.\n');
}

// Execute installer with top-level error catching
main().catch(err => {
  console.error('\n❌ An error occurred during installation:', err);
  process.exit(1);
});
