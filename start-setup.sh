#!/usr/bin/env bash
# Canvas Portfolio Template — Linux/cross-platform launcher
# Usage: bash start-setup.sh

cd "$(dirname "$0")"

echo "Starting Canvas Portfolio Setup Server..."

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed."
  echo "Install it from https://nodejs.org/ or:"
  echo "  Ubuntu/Debian: sudo apt install nodejs npm"
  echo "  Arch Linux:    sudo pacman -S nodejs npm"
  exit 1
fi

node admin/setup-server.js
