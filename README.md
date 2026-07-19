# Jules Companion 🚀

`jules-companion` adalah custom skill (agen pembantu) tingkat global untuk asisten coding Anda (**Antigravity / Claude Code**). Skill ini dirancang sebagai ko-pilot koordinasi untuk mengintegrasikan alur kerja lokal (Git + GitHub CLI) dan pengerjaan otonom di cloud menggunakan **Google Jules CLI** (`jules`).

Skill ini mengorganisasikan pengerjaan dengan memobilisasi **30 peran agen spesialis** (agnostik bahasa pemrograman) yang terbagi secara tegas ke dalam kelompok Coding (menulis kode) dan Dokumentasi/Review (catatan/Markdown) untuk performa optimal dan efisiensi memori token.

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

Skill ini dilengkapi dengan skrip otomatisasi berbasis **TypeScript** (`tsx`) untuk performa tinggi dan nol kebingungan bagi Agent AI:

* **Inisialisasi Lingkungan Kerja Otomatis (`setup.ts`)**:
  ```bash
  npx tsx scripts/setup.ts
  ```
  Mendeteksi OS, memeriksa dependensi, membuat struktur folder `.jules-companion/`, menyalin file referensi global ke lokal, dan memperbarui `.gitignore`.

* **Registri Metadata Agen Cepat (`registry.json`)**:
  Agent AI dapat membaca metadata ke-30 agen secara instan tanpa memuat 30 file markdown:
  ```bash
  npx tsx scripts/generate_registry.ts
  ```
  Berkas registri tersimpan di `references/agents/registry.json`.

* **Deploy Sesi Cloud Otonom (`deploy_session.ts`)**:
  ```bash
  npx tsx scripts/deploy_session.ts --type review --agents bolt,sentinel --task "Optimasi memori dan perbaiki sanitasi input"
  ```

* **Penggabungan Patch Safe-Git (`merge_session.ts`)**:
  ```bash
  npx tsx scripts/merge_session.ts --session <session_id> --target main
  ```
  Mendownload patch unidiff, membuat branch isolasi, melakukan verifikasi patch, dan menggabungkan kode dengan rollback otomatis jika terjadi masalah.

---

## Cara Instalasi Global (One-Line Install)

Cukup jalankan satu baris perintah ini di terminal Anda untuk menginstal skill secara **global**:

```bash
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
```

Perintah di atas akan otomatis mengkloning repositori ke `~/.gemini/config/skills/jules-companion`, menginstal dependensi, dan menggenerasi registri agen secara otomatis. Skill `jules-companion` siap digunakan di seluruh workspace Anda.

---

## 🤖 Prompt Siap Tempel untuk AI Agent (Copy & Paste)

Cukup salin dan tempelkan salah satu prompt di bawah ini langsung ke chat AI Agent Anda (**Antigravity**, **Claude Code**, **Gemini CLI**, **Cursor**, dll.):

### 1. Prompt Instalasi Global & Inisialisasi Proyek
```text
Tolong pasang dan aktifkan skill jules-companion secara global di sistem saya dengan menjalankan perintah berikut di terminal:
curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash
Setelah instalasi selesai, jalankan setup.ts di proyek ini untuk menyiapkan folder staging .jules-companion/.
```

### 2. Prompt Peluncuran Agen Spesialis (Deploy Session)
```text
Gunakan skill jules-companion untuk mendeploy agen 'bolt' dan 'sentinel' guna menganalisis dan mengoptimasi performa serta keamanan codebase ini. Jalankan skrip:
npx tsx scripts/deploy_session.ts --type review --agents bolt,sentinel --task "Audit keamanan dan optimasi alokasi memori"
```

### 3. Prompt Penarikan & Penggabungan Patch (Merge Session)
```text
Tarik hasil patch dari sesi cloud Google Jules <session_id> dan gabungkan ke branch utama proyek ini dengan aman menggunakan perintah:
npx tsx scripts/merge_session.ts --session <session_id> --target main
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
