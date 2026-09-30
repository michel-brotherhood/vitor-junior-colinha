#!/usr/bin/env node
// Gera data/candidatos.json (e, com --fotos, data/fotos/) para o RJ + presidente.
//
//   npm run atualizar-dados -- --tse-zip [--fotos [--refazer-fotos]] [--dry-run]   RECOMENDADO (fotos: DivulgaCandContas/TSE)
//   npm run atualizar-dados -- --tse-zip --sem-situacao            só TSE (situação fica em branco)
//   npm run atualizar-dados -- --csv consulta_cand_2026_RJ.csv --csv consulta_cand_2026_BR.csv
//   npm run atualizar-dados -- --colinha-ai                         só o republicador (terceiro)
//   npm run atualizar-dados -- --api --eleicao <id>                 API DivulgaCandContas (403 para clientes automáticos no teste)
//
// O que foi verificado (GitHub Actions, 2026-09-29):
//  * cdn.tse.jus.br/.../consulta_cand_2026.zip responde 200 a um fetch simples e traz consulta_cand_2026_<UF>.csv (latin1, ';', 50 colunas).
//    Identidade oficial completa: SQ_CANDIDATO, NR_CANDIDATO, NM_CANDIDATO (nome completo), NM_URNA_CANDIDATO, SG_PARTIDO.
//    A coluna de SITUAÇÃO vem "#NE" em todas as linhas nesse arquivo em massa, então NÃO serve para deferido/indeferido.
//  * colinha.ai/api/v1/candidatos republica os mesmos registros (mesmo SQ e mesmos totais) com `julg` = situação. É um site de terceiros.
//  * Por isso --tse-zip usa o TSE para a identidade e o colinha.ai só para a situação, cruzando por SQ_CANDIDATO.
//    Se o colinha.ai falhar, a base sai sem situação (e _meta.situacao registra isso), nunca com valores inventados.
// Os registros de data/fixos.json (candidato fixo desta colinha) são mesclados; sem eles o script falha.
// O script NUNCA sobrescreve a base se a validação falhar.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import {
  urlFotoTse, ehJpeg, candidatosDeCsv, validar, validarVolume, CHAVES, CONSULTAS_COLINHA_AI, listarColinhaAi, mesclarFixos, juntarSituacao, dadosDeZipTse
} from './lib/tse.mjs';
import { listarZip, lerEntrada } from './lib/zip.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); return i < 0 || args[i + 1]?.startsWith('--') ? null : args[i + 1]; };
const opts = n => args.flatMap((a, i) => (a === '--' + n ? [args[i + 1]] : []));
const tem = n => args.includes('--' + n);

const OUT = new URL('../data/candidatos.json', import.meta.url);
const ANO = Number(opt('ano') || 2026);
const URL_ZIP = opt('tse-zip') || `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ANO}.zip`;
const COLINHA = opt('colinha-ai-url') || 'https://colinha.ai/api/v1';
const HOST = 'https://divulgacandcontas.tse.jus.br/divulga';
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function get(url, init = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(120000), ...init });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r;
}
const comRetry = async (fn, vezes = 3) => { for (let t = 0; ; t++) { try { return await fn(); } catch (e) { if (t >= vezes - 1) throw e; await dormir(2000 + t * 3000); } } };
const pegaJson = url => comRetry(async () => (await get(url, { headers: { Accept: 'application/json' } })).json());

/* ---------------- fontes ---------------- */
async function porCsv(arquivos) {
  const merged = Object.fromEntries(CHAVES.map(k => [k, { candidatos: [] }]));
  for (const a of arquivos) {
    const parte = candidatosDeCsv(new TextDecoder('latin1').decode(await readFile(a)), { ano: ANO });
    for (const k of CHAVES) merged[k].candidatos.push(...parte[k].candidatos);
  }
  return { dados: merged, meta: { fonte: `TSE Dados Abertos, ${arquivos.map(a => a.split('/').pop()).join(', ')}`, situacao: 'ausente' } };
}

async function porColinhaAi() {
  const pega = pegaJson;
  const dados = {};
  for (const q of CONSULTAS_COLINHA_AI) { dados[q.chave] = { candidatos: await listarColinhaAi(pega, COLINHA, q) }; await dormir(250); }
  let atualizadoEm = null;
  try { atualizadoEm = (await pega(COLINHA + '/dados')).atualizadoEm || null; } catch { /* opcional */ }
  return { dados, meta: { fonte: 'colinha.ai (republicador de terceiros dos dados do TSE)', situacao: 'colinha.ai', situacaoAtualizadaEm: atualizadoEm } };
}

