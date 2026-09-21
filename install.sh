#!/usr/bin/env bash
set -e

INSTALL_DIR="$HOME/.gemini/config/skills/jules-companion"
echo "🐙 Installing Jules Companion to $INSTALL_DIR..."

if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing installation..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone https://github.com/rivadmorin/Jules-Companion.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm install
npm run build
npm run setup

echo "✅ Jules Companion installed successfully!"
echo "👉 Configure your JULES_API_KEY in $INSTALL_DIR/.env"
