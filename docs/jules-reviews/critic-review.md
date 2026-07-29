🗣️ Critic: [Code Review for PR #1]
- `scripts/mcp_server.ts`: Issue: `handleSetup` import mismatch and `captureOutput` incorrect return type promise. Recommendation: Fixed to import `runSetup` and use `Promise<any> | any`.
