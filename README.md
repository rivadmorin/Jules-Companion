# Jules Companion 🚀

`jules-companion` adalah custom skill (agen pembantu) tingkat global untuk asisten coding Anda (**Antigravity / Claude Code**). Skill ini dirancang sebagai ko-pilot koordinasi untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dan pengerjaan otonom di cloud menggunakan **Google Jules CLI** (`jules`).

Skill ini mengorganisasikan pengerjaan dengan memobilisasi **30 peran agen spesialis** (agnostik bahasa pemrograman) yang terbagi secara tegas ke dalam kelompok Coding (menulis kode) dan Dokumentasi/Review (catatan/Markdown) untuk performa optimal dan efisiensi memori token.

---

## 📐 Visual Architecture & Workflow

```text
===================================================================================================
                       JULES-COMPANION ARCHITECTURE & WORKFLOW
===================================================================================================

 [ USER / DEVELOPER ]
          │
          ▼
 🤖 [ MAIN AI AGENT ] ──────────────► Read Agent Registry
 (Antigravity / Claude)             (references/agents/registry.json)
          │                                  │
          ▼                                  ▼
 ⚙️  [ LOCAL SETUP ] ──────────────► Initialize Workspace Staging
 (node dist/setup.js)               - .jules-companion/
                                    - docs/jules-reviews/
                                    - .gitignore
          │
          ├────────────────────────────────────────────────────────┐
          │                                                        │
          ▼ (--mode code)                                          ▼ (--mode review)
 💻 [ CODE IMPLEMENTATION ]                               🔍 [ AUDIT-ONLY REVIEW ]
 - Direct functional code changes                          - Strict Directive Injected
 - App logic updates (.ts, .py, etc.)                      - NO app code changes allowed
          │                                                - Writes Markdown Report to:
          │                                                  docs/jules-reviews/
          │                                                        │
          └────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
                       🛰️ [ GOOGLE JULES API ]
                       (POST /v1alpha/sessions)
                                   │
                                   ▼
                       ☁️ [ CLOUD VM SANDBOX ]
                       (Task Execution & Git Diff)
                                   │
                                   ▼
                     🔀 [ ADVANCED PATCH MERGE ]
                    (node dist/merge_session.js)
                                   │
             ┌─────────────────────┴─────────────────────┐
             ▼                                           ▼
  📊 [ VISUAL CODE DIFF REPORT ]               📄 [ REVIEW DOCUMENT REPORT ]
  - File changes (--stat)                      - Output review file path
  - Diff log saved to:                         - Print summary snippet
    .jules-companion/scratch/diff-*.log        - Main Agent inspection
             │                                           │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
                       ✅ [ CLEAN GIT MERGE ]
                       (Target Branch: main)

===================================================================================================
```

---

## Persyaratan (Prerequisites)

Sebelum memasang skill ini, pastikan perkakas berikut telah terinstal dan terkonfigurasi di sistem Anda:

1. **Google Jules CLI** (Terinstal secara global dan sudah masuk):
   ```bash
   npm install -g @google/jules
   jules login
   ```
2. **GitHub CLI (`gh`)** (Terinstal dan sudah terautentikasi):
   ```bash
   gh auth login
   ```
3. **Git**: Repositori lokal yang diinisiasi Git (kecuali jika dijalankan dalam safe mode Non-Git).
4. **Variabel Lingkungan**: Simpan `JULES_API_KEY` Anda di dalam berkas `.env` root proyek Anda jika ingin menggunakan pemanggilan REST API secara otomatis.

---

## ⚡ Otomatisasi TypeScript & Registri Agen Cepat

Skill ini dilengkapi dengan skrip otomatisasi berbasis **TypeScript** yang dikompilasi ke JavaScript (`dist/`) untuk performa tinggi dan nol kebingungan bagi Agent AI:

* **Inisialisasi Lingkungan Kerja Otomatis (`setup.js`)**:
  ```bash
  node dist/setup.js
  ```
  Mendeteksi OS, memeriksa dependensi, membuat struktur folder `.jules-companion/`, folder tinjauan `docs/jules-reviews/`, folder laporan `docs/jules-reports/`, dan memperbarui `.gitignore`.

