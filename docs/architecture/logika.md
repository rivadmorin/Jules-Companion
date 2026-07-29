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
