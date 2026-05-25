#!/bin/bash
# 1. Create a React app using Vite
npm create vite@latest setup-app -- --template react-ts
cd setup-app

# 2. Install Tailwind and dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Initialize shadcn using Zinc base color and Default style
npx shadcn@latest init -y --style default --base-color zinc --css-variables

# 4. Install necessary shadcn components for the CMS UI
npx shadcn@latest add sidebar breadcrumb button separator sheet tooltip -y

echo "Dependencies installed successfully."
