# Jules Companion 🐙

> **[Read in Indonesian (Baca dalam Bahasa Indonesia)](README.id.md)**

`jules-companion` is a Model Context Protocol (MCP) Server, global Agent Skill, and CLI tool for modern AI coding agents and IDEs — including **Antigravity IDE**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, and **Codex CLI**.

It acts as an intelligent co-pilot to orchestrate local workflows (Git + GitHub CLI) with autonomous cloud execution using the **Google Jules API**.

---

## ⚡ Key Capabilities

* **💻 Native VS Code / IDE Extension**: Sidebar TreeViews for Sessions, Agent Roster (43 agents), and Journals, plus native side-by-side git diff review and status bar indicator.
* **🔌 Native MCP Server**: Connects seamlessly with any MCP-compliant AI client (Antigravity IDE, Claude Desktop, OpenCode, Cursor) exposing high-level native tools & real-time session resources.
* **🤖 43 Specialist Agents**: Pre-configured agents with specialized domain roles (e.g., *Bolt* for performance, *Sentinel* for security, *Architect* for structural design).
* **🛡️ Two-Stage Patch Merge**: Cloud patches are pulled into an isolated review branch first. You inspect the generated Markdown report before merging into `main`.
* **⚡ Clean Programmatic Core & CLI**: Direct typed execution without global process mutations, plus convenient CLI commands (`npm run deploy`, `npm run merge`, `npm run setup`).

---
 
## 💻 VS Code / IDE Extension
 
`jules-companion` includes an integrated GUI extension for VS Code, Cursor, and Antigravity IDE!
 
### 🌟 UI Features
* **Sidebar Activity Bar**:
  * **Sessions View**: Real-time list of active, completed, and failed cloud sessions with inline action buttons (`Diff`, `Merge`, `Cancel`, `Rollback`).
  * **Agent Roster**: Categorized directory of all 43 specialist agents with role descriptions and directives.
  * **Journals & Reports**: 1-click access to generated decision journals and code review markdown documents.
* **Native Diff Integration**: Inspect incoming session patches side-by-side inside VS Code's native diff editor before applying or merging.
* **Status Bar Indicator**: Minimalist live counter at the bottom left showing active running sessions.
* **Command Palette Support**: Quick access via `Ctrl+Shift+P` (`Jules: Deploy New Session`, `Jules: Run System Doctor`, etc.).
 
### 📦 Build & Installation
```bash
# 1. Package into .vsix installer
npm run package
 
# 2. Install directly in VS Code / Cursor
code --install-extension jules-companion-1.0.0.vsix
```
*For local development/debugging, open this repository in VS Code and press `F5` to start the Extension Development Host.*
 
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
| `list_agents` | Returns JSON array of all 43 specialized agent roles from registry.json. | `{}` |
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

Install and configure `jules-companion` with a single command:

### Linux / macOS
```bash
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"
```

<details>
<summary><b>🛠️ Manual Installation (Click to expand)</b></summary>

### Prerequisites
* **Node.js**: v18.0.0 or higher (tested on Node v20 & v24 LTS)
* **Git** & **GitHub CLI** (`gh` CLI optional, recommended for automated PRs)
* **Google Jules API Key**: Obtain from [Google Jules Console](https://jules.google.com/)

```bash
# Clone the repository
git clone https://github.com/rivadmorin/Jules-Companion.git
cd Jules-Companion

# Install dependencies and build TypeScript artifacts
npm install
npm run build

# Run automated workspace staging setup
npm run setup
```
> [!NOTE]
> `npm run build` automatically triggers the `postbuild` script which synchronizes compiled artifacts, agent prompt templates, and MCP schemas directly to the global IDE directory (`~/.gemini/config/skills/jules-companion` and `~/.gemini/antigravity-ide/mcp/jules-companion`).
</details>

### Configuration
1. Create a `.env` file in the project root:
   ```env
   JULES_API_KEY=your_actual_jules_api_key_here
   ```
2. Add `jules-companion` to your AI client's MCP configuration (`mcp_config.json`):
   ```json
   {
     "mcpServers": {
       "jules-companion": {
         "command": "node",
         "args": ["<path-to-Jules-Companion>/dist/mcp_server.js"]
       }
     }
   }
   ```

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

For a comprehensive breakdown of the application architecture, development roadmap, and workflow logic:

* 📖 **[Complete Application Guide (Indonesian)](docs/penjelasan-aplikasi.md)** — Architectural overview, 20 MCP tools, FSM lifecycle, and troubleshooting.
* 🗺️ **[Codebase Architecture Map](docs/codebase-architecture-map.md)** — 6-tier layering hierarchy, Sentrux governance, and programmatic core patterns.
* 🛡️ **[Sustainability, QA & Roadmap Guide](docs/development-and-contribution-guide.md)** — Code sustainability principles, 100% TSDoc gate, testing standards, extension protocols, and future milestone roadmap.

---

## 🧹 One-Line Uninstallation

Cleanly remove `jules-companion` and all exported schemas from your system:

### Linux / macOS
```bash
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"
```

> [!TIP]
> Remember to remove the `"jules-companion"` entry from your IDE's `mcp_config.json` after running the uninstaller.

