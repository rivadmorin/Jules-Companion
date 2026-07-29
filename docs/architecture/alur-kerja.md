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
