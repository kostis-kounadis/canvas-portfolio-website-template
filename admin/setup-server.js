#!/usr/bin/env node
'use strict';

/**
 * admin/setup-server.js
 * Canvas Portfolio Template — GUI Setup Server
 *
 * Serves:
 *   GET  /setup/          → setup/index.html  (GUI)
 *   GET  /setup/*         → setup/*           (GUI assets)
 *   GET  /*               → project root      (live portfolio preview)
 *   GET  /api/config      → returns config.json as JSON
 *   POST /api/config      → writes request body to config.json
 *   POST /api/build       → runs admin/generate-data.js, streams output
 *
 * No external dependencies — pure Node.js http + fs + path + child_process.
 */

const http        = require('http');
const fs          = require('fs');
const path        = require('path');
const { spawn }   = require('child_process');

const PORT     = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const rootDir  = path.join(__dirname, '..');
const setupDir = path.join(rootDir, 'setup');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp4':  'video/mp4',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

function serveFile(filePath, res) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + filePath);
    return;
  }
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const server = http.createServer(async (req, res) => {
  const url    = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // ── API routes ──────────────────────────────────────────────────────────────

  if (url === '/api/config' && method === 'GET') {
    const configPath = path.join(rootDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      res.writeHead(404, { ...corsHeaders(), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'config.json not found' }));
      return;
    }
    const raw = fs.readFileSync(configPath, 'utf8');
    res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
    res.end(raw);
    return;
  }

  if (url === '/api/config' && method === 'POST') {
    const body = await readBody(req);
    try {
      JSON.parse(body); // validate JSON before writing
      fs.writeFileSync(path.join(rootDir, 'config.json'), body, 'utf8');
      res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(400, { ...corsHeaders(), 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
    }
    return;
  }

  if (url === '/api/build' && method === 'POST') {
    res.writeHead(200, {
      ...corsHeaders(),
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    });

    const scriptPath = path.join(__dirname, 'generate-data.js');
    const child = spawn(process.execPath, [scriptPath], { cwd: rootDir });

    child.stdout.on('data', d => res.write(d.toString()));
    child.stderr.on('data', d => res.write('[stderr] ' + d.toString()));
    child.on('close', code => {
      res.write(code === 0 ? '\n✅ Build complete.\n' : `\n❌ Build exited with code ${code}.\n`);
      res.end();
    });
    return;
  }

  // ── Static file serving ─────────────────────────────────────────────────────

  // /setup/ → serve from setup/ directory
  if (url === '/setup' || url === '/setup/') {
    serveFile(path.join(setupDir, 'index.html'), res);
    return;
  }
  if (url.startsWith('/setup/')) {
    const relative = url.slice('/setup/'.length);
    serveFile(path.join(setupDir, relative), res);
    return;
  }

  // All other paths → serve from project root
  let filePath = path.join(rootDir, url === '/' ? 'index.html' : url);
  // Prevent directory traversal outside rootDir
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }
  // If path is a directory, try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  serveFile(filePath, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✅ Canvas Portfolio Setup Server running at:\n   http://localhost:${PORT}/setup/\n`);
  console.log(`   Portfolio preview: http://localhost:${PORT}/`);
  console.log('\n   Press Ctrl+C to stop.\n');

  // Auto-open browser
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}/setup/`;
  const cmd = process.platform === 'darwin' ? `open "${url}"`
            : process.platform === 'win32'  ? `start "" "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, err => { if (err) console.log(`   Open your browser manually at ${url}`); });
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use. Stop the other process or set PORT= env var.\n`);
  } else {
    console.error('\n❌ Server error:', err.message);
  }
  process.exit(1);
});
