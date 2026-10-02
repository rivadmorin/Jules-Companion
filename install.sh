#!/usr/bin/env bash
# Jules Companion 1-Click Installer for macOS and Linux

echo "============================================================"
echo "       Jules Companion - 1-Click Installer (Linux/macOS)    "
echo "============================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org"
    exit 1
fi

echo "[OK] Node.js detected. Checking project dependencies..."
if [ ! -d "node_modules" ]; then
    echo "[1/2] Installing dependencies with npm..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "[2/2] Building TypeScript entrypoints..."
    npm run build
fi

echo ""
echo "Launching Universal Multi-Agent & IDE Installer..."
echo ""
node scripts/installer.js
