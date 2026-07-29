# Jules Companion 🐙

> **[Read in English (Baca dalam Bahasa Inggris)](README.md)**

`jules-companion` adalah custom skill (agen pembantu) tingkat global dan CLI untuk asisten coding Anda (seperti Claude Code). Skill ini dirancang sebagai ko-pilot untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dengan pengerjaan otonom di cloud menggunakan **Google Jules API**.

Skill ini mengorganisasikan **30 agen AI spesialis**, yang terbagi tegas menjadi kelompok Coding (dapat mengubah kode) dan kelompok Dokumentasi/Review (hanya-baca) demi performa optimal.

## ⚡ Fitur Utama

*   **30 Agen Spesialis**: Agen yang telah dikonfigurasi untuk peran spesifik (misal: *Bolt* untuk performa, *Sentinel* untuk keamanan).
*   **Penggabungan Patch Dua-Tahap**: Patch dari cloud ditarik ke dalam cabang ulasan (review branch) terisolasi terlebih dahulu. Anda menggabungkannya ke `main` hanya setelah menginspeksi laporan Markdown yang dihasilkan.
*   **Mesin Auto-Process**: Menangani status penahanan sesi Jules cloud secara otomatis (seperti AWAITING_PLAN_APPROVAL).
*   **UI Interaktif Fallback**: Antarmuka terminal yang bersih dan dapat dinavigasi dengan tombol panah.

## 🚀 Instalasi Satu-Baris

Instal skill ini secara global pada sistem Anda:

### Linux/macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"
```

*Perintah ini akan mengkloning repositori ke `~/.gemini/config/skills/jules-companion`, menginstal dependensi, dan membuat pintasan (shortcut) global `jules-companion`.*

## 💬 Slash Commands Agen AI

Anda dapat menempelkan perintah ini langsung ke obrolan Asisten AI Anda untuk memicu tindakan latar belakang:

| Perintah | Deskripsi |
| :--- | :--- |
| `/jules-menu` | Membuka konsol TUI interaktif Jules Companion. |
| `/jules-deploy <agen> <tugas>` | Membuat sesi coding otonom baru. |
| `/jules-review <agen> <tugas>` | Membuat sesi audit yang aman dan non-destruktif. |
| `/jules-status` | Mengecek status dari semua sesi cloud yang aktif. |
| `/jules-auto` | Menjalankan mesin auto-approval dan auto-reply. |
| `/jules-inspect <session_id>` | Menarik patch ke dalam cabang terisolasi dan menghasilkan laporan. |
| `/jules-merge <session_id>` | Menyetujui dan menggabungkan patch yang telah diinspeksi ke cabang utama. |
| `/jules-doctor` | Menjalankan cek integritas sistem dan validasi dependensi. |

## 📚 Dokumentasi

Untuk penjelasan komprehensif mengenai cara kerja aplikasi ini, arsitekturnya, dan logika alur kerjanya, silakan baca:

👉 **[Dokumentasi Aplikasi Lengkap (Bahasa Indonesia)](docs/penjelasan-aplikasi.md)**

## 🧹 Hapus Instalasi (Uninstall)

Untuk menghapus skill global secara bersih:

### Linux/macOS
```sh
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"
```
