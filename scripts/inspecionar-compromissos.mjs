#!/usr/bin/env node
// Só leitura: baixa a página dos 12 compromissos e mostra o que ela entrega (HTML, texto, JSON embutido, imagens).
// Uso: node scripts/inspecionar-compromissos.mjs [url]
const URL_PAG = process.argv[2] || 'https://deputadovitorjunior.com.br/12-compromissos';
const r = await fetch(URL_PAG, { headers: { 'User-Agent': 'Mozilla/5.0 (colinha-diagnostico)', 'Accept-Language': 'pt-BR' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
const html = await r.text();
console.log('GET', r.status, r.headers.get('content-type'), 'bytes:', html.length, 'url final:', r.url);
console.log('title:', (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim());
console.log('\n--- meta og/description');
for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](og:[^"']+|description)["'][^>]*>/gi)) console.log(m[0].slice(0, 300));

// Texto visível aproximado (sem script/style)
const limpo = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const texto = limpo.replace(/<\/(p|div|h[1-6]|li|section|article|br|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
console.log('\n--- TEXTO VISÍVEL (primeiros 9000 caracteres) ---');
console.log(texto.slice(0, 9000));

console.log('\n--- títulos h1-h4');
for (const m of limpo.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)) console.log(`h${m[1]}:`, m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

console.log('\n--- imagens (src) e svgs');
const imgs = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
console.log(imgs.slice(0, 60).join('\n'), '\n(total img:', imgs.length, ', svg inline:', (html.match(/<svg/gi) || []).length, ')');

console.log('\n--- dados embutidos (__NEXT_DATA__, JSON-LD, window.__)');
const nd = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
if (nd) console.log('__NEXT_DATA__:', nd[1].slice(0, 6000));
for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) console.log('JSON-LD:', m[1].slice(0, 1500));
console.log('scripts externos:', [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 15).join(' | '));
console.log('links internos:', [...new Set([...html.matchAll(/href=["'](\/[^"'#]*)["']/g)].map(m => m[1]))].slice(0, 40).join(' | '));
