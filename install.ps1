# Jules-Companion One-Line Installer Script for Windows
# Usage: powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.ps1 | iex"

Write-Host "🚀 Installing Jules-Companion AI Skill globally..." -ForegroundColor Cyan

$GlobalSkillsDir = "$env:USERPROFILE\.gemini\config\skills"
$TargetDir = "$GlobalSkillsDir\jules-companion"

New-Item -ItemType Directory -Force -Path $GlobalSkillsDir | Out-Null

if ((Test-Path "$TargetDir") -and (Test-Path "$TargetDir\.git")) {
    Write-Host "📦 Existing installation found at $TargetDir. Updating repository..." -ForegroundColor Yellow
    Set-Location -Path $TargetDir
    git pull origin main
} else {
    Write-Host "📥 Cloning Jules-Companion from GitHub..." -ForegroundColor Yellow
    if (Test-Path "$TargetDir") {
        Remove-Item -Recurse -Force -Path $TargetDir
    }
    git clone https://github.com/rivadmorin/Jules-Companion.git $TargetDir
    Set-Location -Path $TargetDir
}

Write-Host "⚙️ Installing dependencies..." -ForegroundColor Yellow
npm install --silent

Write-Host "🔧 Compiling TypeScript to JavaScript..." -ForegroundColor Yellow
npm run build --silent

Write-Host "⚡ Generating Agent Registry & verifying setup..." -ForegroundColor Yellow
node dist/generate_registry.js
node dist/setup.js

Write-Host "🔗 Creating global command shortcut alias..." -ForegroundColor Yellow
$LocalBinDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $LocalBinDir | Out-Null

$BatContent = @"
@echo off
if exist "%USERPROFILE%\.bun\bin\bun.exe" (
    "%USERPROFILE%\.bun\bin\bun.exe" "%USERPROFILE%\.gemini\config\skills\jules-companion\dist\jules_menu.js" %*
) else (
    node "%USERPROFILE%\.gemini\config\skills\jules-companion\dist\jules_menu.js" %*
)
"@

$BatFile = "$LocalBinDir\jules-companion.bat"
Set-Content -Path $BatFile -Value $BatContent

Write-Host ""
Write-Host "✅ Jules-Companion skill successfully installed globally!" -ForegroundColor Green
Write-Host "📍 Location: $TargetDir" -ForegroundColor Cyan
Write-Host "💡 You can now invoke the interactive menu from any directory by typing: jules-companion" -ForegroundColor Cyan

$EnvPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($EnvPath -notlike "*$LocalBinDir*") {
    Write-Host "⚠️ Note: Please add '$LocalBinDir' to your system PATH to run the shortcut globally." -ForegroundColor Red
}
