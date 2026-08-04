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
    *   `jules_menu.ts`: Konsol terminal fallback opsional untuk pengujian manual oleh pengguna (manusia).
    *   `mcp_server.ts`: Server Model Context Protocol (MCP) lengkap dengan 20 tools untuk integrasi otonom dengan AI Agent/IDE (Antigravity IDE, OpenCode, Claude Code, Cursor, Windsurf). Tools mencakup Discovery (`list_agents`, `get_agent_info`, `list_sources`, `run_doctor`, `create_custom_agent`), Session Control (`deploy_session`, `get_session_status`, `cancel_session`, `send_session_message`, `retry_failed_session`), Multi-Agent Orchestration (`auto_process`, `deploy_team`, `setup_workspace`), Git & PR Bridge (`merge_session`, `pull_session_diff`, `checkout_session_branch`, `create_github_pr`), serta Knowledge & Safety (`read_agent_journal`, `get_review_reports`, `rollback_session`).
3.  **Google Jules REST API**: Layanan *backend* milik Google (`https://jules.googleapis.com/v1alpha/`) yang merespons permintaan dan memberikan metadata hasil perubahan (*git patches*).
4.  **Agent Templates (`references/agents/*.md`)**: Berisi 30 instruksi sistem (*system prompt*) unik yang memberikan kepribadian dan batasan perilaku untuk berbagai tugas spesifik (contoh: *Bolt* untuk kecepatan, *Sentinel* untuk keamanan, *Critic* untuk *review*).

---


## Dokumen Arsitektur Lanjutan

Untuk detail lebih lanjut mengenai masing-masing komponen, silakan merujuk ke dokumen berikut:
*   [Cara Kerja Program](architecture/cara-kerja.md)
*   [Logika Program](architecture/logika.md)
*   [Alur Kerja](architecture/alur-kerja.md)
# Cara Kerja Program (How It Works)

Cara kerja `jules-companion` secara garis besar mengikuti pola **Deploy** -> **Process** -> **Merge**, yang dijalankan dan diorkestrasi langsung di lokal komputer *developer*. Aplikasi ini bertindak sebagai perantara yang aman antara ruang kerja lokal dan lingkungan Cloud Sandbox VM milik Jules.

1.  **Inisialisasi Lingkungan Kerja (Setup)**
    Saat pertama kali skill dipanggil di sebuah proyek, skrip inisialisasi (`setup.js`) akan:
    *   Mendeteksi sistem operasi dan memeriksa ketersediaan dependensi (*Git*, *Node.js*, `gh`, dan Google `jules` CLI).
    *   Membuat struktur folder terisolasi `.jules-companion/` di akar proyek. Folder ini digunakan sebagai *Staging Workspace* untuk menyimpan metadata sesi (`sessions.json`) dan menampung duplikat instruksi referensi ke 30 agen (*Agent Registry*).
    *   Memastikan `.jules-companion/` terdaftar dalam `.gitignore` untuk mencegah berkas metadata dan instruksi asisten terkomit tanpa sengaja.

2.  **Pemilihan Agen & Prompt Fusion**
    `jules-companion` menyediakan 30 agen spesialis (*Palette, Sentinel, Bolt*, dll) yang dikategorikan ke dalam *Coding Group* (dapat memodifikasi kode) dan *Documenting/Advisory Group* (hanya membaca kode dan menulis markah turun).
    *   Pengguna menjalankan perintah peluncuran (melalui TUI menu interaktif atau CLI langsung) dengan mendefinisikan tugas, memilih agen, dan menetapkan mode (`code` atau `review`).
    *   Sistem melakukan **Prompt Fusion**: Ia menggabungkan template perilaku dasar agen (mis. `references/agents/bolt.md`) dengan *task* spesifik dari pengguna. Jika mode `review` dipilih, ia juga akan secara otomatis menyuntikkan arahan paksa (*strict directive*) yang melarang agen mengubah kode sumber dan mewajibkan penulisan hasil *review* ke dalam bentuk Markdown di dalam folder `docs/jules-reviews/`.

3.  **Peluncuran Sesi (Cloud Deployment)**
    Setelah Prompt tergabung dengan sempurna, instruksi dikirim ke *endpoint* API REST `POST /v1alpha/sessions` menggunakan modul internal `jules_client`. Skrip memetakan secara cerdas URL remote asal repositori `git` untuk memastikan Jules VM Sandbox menangani basis kode yang persis sama. ID sesi dan metadata kemudian disimpan di basis data lokal `sessions.json` untuk pelacakan masa mendatang.

4.  **Otomasi Siklus Hidup (Auto-Process)**
    Sistem eksekusi tugas Jules Sandbox tidak bersifat linear. Terkadang agen membutuhkan persetujuan terhadap rencana tindakan (*AWAITING_PLAN_APPROVAL*) atau input interaktif tambahan (*AWAITING_USER_INPUT*). Daripada meminta pengguna memantau secara manual, fitur `auto_process` dapat mem-*polling* status secara berkala dan dengan sigap menyetujui rencana (memberi otonomi pada agen) dan mengirim tanggapan standar otomatis (atau kustom) agar alur kerja *cloud* tetap berlanjut tanpa hambat.

