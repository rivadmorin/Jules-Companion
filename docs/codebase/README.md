# Jules Companion - Codebase Master Documentation Index
**Official Repository:** `rivadmorin/Jules-Companion`  
**Documentation Status:** Complete & Verified (100% Modules & Symbols Covered)

---

## 📚 Complete Module Documentation Directory

This comprehensive technical documentation is organized to ensure every subsystem, data structure, workflow, and security constraint is clearly documented for **long-term stability, maintainability, and regression-free development**:

| Chapter | Document | Scope & Core Topics |
|---|---|---|
| **00** | [**Master Architecture & System Design**](00-master-architecture.md) | High-level 5-layer architecture, end-to-end data flow diagrams, deterministic state machine, CSP security isolation, thread-safety, and API key resolution. |
| **01** | [**Core Subsystem Reference**](01-core-subsystem.md) | Universal domain types ([`types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts)), atomic file storage ([`storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts)), Git CLI subprocess wrapper ([`git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts)), and autonomous background task scheduler ([`scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts)). |
| **02** | [**API Client Subsystem Reference**](02-api-client-subsystem.md) | Dependency-free native Node.js HTTP client ([`client/http.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/http.ts)), Google Jules Cloud REST API v1alpha endpoint mapping ([`client/jules_api.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts)), and local CLI wrapper ([`jules_client.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/jules_client.ts)). |
| **03** | [**Session Lifecycle & 4 Launch Modes**](03-session-lifecycle.md) | Detailed specifications for all 4 official launch modes (`start`, `review`, `interactive`, `scheduled`), deployment engine ([`deploy_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts)), pre-merge Safety Gate verification & rollback ([`merge_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/merge_session.ts)), GitHub PR automation, and autonomous processing loop ([`auto_process.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/auto_process.ts)). |
| **04** | [**VS Code Extension & UI Layer**](04-vscode-extension-ui.md) | Master extension controller ([`extension.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/extension.ts)), 33 registered commands, 4 sidebar TreeDataProviders ([`sessions_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/sessions_provider.ts), [`workspace_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/workspace_provider.ts), [`agents_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/agents_provider.ts), [`journals_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/journals_provider.ts)), background heartbeat manager ([`live_sync.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/live_sync.ts)), visual diff parser ([`visual_diff.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/visual_diff.ts)), and agent creation wizard ([`custom_agent_wizard.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/custom_agent_wizard.ts)). |
| **05** | [**Mission Control Webview Subsystem**](05-mission-control-webview.md) | Isolated HTML5 webview panel ([`ui/mission_control.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/mission_control.ts)), live cloud vs disk state reconciliation, CSP-compliant `data-action` event delegation, and strict separation between Plan Approval (`AWAITING_PLAN_APPROVAL`) and User Feedback (`AWAITING_USER_FEEDBACK`) banners. |
| **06** | [**Model Context Protocol (MCP) Server**](06-mcp-server-subsystem.md) | Standard MCP AI server over stdio ([`mcp_server.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp_server.ts)), centralized tool registry with JSON schema validation ([`mcp/registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/registry.ts)), and complete 20 native tools suite for external LLM clients (Claude, Antigravity CLI, Hermes). |
| **07** | [**Agent System & Customization**](07-agents-and-customization.md) | Catalog of 30 specialized AI agent roles, template markdown schemas ([`references/agents/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/)), `registry.json` compilation, and persistent agent procedural memory journaling. |
| **08** | [**Utilities & CLI Tooling**](08-utilities-and-cli.md) | Shared utility library ([`utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts)), status predicates, environment health checks, standardized `DD-MM-YYYY` date formatting, workspace scaffolding ([`setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts)), registry compiling ([`generate_registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/generate_registry.ts)), and post-build synchronization ([`sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts)). |
| **09** | [**Maintenance & Extension Developer Guide**](09-maintenance-and-extension-guide.md) | Practical developer guide: how to add commands, MCP tools, and specialist agents; 100% TSDoc auditing rules; test suite execution; VSIX packaging; and troubleshooting matrix. |

---

## 🛠️ TypeScript Scripts Inventory (28 Files)

Every TypeScript source file in `scripts/` is fully covered in the documentation:

```
scripts/
├── auto_process.ts                -> Chapter 03: Session Lifecycle
├── client/
│   ├── http.ts                    -> Chapter 02: API Client Subsystem
│   └── jules_api.ts               -> Chapter 02: API Client Subsystem
├── core/
│   ├── git.ts                     -> Chapter 01: Core Subsystem
│   ├── scheduler.ts               -> Chapter 01: Core Subsystem
│   ├── storage.ts                 -> Chapter 01: Core Subsystem
│   └── types.ts                   -> Chapter 01: Core Subsystem
├── deploy_session.ts              -> Chapter 03: Session Lifecycle
├── extension.ts                   -> Chapter 04: VS Code Extension UI
├── generate_registry.ts           -> Chapter 08: Utilities & CLI
├── jules_client.ts                -> Chapter 02: API Client Subsystem
├── mcp/
│   ├── registry.ts                -> Chapter 06: MCP Server Subsystem
│   └── tools/
│       ├── agent_tools.ts         -> Chapter 06: MCP Server Subsystem
│       ├── session_tools.ts       -> Chapter 06: MCP Server Subsystem
│       └── system_tools.ts        -> Chapter 06: MCP Server Subsystem
├── mcp_server.ts                  -> Chapter 06: MCP Server Subsystem
├── merge_session.ts               -> Chapter 03: Session Lifecycle
├── setup.ts                       -> Chapter 08: Utilities & CLI
├── sync_global.ts                 -> Chapter 08: Utilities & CLI
├── ui/
│   ├── agents_provider.ts         -> Chapter 04: VS Code Extension UI
│   ├── custom_agent_wizard.ts     -> Chapter 04: VS Code Extension UI
│   ├── journals_provider.ts       -> Chapter 04: VS Code Extension UI
│   ├── live_sync.ts               -> Chapter 04: VS Code Extension UI
│   ├── mission_control.ts         -> Chapter 05: Mission Control Webview
│   ├── sessions_provider.ts       -> Chapter 04: VS Code Extension UI
│   ├── visual_diff.ts             -> Chapter 04: VS Code Extension UI
│   └── workspace_provider.ts      -> Chapter 04: VS Code Extension UI
└── utils.ts                       -> Chapter 08: Utilities & CLI
```
