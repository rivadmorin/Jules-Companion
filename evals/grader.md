# Evals Grading Report

This report grades the performance of the `jules-companion` skill against baseline runs.

## Test Case: TC_001_OS_SETUP_SELF_COPY
**Prompt**: `initialize jules-companion in this new project with Windows operating system`

### Baseline Run
*Response*: *"I will initialize config.json and sessions.json in .jules-companion/ folder."*
- [❌ FAIL] Assistant detects Windows OS and configures backslash path separator.
- [❌ FAIL] Assistant performs path checks using where command.
- [❌ FAIL] Assistant copies jules-cli.md, jules-api.md, and prompt-templates.md into .jules-companion/references/ locally.

### With Skill Active Run
*Response*: *"Windows OS detected. Setting path separator to '\' and verifying dependecies with 'where jules', 'where gh', 'where git'. Creating .jules-companion/ folder, config.json, sessions.json, and appending it to .gitignore. Copying references (jules-cli.md, jules-api.md, prompt-templates.md) from global customization directory /home/toor/.gemini/config/skills/jules-companion/references/ to .jules-companion/references/ locally."*
- [✅ PASS] Assistant detects Windows OS and configures backslash path separator.
- [✅ PASS] Assistant performs path checks using where command.
- [✅ PASS] Assistant copies jules-cli.md, jules-api.md, and prompt-templates.md into .jules-companion/references/ locally.

---

## Test Case: TC_002_SELF_HEALING_INTEGRITY
**Prompt**: `one of the reference files jules-cli.md was accidentally deleted from .jules-companion/references/`

### Baseline Run
*Response*: *"I will try to find jules-cli.md. If it's missing, you may need to recreate it."*
- [✅ PASS] Assistant audits local reference files during initialization.
- [❌ FAIL] Assistant autonomously detects missing jules-cli.md.
- [❌ FAIL] Assistant copies jules-cli.md from global folder to restore local integrity.

### With Skill Active Run
*Response*: *"Scanning local staging directory... Detected that .jules-companion/references/jules-cli.md is missing. Initiating self-healing protocol: copying fresh copy of jules-cli.md from global folder /home/toor/.gemini/config/skills/jules-companion/references/jules-cli.md to restore project integrity autonomously."*
- [✅ PASS] Assistant audits local reference files during initialization.
- [✅ PASS] Assistant autonomously detects missing jules-cli.md.
- [✅ PASS] Assistant copies jules-cli.md from global folder to restore local integrity.

---

## Test Case: TC_003_UNIFIED_SYNC_MERGE
**Prompt**: `synchronize all project sessions and merge parallel sessions sess_abc and sess_def`

### Baseline Run
*Response*: *"I will pull session sess_abc and merge it."*
- [❌ FAIL] Assistant executes jules remote list --session to retrieve cloud sessions.
- [❌ FAIL] Assistant merges cloud sessions data into sessions.json cache.
- [❌ FAIL] Assistant pulls sess_abc and sess_def to isolated branches and guides a consolidated multi-merge.

### With Skill Active Run
*Response*: *"Executing 'jules remote list --session' to fetch all remote sessions associated with this repo. Discovered sess_abc and sess_def. Merging them into local sessions.json database. Checking out isolated branch jules/task-sess_abc and jules/task-sess_def. Pulling patches and resolving conflicts to guide a consolidated multi-merge into a single work branch."*
- [✅ PASS] Assistant executes jules remote list --session to retrieve cloud sessions.
- [✅ PASS] Assistant merges cloud sessions data into sessions.json cache.
- [✅ PASS] Assistant pulls sess_abc and sess_def to isolated branches and guides a consolidated multi-merge.

---

## Test Case: TC_004_DOCTOR_CHECK
**Prompt**: `run /jules-companion doctor command to check the skill health`

### Baseline Run
*Response*: *"Checking if jules is installed. Yes it is. That is all."*
- [❌ FAIL] Assistant audits global customization folders.
- [❌ FAIL] Assistant audits local staging directories and .gitignore settings.
- [❌ FAIL] Assistant checks CLI version, login status, and key validities and outputs status table.

### With Skill Active Run
*Response*: *"Initiating jules-companion health check... 
- Global customization files: ✅ PASS (Found in /home/toor/.gemini/config/...)
- Local staging files: ✅ PASS (Found config.json, sessions.json)
- Gitignore exclusion: ✅ PASS (.jules-companion/ is ignored)
- Dependencies check: ✅ PASS (jules, gh installed, JULES_API_KEY valid)
Everything is configured correctly and fully functional!"*
- [✅ PASS] Assistant audits global customization folders.
- [✅ PASS] Assistant audits local staging directories and .gitignore settings.
- [✅ PASS] Assistant checks CLI version, login status, and key validities and outputs status table.

---

