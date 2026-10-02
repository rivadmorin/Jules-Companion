---
description: "Deploy an audit-only review session with a specialized agent producing a structured markdown report"
---

Deploy an audit-only review session in Google Jules using the `jules-companion:deploy_session` MCP tool (or CLI fallback `node dist/deploy_session.js`).

## Usage Pattern
`/jules-review <agent> "<task>"`

- **`<agent>`**: Review and advisory personas (e.g., `sentinel`, `critic`, `grader`, `inspector`, `attestor`, `consultant`).
- **`<task>`**: Audit target or code review scope.

## Execution Directives
1. Parse the requested agent and review scope.
2. Invoke `deploy_session` MCP tool with:
   - `type`: `"review"`
   - `agents`: assigned agent name
   - `task`: review task description
   - `mode`: `"review"`
3. The review results will be stored as a Markdown report under `docs/jules-reviews/`.
