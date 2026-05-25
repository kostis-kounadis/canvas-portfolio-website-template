#!/usr/bin/env bash

# Set directory to the script's location
cd "$(dirname "$0")"

echo "=================================================="
echo "      Canvas Portfolio Rebuild Pipeline          "
echo "=================================================="
echo "Starting unified build process..."
echo ""

node generate-data.js

if [ $? -eq 0 ]; then
  echo ""
  echo "=================================================="
  echo "✅ Rebuild successful!"
  echo "Updated:"
  echo " - data.js (Media scan & layout coordinates)"
  echo " - index.html (Static SEO tags & JSON-LD schema)"
  echo " - favicon/site.webmanifest (Sync title)"
  echo " - sitemap.xml (Sync canonical URL & date)"
  echo "=================================================="
else
  echo ""
  echo "=================================================="
  echo "❌ Build failed! Please review the errors above."
  echo "=================================================="
  exit 1
fi

