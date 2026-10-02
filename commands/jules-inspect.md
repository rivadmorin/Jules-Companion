---
description: "Inspect a completed session by pulling its patch into an isolated review branch (Stage 1)"
---

Inspect a completed Google Jules session using the `jules-companion:merge_session` MCP tool with `inspect: true` (or CLI fallback `node dist/merge_session.js --inspect <sessionId>`).

## Usage Pattern
`/jules-inspect <sessionId>`

## Execution Directives
1. Extract the `sessionId` from the argument.
2. Stash local uncommitted WIP via pre-flight safety check.
3. Check out an isolated review branch `jules/review-<sessionId>`.
4. Download the unidiff patch and test application with `git apply --check`.
5. Generate an inspection report under `docs/jules-reviews/` and restore developer stash.
