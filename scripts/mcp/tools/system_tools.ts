/**
 * System and utility MCP tool handlers.
 * @module mcp/tools/system_tools
 */

import { spawnSync } from 'child_process';
import { McpToolDefinition } from '../../core/types';
import { autoProcessCore } from '../../auto_process';
import { runSetup } from '../../setup';
import { runDoctorChecks, getReviewReports } from '../../utils';
import { listSourcesApi } from '../../client/jules_api';

/**
 * Array of system and utility MCP tool definitions.
 */
export const systemTools: McpToolDefinition[] = [
  {
    name: 'auto_process',
    description: 'Auto-approves plans and replies to prompts for active Jules sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'Process all active sessions' },
        sessionId: { type: 'string', description: 'Specific session ID to process' },
        reply: { type: 'string', description: 'Optional custom reply message' }
      }
    },
    execute: async (args: any) => {
      const { all, sessionId, reply } = args || {};
      const res = await autoProcessCore({ all, sessionId, reply });
      if (!res.success) {
        return { content: [{ type: 'text', text: `Error: ${res.error}` }] };
      }
      return { content: [{ type: 'text', text: res.output }] };
    }
  },
  {
    name: 'setup_workspace',
    description: 'Initializes the Jules workspace staging environment.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => {
      try {
        const res = await runSetup();
        const text = `Workspace setup completed with status: [${res.status}]\nPlatform: ${res.os}\nDependencies: ${JSON.stringify(res.dependencies)}\nSynchronized ${res.copiedFiles.length} agent template(s).`;
        return { content: [{ type: 'text', text }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
    }
  },
  {
    name: 'list_sources',
    description: 'Lists linked GitHub Cloud sources registered under this Google Jules account.',
    inputSchema: {
      type: 'object',
      properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
    },
    execute: async (args: any) => {
      const targetDir = args?.targetDir ? String(args.targetDir) : undefined;
      try {
        const sources = await listSourcesApi(targetDir);
        return { content: [{ type: 'text', text: JSON.stringify(sources, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error fetching sources: ${error.message}` }] };
      }
    }
  },
  {
    name: 'run_doctor',
    description: 'Runs environment health checks (.env, JULES_API_KEY, git remote, gh CLI).',
    inputSchema: {
      type: 'object',
      properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
    },
    execute: async (args: any) => {
      const targetDir = args?.targetDir ? String(args.targetDir) : process.cwd();
      const report = runDoctorChecks(targetDir);
      return { content: [{ type: 'text', text: JSON.stringify(report, null, 2) }] };
    }
  },
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
    },
    execute: async (args: any) => {
      if (!args?.sessionId) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "sessionId" is missing.' }] };
      }
      const { sessionId, title, base, targetDir } = args;
      const resolvedDir = targetDir || process.cwd();
      const prTitle = title || `Jules Companion Patch (Session ${sessionId})`;
      const baseBranch = base || 'main';
      const ghRes = spawnSync(
        'gh',
        ['pr', 'create', '--title', prTitle, '--body', `Automated PR from Jules session ${sessionId}`, '--base', baseBranch],
        {
          encoding: 'utf8',
          cwd: resolvedDir
        }
      );
      if (ghRes.status === 0) {
        return { content: [{ type: 'text', text: `PR created successfully: ${ghRes.stdout}` }] };
      }
      return { content: [{ type: 'text', text: `GitHub PR creation output: ${ghRes.stderr || ghRes.stdout}` }] };
    }
  },
  {
    name: 'get_review_reports',
    description: 'Scans and lists markdown audit reports in docs/jules-reviews/.',
    inputSchema: {
      type: 'object',
      properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
    },
    execute: async (args: any) => {
      const targetDir = args?.targetDir ? String(args.targetDir) : process.cwd();
      const reports = getReviewReports(targetDir);
      return { content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }] };
    }
  }
];
