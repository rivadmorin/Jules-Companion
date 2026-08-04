/**
 * @file mcp_server.ts
 * @description Primary Model Context Protocol (MCP) server implementation for Jules Companion.
 * Exposes 20 specialized tools and resources over stdio JSON-RPC streams to LLM clients
 * (e.g. Antigravity IDE, Claude Desktop, Cursor, OpenCode).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { deploySession, deploySessionWithAgents } from './deploy_session';
import { mergeSession, checkoutSessionBranch, rollbackSession } from './merge_session';
import { autoProcess } from './auto_process';
import {
  loadSessions,
  getProjectDirs,
  runDoctorChecks,
  readAgentJournal,
  getReviewReports,
  createCustomAgentScaffold,
  runGit
} from './utils';
import { runSetup } from './setup';
import {
  getApiKey,
  request,
  cancelSessionApi,
  sendMessageApi,
  listSourcesApi,
  pullDiffApi
} from './jules_client';

/**
 * Core MCP Server Instance.
 */
const server = new Server(
  {
    name: 'jules-companion-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

/**
 * Resource listing handler for passive context injection.
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'jules://sessions',
        name: 'Jules Active Sessions',
        description: 'A list of active and historical Jules AI sessions from local state.',
        mimeType: 'application/json'
      }
    ]
  };
});

/**
 * Resource read handler.
 */
server.setRequestHandler(ReadResourceRequestSchema, async (req: { params: { uri: string } }) => {
  if (req.params.uri === 'jules://sessions') {
    const sessions = loadSessions();
    return {
      contents: [
        {
          uri: req.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(sessions, null, 2)
        }
      ]
    };
  }
  throw new McpError(ErrorCode.InvalidRequest, `Resource not found: ${req.params.uri}`);
});

/**
 * Tool definitions listing handler exposing all 20 MCP tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // 1. deploy_session
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
        }
      },
      // 2. merge_session
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
        }
      },
      // 3. auto_process
      {
        name: 'auto_process',
        description: 'Polls and auto-processes pending Jules cloud sessions (auto-approves plans & auto-replies).',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, auto-processes all registered sessions' },
            sessionId: { type: 'string', description: 'Specific session ID to process' },
            reply: { type: 'string', description: 'Optional custom reply message' }
          }
        }
      },
      // 4. setup_workspace
      {
        name: 'setup_workspace',
        description: 'Initializes the Jules workspace staging environment.',
        inputSchema: { type: 'object', properties: {} }
      },
      // 5. get_session_status
      {
        name: 'get_session_status',
        description: 'Retrieves current status of a specific Jules session from API.',
        inputSchema: {
          type: 'object',
          properties: { sessionId: { type: 'string', description: 'The ID of the session' } },
          required: ['sessionId']
        }
      },
      // 6. list_agents
      {
        name: 'list_agents',
        description: 'Lists all 30 specialized agents and their roles from registry.json.',
        inputSchema: {
          type: 'object',
          properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
        }
      },
      // 7. get_agent_info
      {
        name: 'get_agent_info',
        description: 'Reads markdown instructions and boundaries for a target agent.',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent identifier (e.g. annotator, bolt)' },
            targetDir: { type: 'string', description: 'Target repository root directory' }
          },
          required: ['agentName']
        }
      },
      // 8. list_sources
      {
        name: 'list_sources',
        description: 'Lists linked GitHub Cloud sources registered under this Google Jules account.',
        inputSchema: {
          type: 'object',
          properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
        }
      },
      // 9. run_doctor
      {
        name: 'run_doctor',
        description: 'Runs environment health checks (.env, JULES_API_KEY, git remote, gh CLI).',
        inputSchema: {
          type: 'object',
          properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
        }
      },
      // 10. create_custom_agent
      {
        name: 'create_custom_agent',
        description: 'Scaffolds a custom specialized agent template file and updates registry.json.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Lowercase unique identifier (e.g. security-auditor)' },
            role: { type: 'string', description: 'Human readable agent role title' },
            directives: { type: 'string', description: 'Core execution directives and mission statement' },
            boundariesDo: { type: 'array', items: { type: 'string' }, description: 'List of allowed actions' },
            boundariesDont: { type: 'array', items: { type: 'string' }, description: 'List of forbidden actions' },
            targetDir: { type: 'string', description: 'Target repository root directory' }
          },
          required: ['name', 'role', 'directives', 'boundariesDo', 'boundariesDont']
        }
      },
      // 11. cancel_session
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
        }
      },
      // 12. send_session_message
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
        }
      },
      // 13. retry_failed_session
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
        }
      },
      // 14. deploy_team
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
        }
      },
      // 15. pull_session_diff
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
        }
      },
      // 16. checkout_session_branch
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
        }
      },
      // 17. create_github_pr
      {
        name: 'create_github_pr',
        description: 'Creates a GitHub Pull Request using gh CLI for a completed session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Completed session ID' },
            title: { type: 'string', description: 'Optional PR Title' },
            base: { type: 'string', description: 'Base branch (defaults to main)' },
            targetDir: { type: 'string', description: 'Target repository root directory' }
          },
          required: ['sessionId']
        }
      },
      // 18. read_agent_journal
      {
        name: 'read_agent_journal',
        description: 'Reads critical learnings logged in .jules/<agent>.md.',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: { type: 'string', description: 'Agent identifier (e.g. annotator)' },
            targetDir: { type: 'string', description: 'Target repository root directory' }
          },
          required: ['agentName']
        }
      },
      // 19. get_review_reports
      {
        name: 'get_review_reports',
        description: 'Scans and lists markdown audit reports in docs/jules-reviews/.',
        inputSchema: {
          type: 'object',
          properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
        }
      },
      // 20. rollback_session
      {
        name: 'rollback_session',
        description: 'Reverts uncommitted stashes or cleans working directory post-merge.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Optional session ID context' },
            targetDir: { type: 'string', description: 'Target repository root directory' }
          }
        }
      }
    ]
  };
});

/**
 * Intercepts stdout/stderr during CLI runner executions to prevent stdio stream corruption.
 */
async function captureOutput(fn: () => Promise<any> | any): Promise<string> {
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  let output = '';

  console.log = (...args: any[]) => {
    output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
  };

  console.error = (...args: any[]) => {
    output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
  };

  (process as any).exit = (code?: number) => {
    throw new Error(`Process exited with code ${code}`);
  };

  try {
    await fn();
  } catch (err: any) {
    output += `\nCaught Error: ${err.message}`;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  }
  return output;
}

// Zod Schemas for runtime argument validation
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

const AutoProcessSchema = z.object({
  all: z.boolean().optional(),
  sessionId: z.string().optional(),
  reply: z.string().optional()
});

const GetSessionStatusSchema = z.object({
  sessionId: z.string(),
  targetDir: z.string().optional()
});

const ListAgentsSchema = z.object({
  targetDir: z.string().optional()
});

const GetAgentInfoSchema = z.object({
  agentName: z.string(),
  targetDir: z.string().optional()
});

const ListSourcesSchema = z.object({
  targetDir: z.string().optional()
});

const RunDoctorSchema = z.object({
  targetDir: z.string().optional()
});

const CreateCustomAgentSchema = z.object({
  name: z.string(),
  role: z.string(),
  directives: z.string(),
  boundariesDo: z.array(z.string()),
  boundariesDont: z.array(z.string()),
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

const CreateGithubPrSchema = z.object({
  sessionId: z.string(),
  title: z.string().optional(),
  base: z.string().optional(),
  targetDir: z.string().optional()
});

const ReadAgentJournalSchema = z.object({
  agentName: z.string(),
  targetDir: z.string().optional()
});

const GetReviewReportsSchema = z.object({
  targetDir: z.string().optional()
});

const RollbackSessionSchema = z.object({
  sessionId: z.string().optional(),
  targetDir: z.string().optional()
});

/**
 * Team presets mapping table.
 */
const TEAM_PRESETS: Record<string, string> = {
  'full-audit': 'sentinel,janitor,annotator,grader',
  'feature-sprint': 'innovator,builder,inspector',
  'refactor-boost': 'modernizer,bolt,inspector'
};

/**
 * Central JSON-RPC CallToolRequest Handler for all 20 MCP Tools.
 */
server.setRequestHandler(CallToolRequestSchema, async (req: { params: { name: string; arguments?: Record<string, any> } }) => {
  switch (req.params.name) {
    case 'deploy_session': {
      const parsed = DeploySessionSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { type, agents, task, mode, branch, targetDir } = parsed.data;
      const args = ['node', 'dist/deploy_session.js', '--type', type, '--agents', agents, '--task', task];
      if (mode) args.push('--mode', mode);
      if (branch) args.push('--branch', branch);
      if (targetDir) args.push('--target', targetDir);

      const originalArgv = process.argv;
      process.argv = args;
      try {
        const output = await captureOutput(deploySession);
        return { content: [{ type: 'text', text: output }] };
      } finally {
        process.argv = originalArgv;
      }
    }

    case 'merge_session': {
      const parsed = MergeSessionSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, inspect, approve, inspectAll } = parsed.data;
      const args = ['node', 'dist/merge_session.js'];
      if (sessionId) args.push('--id', sessionId);
      if (inspect) args.push('--inspect');
      if (approve) args.push('--approve');
      if (inspectAll) args.push('--inspect-all');

      const originalArgv = process.argv;
      process.argv = args;
      try {
        const output = await captureOutput(mergeSession);
        return { content: [{ type: 'text', text: output }] };
      } finally {
        process.argv = originalArgv;
      }
    }

    case 'auto_process': {
      const parsed = AutoProcessSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { all, sessionId, reply } = parsed.data;
      const args = ['node', 'dist/auto_process.js'];
      if (all) args.push('--all');
      if (sessionId) args.push('--session', sessionId);
      if (reply) args.push('--reply', reply);

      const originalArgv = process.argv;
      process.argv = args;
      try {
        const output = await captureOutput(autoProcess);
        return { content: [{ type: 'text', text: output }] };
      } finally {
        process.argv = originalArgv;
      }
    }

    case 'setup_workspace': {
      try {
        const output = await captureOutput(runSetup);
        return { content: [{ type: 'text', text: output }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
      }
    }

    case 'get_session_status': {
      const parsed = GetSessionStatusSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, targetDir } = parsed.data;
      const apiKey = getApiKey(targetDir);
      if (!apiKey) return { content: [{ type: 'text', text: 'Error: JULES_API_KEY not found.' }], isError: true };
      try {
        const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, { headers: { 'X-Goog-Api-Key': apiKey } });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error fetching session status: ${error.message}` }], isError: true };
      }
    }

    case 'list_agents': {
      const parsed = ListAgentsSchema.safeParse(req.params.arguments);
      const targetDir = parsed.success && parsed.data.targetDir ? parsed.data.targetDir : process.cwd();
      const dirs = getProjectDirs(targetDir);
      const registryPath = fs.existsSync(path.join(dirs.agentsDir, 'registry.json'))
        ? path.join(dirs.agentsDir, 'registry.json')
        : path.join(__dirname, '..', 'references', 'agents', 'registry.json');
      if (!fs.existsSync(registryPath)) {
        return { content: [{ type: 'text', text: 'Error: Agents registry.json not found.' }], isError: true };
      }
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      return { content: [{ type: 'text', text: JSON.stringify(registry, null, 2) }] };
    }

    case 'get_agent_info': {
      const parsed = GetAgentInfoSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { agentName, targetDir } = parsed.data;
      const resolvedDir = targetDir || process.cwd();
      const dirs = getProjectDirs(resolvedDir);
      const agentPath = path.join(dirs.agentsDir, `${agentName.toLowerCase()}.md`);
      const fallbackPath = path.join(__dirname, '..', 'references', 'agents', `${agentName.toLowerCase()}.md`);
      const targetFile = fs.existsSync(agentPath) ? agentPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);
      if (!targetFile) {
        return { content: [{ type: 'text', text: `Error: Agent template for '${agentName}' not found.` }], isError: true };
      }
      const content = fs.readFileSync(targetFile, 'utf8');
      return { content: [{ type: 'text', text: content }] };
    }

    case 'list_sources': {
      const parsed = ListSourcesSchema.safeParse(req.params.arguments);
      const targetDir = parsed.success ? parsed.data.targetDir : undefined;
      try {
        const sources = await listSourcesApi(targetDir);
        return { content: [{ type: 'text', text: JSON.stringify(sources, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error fetching sources: ${error.message}` }], isError: true };
      }
    }

    case 'run_doctor': {
      const parsed = RunDoctorSchema.safeParse(req.params.arguments);
      const targetDir = parsed.success && parsed.data.targetDir ? parsed.data.targetDir : process.cwd();
      const report = runDoctorChecks(targetDir);
      return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
    }

    case 'create_custom_agent': {
      const parsed = CreateCustomAgentSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { name, role, directives, boundariesDo, boundariesDont, targetDir } = parsed.data;
      const res = createCustomAgentScaffold(name, role, directives, boundariesDo, boundariesDont, targetDir);
      return { content: [{ type: 'text', text: `Successfully scaffolded custom agent template at: ${res.agentFile}` }] };
    }

    case 'cancel_session': {
      const parsed = CancelSessionSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, targetDir } = parsed.data;
      try {
        const res = await cancelSessionApi(sessionId, targetDir);
        return { content: [{ type: 'text', text: `Session ${sessionId} cancelled: ${JSON.stringify(res)}` }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error cancelling session: ${error.message}` }], isError: true };
      }
    }

    case 'send_session_message': {
      const parsed = SendSessionMessageSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, message, targetDir } = parsed.data;
      try {
        const res = await sendMessageApi(sessionId, message, targetDir);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error sending message: ${error.message}` }], isError: true };
      }
    }

    case 'retry_failed_session': {
      const parsed = RetryFailedSessionSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, newTask, targetDir } = parsed.data;
      const resolvedDir = targetDir || process.cwd();
      const sessions = loadSessions(resolvedDir);
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return { content: [{ type: 'text', text: `Error: Session ID ${sessionId} not found in state.` }], isError: true };
      const task = newTask || session.task || 'Retry task';
      const output = await captureOutput(() => deploySessionWithAgents(session.agent, task, 'start', session.mode || 'code', undefined, resolvedDir));
      return { content: [{ type: 'text', text: output }] };
    }

    case 'deploy_team': {
      const parsed = DeployTeamSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { preset, task, mode, branch, targetDir } = parsed.data;
      const agentListStr = TEAM_PRESETS[preset];
      const resolvedDir = targetDir || process.cwd();
      const output = await captureOutput(() => deploySessionWithAgents(agentListStr, task, 'start', mode || 'code', branch, resolvedDir));
      return { content: [{ type: 'text', text: output }] };
    }

    case 'pull_session_diff': {
      const parsed = PullSessionDiffSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
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
        return { content: [{ type: 'text', text: `Error pulling diff: ${error.message}` }], isError: true };
      }
    }

    case 'checkout_session_branch': {
      const parsed = CheckoutSessionBranchSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, branchName, targetDir } = parsed.data;
      try {
        const res = await checkoutSessionBranch(sessionId, branchName, targetDir);
        return { content: [{ type: 'text', text: res }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error checking out branch: ${error.message}` }], isError: true };
      }
    }

    case 'create_github_pr': {
      const parsed = CreateGithubPrSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { sessionId, title, base, targetDir } = parsed.data;
      const resolvedDir = targetDir || process.cwd();
      const prTitle = title || `Jules Companion Patch (Session ${sessionId})`;
      const baseBranch = base || 'main';
      const ghRes = spawnSync('gh', ['pr', 'create', '--title', prTitle, '--body', `Automated PR from Jules session ${sessionId}`, '--base', baseBranch], {
        encoding: 'utf8',
        cwd: resolvedDir
      });
      if (ghRes.status === 0) {
        return { content: [{ type: 'text', text: `PR created successfully: ${ghRes.stdout}` }] };
      }
      return { content: [{ type: 'text', text: `GitHub PR creation output: ${ghRes.stderr || ghRes.stdout}` }] };
    }

    case 'read_agent_journal': {
      const parsed = ReadAgentJournalSchema.safeParse(req.params.arguments);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }], isError: true };
      const { agentName, targetDir } = parsed.data;
      const content = readAgentJournal(agentName, targetDir);
      return { content: [{ type: 'text', text: content }] };
    }

    case 'get_review_reports': {
      const parsed = GetReviewReportsSchema.safeParse(req.params.arguments);
      const targetDir = parsed.success && parsed.data.targetDir ? parsed.data.targetDir : process.cwd();
      const reports = getReviewReports(targetDir);
      return { content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }] };
    }

    case 'rollback_session': {
      const parsed = RollbackSessionSchema.safeParse(req.params.arguments);
      const { sessionId, targetDir } = parsed.success ? parsed.data : { sessionId: undefined, targetDir: undefined };
      const res = await rollbackSession(sessionId, targetDir);
      return { content: [{ type: 'text', text: res }] };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${req.params.name}`);
  }
});

/**
 * Initializes stdio MCP Server.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jules Companion MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
