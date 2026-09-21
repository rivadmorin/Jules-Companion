$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $HOME ".gemini\config\skills\jules-companion"

Write-Host "🐙 Installing Jules Companion to $InstallDir..." -ForegroundColor Cyan

if (Test-Path "$InstallDir\.git") {
    Write-Host "Updating existing installation..." -ForegroundColor Yellow
    git -C "$InstallDir" pull --ff-only
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
    git clone https://github.com/rivadmorin/Jules-Companion.git "$InstallDir"
}

Set-Location "$InstallDir"
npm install
npm run build
npm run setup

Write-Host "✅ Jules Companion installed successfully!" -ForegroundColor Green
Write-Host "👉 Configure your JULES_API_KEY in $InstallDir\.env" -ForegroundColor Yellow
