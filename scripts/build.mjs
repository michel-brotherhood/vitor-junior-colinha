#!/usr/bin/env node
// Monta dist/ só com o que o site publicado precisa (Cloudflare Pages: comando `npm run build`, pasta `dist`).
// Fica de fora: testes, scripts, assets/originais (artes e zip de referência), docs, node_modules e dados de origem.
import { cp, rm, mkdir, readdir, stat, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const R = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(R, 'dist');
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await copyFile(join(R, 'index.html'), join(OUT, 'index.html'));
await copyFile(join(R, 'cloudflare/_headers'), join(OUT, '_headers'));
await cp(join(R, 'public'), join(OUT, 'public'), { recursive: true });
await cp(join(R, 'src'), join(OUT, 'src'), { recursive: true });
await mkdir(join(OUT, 'data'), { recursive: true });
await copyFile(join(R, 'data/candidatos.json'), join(OUT, 'data/candidatos.json'));
await cp(join(R, 'data/fotos'), join(OUT, 'data/fotos'), { recursive: true });

// Conferência: o Pages recusa arquivos > 25 MiB e projetos > 20.000 arquivos.
let n = 0, maior = 0, total = 0;
const varre = async d => { for (const e of await readdir(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) await varre(p); else { const s = (await stat(p)).size; n++; total += s; maior = Math.max(maior, s); } } };
await varre(OUT);
if (n > 20000 || maior > 25 * 1024 * 1024) { console.error(`dist fora dos limites do Cloudflare Pages (${n} arquivos, maior ${maior} bytes)`); process.exit(1); }
console.log(`dist/ pronto: ${n} arquivos, ${(total / 1048576).toFixed(1)} MB, maior arquivo ${(maior / 1024).toFixed(0)} KB`);
