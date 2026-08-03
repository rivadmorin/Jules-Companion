# Jules Companion 🐙

> **[Read in English (Baca dalam Bahasa Inggris)](README.md)**

`jules-companion` adalah Model Context Protocol (MCP) Server, global Agent Skill, dan alat CLI untuk AI coding agent dan IDE modern — seperti **Antigravity IDE**, **OpenCode**, **Claude Code**, **Cursor**, **Windsurf**, dan **Codex CLI**.

Aplikasi ini berfungsi sebagai ko-pilot pintar untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dengan eksekusi cloud otonom menggunakan **Google Jules API**.

---

## ⚡ Fitur Utama

* **🔌 Native MCP Server**: Terhubung langsung secara seamless ke klien AI berbasis MCP (Antigravity IDE, Claude Desktop, OpenCode, Cursor) yang menyediakan tools & resource status sesi real-time.
* **🤖 30 Agen Spesialis**: Agen yang telah dikonfigurasi untuk peran spesifik (misal: *Bolt* untuk performa, *Sentinel* untuk keamanan, *Architect* untuk desain struktur).
* **🛡️ Penggabungan Patch Dua-Tahap**: Patch dari cloud ditarik ke dalam cabang ulasan (review branch) terisolasi terlebih dahulu. Anda menginspeksi laporan Markdown sebelum menggabungkannya ke `main`.
* **🔄 Mesin Auto-Process**: Menangani status penahanan sesi Jules cloud secara otomatis (seperti `AWAITING_PLAN_APPROVAL`).
* **💻 Konsol TUI Interaktif**: Antarmuka terminal fallback dengan navigasi tombol panah untuk manajemen manual.

---

## 🔌 Integrasi MCP (Antigravity IDE, OpenCode, Claude, dll.)

`jules-companion` menyediakan MCP server yang berjalan pada `stdio` melalui JSON-RPC.

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

Saat digunakan sebagai Agent Skill di asisten AI seperti **Antigravity IDE** atau **Claude Code**, Anda dapat memicu tindakan latar belakang menggunakan slash commands:

| Perintah | Deskripsi |
| :--- | :--- |
| `/jules-deploy <agen> <tugas>` | Membuat sesi coding otonom baru. |
| `/jules-review <agen> <tugas>` | Membuat sesi audit yang aman dan non-destruktif. |
| `/jules-status` | Mengecek status dari semua sesi cloud yang aktif. |
| `/jules-auto` | Menjalankan mesin auto-approval dan auto-reply. |
| `/jules-inspect <session_id>` | Menarik patch ke dalam cabang terisolasi dan menghasilkan laporan. |
| `/jules-merge <session_id>` | Menyetujui dan menggabungkan patch yang telah diinspeksi ke cabang utama. |
| `/jules-doctor` | Menjalankan cek integritas sistem dan validasi dependensi. |

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
