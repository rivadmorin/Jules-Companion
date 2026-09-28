# 01 - Core Subsystem Reference
**Modul:** [`scripts/core/types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts), [`scripts/core/storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts), [`scripts/core/git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts), [`scripts/core/scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts)

---

## 1. Domain Types & Contracts (`types.ts`)

File [`scripts/core/types.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/types.ts) merupakan fondasi tipe domain sentral (*single source of truth*) yang mendefinisikan seluruh struktur data yang digunakan lintas subsistem:

### 1.1. `SessionRecord`
Mewakili catatan status sebuah sesi Jules di lingkungan lokal:
```typescript
export interface SessionRecord {
  id: string;               // ID unik sesi dari Google Jules (e.g. "1234567890abcdef")
  agent: string;            // Nama agen spesialis (e.g. "architect", "tester", "default")
  task: string;             // Deskripsi tugas/instruksi prompt developer
  status: string;           // Status sesi: 'PENDING' | 'RUNNING' | 'AWAITING_PLAN_APPROVAL' | 'AWAITING_USER_FEEDBACK' | 'SUCCEEDED' | 'FAILED'
  branch?: string;          // Nama branch Git target (e.g. "jules/task-xyz")
  timestamp?: string;       // Timestamp pembuatan sesi (format ISO atau lokal)
  createdAt?: string;       // Timestamp pembuatan ISO standar
  updatedAt?: string;       // Timestamp terakhir pembaruan status
  archived?: boolean;       // Penanda apakah sesi diarsipkan oleh pengguna
  prompt?: string;          // Prompt awal lengkap
  mode?: 'code' | 'review'; // Mode operasional sesi
  activities?: any[];       // Log aktivitas cloud yang dieksekusi oleh Jules
  artifacts?: any[];        // Berkas/perubahan kode yang dihasilkan oleh Jules
}
```

### 1.2. `ScheduledTask` & `LaunchMode`
Mendefinisikan entitas tugas terjadwal dan mode eksekusi resmi Google Jules:
```typescript
export type LaunchMode = 'start' | 'review' | 'interactive' | 'scheduled';

export interface ScheduledTask {
  id: string;               // ID unik dengan prefiks "sched-"
  agent: string;            // Agen yang ditugaskan
  mode: 'code' | 'review';  // Mode eksekusi
  type: LaunchMode;         // Mode peluncuran
  task: string;             // Prompt instruksi
  scheduledAt: string;      // Waktu eksekusi yang ditargetkan (ISO string)
  createdAt: string;        // Waktu pembuatan jadwal (ISO string)
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  sessionId?: string;       // ID sesi cloud setelah berhasil dieksekusi
  branch?: string;          // Branch Git opsional
}
```

### 1.3. `ProjectDirs`
Menampung direktori absolut proyek yang terisolasi:
```typescript
export interface ProjectDirs {
  root: string;             // Root folder proyek saat ini
  julesDir: string;         // Folder .jules lokal di root proyek
  agentsDir: string;        // Folder references/agents atau .jules/agents
  reportsDir: string;       // Folder docs/jules-reports
  reviewsDir: string;       // Folder docs/jules-reviews
}
```

---

## 2. Storage Subsystem (`storage.ts`)

Modul [`scripts/core/storage.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/storage.ts) bertanggung jawab atas persistensi data lokal di disk dengan pola penulisan berkas yang aman:

### Fungsi Utama:

#### `getProjectDirs(targetDir?: string): ProjectDirs`
- Menyelesaikan dan mengembalikan struktur direktori absolut berdasarkan folder kerja pengguna.
- Menjamin jalur direktori yang valid baik saat dieksekusi dari lingkungan CLI mandiri maupun dari dalam ekstensi VS Code.

#### `loadSessions(targetDir?: string): SessionRecord[]`
- Membaca dan mem-parsing berkas `.jules/sessions.json`.
- **Ketahanan Kesalahan**: Jika berkas tidak ditemukan atau format JSON korup, fungsi tidak akan melempar *crash*, melainkan mengembalikan *empty array* `[]` secara anggun (*graceful fallback*).

