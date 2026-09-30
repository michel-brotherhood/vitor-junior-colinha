#!/usr/bin/env node
// Só leitura: baixa consulta_cand_2026.zip do CDN do TSE e mostra nomes dos arquivos, cabeçalho do CSV,
// a linha do número 1200 e a contagem por cargo. Serve para conferir o layout real antes de importar.
import { listarZip, lerEntrada } from './lib/zip.mjs';
import { parseCsv } from './lib/tse.mjs';

const URL_ZIP = process.argv[2] || 'https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip';
const res = await fetch(URL_ZIP, { signal: AbortSignal.timeout(120000) });
console.log('GET', res.status, res.headers.get('content-type'), res.headers.get('last-modified') || '(sem last-modified)');
const buf = Buffer.from(await res.arrayBuffer());
console.log('bytes:', buf.length, 'magic:', buf.subarray(0, 4).toString('hex'));
const itens = listarZip(buf);
console.log('\nArquivos no zip:');
for (const i of itens) console.log(`  ${i.nome}\t${i.tamOrig} bytes`);

for (const nome of ['consulta_cand_2026_RJ.csv', 'consulta_cand_2026_BRASIL.csv']) {
  const it = itens.find(i => i.nome === nome);
  if (!it) { console.log(`\n!! ${nome} não existe no zip`); continue; }
  const texto = new TextDecoder('latin1').decode(lerEntrada(buf, it));
  const linhas = parseCsv(texto);
  const [cab, ...dados] = linhas;
  console.log(`\n===== ${nome}: ${dados.length} linhas, ${cab.length} colunas =====`);
  console.log('Colunas:', cab.map((c, i) => `${i}:${c}`).join(' | '));
  const col = Object.fromEntries(cab.map((c, i) => [c, i]));
  console.log('\nPrimeira linha:', JSON.stringify(Object.fromEntries(cab.map((c, i) => [c, dados[0]?.[i]]))));
  const cont = {};
  for (const r of dados) { const k = `${r[col.SG_UF]}|${r[col.CD_CARGO]}|${r[col.DS_CARGO]}`; cont[k] = (cont[k] || 0) + 1; }
  console.log('Contagem SG_UF|CD_CARGO|DS_CARGO:', JSON.stringify(cont));
  const sit = {};
  for (const r of dados) for (const c of ['DS_SITUACAO_CANDIDATURA', 'DS_DETALHE_SITUACAO_CAND', 'DS_SIT_TOT_TURNO']) if (col[c] != null) { const k = `${c}=${r[col[c]]}`; sit[k] = (sit[k] || 0) + 1; }
  console.log('Situações:', JSON.stringify(sit));
  const v = dados.filter(r => r[col.NR_CANDIDATO] === '1200' && r[col.DS_CARGO]?.includes('FEDERAL'));
  console.log('\nLinha(s) 1200 dep. federal:', JSON.stringify(v.map(r => Object.fromEntries(['SQ_CANDIDATO', 'NR_CANDIDATO', 'NM_CANDIDATO', 'NM_URNA_CANDIDATO', 'SG_PARTIDO', 'DS_CARGO', 'SG_UF', 'DS_SITUACAO_CANDIDATURA', 'DS_DETALHE_SITUACAO_CAND', 'NM_COLIGACAO', 'DT_GERACAO', 'HH_GERACAO'].map(c => [c, r[col[c]]])))));
}
