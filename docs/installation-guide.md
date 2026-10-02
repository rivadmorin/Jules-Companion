# Jules Companion — Installation & Setup Guide

Comprehensive guide for installing, configuring, and verifying **Jules Companion** across **Antigravity IDE**, **Visual Studio Code**, **Google Antigravity CLI / Orca**, **Claude Code**, and compatible agent environments.

---

## 1. Quick 1-Click Installation

Jules Companion includes an automated universal installer that handles extension installation, skill synchronization, MCP server configuration, and environment setup in a single step.

### Windows (PowerShell)
```powershell
./install.ps1
```

### Windows (Command Prompt / Double Click)
Double-click `install.bat` in Windows File Explorer, or run:
```cmd
install.bat
```

### macOS / Linux
```bash
chmod +x install.sh
./install.sh
```

### Direct Node.js CLI
```bash
node scripts/installer.js
```

---

## 2. What Gets Installed Automatically

The installer orchestrates a 5-step universal deployment:

| Step | Component | Target Platforms | Description |
| :--- | :--- | :--- | :--- |
| **[1/5]** | **Editor Extension (`.vsix`)** | Antigravity IDE, VS Code, Cursor | Installs the extension into the editor extension host (`jules-companion-1.5.0.vsix`). |
| **[2/5]** | **Agent Skills (10 Skills)** | Antigravity (`.gemini`), Claude Code, Copilot, OpenClaw, Pi | Installs all 10 specialized `/jules-*` skills for interactive AI chat workflows. |
| **[3/5]** | **Chat Slash Commands** | Antigravity, Claude Code | Synchronizes command markdown files in `~/.gemini/commands` and `~/.claude/commands`. |
| **[4/5]** | **MCP Server (20 Tools)** | Antigravity, Claude, Cursor, Windsurf | Configures the JSON-RPC Model Context Protocol server and exports JSON schemas. |
| **[5/5]** | **API Credentials** | Local `.env` | Configures and validates the `JULES_API_KEY`. |

---

## 3. Editor Extension Details (Antigravity IDE & VS Code)

### Auto-Detection
The installer scans for editor CLI executables in standard system paths:
- **Antigravity IDE**: `%LOCALAPPDATA%\Programs\Antigravity IDE\bin\antigravity-ide.cmd` or `antigravity-ide` in PATH.
- **Visual Studio Code**: `code` in PATH, or standard Program Files / AppData locations.
- **Cursor**: `cursor` in PATH or `%LOCALAPPDATA%\Programs\cursor\resources\app\bin\cursor.cmd`.
- **Windsurf**: `windsurf` in PATH.

### Manual VSIX Installation (Fallback)
If your editor CLI is not available in PATH:
1. Open **Antigravity IDE** or **Visual Studio Code**.
2. Press `Ctrl + Shift + X` to open the **Extensions** view.
3. Click the `...` (Views and More Actions) menu in the top right of the Extensions panel.
4. Select **Install from VSIX...**.
5. Choose `jules-companion-1.5.0.vsix` located at the root of this repository.

### Activity Bar Visibility
In VS Code and Antigravity IDE, newly installed extensions may sometimes have their Activity Bar icon hidden by default:
1. **Right-click** any empty space on the left Activity Bar strip.
2. Ensure **✓ Jules Companion** is checked.
3. Click the Jules Companion icon to access the 4 sidebar views:
   - **Workspace & Git Context**
   - **Sessions** (Active, Awaiting Input, Completed)
   - **Agent Roster** (63 agents in 11 clusters)
   - **Journals & Reports**

---

## 4. Antigravity AI Skills Discovery

### How Antigravity Autocomplete Works
In Google Antigravity (and Orca agent chat), typing `/` in the prompt input triggers autocomplete based on registered **Skills** located in:
1. `~/.gemini/config/skills/<name>/SKILL.md` (Global configuration)
2. `~/.gemini/skills/<name>/SKILL.md` (Global user skills)
3. `.agents/skills/<name>/SKILL.md` (Workspace-scoped project skills)

### The 10 First-Class Jules Skills:
When you type `/jules` in the AI chat prompt, the following 10 specialized skills appear:

1. **`/jules-companion`** — Master companion coordinator and repository contextualizer.
2. **`/jules-deploy`** — Deploy an autonomous cloud coding session with any of the 63 agents (`/jules-deploy <agent> "<task>"`).
3. **`/jules-status`** — Query live status, execution logs, and history of all cloud sessions.
4. **`/jules-merge`** — Two-Stage Safety Gate merge of a completed Jules branch into the workspace.
5. **`/jules-agents`** — Search and browse the 63 agent roster across 11 clusters.
6. **`/jules-doctor`** — Run diagnostic health checks on CLI, git, and credentials.
7. **`/jules-auto`** — Monitor and auto-advance sessions awaiting feedback or completion.
8. **`/jules-team`** — Deploy multi-agent collaborative teams on complex tasks.
9. **`/jules-diff`** — Pull and inspect session patch diffs before merging.
10. **`/jules-review-apply`** — Review and surgically cherry-pick patch changes.

---

## 5. Model Context Protocol (MCP) Setup

Jules Companion exposes **20 native MCP tools** conforming to JSON-RPC 2.0.

### Configuration Path
The installer automatically writes the MCP configuration to `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": [
        "E:/Data Utama/Coding/Antigravity/Jules-Companion/dist/mcp_server.js"
      ],
      "env": {
        "JULES_WORKSPACE_ROOT": "E:/Data Utama/Coding/Antigravity/Jules-Companion",
        "PATH": "..."
      }
    }
  }
}
```

### JSON Schema Registries
Individual tool schemas (`<toolName>.json`) are automatically exported to:
- `~/.gemini/antigravity-ide/mcp/jules-companion/`
- `~/.gemini/antigravity-cli/mcp/jules-companion/`

---

## 6. Verification & Health Check

After running the installer, verify that everything is operating normally:

### 1. Run Doctor Check
```bash
node dist/doctor.js
# Or in AI Chat:
/jules-doctor
```

### 2. Run Test Suite
```bash
npm test
```
All 138 unit tests should pass with 0 failures.

### 3. Check IDE Status Bar
Look at the bottom status bar in Antigravity IDE or VS Code:
- Yellow indicator: `Jules: X Response Needed` (if any cloud task requires your feedback)
- `Jules Live: OFF/ON` (toggle live activity stream)
- Workspace git origin and branch connection status
