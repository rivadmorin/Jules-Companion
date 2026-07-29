# Jules-Companion One-Line Uninstaller Script for Windows
# Usage: powershell -c "irm https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/uninstall.ps1 | iex"

Write-Host "🧽 Uninstalling Jules-Companion AI Skill globally..." -ForegroundColor Cyan

$GlobalSkillsDir = "$env:USERPROFILE\.gemini\config\skills"
$TargetDir = "$GlobalSkillsDir\jules-companion"
$LocalBinDir = "$env:USERPROFILE\.local\bin"
$BatFile = "$LocalBinDir\jules-companion.bat"

if (Test-Path "$TargetDir") {
    Write-Host "🧽 Removing directory: $TargetDir" -ForegroundColor Yellow
    Remove-Item -Recurse -Force -Path $TargetDir
} else {
    Write-Host "⚠️ Directory $TargetDir not found." -ForegroundColor DarkGray
}

if (Test-Path "$BatFile") {
    Write-Host "🧽 Removing executable shortcut: $BatFile" -ForegroundColor Yellow
    Remove-Item -Force -Path $BatFile
} else {
    Write-Host "⚠️ Executable shortcut $BatFile not found." -ForegroundColor DarkGray
}

Write-Host "✅ Jules-Companion skill successfully uninstalled!" -ForegroundColor Green
