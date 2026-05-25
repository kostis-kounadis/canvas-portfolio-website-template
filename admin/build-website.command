#!/usr/bin/env bash

cd "$(dirname "$0")"
node generate-data.js
echo "Done. data.js updated."
