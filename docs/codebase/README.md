# Jules Companion - Codebase Master Documentation Index
**Repositori Resmi:** `rivadmorin/Jules-Companion`  
**Status Dokumentasi:** Lengkap & Terverifikasi (100% Modul & Simbol)

---

## 📚 Daftar Lengkap Dokumentasi Modul

Dokumentasi ini disusun secara komprehensif agar setiap bagian dari kodebase dapat dipahami, dipelihara, dan dikembangkan secara stabil dalam jangka panjang tanpa risiko regresi:

| Bab | Berkas Dokumen | Lingkup Modul & Topik Utama |
|---|---|---|
| **00** | [**Master Architecture & System Design**](00-master-architecture.md) | Gambaran umum arsitektur 5-layer, diagram alur data end-to-end, state machine, isolasi keamanan CSP, dan thread-safety. |
| **01** | [**Core Subsystem Reference**](01-core-subsystem.md) | Domain types ([`types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts)), atomisitas penyimpanan lokal ([`storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts)), pembungkus Git CLI ([`git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts)), dan mesin penjadwal tugas otonom ([`scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts)). |
| **02** | [**API Client Subsystem Reference**](02-api-client-subsystem.md) | Klien HTTP native tanpa dependensi eksternal ([`client/http.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/http.ts)), pemetaan endpoint resmi REST API Google Jules Cloud v1alpha ([`client/jules_api.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/client/jules_api.ts)), dan wrapper CLI lokal ([`jules_client.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/jules_client.ts)). |
| **03** | [**Session Lifecycle & 4 Launch Modes**](03-session-lifecycle.md) | Spesifikasi lengkap 4 mode peluncuran (`start`, `review`, `interactive`, `scheduled`), mesin deploy ([`deploy_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/deploy_session.ts)), verifikasi safety gate sebelum merge & rollback ([`merge_session.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/merge_session.ts)), integrasi GitHub PR, dan loop otomatis ([`auto_process.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/auto_process.ts)). |
| **04** | [**VS Code Extension & UI Layer**](04-vscode-extension-ui.md) | Pengendali utama ekstensi ([`extension.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/extension.ts)), katalog 33 VS Code commands, 4 TreeDataProvider di sidebar ([`sessions_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/sessions_provider.ts), [`workspace_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/workspace_provider.ts), [`agents_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/agents_provider.ts), [`journals_provider.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/journals_provider.ts)), mesin polling background ([`live_sync.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/live_sync.ts)), visual diff parser ([`visual_diff.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/visual_diff.ts)), dan wizard pembuatan agen ([`custom_agent_wizard.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/custom_agent_wizard.ts)). |
| **05** | [**Mission Control Webview Subsystem**](05-mission-control-webview.md) | Panel interaktif HTML5 terisolasi ([`ui/mission_control.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/mission_control.ts)), rekonsiliasi state live cloud vs disk lokal, arsitektur event delegation `data-action` yang mematuhi CSP, serta diferensiasi tegas antara banner persetujuan rencana (`AWAITING_PLAN_APPROVAL`) dan banner masukan pengguna (`AWAITING_USER_FEEDBACK`). |
| **06** | [**Model Context Protocol (MCP) Server**](06-mcp-server-subsystem.md) | Server protokol standar untuk AI ([`mcp_server.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp_server.ts)), registri terpusat dengan schema JSON valid ([`mcp/registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/registry.ts)), dan katalog lengkap 20 native tools untuk integrasi LLM (Claude, Antigravity CLI, Hermes). |
| **07** | [**Agent System & Customization**](07-agents-and-customization.md) | Katalog 30 agen AI spesialis, skema frontmatter markdown template ([`references/agents/`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/references/agents/)), kompilasi `registry.json`, dan pola pencatatan memori agen (*agent journaling*). |
| **08** | [**Utilities & CLI Tooling**](08-utilities-and-cli.md) | Pustaka fungsi bersama ([`utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts)), predikat status sesi, doctor health checks, format tanggal terstandarisasi `DD-MM-YYYY`, inisialisasi workspace ([`setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts)), kompilasi registri ([`generate_registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/generate_registry.ts)), dan post-build sync ([`sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts)). |
| **09** | [**Maintenance & Extension Developer Guide**](09-maintenance-and-extension-guide.md) | Panduan praktis bagi developer untuk menambah command, tool MCP, atau agen baru, standar pengujian unit test & audit TSDoc 100%, prosedur packaging VSIX, serta solusi pemecahan masalah (*troubleshooting*). |

---

## 🛠️ Peta Modul Kode (28 Scripts Inventory)

Berikut adalah daftar lengkap 28 berkas skrip TypeScript dalam proyek yang telah didokumentasikan sepenuhnya:

```
scripts/
├── auto_process.ts                -> Bab 03: Session Lifecycle
├── client/
│   ├── http.ts                    -> Bab 02: API Client Subsystem
│   └── jules_api.ts               -> Bab 02: API Client Subsystem
├── core/
│   ├── git.ts                     -> Bab 01: Core Subsystem
│   ├── scheduler.ts               -> Bab 01: Core Subsystem
│   ├── storage.ts                 -> Bab 01: Core Subsystem
│   └── types.ts                   -> Bab 01: Core Subsystem
├── deploy_session.ts              -> Bab 03: Session Lifecycle
├── extension.ts                   -> Bab 04: VS Code Extension UI
├── generate_registry.ts           -> Bab 08: Utilities & CLI
├── jules_client.ts                -> Bab 02: API Client Subsystem
├── mcp/
│   ├── registry.ts                -> Bab 06: MCP Server Subsystem
│   └── tools/
│       ├── agent_tools.ts         -> Bab 06: MCP Server Subsystem
│       ├── session_tools.ts       -> Bab 06: MCP Server Subsystem
│       └── system_tools.ts        -> Bab 06: MCP Server Subsystem
├── mcp_server.ts                  -> Bab 06: MCP Server Subsystem
├── merge_session.ts               -> Bab 03: Session Lifecycle
├── setup.ts                       -> Bab 08: Utilities & CLI
├── sync_global.ts                 -> Bab 08: Utilities & CLI
├── ui/
│   ├── agents_provider.ts         -> Bab 04: VS Code Extension UI
│   ├── custom_agent_wizard.ts     -> Bab 04: VS Code Extension UI
│   ├── journals_provider.ts       -> Bab 04: VS Code Extension UI
│   ├── live_sync.ts               -> Bab 04: VS Code Extension UI
│   ├── mission_control.ts         -> Bab 05: Mission Control Webview
│   ├── sessions_provider.ts       -> Bab 04: VS Code Extension UI
│   ├── visual_diff.ts             -> Bab 04: VS Code Extension UI
│   └── workspace_provider.ts      -> Bab 04: VS Code Extension UI
└── utils.ts                       -> Bab 08: Utilities & CLI
```
