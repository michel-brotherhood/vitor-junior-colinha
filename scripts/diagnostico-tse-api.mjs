#!/usr/bin/env node
// Só leitura: descobre, na API oficial DivulgaCandContas, os ids das eleições de 2026 e testa a rota de listagem
// por cargo (a mesma cujo formato o HTML de referência consumia: numero, nomeUrna, nomeCompleto, partido.sigla, descricaoSituacao).
const HOST = 'https://divulgacandcontas.tse.jus.br/divulga/rest/v1';
const get = async url => {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(60000) });
  const t = await r.text();
  let j = null; try { j = JSON.parse(t); } catch { /* não é JSON */ }
  return { status: r.status, ct: r.headers.get('content-type'), bytes: t.length, j, inicio: t.slice(0, 300) };
};

const ord = await get(`${HOST}/eleicao/ordinarias`);
console.log('ordinárias:', ord.status, ord.ct, ord.bytes);
const e2026 = (ord.j || []).filter(e => e.ano === 2026);
console.log('Eleições 2026:', JSON.stringify(e2026.map(e => ({ id: e.id, nome: e.nomeEleicao, abrangencia: e.tipoAbrangencia, data: e.dataEleicao, turno: e.turno, uf: e.siglaUF }))));

const testes = [];
for (const e of e2026) for (const [ue, cargo] of [['BR', 1], ['RJ', 3], ['RJ', 5], ['RJ', 6], ['RJ', 7]]) testes.push({ e, ue, cargo });
for (const { e, ue, cargo } of testes) {
  const url = `${HOST}/candidatura/listar/2026/${ue}/${e.id}/${cargo}/candidatos`;
  try {
    const r = await get(url);
    const lista = r.j?.candidatos;
    console.log(`\n${r.status} ${ue} cargo ${cargo} eleição ${e.id}: ${lista ? lista.length + ' candidatos' : r.inicio.slice(0, 160)}`);
    if (lista?.length) {
      console.log('  chaves do objeto:', Object.keys(r.j).join(','));
      console.log('  chaves de um candidato:', Object.keys(lista[0]).join(','));
      if (ue === 'RJ' && cargo === 6) {
        console.log('  amostra:', JSON.stringify(lista[0]).slice(0, 600));
        const v = lista.filter(c => String(c.numero) === '1200');
        console.log('  1200:', JSON.stringify(v).slice(0, 1200));
        const sit = {}; for (const c of lista) sit[c.descricaoSituacao] = (sit[c.descricaoSituacao] || 0) + 1;
        console.log('  situações:', JSON.stringify(sit));
      }
    }
  } catch (err) { console.log(`\nERRO ${ue} cargo ${cargo} eleição ${e.id}:`, String(err.cause?.code || err.message)); }
}

// detalhe individual do candidato fixo (nome completo, situação, foto oficial)
for (const e of e2026) {
  const url = `${HOST}/candidatura/buscar/2026/RJ/${e.id}/candidato/190002539652`;
  try { const r = await get(url); console.log(`\nbuscar 190002539652 eleição ${e.id}:`, r.status, r.inicio.slice(0, 700)); } catch (err) { console.log('ERRO buscar', String(err.message)); }
}
