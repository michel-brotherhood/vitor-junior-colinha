#!/usr/bin/env node
// Só leitura: a página é um app (Vite/React), então o HTML vem vazio; o texto está nos pacotes JS.
// Baixa o HTML, o pacote principal e os "chunks" carregados sob demanda, e mostra os trechos que falam de "compromisso".
const BASE = 'https://deputadovitorjunior.com.br';
const UA = { 'User-Agent': 'Mozilla/5.0 (colinha-diagnostico)', 'Accept-Language': 'pt-BR' };
const get = async (u, tipo = 'text') => { const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`HTTP ${r.status} ${u}`); return tipo === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text(); };

const html = await get(BASE + '/12-compromissos');
const main = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.js)["']/g)].map(m => m[1]);
console.log('HTML:', html.length, 'bytes; scripts /assets:', main.join(', '));

const vistos = new Map();
async function baixar(caminho) {
  if (vistos.has(caminho)) return vistos.get(caminho);
  let txt = ''; try { txt = await get(BASE + caminho); } catch (e) { console.log('!!', String(e.message)); }
  vistos.set(caminho, txt); return txt;
}
const fila = [...main];
while (fila.length && vistos.size < 60) {
  const c = fila.shift(); const js = await baixar(c);
  // chunks dinâmicos: import("./Nome-hash.js") ou "assets/Nome-hash.js" dentro do mapa de dependências do Vite
  for (const m of js.matchAll(/["'`]\.?\/?(?:assets\/)?([A-Za-z0-9_.-]+-[A-Za-z0-9_-]{6,}\.js)["'`]/g)) {
    const alvo = '/assets/' + m[1]; if (!vistos.has(alvo) && !fila.includes(alvo)) fila.push(alvo);
  }
}
console.log('\nPacotes lidos:', [...vistos.entries()].map(([k, v]) => `${k} (${v.length})`).join('\n  '));

const re = /compromiss/gi;
for (const [nome, js] of vistos) {
  const n = (js.match(re) || []).length; if (!n) continue;
  console.log(`\n===== ${nome}: ${n} ocorrências de "compromiss" =====`);
  let ultimo = -1e9, mostrados = 0;
  for (const m of js.matchAll(re)) {
    if (m.index - ultimo < 1500 || mostrados >= 6) continue; ultimo = m.index; mostrados++;
    console.log(`--- @${m.index}\n` + js.slice(Math.max(0, m.index - 400), m.index + 2600).replace(/\s+/g, ' '));
  }
}
