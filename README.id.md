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

### MCP Tools & Resources Yang Disediakan

| Tipe | Nama / URI | Deskripsi |
| :--- | :--- | :--- |
| **Tool** | `deploy_session` | Menyebarkan (deploy) sesi Jules baru dengan agen spesialis dan instruksi tugas. |
| **Tool** | `merge_session` | Menginspeksi, menyetujui, atau menggabungkan patch sesi cloud Jules yang telah selesai. |
| **Tool** | `auto_process` | Menyetujui plan & mengirim auto-reply secara otomatis untuk memproses sesi cloud. |
| **Tool** | `get_session_status` | Mengambil status sesi real-time langsung dari Google Jules API. |
| **Tool** | `setup_workspace` | Menginisialisasi lingkungan staging workspace lokal Jules. |
| **Resource** | `jules://sessions` | Mengembalikan daftar sesi Jules AI aktif dan histori dari status lokal. |

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
