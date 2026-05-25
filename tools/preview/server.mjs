// Local, offline preview server for the profile README.
//
// Renders README.md to HTML with GitHub's own stylesheet (github-markdown-css),
// serves local assets (e.g. profile-3d-contrib/*.svg) from the repo root, and
// live-reloads the browser on save. The Markdown -> HTML step makes no network
// calls; any image still pointing at a third-party host is fetched by the browser,
// so the preview doubles as a "what still depends on an external service" signal.
//
// Usage:  npm run preview   (then open http://localhost:4321)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const readmePath = path.join(repoRoot, 'README.md');
const PORT = Number(process.env.PORT) || 4321;

// Match GitHub README rendering: GFM on, single newlines are NOT <br> in .md files.
marked.setOptions({ gfm: true, breaks: false });

const MIME = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

async function loadCss() {
  const candidates = [
    'node_modules/github-markdown-css/github-markdown-dark.css',
    'node_modules/github-markdown-css/github-markdown.css',
  ];
  for (const rel of candidates) {
    try { return await readFile(path.join(repoRoot, rel), 'utf8'); } catch { /* try next */ }
  }
  return '';
}

const css = await loadCss();

function page(bodyHtml, externalRefs) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>README preview — local</title>
<style>${css}</style>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0d1117; }
  .wrap { max-width: 1012px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  .markdown-body { box-sizing: border-box; padding: 32px; border: 1px solid #30363d; border-radius: 6px; }
  .pv-bar {
    position: fixed; top: 10px; right: 12px; z-index: 9999;
    font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #161b22; color: #7d8590; border: 1px solid #30363d;
    border-radius: 999px; padding: 5px 12px;
  }
  .pv-bar b { color: ${externalRefs > 0 ? '#f85149' : '#3fb950'}; }
</style>
</head>
<body>
<div class="pv-bar">LOCAL PREVIEW · <b>${externalRefs}</b> external image ref${externalRefs === 1 ? '' : 's'}</div>
<div class="wrap"><article class="markdown-body">${bodyHtml}</article></div>
<script>
  const es = new EventSource('/__livereload');
  es.onmessage = () => location.reload();
</script>
</body>
</html>`;
}

const clients = new Set();

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    try {
      const md = await readFile(readmePath, 'utf8');
      const imgRefs = [
        ...md.matchAll(/<(?:img|source)\b[^>]*?\b(?:src|srcset)="([^"]+)"/gi),
        ...md.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g),
      ].map((m) => m[1]);
      const externalRefs = imgRefs.filter((u) => /^https?:/i.test(u)).length;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page(marked.parse(md), externalRefs));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Could not read README.md: ${err.message}`);
    }
    return;
  }

  // Static assets from the repo root, with a path-traversal guard.
  const filePath = path.join(repoRoot, decodeURIComponent(pathname));
  if (!filePath.startsWith(repoRoot)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

// Live reload: debounce file events, skip noise from deps and git.
let timer;
function notify() {
  clearTimeout(timer);
  timer = setTimeout(() => { for (const c of clients) c.write('data: reload\n\n'); }, 100);
}
try {
  watch(repoRoot, { recursive: true }, (_evt, file) => {
    if (file && (file.startsWith('node_modules') || file.startsWith('.git'))) return;
    notify();
  });
} catch {
  watch(readmePath, notify); // fallback if recursive watch is unsupported
}

server.listen(PORT, () => {
  console.log(`Profile README preview → http://localhost:${PORT}`);
});
