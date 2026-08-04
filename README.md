# Jules Companion 🐙

> **[Read in Indonesian (Baca dalam Bahasa Indonesia)](README.id.md)**

`jules-companion` is a Model Context Protocol (MCP) Server, global Agent Skill, and CLI tool for modern AI coding agents and IDEs — including **Antigravity IDE**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, and **Codex CLI**.

It acts as an intelligent co-pilot to orchestrate local workflows (Git + GitHub CLI) with autonomous cloud execution using the **Google Jules API**.

---

## ⚡ Key Capabilities

* **🔌 Native MCP Server**: Connects seamlessly with any MCP-compliant AI client (Antigravity IDE, Claude Desktop, OpenCode, Cursor) exposing high-level native tools & real-time session resources.
* **🤖 30 Specialist Agents**: Pre-configured agents with specialized domain roles (e.g., *Bolt* for performance, *Sentinel* for security, *Architect* for structural design).
* **🛡️ Two-Stage Patch Merge**: Cloud patches are pulled into an isolated review branch first. You inspect the generated Markdown report before merging into `main`.
* **🔄 Auto-Process Engine**: Automatically monitors and resolves Jules cloud session blocking states (such as `AWAITING_PLAN_APPROVAL` & `AWAITING_USER_INPUT`).
* **💻 Interactive TUI Console**: Fallback terminal UI with arrow-key navigation for direct manual management.

---

## 🔌 Primary Interaction Standard: MCP Integration

`jules-companion` exposes an MCP server running on `stdio` via JSON-RPC. AI Agents natively invoke MCP tools instead of running shell commands.

### Server Configuration

Add `jules-companion` to your AI Client's MCP configuration (`mcp_config.json` or equivalent):

```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": ["/path/to/jules-companion/dist/mcp_server.js"]
    }
  }
}
```

### Exposed MCP Tools (20 Tools) & Resources

#### 🔹 Group 1: Discovery & Setup
| Name | Description | Sample Payload |
| :--- | :--- | :--- |
| `list_agents` | Returns JSON array of all 30 specialized agent roles from registry.json. | `{}` |
| `get_agent_info` | Reads markdown template directives and boundaries for a target agent. | `{ "agentName": "annotator" }` |
| `list_sources` | Queries linked GitHub Cloud sources registered under this account. | `{}` |
| `run_doctor` | Runs environment health checks (.env, API key, git, gh CLI). | `{}` |
| `create_custom_agent` | Scaffolds a custom agent template file and updates registry.json. | `{ "name": "custom", "role": "Role", "directives": "...", "boundariesDo": [], "boundariesDont": [] }` |

#### 🔹 Group 2: Session Control & Interactivity
| Name | Description | Sample Payload |
| :--- | :--- | :--- |
| `deploy_session` | Deploys a new Jules session with specialized agents. | `{ "type": "start", "agents": "annotator", "task": "...", "mode": "code" }` |
| `get_session_status` | Retrieves real-time session state directly from Google Jules API. | `{ "sessionId": "12345" }` |
| `cancel_session` | Cancels an active or queued Google Jules session via HTTP DELETE. | `{ "sessionId": "12345" }` |
| `send_session_message` | Posts a follow-up reply or instruction to a running session. | `{ "sessionId": "12345", "message": "Proceed" }` |
| `retry_failed_session` | Redeploys a failed session record with optional new task instructions. | `{ "sessionId": "12345" }` |

#### 🔹 Group 3: Multi-Agent Orchestration
| Name | Description | Sample Payload |
| :--- | :--- | :--- |
| `auto_process` | Auto-approves execution plans & sends auto-replies. | `{ "all": true }` |
| `deploy_team` | Deploys multi-agent team presets (full-audit, feature-sprint, refactor-boost). | `{ "preset": "full-audit", "task": "Audit codebase" }` |
| `setup_workspace` | Initializes the local Jules workspace staging environment. | `{}` |

#### 🔹 Group 4: Patch, Git & PR Bridge
| Name | Description | Sample Payload |
| :--- | :--- | :--- |
| `merge_session` | Inspects, approves, or merges a completed Jules session patch. | `{ "sessionId": "12345", "approve": true }` |
| `pull_session_diff` | Extracts unidiff patch content without merging. | `{ "sessionId": "12345", "outputPath": "patch.diff" }` |
| `checkout_session_branch` | Creates an isolated feature branch and applies the session patch. | `{ "sessionId": "12345" }` |
| `create_github_pr` | Creates a GitHub Pull Request using gh CLI for a completed session. | `{ "sessionId": "12345" }` |

#### 🔹 Group 5: Knowledge, Quality & Safety
| Name | Description | Sample Payload |
| :--- | :--- | :--- |
| `read_agent_journal` | Reads critical learnings logged in `.jules/<agent>.md`. | `{ "agentName": "annotator" }` |
| `get_review_reports` | Scans and lists markdown audit reports in `docs/jules-reviews/`. | `{}` |
| `rollback_session` | Reverts uncommitted stashes or cleans working directory post-merge. | `{}` |

#### 🔹 MCP Resource
| URI | Description |
| :--- | :--- |
| `jules://sessions` | Returns active and historical Jules AI sessions from local state file. |

---

## 🚀 One-Line Installation

Install `jules-companion` globally on your system:

### Linux / macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"
```

*This command clones the repository to `~/.gemini/config/skills/jules-companion`, builds TypeScript artifacts, installs dependencies, and sets up global shortcuts.*

---

## 💬 AI Agent Slash Commands

When used as an Agent Skill in assistants like **Antigravity IDE** or **Claude Code**, slash commands map directly to native MCP Tool payloads (with CLI shell commands as secondary fallbacks):

| Command | Primary Action (MCP Tool) | Secondary Fallback (CLI) |
| :--- | :--- | :--- |
| `/jules-deploy <agent> <task>` | `deploy_session` `{ type: "start", mode: "code" }` | `node dist/deploy_session.js --type start ...` |
| `/jules-review <agent> <task>` | `deploy_session` `{ type: "review", mode: "review" }` | `node dist/deploy_session.js --type review ...` |
| `/jules-status` | `get_session_status` / Read `jules://sessions` | `node dist/jules_client.js list --json` |
| `/jules-auto` | `auto_process` `{ all: true }` | `node dist/auto_process.js --all` |
| `/jules-inspect <session_id>` | `merge_session` `{ inspect: true }` | `node dist/merge_session.js --inspect <id>` |
| `/jules-merge <session_id>` | `merge_session` `{ approve: true }` | `node dist/merge_session.js --approve <id>` |
| `/jules-doctor` | Diagnostic environment check | Diagnostic environment check |

---

## 📚 Documentation

For a comprehensive breakdown of the application architecture, agent roles, and workflow logic:

👉 **[Complete Application Documentation (Indonesian)](docs/penjelasan-aplikasi.md)**

---

## 🧹 Uninstallation

To cleanly remove `jules-companion`:

### Linux / macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"
```
