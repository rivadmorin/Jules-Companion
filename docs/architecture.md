# Arsitektur dan Dokumentasi Pengembangan Jules Companion

`jules-companion` adalah sebuah *custom skill* dan antarmuka baris perintah (CLI) yang dibangun dengan TypeScript. Tujuan utamanya adalah menjadi ko-pilot yang mengoordinasikan interaksi antara developer (melalui terminal lokal/Git) dengan Google Jules API (sistem eksekusi tugas berbasis *cloud*). Skill ini mengotomatiskan siklus hidup *cloud session*, manajemen *patch*, serta menyediakan pengelompokan 30 *role* (agen) AI spesialis.

Dokumen ini menjelaskan secara komprehensif arsitektur, cara kerja, serta alur logika program dari `jules-companion`.

## 1. Arsitektur Umum (General Architecture)

Arsitektur `jules-companion` membagi sistem menjadi lingkungan **Lokal (Local Workstation)** dan **Cloud (Google Jules VM Sandbox)**, dengan antarmuka yang dijembatani oleh REST API Google Jules.

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
                                   ▼
                     [ LOCAL REPOSITORY UPDATED ]
```

### Komponen Utama:

1.  **Local Staging Workspace (`.jules-companion/`)**: Folder lokal di proyek pengguna yang digunakan untuk menyimpan metadata sesi (`sessions.json`), *registry* agen, dan *patch files* dari *cloud*.
2.  **TypeScript Scripts (`scripts/*.ts`)**: Kumpulan skrip inti yang dikompilasi menjadi JavaScript (`dist/`) yang mengelola fungsionalitas CLI:
    *   `setup.ts`: Inisialisasi dan verifikasi *environment*.
    *   `deploy_session.ts`: Membuat dan mengirim *prompt* ke Google Jules API.
    *   `auto_process.ts`: Mengelola siklus hidup sesi (otomatisasi *approve* dan membalas pertanyaan dari API).
    *   `merge_session.ts`: Manajemen Git, mengunduh *patch* dari *cloud*, dan menggabungkannya ke repositori lokal.
    *   `jules_client.ts`: Modul yang menangani interaksi langsung dengan REST API Google Jules (seperti GET/POST *request*).
    *   `jules_menu.ts`: Konsol terminal interaktif (TUI).
3.  **Google Jules REST API**: Layanan *backend* milik Google (`https://jules.googleapis.com/v1alpha/`) yang merespons permintaan dan memberikan metadata hasil perubahan (*git patches*).
4.  **Agent Templates (`references/agents/*.md`)**: Berisi 30 instruksi sistem (*system prompt*) unik yang memberikan kepribadian dan batasan perilaku untuk berbagai tugas spesifik (contoh: *Bolt* untuk kecepatan, *Sentinel* untuk keamanan, *Critic* untuk *review*).

---

## 2. Cara Kerja Program (How It Works)

Cara kerja `jules-companion` secara garis besar mengikuti pola **Deploy** -> **Process** -> **Merge**, yang dijalankan dan diorkestrasi langsung di lokal komputer *developer*.

1.  **Inisialisasi (Setup)**: Saat pengguna memanggil `jules-companion`, atau skrip `setup.js`, skrip akan memeriksa dependensi lokal (Git, Node.js, `gh`, `jules`), menyinkronkan identitas *git local*, serta memastikan keberadaan dan isi folder `.jules-companion/` serta `.gitignore`. Folder ini digunakan untuk "membungkus" *prompt* referensi 30 agen agar agen AI (*Main Agent*) dapat membacanya.
2.  **Pemilihan Agen & Prompt Fusion**: Developer memilih satu (atau beberapa) dari 30 agen beserta mode kerjanya (`code` atau `review`). Skrip *deploy* ( `deploy_session.ts` ) akan membaca *file* *Markdown* agen tersebut, menyatukannya (*fusion*) dengan *prompt* (instruksi tugas) dari *user*, kemudian menambahkan direktif eksplisit (contoh: "jangan ubah kode sumber, tulis laporan ke direktori tertentu" jika dalam mode `review`).
3.  **Peluncuran Sesi (Cloud Deployment)**: Permintaan gabungan (*prompt*) ini dikirim menggunakan REST API ke *cloud sandbox* Jules. Metadata (*Session ID*, *Task*, dll) akan dicatat di `.jules-companion/sessions.json`.
4.  **Otomasi (Auto-Process)**: Sistem cloud tidak selalu langsung mengeksekusi tugas. Kadang ia menunggu *approval plan* atau *user input*. Skrip `auto_process.ts` dijalankan (secara polling melalui menu interaktif) untuk memantau status API, memberikan persetujuan (*approvePlan*) secara otonom, dan merespons (bila asisten membutuhkan masukan).
5.  **Pengunduhan Patch & Merge**: Jika API mengembalikan status `COMPLETED`, `merge_session.ts` akan mengambil artefak dari sesi tersebut berupa **Git Diff / Patch**. *Patch* ini diterapkan terlebih dahulu ke *branch* sementara (misal: `jules/review-...`) sehingga *developer* dapat memeriksanya dengan aman sebelum melakukan *merge* penuh ke *branch* utama. Laporan interaktif Markdown otomatis dihasilkan saat inspeksi ini.

---

## 3. Logika Program dan Alur Eksekusi Secara Detail

Berikut adalah logika spesifik pada skrip-skrip inti TypeScript.

### A. Skrip `setup.ts` (Workspace Initialization)
*   **Logika Pemeriksaan**: Menjalankan *child_process* untuk `where` (Windows) atau `which` (Unix) guna memastikan bahwa Git, GitHub CLI (`gh`), Node, dan Google Jules CLI tersedia.
*   **Git Identity**: Melakukan `git rev-parse` untuk memeriksa status repositori, kemudian mengatur `user.name` dan `user.email` lokal jika gagal ditemukan.
*   **Self-Healing Copy**: Skrip secara dinamis mencari letak instalasi *skill* global, dan menyalin *file* referensi (*templates agent* dan API docs) ke `.jules-companion/references` proyek saat ini agar agen AI (seperti Claude Code/Antigravity) dapat membaca instruksinya tanpa harus memiliki akses sistem *global root*.

### B. Skrip `deploy_session.ts` (API Integration & Payload Creation)
*   **Validasi Argumen**: Memastikan *agent*, tugas, tipe, dan mode (`code`/`review`) tersedia. Parameter `--agents` bisa menerima *comma-separated list* (misalnya `bolt,sentinel`) dan divalidasi keaktifannya melalui *file* `registry.json`.
*   **Pencocokan Repositori (Git Remote to Jules Source)**: Mengekstrak URL repositori lokal `git config --get remote.origin.url`, lalu mencarinya menggunakan `GET /v1alpha/sources` dari API Jules, guna memastikan sinkronisasi antara *cloud repository* dengan repositori lokal.
*   **Prompt Fusion**: Menggabungkan tiga elemen:
    1.  *Template* Agen (dari `references/agents/nama_agen.md`).
    2.  Instruksi Tugas (*User Request*).
    3.  *Mode Directive* (Aturan ketat jika mode `review` dipilih: melarang *edit* *file* kode dan mewajibkan keluaran ke `docs/jules-reviews/`).
*   **REST Call**: Mengirimkan *POST* ke `/v1alpha/sessions` menggunakan `jules_client.ts`. ID dari hasil kembalian HTTP ini disimpan lokal di *file* `sessions.json`.

### C. Skrip `auto_process.ts` (Lifecycle Management)
*   Membaca daftar sesi dari `sessions.json`.
*   Melakukan interogasi status `GET /v1alpha/sessions/{sessionId}`.
*   **FSM (Finite State Machine) Logic**:
    *   Jika status `AWAITING_PLAN_APPROVAL`: Skrip mengirim permintaan `POST /v1alpha/sessions/{sessionId}:approvePlan`.
    *   Jika status `AWAITING_USER_INPUT`: Skrip mengirim perintah `POST /v1alpha/sessions/{sessionId}:sendMessage` (baik dengan balasan standar yang menginstruksikan asisten untuk lanjut bekerja, atau menggunakan argumen `--reply`).
    *   Tujuannya meminimalkan *feedback-loop* manusia saat Jules VM Sandbox merancang rencana (*plan*).

### D. Skrip `merge_session.ts` (Two-Stage Git Inspection and Merging)
Untuk keamanan tinggi, penggabungan (*merge*) tidak dilakukan secara brutal ke *branch* utama. Alurnya diatur dalam dua tahap (*Two-Stage Engine*):

1.  **Tahap Inspect (`--inspect`)**:
    *   **Safety Gate Check**: Memeriksa *file* `sessions.json` untuk memastikan **tidak ada sesi aktif** (yang dapat menyebabkan bentrok jika di-*merge* duluan).
    *   **Fetch Patch**: Mengunduh `.patch` *file* dari Jules API `GET /v1alpha/sessions/{sessionId}/activities` dan mencari *node* `unidiffPatch`.
    *   **Branch Isolation**: Membuat *branch* Git sementara lokal dengan nama `jules/review-{short_id}`.
    *   **Git Apply**: Melakukan dry-run `git apply --check`. Jika aman, patch dipasang.
    *   **Laporan (*Markdown Report*)**: Skrip menghasilkan laporan ringkasan perbandingan (*diff*). Jika itu adalah sesi mode `review`, skrip mengekstrak isi Markdown dari folder `docs/jules-reviews/` di dalam patch dan memindahkannya ke laporan *output* di `docs/jules-reports/`.
2.  **Tahap Approve (`--approve`)**:
    *   Sistem memvalidasi keberadaan *branch* inspeksi `jules/review-{short_id}`.
    *   Menjalankan perintah `git checkout <target_branch>` dan `git merge <review_branch> --no-edit`.
    *   Menghapus *branch* isolasi lokal yang telah selesai dipakai.

### E. Skrip `jules_client.ts`
*   Skrip ini adalah abstraksi murni dari modul bawaan `https` di Node.js, memungkinkan aplikasi melakukan panggilan REST asinkron dengan kontrol penuh pada tajuk (*header* HTTP, seperti menyertakan `X-Goog-Api-Key`), penanganan eror (*error handling*), dan eksekusi payload JSON *native* tanpa bergantung pada paket pihak ketiga besar (seperti Axios/Node-fetch).

### F. Konsol Menu Interaktif (`jules_menu.ts`)
*   Sebagai opsi utama untuk developer manusia (non-AI), menyediakan visual terminal CLI. Menggunakan deteksi UI pintar: jika `@opentui/core` didukung (*via FFI/Zig native*), tampilkan UI *Rich-Terminal* responsif; jika tidak didukung (atau gagal dimuat), sistem tidak *crash* tetapi dengan aman otomatis menurunkan ke mode ASCII CLI standar (menggunakan *Readline* Node).

## 4. Kesimpulan

Dengan memisahkan antara eksekusi logika (*Google Jules Cloud*) dan penegakan izin operasional (*Local TypeScript Wrapper*), `jules-companion` memberikan platform fleksibel yang memungkinkan 30 spesialis AI untuk ditugaskan secara paralel dan aman. Kemampuannya yang mandiri (*Self-Healing*, *Two-Stage Merging*, dan *Mode Directives*) mencegah agen AI merusak struktur lokal utama saat tidak diinginkan.
