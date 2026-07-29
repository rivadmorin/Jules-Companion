# Logika Program

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

### E. Skrip `jules_client.ts`
*   Skrip ini adalah abstraksi murni dari modul bawaan `https` di Node.js, memungkinkan aplikasi melakukan panggilan REST asinkron dengan kontrol penuh pada tajuk (*header* HTTP, seperti menyertakan `X-Goog-Api-Key`), penanganan eror (*error handling*), dan eksekusi payload JSON *native* tanpa bergantung pada paket pihak ketiga besar (seperti Axios/Node-fetch).

### F. Konsol Menu Interaktif (`jules_menu.ts`)
*   Sebagai opsi utama untuk developer manusia (non-AI), menyediakan visual terminal CLI. Menggunakan deteksi UI pintar: jika `@opentui/core` didukung (*via FFI/Zig native*), tampilkan UI *Rich-Terminal* responsif; jika tidak didukung (atau gagal dimuat), sistem tidak *crash* tetapi dengan aman otomatis menurunkan ke mode ASCII CLI standar (menggunakan *Readline* Node).
