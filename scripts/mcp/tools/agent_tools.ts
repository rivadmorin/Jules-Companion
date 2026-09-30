/**
 * Agent inspection and scaffolding MCP tool handlers.
 * @module mcp/tools/agent_tools
 * @description Implements 4 modular JSON-RPC MCP tool handlers for inspecting agent definitions,
 * reading specialist guidelines, scaffolding custom agents, and loading agent journals.
 */

import * as fs from 'fs';
import * as path from 'path';
import { McpToolDefinition } from '../../core/types';
import { getProjectDirs, readAgentJournal, createCustomAgentScaffold } from '../../utils';

/**
 * Array of agent management MCP tool definitions.
 */
export const agentTools: McpToolDefinition[] = [
  {
    name: 'list_agents',
    description: 'Lists all specialized agents and their roles from registry.json.',
    inputSchema: {
      type: 'object',
      properties: { targetDir: { type: 'string', description: 'Target repository root directory' } }
    },
    execute: async (args: any) => {
      // Step 1: Resolve target workspace and references directory paths
      const targetDir = args?.targetDir ? String(args.targetDir) : process.cwd();
      const dirs = getProjectDirs(targetDir);

      // Step 2: Locate local registry.json or fallback to package root catalog
      const registryPath = fs.existsSync(path.join(dirs.agentsDir, 'registry.json'))
        ? path.join(dirs.agentsDir, 'registry.json')
        : path.join(__dirname, '..', '..', '..', 'references', 'agents', 'registry.json');

      if (!fs.existsSync(registryPath)) {
        return { content: [{ type: 'text', text: 'Error: Agents registry.json not found.' }] };
      }

      // Step 3: Parse and serialize agent roster JSON
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
      // Step 1: Validate agent identifier argument
      if (!args?.agentName) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "agentName" is missing.' }] };
      }

      const agentName = String(args.agentName);
      const resolvedDir = args.targetDir ? String(args.targetDir) : process.cwd();
      const dirs = getProjectDirs(resolvedDir);

      // Step 2: Find target markdown definition in workspace or global references
      const agentPath = path.join(dirs.agentsDir, `${agentName.toLowerCase()}.md`);
      const fallbackPath = path.join(__dirname, '..', '..', '..', 'references', 'agents', `${agentName.toLowerCase()}.md`);
      const targetFile = fs.existsSync(agentPath) ? agentPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

      if (!targetFile) {
        return { content: [{ type: 'text', text: `Error: Agent template for '${agentName}' not found.` }] };
      }

      // Step 3: Return raw markdown instructions and boundary rules
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
      // Step 1: Validate required scaffold parameters and boundary arrays
      if (!args?.name || !args?.role || !args?.directives || !Array.isArray(args?.boundariesDo) || !Array.isArray(args?.boundariesDont)) {
        return { content: [{ type: 'text', text: 'Validation Error: Missing required fields (name, role, directives, boundariesDo, boundariesDont).' }] };
      }

      // Step 2: Delegate template scaffolding and registry update to helper
      const { name, role, directives, boundariesDo, boundariesDont, targetDir } = args;
      const res = createCustomAgentScaffold(name, role, directives, boundariesDo, boundariesDont, targetDir);

      // Step 3: Return scaffold confirmation with target file path
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
      // Step 1: Validate agent identifier
      if (!args?.agentName) {
        return { content: [{ type: 'text', text: 'Validation Error: Required field "agentName" is missing.' }] };
      }

      // Step 2: Read persistent agent journal entries from workspace .jules/ directory
      const { agentName, targetDir } = args;
      const content = readAgentJournal(agentName, targetDir);

      // Step 3: Return journal content or fallback message
      return { content: [{ type: 'text', text: content }] };
    }
  }
];
