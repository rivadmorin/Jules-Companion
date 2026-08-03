# Jules-Companion Installer Script for Windows
Write-Host "Installing Jules-Companion AI Skill globally..." -ForegroundColor Cyan

$GlobalSkillsDir = "$env:USERPROFILE\.gemini\config\skills"
$TargetDir = "$GlobalSkillsDir\jules-companion"

New-Item -ItemType Directory -Force -Path $GlobalSkillsDir | Out-Null

if ((Test-Path "$TargetDir") -and (Test-Path "$TargetDir\.git")) {
    Write-Host "Existing installation found at $TargetDir. Updating repository..." -ForegroundColor Yellow
    Set-Location -Path $TargetDir
    git pull origin main
} else {
    Write-Host "Cloning Jules-Companion from GitHub..." -ForegroundColor Yellow
    if (Test-Path "$TargetDir") {
        Remove-Item -Recurse -Force -Path $TargetDir
    }
    git clone https://github.com/rivadmorin/Jules-Companion.git $TargetDir
    Set-Location -Path $TargetDir
}

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --silent

Write-Host "Compiling TypeScript to JavaScript..." -ForegroundColor Yellow
npm run build --silent

Write-Host "Generating Agent Registry and verifying setup..." -ForegroundColor Yellow
node dist/generate_registry.js
node dist/setup.js

Write-Host "Registering MCP Server into system configurations..." -ForegroundColor Yellow
$NodeRegisterScript = @"
const fs = require('fs');
const paths = [
    process.env.USERPROFILE + '/.gemini/config/mcp_config.json',
    process.env.USERPROFILE + '/.gemini/settings.json'
];
const serverPath = (process.env.USERPROFILE + '/.gemini/config/skills/jules-companion/dist/mcp_server.js').replace(/\\/g, '/');
paths.forEach(p => {
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (!data.mcpServers) data.mcpServers = {};
            data.mcpServers['jules-companion'] = {
                command: 'node',
                args: [serverPath],
                env: {}
            };
            fs.writeFileSync(p, JSON.stringify(data, null, 2));
            console.log('Registered jules-companion in ' + p);
        } catch(e) {}
    }
});
"@

node -e "$NodeRegisterScript"

Write-Host "Creating global command shortcut alias..." -ForegroundColor Yellow
$LocalBinDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $LocalBinDir | Out-Null

$BatLines = @(
    '@echo off',
    'if exist "%USERPROFILE%\.bun\bin\bun.exe" (',
    '    "%USERPROFILE%\.bun\bin\bun.exe" "%USERPROFILE%\.gemini\config\skills\jules-companion\dist\jules_menu.js" %*',
    ') else (',
    '    node "%USERPROFILE%\.gemini\config\skills\jules-companion\dist\jules_menu.js" %*',
    ')'
)
$BatContent = $BatLines -join "`r`n"

$BatFile = "$LocalBinDir\jules-companion.bat"
Set-Content -Path $BatFile -Value $BatContent

Write-Host ""
Write-Host "Jules-Companion skill successfully installed globally!" -ForegroundColor Green
Write-Host "Location: $TargetDir" -ForegroundColor Cyan
Write-Host "You can now invoke the interactive menu from any directory by typing: jules-companion" -ForegroundColor Cyan

$EnvPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($EnvPath -notlike "*$LocalBinDir*") {
    Write-Host "Note: Please add $LocalBinDir to your system PATH to run the shortcut globally." -ForegroundColor Red
}
