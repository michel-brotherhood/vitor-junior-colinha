// Servidor estático mínimo (sem dependências) para desenvolvimento e testes.
// Só serve index.html e as pastas public/, src/, data/ (nada de node_modules, .git etc.).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// ROOT=dist serve a pasta gerada por `npm run build` (para conferir o que vai ao ar).
const ROOT = process.env.ROOT ? resolve(process.env.ROOT) + sep : fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const ALLOWED = ['public', 'src', 'data', 'logos'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

// Se a pasta servida tiver _headers (dist/), aplica o bloco `/*` (segurança/CSP) para testar como no Cloudflare Pages.
const GLOBAIS = {};
if (existsSync(join(ROOT, '_headers'))) {
  let dentro = false;
  for (const l of readFileSync(join(ROOT, '_headers'), 'utf8').split('\n')) {
    if (/^\S/.test(l) && !l.startsWith('#')) dentro = l.trim() === '/*';
    else if (dentro && /^\s+\S+:/.test(l)) { const i = l.indexOf(':'); GLOBAIS[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  }
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const rel = normalize(p).replace(/^[/\\]+/, '');
    const top = rel.split(sep)[0];
    if (rel !== 'index.html' && !ALLOWED.includes(top)) { res.writeHead(404); return res.end('Not found'); }
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
    const body = await readFile(file);
    res.writeHead(200, { ...GLOBAIS, 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
