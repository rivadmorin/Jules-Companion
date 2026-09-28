# 08 - Utilities & CLI Tooling Reference
**Modul:** [`scripts/utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts), [`scripts/setup.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/setup.ts), [`scripts/generate_registry.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/generate_registry.ts), [`scripts/sync_global.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/sync_global.ts)

---

## 1. Central Utilities Hub (`utils.ts`)

File [`scripts/utils.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/utils.ts) berfungsi sebagai pusat fungsi pembantu (*shared utilities*) yang digunakan oleh CLI, ekstensi VS Code, server MCP, dan seluruh test suite.

### 1.1. Status Evaluation Predicates
Fungsi-fungsi predikat berikut menentukan perilaku alur kerja sesi secara presisi:

```typescript
// Mengecek apakah sesi sedang berjalan aktif
export function isSessionActive(status?: string): boolean;

// Mengecek apakah sesi telah sukses tuntas
export function isSessionCompleted(status?: string): boolean;

// Mengecek apakah sesi mengalami kegagalan
export function isSessionFailed(status?: string): boolean;

// Mengecek apakah sesi sedang MENUNGGU PERSETUJUAN RENCANA
export function isSessionAwaitingApproval(status?: string): boolean;

// Mengecek apakah sesi sedang MENUNGGU MASUKAN / BALASAN PENGGUNA
export function isSessionAwaitingInput(status?: string): boolean;
```

#### Aturan Pembeda Kritis:
- `isSessionAwaitingApproval` hanya bernilai `true` jika status mengandung kata `'plan'`.
- `isSessionAwaitingInput` bernilai `true` jika status mengandung `'input'`, `'feedback'`, `'response'`, atau `'reply'`.
- Pemisahan ini mencegah kesalahan fatal di mana sistem salah mengira permintaan masukan pengguna sebagai persetujuan rencana eksekusi kode.

### 1.2. Health Doctor Checks (`runDoctorChecks`)
Memeriksa kesiapan lingkungan kerja pengguna:
```typescript
export interface DoctorCheckResult {
  ok: boolean;
  checks: {
    git: boolean;
    node: boolean;
    repoInitialized: boolean;
    apiKeySet: boolean;
    registryValid: boolean;
  };
  details: Record<string, string>;
}
```
- Memeriksa ketersediaan binary `git` dan `node` di PATH sistem.
- Memeriksa apakah workspace aktif adalah repositori Git (`.git` valid).
- Memeriksa apakah Kunci API Google Jules telah terkonfigurasi.
- Memeriksa integritas berkas katalog agen `registry.json`.

### 1.3. Standardisasi Format Tanggal (`getFormattedDateDDMMYYYY`)
- Mengonversi objek `Date` menjadi string dengan format strictly `DD-MM-YYYY` (e.g. `28-09-2026`).
- Digunakan untuk penamaan laporan evaluasi, jurnal harian, dan berkas arsip.

### 1.4. Manajemen Pengarsipan Sesi (`archiveSession` & `unarchiveSession`)
- **`archiveSession(sessionId, targetDir)`**: Mengubah flag `archived: true` pada sesi yang bersangkutan di `.jules/sessions.json`. Sesi ini secara otomatis disembunyikan dari daftar sesi aktif di sidebar dan dipindahkan ke grup `📦 Archived Sessions`.
- **`unarchiveSession(sessionId, targetDir)`**: Mengembalikan sesi dari arsip ke daftar aktif (`archived: false`).

### 1.5. Parsing Argumen CLI (`parseArgs`)
- Mem-parsing `process.argv.slice(2)` menjadi dictionary pasangan key-value.
- Mendukung boolean flags (e.g. `--all`, `--force`) dan parameter berargumen (e.g. `--session 123`, `--mode review`).

---

## 2. CLI Tooling Scripts

### 2.1. `setup.ts` (Workspace Scaffolder)
Perintah: `npm run setup`
- Mempersiapkan struktur direktori kerja awal proyek jika belum ada:
  - `.jules/`
  - `.jules/sessions.json`
  - `.jules-companion/`
  - `docs/jules-reports/`
  - `docs/jules-reviews/`
- Menulis berkas template konfigurasi awal secara aman tanpa menimpa data yang telah ada.

### 2.2. `generate_registry.ts` (Registry Compiler)
Perintah: `npm run registry`
- Menelusuri seluruh berkas markdown peran di `references/agents/*.md`.
- Mengekstrak metadata frontmatter YAML (nama, peran, grup, deskripsi).
- Mengkompilasi dan memformat ulang berkas `references/agents/registry.json`.

### 2.3. `sync_global.ts` (Post-Build Synchronizer)
Perintah: `npm run sync` (dieksekusi otomatis pada `postbuild`)
- Memvalidasi bahwa setiap agen di `registry.json` memiliki berkas markdown pendukung yang sah.
- Menyortir urutan kunci agen di `registry.json` secara alfabetis untuk menjamin konsistensi diff di Git.
