# 09 - Maintenance & Extension Developer Guide
**Panduan Pengembang untuk Pemeliharaan Jangka Panjang dan Pengembangan Stabil**

---

## 1. Prinsip Utama Pengembangan (Guiding Principles)

Untuk menjaga kodebase Jules Companion tetap stabil, bersih, dan bebas regresi dalam jangka panjang, setiap kontributor wajib mematuhi 4 pilar berikut:

1. **Ponytail Mindset (Lazy Senior Developer)**:
   - Hindari over-engineering atau abstraksi spekulatif yang belum dibutuhkan (*You Aren't Gonna Need It - YAGNI*).
   - Utamakan pustaka standar Node.js (`node:fs`, `node:path`, `node:https`, `child_process`) sebelum menambahkan dependensi `npm` baru.
   - Perbaiki akar masalah (*root cause*), bukan hanya gejalanya.
2. **100% TSDoc / JSDoc Coverage**:
   - Seluruh simbol yang diekspor (`export function`, `export class`, `export interface`, `export type`) wajib memiliki blok dokumentasi TSDoc lengkap dengan tag `@param`, `@returns`, dan deskripsi yang jelas.
   - Audit kelengkapan dokumentasi diuji secara otomatis oleh `tests/doc_coverage.test.ts`.
3. **Zero Regression Policy**:
   - Seluruh perubahan kode harus melewati pengujian lokal (`npm test`) dengan tingkat kelulusan 100% tanpa ada tes yang gagal atau diabaikan.
4. **Keamanan & Isolasi Lingkungan**:
   - Jangan pernah menulis kredensial sensitif atau hardcode path lingkungan lokal ke dalam kode repositori.
   - Penulisan berkas status harus bersifat atomik dan aman dari *race condition*.

---

## 2. Panduan Menambah Fitur Baru

### 2.1. Menambah VS Code Command Baru

Jika Anda ingin menambahkan perintah baru ke ekstensi:

1. **Daftarkan di [`package.json`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/package.json)**:
   - Tambahkan ke array `activationEvents`: `"onCommand:jules.myNewCommand"`.
   - Tambahkan ke `contributes.commands`:
     ```json
     {
       "command": "jules.myNewCommand",
       "title": "My New Command Title",
       "icon": "$(gear)"
     }
     ```
   - (Opsional) Tambahkan ke `contributes.menus` (`view/title` atau `view/item/context`) jika ingin ditampilkan di toolbar atau menu klik-kanan sidebar.
2. **Implementasikan Handler di [`scripts/extension.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/extension.ts)**:
   ```typescript
   context.subscriptions.push(
     vscode.commands.registerCommand('jules.myNewCommand', async (item?: any) => {
       // Logika implementasi perintah...
     })
   );
   ```
3. **Tulis Unit Test**:
   - Tambahkan pengujian di berkas pengujian terkait di `tests/`.

---

### 2.2. Menambah Alat Baru ke Server MCP (Model Context Protocol)

1. **Implementasikan Handler Tool**:
   - Buka berkas kelompok alat terkait di `scripts/mcp/tools/`:
     - `session_tools.ts` untuk manajemen sesi.
     - `agent_tools.ts` untuk agen.
     - `system_tools.ts` untuk utilitas sistem.
2. **Daftarkan Tool ke [`scripts/mcp/registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/mcp/registry.ts)**:
   ```typescript
   this.registerTool({
     name: 'my_new_tool',
     description: 'Deskripsi jelas tentang fungsi alat ini bagi LLM.',
     inputSchema: {
       type: 'object',
       properties: {
         targetDir: { type: 'string', description: 'Direktori target proyek' }
       },
       required: []
     },
     handler: async (args) => {
       // Eksekusi logika dan kembalikan objek data
       return { success: true, result: '...' };
     }
   });
   ```
3. **Verifikasi**:
   - Jalankan `npm test` untuk memverifikasi bahwa total jumlah tools terdaftar dan schema-nya tervalidasi di `tests/mcp.test.ts`.

---

### 2.3. Menambah Agen AI Spesialis Baru

1. **Buat Berkas Template Markdown**:
   - Buat berkas baru di `references/agents/{nama_agen}.md`.
   - Sertakan frontmatter standar:
     ```markdown
     ---
     name: Specialized Name
     role: specialized_role
     group: Coding | Advisory | DevOps | Architecture | Testing | System
     description: Deskripsi singkat tentang keahlian spesifik agen ini.
     ---
     # Agent Persona: Specialized Name
     ...
     ```
2. **Kompilasi Registri**:
   - Jalankan perintah kompilasi: `npm run registry`.
   - Berkas `references/agents/registry.json` akan otomatis diperbarui dan disortir.
3. **Verifikasi**:
   - Jalankan `npm test` untuk memastikan `tests/generate_registry.test.ts` dan `tests/doc_coverage.test.ts` lulus.

---

## 3. Alur Kerja Pengujian & Verifikasi Kualitas

Sebelum melakukan commit dan memaketkan ekstensi, jalankan seluruh siklus verifikasi:

```bash
# 1. Kompilasi TypeScript ke folder dist/ dan sinkronisasi global
npm run build

# 2. Jalankan seluruh unit test suite (100+ tests)
npm test

# 3. Paketkan ekstensi menjadi berkas VSIX
npm run package
```

### Penjelasan Test Suite Penting:
- **`tests/doc_coverage.test.ts`**: Menelusuri seluruh berkas TypeScript di `scripts/` untuk memverifikasi tidak ada fungsi atau tipe data yang lupa didokumentasikan.
- **`tests/scheduler.test.ts`**: Menguji lifecycle tugas otonom (tambah, hapus, batal, evaluasi due, dan eksekusi background).
- **`tests/mission_control.test.ts`**: Menguji isolasi CSP, rendering badge, event delegation, dan pemisahan tegas banner persetujuan rencana vs masukan pengguna.
- **`tests/sessions_provider.test.ts`**: Menguji keandalan parsing tree view dan resolusi ID sesi.

---

## 4. Instalasi & Distribusi Ekstensi

Setelah berkas `jules-companion-1.0.0.vsix` dihasilkan melalui `npm run package`:

### A. Instalasi Otomatis untuk Pengembangan Lokal:
Salin berkas `dist/` dan `package.json` langsung ke direktori ekstensi IDE:
- **VS Code**: `C:\Users\<User>\.vscode\extensions\rivadmorin.jules-companion-1.0.0`
- **Antigravity IDE**: `C:\Users\<User>\.antigravity-ide\extensions\rivadmorin.jules-companion-1.0.0`

### B. Instalasi Manual via Antarmuka IDE:
1. Buka VS Code / Antigravity IDE.
2. Buka menu **Extensions** (`Ctrl+Shift+X`).
3. Klik ikon titik tiga `...` di pojok kanan atas panel Extensions.
4. Pilih **Install from VSIX...**.
5. Pilih berkas `jules-companion-1.0.0.vsix`.

---

## 5. Panduan Troubleshooting & Debugging

| Gejala Masalah | Kemungkinan Penyebab | Solusi & Tindakan |
|---|---|---|
| Permintaan API gagal dengan status `401 Unauthorized` | Kunci API Google Jules belum disetel atau salah. | Jalankan perintah `Jules: Set API Key` (`jules.setApiKey`) atau periksa variabel lingkungan `JULES_API_KEY`. |
| Safety Gate menolak merge branch | Sesi di cloud belum berstatus `SUCCEEDED` atau working tree Git lokal masih kotor (*uncommitted changes*). | Tunggu sesi selesai di Google Jules web, atau lakukan `git stash` / `git commit` pada perubahan lokal terlebih dahulu. |
| Tombol di Mission Control tidak merespons | Pelanggaran CSP karena penggunaan inline script / onclick. | Pastikan seluruh interaksi tombol menggunakan atribut `data-action="..."` yang ditangani oleh event listener terpusat di `mission_control.ts`. |
| Tugas terjadwal tidak berjalan pada waktunya | LiveSync polling dalam keadaan nonaktif. | Pastikan LiveSync aktif (periksa status bar `$(sync) Jules Sync` atau jalankan perintah `jules.toggleLiveSync`). |
