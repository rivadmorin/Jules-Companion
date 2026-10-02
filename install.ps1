$ErrorActionPreference = "Stop"

# Detect whether run inside an existing local repository clone or via remote curl/irm
$CurrentDir = $PSScriptRoot
if ($CurrentDir -and (Test-Path "$CurrentDir\package.json")) {
    $InstallDir = $CurrentDir
    Write-Host "[*] Running Jules Companion Local Installer in $InstallDir..." -ForegroundColor Cyan
} else {
    $InstallDir = Join-Path $HOME ".gemini\config\skills\jules-companion"
    Write-Host "[*] Installing Jules Companion to $InstallDir..." -ForegroundColor Cyan

    $envBackup = $null
    if (Test-Path "$InstallDir\.env") {
        $envBackup = Get-Content "$InstallDir\.env" -Raw
    }

    if (Test-Path "$InstallDir\.git") {
        Write-Host "[*] Updating existing installation..." -ForegroundColor Yellow
        git -C "$InstallDir" reset --hard HEAD | Out-Null
        git -C "$InstallDir" pull --ff-only
    } else {
        if (Test-Path $InstallDir) {
            Remove-Item -Recurse -Force $InstallDir
        }
        New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
        git clone https://github.com/rivadmorin/Jules-Companion.git "$InstallDir"
    }

    if ($envBackup) {
        Set-Content "$InstallDir\.env" $envBackup
    }
}

Set-Location "$InstallDir"
Write-Host "[1/3] Installing dependencies with npm..." -ForegroundColor Yellow
npm install

Write-Host "[2/3] Building TypeScript entrypoints..." -ForegroundColor Yellow
npm run build

Write-Host "[3/3] Launching Universal Multi-Agent and IDE Installer..." -ForegroundColor Cyan
node scripts/installer.js
