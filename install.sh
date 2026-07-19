#!/usr/bin/env bash
set -e

# Jules-Companion One-Line Installer Script
# Usage: curl -sSL https://raw.githubusercontent.com/rivadmorin/Jules-Companion/main/install.sh | bash

echo "🚀 Installing Jules-Companion AI Skill globally..."

GLOBAL_SKILLS_DIR="${HOME}/.gemini/config/skills"
TARGET_DIR="${GLOBAL_SKILLS_DIR}/jules-companion"

mkdir -p "${GLOBAL_SKILLS_DIR}"

if [ -d "${TARGET_DIR}" ]; then
  echo "📦 Existing installation found at ${TARGET_DIR}. Updating repository..."
  cd "${TARGET_DIR}"
  git pull origin main
else
  echo "📥 Cloning Jules-Companion from GitHub..."
  git clone https://github.com/rivadmorin/Jules-Companion.git "${TARGET_DIR}"
  cd "${TARGET_DIR}"
fi

echo "⚙️ Installing dependencies..."
npm install --silent

echo "🔧 Compiling TypeScript to JavaScript..."
npm run build --silent

echo "⚡ Generating Agent Registry & verifying setup..."
node dist/generate_registry.js
node dist/setup.js

echo ""
echo "✅ Jules-Companion skill successfully installed globally!"
echo "📍 Location: ${TARGET_DIR}"
echo "💡 You can now use 'jules-companion' in any project across your workspace."
