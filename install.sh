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

echo "[OK] Node.js detected. Running installer..."
echo ""

node scripts/installer.js
