#!/bin/bash

# Ensure we are in the project root regardless of where the script is called from
cd "$(dirname "$0")/.."

NEW_URL="$1"
OLD_URL="kostiskounadis.xyz"

# If no argument is provided, ask the user interactively
if [ -z "$NEW_URL" ]; then
  echo "--------------------------------------------------------"
  echo "🌐 Portfolio URL Update Utility"
  echo "--------------------------------------------------------"
  echo "Your current domain is set to: $OLD_URL"
  echo ""
  echo "What is your NEW domain? (e.g., your-name.art)"
  echo "Note: Do not include http:// or https://"
  read -p "New Domain: " NEW_URL
  echo ""
fi

# Final check if user just pressed enter
if [ -z "$NEW_URL" ]; then
  echo "❌ Error: No URL provided. Operation cancelled."
  exit 1
fi

echo "--------------------------------------------------------"
echo "🔍 Searching for instances of '$OLD_URL'..."
echo "🔄 Replacing with '$NEW_URL'..."
echo "--------------------------------------------------------"

# Find files containing the old URL and run sed to replace
# We exclude the admin folder and other system folders
grep -rl "$OLD_URL" . --exclude-dir={admin,.git,node_modules} | while read -r file; do
  echo "📝 Updating: $file"
  sed -i '' "s|$OLD_URL|$NEW_URL|g" "$file"
done

echo "--------------------------------------------------------"
echo "🔄 Updating the script memory for next time..."
SCRIPT_PATH="admin/update-url.command"
sed -i '' "s|OLD_URL=\"$OLD_URL\"|OLD_URL=\"$NEW_URL\"|g" "$SCRIPT_PATH"

echo "✅ Replacement complete! Your site is now set to '$NEW_URL'."
echo "--------------------------------------------------------"
