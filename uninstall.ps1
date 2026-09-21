$ErrorActionPreference = "SilentlyContinue"

Write-Host "🧹 Uninstalling Jules Companion..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$HOME\.gemini\config\skills\jules-companion"
Remove-Item -Recurse -Force "$HOME\.gemini\antigravity-ide\mcp\jules-companion"

Write-Host "✅ Jules Companion removed successfully." -ForegroundColor Green
Write-Host "👉 Remember to remove the 'jules-companion' entry from your mcp_config.json." -ForegroundColor Cyan