5.  **Pengunduhan Patch & Merge Lanjutan**
    Ketika tugas selesai (status `COMPLETED`), modul `merge_session` diaktifkan:
    *   Sistem mengambil *Git Patch* yang berisi perubahan kode dari *cloud*.
    *   Patch ini **tidak** langsung diaplikasikan ke *branch* utama. Sebaliknya, *patch* diisolasi terlebih dahulu dalam sebuah cabang lokal sementara (misal: `jules/review-...`).
    *   Setelah *patch* terpasang dengan sukses di cabang tinjauan dan laporan rangkuman perubahan (*Markdown diff*) dihasilkan, pengguna dipersilakan melakukan inspeksi. Jika semua tampak benar, pengguna menyetujui penggabungan dan *patch* akan di-*merge* ke *branch* asal, seraya menghapus *branch* isolasi yang kini usang.
# Logika Program

Berikut adalah rincian fungsional dan logika penanganan status dalam skrip-skrip inti TypeScript.

### A. Skrip `setup.ts` (Workspace Initialization)
*   **Pemeriksaan Ketergantungan Eksternal**: Skrip memanggil proses anak (`child_process.execSync`) ke utilitas OS bawaan seperti `which` (Unix) atau `where` (Windows) untuk memvalidasi presensi binari esensial (*Git, GitHub CLI `gh`, Node.js, `jules`*).
*   **Keutuhan Identitas Git**: Menjalankan rutin pelacakan konfigurasi *Git* (`git config --get user.name`). Jika identitas belum disetel (sebuah masalah umum dalam wadah pengembangan tanpa antarmuka), skrip akan mencoba mengatur nama dan email standar agar dapat membuat *commit patch* nanti.
*   **Mekanisme Pemulihan Otomatis (*Self-Healing*)**: Skrip menemukan jalur global instalasi paket `npm` untuk asisten `jules-companion`. Skrip akan menyalin berkas-berkas templat ke ranah proyek (`.jules-companion/references`). Jika skrip ini dijalankan ulang dan mendapati berkas hilang (terhapus secara tidak sengaja), skrip ini secara proaktif akan merestorasi salinannya kembali.

### B. Skrip `deploy_session.ts` (API Integration & Payload Creation)
*   **Validasi Keamanan Agen (*Registry Gate*)**: Argumen untuk agen (misal `--agents bolt,sentinel`) terlebih dahulu dipilah dan dicocokkan dengan manifes *hard-coded* di dalam berkas `registry.json`. Parameter tidak valid akan ditolak secara dini.
*   **Pengikatan Remote Cerdas**: Mengekstrak repositori jarak jauh via `git config --get remote.origin.url`, dan kemudian mengonversinya (mis. dari gaya SSH `git@github.com:...` atau gaya HTTPS) ke penamaan repositori format *Jules Source*. Jika Jules tidak mengenali repositori ini, pengiriman sesi digagalkan.
*   **Sintesis Prompt (*Fusion*)**: Pembuatan spesifikasi sesi yang meliputi:
    1.  *Template* spesialis (Membaca konten dasar perilaku agen dari manifes lokal).
    2.  Instruksi sasaran tugas.
    3.  Penyuntikan Direktif Pelindung (Mencangkok aturan eksplisit yang melarang modifikasi kode sumber jika parameter `--mode review` aktif).
*   **Ekskusi REST**: Beban kerja JSON (Payload) dikirimkan melalui permintaan POST `v1alpha/sessions` menggunakan pembungkus asinkron `jules_client`. Jika berhasil, berkas keadaan sesi lokal `sessions.json` diperbarui dengan ID sesi yang baru, menandainya sebagai sesi *pending*.

### C. Skrip `auto_process.ts` (Lifecycle Finite State Machine)
Skrip ini beroperasi layaknya *Finite State Machine (FSM)* sederhana dengan tujuan mengurangi beban manual pada pengguna, dengan interogasi berkala (`polling` via HTTP GET):
*   **State `AWAITING_PLAN_APPROVAL`**: Skrip mengeksekusi `POST /v1alpha/sessions/{sessionId}:approvePlan`. Tindakan ini secara otonom meloloskan agen ke tahap eksekusi implementasi.
*   **State `AWAITING_USER_INPUT`**: Sistem cloud telah menghentikan agen karena agen memerlukan persetujuan tambahan atau klarifikasi. Skrip akan mengirim `POST /v1alpha/sessions/{sessionId}:sendMessage` yang berisi umpan balik standar untuk terus maju (atau *reply* kustom apabila disuplai via argumen).
*   **Penanganan Error & Kebuntuan (*Deadlocks*)**: Merekam kegagalan transmisi jaringan dan memodifikasi status sesi internal secara anggun ke `failed` untuk menghindari siklus pemungutan suara berujung-tak-henti.

