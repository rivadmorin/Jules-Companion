/**
 * Session lifecycle MCP tool handlers.
 * @module mcp/tools/session_tools
 */

import * as path from 'path';
import * as fs from 'fs';
import { McpToolDefinition } from '../../core/types';
import { deploySessionCore } from '../../deploy_session';
import { mergeSessionCore, checkoutSessionBranch, rollbackSession } from '../../merge_session';
import { loadSessions } from '../../core/storage';
import { getApiKey, request } from '../../client/http';
import { cancelSessionApi, sendMessageApi, pullDiffApi } from '../../client/jules_api';

const TEAM_PRESETS: Record<string, string> = {
  'full-audit': 'sentinel,janitor,annotator,grader',
  'feature-sprint': 'innovator,builder,inspector',
  'refactor-boost': 'modernizer,bolt,inspector'
};

/**
 * Array of session lifecycle MCP tool definitions.
 */
export const sessionTools: McpToolDefinition[] = [
  {
    name: 'deploy_session',
    description: 'Deploys a new Jules session with specialized agents.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Session type: interactive, review, or start', enum: ['interactive', 'review', 'start'] },
        agents: { type: 'string', description: 'Comma-separated list of agent names (e.g. bolt,sentinel)' },
        task: { type: 'string', description: 'Specific task instructions for the agents' },
        mode: { type: 'string', description: 'Execution mode: code or review', enum: ['code', 'review'] },
        branch: { type: 'string', description: 'Repository branch to start from' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['type', 'agents', 'task']
    },
    execute: async (args: any) => {
      if (!args?.type || !args?.agents || !args?.task) {
        return { content: [{ type: 'text', text: 'Validation Error: Required fields (type, agents, task) are missing.' }] };
      }
      const { type, agents, task, mode, branch, targetDir } = args;
      const res = await deploySessionCore({ type, agents, task, mode, branch, targetDir });
      if (!res.success) {
        return { content: [{ type: 'text', text: `Error deploying session: ${res.error}` }] };
      }
      return { content: [{ type: 'text', text: res.output }] };
    }
  },
  {
    name: 'merge_session',
    description: 'Merges, inspects, or approves a completed Jules session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The ID of the session to merge or inspect' },
        inspect: { type: 'boolean', description: 'If true, inspects a specific session (requires sessionId)' },
        approve: { type: 'boolean', description: 'If true, approves a specific session plan (requires sessionId)' },
        inspectAll: { type: 'boolean', description: 'If true, inspects all tracked sessions' }
      }
    },
    execute: async (args: any) => {
      const { sessionId, inspect, approve, inspectAll } = args || {};
      const res = await mergeSessionCore({ sessionId, inspect, approve, inspectAll });
      if (!res.success) {
        return { content: [{ type: 'text', text: `Error merging session: ${res.error}` }] };
      }
      return { content: [{ type: 'text', text: res.output }] };
    }
  },
  {
    name: 'get_session_status',
    description: 'Retrieves current status of a specific Jules session from API.',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string', description: 'The ID of the session' } },
      required: ['sessionId']
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, targetDir } = args;
      const apiKey = getApiKey(targetDir);
      if (!apiKey) return { content: [{ type: 'text', text: 'Error: JULES_API_KEY not found.' }] };
      try {
        const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, {
          headers: { 'X-Goog-Api-Key': apiKey }
        });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error fetching session status: ${error.message}` }] };
      }
    }
  },
  {
    name: 'cancel_session',
    description: 'Cancels an active or queued Google Jules session via API.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to cancel' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['sessionId']
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, targetDir } = args;
      try {
        const res = await cancelSessionApi(sessionId, targetDir);
        return { content: [{ type: 'text', text: `Session ${sessionId} cancelled: ${JSON.stringify(res)}` }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error cancelling session: ${error.message}` }] };
      }
    }
  },
  {
    name: 'send_session_message',
    description: 'Posts a follow-up reply or instruction to a running session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Target session ID' },
        message: { type: 'string', description: 'Message prompt text' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['sessionId', 'message']
    },
    execute: async (args: any) => {
      if (!args?.sessionId || !args?.message) {
        return { content: [{ type: 'text', text: 'Validation Error: Required fields "sessionId" and "message" are missing.' }] };
      }
      const { sessionId, message, targetDir } = args;
      try {
        const res = await sendMessageApi(sessionId, message, targetDir);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error sending message: ${error.message}` }] };
      }
    }
  },
  {
    name: 'retry_failed_session',
    description: 'Redeploys a failed session record with optional new task instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Failed session ID to retry' },
        newTask: { type: 'string', description: 'Optional updated task instructions' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['sessionId']
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, newTask, targetDir } = args;
      const resolvedDir = targetDir || process.cwd();
      const sessions = loadSessions(resolvedDir);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return { content: [{ type: 'text', text: `Error: Session ID ${sessionId} not found in state.` }] };
      const task = newTask || session.task || 'Retry task';
      const res = await deploySessionCore({
        agents: session.agent,
        task,
        type: 'start',
        mode: session.mode || 'code',
        targetDir: resolvedDir
      });
      if (!res.success) {
        return { content: [{ type: 'text', text: `Error retrying session: ${res.error}` }] };
      }
      return { content: [{ type: 'text', text: res.output }] };
    }
  },
  {
    name: 'deploy_team',
    description: 'Deploys multi-agent team presets (full-audit, feature-sprint, refactor-boost).',
    inputSchema: {
      type: 'object',
      properties: {
        preset: { type: 'string', enum: ['full-audit', 'feature-sprint', 'refactor-boost'], description: 'Predefined agent team preset' },
        task: { type: 'string', description: 'Task description for the team' },
        mode: { type: 'string', enum: ['code', 'review'], description: 'Execution mode' },
        branch: { type: 'string', description: 'Starting branch' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['preset', 'task']
    },
    execute: async (args: any) => {
      if (!args?.preset || !args?.task) {
        return { content: [{ type: 'text', text: 'Validation Error: Required fields "preset" and "task" are missing.' }] };
      }
      const { preset, task, mode, branch, targetDir } = args;
      const agentListStr = TEAM_PRESETS[preset];
      if (!agentListStr) {
        return { content: [{ type: 'text', text: `Validation Error: Invalid preset "${preset}". Valid options: ${Object.keys(TEAM_PRESETS).join(', ')}` }] };
      }
      const resolvedDir = targetDir || process.cwd();
      const res = await deploySessionCore({
        agents: agentListStr,
        task,
        type: 'start',
        mode: mode || 'code',
        branch,
        targetDir: resolvedDir
      });
      if (!res.success) {
        return { content: [{ type: 'text', text: `Error deploying team: ${res.error}` }] };
      }
      return { content: [{ type: 'text', text: res.output }] };
    }
  },
  {
    name: 'pull_session_diff',
    description: 'Extracts unidiff patch content from completed session activities without merging.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        outputPath: { type: 'string', description: 'Optional output file path to save patch' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['sessionId']
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, outputPath, targetDir } = args;
      try {
        const patchContent = await pullDiffApi(sessionId, targetDir);
        if (outputPath) {
          const fullPath = path.resolve(targetDir || process.cwd(), outputPath);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, patchContent, 'utf8');
          return { content: [{ type: 'text', text: `Patch saved to ${fullPath}\n\n${patchContent}` }] };
        }
        return { content: [{ type: 'text', text: patchContent }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error pulling diff: ${error.message}` }] };
      }
    }
  },
  {
    name: 'checkout_session_branch',
    description: 'Creates an isolated feature branch and applies the session patch.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Completed session ID' },
        branchName: { type: 'string', description: 'Optional custom branch name' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      },
      required: ['sessionId']
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, branchName, targetDir } = args;
      try {
        const res = await checkoutSessionBranch(sessionId, branchName, targetDir);
        return { content: [{ type: 'text', text: res }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error checking out branch: ${error.message}` }] };
      }
    }
  },
  {
    name: 'rollback_session',
    description: 'Reverts uncommitted stashes or cleans working directory post-merge.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Optional session ID context' },
        targetDir: { type: 'string', description: 'Target repository root directory' }
      }
    },
    execute: async (args: any) => {
      const { sessionId, targetDir } = args || {};
      try {
        const res = await rollbackSession(sessionId, targetDir);
        return { content: [{ type: 'text', text: res }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error rolling back session: ${error.message}` }] };
      }
    }
  }
];
