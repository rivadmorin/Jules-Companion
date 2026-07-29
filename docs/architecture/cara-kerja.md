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
