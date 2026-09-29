# Jules Companion 🐙

> **Language / Bahasa:** [🇬🇧 English](#-english) • [🇮🇩 Bahasa Indonesia](#-bahasa-indonesia)

---

# 🇬🇧 English

`jules-companion` is a Model Context Protocol (MCP) Server, global Agent Skill, and native IDE extension for modern AI coding environments — including **Visual Studio Code**, **Google Antigravity IDE**, **Claude Desktop / Claude Code**, **Cursor**, **Windsurf**, and **OpenCode**.

It acts as an intelligent co-pilot to orchestrate local developer workflows (Git + GitHub CLI) with autonomous cloud execution using the **Google Jules API**.

---

## ⚡ Key Capabilities

* **🚀 4 Official Google Jules Execution Modes**:
  * **Start** (`start`): Autonomous code implementation without pausing for plan approval (`requirePlanApproval: false`).
  * **Review** (`review`): Generates step-by-step plan and pauses for your authorization (`requirePlanApproval: true`).
  * **Interactive plan** (`interactive`): Jules engages in a dialogue to clarify goals before planning and approval.
  * **Scheduled task** (`scheduled` [NEW!]): Queue background tasks to execute autonomously at a future time or delay.
* **⏰ Autonomous Task Scheduler Engine**: Background evaluation loop that triggers due tasks, captures cloud session IDs, and alerts the developer.
* **🎛️ Mission Control Webview**: Interactive panel with live cloud state reconciliation, execution plan stepper, activity timeline, and differentiated Plan Approval vs User Feedback banners.
* **💻 Native IDE Extension**: Sidebar TreeViews for Active Sessions, Scheduled Tasks, Archived Sessions, Workspace Git context, Agent Roster, and Decision Journals.
* **🔌 Native MCP Server (20 Tools)**: Standard JSON-RPC server via `stdio` compatible with Claude, Antigravity CLI, Cursor, and any MCP client.
* **🤖 30 Specialist Agents**: Fine-tuned agent roles across Coding, Testing, Security, Architecture, DevOps, and Documentation.
* **🛡️ Fail-Safe Safety Gate**: Verifies cloud execution success (`SUCCEEDED`) and clean working tree before performing Git merges.

---

## 🚀 Execution Modes in Detail

| Mode | Label & Icon | Google Jules Behavior | Extension Integration |
|---|---|---|---|
| **Start** | 🚀 `Start` | Get started without plan approval | Immediate autonomous code implementation. |
| **Review** | 📑 `Review` | Generate plan and wait for approval | Jules formulates execution plan and pauses in `AWAITING_PLAN_APPROVAL`. |
| **Interactive plan** | 🎯 `Interactive plan` | Chat with Jules to understand goals before planning | Goal-clarification directive injected; pauses in `AWAITING_USER_FEEDBACK`. |
| **Scheduled task** | ⏰ `Scheduled task` | Create tasks for Jules to work on when you're not there | Saved to `.jules-companion/schedules.json` and triggered by background scheduler. |

---

## 💻 Installation & Setup

### Prerequisites
* Node.js v18+ & Git installed.
* Google Jules API Key ([Get API Key](https://jules.google)).

### Install VSIX in VS Code or Antigravity IDE
```bash
# Option A: 1-Click Auto Installer (Recommended for non-technical users)
# On Windows: Double-click install.bat
# On macOS/Linux: ./install.sh

# Option B: Manual Installation
code --install-extension jules-companion-1.1.0.vsix
```

### Configure API Key
In VS Code or Antigravity IDE:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS).
2. Type `Jules: Set API Key` and paste your Google Jules API key.
3. Or set the environment variable `JULES_API_KEY=your_key_here`.

---

## 🔌 Model Context Protocol (MCP) Server Setup

Add this configuration to your AI assistant's MCP config file (e.g. `claude_desktop_config.json` or Antigravity CLI settings):

```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": [
        "/path/to/Jules-Companion/dist/mcp_server.js"
      ],
      "env": {
        "JULES_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

---

## 🛠️ Contributor & Agent Tooling (Ponytail & Sentrux)

Jules Companion enforces rigorous engineering standards using two integrated open-source tools:
* **[Ponytail](https://github.com/DietrichGebert/ponytail)**: Anti-overengineering ruleset for developers and AI agents (YAGNI, standard library first, minimal diffs).
* **[Sentrux](https://github.com/sentrux/sentrux)**: Architectural boundary linter enforcing a strict 6-tier downward dependency hierarchy (`npm run sentrux:check`).

See [**CONTRIBUTING.md**](CONTRIBUTING.md) and [**AGENT.md**](AGENT.md) for full setup and execution instructions.

---

## 🤖 Developer Workflows & Git Hooks

The project utilizes automated Git hooks to improve the developer experience and ensure code health. By running `npm install`, a local git pre-commit hook is automatically configured via `scripts/install_hooks.js`.
This pre-commit hook will automatically run the `npm run verify` script (which executes TypeScript checks via `npx tsc --noEmit` and our test suite) to prevent any failing code from being committed.

## 📚 Architecture Documentation

Comprehensive architecture documentation for all 28 scripts and subsystems is available in English:
👉 [**Master Architecture & Codebase Documentation**](docs/codebase/README.md)

---
---

# 🇮🇩 Bahasa Indonesia

`jules-companion` adalah Model Context Protocol (MCP) Server, global Agent Skill, dan ekstensi IDE native untuk lingkungan AI coding modern — seperti **Visual Studio Code**, **Google Antigravity IDE**, **Claude Desktop / Claude Code**, **Cursor**, **Windsurf**, dan **OpenCode**.

Aplikasi ini berfungsi sebagai ko-pilot pintar untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dengan eksekusi cloud otonom menggunakan **Google Jules API**.

---

## ⚡ Fitur Utama

* **🚀 4 Mode Eksekusi Resmi Google Jules**:
  * **Start** (`start`): Eksekusi kode otonom langsung tanpa berhenti menunggu persetujuan rencana (`requirePlanApproval: false`).
  * **Review** (`review`): Merumuskan rencana eksekusi dan menunggu otorisasi Anda (`requirePlanApproval: true`).
  * **Interactive plan** (`interactive`): Jules berdialog interaktif untuk memperjelas tujuan sebelum merumuskan rencana.
  * **Scheduled task** (`scheduled` [BARU!]): Menjadwalkan tugas untuk dieksekusi secara otonom di masa mendatang.
* **⏰ Mesin Penjadwalan Tugas Otonom**: Loop evaluasi latar belakang yang memicu tugas jatuh tempo, mencatat ID sesi cloud, dan memberi notifikasi ke IDE.
* **🎛️ Mission Control Webview**: Panel interaktif dengan sinkronisasi status cloud live, stepper rencana eksekusi, timeline aktivitas, dan pemisahan tegas banner Approval Plan vs Masukan Pengguna.
* **💻 Ekstensi IDE Native**: Sidebar TreeView untuk Sesi Aktif, Tugas Terjadwal, Arsip Sesi, Konteks Git Workspace, Katalog Agen, dan Jurnal Keputusan.
* **🔌 Server MCP Native (20 Tools)**: Server standar JSON-RPC via `stdio` yang kompatibel dengan Claude, Antigravity CLI, Cursor, dan klien MCP lainnya.
* **🤖 30 Agen Spesialis**: Peran agen yang telah dikalibrasi untuk Coding, Testing, Keamanan, Arsitektur, DevOps, dan Dokumentasi.
* **🛡️ Safety Gate Anti-Gagal**: Memverifikasi keberhasilan sesi cloud (`SUCCEEDED`) dan kebersihan working tree sebelum merge Git.

---

## 🚀 Rincian 4 Mode Eksekusi

| Mode | Label & Ikon | Perilaku Google Jules | Integrasi di Ekstensi |
|---|---|---|---|
| **Start** | 🚀 `Start` | Eksekusi langsung tanpa persetujuan | Implementasi kode otonom seketika. |
| **Review** | 📑 `Review` | Merumuskan rencana dan menunggu persetujuan | Jules merumuskan rencana dan berhenti di `AWAITING_PLAN_APPROVAL`. |
| **Interactive plan** | 🎯 `Interactive plan` | Berdialog untuk memahami tujuan developer | Injeksi direktif eksplorasi; jeda di `AWAITING_USER_FEEDBACK`. |
| **Scheduled task** | ⏰ `Scheduled task` | Menjalankan tugas saat developer tidak di tempat | Disimpan ke `.jules-companion/schedules.json` dan dieksekusi via background timer. |

---

## 💻 Instalasi & Konfigurasi

### Prasyarat
* Node.js v18+ & Git terpasang.
* API Key Google Jules ([Dapatkan API Key](https://jules.google)).

### Memasang VSIX di VS Code atau Antigravity IDE
```bash
# 1. Build dan kemas berkas VSIX
npm run build
npm run package

# 2. Pasang berkas jules-companion-1.1.0.vsix di IDE:
code --install-extension jules-companion-1.1.0.vsix
```

### Mengonfigurasi Kunci API
Di dalam VS Code atau Antigravity IDE:
1. Tekan `Ctrl+Shift+P` (atau `Cmd+Shift+P` di macOS).
2. Ketik `Jules: Set API Key` dan tempelkan Kunci API Google Jules Anda.
3. Atau setel variabel lingkungan `JULES_API_KEY=kunci_anda_di_sini`.

---

## 🔌 Konfigurasi Server MCP (Model Context Protocol)

Tambahkan konfigurasi berikut ke berkas konfigurasi MCP asisten AI Anda (misal `claude_desktop_config.json` atau pengaturan Antigravity CLI):

```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": [
        "/path/ke/Jules-Companion/dist/mcp_server.js"
      ],
      "env": {
        "JULES_API_KEY": "kunci_api_anda_di_sini"
      }
    }
  }
}
```

---

## 🛠️ Kakas Pengembang & Agen AI (Ponytail & Sentrux)

Jules Companion menerapkan standar rekayasa ketat menggunakan dua kakas open-source terintegrasi:
* **[Ponytail](https://github.com/DietrichGebert/ponytail)**: Panduan anti-overengineering bagi pengembang dan agen AI (YAGNI, utamakan standard library, diff minimal).
* **[Sentrux](https://github.com/sentrux/sentrux)**: Linter batas arsitektur yang menegakkan hierarki dependensi 6-tier satu arah (`npm run sentrux:check`).

Lihat [**CONTRIBUTING.md**](CONTRIBUTING.md) dan [**AGENT.md**](AGENT.md) untuk panduan instalasi dan penggunaan lengkap.

---

## 📚 Dokumentasi Arsitektur

Dokumentasi arsitektur komprehensif untuk seluruh 28 modul skrip tersedia dalam Bahasa Inggris:
👉 [**Master Architecture & Codebase Documentation**](docs/codebase/README.md)

---

## 📄 License
MIT License © 2026 Jules Companion Contributors.
