#!/usr/bin/env bash
# Canvas Portfolio Template — macOS launcher
# Double-click this file in Finder to start the setup GUI.

cd "$(dirname "$0")"

echo "Starting Canvas Portfolio Setup Server..."

# Check for node
if ! command -v node &>/dev/null; then
  osascript -e 'display dialog "Node.js is not installed.\n\nPlease install it from https://nodejs.org/ and try again.\n\nOn macOS with Homebrew:\n  brew install node" buttons {"OK"} default button "OK" with title "Canvas Portfolio Setup"'
  exit 1
fi

# Run server (auto-opens browser)
(sleep 1 && open http://localhost:3000/admin/) &
node admin/server/setup-server.js
