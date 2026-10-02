---
description: "Display live status and history of all local and cloud Jules sessions"
---

Display live status and history of all Google Jules sessions using the `jules-companion:get_session_status` MCP tool (or CLI fallback `node dist/jules_client.js list --json`).

## Execution Directives
1. Query registered local sessions from `.jules-companion/sessions.json` and sync with the Google Jules REST API.
2. Present a clean overview table showing:
   - Session ID
   - Assigned Agent
   - Current Status (`RUNNING`, `AWAITING_PLAN_APPROVAL`, `AWAITING_USER_INPUT`, `COMPLETED`, `MERGED`, `FAILED`)
   - Target Branch
   - Task Summary
