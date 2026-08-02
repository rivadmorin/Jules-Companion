import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { deploySession } from './deploy_session.js';
import { mergeSession } from './merge_session.js';
import { runSetup } from './setup.js';

const server = new Server(
  {
    name: 'jules-companion-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the available tools exposed by the MCP server to external clients.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'deploy_session',
        description: 'Deploys a new Jules session with specialized agents.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Session type: interactive, review, or start',
              enum: ['interactive', 'review', 'start']
            },
            agents: {
              type: 'string',
              description: 'Comma-separated list of agent names (e.g. bolt,sentinel)'
            },
            task: {
              type: 'string',
              description: 'Specific task instructions for the agents'
            },
            mode: {
              type: 'string',
              description: 'Execution mode: code or review',
              enum: ['code', 'review']
            },
            branch: {
              type: 'string',
              description: 'Repository branch to start from'
            }
          },
          required: ['type', 'agents', 'task']
        }
      },
      {
        name: 'merge_session',
        description: 'Merges, inspects, or approves a completed Jules session.',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'The ID of the session to merge or inspect'
            },
            inspect: {
              type: 'boolean',
              description: 'If true, inspects a specific session (requires sessionId)'
            },
            approve: {
              type: 'boolean',
              description: 'If true, approves a specific session plan (requires sessionId)'
            },
            inspectAll: {
              type: 'boolean',
              description: 'If true, inspects all tracked sessions'
            }
          }
        }
      },
      {
         name: 'setup_workspace',
         description: 'Initializes the Jules workspace staging environment.',
         inputSchema: {
           type: 'object',
           properties: {}
         }
      }
    ],
  };
});

// We need to capture console output since the existing functions use it extensively
/**
 * Intercepts standard output and standard error from a given function and captures it as a string.
 * Essential for redirecting CLI-based script output to MCP text responses.
 *
 * @param {Function} fn - The asynchronous function to execute and capture.
 * @returns {Promise<string>} The captured console output.
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


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case 'deploy_session': {
      const { type, agents, task, mode, branch } = request.params.arguments as any;

      // Override process.argv for the CLI script
      const args = [
          'node',
          'dist/deploy_session.js',
          '--type', type,
          '--agents', agents,
          '--task', task
      ];
      if (mode) args.push('--mode', mode);
      if (branch) args.push('--branch', branch);

      const originalArgv = process.argv;
      process.argv = args;

      try {
          const output = await captureOutput(deploySession);
          return {
            content: [{ type: 'text', text: output }],
          };
      } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
          }
      } finally {
          process.argv = originalArgv;
      }
    }
    case 'merge_session': {
        const { sessionId, inspect, approve, inspectAll } = request.params.arguments as any;

        const args = ['node', 'dist/merge_session.js'];
        if (sessionId) args.push('--id', sessionId);
        if (inspect) args.push('--inspect');
        if (approve) args.push('--approve');
        if (inspectAll) args.push('--inspect-all');

        const originalArgv = process.argv;
        process.argv = args;

        try {
            const output = await captureOutput(mergeSession);
            return {
              content: [{ type: 'text', text: output }],
            };
        } catch (error: any) {
            return {
              content: [{ type: 'text', text: `Error: ${error.message}` }],
              isError: true,
            }
        } finally {
            process.argv = originalArgv;
        }
    }
    case 'setup_workspace': {
        try {
            const output = await captureOutput(runSetup);
            return {
              content: [{ type: 'text', text: output }],
            };
        } catch (error: any) {
            return {
              content: [{ type: 'text', text: `Error: ${error.message}` }],
              isError: true,
            }
        }
    }
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

/**
 * Initializes and starts the stdio-based MCP (Model Context Protocol) server for Jules Companion.
 *
 * @returns {Promise<void>}
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