* **Konsol Menu Interaktif & Smart Launch (`jules_menu.js`)**:
  ```bash
  # Buka konsol menu terpadu dari direktori proyek mana saja
  jules-companion
  ```
  Menyediakan alur interaktif modern berbasis **Anomaly OpenTUI** (`@opentui/core`) yang mendukung navigasi tombol panah keyboard. Jika pustaka FFI/Zig native tidak didukung pada platform runtime Anda, konsol otomatis beralih (*fallback*) ke menu ANSI Box-Drawing 75-karakter premium secara aman tanpa *crash*. Menyediakan alur Deployment, Smart Launch, Polling Sesi Aktif, Inspeksi Patch + Laporan Markdown, hingga Merge Akhir.

* **Deploy Sesi Cloud Otonom (`deploy_session.js`)**:
  ```bash
  # Mode 'code' (default): Penulisan kode fungsional biasa
  node dist/deploy_session.js --type start --agents bolt --task "Optimasi memori loop" --mode code

  # Mode 'review': Audit non-destruktif, menulis laporan ke docs/jules-reviews/
  node dist/deploy_session.js --type review --agents sentinel --task "Audit keamanan" --mode review
  ```

* **Auto-Approval & Auto-Reply Engine (`auto_process.js`)**:
  ```bash
  # Polling otomatis dan persetujuan rencana / balasan sesi cloud yang tertunda
  node dist/auto_process.js --all
  ```

* **Inspeksi & Penggabungan Patch Dua-Tahap (`merge_session.js`)**:
  ```bash
  # Tahap 1: Tarik patch ke branch isolasi & buat Laporan Markdown lokal
  node dist/merge_session.js --inspect <session_id>

  # Tahap 2: Merge branch isolasi ke branch utama setelah laporan disetujui
  node dist/merge_session.js --approve <session_id>
  ```

---

## Cara Inisiasi Inisialisasi Global (One-Line Install)

Cukup jalankan satu baris perintah ini di terminal Anda untuk menginstal skill secara **global** beserta perintah pintasnya:

