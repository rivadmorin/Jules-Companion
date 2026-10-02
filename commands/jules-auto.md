---
description: "Run autonomous processing loop to monitor cloud sessions, auto-approve plans, and reply to prompts"
---

Execute autonomous monitoring for active Google Jules sessions using the `jules-companion:auto_process` MCP tool (or CLI fallback `node dist/auto_process.js --all`).

## Execution Directives
1. Invoke the `auto_process` MCP tool.
2. The engine polls all running and pending sessions.
3. Automatically triggers `approvePlan` for sessions waiting in `AWAITING_PLAN_APPROVAL`.
4. Responds with appropriate context for sessions in `AWAITING_USER_INPUT`.
5. Outputs a summary of processed sessions and current states.
