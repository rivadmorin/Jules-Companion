# Jules Companion 🐙

> **[Read in English (Baca dalam Bahasa Inggris)](README.md)**

`jules-companion` adalah Model Context Protocol (MCP) Server, global Agent Skill, dan ekstensi IDE native untuk lingkungan AI coding modern — seperti **Visual Studio Code**, **Google Antigravity IDE**, **Claude Desktop / Claude Code**, **Cursor**, **Windsurf**, dan **OpenCode**.

Aplikasi ini berfungsi sebagai ko-pilot pintar untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dengan eksekusi cloud otonom menggunakan **Google Jules API**.

---

## ⚡ Fitur Utama

* **🚀 4 Mode Eksekusi Resmi Google Jules**:
  * **Start** (`start`): Eksekusi kode otonom seketika tanpa berhenti menunggu persetujuan rencana (`requirePlanApproval: false`).
  * **Review** (`review`): Merumuskan rencana pelaksanaan dan berhenti pada status `AWAITING_PLAN_APPROVAL` untuk otorisasi Anda (`requirePlanApproval: true`).
  * **Interactive plan** (`interactive`): Jules berdialog interaktif untuk memperjelas tujuan developer sebelum merumuskan rencana (berhenti di `AWAITING_USER_FEEDBACK`).
  * **Scheduled task** (`scheduled` [BARU!]): Menjadwalkan tugas otomatis di latar belakang yang dievaluasi oleh background scheduler engine.
* **⏰ Mesin Penjadwalan Tugas Otonom**: Loop evaluasi latar belakang yang memicu tugas jatuh tempo, mencatat ID sesi cloud, dan memberi notifikasi ke IDE.
* **🎛️ Mission Control Webview**: Panel interaktif dengan sinkronisasi status cloud live, stepper rencana eksekusi, timeline aktivitas, dan pemisahan tegas banner Approval Plan vs Masukan Pengguna.
* **💻 Ekstensi IDE Native**: Sidebar TreeView untuk Sesi Aktif, Tugas Terjadwal, Arsip Sesi, Konteks Git Workspace, Katalog 30 Agen, dan Jurnal Keputusan.
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

## 💻 Ekstensi VS Code / Antigravity IDE

`jules-companion` menyertakan ekstensi GUI terintegrasi dengan 33 commands dan 4 TreeView di sidebar!

### 🌟 Fitur Antarmuka (UI)
* **Sidebar Activity Bar**:
  * **Sessions View**: Daftar real-time sesi aktif, grup tugas terjadwal (`⏰ Scheduled Tasks (N pending)`), dan grup arsip (`📦 Archived Sessions`).
  * **Workspace View**: Menampilkan branch Git aktif, remote URL, status working tree, dan status health checks.
  * **Agent Roster**: Direktori 30 agen spesialis beserta deskripsi peran dan batasannya.
  * **Journals View**: Akses cepat ke catatan jurnal pembelajaran agen (`*.journal.md`).
* **Mission Control Webview**: Antarmuka visual lengkap dengan kepatuhan CSP ketat (nonces kriptografis & event delegation `data-action`).
* **Native Diff Integration**: Membuka perubahan kode berdampingan (*side-by-side*) menggunakan diff editor bawaan IDE via `vscode.diff`.

### 📦 Build & Instalasi
```bash
# 1. Package menjadi file installer .vsix
npm run package

# 2. Pasang langsung di VS Code / Antigravity IDE
code --install-extension jules-companion-1.0.1.vsix
```

---

## 🔌 Standar Interaksi Utama: Integrasi MCP

`jules-companion` menyediakan MCP server yang berjalan pada `stdio` melalui JSON-RPC. AI Agent secara native memanggil MCP tool alih-alih mengeksekusi perintah shell CLI.

### Konfigurasi Server

Tambahkan `jules-companion` ke konfigurasi MCP di Klien AI Anda (`claude_desktop_config.json` atau sejenisnya):

```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": ["/path/to/jules-companion/dist/mcp_server.js"],
      "env": {
        "JULES_API_KEY": "kunci_api_anda_di_sini"
      }
    }
  }
}
```

### Katalog Lengkap 20 Native MCP Tools:
1. `deploy_session`: Meluncurkan sesi baru dengan 4 mode peluncuran resmi.
2. `merge_session`: Menjalankan Safety Gate dan menggabungkan branch sesi ke lokal.
3. `auto_process`: Pipeline otonom: deploy -> pantau -> setujui rencana -> merge.
4. `get_session_status`: Mengambil status real-time dari Google Jules REST API.
5. `setup_workspace`: Menginisialisasi direktori `.jules/` dan staging workspace.
6. `list_agents`: Menampilkan daftar 30 agen spesialis dari `registry.json`.
7. `get_agent_info`: Membaca instruksi sistem dan batasan agen target.
8. `list_sources`: Mengambil daftar repositori yang terhubung di Google Jules Cloud.
9. `run_doctor`: Menjalankan pemeriksaan integritas lingkungan (Git, Node, API Key).
10. `create_custom_agent`: Membuat template agen kustom baru dan memperbarui `registry.json`.
11. `cancel_session`: Membatalkan sesi aktif di Google Cloud.
12. `send_session_message`: Mengirim pesan balasan ke sesi yang menunggu masukan.
13. `retry_failed_session`: Meluncurkan ulang sesi yang gagal secara otomatis.
14. `deploy_team`: Meluncurkan sesi paralel untuk beberapa agen sekaligus.
15. `pull_session_diff`: Mengambil unified diff patch dari perubahan kode.
16. `checkout_session_branch`: Melakukan checkout branch Git yang dibuatkan Jules.
17. `create_github_pr`: Membuat GitHub Pull Request via GitHub CLI (`gh`).
18. `read_agent_journal`: Membaca catatan pembelajaran agen di `.journal.md`.
19. `get_review_reports`: Mengambil daftar laporan tinjauan kode di `docs/jules-reviews/`.
20. `rollback_session`: Membatalkan commit merge sesi dari branch kerja lokal secara aman.

---

## 🛠️ Kakas Pengembang & Agen AI (Ponytail & Sentrux)

Jules Companion menerapkan standar rekayasa ketat menggunakan dua kakas open-source terintegrasi:
* **[Ponytail](https://github.com/DietrichGebert/ponytail)**: Panduan anti-overengineering bagi pengembang dan agen AI (YAGNI, utamakan standard library, diff minimal).
* **[Sentrux](https://github.com/sentrux/sentrux)**: Linter batas arsitektur yang menegakkan hierarki dependensi 6-tier satu arah (`npm run sentrux:check`).

Lihat [**CONTRIBUTING.md**](CONTRIBUTING.md) dan [**AGENT.md**](AGENT.md) untuk panduan instalasi dan penggunaan lengkap.

---

## 📚 Dokumentasi Arsitektur Lengkap

Dokumentasi arsitektur komprehensif untuk seluruh 28 modul skrip tersedia dalam Bahasa Inggris:
👉 [**Master Architecture & Codebase Documentation**](docs/codebase/README.md)
