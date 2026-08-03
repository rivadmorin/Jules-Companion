# Jules-Companion Uninstaller Script for Windows
Write-Host "Uninstalling Jules-Companion AI Skill globally..." -ForegroundColor Cyan

$GlobalSkillsDir = "$env:USERPROFILE\.gemini\config\skills"
$TargetDir = "$GlobalSkillsDir\jules-companion"
$LocalBinDir = "$env:USERPROFILE\.local\bin"
$BatFile = "$LocalBinDir\jules-companion.bat"

# 1. Clean up MCP Server entries from configuration files
Write-Host "Removing MCP Server registrations..." -ForegroundColor Yellow
$NodeCleanupScript = @"
const fs = require('fs');
const paths = [
    process.env.USERPROFILE + '/.gemini/config/mcp_config.json',
    process.env.USERPROFILE + '/.gemini/settings.json'
];
paths.forEach(p => {
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (data.mcpServers && data.mcpServers['jules-companion']) {
                delete data.mcpServers['jules-companion'];
                fs.writeFileSync(p, JSON.stringify(data, null, 2));
                console.log('Removed jules-companion from ' + p);
            }
        } catch(e) {}
    }
});
"@

node -e "$NodeCleanupScript"

# 2. Remove installed directory
if (Test-Path "$TargetDir") {
    Write-Host "Removing directory: $TargetDir" -ForegroundColor Yellow
    Remove-Item -Recurse -Force -Path "$TargetDir"
} else {
    Write-Host "Directory $TargetDir not found." -ForegroundColor DarkGray
}

# 3. Remove shortcut executable
if (Test-Path "$BatFile") {
    Write-Host "Removing executable shortcut: $BatFile" -ForegroundColor Yellow
    Remove-Item -Force -Path "$BatFile"
} else {
    Write-Host "Executable shortcut $BatFile not found." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Jules-Companion skill successfully uninstalled!" -ForegroundColor Green
