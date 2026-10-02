---
description: "Run environment diagnostics for Jules Companion (API key, Git remote, gh CLI, Node.js)"
---

Run environment integrity diagnostics using the `jules-companion:run_doctor` MCP tool (or CLI fallback `node dist/setup.js`).

## Execution Directives
1. Verify presence and validity of `JULES_API_KEY` in environment or `.env`.
2. Check Git repository configuration and remote origin URL.
3. Validate GitHub CLI (`gh`) presence and authentication status.
4. Verify local agent registry integrity (`references/agents/registry.json`).
5. Output a diagnostic health table with pass/fail markers.
