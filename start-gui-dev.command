#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "Starting Backend API on port 3000..."
node admin/setup-server.js &
BACKEND_PID=$!

echo "Starting React Vite Dev Server..."
cd setup-app
npm run dev &
FRONTEND_PID=$!

# Wait for Vite to start before opening browser
sleep 2
open http://localhost:5173/setup/

# Kill both processes on exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
