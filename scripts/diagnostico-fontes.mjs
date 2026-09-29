#!/usr/bin/env node
// Só leitura. Mostra, para cada fonte candidata, o que ela realmente responde a partir de ONDE este script roda
// (status, tipo, CORS, primeiros bytes e as chaves do JSON). Serve para conferir o contrato assumido em scripts/lib/tse.mjs.
const UA = 'Mozilla/5.0 (colinha-diagnostico)';
const COLINHA = 'https://colinha.ai/api/v1';
const out = [];
const log = (...a) => { console.log(...a); };

async function sonda(nome, url, { method = 'GET', json = false, maxBytes = 1000 } = {}) {
  const r = { nome, url, method };
  try {
    const res = await fetch(url, { method, redirect: 'follow', headers: { 'User-Agent': UA, Origin: 'https://exemplo.github.io', Accept: '*/*' }, signal: AbortSignal.timeout(30000) });
    r.status = res.status; r.tipo = res.headers.get('content-type'); r.cors = res.headers.get('access-control-allow-origin'); r.tamanho = res.headers.get('content-length');
    if (method === 'GET') {
      const buf = Buffer.from(await res.arrayBuffer()); r.bytes = buf.length;
      r.inicio = buf.subarray(0, maxBytes).toString('utf8').replace(/\s+/g, ' ').slice(0, maxBytes);
      if (json && res.ok) { try { r.json = JSON.parse(buf.toString('utf8')); } catch { r.jsonInvalido = true; } }
    }
  } catch (e) { r.erro = String(e && (e.cause?.code || e.message || e)); }
  out.push(r);
  const { json: j, inicio, ...resumo } = r;
  log(`\n### ${nome}\n${JSON.stringify(resumo)}`);
  if (inicio) log('início:', inicio.slice(0, 400));
  return r;
}

const chaves = o => (o && typeof o === 'object' ? Object.keys(o) : typeof o);

log(`Ambiente: node ${process.version}, ${new Date().toISOString()}`);
log('\n===== colinha.ai (republicador de terceiros; contrato do sync.php do zip) =====');
await sonda('colinha /dados', `${COLINHA}/dados`, { json: true });
const c6 = await sonda('colinha /candidatos dep. federal RJ', `${COLINHA}/candidatos?cargo=6&uf=RJ&q=&offset=0`, { json: true });
if (c6.json) {
  log('chaves do objeto:', chaves(c6.json), '| total:', c6.json.total, '| itens nesta página:', (c6.json.candidatos || []).length);
  const it = (c6.json.candidatos || [])[0];
  if (it) log('chaves de um candidato:', chaves(it), '\namostra:', JSON.stringify(it));
}
const c1200 = await sonda('colinha /candidatos q=1200 (dep. federal RJ)', `${COLINHA}/candidatos?cargo=6&uf=RJ&q=1200&offset=0`, { json: true });
if (c1200.json) log('resultado q=1200:', JSON.stringify((c1200.json.candidatos || []).filter(c => String(c.num) === '1200')));
await sonda('colinha /legendas', `${COLINHA}/legendas?cargo=6&uf=RJ`, { json: true });
const sq = c6.json?.candidatos?.[0]?.sq;
if (sq) await sonda('foto assets.colinha.ai (HEAD)', `https://assets.colinha.ai/candidatos/fotos/2026/${sq}.jpeg`, { method: 'HEAD' });

log('\n===== TSE (fonte oficial) =====');
await sonda('DivulgaCandContas: eleições ordinárias', 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias', { json: true });
await sonda('Dados Abertos: portal', 'https://dadosabertos.tse.jus.br/', { method: 'HEAD' });
await sonda('CDN: consulta_cand_2026.zip (HEAD)', 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip', { method: 'HEAD' });
await sonda('CDN: consulta_cand_2022.zip (HEAD, referência de layout)', 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip', { method: 'HEAD' });

log('\n===== RESUMO =====');
for (const r of out) log(`${r.status ?? 'ERRO'}\t${r.cors ? 'CORS=' + r.cors : 'sem CORS'}\t${r.nome}${r.erro ? '  (' + r.erro + ')' : ''}`);
