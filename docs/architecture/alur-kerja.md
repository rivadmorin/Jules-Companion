# Alur Eksekusi Secara Detail

### Skrip `merge_session.ts` (Two-Stage Git Inspection and Merging)
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
