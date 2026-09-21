/**
 * Session lifecycle MCP tool handlers.
 * @module mcp/tools/session_tools
 */

import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { McpToolDefinition } from '../types';
import { captureOutput } from '../../utils';
import { deploySession, deploySessionWithAgents } from '../../deploy_session';
import { mergeSession, checkoutSessionBranch, rollbackSession } from '../../merge_session';
import { loadSessions } from '../../core/storage';
import { getApiKey, request } from '../../client/http';
import { cancelSessionApi, sendMessageApi, pullDiffApi } from '../../client/jules_api';

const TEAM_PRESETS: Record<string, string> = {
  'full-audit': 'sentinel,janitor,annotator,grader',
  'feature-sprint': 'innovator,builder,inspector',
  'refactor-boost': 'modernizer,bolt,inspector'
};

const DeploySessionSchema = z.object({
  type: z.enum(['interactive', 'review', 'start']),
  agents: z.string(),
  task: z.string(),
  mode: z.enum(['code', 'review']).optional(),
  branch: z.string().optional(),
  targetDir: z.string().optional()
});

const MergeSessionSchema = z.object({
  sessionId: z.string().optional(),
  inspect: z.boolean().optional(),
  approve: z.boolean().optional(),
  inspectAll: z.boolean().optional()
});

const GetSessionStatusSchema = z.object({
  sessionId: z.string(),
  targetDir: z.string().optional()
});

const CancelSessionSchema = z.object({
  sessionId: z.string(),
  targetDir: z.string().optional()
});

const SendSessionMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
  targetDir: z.string().optional()
});

const RetryFailedSessionSchema = z.object({
  sessionId: z.string(),
  newTask: z.string().optional(),
  targetDir: z.string().optional()
});

const DeployTeamSchema = z.object({
  preset: z.enum(['full-audit', 'feature-sprint', 'refactor-boost']),
  task: z.string(),
  mode: z.enum(['code', 'review']).optional(),
  branch: z.string().optional(),
  targetDir: z.string().optional()
});

const PullSessionDiffSchema = z.object({
  sessionId: z.string(),
  outputPath: z.string().optional(),
  targetDir: z.string().optional()
});

const CheckoutSessionBranchSchema = z.object({
  sessionId: z.string(),
  branchName: z.string().optional(),
  targetDir: z.string().optional()
});

const RollbackSessionSchema = z.object({
  sessionId: z.string().optional(),
  targetDir: z.string().optional()
});

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
      const parsed = DeploySessionSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { type, agents, task, mode, branch, targetDir } = parsed.data;
      const cmdArgs = ['node', 'dist/deploy_session.js', '--type', type, '--agents', agents, '--task', task];
      if (mode) cmdArgs.push('--mode', mode);
      if (branch) cmdArgs.push('--branch', branch);
      if (targetDir) cmdArgs.push('--target', targetDir);

      const originalArgv = process.argv;
      process.argv = cmdArgs;
      try {
        const output = await captureOutput(deploySession);
        return { content: [{ type: 'text', text: output }] };
      } finally {
        process.argv = originalArgv;
      }
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
      const parsed = MergeSessionSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, inspect, approve, inspectAll } = parsed.data;
      const cmdArgs = ['node', 'dist/merge_session.js'];
      if (sessionId) cmdArgs.push('--id', sessionId);
      if (inspect) cmdArgs.push('--inspect');
      if (approve) cmdArgs.push('--approve');
      if (inspectAll) cmdArgs.push('--inspect-all');

      const originalArgv = process.argv;
      process.argv = cmdArgs;
      try {
        const output = await captureOutput(mergeSession);
        return { content: [{ type: 'text', text: output }] };
      } finally {
        process.argv = originalArgv;
      }
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
      const parsed = GetSessionStatusSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, targetDir } = parsed.data;
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
      const parsed = CancelSessionSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, targetDir } = parsed.data;
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
      const parsed = SendSessionMessageSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, message, targetDir } = parsed.data;
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
      const parsed = RetryFailedSessionSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, newTask, targetDir } = parsed.data;
      const resolvedDir = targetDir || process.cwd();
      const sessions = loadSessions(resolvedDir);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return { content: [{ type: 'text', text: `Error: Session ID ${sessionId} not found in state.` }] };
      const task = newTask || session.task || 'Retry task';
      const output = await captureOutput(() =>
        deploySessionWithAgents(session.agent, task, 'start', session.mode || 'code', undefined, resolvedDir)
      );
      return { content: [{ type: 'text', text: output }] };
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
      const parsed = DeployTeamSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { preset, task, mode, branch, targetDir } = parsed.data;
      const agentListStr = TEAM_PRESETS[preset];
      const resolvedDir = targetDir || process.cwd();
      const output = await captureOutput(() =>
        deploySessionWithAgents(agentListStr, task, 'start', mode || 'code', branch, resolvedDir)
      );
      return { content: [{ type: 'text', text: output }] };
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
      const parsed = PullSessionDiffSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, outputPath, targetDir } = parsed.data;
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
      const parsed = CheckoutSessionBranchSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { sessionId, branchName, targetDir } = parsed.data;
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
      const parsed = RollbackSessionSchema.safeParse(args);
      const { sessionId, targetDir } = parsed.success ? parsed.data : { sessionId: undefined, targetDir: undefined };
      const res = await rollbackSession(sessionId, targetDir);
      return { content: [{ type: 'text', text: res }] };
    }
  }
];
