---
description: "Deploy a new Google Jules cloud coding session with a specialized agent"
---

Deploy a new Google Jules cloud coding session using the `jules-companion:deploy_session` MCP tool (or CLI fallback `node dist/deploy_session.js`).

## Usage Pattern
`/jules-deploy <agent> "<task>"`

- **`<agent>`**: Choose from the 63 specialist agent personas (e.g., `bolt`, `speedster`, `builder`, `alchemist`, `conduit`, `gatekeeper`, `modernizer`, etc.).
- **`<task>`**: Specific description of what needs to be implemented or changed.

## Execution Directives
1. Parse the requested agent and task from the prompt.
2. Invoke `deploy_session` MCP tool with:
   - `type`: `"start"`
   - `agents`: assigned agent name
   - `task`: task description
   - `mode`: `"code"`
3. Report the deployed session ID and Google Jules web URL.
