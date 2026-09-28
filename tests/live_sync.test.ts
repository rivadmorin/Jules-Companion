import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { LiveSyncManager } from '../scripts/ui/live_sync';

describe('LiveSyncManager Unit Tests', () => {
  test('should initialize in inactive state', () => {
    const manager = new LiveSyncManager(() => process.cwd(), () => {});
    assert.strictEqual(manager.isActive(), false);
  });

  test('toggle should alternate running state and stop cleanly', () => {
    let updateFired = 0;
    const manager = new LiveSyncManager(() => process.cwd(), () => {
      updateFired++;
    });

    const state1 = manager.toggle();
    assert.strictEqual(state1, true);
    assert.strictEqual(manager.isActive(), true);

    const state2 = manager.toggle();
    assert.strictEqual(state2, false);
    assert.strictEqual(manager.isActive(), false);

    manager.stop();
  });
});
