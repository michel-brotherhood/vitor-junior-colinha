// Lógica pura (sem DOM): normalização, situação da candidatura, índice de busca, resolução e parâmetros do link.
import { CARGOS, SLOTS, ALLBG } from './cargos.js';

export const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/* ---------- situação da candidatura ---------- */
// Textos reais de situação vistos em colinha.ai/api/v1/dados (2026-09-28): DEFERIDO, DEFERIDO EM PRAZO RECURSAL OU COM RECURSO,
// INDEFERIDO, INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO, PENDENTE DE JULGAMENTO, CANCELADO, FALECIMENTO, RENÚNCIA,
// PEDIDO NÃO CONHECIDO (e a variante "EM PRAZO RECURSAL…"). INDEFERIDO é testado antes de DEFERIDO, porque contém a palavra.
const ehIndeferido = s => s.includes('INDEFERIDO');
const ehDeferidoComRecurso = s => !ehIndeferido(s) && s.includes('DEFERIDO') && s.includes('RECURS');

export function rank(sit) {
  const s = norm(sit);
  if (s === 'DEFERIDO') return 0;
  if (ehDeferidoComRecurso(s)) return 1;
  if (s.includes('PENDENTE')) return 2;
  if (ehIndeferido(s) && s.includes('RECURS')) return 3;
  if (ehIndeferido(s)) return 4;
  return 5;
}

export function status(sit) {
  const s = norm(sit);
  if (!s) return null;
  if (s === 'DEFERIDO') return { cls: 'ok', txt: 'Candidatura deferida' };
  if (ehIndeferido(s)) return { cls: 'bad', txt: s.includes('RECURS') ? 'Registro indeferido, com recurso possível: os votos podem ser anulados' : 'Registro indeferido: os votos podem ser anulados', short: 'INDEFERIDA' };
  if (ehDeferidoComRecurso(s)) return { cls: 'warn', txt: 'Deferida, com recurso' };
  if (s.includes('PENDENTE')) return { cls: 'warn', txt: 'Registro ainda em julgamento' };
  if (s.includes('RENUNCIA')) return { cls: 'bad', txt: 'Renunciou à candidatura', short: 'RENUNCIOU' };
  if (s.includes('CANCEL') || s.includes('CASSAD') || s.includes('FALEC')) return { cls: 'bad', txt: sit, short: norm(sit) };
  return { cls: 'warn', txt: sit };
}

/* ---------- índice de uma lista (UE/cargo) ---------- */
export function buildList(entry, ue) {
  const list = ((entry && entry.candidatos) || [])
    .filter(c => c && c.numero != null && /^\d+$/.test(String(c.numero)))
    .map(c => ({
      id: c.id, num: String(c.numero), urna: c.nomeUrna || '', nome: c.nomeCompleto || '',
      sigla: (c.partido && c.partido.sigla) || '', foto: c.foto || '', col: c.nomeColigacao || '', sit: c.descricaoSituacao || '', ue,
      k: norm(c.nomeUrna) + ' ' + norm(c.nomeCompleto)
    }))
    .sort((a, b) => a.urna.localeCompare(b.urna, 'pt-BR'));
  // Um mesmo número pode aparecer mais de uma vez (substituições): fica a candidatura mais ativa.
  const byNum = new Map();
  list.forEach(c => { const o = byNum.get(c.num); if (!o || rank(c.sit) < rank(o.sit)) byNum.set(c.num, c); });
  const parties = new Map();
  list.forEach(c => { const p = c.num.slice(0, 2); if (!parties.has(p)) parties.set(p, c.sigla); });
  const active = list.filter(c => byNum.get(c.num) === c);
  return { list, byNum, parties, active };
}

/* ---------- sugestões ---------- */
export function suggest(data, cargoCode, raw) {
  const cg = CARGOS[cargoCode];
  const q0 = (raw || '').trim();
  const items = [];
  if (!q0) return items;
  if (/^\d+$/.test(q0)) {
    if (cg.legenda && q0.length === 2 && data.parties.has(q0)) items.push({ legenda: q0, sigla: data.parties.get(q0) });
    data.active.filter(c => c.num.startsWith(q0)).slice(0, 8).forEach(c => items.push({ c }));
  } else if (q0.length >= 2) {
    const q = norm(q0).split(/\s+/);
    data.active.filter(c => q.every(w => c.k.includes(w))).slice(0, 8).forEach(c => items.push({ c }));
  }
  return items;
}

/* ---------- resolução do que foi digitado ---------- */
// `focused`: o campo ainda está com foco (legenda de 2 dígitos só é confirmada ao sair do campo).
export function resolveRaw(data, cargoCode, ue, raw, focused) {
  const cg = CARGOS[cargoCode];
  const out = { cand: null, party: null, err: '' };
  const r = (raw || '').trim();
  if (!r || !/^\d+$/.test(r)) return out;
  const onde = ue === 'BR' ? 'para Presidente' : `para ${cg.nome} no Rio de Janeiro`;
  if (r.length === cg.dig) {
    const c = data.byNum.get(r);
    if (c) out.cand = c; else out.err = `Nenhuma candidatura com o número ${r} ${onde}.`;
  } else if (cg.legenda && r.length === 2) {
    if (!focused) {
      if (data.parties.has(r)) out.party = { num: r, sigla: data.parties.get(r) };
      else out.err = `Nenhum partido com o número ${r} ${onde}.`;
    }
  } else if (r.length > cg.dig) {
    out.err = `${cg.nome} tem ${cg.dig} dígitos.`;
  }
  return out;
}

export const MSG_SENADOR_REPETIDO = 'Você já escolheu essa candidatura na 1ª vaga. Escolha outra pessoa para a 2ª vaga.';

/* ---------- parâmetros do link ---------- */
// Só números entram no link; qualquer outra coisa (nome digitado, HTML, lixo) vira campo vazio.
export function sanitizeVoto(v, slot) {
  const s = String(v == null ? '' : v).trim();
  if (!/^\d+$/.test(s)) return '';
  return s.length <= CARGOS[slot.cargo].dig ? s : '';
}

export function parseParams(search) {
  const q = new URLSearchParams(search);
  const f = q.get('f');
  const bg = f && Object.prototype.hasOwnProperty.call(ALLBG, f) ? f : null;
  const parts = (q.get('v') || '').slice(0, 64).split('-');
  const votos = SLOTS.map((s, i) => sanitizeVoto(parts[i], s));
  return { bg, votos };
}

export function buildQuery(votosRaw, bg) {
  const u = new URLSearchParams();
  if (votosRaw) u.set('v', SLOTS.map((s, i) => sanitizeVoto(votosRaw[i], s)).join('-'));
  u.set('f', bg);
  return u;
}
