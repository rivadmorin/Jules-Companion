import re

with open('SKILL.md', 'r') as f:
    content = f.read()

old_section = """## ⚕️ Evaluation Command `/jules-companion doctor`

Run `/jules-companion doctor` in the chat to check:
*   Local folder and configuration integrity (`SKILL.md`, `.env`, `sessions.json`).
*   Gitignore exclusion status.
*   System dependencies (`node`, `git`, `gh`).
*   Active JULES_API_KEY presence and connectivity."""

new_section = """## 🚀 AI Agent Slash Commands Interpretation

When the user types any of the following `/jules-*` slash commands in the chat prompt, you (the AI Agent) MUST interpret them and execute the corresponding bash commands autonomously. Do NOT ask the user to run these commands themselves.

*   **/jules-menu**
    *   **Action:** Launch the interactive console.
    *   **Command:** `jules-companion` (or `node dist/jules_menu.js`)
*   **/jules-deploy `<agent>` `<task>`**
    *   **Action:** Deploy a new session with a specific agent. By default, use `--mode code` unless specified otherwise.
    *   **Command:** `node dist/deploy_session.js --type start --agents <agent> --task "<task>"`
*   **/jules-review `<agent>` `<task>`**
    *   **Action:** Deploy a new audit/review session with a specific agent.
    *   **Command:** `node dist/deploy_session.js --type review --agents <agent> --task "<task>"`
*   **/jules-status**
    *   **Action:** Check the status of all active sessions.
    *   **Command:** `node dist/jules_client.js list --json` (Then parse and summarize the output for the user).
*   **/jules-auto**
    *   **Action:** Trigger the autonomous auto-approval and auto-reply engine.
    *   **Command:** `node dist/auto_process.js --all`
*   **/jules-inspect `<session_id>`**
    *   **Action:** Extract patch to an isolated review branch and generate a Markdown report.
    *   **Command:** `node dist/merge_session.js --inspect <session_id>`
*   **/jules-merge `<session_id>`**
    *   **Action:** Approve and merge the inspected patch into the main branch.
    *   **Command:** `node dist/merge_session.js --approve <session_id>`
*   **/jules-doctor**
    *   **Action:** Run system diagnostics, check configurations, and verify API connectivity.
    *   **Command:** (Execute validation checks on `SKILL.md`, `.env`, `.gitignore`, `git`, `gh`, and `node` versions, then report back)."""

content = content.replace(old_section, new_section)

with open('SKILL.md', 'w') as f:
    f.write(content)
