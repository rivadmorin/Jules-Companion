import { test, describe } from 'node:test';
import * as assert from 'node:assert';

interface MCPToolCall {
  tool: string;
  args: Record<string, any>;
}

/**
 * Simulates the AI Agent's primary interpretation of a slash command into a native MCP Tool payload.
 *
 * @param prompt - The user input string containing a potential slash command (e.g., "/jules-deploy bolt fix memory leaks").
 * @returns The parsed MCP Tool call object containing tool name and structured JSON arguments, or null if unmapped.
 */
function simulateAIAgentMCP(prompt: string): MCPToolCall | null {
  if (prompt.startsWith('/jules-deploy')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length >= 2) {
      const agent = parts[0];
      const task = parts.slice(1).join(' ');
      return {
        tool: 'deploy_session',
        args: { type: 'start', agents: agent, task, mode: 'code' }
      };
    }
  }

  if (prompt.startsWith('/jules-review')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length >= 2) {
      const agent = parts[0];
      const task = parts.slice(1).join(' ');
      return {
        tool: 'deploy_session',
        args: { type: 'review', agents: agent, task, mode: 'review' }
      };
    }
  }

  if (prompt.startsWith('/jules-status')) {
    return {
      tool: 'get_session_status',
      args: { resource: 'jules://sessions' }
    };
  }

  if (prompt.startsWith('/jules-auto')) {
    return {
      tool: 'auto_process',
      args: { all: true }
    };
  }

  if (prompt.startsWith('/jules-inspect')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length === 1) {
      return {
        tool: 'merge_session',
        args: { sessionId: parts[0], inspect: true }
      };
    }
  }

  if (prompt.startsWith('/jules-merge')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length === 1) {
      return {
        tool: 'merge_session',
        args: { sessionId: parts[0], approve: true }
      };
    }
  }

  return null;
}

/**
 * Simulates the AI Agent's secondary fallback interpretation of a slash command into a CLI terminal string.
 *
 * @param prompt - The user input string containing a potential slash command.
 * @returns The parsed CLI shell command string, or null if unmapped.
 */
function simulateAIAgentCLI(prompt: string): string | null {
  if (prompt.startsWith('/jules-deploy')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length >= 2) {
      const agent = parts[0];
      const task = parts.slice(1).join(' ');
      return `node dist/deploy_session.js --type start --agents ${agent} --task "${task}"`;
    }
  }

  if (prompt.startsWith('/jules-review')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length >= 2) {
      const agent = parts[0];
      const task = parts.slice(1).join(' ');
      return `node dist/deploy_session.js --type review --agents ${agent} --task "${task}"`;
    }
  }

  if (prompt.startsWith('/jules-status')) {
    return 'node dist/jules_client.js list --json';
  }

  if (prompt.startsWith('/jules-auto')) {
    return 'node dist/auto_process.js --all';
  }

  if (prompt.startsWith('/jules-inspect')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length === 1) {
      return `node dist/merge_session.js --inspect ${parts[0]}`;
    }
  }

  if (prompt.startsWith('/jules-merge')) {
    const parts = prompt.split(' ').slice(1);
    if (parts.length === 1) {
      return `node dist/merge_session.js --approve ${parts[0]}`;
    }
  }

  if (prompt.startsWith('/jules-doctor')) {
    return 'node dist/jules_menu.js --doctor';
  }

  return null;
}

describe('AI Agent Primary MCP Tool Invocation Verification', () => {
  test('should parse /jules-deploy to native MCP deploy_session payload', () => {
    const mcp = simulateAIAgentMCP('/jules-deploy bolt fix memory leaks');
    assert.deepStrictEqual(mcp, {
      tool: 'deploy_session',
      args: { type: 'start', agents: 'bolt', task: 'fix memory leaks', mode: 'code' }
    });
  });

  test('should parse /jules-review to native MCP deploy_session payload', () => {
    const mcp = simulateAIAgentMCP('/jules-review sentinel check security issues');
    assert.deepStrictEqual(mcp, {
      tool: 'deploy_session',
      args: { type: 'review', agents: 'sentinel', task: 'check security issues', mode: 'review' }
    });
  });

  test('should parse /jules-auto to native MCP auto_process payload', () => {
    const mcp = simulateAIAgentMCP('/jules-auto');
    assert.deepStrictEqual(mcp, {
      tool: 'auto_process',
      args: { all: true }
    });
  });

  test('should parse /jules-inspect to native MCP merge_session payload', () => {
    const mcp = simulateAIAgentMCP('/jules-inspect session-12345');
    assert.deepStrictEqual(mcp, {
      tool: 'merge_session',
      args: { sessionId: 'session-12345', inspect: true }
    });
  });

  test('should parse /jules-merge to native MCP merge_session payload', () => {
    const mcp = simulateAIAgentMCP('/jules-merge session-12345');
    assert.deepStrictEqual(mcp, {
      tool: 'merge_session',
      args: { sessionId: 'session-12345', approve: true }
    });
  });
});

describe('AI Agent Secondary CLI Fallback Verification', () => {
  test('should parse /jules-deploy to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-deploy bolt fix memory leaks');
    assert.strictEqual(cmd, 'node dist/deploy_session.js --type start --agents bolt --task "fix memory leaks"');
  });

  test('should parse /jules-review to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-review sentinel check security issues');
    assert.strictEqual(cmd, 'node dist/deploy_session.js --type review --agents sentinel --task "check security issues"');
  });

  test('should parse /jules-status to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-status');
    assert.strictEqual(cmd, 'node dist/jules_client.js list --json');
  });

  test('should parse /jules-auto to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-auto');
    assert.strictEqual(cmd, 'node dist/auto_process.js --all');
  });

  test('should parse /jules-inspect to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-inspect session-12345');
    assert.strictEqual(cmd, 'node dist/merge_session.js --inspect session-12345');
  });

  test('should parse /jules-merge to fallback CLI string', () => {
    const cmd = simulateAIAgentCLI('/jules-merge session-12345');
    assert.strictEqual(cmd, 'node dist/merge_session.js --approve session-12345');
  });
});
