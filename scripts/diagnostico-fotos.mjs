#!/usr/bin/env node
// Só leitura. Descobre de onde as fotos podem vir direto do TSE (sem colinha.ai), testando a partir de onde roda.
// Para cada URL imprime status, tipo, tamanho e os primeiros bytes (assinatura JPEG = ffd8ff, ZIP = 504b0304).
import { readFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (colinha-diagnostico-fotos)';
const dados = JSON.parse(readFileSync(new URL('../data/candidatos.json', import.meta.url), 'utf8'));
const amostra = dados['RJ/7'].candidatos.find(c => /^\d+$/.test(String(c.id)));
console.log('amostra:', amostra.id, amostra.numero, amostra.nomeUrna);
const resultados = [];

async function sonda(nome, url, { range = true } = {}) {
  const r = { nome, url };
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA, Accept: '*/*', ...(range ? { Range: 'bytes=0-63' } : {}) }, signal: AbortSignal.timeout(30000) });
    const buf = Buffer.from(await res.arrayBuffer());
    r.status = res.status; r.tipo = res.headers.get('content-type'); r.tamanho = res.headers.get('content-range') || res.headers.get('content-length');
    r.assinatura = buf.subarray(0, 4).toString('hex'); r.cors = res.headers.get('access-control-allow-origin');
    if (!/^(ffd8ff|504b0304|89504e47)/.test(r.assinatura)) r.inicio = buf.toString('utf8', 0, 160).replace(/\s+/g, ' ');
  } catch (e) { r.erro = String(e && (e.cause?.code || e.message || e)); }
  resultados.push(r);
  console.log(`\n### ${nome}\n${JSON.stringify(r)}`);
}

console.log('\n===== Pacotes em massa de fotos (dados abertos) =====');
for (const ano of [2026, 2022]) {
  for (const dir of ['fotocand', 'fotos']) {
    await sonda(`CDN ${ano} ${dir}/foto_cand${ano}_RJ_div.zip`, `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${ano}/${dir}/foto_cand${ano}_RJ_div.zip`);
  }
}

console.log('\n===== DivulgaCandContas: foto individual =====');
const eleicoes = ['20322002026', '2040602022'];
for (const e of eleicoes) {
  await sonda(`divulga rest/arquivo/img ${e}`, `https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/${e}/${amostra.id}/RJ`);
}
await sonda('divulga eleições ordinárias', 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/ordinarias', { range: false });

console.log('\n===== Comparação: fonte atual (colinha.ai) =====');
await sonda('assets.colinha.ai', `https://assets.colinha.ai/candidatos/fotos/2026/${amostra.id}.jpeg`);

console.log('\n===== RESUMO =====');
for (const r of resultados) console.log(`${r.status ?? 'ERRO'}\t${r.assinatura || ''}\t${r.nome}${r.erro ? '  (' + r.erro + ')' : ''}`);
