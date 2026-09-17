/**
 * Agent inspection and scaffolding MCP tool handlers.
 * @module mcp/tools/agent_tools
 */

import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { McpToolDefinition } from '../types';
import { getProjectDirs, readAgentJournal, createCustomAgentScaffold } from '../../utils';

const ListAgentsSchema = z.object({
  targetDir: z.string().optional()
});

const GetAgentInfoSchema = z.object({
  agentName: z.string(),
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

const ReadAgentJournalSchema = z.object({
  agentName: z.string(),
  targetDir: z.string().optional()
});

/**
 * Array of agent management MCP tool definitions.
 */
export const agentTools: McpToolDefinition[] = [
  {
    name: 'list_agents',
    description: 'Lists all 30 specialized agents and their roles from registry.json.',
    inputSchema: {
      type: 'object',
      properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
    },
    execute: async (args: any) => {
      const parsed = ListAgentsSchema.safeParse(args);
      const targetDir = parsed.success && parsed.data.targetDir ? parsed.data.targetDir : process.cwd();
      const dirs = getProjectDirs(targetDir);
      const registryPath = fs.existsSync(path.join(dirs.agentsDir, 'registry.json'))
        ? path.join(dirs.agentsDir, 'registry.json')
        : path.join(__dirname, '..', '..', '..', 'references', 'agents', 'registry.json');
      if (!fs.existsSync(registryPath)) {
        return { content: [{ type: 'text', text: 'Error: Agents registry.json not found.' }] };
      }
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      return { content: [{ type: 'text', text: JSON.stringify(registry, null, 2) }] };
    }
  },
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
    },
    execute: async (args: any) => {
      const parsed = GetAgentInfoSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { agentName, targetDir } = parsed.data;
      const resolvedDir = targetDir || process.cwd();
      const dirs = getProjectDirs(resolvedDir);
      const agentPath = path.join(dirs.agentsDir, `${agentName.toLowerCase()}.md`);
      const fallbackPath = path.join(__dirname, '..', '..', '..', 'references', 'agents', `${agentName.toLowerCase()}.md`);
      const targetFile = fs.existsSync(agentPath) ? agentPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);
      if (!targetFile) {
        return { content: [{ type: 'text', text: `Error: Agent template for '${agentName}' not found.` }] };
      }
      const content = fs.readFileSync(targetFile, 'utf8');
      return { content: [{ type: 'text', text: content }] };
    }
  },
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
    },
    execute: async (args: any) => {
      const parsed = CreateCustomAgentSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { name, role, directives, boundariesDo, boundariesDont, targetDir } = parsed.data;
      const res = createCustomAgentScaffold(name, role, directives, boundariesDo, boundariesDont, targetDir);
      return { content: [{ type: 'text', text: `Successfully scaffolded custom agent template at: ${res.agentFile}` }] };
    }
  },
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
    },
    execute: async (args: any) => {
      const parsed = ReadAgentJournalSchema.safeParse(args);
      if (!parsed.success) return { content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }] };
      const { agentName, targetDir } = parsed.data;
      const content = readAgentJournal(agentName, targetDir);
      return { content: [{ type: 'text', text: content }] };
    }
  }
];