### E. Skrip `jules_client.ts` (REST Network Abstraction)
*   **Adaptasi Modul Bawaan**: Membungkus modul `node:https` untuk komunikasi ringan, meminimalkan ruang memori tanpa menggunakan pustaka permintaan HTTP berbobot berat (seperti Axios).
*   **Otorisasi Otomatis**: Secara terpusat menangani resolusi identitas rahasia (*secret resolving*). Mengekstrak `JULES_API_KEY` dari lingkungan sistem.
*   **Penyatuan Tanggapan HTTP**: Mendukung resolusi janji-janji (*Promises*) untuk memisahkan pengkodean *header/body/payload* HTTP yang kotor dari skrip perutean lalu lintas level-tinggi.

### F. Konsol Menu Interaktif (`jules_menu.ts`)
*   **Sistem Degradasi UI (*Fallback UI*)**: Berusaha memanfaatkan dependensi *TUI (Text-Based UI)* modern berbasis *Zig/FFI* (`@opentui/core`). Jika pengikatan ini kandas, misalnya dikarenakan kendala sistem arsitektur langka atau kegagalan pembangunan *node-gyp*, konsol memulihkan diri dengan meniru menu baris perintah *ASCII ANSI* standar dengan rapi (memanfaatkan modul `readline` bawaan Node.js). Tindakan ini menjamin CLI tidak pernah hancur hanya karena permasalahan estetika antar-muka.
# Alur Eksekusi Secara Detail

Skrip inti `merge_session.ts` menerapkan standar keamanan Git tinggi untuk menghindari konflik. Penggabungan (*merge*) tidak dilakukan dengan paksaan melainkan difasilitasi dalam **Alur Inspeksi Dua Tahap (*Two-Stage Inspection & Merge Engine*)**.

### Tahap 1: Evaluasi & Inspeksi (`--inspect`)

Tahap ini dirancang untuk mendaratkan perubahan (*patch*) dari *cloud* ke komputer pengembang secara aman, non-destruktif, dan dalam wadah terisolasi.

1.  **Pengecekan Gerbang Keamanan (*Safety Gate Check*)**:
    Sistem mengevaluasi pangkalan data sesi lokal (`sessions.json`). Skrip tidak akan melanjutkan ke tahap pengunduhan perubahan apabila sistem mendeteksi keberadaan sesi agen lain yang masih berjalan dan memanipulasi kode. Ini krusial demi memitigasi kemungkinan benturan penimpaan kode yang kronis.
2.  **Akuisisi Berkas Perubahan (*Patch Extraction*)**:
    Skrip melakukan pertukaran data (`GET`) atas artefak riwayat eksekusi agen (`activities`). Modul ekstraksi akan memindai objek dan melokalisir pangkalan data perubahan terpadu (*unidiff patch*).
3.  **Isolasi Cabang Git (*Branch Isolation*)**:
    Alih-alih menimpakan berkas seketika di cabang utama, perintah Git disebarkan untuk melahirkan cabang tinjauan yang terisolir: `jules/review-{ID_Sesi}`.
4.  **Uji Terap Semu (*Dry-Run Application*)**:
    Memanggil `git apply --check` guna mendiagnosis *patch* dari *cloud* tadi. Sistem mengevaluasi potensi konflik indeks tanpa sesungguhnya memodifikasi piringan keras komputer. Setelah dianggap mumpuni, *patch* baru diterapkan (di dalam cabang khusus tersebut).
5.  **Penggubahan Laporan Rangkuman**:
    Selepas cabang direvisi, berkas-berkas keluaran laporan (jika sesi mode `review` aktif) dipindahkan secara tertib menuju destinasi pelaporan permanen: `docs/jules-reports/`.

### Tahap 2: Persetujuan Penggabungan (`--approve`)

Apabila hasil inspeksi tahap 1 di nilai memuaskan, pengembang dapat menyetujui penerapan akhir:

1.  **Pemastian Integritas Ruang Lingkup**:
    Skrip mengonfirmasi keberadaan cabang referensi inspeksi `jules/review-{ID_Sesi}` agar tak terjadi penggabungan acak.
2.  **Integrasi Cabang (*Merge Execution*)**:
    Sistem beralih kembali (*checkout*) ke cabang tujuan awal pengembang (lazimnya `main`), lalu mengeksekusi `git merge jules/review-{ID_Sesi} --no-edit`. Langkah terotomatisasi ini akan memasang keseluruhan suntingan kode.
3.  **Pembersihan Limbah Sementara (*Cleanup*)**:
    Akhirnya, menyudahi alur, cabang inspeksi `jules/review-...` dilucuti (dihapus). Entri status sesi dalam basis data lokal diperbarui menjadi `merged` agar terhapus dari radar skrip pengecekan di masa depan.