async function porTseZip() {
  console.log('Baixando', URL_ZIP);
  const buf = Buffer.from(await (await comRetry(() => get(URL_ZIP))).arrayBuffer());
  console.log(`zip: ${(buf.length / 1e6).toFixed(1)} MB`);
  const { dados, geradoEm } = dadosDeZipTse(buf, { listarZip, lerEntrada, ano: ANO });
  const meta = { fonte: `TSE, consulta_cand_${ANO}.zip (Dados Abertos), gerado em ${geradoEm || 'data não informada'}`, tseGeradoEm: geradoEm, situacao: 'ausente' };
  if (!tem('sem-situacao')) {
    try {
      const extra = {};
      for (const q of CONSULTAS_COLINHA_AI) { extra[q.chave] = await listarColinhaAi(pegaJson, COLINHA, q); await dormir(250); }
      const st = juntarSituacao(dados, Object.values(extra).flat());
      console.log(`Situação (colinha.ai): ${st.juntados} candidaturas com situação, ${st.semSituacao} sem correspondência, ${st.soNaFonteExtra} só na fonte extra.`);
      const comparar = CHAVES.map(k => `${k}: TSE ${dados[k].candidatos.length} × colinha.ai ${extra[k].length}`);
      console.log('Conferência de totais:', comparar.join(' | '));
      meta.situacao = 'colinha.ai'; meta.situacaoObs = 'situação (deferido, indeferido…) vem do colinha.ai; o CSV em massa do TSE não a traz';
      try { meta.situacaoAtualizadaEm = (await pegaJson(COLINHA + '/dados')).atualizadoEm || null; } catch { /* opcional */ }
    } catch (e) { console.warn('aviso: situação indisponível (' + e.message + '); base gravada sem situação.'); }
  }
  return { dados, meta };
}

/* ---------------- fotos ---------------- */
// Fotos oficiais do TSE (DivulgaCandContas), copiadas para data/fotos/<SQ>.jpg (o canvas exige mesma origem).
// Padrão: só baixa o que falta. Com --refazer-fotos baixa tudo de novo do TSE; a foto antiga só é trocada se a nova for um JPEG válido.
async function baixarFotos(dados) {
  await mkdir(new URL('../data/fotos/', import.meta.url), { recursive: true });
  const refazer = tem('refazer-fotos');
  const todos = CHAVES.flatMap(k => dados[k].candidatos.map(c => ({ c, k })));
  const fila = todos.filter(({ c }) => !c.foto && (refazer || !existsSync(new URL(`../data/fotos/${c.id}.jpg`, import.meta.url))));
  let ok = 0, falha = 0, i = 0; const semFoto = [];
  const trabalhador = async () => {
    while (i < fila.length) {
      const { c, k } = fila[i++];
      try {
        const b = await comRetry(async () => {
          const r = await get(urlFotoTse(c.id, k), { signal: AbortSignal.timeout(30000) });
          const buf = Buffer.from(await r.arrayBuffer());
          if (!ehJpeg(buf)) throw new Error('resposta não é JPEG');
          return buf;
        }, 2);
        await writeFile(new URL(`../data/fotos/${c.id}.jpg`, import.meta.url), b); ok++;
      } catch { falha++; semFoto.push(c.id); }
    }
  };
  await Promise.all(Array.from({ length: 6 }, trabalhador));
  console.log(`Fotos (TSE): ${ok} baixadas, ${falha} indisponíveis (mantém a foto local se existir; senão o app usa silhueta), ${todos.length - fila.length} já existentes/locais.`);
  if (semFoto.length) console.log('Sem foto no TSE:', semFoto.slice(0, 30).join(', '), semFoto.length > 30 ? '…' : '');
}

/* ---------------- principal ---------------- */
try {
  const csvs = opts('csv');
  const modo = csvs.length ? 'csv' : tem('tse-zip') ? 'tse-zip' : tem('colinha-ai') ? 'colinha-ai' : tem('api') ? 'api' : null;
  if (!modo) throw new Error('Use --tse-zip (recomendado), --csv <arquivo> (repetível), --colinha-ai ou --api --eleicao <id>. Veja o README.');
  if (modo === 'api') throw new Error('O modo --api ficou sem manutenção: a API DivulgaCandContas respondeu 403 a clientes automáticos no teste. Use --tse-zip.');
  const { dados, meta } = modo === 'csv' ? await porCsv(csvs) : modo === 'colinha-ai' ? await porColinhaAi() : await porTseZip();

  const fixos = JSON.parse(await readFile(new URL('../data/fixos.json', import.meta.url), 'utf8')).fixos;
  for (const a of mesclarFixos(dados, fixos)) console.warn('aviso:', a);
  for (const { cargo, registro } of fixos) {
    const achado = dados[cargo].candidatos.find(c => String(c.numero) === String(registro.numero));
    if (achado && registro.partido?.sigla && achado.partido.sigla !== registro.partido.sigla) console.warn(`aviso: partido do fixo ${registro.numero} difere (fonte: ${achado.partido.sigla}, fixos.json: ${registro.partido.sigla})`);
  }

  const erros = [...validar(dados, { permitirVazio: tem('permitir-vazio') }), ...(tem('permitir-vazio') ? [] : validarVolume(dados))];
  if (erros.length) throw new Error('Validação falhou, base NÃO alterada:\n - ' + erros.slice(0, 20).join('\n - '));

  const saida = { _meta: { completo: true, ...meta, geradoEm: new Date().toISOString(), ano: ANO }, ...dados };
  for (const k of CHAVES) console.log(`${k}: ${dados[k].candidatos.length} registros`);
  const semSit = CHAVES.flatMap(k => dados[k].candidatos).filter(c => !c.descricaoSituacao).length;
  console.log(`Sem situação: ${semSit}. Vitor Júnior (RJ/6 1200): ${JSON.stringify(dados['RJ/6'].candidatos.find(c => c.numero === '1200'))}`);
  if (tem('dry-run')) { console.log('dry-run: nada gravado.'); process.exit(0); }

  const tmp = new URL('../data/candidatos.json.tmp', import.meta.url);
  await writeFile(tmp, JSON.stringify(saida)); await rename(tmp, OUT);
  console.log('Gravado data/candidatos.json');
  if (tem('fotos')) await baixarFotos(dados);
} catch (e) { console.error(e.message); process.exit(1); }