#### `saveSessions(sessions: SessionRecord[], targetDir?: string): void`
- Menuliskan array `SessionRecord[]` kembali ke `.jules/sessions.json`.
- Secara otomatis membuat direktori `.jules/` secara rekursif jika belum ada (`fs.mkdirSync(dirs.julesDir, { recursive: true })`).
- Menggunakan serialisasi berformat (`JSON.stringify(sessions, null, 2)`).

---

## 3. Git CLI Subsystem (`git.ts`)

Modul [`scripts/core/git.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/git.ts) menyediakan lapisan eksekusi Git yang aman dan terisolasi tanpa dependensi modul native eksternal (*zero extra dependencies*).

### `runGit(args: string[], cwd?: string): GitExecutionResult`
Mengeksekusi perintah Git melalui `child_process.spawnSync`.
- **Parameter**:
  - `args`: Array argumen perintah git (e.g. `['status', '--porcelain']`, `['checkout', '-b', branch]`).
  - `cwd`: Direktori kerja tempat perintah git dijalankan (default `process.cwd()`).
- **Return**:
  ```typescript
  export interface GitExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
  }
  ```
- **Keamanan**:
  - Mengatur `maxBuffer: 10 * 1024 * 1024` (10MB) untuk mencegah buffer overflow pada output diff yang besar.
  - Memotong *trailing whitespaces* pada stdout/stderr secara otomatis.
  - Menangkap error spawning subprocess dengan tangguh (menghasilkan `exitCode: -1` jika binary git tidak ditemukan di PATH).

---

## 4. Task Scheduler Engine (`scheduler.ts`)

Modul [`scripts/core/scheduler.ts`](file:///E:/Data%20Utama/Coding/Antigravity/Jules-Companion/scripts/core/scheduler.ts) mengimplementasikan mesin penjadwalan mandiri untuk mengeksekusi tugas Jules di latar belakang tanpa dependensi cron eksternal.

### Alur Kerja Persistensi:
- Jadwal disimpan di `.jules-companion/schedules.json`.
- Setiap tugas memiliki ID format: `sched-${Date.now().toString(36)}-${randomHex}`.

### Daftar Fungsi:

| Fungsi | Tanda Tangan | Deskripsi |
|---|---|---|
| `loadScheduledTasks` | `(targetDir?: string): ScheduledTask[]` | Membaca semua jadwal tersimpan. |
| `saveScheduledTasks` | `(tasks: ScheduledTask[], targetDir?: string): void` | Menyimpan array jadwal ke disk. |
| `addScheduledTask` | `(task: Omit<ScheduledTask, 'id' \| 'createdAt' \| 'status'>, targetDir?: string): ScheduledTask` | Membuat entri jadwal baru berstatus `'pending'`. |
| `cancelScheduledTask` | `(taskId: string, targetDir?: string): boolean` | Mengubah status tugas `'pending'` menjadi `'cancelled'`. Mengembalikan `false` jika tidak ditemukan atau sudah selesai. |
| `deleteScheduledTask` | `(taskId: string, targetDir?: string): boolean` | Menghapus permanen tugas dari berkas jadwal. |
| `getDueScheduledTasks` | `(targetDir?: string, now?: Date): ScheduledTask[]` | Memfilter tugas berstatus `'pending'` dengan nilai `scheduledAt <= now.toISOString()`. |
| `executeDueTasks` | `(targetDir?: string, onExecute?: Function): Promise<number>` | Mengevaluasi dan mengeksekusi semua tugas yang jatuh tempo, mengubah status menjadi `'running'`, memanggil `deploySessionCore`, memperbarui status menjadi `'completed'`, dan mengaitkan `sessionId` cloud yang tercipta. |
| `runScheduledTaskNow` | `(taskId: string, targetDir?: string): Promise<{ success: boolean; sessionId?: string; error?: string }>` | Memaksa eksekusi tugas terjadwal seketika tanpa menunggu waktu `scheduledAt`. |

### Detail Penanganan Status `executeDueTasks`:
```typescript
// Transisi State saat Eksekusi Otomatis:
// 1. Ambil due tasks: scheduledAt <= now
// 2. Mark task as 'running' -> disk sync (mencegah double execution)
// 3. Panggil deploySessionCore({ task, agents, mode, type, branch, targetDir })
// 4. Jika sukses -> mark 'completed', parse session ID dari output, disk sync
// 5. Jika gagal -> revert ke 'pending' agar dapat dicoba ulang pada siklus berikutnya
```
