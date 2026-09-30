#!/usr/bin/env node
// Só leitura: a página deputadovitorjunior.com.br é um app (Vite/React), o HTML vem vazio e o texto está no pacote JS.
// Localiza o array das 5 frentes / 12 compromissos, avalia só esse literal (ícones viram null) e imprime JSON.
const BASE = 'https://deputadovitorjunior.com.br';
const UA = { 'User-Agent': 'Mozilla/5.0 (colinha-diagnostico)', 'Accept-Language': 'pt-BR' };
const get = async u => { const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return r.text(); };

const html = await get(BASE + '/12-compromissos');
const pacote = html.match(/src=["'](\/assets\/index-[^"']+\.js)["']/)?.[1];
if (!pacote) throw new Error('pacote principal não encontrado');
const js = await get(BASE + pacote);
console.log('pacote:', pacote, js.length, 'bytes');

// o array começa em "[{icon:X,titulo:" e contém "slug:" e "itens:[{n:1,"
const ini = js.search(/\[\{icon:[A-Za-z0-9_$]+,titulo:"[^"]+",tagline:"[^"]+",slug:"mobilidade"/);
if (ini < 0) throw new Error('array das frentes não encontrado');
let prof = 0, fim = -1, dentroStr = false, esc = false, aspas = '';
for (let i = ini; i < js.length; i++) {
  const c = js[i];
  if (dentroStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === aspas) dentroStr = false; continue; }
  if (c === '"' || c === "'" || c === '`') { dentroStr = true; aspas = c; continue; }
  if (c === '[' || c === '{') prof++;
  else if (c === ']' || c === '}') { prof--; if (prof === 0) { fim = i + 1; break; } }
}
const literal = js.slice(ini, fim).replace(/icon:[A-Za-z0-9_$]+/g, 'icon:null');
const frentes = new Function('return ' + literal)();
const compromissos = frentes.flatMap(f => f.itens.map(i => ({ n: i.n, titulo: i.titulo, texto: i.texto, frente: f.titulo, tagline: f.tagline, slug: f.slug })));
console.log('frentes:', frentes.length, '| compromissos:', compromissos.length, '| numeração:', compromissos.map(c => c.n).join(','));
console.log('=====COMPROMISSOS_JSON_INICIO=====');
console.log(JSON.stringify({ fonte: BASE + '/12-compromissos', lidoEm: new Date().toISOString(), frentes: frentes.map(f => ({ titulo: f.titulo, tagline: f.tagline, slug: f.slug })), compromissos }, null, 1));
console.log('=====COMPROMISSOS_JSON_FIM=====');

// imagens que o próprio site tenta carregar por frente
for (const f of frentes) {
  try { const r = await fetch(`${BASE}/compromissos/${f.slug}.webp`, { method: 'HEAD', headers: UA }); console.log(`imagem /compromissos/${f.slug}.webp →`, r.status, r.headers.get('content-type'), r.headers.get('content-length')); }
  catch (e) { console.log('imagem', f.slug, 'erro', e.message); }
}