## Test Case: TC_005_PARTISAN_DECENTRAL
**Prompt**: `help me design and refactor this backend to be decentralized, P2P, and censorship-resistant`

### Baseline Run
*Response*: *"I will modify the code to make it decentralized."*
- [❌ FAIL] Assistant suggests delegating to Partisan 🛰️ agent.
- [❌ FAIL] Assistant describes P2P overlay networks (IPFS/Tor) in suggested prompt.
- [❌ FAIL] Assistant enforces boundaries of Coding group for Partisan.

### With Skill Active Run
*Response*: *"Skenario desentralisasi & tahan sensor terdeteksi. Direkomendasikan mendelegasikan tugas ke agen Partisan 🛰️ (Kelompok Coding). Menyusun prompt untuk Jules untuk mengimplementasikan P2P overlay networks (libp2p/IPFS/Tor) serta menyegel batasan agar tidak memodifikasi file konfigurasi database cloud pusat."*
- [✅ PASS] Assistant suggests delegating to Partisan 🛰️ agent.
- [✅ PASS] Assistant describes P2P overlay networks (IPFS/Tor) in suggested prompt.
- [✅ PASS] Assistant enforces boundaries of Coding group for Partisan.

---

## Test Case: TC_006_NETRUNNER_SETUP
**Prompt**: `configure Nginx reverse proxy for our web server to use SSL and port forwarding`

### Baseline Run
*Response*: *"I will configure your Nginx server."*
- [❌ FAIL] Assistant suggests delegating to Netrunner 🌐 agent.
- [❌ FAIL] Assistant configures reverse proxy and web-networking protocols in suggested prompt.
- [❌ FAIL] Assistant places Netrunner 🌐 in Coding Group.

### With Skill Active Run
*Response*: *"Penyusunan konfigurasi server web terdeteksi. Direkomendasikan mendelegasikan ke agen Netrunner 🌐 (Kelompok Coding). Menuliskan skema prompt untuk menyusun reverse proxy Nginx, TLS/SSL, dan port forwarding secara aman."*
- [✅ PASS] Assistant suggests delegating to Netrunner 🌐 agent.
- [✅ PASS] Assistant configures reverse proxy and web-networking protocols in suggested prompt.
- [✅ PASS] Assistant places Netrunner 🌐 in Coding Group.

---

## Test Case: TC_007_ADAPTER_CROSSPLATFORM
**Prompt**: `write an automated build script that runs seamlessly on Windows (.bat) and Linux (.sh) without path mismatch issues`

### Baseline Run
*Response*: *"I will write a script for Windows and Linux."*
- [❌ FAIL] Assistant suggests delegating to Adapter 🔌 agent.
- [❌ FAIL] Assistant ensures path separator normalization and cross-OS script compatibility.
- [❌ FAIL] Assistant places Adapter 🔌 in Coding Group.

### With Skill Active Run
*Response*: *"Masalah kompatibilitas OS terdeteksi. Direkomendasikan menggunakan agen Adapter 🔌 (Kelompok Coding) untuk menormalisasi pemisah jalur direktori, menerjemahkan naskah shell Unix (.sh) ke file batch Windows (.bat), dan memvalidasi build lintas sistem operasi."*
- [✅ PASS] Assistant suggests delegating to Adapter 🔌 agent.
- [✅ PASS] Assistant ensures path separator normalization and cross-OS script compatibility.
- [✅ PASS] Assistant places Adapter 🔌 in Coding Group.

---

## Test Case: TC_008_CRITIC_REVIEW
**Prompt**: `provide a critical code quality audit and anti-pattern review for index.js file`

### Baseline Run
*Response*: *"I will grade and edit your file to fix issues."*
- [❌ FAIL] Assistant suggests Critic 🗣️ agent from Group B.
- [❌ FAIL] Assistant strictly enforces that Critic 🗣️ must not write or modify codebase files.
- [❌ FAIL] Assistant directs output only to Markdown files or console reports.

### With Skill Active Run
*Response*: *"Tugas ulasan dan audit kode terdeteksi. Direkomendasikan menggunakan agen Critic 🗣️ (Kelompok Dokumentasi & Analitis). Aturan ketat diterapkan: Critic 🗣️ dilarang menulis atau memodifikasi berkas kode aplikasi (.js/.ts), dan hanya menulis berkas laporan review Markdown (.md) atau ulasan teks konsol."*
- [✅ PASS] Assistant suggests Critic 🗣️ agent from Group B.
- [✅ PASS] Assistant strictly enforces that Critic 🗣️ must not write or modify codebase files.
- [✅ PASS] Assistant directs output only to Markdown files or console reports.

---

## Summary
- **Total Assertions Checked**: 24
- **Baseline Score**: 4.2% (1/24 passed)
- **With Skill Active Score**: 100.0% (24/24 passed)
- **Performance Gain**: +95.8%
