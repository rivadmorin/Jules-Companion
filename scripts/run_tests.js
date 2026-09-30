/**
 * Headless Test Runner for Jules Companion.
 * @module scripts/run_tests
 * @description Provides a standalone test environment with synthesized VS Code API mocks,
 * discovers all unit tests in tests/*.test.ts, and executes them via Node.js native test runner.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Ensures a synthetic 'vscode' module mock exists in node_modules/vscode.
 * Enables running extension unit tests headlessly from command-line without launching VS Code.
 */
function ensureVsCodeMock() {
  const root = path.resolve(__dirname, '..');
  const vsCodeDir = path.join(root, 'node_modules', 'vscode');

  // Step 1: Create mock directory if not present
  if (!fs.existsSync(vsCodeDir)) {
    fs.mkdirSync(vsCodeDir, { recursive: true });
  }

  // Step 2: Ensure package.json declares valid CommonJS entrypoint
  const pkgPath = path.join(vsCodeDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'vscode', version: '1.0.0', main: 'index.js' }));
  }

  // Step 3: Write mock implementations for all referenced VS Code types and namespaces
  const indexPath = path.join(vsCodeDir, 'index.js');
  const mockContent = `
// Mock TreeItem for Sidebar View Providers
class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

// Mock EventEmitter for TreeView refresh triggers
class EventEmitter {
  constructor() {
    this.event = (listener) => ({ dispose: () => {} });
  }
  fire(data) {}
}

// Mock ThemeIcon and ThemeColor for icon glyphs
class ThemeIcon {
  constructor(id, color) {
    this.id = id;
    this.color = color;
  }
}
class ThemeColor {
  constructor(id) {
    this.id = id;
  }
}

// Collapsible states & alignment enums
const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
const StatusBarAlignment = { Left: 1, Right: 2 };

// Mock Uri for document and virtual diff navigation
const Uri = {
  file: (p) => ({ fsPath: p, path: p, scheme: 'file', toString: () => 'file://' + p }),
  parse: (u) => ({ toString: () => u, scheme: u.split(':')[0], path: u })
};

// Mock MarkdownString for tooltips and rich documentation
class MarkdownString {
  constructor(value = '') { this.value = value; this.isTrusted = false; this.supportHtml = false; }
  appendMarkdown(val) { this.value += val; }
  appendText(val) { this.value += val; }
}

// Mock workspace namespace for document loading and configurations
const workspace = {
  workspaceFolders: [{ uri: { fsPath: process.cwd() } }],
  registerTextDocumentContentProvider: (scheme, provider) => ({ dispose: () => {} }),
  openTextDocument: async (uri) => ({ uri }),
  getConfiguration: () => ({ get: () => undefined })
};

// Mock window namespace for popups, channels, and status bar
const window = {
  showInformationMessage: async () => {},
  showErrorMessage: async () => {},
  showWarningMessage: async () => {},
  showQuickPick: async () => null,
  showInputBox: async () => '',
  withProgress: async (opt, task) => task(),
  createOutputChannel: (name) => ({
    name,
    appendLine: () => {},
    append: () => {},
    show: () => {},
    clear: () => {},
    dispose: () => {}
  }),
  createStatusBarItem: (alignment, priority) => ({
    alignment,
    priority,
    text: '',
    tooltip: '',
    show: () => {},
    hide: () => {},
    dispose: () => {}
  })
};

// Mock commands namespace for dispatching IDE actions
const commands = {
  executeCommand: async () => {}
};

module.exports = {
  TreeItem,
  TreeItemCollapsibleState,
  StatusBarAlignment,
  EventEmitter,
  ThemeIcon,
  ThemeColor,
  Uri,
  MarkdownString,
  workspace,
  window,
  commands
};
`;
  fs.writeFileSync(indexPath, mockContent.trim());
}

// 1. Initialize synthetic VS Code environment mock
ensureVsCodeMock();

// 2. Discover all TypeScript test files under tests/
const testDir = path.resolve(__dirname, '../tests');
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.ts'))
  .sort()
  .map(f => path.join('tests', f));

// 3. Resolve cross-platform NPX binary name
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// 4. Spawn tsx running Node.js native test runner sequentially for deterministic outcomes
const result = spawnSync(npxCmd, ['tsx', '--test', '--test-concurrency=1', ...testFiles], {
  stdio: 'inherit',
  shell: true
});

// 5. Forward test runner exit code to process
process.exit(result.status !== null ? result.status : 1);
