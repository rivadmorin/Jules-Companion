$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $HOME ".gemini\config\skills\jules-companion"

Write-Host "🐙 Installing Jules Companion to $InstallDir..." -ForegroundColor Cyan

$envBackup = $null
if (Test-Path "$InstallDir\.env") {
    $envBackup = Get-Content "$InstallDir\.env" -Raw
}

if (Test-Path "$InstallDir\.git") {
    Write-Host "Updating existing installation..." -ForegroundColor Yellow
    git -C "$InstallDir" reset --hard HEAD | Out-Null
    git -C "$InstallDir" pull --ff-only
} else {
    if (Test-Path $InstallDir) {
        Remove-Item -Recurse -Force $InstallDir
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
    git clone https://github.com/rivadmorin/Jules-Companion.git "$InstallDir"
}

Set-Location "$InstallDir"
npm install
npm run build
npm run setup

if ($envBackup) {
    Set-Content "$InstallDir\.env" $envBackup
}

Write-Host "✅ Jules Companion installed successfully!" -ForegroundColor Green
Write-Host "👉 Configure your JULES_API_KEY in $InstallDir\.env" -ForegroundColor Yellow
