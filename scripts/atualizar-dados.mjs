#!/usr/bin/env node
// Gera data/candidatos.json (e, opcionalmente, data/fotos/) a partir de fonte oficial do TSE.
//
//   npm run atualizar-dados -- --csv consulta_cand_2026_RJ.csv --csv consulta_cand_2026_BRASIL.csv
//   npm run atualizar-dados -- --api --eleicao <id> [--fotos]
//
// Fontes (NENHUMA foi acessada/verificada no desenvolvimento: os hosts do TSE estavam bloqueados):
//  * --csv : Dados Abertos do TSE, arquivos consulta_cand_<ano>_<UF>.csv (latin1, ';'). Baixe você mesmo em dadosabertos.tse.jus.br.
//  * --api : DivulgaCandContas (divulgacandcontas.tse.jus.br/divulga/rest/v1/...). Rotas e id da eleição precisam ser
//            conferidos por quem rodar o script; ajuste em `rotaLista`/`rotaFoto` se o TSE tiver mudado.
// O script NUNCA sobrescreve a base se a validação falhar.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { candidatosDeCsv, validar, CHAVES } from './lib/tse.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); return i < 0 ? null : args[i + 1]; };
const opts = n => args.flatMap((a, i) => (a === '--' + n ? [args[i + 1]] : []));
const tem = n => args.includes('--' + n);

const OUT = new URL('../data/candidatos.json', import.meta.url);
const ANO = Number(opt('ano') || 2026);
const HOST = 'https://divulgacandcontas.tse.jus.br/divulga';
const rotaLista = (eleicao, ue, cargo) => `${HOST}/rest/v1/candidatura/listar/${ANO}/${ue}/${eleicao}/${cargo}/candidatos`;
const rotaFoto = (eleicao, id, ue) => `${HOST}/arquivo/img/${eleicao}/${id}/${ue}`;
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function porCsv(arquivos) {
  const merged = Object.fromEntries(CHAVES.map(k => [k, { candidatos: [] }]));
  for (const a of arquivos) {
    const texto = new TextDecoder('latin1').decode(await readFile(a));
    const parte = candidatosDeCsv(texto, { ano: ANO });
    for (const k of CHAVES) merged[k].candidatos.push(...parte[k].candidatos);
  }
  return { dados: merged, fonte: `TSE Dados Abertos, ${arquivos.map(a => a.split('/').pop()).join(', ')}` };
}

async function get(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r;
}

async function porApi(eleicao) {
  if (!eleicao) throw new Error('Informe --eleicao <id da eleição no DivulgaCandContas> (o valor do app original não foi verificado).');
  const dados = {};
  for (const k of CHAVES) {
    const [ue, cargo] = k.split('/');
    const j = await (await get(rotaLista(eleicao, ue, cargo))).json();
    dados[k] = { candidatos: (j.candidatos || []).map(c => ({
      id: c.id, numero: String(c.numero), nomeUrna: c.nomeUrna, nomeCompleto: c.nomeCompleto,
      partido: { sigla: c.partido && c.partido.sigla }, nomeColigacao: c.nomeColigacao || '', descricaoSituacao: c.descricaoSituacao || ''
    })) };
    await dormir(500); // sem rajadas
  }
  return { dados, fonte: `DivulgaCandContas API, eleição ${eleicao}` };
}

async function baixarFotos(dados, eleicao) {
  await mkdir(new URL('../data/fotos/', import.meta.url), { recursive: true });
  let ok = 0, falha = 0;
  for (const k of CHAVES) for (const c of dados[k].candidatos) {
    const arq = new URL(`../data/fotos/${c.id}.jpg`, import.meta.url);
    if (existsSync(arq)) continue;
    try {
      const r = await fetch(rotaFoto(eleicao, c.id, k.split('/')[0]), { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(r.status);
      await writeFile(arq, Buffer.from(await r.arrayBuffer())); ok++;
    } catch { falha++; }
    await dormir(200);
  }
  console.log(`Fotos: ${ok} baixadas, ${falha} indisponíveis (o app usa silhueta).`);
}

try {
  const csvs = opts('csv');
  if (!csvs.length && !tem('api')) throw new Error('Use --csv <arquivo> (repetível) ou --api --eleicao <id>. Veja o README.');
  const { dados, fonte } = csvs.length ? await porCsv(csvs) : await porApi(opt('eleicao'));
  const erros = validar(dados, { permitirVazio: tem('permitir-vazio') });
  if (erros.length) throw new Error('Validação falhou, base NÃO alterada:\n - ' + erros.slice(0, 20).join('\n - '));
  const saida = { _meta: { completo: true, fonte, geradoEm: new Date().toISOString(), ano: ANO }, ...dados };
  for (const k of CHAVES) console.log(`${k}: ${dados[k].candidatos.length} registros`);
  if (tem('dry-run')) { console.log('dry-run: nada gravado.'); process.exit(0); }
  const tmp = new URL('../data/candidatos.json.tmp', import.meta.url);
  await writeFile(tmp, JSON.stringify(saida)); await rename(tmp, OUT);
  console.log('Gravado data/candidatos.json');
  if (tem('fotos') && !csvs.length) await baixarFotos(dados, opt('eleicao'));
} catch (e) { console.error(e.message); process.exit(1); }
