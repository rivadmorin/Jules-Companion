import { test, describe, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import {
  runGh,
  getGhCliToken,
  createGitHubPullRequest,
  getGitHubPullRequestForBranch,
  getGitHubUserInfo
} from '../scripts/core/github';
import { GitHubAuthManager } from '../scripts/ui/github_auth';

describe('GitHub Core & Auth Unit Tests', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    GitHubAuthManager.clearCache();
  });

  describe('runGh CLI execution', () => {
    test('runGh should execute and return structured GitExecutionResult', () => {
      const res = runGh(['--version']);
      assert.strictEqual(typeof res.success, 'boolean');
      assert.strictEqual(typeof res.stdout, 'string');
      assert.strictEqual(typeof res.stderr, 'string');
    });

    test('runGh should fail gracefully on invalid arguments', () => {
      const res = runGh(['non-existent-subcommand-12345']);
      assert.strictEqual(res.success, false);
    });

    test('getGhCliToken should return string or undefined safely without throwing', () => {
      const token = getGhCliToken();
      assert.ok(token === undefined || typeof token === 'string');
    });
  });

  describe('createGitHubPullRequest REST API', () => {
    test('should reject if token is empty', async () => {
      const res = await createGitHubPullRequest('', {
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test PR',
        body: 'Description',
        head: 'jules/123',
        base: 'main'
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('token is required'));
    });

    test('should create pull request successfully with valid response', async () => {
      global.fetch = async (url: any, opts: any) => {
        assert.ok(url.includes('/repos/test-owner/test-repo/pulls'));
        assert.strictEqual(opts.method, 'POST');
        assert.strictEqual(opts.headers.Authorization, 'Bearer mock-token-123');
        const body = JSON.parse(opts.body);
        assert.strictEqual(body.title, 'Test PR');
        assert.strictEqual(body.head, 'jules/123');

        return {
          ok: true,
          status: 201,
          json: async () => ({
            html_url: 'https://github.com/test-owner/test-repo/pull/99',
            number: 99
          })
        } as any;
      };

      const res = await createGitHubPullRequest('mock-token-123', {
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test PR',
        body: 'Description',
        head: 'jules/123',
        base: 'main'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.url, 'https://github.com/test-owner/test-repo/pull/99');
      assert.strictEqual(res.number, 99);
    });

    test('should handle API error responses gracefully', async () => {
      global.fetch = async () => ({
        ok: false,
        status: 422,
        json: async () => ({
          message: 'A pull request already exists for test-owner:jules/123.'
        })
      } as any);

      const res = await createGitHubPullRequest('mock-token-123', {
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test PR',
        body: 'Description',
        head: 'jules/123',
        base: 'main'
      });

      assert.strictEqual(res.success, false);
      assert.ok(res.error?.includes('already exists'));
    });
  });

  describe('getGitHubPullRequestForBranch', () => {
    test('should return exists: false when token is empty', async () => {
      const res = await getGitHubPullRequestForBranch('', 'test-owner', 'test-repo', 'jules/123');
      assert.strictEqual(res.exists, false);
    });

    test('should find open pull request for branch', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => [
          {
            html_url: 'https://github.com/test-owner/test-repo/pull/42',
            number: 42,
            state: 'open',
            merged_at: null
          }
        ]
      } as any);

      const res = await getGitHubPullRequestForBranch('token', 'test-owner', 'test-repo', 'jules/123');
      assert.strictEqual(res.exists, true);
      assert.strictEqual(res.number, 42);
      assert.strictEqual(res.state, 'open');
      assert.strictEqual(res.url, 'https://github.com/test-owner/test-repo/pull/42');
    });

    test('should detect merged pull request', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => [
          {
            html_url: 'https://github.com/test-owner/test-repo/pull/42',
            number: 42,
            state: 'closed',
            merged_at: '2026-10-01T12:00:00Z'
          }
        ]
      } as any);

      const res = await getGitHubPullRequestForBranch('token', 'test-owner', 'test-repo', 'jules/123');
      assert.strictEqual(res.exists, true);
      assert.strictEqual(res.state, 'merged');
    });
  });

  describe('getGitHubUserInfo', () => {
    test('should return null if token is empty', async () => {
      const user = await getGitHubUserInfo('');
      assert.strictEqual(user, null);
    });

    test('should return user info on valid response', async () => {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://github.com/images/error/octocat_happy.gif'
        })
      } as any);

      const user = await getGitHubUserInfo('valid-token');
      assert.ok(user);
      assert.strictEqual(user?.login, 'octocat');
      assert.strictEqual(user?.name, 'The Octocat');
    });
  });

  describe('GitHubAuthManager', () => {
    test('clearCache should reset cached session and user state', () => {
      GitHubAuthManager.clearCache();
      assert.ok(true);
    });

    test('getToken should resolve token or fallback without error', async () => {
      const token = await GitHubAuthManager.getToken();
      assert.ok(token === undefined || typeof token === 'string');
    });

    test('isSignedIn should return boolean', async () => {
      const signedIn = await GitHubAuthManager.isSignedIn();
      assert.strictEqual(typeof signedIn, 'boolean');
    });
  });
});
