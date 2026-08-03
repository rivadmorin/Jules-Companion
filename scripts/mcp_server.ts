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

import { deploySession } from './deploy_session';
import { mergeSession } from './merge_session';
import { loadSessions } from './utils';
import { runSetup } from './setup';
import { getApiKey, request } from './jules_client';

// Initialize the MCP Server instance
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

// Define resources exposed to the LLM Client (e.g. Claude Desktop)
// Resources provide passive context data that the LLM can read.
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'jules://sessions',
        name: 'Jules Active Sessions',
        description: 'A list of active and historical Jules AI sessions from the local state file.',
        mimeType: 'application/json'
      }
    ]
  };
});

// Handle requests to read the content of the exposed resources
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

// Define the available JSON-RPC tools exposed by the MCP server to external clients.
// Tools represent actionable commands that the LLM can execute.
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
      },
      {
         name: 'get_session_status',
         description: 'Retrieves the current status of a specific Jules session from the API.',
         inputSchema: {
           type: 'object',
           properties: {
             sessionId: {
               type: 'string',
               description: 'The ID of the session to check status for.'
             }
           },
           required: ['sessionId']
         }
      }
    ],
  };
});

/**
 * Intercepts standard output and standard error from a given function and captures it as a string.
 * This is essential for the MCP server because the underlying CLI scripts (like deploy_session)
 * natively print to console.log/console.error. To return this output over JSON-RPC via stdio,
 * we must capture it temporarily, suppress actual stdout emission (which would break the JSON-RPC
 * communication stream), and return it as a string payload.
 *
 * @param {Function} fn - The asynchronous function to execute and capture.
 * @returns {Promise<string>} The captured console output.
 */
async function captureOutput(fn: () => Promise<any> | any): Promise<string> {
    const originalLog = console.log;
    const originalError = console.error;
    const originalExit = process.exit;
    let output = '';

    // Override console.log to append to our local buffer instead of writing to stdout
    console.log = (...args: any[]) => {
        output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
    };

    // Override console.error similarly
    console.error = (...args: any[]) => {
        output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
    };

    // Intercept process.exit to prevent the CLI scripts from terminating the entire MCP server process
    (process as any).exit = (code?: number) => {
        throw new Error(`Process exited with code ${code}`);
    };

    try {
        await fn();
    } catch (err: any) {
        output += `\nCaught Error: ${err.message}`;
    } finally {
        // Always restore original Node.js global properties regardless of success/failure
        process.exit = originalExit;
        console.log = originalLog;
        console.error = originalError;
    }
    return output;
}

// Zod schemas for runtime validation of the incoming JSON-RPC payload arguments
const DeploySessionSchema = z.object({
  type: z.enum(['interactive', 'review', 'start']),
  agents: z.string(),
  task: z.string(),
  mode: z.enum(['code', 'review']).optional(),
  branch: z.string().optional()
});

const MergeSessionSchema = z.object({
  sessionId: z.string().optional(),
  inspect: z.boolean().optional(),
  approve: z.boolean().optional(),
  inspectAll: z.boolean().optional()
});

const GetSessionStatusSchema = z.object({
  sessionId: z.string()
});

// Central execution router for handling incoming tool calls
server.setRequestHandler(CallToolRequestSchema, async (req: { params: { name: string; arguments?: Record<string, any> } }) => {
  switch (req.params.name) {
    case 'deploy_session': {
      // Parse and validate the incoming JSON-RPC structured payload
      const parsed = DeploySessionSchema.safeParse(req.params.arguments);
      if (!parsed.success) {
        return {
          content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
          isError: true,
        };
      }
      const { type, agents, task, mode, branch } = parsed.data;

      // Shim: Translate structured JSON inputs into raw CLI arguments.
      // We manipulate process.argv temporarily because the underlying `deploySession` function
      // was written purely for a CLI environment and parses arguments directly from process.argv.
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
      process.argv = args; // Inject mock CLI arguments

      try {
          // Execute the CLI script while intercepting its console output
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
          // Restore original argv
          process.argv = originalArgv;
      }
    }
    case 'merge_session': {
      // The merge_session tool translates state mutation commands (inspect, approve) to the CLI runner.
        const parsed = MergeSessionSchema.safeParse(req.params.arguments);
        if (!parsed.success) {
          return {
            content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
            isError: true,
          };
        }
        const { sessionId, inspect, approve, inspectAll } = parsed.data;

        // Shim CLI arguments
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
    case 'get_session_status': {
        const parsed = GetSessionStatusSchema.safeParse(req.params.arguments);
        if (!parsed.success) {
          return {
            content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
            isError: true,
          };
        }
        const { sessionId } = parsed.data;

        // Execute direct REST API call rather than going through a CLI script
        const apiKey = getApiKey();
        if (!apiKey) {
            return {
              content: [{ type: 'text', text: 'Error: JULES_API_KEY not found in environment or .env file.' }],
              isError: true,
            };
        }
        try {
            const data = await request(`https://jules.googleapis.com/v1alpha/sessions/${sessionId}`, {
                headers: { 'X-Goog-Api-Key': apiKey }
            });
            return {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        } catch (error: any) {
            return {
              content: [{ type: 'text', text: `Error fetching session status: ${error.message}` }],
              isError: true,
            };
        }
    }

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${req.params.name}`
      );
  }
});

/**
 * Initializes and starts the stdio-based MCP (Model Context Protocol) server for Jules Companion.
 * Connects the server logic to standard input/output streams used by Claude Desktop/Antigravity IDE.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Important: We must use console.error for status messages in MCP because console.log
  // writes to stdout, which is reserved strictly for JSON-RPC communication frames.
  console.error('Jules Companion MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
