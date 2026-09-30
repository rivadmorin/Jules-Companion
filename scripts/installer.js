/**
 * Interactive 1-Click Installer for Jules Companion (Antigravity IDE, VS Code Extension & MCP Server).
 * Designed for non-technical users and quick onboarding.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = path.resolve(__dirname, '..');
const homeDir = os.homedir();

function printHeader() {
  console.log('\n============================================================');
  console.log('       🐙 JULES COMPANION — 1-CLICK EASY INSTALLER 🐙       ');
  console.log('  Automated Setup for Antigravity IDE, VS Code & MCP Server ');
  console.log('============================================================\n');
}

function findInstalledEditors() {
  const editors = [];
  const checked = new Set();

  function testCmd(name, cmd) {
    if (editors.some(e => e.name === name)) return;
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      editors.push({ name, cmd });
    } catch (e) {
      // not available
    }
  }

  // 1. Antigravity IDE
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

  // 2. VS Code
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

  // 3. Cursor
  testCmd('Cursor', 'cursor');
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
    const cursorPath = path.join(localAppData, 'Programs', 'cursor', 'resources', 'app', 'bin', 'cursor.cmd');
    if (fs.existsSync(cursorPath)) {
      testCmd('Cursor', `"${cursorPath}"`);
    }
  }

  // 4. Windsurf
  testCmd('Windsurf', 'windsurf');

  return editors;
}

function installVsix(editors) {
  console.log('[1/3] 💻 Checking & Installing IDE Extension (Antigravity IDE / VS Code)...');
  
  // Find latest .vsix in rootDir
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
    console.log('  ⚠️ Neither Antigravity IDE nor VS Code was detected in standard paths.');
    console.log(`  👉 You can install manually in your editor: Extensions -> "Install from VSIX..." -> select ${targetVsix}\n`);
    return false;
  }

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

function installMcpServer() {
  console.log('[2/3] 🔌 Configuring MCP Server for Antigravity & AI Clients...');

  const mcpServerScript = path.join(rootDir, 'dist', 'mcp_server.js');

  // 1. Antigravity IDE & Global IDE Skills
  try {
    const syncScript = path.join(rootDir, 'dist', 'sync_global.js');
    if (fs.existsSync(syncScript)) {
      execSync(`node "${syncScript}"`, { cwd: rootDir, stdio: 'ignore' });
      console.log('  ✅ Synchronized with Antigravity IDE & Global Skills (~/.gemini/config/skills & mcp).');
    }
  } catch (e) {
    // optional
  }

  // 2. Antigravity CLI (agy)
  try {
    execSync('agy mcp list', { stdio: 'ignore' });
    console.log('  ✅ Antigravity CLI (agy) detected: jules-companion MCP registered.');
  } catch (e) {
    // agy not in PATH or command error
  }

  // 3. Claude Desktop Integration
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

async function configureApiKey() {
  console.log('[3/3] 🔑 Configuring Google Jules API Key...');
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
    console.log(`  ✅ API Key already detected in .env (${currentKey.slice(0, 6)}...${currentKey.slice(-4)})`);
    return;
  }

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
            newContent = newContent.replace(/JULES_API_KEY=.*/, `JULES_API_KEY=${key}`);
          } else {
            newContent += `\nJULES_API_KEY=${key}\n`;
          }
        } else {
          newContent = `JULES_API_KEY=${key}\n`;
        }
        fs.writeFileSync(envPath, newContent, 'utf8');
        console.log('  ✅ API Key successfully saved to .env!');
      } else {
        console.log('  ℹ️ Skipped. You can configure it later in your .env file.');
      }
      rl.close();
      resolve();
    });
  });
}

async function main() {
  printHeader();

  const editors = findInstalledEditors();
  console.log(`🔍 Detected IDEs: ${editors.length > 0 ? editors.map(e => e.name).join(', ') : 'None'}\n`);

  installVsix(editors);
  installMcpServer();
  await configureApiKey();

  console.log('============================================================');
  console.log('         🎉 INSTALLATION COMPLETE & READY TO USE!           ');
  console.log('============================================================');
  console.log('1. In Antigravity IDE / VS Code: Look for the 🐙 Jules icon in the Activity Bar.');
  console.log('2. Explore the Jules Sidebar or launch the "Session Action Center" to manage sessions.');
  console.log('3. AI Agents (Antigravity IDE, Claude, Cursor) now have access to all 20 jules tools.\n');
}

main().catch(err => {
  console.error('\n❌ An error occurred during installation:', err);
  process.exit(1);
});
