import re

with open('README.md', 'r') as f:
    content = f.read()

old_section = "### 8. Skill Uninstallation & Cleanup Prompt\n```text\nPlease cleanly remove the jules-companion skill:\ncurl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | sh\nIf this project has staging folders, remove .jules-companion/, docs/jules-reviews/, and docs/jules-reports/ directories.\n```"

old_section_2 = "### 8. Skill Uninstallation & Cleanup Prompt\n```text\nPlease cleanly remove the jules-companion skill:\ncurl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.sh | sh -s\nIf this project has staging folders, remove .jules-companion/, docs/jules-reviews/, and docs/jules-reports/ directories.\n```"


with open('README.md', 'r') as f:
    lines = f.readlines()

idx = -1
for i, line in enumerate(lines):
    if "### 8. Skill Uninstallation & Cleanup Prompt" in line:
        idx = i
        break

if idx != -1:
    new_content = lines[:idx+7]
    new_content.extend([
        "\n---\n\n",
        "## ⚡ AI Agent Slash Commands\n\n",
        "Mulai sekarang, Anda tidak perlu lagi menyalin/mengetik prompt panjang secara manual. Anda bisa langsung mengetikkan **Slash Commands** berikut di dalam obrolan asisten AI Anda, dan asisten akan secara otomatis mengeksekusi perintah terminal yang sesuai di belakang layar:\n\n",
        "| Slash Command | Fungsi / Deskripsi |\n",
        "| :--- | :--- |\n",
        "| `/jules-menu` | Membuka konsol TUI interaktif Jules Companion. |\n",
        "| `/jules-deploy <agen> <tugas>` | Membuat sesi baru secara otonom (contoh: `/jules-deploy bolt optimasi memori`). |\n",
        "| `/jules-review <agen> <tugas>` | Membuat sesi audit (Review-Only mode) secara aman. |\n",
        "| `/jules-status` | Mengecek status seluruh sesi cloud yang sedang aktif saat ini. |\n",
        "| `/jules-auto` | Menjalankan proses auto-approval dan auto-reply agar sesi cloud berjalan cepat. |\n",
        "| `/jules-inspect <session_id>` | Menarik patch, mengisolasinya ke *review branch*, dan membuat laporan Markdown. |\n",
        "| `/jules-merge <session_id>` | Menyetujui dan menggabungkan patch yang telah diinspeksi ke *main branch*. |\n",
        "| `/jules-doctor` | Menjalankan pemeriksaan keutuhan sistem dan validasi dependensi. |\n"
    ])
    new_content.extend(lines[idx+7:])

    with open('README.md', 'w') as f:
        f.writelines(new_content)
else:
    print("Could not find insertion point")
