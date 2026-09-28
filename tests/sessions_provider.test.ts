import { test, describe, before, after } from 'node:test';
import * as assert from 'node:assert';
import * as path from 'path';
import * as fs from 'fs';
import {
  SessionsTreeDataProvider,
  SessionTreeItem,
  cleanAgentName,
  cleanTaskString,
  formatDateTime,
  getRelativeTime
} from '../scripts/ui/sessions_provider';
import { SessionRecord } from '../scripts/core/types';
import { resolveSessionId } from '../scripts/extension';

describe('SessionsTreeDataProvider & SessionTreeItem Unit Tests', () => {
  describe('Helper Functions', () => {
    test('cleanAgentName should sanitize agent name or fallback', () => {
      assert.strictEqual(cleanAgentName(''), 'default');
      assert.strictEqual(cleanAgentName(undefined), 'default');
      assert.strictEqual(cleanAgentName('  innovator  '), 'innovator');
      assert.strictEqual(cleanAgentName('sentinel,janitor'), 'sentinel,janitor');
    });

    test('cleanTaskString should clean whitespaces and truncate long tasks', () => {
      assert.strictEqual(cleanTaskString(''), 'No task');
      assert.strictEqual(cleanTaskString(undefined), 'No task');
      assert.strictEqual(cleanTaskString('Simple task'), 'Simple task');
      assert.strictEqual(
        cleanTaskString('Task with\nnewlines\r\nand   multiple spaces', 50),
        'Task with newlines and multiple spaces'
      );
      const longTask = 'Refactor authentication middleware to use JWT and add unit tests';
      const truncated = cleanTaskString(longTask, 28);
      assert.ok(truncated.length <= 28);
      assert.ok(truncated.endsWith('...'));
    });

    test('formatDateTime should format ISO dates cleanly', () => {
      assert.strictEqual(formatDateTime(undefined), 'N/A');
      assert.strictEqual(formatDateTime(''), 'N/A');
      const iso = '2026-09-28T05:12:00.000Z';
      const formatted = formatDateTime(iso);
      assert.match(formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    test('getRelativeTime should compute human-readable intervals', () => {
      assert.strictEqual(getRelativeTime(undefined), undefined);
      assert.strictEqual(getRelativeTime(''), undefined);

      const now = Date.now();
      const justNow = new Date(now - 2000).toISOString();
      assert.strictEqual(getRelativeTime(justNow), 'just now');

      const tenSecondsAgo = new Date(now - 10000).toISOString();
      assert.strictEqual(getRelativeTime(tenSecondsAgo), '10s ago');

      const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();
      assert.strictEqual(getRelativeTime(fiveMinutesAgo), '5m ago');

      const twoHoursAgo = new Date(now - 2 * 3600 * 1000).toISOString();
      assert.strictEqual(getRelativeTime(twoHoursAgo), '2h ago');

      const threeDaysAgo = new Date(now - 3 * 86400 * 1000).toISOString();
      assert.strictEqual(getRelativeTime(threeDaysAgo), '3d ago');
    });
  });

  describe('SessionTreeItem Root Item Formatting', () => {
    const mockSession: SessionRecord = {
      id: 'sess-123456789abcdef',
      agent: 'innovator',
      mode: 'code',
      task: 'Build automated UI sessions test harness',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      branch: 'feature/ui-nav',
      createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date(Date.now() - 60000).toISOString(),
      prUrl: 'https://github.com/rivadmorin/Jules-Companion/pull/42',
      message: 'Feature successfully implemented'
    };

    test('should format label with #${s.id.slice(0, 8)} • ${cleanAgentName} (${cleanTask})', () => {
      const cleanAgent = cleanAgentName(mockSession.agent);
      const cleanTask = cleanTaskString(mockSession.task, 28);
      const label = `#${mockSession.id.slice(0, 8)} • ${cleanAgent} (${cleanTask})`;
      const item = new SessionTreeItem(label, 1, mockSession);

      assert.strictEqual(
        item.label,
        `#sess-123 • innovator (${cleanTask})`
      );
    });

    test('should format description with [${s.status}] • ${relativeTimeOrBranch}', () => {
      const item = new SessionTreeItem('label', 1, mockSession);
      assert.ok(item.description);
      assert.ok(item.description.startsWith('[COMPLETED] • '));
      assert.ok(item.description.includes('feature/ui-nav'));
      assert.ok(item.description.includes('ago'));
    });

    test('should generate rich Markdown tooltip with all metadata', () => {
      const item = new SessionTreeItem('label', 1, mockSession);
      assert.ok(item.tooltip);
      const tooltipStr = (item.tooltip as any).value || '';
      assert.ok(tooltipStr.includes('Jules Session: `#sess-123456789abcdef`'));
      assert.ok(tooltipStr.includes('- **Task:** Build automated UI sessions test harness'));
      assert.ok(tooltipStr.includes('- **Branch:** `feature/ui-nav`'));
      assert.ok(tooltipStr.includes('- **Agent:** `innovator`'));
      assert.ok(tooltipStr.includes('- **Status:** **COMPLETED**'));
      assert.ok(tooltipStr.includes('- **Created:**'));
      assert.ok(tooltipStr.includes('- **Updated:**'));
      assert.ok(tooltipStr.includes('- **Source:**'));
      assert.ok(tooltipStr.includes('- **Pull Request:** [https://github.com/rivadmorin/Jules-Companion/pull/42]'));
    });

    test('should assign correct contextValue and iconPath by status', () => {
      // 1. Succeeded
      const sSucceeded: SessionRecord = { ...mockSession, status: 'COMPLETED' };
      const itemSucceeded = new SessionTreeItem('label', 1, sSucceeded);
      assert.strictEqual(itemSucceeded.contextValue, 'session-succeeded');
      assert.strictEqual((itemSucceeded.iconPath as any).id, 'check');

      // 2. Running
      const sRunning: SessionRecord = { ...mockSession, status: 'RUNNING' };
      const itemRunning = new SessionTreeItem('label', 1, sRunning);
      assert.strictEqual(itemRunning.contextValue, 'session-running');
      assert.strictEqual((itemRunning.iconPath as any).id, 'sync~spin');

      // 3. Failed
      const sFailed: SessionRecord = { ...mockSession, status: 'FAILED' };
      const itemFailed = new SessionTreeItem('label', 1, sFailed);
      assert.strictEqual(itemFailed.contextValue, 'session-failed');
      assert.strictEqual((itemFailed.iconPath as any).id, 'error');

      // 4. Default / Unknown
      const sOther: SessionRecord = { ...mockSession, status: 'UNKNOWN' };
      const itemOther = new SessionTreeItem('label', 1, sOther);
      assert.strictEqual(itemOther.contextValue, 'session');
      assert.strictEqual((itemOther.iconPath as any).id, 'circle-outline');
    });
  });

  describe('Deep Expandable Details (Sub-items)', () => {
    const mockSession: SessionRecord = {
      id: 'sess-detail-test',
      agent: 'inspector',
      mode: 'code',
      task: 'Verify all code changes against security standards',
      status: 'SUCCEEDED',
      timestamp: '2026-09-28T04:00:00.000Z',
      branch: 'fix/security-audit',
      createdAt: '2026-09-28T04:00:00.000Z',
      updatedAt: '2026-09-28T04:30:00.000Z',
      prUrl: 'https://github.com/rivadmorin/Jules-Companion/pull/99'
    };

    const tempDir = path.join(process.cwd(), '.jules-test-sessions-dir');
    before(() => {
      const julesDir = path.join(tempDir, '.jules-companion');
      fs.mkdirSync(julesDir, { recursive: true });
      fs.writeFileSync(path.join(julesDir, 'sessions.json'), JSON.stringify([mockSession]), 'utf8');
    });

    after(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    });

    test('SessionsTreeDataProvider should return formatted root sessions', async () => {
      const provider = new SessionsTreeDataProvider(() => tempDir);
      const roots = await provider.getChildren();
      assert.strictEqual(roots.length, 1);
      const root = roots[0];
      assert.strictEqual(root.label, '#sess-det • inspector (Verify all code changes a...)');
      assert.strictEqual(root.contextValue, 'session-succeeded');
    });

    test('SessionsTreeDataProvider should return deep expandable details when expanding a session', async () => {
      const provider = new SessionsTreeDataProvider(() => tempDir);
      const roots = await provider.getChildren();
      const sessionItem = roots[0];

      const children = await provider.getChildren(sessionItem);
      assert.ok(children.length >= 5, 'Should return at least 5 deep detail items');

      // 1. 🤖 Agent: Agent name with sparkle icon
      const agentItem = children.find(c => c.detailKey === 'Agent');
      assert.ok(agentItem, 'Agent detail item should exist');
      assert.strictEqual(agentItem.description, 'inspector');
      assert.strictEqual((agentItem.iconPath as any).id, 'sparkle');

      // 2. 🌿 Branch: Target git branch with git branch icon and checkout command
      const branchItem = children.find(c => c.detailKey === 'Branch');
      assert.ok(branchItem, 'Branch detail item should exist');
      assert.strictEqual(branchItem.description, 'fix/security-audit');
      assert.strictEqual((branchItem.iconPath as any).id, 'git-branch');
      assert.ok(branchItem.command, 'Branch item should have a click command');
      assert.strictEqual(branchItem.command.command, 'jules.checkoutSessionBranch');

      // 3. 📌 Task / Instruction: Clickable to show full task text
      const taskItem = children.find(c => c.detailKey === 'Task');
      assert.ok(taskItem, 'Task detail item should exist');
      assert.strictEqual(taskItem.detailValue, mockSession.task);
      assert.strictEqual((taskItem.iconPath as any).id, 'note');
      assert.ok(taskItem.command, 'Task item should have a click command');
      assert.strictEqual(taskItem.command.command, 'jules.showTaskDetail');
      assert.deepStrictEqual(taskItem.command.arguments, [mockSession.task]);

      // 4. ⏱️ Created / Updated: Clean date/time display
      const createdItem = children.find(c => c.detailKey === 'Created');
      assert.ok(createdItem, 'Created detail item should exist');
      assert.match(createdItem.description || '', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      assert.strictEqual((createdItem.iconPath as any).id, 'clock');

      const updatedItem = children.find(c => c.detailKey === 'Updated');
      assert.ok(updatedItem, 'Updated detail item should exist');
      assert.match(updatedItem.description || '', /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      assert.strictEqual((updatedItem.iconPath as any).id, 'clock');

      // 5. 🔗 Pull Request / Link: Clickable if URL present
      const prItem = children.find(c => c.detailKey === 'Pull Request');
      assert.ok(prItem, 'PR detail item should exist');
      assert.strictEqual(prItem.description, mockSession.prUrl);
      assert.strictEqual((prItem.iconPath as any).id, 'link-external');
      assert.ok(prItem.command, 'PR item should have a click command');
      assert.strictEqual(prItem.command.command, 'vscode.open');

      // 6. 🌐 Jules Web
      const webItem = children.find(c => c.detailKey === 'Jules Web');
      assert.ok(webItem, 'Jules Web detail item should exist');
      assert.strictEqual(webItem.description, 'jules.google.com');
      assert.strictEqual((webItem.iconPath as any).id, 'globe');
      assert.ok(webItem.command, 'Web item should have open in web command');
      assert.strictEqual(webItem.command.command, 'jules.openInWeb');

      // 7. 📜 Activities & Logs
      const actItem = children.find(c => c.detailKey === 'Activities');
      assert.ok(actItem, 'Activities detail item should exist');
      assert.strictEqual((actItem.iconPath as any).id, 'history');
      assert.ok(actItem.command, 'Activities item should have view command');
      assert.strictEqual(actItem.command.command, 'jules.viewActivities');

      // 8. 💬 Send Instruction
      const msgItem = children.find(c => c.detailKey === 'Send Instruction' || c.detailKey === 'Send Message');
      assert.ok(msgItem, 'Send Instruction detail item should exist');
      assert.strictEqual((msgItem.iconPath as any).id, 'comment');
      assert.ok(msgItem.command, 'Message item should have send command');
      assert.strictEqual(msgItem.command.command, 'jules.sendMessage');

      // 9. 🌿 Checkout Branch
      const checkoutItem = children.find(c => c.detailKey === 'Checkout Branch');
      assert.ok(checkoutItem, 'Checkout Branch item should exist');
      assert.strictEqual(checkoutItem.command?.command, 'jules.checkoutSessionBranch');

      // 10. 🔀 Merge Session
      const mergeItem = children.find(c => c.detailKey === 'Merge Session');
      assert.ok(mergeItem, 'Merge Session item should exist for completed session');
      assert.strictEqual(mergeItem.command?.command, 'jules.mergeSession');

      // 11. 🐙 Publish PR
      const publishPrItem = children.find(c => c.detailKey === 'Publish PR');
      assert.ok(publishPrItem, 'Publish PR item should exist for completed session');
      assert.strictEqual(publishPrItem.command?.command, 'jules.createGitHubPR');

      // 12. 🗑️ Delete Session
      const deleteItem = children.find(c => c.detailKey === 'Delete Session');
      assert.ok(deleteItem, 'Delete Session item should exist');
      assert.strictEqual(deleteItem.command?.command, 'jules.deleteSession');
    });

    test('should assign session-awaiting-plan contextValue and provide Approve Plan item', async () => {
      const awaitingSession: SessionRecord = {
        id: 'sess-plan-test',
        agent: 'innovator',
        mode: 'code',
        task: 'Refactor database models',
        status: 'AWAITING_PLAN_APPROVAL',
        timestamp: new Date().toISOString()
      };

      const awaitingItem = new SessionTreeItem('label', 1, awaitingSession);
      assert.strictEqual(awaitingItem.contextValue, 'session-awaiting-plan');
      assert.strictEqual((awaitingItem.iconPath as any).id, 'bell-dot');

      const provider = new SessionsTreeDataProvider(() => tempDir);
      const subItems = await provider.getChildren(awaitingItem);
      const approveItem = subItems.find(c => c.detailKey === 'Approve Plan');
      assert.ok(approveItem, 'Approve Plan item should exist when awaiting approval');
      assert.strictEqual((approveItem.iconPath as any).id, 'pass');
      assert.strictEqual(approveItem.command?.command, 'jules.approvePlan');
    });

    test('should assign session-awaiting-input contextValue and provide Reply to Agent item when awaiting user input', async () => {
      const inputSession: SessionRecord = {
        id: 'sess-input-test',
        agent: 'sentinel',
        mode: 'code',
        task: 'Confirm deletion of legacy certificates',
        status: 'AWAITING_USER_INPUT',
        timestamp: new Date().toISOString()
      };

      const inputItem = new SessionTreeItem('label', 1, inputSession);
      assert.strictEqual(inputItem.contextValue, 'session-awaiting-input');
      assert.strictEqual((inputItem.iconPath as any).id, 'comment-discussion');

      const provider = new SessionsTreeDataProvider(() => tempDir);
      const subItems = await provider.getChildren(inputItem);
      const replyItem = subItems.find(c => c.detailKey === 'Reply to Agent');
      assert.ok(replyItem, 'Reply to Agent item should exist when awaiting user input');
      assert.strictEqual((replyItem.iconPath as any).id, 'comment-discussion');
      assert.strictEqual(replyItem.command?.command, 'jules.sendMessage');

      const approveItem = subItems.find(c => c.detailKey === 'Approve Plan');
      assert.strictEqual(approveItem, undefined, 'Approve Plan item should NOT exist when session is awaiting input');
    });

    test('should provide Retry Session item when session is failed', async () => {
      const failedSession: SessionRecord = {
        id: 'sess-failed-test',
        agent: 'innovator',
        mode: 'code',
        task: 'Fix failing unit tests',
        status: 'FAILED',
        timestamp: new Date().toISOString()
      };

      const failedItem = new SessionTreeItem('label', 1, failedSession);
      assert.strictEqual(failedItem.contextValue, 'session-failed');
      assert.strictEqual((failedItem.iconPath as any).id, 'error');

      const provider = new SessionsTreeDataProvider(() => tempDir);
      const subItems = await provider.getChildren(failedItem);
      const retryItem = subItems.find(c => c.detailKey === 'Retry Session');
      assert.ok(retryItem, 'Retry Session item should exist when failed');
      assert.strictEqual(retryItem.command?.command, 'jules.retryFailedSession');
    });

    test('should assign session-archived contextValue and provide Unarchive Session item', async () => {
      const archivedSession: SessionRecord = {
        id: 'sess-archived-test',
        agent: 'innovator',
        mode: 'code',
        task: 'Old completed task',
        status: 'COMPLETED',
        archived: true,
        timestamp: new Date().toISOString()
      };

      const archivedItem = new SessionTreeItem('label', 1, archivedSession);
      assert.strictEqual(archivedItem.contextValue, 'session-archived');
      assert.strictEqual((archivedItem.iconPath as any).id, 'archive');
      assert.ok(archivedItem.description?.includes('[ARCHIVED]'));

      const provider = new SessionsTreeDataProvider(() => tempDir);
      const subItems = await provider.getChildren(archivedItem);
      const unarchiveItem = subItems.find(c => c.detailKey === 'Unarchive Session');
      assert.ok(unarchiveItem, 'Unarchive Session item should exist for archived session');
      assert.strictEqual((unarchiveItem.iconPath as any).id, 'package');
      assert.strictEqual(unarchiveItem.command?.command, 'jules.unarchiveSession');

      const copyUrlItem = subItems.find(c => c.detailKey === 'Copy Session URL');
      assert.ok(copyUrlItem, 'Copy Session URL item should exist');
      assert.strictEqual(copyUrlItem.command?.command, 'jules.copySessionUrl');
    });

    test('should separate active and archived sessions into collapsible group at root level', async () => {
      const sessionsFile = path.join(tempDir, '.jules-companion', 'sessions.json');
      const testSessions: SessionRecord[] = [
        { id: 'sess-active-1', agent: 'coder', mode: 'code', task: 'Active task', status: 'ACTIVE', timestamp: new Date().toISOString(), archived: false },
        { id: 'sess-arch-1', agent: 'tester', mode: 'code', task: 'Archived task 1', status: 'COMPLETED', timestamp: new Date().toISOString(), archived: true },
        { id: 'sess-arch-2', agent: 'critic', mode: 'code', task: 'Archived task 2', status: 'COMPLETED', timestamp: new Date().toISOString(), archived: true }
      ];
      fs.writeFileSync(sessionsFile, JSON.stringify(testSessions, null, 2), 'utf8');

      const provider = new SessionsTreeDataProvider(() => tempDir);
      const rootItems = await provider.getChildren();

      // Should have 1 active session + 1 archived group
      assert.strictEqual(rootItems.length, 2);
      assert.ok(rootItems[0].label.includes('sess-act'));

      const archiveGroup = rootItems[1];
      assert.strictEqual(archiveGroup.detailKey, 'archived-sessions-group');
      assert.ok(archiveGroup.label.includes('Archived Sessions (2)'));

      // Expanding archived group should yield 2 archived sessions
      const archivedChildren = await provider.getChildren(archiveGroup);
      assert.strictEqual(archivedChildren.length, 2);
    });
  });

  describe('resolveSessionId Universal Invocation Tests', () => {
    test('should resolve session id from SessionTreeItem', () => {
      const mockSession: SessionRecord = { id: 'sess-item-123', agent: 'critic', mode: 'code', task: 'test', status: 'COMPLETED' };
      const treeItem = new SessionTreeItem('label', 1, mockSession);
      assert.strictEqual(resolveSessionId(treeItem), 'sess-item-123');
    });

    test('should resolve session id from raw session object', () => {
      const rawSession = { id: 'sess-raw-456', agent: 'innovator', status: 'RUNNING' };
      assert.strictEqual(resolveSessionId(rawSession), 'sess-raw-456');
    });

    test('should resolve session id from wrapper object', () => {
      const wrapper = { session: { id: 'sess-wrap-789' } };
      assert.strictEqual(resolveSessionId(wrapper), 'sess-wrap-789');
    });

    test('should resolve session id from direct string', () => {
      assert.strictEqual(resolveSessionId('sess-str-999'), 'sess-str-999');
      assert.strictEqual(resolveSessionId('  sess-str-trimmed  '), 'sess-str-trimmed');
    });

    test('should return undefined for empty or invalid inputs', () => {
      assert.strictEqual(resolveSessionId(undefined), undefined);
      assert.strictEqual(resolveSessionId(null), undefined);
      assert.strictEqual(resolveSessionId({}), undefined);
      assert.strictEqual(resolveSessionId(''), undefined);
    });
  });
});
