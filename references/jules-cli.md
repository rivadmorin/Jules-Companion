# Google Jules CLI Command Reference

This document provides a comprehensive command reference for **Jules CLI** (`jules`), the command-line interface to interact with Google's autonomous coding agent.

## Installation

Verify or install the Jules CLI globally via npm:
```bash
npm install -g @google/jules
```

## Authentication

Authentication with your Google account is required before running remote sessions.

- **Login**:
  ```bash
  jules login
  ```
  Opens your default browser to authenticate your Google Account.
- **Logout**:
  ```bash
  jules logout
  ```
  Terminates your Google login session.

## Version Check

To show the currently installed version:
```bash
jules version
```

## Interactive Dashboard (TUI)

To launch the Interactive Terminal User Interface (TUI) Dashboard, run the command without arguments:
```bash
jules
```
**Controls**:
- `enter`: Select and view a session.
- `ctrl+r`: Refresh the session list.
- `ctrl+d`: Delete a selected session.
- `ctrl+c`: Quit/exit the TUI dashboard.

---

## Command Reference

### 1. Creating a Session (`jules new` / `jules remote new`)

Assign a new coding task to Jules. By default, it uses the repository in your current working directory.

- **Direct task (shortcut)**:
  ```bash
  jules new "Add unit tests for validation.js"
  ```
- **Remote task on specific repository**:
  ```bash
  jules remote new --repo owner/repo --session "Fix the main login form validation"
  ```
- **Create parallel sessions** (useful for comparing different draft solutions):
  ```bash
  jules new --parallel 3 "Optimize Database queries in queries.py"
  ```
- **Global Flags**:
  - `--theme string`: Which TUI theme to use, `dark` or `light` (default is `dark`).

### 2. Listing Sessions and Repositories (`jules remote list`)

- **List all remote sessions** (both active and history):
  ```bash
  jules remote list --session
  ```
- **List all connected repositories**:
  ```bash
  jules remote list --repo
  ```

### 3. Pulling Session Code (`jules remote pull`)

Once Jules completes the session, fetch and apply the changes to your local workspace.

- **Pull without applying** (only downloads metadata/patch info):
  ```bash
  jules remote pull --session <session_id>
  ```
- **Pull and apply patch directly** (recommended for local workspace integration):
  ```bash
  jules remote pull --session <session_id> --apply
  ```
  *Note: Always run `git status` before pulling to ensure a clean working tree.*

### 4. Teleporting to a Session (`jules teleport`)

Clone the remote repository (if not already local), checkout the session's specific branch, and apply the generated patch in a single command:
```bash
jules teleport <session_id>
```

---

## Workspace Integration Examples

### Batch Processing from `TODO.md`
You can iterate over tasks in a `TODO.md` file and delegate them to Jules automatically:
```bash
cat TODO.md | while IFS= read -r line; do
  jules new "$line"
done
```

### Creating Tasks from GitHub Issues
Create a Jules session using the title of the first issue assigned to you:
```bash
gh issue list --assignee @me --limit 1 --json title | jq -r '.[0].title' | jules new
```
