# 05 - Mission Control Webview Subsystem Reference
**Modul:** [`scripts/ui/mission_control.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/ui/mission_control.ts)

---

## 1. Konsep & Tujuan Mission Control

**Mission Control** adalah panel webview interaktif visual berkemampuan penuh yang dirancang untuk memantau, mengendalikan, dan berinteraksi secara real-time dengan sesi eksekusi Google Jules langsung di dalam IDE.

Mission Control mengatasi keterbatasan TreeView sidebar sederhana dengan menyediakan:
- Pelacakan alur kerja (*timeline*) aktivitas cloud langkah-demi-langkah.
- Tampilan rincian langkah rencana eksekusi (*execution plan stepper*).
- Pemeriksaan visual artefak dan perubahan kode (*code changeset*).
- Dialog interaktif langsung untuk persetujuan rencana (*plan approval*) dan pengiriman balasan pesan (*user feedback*).

```mermaid
graph LR
    subgraph VS Code Extension Host
        API["Jules Cloud REST API"]
        MC_CTRL["Mission Control Controller\n(scripts/ui/mission_control.ts)"]
        CMD["Extension Commands Dispatcher"]
    end

    subgraph Webview Sandbox (HTML/CSS/JS)
        HTML["Responsive Mission Control UI"]
        DELEGATE["Event Delegation Listener\n(document.addEventListener click)"]
        STATE["Client-Side DOM Rendering"]
    end

    API -->|Live Session Data| MC_CTRL
    MC_CTRL -->|Injected HTML with CSP Nonce| HTML
    DELEGATE -->|postMessage: { action, payload }| MC_CTRL
    MC_CTRL -->|Execute Action| CMD
```

---

## 2. Kebijakan Keamanan & Content Security Policy (CSP)

Untuk mematuhi standar keamanan ketat VS Code dan mencegah potensi serangan *Cross-Site Scripting* (XSS), Webview Mission Control menerapkan aturan:

1. **CSP Nonce Acak**: Setiap kali panel di-render, string kriptografis `nonce` acak dibuat (`getNonce()`).
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'none';
     style-src 'unsafe-inline';
     script-src 'nonce-${nonce}';
     img-src https: data:;
   ">
   ```
2. **Nir-Inline Handler (No Inline Event Handlers)**:
   - Penggunaan atribut seperti `onclick="doSomething()"` atau `onsubmit="..."` dilarang total.
   - Semua elemen interaktif menggunakan atribut data semantik:
     ```html
     <button class="btn btn-primary" data-action="approve-plan" data-session-id="${session.id}">
       Approve Plan
     </button>
     ```
3. **Pusat Delegasi Event (Event Delegation)**:
   - Skrip klien di dalam webview hanya memasang satu listener terpusat pada elemen `document`:
     ```javascript
     document.addEventListener('click', (e) => {
       const target = e.target.closest('[data-action]');
       if (!target) return;
       const action = target.getAttribute('data-action');
       const sessionId = target.getAttribute('data-session-id');
       vscode.postMessage({ command: action, sessionId });
     });
     ```

---

## 3. Rekonsiliasi State: Cloud Live vs Cache Lokal

Salah satu aspek terpenting dari Mission Control adalah **State Reconciliation**:

```typescript
// Mengambil status real-time langsung dari cloud API terlebih dahulu
let liveSession = session;
try {
  const fresh = await getSessionApi(session.id);
  if (fresh && fresh.id) {
    liveSession = { ...session, ...fresh };
  }
} catch {
  // Graceful fallback ke data lokal jika koneksi terputus
  liveSession = session;
}
```

### Mengapa Ini Krusial?
Jika developer menyetujui rencana di antarmuka web Google Jules pada peramban terpisah, cache lokal di disk mungkin masih menandai status sebagai `AWAITING_PLAN_APPROVAL`. Dengan memprioritaskan data langsung dari endpoint cloud, Mission Control **tidak akan pernah** menampilkan banner persetujuan palsu untuk sesi yang sudah berjalan atau selesai.

---

## 4. Banner Interaksi Dinamis

Mission Control secara cerdas membedakan kebutuhan intervensi pengguna menjadi dua banner visual yang sangat berbeda:

### 4.1. Banner Persetujuan Rencana (`AWAITING_PLAN_APPROVAL`)
- **Pemicu**: Status sesi resmi adalah `AWAITING_PLAN_APPROVAL` atau `PLAN_APPROVAL_REQUIRED`.
- **Tampilan**:
  - Warna aksen: Emas / Amber peringatan.
  - Pesan: *"Plan Approval Required: Jules cloud agent has formulated an execution plan and paused for your authorization."*
  - Aksi: Tombol `✅ Approve Execution Plan` yang memicu pemanggilan `approvePlanApi`.

### 4.2. Banner Masukan Pengguna (`AWAITING_USER_INPUT` / `AWAITING_USER_FEEDBACK`)
- **Pemicu**: Status sesi berstatus menunggu respons developer (misal pada mode 🎯 **Interactive plan** atau saat Jules mengajukan pertanyaan klarifikasi).
- **Tampilan**:
  - Warna aksen: Biru interaktif / Dialog.
  - Pesan: *"User Feedback Required: Jules is requesting your input or clarification to proceed."*
  - Aksi: Area teks masukan dengan tombol `💬 Send Message to Jules` yang memicu `sendMessageApi`.

> **PENTING**: Sistem secara ketat memvalidasi status agar **tidak pernah** menampilkan banner persetujuan rencana ketika sesi sebenarnya hanya membutuhkan masukan atau balasan pesan biasa!

---

## 5. Komponen-Komponen Tampilan Panel

1. **Header Sesi**:
   - Judul ID Sesi dengan tombol salin.
   - Badge Agen spesialis.
   - Badge Status berdenyut (*pulsing animated indicator*).
   - Indikator branch Git target.
2. **Toolbar Aksi Cepat**:
   - `Approve Plan` (Kondisional)
   - `Send Feedback` (Kondisional)
   - `Merge Branch` (Hanya aktif saat status `SUCCEEDED`)
   - `View Visual Diff`
   - `Open in Jules Web`
   - `Refresh Live Data`
3. **Execution Plan Stepper**:
   - Menampilkan tahapan-tahapan yang dirumuskan oleh agen lengkap dengan ikon status centang untuk langkah yang telah rampung.
4. **Timeline Aktivitas Cloud**:
   - Riwayat eksekusi command shell yang dijalankan oleh agen di lingkungan sandbox cloud.
5. **Code Changeset Viewer**:
   - Ringkasan berkas yang dimodifikasi, baris yang ditambah (`+`), dan baris yang dihapus (`-`).
