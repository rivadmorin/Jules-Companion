const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ensureVsCodeMock() {
  const root = path.resolve(__dirname, '..');
  const vsCodeDir = path.join(root, 'node_modules', 'vscode');
  if (!fs.existsSync(vsCodeDir)) {
    fs.mkdirSync(vsCodeDir, { recursive: true });
  }
  const pkgPath = path.join(vsCodeDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'vscode', version: '1.0.0', main: 'index.js' }));
  }
  const indexPath = path.join(vsCodeDir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, `
class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}
class EventEmitter {
  constructor() {
    this.event = (listener) => ({ dispose: () => {} });
  }
  fire(data) {}
}
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
const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
const Uri = {
  file: (p) => ({ fsPath: p, path: p, scheme: 'file', toString: () => 'file://' + p }),
  parse: (u) => ({ toString: () => u, scheme: u.split(':')[0], path: u })
};
class MarkdownString {
  constructor(value = '') { this.value = value; this.isTrusted = false; this.supportHtml = false; }
  appendMarkdown(val) { this.value += val; }
  appendText(val) { this.value += val; }
}
const workspace = {
  registerTextDocumentContentProvider: (scheme, provider) => ({ dispose: () => {} }),
  openTextDocument: async (uri) => ({ uri })
};
const window = {
  showInformationMessage: async () => {},
  showErrorMessage: async () => {},
  showQuickPick: async () => null,
  withProgress: async (opt, task) => task()
};
const commands = {
  executeCommand: async () => {}
};
module.exports = { TreeItem, TreeItemCollapsibleState, EventEmitter, ThemeIcon, ThemeColor, Uri, MarkdownString, workspace, window, commands };
`);
  }
}

ensureVsCodeMock();

const testDir = path.resolve(__dirname, '../tests');
const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.ts'))
  .sort()
  .map(f => path.join('tests', f));

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npxCmd, ['tsx', '--test', '--test-concurrency=1', ...testFiles], {
  stdio: 'inherit',
  shell: true
});

process.exit(result.status !== null ? result.status : 1);