```bash
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

Perintah di atas akan otomatis mengkloning repositori ke `~/.gemini/config/skills/jules-companion`, menginstal dependensi, membuat shortcut global `jules-companion` di `~/.local/bin/`, dan menggenerasi registri agen secara otomatis.

---

## 🤖 Prompts Ready for AI Agents (Copy & Paste)

Copy and paste any of the prompts below directly into your AI Agent chat (**Antigravity**, **Claude Code**, **Gemini CLI**, **Cursor**, etc.):

### 1. Global Project Initialization Prompt
```text
Please install and activate the jules-companion skill globally on my system:
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
After installation completes, run jules-companion option 7 (or node dist/setup.js) in this project to initialize the staging directory, docs/jules-reviews/, and docs/jules-reports/ folders.
```

### 2. Launch Interactive Companion Console Prompt
```text
Launch the interactive Jules Companion menu to manage the Google Jules session lifecycle:
jules-companion
```

### 3. Smart Launch Agent (Auto-Interpret Intent) Prompt
```text
Use the Smart Launch Option 2 in jules-companion to automatically map the required specialist agents and execution mode (code or review) based on my goal:
Type Option 2 inside jules-companion, then input: "clean up memory leaks in jules_client and optimize loop allocations"
```

### 4. Check Active Session Status (Single-Shot Token-Saver) Prompt
```text
Verify the current live state of all active cloud sessions without loop polling:
Type Option 3 inside jules-companion
```

### 5. Auto-Process Pending Approvals & Replies Prompt
```text
Automatically approve pending plans and send confirmation replies to the cloud sessions:
Type Option 4 inside jules-companion
```

### 6. Inspect Patch & Generate Markdown Report Prompt
```text
Run Option 5 in jules-companion to enforce the All-Sessions-Completed Safety Gate, pull the patch into an isolated review branch, and generate the universal Markdown summary report under docs/jules-reports/ for inspection.
```

### 7. Approve & Finalize Git Merge Prompt
```text
Review the generated report under docs/jules-reports/ and merge the approved patch into the main branch:
Type Option 6 inside jules-companion to finalize the git merge and delete temporary branches.
```

### 8. Skill Uninstallation & Cleanup Prompt
```text
Please cleanly remove the jules-companion skill:
rm -rf ~/.gemini/config/skills/jules-companion
rm -f ~/.local/bin/jules-companion
If this project has staging folders, remove .jules-companion/, docs/jules-reviews/, and docs/jules-reports/ directories.
```

---

## Cara Uninstall (Uninstallation)

Untuk menghapus skill global ini secara bersih:

```bash
rm -rf ~/.gemini/config/skills/jules-companion
```
2. Jika Anda ingin melakukan pembersihan penuh di suatu proyek tertentu, tanyakan asisten untuk membersihkan staging area proyek Anda. Asisten akan menghapus `.jules-companion/` serta membersihkan entri pengabaian di berkas `.gitignore` secara otomatis.

---

## Fitur Unggulan & Alur Kerja Baru

### 1. Penyiapan & Asesmen Lingkungan Kerja (Self-Copying Modular)
Pada kali pertama skill dipanggil di suatu proyek baru:
* **Deteksi OS Host**: Asisten mendeteksi otomatis sistem operasi Anda (Windows, macOS, Linux, atau Cloud VM container).
* **Verifikasi PATH Dependensi**: Melakukan diagnosis otomatis jalur executable dependensi (`jules`, `gh`, `git`).
* **Penyalinan Mandiri Per-Agen**: Membuat folder `.jules-companion/agents/{nama_agen}/` untuk 30 agen spesialis dan menyalin berkas spesifikasi global ke berkas lokal proyek `reference.md` dan inisiasi berkas jurnal kosong `journal.md` secara terisolasi.
* **Keamanan Gitignore**: Folder `.jules-companion/` secara otomatis didaftarkan pada berkas `.gitignore` lokal.

### 2. Klasifikasi Tegas Kelompok Kerja Agen
* **💻 Kelompok Coding (24 Peran)**: Palette 🎨, Sentinel 🛡️, Bolt ⚡, Nomad 🎒, Packager 💿, Exterminator 🐛, Builder 🧱, Conduit 🔌, Alchemist 🧪, Gatekeeper 🔑, Bridge 🧲, Dockerist 🐳, Modernizer ⚙️, Inspector 🔎, Janitor 🧹, Logger 🪵, Benchmarker ⏱️, Watcher 👁️, Chameleon 🦎, Innovator 💡, Materialist 🎴, Partisan 🛰️, Netrunner 🌐, Adapter 🔌.
  * *Wewenang*: Diizinkan menulis, memodifikasi, menguji, dan memformat berkas kode sumber aplikasi.
* **📝 Kelompok Dokumentasi & Analitis (6 Peran)**: Scribe 📝, Cartographer 🗺️, Grader 📊, Consultant 🧠, Critic 🗣️, Proteus 🎭.
  * *Wewenang*: Dilarang keras memodifikasi kode sumber aplikasi fungsional; hanya diperbolehkan menulis berkas Markdown (`.md`), ulasan kode, diagram, atau visualisasi ASCII.

### 3. Alur Revisi Otonom via Komentar PR GitHub CLI
Setiap kali PR dibuat oleh Jules, asisten dapat meminta revisi secara otonom langsung dari terminal lokal Anda menggunakan pembungkus perintah GitHub CLI:
```bash
gh pr comment <nomor_pr> --body "@jules tolong revisi ini: < detail_revisi_anda >"
```
Jules di cloud akan secara otomatis mengenali mention `@jules`, melakukan perbaikan kode di sandbox VM, dan asisten lokal akan memandu Anda menyinkronkan kembali patch barunya secara aman.

### 4. Penyimpanan Sesi Terisolasi
Seluruh patch, log, dan berkas rencana kerja hasil tarikan (*pull*) dari cloud Jules akan ditaruh secara terpisah di bawah sub-folder sesi milik agen terkait (`.jules-companion/agents/{nama_agen}/sessions/{sessionId}/`).

### 5. Diagnosis Mandiri `/jules-companion doctor`
Picu perintah `/jules-companion doctor` di dalam obrolan asisten untuk memverifikasi keutuhan folder 30 agen kustomisasi global/lokal, konfigurasi Gitignore, serta status login CLI. Jika ada berkas `reference.md` lokal yang hilang, asisten secara otonom menyalin kembali berkas tersebut dari folder kustomisasi global untuk memulihkan keutuhan sistem.

---

## Struktur Repositori Arsip Proyek

```
Jules-Companion/
├── SKILL.md              # Salinan instruksi perilaku asisten (English)
├── README.md             # Panduan instalasi global & fitur (Indonesian)
└── references/
    ├── jules-cli.md      # Panduan perintah CLI Google Jules
    ├── jules-api.md      # Panduan endpoint REST API Google Jules
    ├── prompt-templates.md # Manifest / Indeks Induk 30 agen spesialis
    └── agents/           # 30 berkas template modular (Bolt.md layout standard)
        ├── palette.md
        ├── sentinel.md
        ├── bolt.md
        └── ...
```
