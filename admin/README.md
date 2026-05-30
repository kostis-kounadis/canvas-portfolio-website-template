# Canvas Portfolio — Setup Guide

> **TL;DR**: Install Node.js, then double-click `start-setup.command` (macOS) or run `bash start-setup.sh` (Linux/Windows WSL). Your browser will open the setup GUI automatically.

---

## What this does

The Setup GUI lets you configure your portfolio visually — no code editing required. It:

- Reads and writes `config.json` (your portfolio's master configuration)
- Shows a live preview of your portfolio in a side panel
- Lets you rebuild the site (updates SEO tags, sitemap, and webmanifest)

---

## Step 1 — Install Node.js

Node.js is required to run the local setup server. You only need to do this once.

### macOS

**Option A — Homebrew (recommended)**
```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node
```

**Option B — Official installer**

1. Go to https://nodejs.org/
2. Download the **LTS** version
3. Run the installer

**Verify installation:**
```bash
node --version   # should print v18.x or newer
```

---

### Windows

**Option A — Official installer (recommended for beginners)**

1. Go to https://nodejs.org/
2. Download the **LTS** version for Windows
3. Run the `.msi` installer (keep all defaults)
4. Open **Command Prompt** and verify: `node --version`

**Option B — nvm-windows (recommended for developers)**

1. Go to https://github.com/coreybutler/nvm-windows/releases
2. Download and run `nvm-setup.exe`
3. In Command Prompt: `nvm install lts` then `nvm use lts`

**Running on Windows:**
```cmd
node admin\setup-server.js
```
Then open http://localhost:3000/setup/ in your browser.

---

### Linux

**Ubuntu / Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Arch Linux:**
```bash
sudo pacman -S nodejs npm
```

**Fedora / RHEL:**
```bash
sudo dnf install nodejs
```

**Running on Linux:**
```bash
bash start-setup.sh
```

---

## Step 2 — Install project dependencies

The build script (`admin/generate-data.js`) requires the `sharp` image library for reading image dimensions. Install it once:

```bash
cd admin
npm install
cd ..
```

---

## Step 3 — Launch the Setup GUI

### macOS
Double-click `start-setup.command` in Finder.

> **First time**: macOS may warn “cannot be opened because it is from an unidentified developer.”
> To fix: right-click `start-setup.command` → Open → Open.
> You only need to do this once.

Or from Terminal:
```bash
node admin/setup-server.js
```

### Linux / WSL
```bash
bash start-setup.sh
```

### Windows (Command Prompt)
```cmd
node admin\setup-server.js
```

### All platforms
Your default browser will open automatically at:

```
http://localhost:3000/setup/
```

---

## Step 4 — Using the Setup GUI

1. **Fill in Identity**: your name, email, and about text
2. **Choose a Theme**: colours, background effect, noise/grain
3. **Configure Layouts**: which layout modes to offer, and their settings
4. **Set SEO details**: meta description, OG image, social handles
5. **Click “Save Config”** — writes `config.json` to disk
6. **Click “Rebuild Site”** — scans images, updates SEO tags, sitemap, and webmanifest

The live preview on the right updates in real-time as you change settings.

---

## Adding Your Images

Place images in subfolders inside `assets/images/`. Each subfolder becomes a category:

```
assets/images/
  work/           → “work” category
  personal/       → “personal” category
  experiments/    → “experiments” category
```

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.mp4`

After adding images, click **Rebuild Site** in the GUI to scan them.

---

## Troubleshooting

**“Port 3000 is already in use”**
```bash
PORT=3001 node admin/setup-server.js
```

**“Cannot find module ‘sharp’”**
```bash
cd admin && npm install
```

**Preview shows a blank white page**
Make sure you’re accessing `http://localhost:3000/setup/` — not opening the file directly.

**Changes aren’t appearing in the preview**
Click the **↺ Reload Preview** button in the GUI header.

**macOS: “start-setup.command cannot be opened”**
Right-click the file → Open → click Open in the dialog.

**The browser didn’t open automatically**
Manually navigate to: http://localhost:3000/setup/

---

## Stopping the server

Press **Ctrl+C** in the terminal window where the server is running.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+S` / `Ctrl+S` | Save config.json |
