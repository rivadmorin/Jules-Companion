@echo off
title Jules Companion Installer
cls
echo ============================================================
echo        Jules Companion - 1-Click Installer (Windows)
echo ============================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found on this computer!
    echo Please download and install Node.js first at:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detected. Checking project dependencies...
if not exist node_modules (
    echo [1/2] Installing dependencies with npm...
    call npm install
)

if not exist dist (
    echo [2/2] Building TypeScript entrypoints...
    call npm run build
)

echo.
echo Launching Universal Multi-Agent & IDE Installer...
echo.
node scripts/installer.js

echo.
pause
