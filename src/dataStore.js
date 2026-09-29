// Camada de dados: lê data/candidatos.json (gerado por scripts/atualizar-dados.mjs) e indexa por UE/cargo.
// A UI só conhece getList/getMeta/photoURLs, então trocar a fonte não afeta o resto.
import { CONFIG } from './config.js';
import { buildList } from './search.js';

let dadosPromise = null;
export function loadDados() {
  if (!dadosPromise) {
    dadosPromise = fetch(CONFIG.DADOS)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(e => { dadosPromise = null; throw e; }); // permite "Tentar de novo"
  }
  return dadosPromise;
}

const listCache = new Map();
export function getList(ue, cargo) {
  const k = ue + '/' + cargo;
  if (!listCache.has(k)) {
    const p = loadDados().then(dados => {
      const j = dados[k];
      if (!j) throw new Error('Sem dados para ' + k);
      return buildList(j, ue);
    }).catch(e => { listCache.delete(k); throw e; });
    listCache.set(k, p);
  }
  return listCache.get(k);
}

// Metadados da base (fonte, data, se está completa). Ausente = tratado como incompleto.
export async function getMeta() {
  const d = await loadDados();
  return d._meta || { completo: false };
}

// Fotos: cópia local primeiro; o atalho /tse só entra se CONFIG.USAR_PROXY_TSE estiver ligado.
export const photoURLs = c => {
  const urls = [`${CONFIG.FOTOS}${c.id}.jpg`];
  if (CONFIG.USAR_PROXY_TSE) urls.push(`${CONFIG.API}/arquivo/img/${CONFIG.ELEICAO}/${c.id}/${c.ue}`);
  return urls;
};
export const logoURL = sigla => sigla ? CONFIG.LOGOS + encodeURIComponent(sigla.replace(/\s+/g, '').toUpperCase()) + '.png' : null;
