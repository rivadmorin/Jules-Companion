# ❓ Jules Companion Frequently Asked Questions (FAQ)

Welcome to the Jules Companion FAQ! Here we answer common questions about the extension, its features, and how it integrates with your workflow.

## General Questions

### What is Jules Companion?
`jules-companion` is a Model Context Protocol (MCP) Server, global Agent Skill, and native IDE extension. It acts as an intelligent co-pilot, orchestrating local developer workflows (like Git and the GitHub CLI) with autonomous cloud execution via the **Google Jules API**. It's compatible with modern AI coding environments like VS Code, Antigravity IDE, Claude Desktop, Cursor, and more.

### Do I need a Google Jules API Key to use this?
**Yes.** To utilize the autonomous cloud execution capabilities of the Jules Companion, you must have a valid Google Jules API Key. You can get one at [jules.google](https://jules.google).

## Features & Workflows

### What are the different execution modes available?
Jules Companion offers 4 official Google Jules Execution Modes:
1.  **🚀 Start (`start`)**: Autonomous code implementation without pausing for plan approval. Great for quick tasks.
2.  **📑 Review (`review`)**: Generates a step-by-step plan and pauses for your authorization before making any code changes. Ideal for complex tasks where you want oversight.
3.  **🎯 Interactive plan (`interactive`)**: Jules engages in a dialogue to clarify goals and requirements before planning and waiting for approval. Perfect for vague or exploratory tasks.
4.  **⏰ Scheduled task (`scheduled`)**: Allows you to queue background tasks to execute autonomously at a future time or after a delay.

### What is the "Safety Gate"?
The **Safety Gate** is a critical security and stability feature. Before Jules Companion performs any Git merges or modifies your local codebase, the Safety Gate verifies two things:
1.  The cloud execution session must have completed successfully (`SUCCEEDED` status).
2.  Your local Git working tree must be completely clean (no uncommitted changes).
This ensures your uncommitted work is never accidentally overwritten or entangled with automated changes.

### Can I use Jules Companion outside of VS Code?
**Yes.** While it provides a native extension for VS Code and Antigravity IDE, Jules Companion also functions as a standard **Model Context Protocol (MCP) Server**. This means you can integrate it with any MCP-compatible client, such as Claude Desktop, Cursor, or Windsurf, by configuring it to run the `mcp_server.js` script.

### What is the Mission Control Webview?
The Mission Control Webview is an interactive panel within the IDE extension that provides real-time oversight of your AI sessions. It features live cloud state reconciliation, an execution plan stepper, an activity timeline, and clear distinctions between when the system is waiting for Plan Approval versus General User Feedback.

## Customization & Agents

### How many agents are available?
Jules Companion comes with **44 specialized agents** fine-tuned for various roles, including Coding, Testing, Security, Architecture, DevOps, and Documentation.

### Can I add my own agents?
**Yes.** The system is designed to be extensible. You can define custom agents using template markdown files in the `references/agents/` directory.

### What are Ponytail and Sentrux?
These are rigorous engineering standards enforced within the Jules Companion development lifecycle:
*   **Ponytail**: An anti-overengineering mindset that promotes simplicity, minimizing dependencies (relying on Node.js standard libraries), and creating minimal diffs.
*   **Sentrux**: An architectural boundary linter that enforces a strict 6-tier downward dependency hierarchy to prevent spaghetti code.

## Troubleshooting

### My issue isn't listed here. Where can I get help?
Please refer to our [Troubleshooting Guide](TROUBLESHOOTING.md) for more specific technical issues and solutions. If you still need help, feel free to open an issue on our GitHub repository.
