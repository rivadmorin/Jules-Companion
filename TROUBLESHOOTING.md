# 🛠️ Jules Companion Troubleshooting Guide

Welcome to the Jules Companion troubleshooting guide! If you're running into issues while using the extension, MCP server, or agents, you'll likely find the solution here.

## 🔌 Connection & API Issues

### ❌ API Requests Return `401 Unauthorized`
**Cause:** Your Google Jules API key is either missing, expired, or incorrectly configured.
**Solution:**
- **In VS Code / Antigravity IDE:** Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS), type `Jules: Set API Key`, and paste your valid API key.
- **Environment Variable:** Alternatively, ensure the `JULES_API_KEY` environment variable is set in your terminal profile before launching the IDE.

### ❌ MCP Server Connection Failed in Claude Desktop / Cursor
**Cause:** The MCP client cannot locate the `mcp_server.js` file, or the Node environment isn't properly loaded.
**Solution:**
- Verify your MCP configuration file (e.g., `claude_desktop_config.json`). Ensure the `args` array points to the absolute path of `dist/mcp_server.js`.
- Make sure you have run `npm install && npm run build` to generate the `dist` directory.
- Example:
  ```json
  {
    "mcpServers": {
      "jules-companion": {
        "command": "node",
        "args": ["/absolute/path/to/Jules-Companion/dist/mcp_server.js"],
        "env": {
          "JULES_API_KEY": "your_api_key_here"
        }
      }
    }
  }
  ```

## 🛡️ Git & Workflow Issues

### ❌ Safety Gate Rejects Merge
**Cause:** Jules Companion enforces strict safety checks before modifying your codebase. The cloud session might not be marked as `SUCCEEDED`, or your local Git working tree is dirty (has uncommitted changes).
**Solution:**
- Ensure your local Git working tree is clean. Run `git status`. If there are uncommitted changes, commit or stash them using `git stash`.
- Verify the Jules cloud session has successfully completed without errors.

## 🎛️ UI & Extension Issues

### ❌ Session Action Center Fails to Open
**Cause:** No active workspace folder or corrupt `sessions.json`.
**Solution:**
- Open a valid project directory in VS Code or Antigravity IDE (`File` ➔ `Open Folder...`).
- Verify `.jules-companion/sessions.json` contains valid JSON syntax, or delete the file to allow fresh initialization.

### ❌ Scheduled Tasks Not Running at Target Time
**Cause:** LiveSync polling might be disabled in your IDE.
**Solution:**
- Check the VS Code status bar for the `$(sync) Jules Sync` indicator.
- If it's disabled, click it or run the command `Jules: Toggle LiveSync` (`jules.toggleLiveSync`) to enable the background evaluation loop.

## 📦 Installation & Setup Issues

### ❌ Extension Fails to Activate
**Cause:** Missing prerequisites like Node.js v18+ or Git.
**Solution:**
- Verify you have Node.js version 18 or higher installed (`node -v`).
- Verify Git is installed and available in your system's PATH (`git --version`).

---
*Still having issues? Feel free to open an issue on the GitHub Repository with your error logs.*
