# Jules Companion 🚀

> **[Read in Indonesian (Baca dalam Bahasa Indonesia)](README.id.md)**

`jules-companion` is a global custom skill and CLI tool for your AI coding assistant (like Claude Code). It acts as a co-pilot to orchestrate local workflows (Git + GitHub CLI) with autonomous cloud execution using the **Google Jules API**.

It mobilizes **30 specialized AI agents**, dividing them strictly into Coding (modifying code) and Documentation/Review (read-only) groups for optimal performance.

## ⚡ Core Features

*   **30 Specialist Agents**: Pre-configured agents with specific roles (e.g., *Bolt* for performance, *Sentinel* for security).
*   **Two-Stage Patch Merge**: Cloud patches are first pulled into an isolated review branch. You merge them into `main` only after inspecting the generated Markdown report.
*   **Auto-Process Engine**: Automatically handles Jules cloud session blocking states (like AWAITING_PLAN_APPROVAL).
*   **Fallback Interactive UI**: A clean, arrow-key navigable terminal UI.

## 🚀 One-Line Install

Install the skill globally on your system:

### Linux/macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"
```

*This command clones the repo to `~/.gemini/config/skills/jules-companion`, installs dependencies, and creates a global `jules-companion` shortcut.*

## 💬 AI Agent Slash Commands

You can paste these commands directly into your AI Assistant chat to trigger background actions:

| Command | Description |
| :--- | :--- |
| `/jules-menu` | Opens the interactive Jules Companion TUI console. |
| `/jules-deploy <agent> <task>` | Deploys a new autonomous coding session. |
| `/jules-review <agent> <task>` | Creates a safe, non-destructive audit session. |
| `/jules-status` | Checks the status of all active cloud sessions. |
| `/jules-auto` | Runs the auto-approval and auto-reply engine. |
| `/jules-inspect <session_id>` | Pulls a patch into an isolated branch and generates a report. |
| `/jules-merge <session_id>` | Approves and merges the inspected patch into the main branch. |
| `/jules-doctor` | Runs system integrity and dependency validation checks. |

## 📚 Documentation

For a comprehensive explanation of how this application works, its architecture, and workflow logic, please read:

👉 **[Complete Application Documentation (Indonesian)](docs/penjelasan-aplikasi.md)**

## 🧹 Uninstall

To cleanly remove the global skill:

### Linux/macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"
```
