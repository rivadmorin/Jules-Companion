import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import {
  WorkspaceTreeDataProvider,
  WorkspaceTreeItem,
  parseGitOrigin,
  getWorkspaceContextInfo
} from '../scripts/ui/workspace_provider';

describe('WorkspaceTreeDataProvider & WorkspaceTreeItem Unit Tests', () => {
  test('parseGitOrigin should parse HTTPS and SSH remote URLs correctly', () => {
    const httpsRes = parseGitOrigin('https://github.com/rivadmorin/Jules-Companion.git');
    assert.ok(httpsRes);
    assert.strictEqual(httpsRes.owner, 'rivadmorin');
    assert.strictEqual(httpsRes.repo, 'Jules-Companion');
    assert.strictEqual(httpsRes.slug, 'rivadmorin/Jules-Companion');
    assert.strictEqual(httpsRes.webUrl, 'https://github.com/rivadmorin/Jules-Companion');

    const sshRes = parseGitOrigin('git@github.com:rivadmorin/Jules-Companion.git');
    assert.ok(sshRes);
    assert.strictEqual(sshRes.slug, 'rivadmorin/Jules-Companion');

    const invalidRes = parseGitOrigin('');
    assert.strictEqual(invalidRes, null);
  });

  test('getWorkspaceContextInfo should inspect current repository context', async () => {
    const info = await getWorkspaceContextInfo(process.cwd());
    assert.ok(info.workspacePath);
    assert.ok(info.workspaceName);
    assert.strictEqual(typeof info.currentBranch, 'string');
    assert.strictEqual(typeof info.workingTreeStatus, 'string');
    assert.strictEqual(typeof info.isCloudLinked, 'boolean');
    assert.strictEqual(typeof info.isApiKeyConfigured, 'boolean');
  });

  test('WorkspaceTreeDataProvider should build expected 5 context items', async () => {
    const provider = new WorkspaceTreeDataProvider(() => process.cwd());
    const items = await provider.getChildren();

    assert.strictEqual(items.length, 5, 'Should return exactly 5 context items');

    const [wsItem, originItem, branchItem, cloudItem, apiKeyItem] = items;

    // 1. 📁 Workspace
    assert.strictEqual(wsItem.category, 'workspace');
    assert.ok(wsItem.label.startsWith('Workspace:'));
    assert.ok(wsItem.command);
    assert.strictEqual(wsItem.command.command, 'revealFileInOS');

    // 2. 🐙 Git Origin
    assert.strictEqual(originItem.category, 'git-origin');
    assert.ok(originItem.label.startsWith('Git Origin:'));

    // 3. 🌿 Current Branch
    assert.strictEqual(branchItem.category, 'git-branch');
    assert.ok(branchItem.label.startsWith('Current Branch:'));
    assert.ok(branchItem.command);
    assert.strictEqual(branchItem.command.command, 'git.checkout');

    // 4. ☁️ Jules Cloud Link
    assert.strictEqual(cloudItem.category, 'cloud-link');
    assert.ok(cloudItem.label.startsWith('Jules Cloud Link:'));
    assert.ok(cloudItem.command);
    assert.strictEqual(cloudItem.command.command, 'jules.refreshWorkspace');

    // 5. 🔑 API Key
    assert.strictEqual(apiKeyItem.category, 'api-key');
    assert.ok(apiKeyItem.label.startsWith('API Key:'));
    assert.ok(apiKeyItem.command);
    assert.strictEqual(apiKeyItem.command.command, 'jules.setApiKey');
  });

  test('getChildren with element should return empty array (leaf items)', async () => {
    const provider = new WorkspaceTreeDataProvider();
    const parentItem = new WorkspaceTreeItem('Parent', 0);
    const children = await provider.getChildren(parentItem);
    assert.deepStrictEqual(children, []);
  });

  test('refresh should fire change event cleanly', () => {
    const provider = new WorkspaceTreeDataProvider();
    assert.doesNotThrow(() => provider.refresh());
  });
});
