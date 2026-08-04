# Jules Companion 🐙

> **[Read in English (Baca dalam Bahasa Inggris)](README.md)**

`jules-companion` adalah Model Context Protocol (MCP) Server, global Agent Skill, dan alat CLI untuk AI coding agent dan IDE modern — seperti **Antigravity IDE**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, dan **Codex CLI**.

Aplikasi ini berfungsi sebagai ko-pilot pintar untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dengan eksekusi cloud otonom menggunakan **Google Jules API**.

---

## ⚡ Fitur Utama

* **🔌 Native MCP Server**: Terhubung langsung secara seamless ke klien AI berbasis MCP (Antigravity IDE, Claude Desktop, OpenCode, Cursor) yang menyediakan tools & resource status sesi real-time.
* **🤖 30 Agen Spesialis**: Agen yang telah dikonfigurasi untuk peran spesifik (misal: *Bolt* untuk performa, *Sentinel* untuk keamanan, *Architect* untuk desain struktur).
* **🛡️ Penggabungan Patch Dua-Tahap**: Patch dari cloud ditarik ke dalam cabang ulasan (review branch) terisolasi terlebih dahulu. Anda menginspeksi laporan Markdown sebelum menggabungkannya ke `main`.
* **🔄 Mesin Auto-Process**: Menangani status penahanan sesi Jules cloud secara otomatis (seperti `AWAITING_PLAN_APPROVAL` & `AWAITING_USER_INPUT`).
* **💻 Konsol TUI Interaktif**: Antarmuka terminal fallback dengan navigasi tombol panah untuk manajemen manual.

---

## 🔌 Standar Interaksi Utama: Integrasi MCP

`jules-companion` menyediakan MCP server yang berjalan pada `stdio` melalui JSON-RPC. AI Agent secara native memanggil MCP tool alih-alih mengeksekusi perintah shell CLI.

### Konfigurasi Server

Tambahkan `jules-companion` ke konfigurasi MCP di Klien AI Anda (`mcp_config.json` atau sejenisnya):

```json
{
  "mcpServers": {
    "jules-companion": {
      "command": "node",
      "args": ["/path/to/jules-companion/dist/mcp_server.js"]
    }
  }
}
```

### Exposed MCP Tools (20 Tools) & Resources

#### 🔹 Group 1: Discovery & Setup
| Nama Tool | Deskripsi | Contoh Payload |
| :--- | :--- | :--- |
| `list_agents` | Mengembalikan daftar JSON dari 30 agen spesialis di `registry.json`. | `{}` |
| `get_agent_info` | Membaca template markdown instruksi dan batasan agen target. | `{ "agentName": "annotator" }` |
| `list_sources` | Mengueri repositori GitHub Cloud terhubung di akun Jules ini. | `{}` |
| `run_doctor` | Menjalankan pemeriksaan integritas lingkungan (.env, API key, git, gh CLI). | `{}` |
| `create_custom_agent` | Membuat file template agen kustom dan memperbarui registry.json. | `{ "name": "custom", "role": "Role", "directives": "...", "boundariesDo": [], "boundariesDont": [] }` |

#### 🔹 Group 2: Session Control & Interactivity
| Nama Tool | Deskripsi | Contoh Payload |
| :--- | :--- | :--- |
| `deploy_session` | Menyebarkan sesi Jules baru dengan agen spesialis. | `{ "type": "start", "agents": "annotator", "task": "...", "mode": "code" }` |
| `get_session_status` | Mengambil status sesi real-time langsung dari Google Jules API. | `{ "sessionId": "12345" }` |
| `cancel_session` | Membatalkan sesi cloud Jules via HTTP DELETE. | `{ "sessionId": "12345" }` |
| `send_session_message` | Mengirim pesan balasan atau instruksi ke sesi yang berjalan. | `{ "sessionId": "12345", "message": "Lanjutkan" }` |
| `retry_failed_session` | Meng-deploy ulang sesi yang gagal dengan instruksi tugas baru. | `{ "sessionId": "12345" }` |

