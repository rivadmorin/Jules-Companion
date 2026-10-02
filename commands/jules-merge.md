---
description: "Safely merge an inspected session into the current target branch (Stage 2)"
---

Merge a reviewed and approved Google Jules session into the target branch using the `jules-companion:merge_session` MCP tool with `approve: true` (or CLI fallback `node dist/merge_session.js --approve <sessionId>`).

## Usage Pattern
`/jules-merge <sessionId>`

## Execution Directives
1. Extract the `sessionId` from the argument.
2. Verify safety gate (no concurrent active sessions modifying the repo).
3. Safely merge the review branch `jules/review-<sessionId>` into the target branch (`git merge --no-edit`).
4. Delete the temporary review branch and update `sessions.json` status to `merged`.
5. Restore the developer's original stash.
