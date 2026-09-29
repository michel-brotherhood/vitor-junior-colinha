// Conversão de fontes do TSE para o formato de data/candidatos.json. Funções puras (testáveis sem rede).

export const CARGO_POR_NOME = { PRESIDENTE: 1, GOVERNADOR: 3, SENADOR: 5, 'DEPUTADO FEDERAL': 6, 'DEPUTADO ESTADUAL': 7 };
// Chaves que o app consome: UE/código do cargo.
export const CHAVES = ['RJ/7', 'RJ/6', 'RJ/5', 'RJ/3', 'BR/1'];

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
  const situacao = r => (col.DS_DETALHE_SITUACAO_CAND != null ? r[col.DS_DETALHE_SITUACAO_CAND] : '') || (col.DS_SITUACAO_CANDIDATURA != null ? r[col.DS_SITUACAO_CANDIDATURA] : '') || '';
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
      nomeUrna: r[col.NM_URNA_CANDIDATO].trim(), nomeCompleto: r[col.NM_CANDIDATO].trim(),
      partido: { sigla: r[col.SG_PARTIDO].trim() },
      nomeColigacao: col.NM_COLIGACAO != null ? (r[col.NM_COLIGACAO] || '').trim() : '',
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
