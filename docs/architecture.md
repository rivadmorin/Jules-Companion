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


## Dokumen Arsitektur Lanjutan

Untuk detail lebih lanjut mengenai masing-masing komponen, silakan merujuk ke dokumen berikut:
*   [Cara Kerja Program](architecture/cara-kerja.md)
*   [Logika Program](architecture/logika.md)
*   [Alur Kerja](architecture/alur-kerja.md)
