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
* **🚀 100% Pure Native IDE GUI**: QuickPick Action Center instan, indikator Status Bar, dan streaming log OutputChannel tanpa beban Chromium webview.
* **💻 Ekstensi IDE Native**: Sidebar TreeView untuk Sesi Aktif, Hierarchical Execution Plan, Tugas Terjadwal, Arsip Sesi, Konteks Git Workspace, Katalog 53 Agen, dan Jurnal Keputusan.
* **🔍 Native Side-by-Side Diff Editor**: Inspeksi perubahan patch sesi cloud secara berdampingan (`vscode.diff`) atau unified patch tab tanpa penulisan berkas scratch ke disk (`jules-diff://`).
* **🔌 Server MCP Native (20 Tools)**: Server standar JSON-RPC via `stdio` yang kompatibel dengan Claude, Antigravity CLI, Cursor, dan klien MCP lainnya.
* **🤖 53 Agen Spesialis**: Peran agen yang telah dikalibrasi untuk Coding, Testing, Keamanan, Arsitektur, DevOps, dan Dokumentasi.
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
  * **Agent Roster**: Direktori 53 agen spesialis beserta deskripsi peran dan batasannya.
  * **Journals View**: Akses cepat ke catatan jurnal pembelajaran agen (`*.journal.md`).
* **Session Action Center**: Pop-up interaktif instan berbasis QuickPick untuk kendali penuh atas sesi, rencana eksekusi, dan branch Git tanpa beban webview.
* **Activity Stream OutputChannel**: Saluran streaming log real-time langsung di panel Output bawaan IDE.
* **Native Diff Integration**: Membuka perubahan kode berdampingan (*side-by-side*) menggunakan diff editor bawaan IDE via `vscode.diff`.

### 📦 Cara Instalasi Mudah (Untuk Siapa Saja)

#### 🚀 Opsi 1: Paling Mudah (1-Klik Tanpa Perlu Buka Terminal)
* **Windows**: Cukup **dobel-klik file `install.bat`**.
* **macOS / Linux**: Jalankan `./install.sh` di terminal.
* Script ini otomatis memasang ekstensi ke VS Code / Cursor, mendaftarkan 20 Tools MCP Server, dan memeriksa Google API Key Anda.

#### 🛠️ Opsi 2: Instalasi Manual / Developer
1. Pasang ekstensi VS Code langsung dari paket `.vsix`:
   ```bash
   code --install-extension jules-companion-1.1.0.vsix
   ```
2. Atau jalankan wizard installer via npm:
   ```bash
   npm run installer
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
6. `list_agents`: Menampilkan daftar 53 agen spesialis dari `registry.json`.
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

## 🛠️ Kakas Pengembang & Agen AI (Ponytail, Sentrux & Graphify)

Jules Companion menerapkan standar rekayasa ketat menggunakan tiga kakas open-source terintegrasi:
* **[Ponytail](https://github.com/DietrichGebert/ponytail)**: Panduan anti-overengineering bagi pengembang dan agen AI (YAGNI, utamakan standard library, diff minimal).
* **[Sentrux](https://github.com/sentrux/sentrux)**: Linter batas arsitektur yang menegakkan hierarki dependensi 6-tier satu arah (`npm run sentrux:check`).
* **[Graphify](https://github.com/safishamsi/graphify)**: Peta graf pengetahuan arsitektur codebase interaktif (`graphify-out/graph.html`) dan navigasi relasi (`npm run graphify:update`).

Lihat [**CONTRIBUTING.md**](CONTRIBUTING.md) dan [**AGENT.md**](AGENT.md) untuk panduan instalasi dan penggunaan lengkap.

---

## 🤖 Alur Kerja Developer, Git Hooks & Graf Pengetahuan

Proyek ini memanfaatkan Git hooks otomatis untuk meningkatkan pengalaman developer dan memastikan integritas kode:
* **Pre-commit**: Dikonfigurasi via `scripts/install_hooks.js` untuk menjalankan `npm run verify` (validasi TypeScript `npx tsc --noEmit` dan pengujian unit 117 tests).
* **Post-commit**: Memperbarui layer AST pada graf pengetahuan Graphify (`graphify-out/`) secara otomatis setelah commit.
* **Visualisasi Graf**: Buka berkas [`graphify-out/graph.html`](graphify-out/graph.html) langsung di browser web untuk eksplorasi kluster arsitektur dan god nodes.

## 📚 Dokumentasi Arsitektur Lengkap

Dokumentasi arsitektur komprehensif untuk seluruh 28 modul skrip tersedia dalam Bahasa Inggris:
👉 [**Master Architecture & Codebase Documentation**](docs/codebase/README.md)
