// Conversão de fontes do TSE para o formato de data/candidatos.json. Funções puras (testáveis sem rede).

export const CARGO_POR_NOME = { PRESIDENTE: 1, GOVERNADOR: 3, SENADOR: 5, 'DEPUTADO FEDERAL': 6, 'DEPUTADO ESTADUAL': 7 };
// Chaves que o app consome: UE/código do cargo.
export const CHAVES = ['RJ/7', 'RJ/6', 'RJ/5', 'RJ/3', 'BR/1'];

// O CSV em massa usa marcadores no lugar de "sem dado": "#NE", "#NULO", "NÃO DIVULGÁVEL"…
export const limpo = v => { const t = String(v == null ? '' : v).trim(); return /^#|^N[ÃA]O DIVULG[ÁA]VEL$|^-[0-9]+$/i.test(t) ? '' : t; };

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// Parser CSV mínimo (separador ';', aspas duplas), suficiente para os arquivos consulta_cand do TSE.
export function parseCsv(text, sep = ';') {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(f); f = ''; }
    else if (ch === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f || row.length) { row.push(f.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

// Converte linhas do CSV `consulta_cand_<ano>_<UF|BR>.csv` (layout dos Dados Abertos do TSE).
export function candidatosDeCsv(text, { ano = 2026 } = {}) {
  const [head, ...rows] = parseCsv(text).filter(r => r.length > 1);
  if (!head) throw new Error('CSV vazio');
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
  for (const c of ['NR_CANDIDATO', 'NM_URNA_CANDIDATO', 'NM_CANDIDATO', 'SG_PARTIDO', 'DS_CARGO', 'SG_UF', 'SQ_CANDIDATO'])
    if (!(c in col)) throw new Error(`Coluna ausente no CSV: ${c} (layout diferente do esperado)`);
  const situacao = r => limpo(col.DS_DETALHE_SITUACAO_CAND != null ? r[col.DS_DETALHE_SITUACAO_CAND] : '') || limpo(col.DS_SITUACAO_CANDIDATURA != null ? r[col.DS_SITUACAO_CANDIDATURA] : '');
  const out = Object.fromEntries(CHAVES.map(k => [k, { candidatos: [] }]));
  for (const r of rows) {
    if (col.ANO_ELEICAO != null && r[col.ANO_ELEICAO] && Number(r[col.ANO_ELEICAO]) !== ano) continue;
    const cargo = CARGO_POR_NOME[norm(r[col.DS_CARGO])];
    if (!cargo) continue;
    const ue = cargo === 1 ? 'BR' : r[col.SG_UF];
    if (cargo !== 1 && ue !== 'RJ') continue;
    if (cargo === 1 && col.SG_UE != null && r[col.SG_UE] && r[col.SG_UE] !== 'BR') continue;
    const key = `${ue}/${cargo}`;
    if (!out[key]) continue;
    out[key].candidatos.push({
      id: Number(r[col.SQ_CANDIDATO]), numero: String(r[col.NR_CANDIDATO]).trim(),
      nomeUrna: r[col.NM_URNA_CANDIDATO].trim(), nomeCompleto: limpo(r[col.NM_CANDIDATO]),
      partido: { sigla: r[col.SG_PARTIDO].trim() },
      nomeColigacao: col.NM_COLIGACAO != null ? limpo(r[col.NM_COLIGACAO]) : '',
      descricaoSituacao: situacao(r).trim()
    });
  }
  return out;
}

// Validação de esquema antes de sobrescrever a base.
export function validar(dados, { permitirVazio = false } = {}) {
  const erros = [];
  for (const k of CHAVES) {
    const l = dados[k] && dados[k].candidatos;
    if (!Array.isArray(l)) { erros.push(`${k}: lista ausente`); continue; }
    if (!l.length && !permitirVazio) erros.push(`${k}: nenhuma candidatura`);
    l.forEach((c, i) => {
      if (!c.id || !/^\d+$/.test(String(c.numero)) || !c.nomeUrna || !c.partido || !c.partido.sigla) erros.push(`${k}[${i}]: registro inválido`);
    });
  }
  return erros;
}

/* ---------- colinha.ai (republicador de terceiros; contrato tirado do sync.php do zip enviado) ---------- */
// Linha de /api/v1/candidatos → registro do app. Campos vistos em sync.php: sq, nome, num, sigla, uf, cargoId, slug, julg, fora, situacaoTse.
// NÃO verificado contra a API real (host bloqueado no desenvolvimento). `nome` é tratado como nome de urna; o nome completo não vem nesta rota.
export function candidatoDeColinhaAi(c) {
  return {
    id: Number(c.sq), numero: String(c.num).trim(), nomeUrna: String(c.nome || '').trim(), nomeCompleto: '',
    partido: { sigla: String(c.sigla || '').trim() }, nomeColigacao: '',
    // `fora` (renúncia, indeferido…) tem prioridade: quem saiu da urna não pode aparecer como deferido.
    descricaoSituacao: String(c.fora || c.julg || c.situacaoTse || '').trim()
  };
}

// cargo do app → { uf da consulta, cargoId da API }
export const CONSULTAS_COLINHA_AI = [
  { chave: 'RJ/7', cargo: 7, uf: 'RJ' }, { chave: 'RJ/6', cargo: 6, uf: 'RJ' },
  { chave: 'RJ/5', cargo: 5, uf: 'RJ' }, { chave: 'RJ/3', cargo: 3, uf: 'RJ' },
  { chave: 'BR/1', cargo: 1, uf: 'SP' } // sync.php consulta presidente com uf arbitrária
];

// Pagina /candidatos (offset até `total`). `pega(url)` devolve o JSON; injetado para testar sem rede.
export async function listarColinhaAi(pega, base, { cargo, uf }) {
  const out = []; let off = 0, total = Infinity;
  while (out.length < total) {
    const j = await pega(`${base}/candidatos?${new URLSearchParams({ cargo, uf, q: '', offset: off })}`);
    const lista = j.candidatos || [];
    if (!lista.length) break;
    total = j.total ?? lista.length;
    out.push(...lista.filter(c => Number(c.cargoId ?? cargo) === cargo).map(candidatoDeColinhaAi));
    off += lista.length;
  }
  return out;
}

/* ---------- registros fixos (data/fixos.json) ---------- */
// Mantém o candidato fixo desta colinha: se a fonte trouxer o número, só acrescenta os campos locais
// (foto, e nome completo/situação quando a fonte não os tem); se não trouxer, insere o registro fixo.
export function mesclarFixos(dados, fixos) {
  const avisos = [];
  for (const { cargo, registro } of fixos) {
    const lista = (dados[cargo] = dados[cargo] || { candidatos: [] }).candidatos;
    const achado = lista.find(c => String(c.numero) === String(registro.numero));
    if (!achado) { lista.push({ ...registro }); avisos.push(`${cargo} ${registro.numero}: ausente na fonte, mantido o registro fixo`); continue; }
    if (registro.foto) achado.foto = registro.foto;
    if (!achado.nomeCompleto && registro.nomeCompleto) achado.nomeCompleto = registro.nomeCompleto;
  }
  return avisos;
}

/* ---------- validação de volume e junção de situação ---------- */
// Piso por lista: protege contra arquivo truncado (o RJ tem 793 dep. federais, 1188 estaduais, 17 senadores, 9 governadores, 14 presidentes).
export const MINIMOS = { 'RJ/7': 300, 'RJ/6': 200, 'RJ/5': 5, 'RJ/3': 3, 'BR/1': 5 };
export function validarVolume(dados) {
  return CHAVES.filter(k => (dados[k]?.candidatos?.length || 0) < MINIMOS[k]).map(k => `${k}: só ${dados[k]?.candidatos?.length || 0} registros (mínimo esperado ${MINIMOS[k]})`);
}

// Junta a situação de outra fonte (lista do colinha.ai, com o mesmo SQ do TSE) na base oficial.
// Retorna estatísticas para o log; nunca sobrescreve uma situação que já veio da base oficial.
export function juntarSituacao(dados, situacoes) {
  const porId = new Map(situacoes.map(c => [Number(c.id), c]));
  const st = { juntados: 0, semSituacao: 0, soNaFonteExtra: 0 };
  const vistos = new Set();
  for (const k of CHAVES) for (const c of dados[k].candidatos) {
    const x = porId.get(Number(c.id)); vistos.add(Number(c.id));
    if (!x) { st.semSituacao++; continue; }
    if (!c.descricaoSituacao && x.descricaoSituacao) { c.descricaoSituacao = x.descricaoSituacao; st.juntados++; }
  }
  for (const id of porId.keys()) if (!vistos.has(id)) st.soNaFonteExtra++;
  return st;
}

// Lê o zip oficial (Buffer) e devolve { dados, geradoEm } com RJ (3,5,6,7) e presidente.
export function dadosDeZipTse(buf, { listarZip, lerEntrada, ano = 2026, ufs = ['RJ'] }) {
  const itens = listarZip(buf);
  const dados = Object.fromEntries(CHAVES.map(k => [k, { candidatos: [] }]));
  let geradoEm = null;
  const arquivos = [...ufs.map(u => `consulta_cand_${ano}_${u}.csv`), `consulta_cand_${ano}_BR.csv`];
  for (const nome of arquivos) {
    const it = itens.find(i => i.nome === nome);
    if (!it) throw new Error(`Arquivo ${nome} não encontrado no zip (há: ${itens.map(i => i.nome).slice(0, 8).join(', ')}…)`);
    const texto = new TextDecoder('latin1').decode(lerEntrada(buf, it));
    const parte = candidatosDeCsv(texto, { ano });
    for (const k of CHAVES) dados[k].candidatos.push(...parte[k].candidatos);
    if (!geradoEm) { const [cab, l1] = parseCsv(texto); const c = Object.fromEntries(cab.map((h, i) => [h, i])); if (l1 && c.DT_GERACAO != null) geradoEm = `${l1[c.DT_GERACAO]} ${l1[c.HH_GERACAO] || ''}`.trim(); }
  }
  return { dados, geradoEm };
}