#### 🔹 Group 3: Multi-Agent Orchestration
| Nama Tool | Deskripsi | Contoh Payload |
| :--- | :--- | :--- |
| `auto_process` | Menyetujui plan & mengirim auto-reply secara otomatis. | `{ "all": true }` |
| `deploy_team` | Menyebarkan preset tim multi-agen (full-audit, feature-sprint, refactor-boost). | `{ "preset": "full-audit", "task": "Audit codebase" }` |
| `setup_workspace` | Menginisialisasi lingkungan staging workspace lokal Jules. | `{}` |

#### 🔹 Group 4: Patch, Git & PR Bridge
| Nama Tool | Deskripsi | Contoh Payload |
| :--- | :--- | :--- |
| `merge_session` | Menginspeksi, menyetujui, atau menggabungkan patch sesi cloud Jules. | `{ "sessionId": "12345", "approve": true }` |
| `pull_session_diff` | Mengambil isi patch unidiff tanpa melakukan merge. | `{ "sessionId": "12345", "outputPath": "patch.diff" }` |
| `checkout_session_branch` | Membuat branch fitur terisolasi dan menerapkan patch sesi. | `{ "sessionId": "12345" }` |
| `create_github_pr` | Membuat GitHub Pull Request menggunakan gh CLI untuk sesi terhubung. | `{ "sessionId": "12345" }` |

#### 🔹 Group 5: Knowledge, Quality & Safety
| Nama Tool | Deskripsi | Contoh Payload |
| :--- | :--- | :--- |
| `read_agent_journal` | Membaca catatan pembelajaran agen di `.jules/<agent>.md`. | `{ "agentName": "annotator" }` |
| `get_review_reports` | Memindai dan merangkum laporan audit markdown di `docs/jules-reviews/`. | `{}` |
| `rollback_session` | Mengembalikan stashes uncommitted atau membersihkan working directory. | `{}` |

#### 🔹 MCP Resource
| URI | Deskripsi |
| :--- | :--- |
| `jules://sessions` | Mengembalikan daftar sesi Jules AI aktif dan histori dari status lokal. |

---

## 🚀 Instalasi Satu-Baris

Instal `jules-companion` secara global pada sistem Anda:

### Linux / macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"
```

*Perintah ini mengkloning repositori ke `~/.gemini/config/skills/jules-companion`, membangun artefak TypeScript, menginstal dependensi, dan membuat pintasan global.*

---

## 💬 Slash Commands Agen AI

Saat digunakan sebagai Agent Skill di asisten AI seperti **Antigravity IDE** atau **Claude Code**, slash commands secara langsung dipetakan ke payload MCP Tool native (dengan perintah terminal CLI sebagai fallback sekunder):

| Perintah | Aksi Utama (MCP Tool) | Fallback Sekunder (CLI) |
| :--- | :--- | :--- |
| `/jules-deploy <agen> <tugas>` | `deploy_session` `{ type: "start", mode: "code" }` | `node dist/deploy_session.js --type start ...` |
| `/jules-review <agen> <tugas>` | `deploy_session` `{ type: "review", mode: "review" }` | `node dist/deploy_session.js --type review ...` |
| `/jules-status` | `get_session_status` / Baca `jules://sessions` | `node dist/jules_client.js list --json` |
| `/jules-auto` | `auto_process` `{ all: true }` | `node dist/auto_process.js --all` |
| `/jules-inspect <session_id>` | `merge_session` `{ inspect: true }` | `node dist/merge_session.js --inspect <id>` |
| `/jules-merge <session_id>` | `merge_session` `{ approve: true }` | `node dist/merge_session.js --approve <id>` |
| `/jules-doctor` | Cek diagnostik lingkungan | Cek diagnostik lingkungan |

---

## 📚 Dokumentasi

Untuk penjelasan komprehensif mengenai arsitektur aplikasi, peran agen, dan logika alur kerja:

👉 **[Dokumentasi Aplikasi Lengkap (Bahasa Indonesia)](docs/penjelasan-aplikasi.md)**

---

## 🧹 Hapus Instalasi (Uninstall)

Untuk menghapus `jules-companion` secara bersih:

### Linux / macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"
```
