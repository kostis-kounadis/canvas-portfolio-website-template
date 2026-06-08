#!/usr/bin/env node
/**
 * scripts/deploy-demo.js
 *
 * Assembles a gh-pages-ready directory and pushes it to the `gh-pages` branch.
 *
 * Directory layout expected by GitHub Pages (repo root):
 *
 *   /index.html          ← portfolio template
 *   /main.js
 *   /style.css
 *   /config.json
 *   /data.js
 *   /assets/             ← images, fonts, etc.
 *   /favicon/
 *   /admin/              ← compiled React GUI (demo build, base=/repo/admin/)
 *       index.html
 *       assets/
 *
 * Run from admin/build-setup-app/ after `npm run build:demo` has populated dist-demo/.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import ghPages from 'gh-pages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT    = path.resolve(__dirname, '../../..');        // project root
const TEMPLATE_DIR = path.join(REPO_ROOT, 'template');           // /template
const DEMO_BUILD   = path.join(__dirname, '..', 'dist-demo');    // dist-demo/
const STAGE_DIR    = path.join(__dirname, '..', '.gh-stage');    // staging area

// ── Helpers ───────────────────────────────────────────────────────────────────
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Assemble staging directory ────────────────────────────────────────────────
console.log('🗂  Assembling staging directory…');

// 1. Wipe and recreate staging dir
fs.rmSync(STAGE_DIR, { recursive: true, force: true });
fs.mkdirSync(STAGE_DIR, { recursive: true });

// 2. Copy portfolio template files (everything in /template)
const TEMPLATE_FILES = [
  'index.html', 'main.js', 'style.css', 'config.json', 'data.js',
];
const TEMPLATE_DIRS = ['assets', 'favicon'];

for (const file of TEMPLATE_FILES) {
  const src = path.join(TEMPLATE_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(STAGE_DIR, file));
  }
}
for (const dir of TEMPLATE_DIRS) {
  copyRecursive(path.join(TEMPLATE_DIR, dir), path.join(STAGE_DIR, dir));
}

// 3. Copy compiled React admin into /admin/
if (!fs.existsSync(DEMO_BUILD)) {
  console.error('❌  dist-demo/ not found. Run `npm run build:demo` first.');
  process.exit(1);
}
copyRecursive(DEMO_BUILD, path.join(STAGE_DIR, 'admin'));

// 4. Add a .nojekyll so GitHub Pages serves files with underscores correctly
fs.writeFileSync(path.join(STAGE_DIR, '.nojekyll'), '');

console.log('✅  Staging complete. Pushing to gh-pages branch…');

// ── Push to gh-pages ──────────────────────────────────────────────────────────
ghPages.publish(
  STAGE_DIR,
  {
    branch: 'gh-pages',
    dotfiles: true,          // include .nojekyll
    message: 'chore: update gh-pages demo [skip ci]',
  },
  (err) => {
    if (err) {
      console.error('❌  gh-pages publish failed:', err.message);
      process.exit(1);
    }
    console.log('🚀  Demo deployed to gh-pages branch.');
    console.log('    → https://kostis-kounadis.github.io/canvas-portfolio-website-template/');
    console.log('    → .../admin/ for the Setup GUI demo');
    // Clean up staging dir
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  }
);
