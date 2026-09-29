// Etapa 1: campos de candidatura, sugestões (ARIA combobox/listbox), resolução e cartões de resultado.
import { CONFIG } from './config.js';
import { CARGOS, SLOTS } from './cargos.js';
import { S, $ } from './state.js';
import { getList, getMeta, photoURLs } from './dataStore.js';
import { suggest, resolveRaw, status, MSG_SENADOR_REPETIDO } from './search.js';
import { render } from './render.js';
import { updatePhrase } from './bgui.js';

const live = msg => { const el = $('#live'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } };

export function buildSlots() {
  const box = $('#slots'); box.innerHTML = '';
  SLOTS.forEach((s, i) => {
    const st = S.sel[s.key]; const cg = CARGOS[s.cargo];
    const el = document.createElement('div');
    el.className = 'slot' + (st.locked ? ' locked' : ''); el.id = 'slot-' + s.key;
    // Só textos constantes (labels/cargos) entram em innerHTML; valores digitados usam .value/.textContent.
    el.innerHTML = `
      <div class="slot-h">
        <div class="slot-t"><span>${i + 1}º</span>${s.label}</div>
        <div class="slot-d" id="d-${s.key}">${cg.dig} dígitos${cg.legenda ? ' · ou 2 para legenda' : ''}</div>
      </div>
      <div class="field">
        <input type="search" id="in-${s.key}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sugs-${s.key}"
          autocomplete="off" spellcheck="false" placeholder="${S.ready ? 'Número ou nome' : 'Carregando…'}"
          aria-label="${s.label}: número ou nome" aria-describedby="d-${s.key} out-${s.key}">
        <button class="clear" type="button" title="Limpar" aria-label="Limpar ${s.label}">×</button>
      </div>
      <ul class="sugs" id="sugs-${s.key}" role="listbox" aria-label="Sugestões para ${s.label}" hidden></ul>
      <div class="out" id="out-${s.key}" aria-live="polite"></div>`;
    box.appendChild(el);
    const inp = el.querySelector('input'), clr = el.querySelector('.clear'), sugs = el.querySelector('.sugs');
    inp.value = st.raw;
    if (st.locked) { inp.disabled = true; clr.hidden = true; }
    if (!S.ready) inp.disabled = true;
    st.active = -1; st.seq = 0;

    const options = () => [...sugs.querySelectorAll('[role=option]')];
    const setOpen = open => { sugs.hidden = !open; inp.setAttribute('aria-expanded', String(open)); if (!open) { inp.removeAttribute('aria-activedescendant'); st.active = -1; } };
    const setActive = n => {
      const os = options(); if (!os.length) return;
      st.active = (n + os.length) % os.length;
      os.forEach((o, k) => { const on = k === st.active; o.classList.toggle('is-active', on); o.setAttribute('aria-selected', String(on)); });
      inp.setAttribute('aria-activedescendant', os[st.active].id);
      os[st.active].scrollIntoView({ block: 'nearest' });
    };
    st.setOpen = setOpen;

    inp.addEventListener('input', () => { st.raw = inp.value; onType(s, el, setOpen, sugs, options); });
    inp.addEventListener('keydown', e => {
      const open = !sugs.hidden && options().length > 0;
      if (e.key === 'ArrowDown') { if (open) { e.preventDefault(); setActive(st.active + 1); } }
      else if (e.key === 'ArrowUp') { if (open) { e.preventDefault(); setActive(st.active < 0 ? -1 : st.active - 1); } }
      else if (e.key === 'Enter') { if (open) { e.preventDefault(); options()[Math.max(st.active, 0)].click(); } }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); } }
      else if (e.key === 'Tab') setOpen(false);
    });
    clr.addEventListener('click', () => { st.raw = ''; inp.value = ''; setOpen(false); resolve(s).then(updateAll); inp.focus(); });
  });
}

// Depois de achar a candidatura, pula pro próximo campo ainda vazio (e não travado).
function focusNextEmpty(fromKey) {
  const idx = SLOTS.findIndex(x => x.key === fromKey);
  for (let i = idx + 1; i < SLOTS.length; i++) {
    const st = S.sel[SLOTS[i].key];
    if (st.locked || (st.raw || '').trim()) continue;
    const inp = document.getElementById('in-' + SLOTS[i].key);
    if (inp) inp.focus();
    return;
  }
}

async function onType(s, el, setOpen, sugs, options) {
  const st = S.sel[s.key]; const inp = el.querySelector('input');
  const raw = st.raw.trim(); const seq = ++st.seq;
  await resolve(s);
  if (seq !== st.seq) return; // chegou uma digitação mais nova
  updateAll();
  sugs.innerHTML = ''; setOpen(false);
  if (st.cand) focusNextEmpty(s.key);
  if (!raw || st.cand || !S.ready) return;
  let data; try { data = await getList(s.ue, s.cargo); } catch (e) { return; }
  if (seq !== st.seq) return;
  const items = suggest(data, s.cargo, raw);
  if (!items.length) { if (raw.length >= 2) live(`Nenhuma sugestão para ${s.label}.`); return; }
  items.forEach((it, k) => {
    const li = document.createElement('li'); li.setAttribute('role', 'option'); li.id = `opt-${s.key}-${k}`; li.setAttribute('aria-selected', 'false');
    const n = document.createElement('span'); n.className = 'n';
    const nm = document.createElement('span'); nm.className = 'nm';
    const pt = document.createElement('span'); pt.className = 'pt';
    if (it.legenda) { n.textContent = it.legenda; nm.textContent = 'Votar só no partido (legenda)'; pt.textContent = it.sigla; }
    else { n.textContent = it.c.num; nm.textContent = it.c.urna; pt.textContent = it.c.sigla; }
    li.append(n, nm, pt);
    li.addEventListener('mousedown', e => e.preventDefault()); // mantém o foco no campo
    li.addEventListener('click', async () => {
      st.raw = it.legenda || it.c.num; inp.value = st.raw; setOpen(false);
      await resolve(s, true); updateAll();
      if (st.cand || st.party) focusNextEmpty(s.key); else inp.focus();
    });
    sugs.appendChild(li);
  });
  setOpen(true);
  live(`${items.length} ${items.length === 1 ? 'sugestão' : 'sugestões'} para ${s.label}. Use as setas para escolher.`);
}

// `confirmar`: confirma legenda de 2 dígitos mesmo com o campo focado (escolha pela lista).
export async function resolve(s, confirmar = false) {
  const st = S.sel[s.key];
  st.cand = null; st.party = null; st.err = '';
  if (!S.ready) return;
  let data; try { data = await getList(s.ue, s.cargo); } catch (e) { st.err = 'Não foi possível consultar os dados.'; return; }
  const focused = !confirmar && document.activeElement === document.getElementById('in-' + s.key);
  Object.assign(st, resolveRaw(data, s.cargo, s.ue, st.raw, focused));
}

document.addEventListener('focusout', e => {
  const id = (e.target && e.target.id) || '';
  if (!id.startsWith('in-')) return;
  const s = SLOTS.find(x => x.key === id.slice(3));
  setTimeout(() => { if (s && S.sel[s.key] && document.activeElement !== e.target) resolve(s).then(updateAll); }, 150);
});

function cardFor(st) {
  const c = st.cand; const r = document.createElement('div'); r.className = 'res';
  const urls = photoURLs(c); let k = 0;
  const img = new Image(); img.alt = 'Foto de urna de ' + c.urna; img.width = 58; img.height = 77;
  img.onerror = () => {
    k++;
    if (k < urls.length) img.src = urls[k];
    else { const ph = document.createElement('div'); ph.className = 'ph'; ph.setAttribute('role', 'img'); ph.setAttribute('aria-label', 'Foto indisponível'); img.replaceWith(ph); }
  };
  img.src = urls[0];
  const who = document.createElement('div'); who.className = 'who';
  const nu = document.createElement('div'); nu.className = 'nu'; nu.textContent = c.urna;
  const fu = document.createElement('div'); fu.className = 'fu'; fu.textContent = `${c.nome} · ${c.num} · ${c.sigla}`;
  const chips = document.createElement('div'); chips.className = 'chips';
  const stt = status(c.sit); if (stt) { const ch = document.createElement('span'); ch.className = 'chip ' + stt.cls; ch.textContent = stt.txt; chips.appendChild(ch); }
  if (st.locked) { const ch = document.createElement('span'); ch.className = 'chip lock'; ch.textContent = 'Número fixo desta colinha'; chips.appendChild(ch); }
  who.append(nu, fu, chips); r.append(img, who);
  return r;
}

export function updateAll() {
  // senador repetido
  const a = S.sel.s1, b = S.sel.s2;
  if (a && b && a.cand && b.cand && a.cand.num === b.cand.num) { b.err = MSG_SENADOR_REPETIDO; b.cand = null; }
  SLOTS.forEach(s => {
    const el = document.getElementById('slot-' + s.key); if (!el) return;
    const st = S.sel[s.key]; const out = el.querySelector('.out');
    // Só reconstrói quando o conteúdo muda (evita recarregar a foto e reanunciar o leitor de tela).
    const sig = [st.cand ? st.cand.id + '|' + st.cand.num + '|' + st.cand.sit : '', st.party ? st.party.num : '', st.err, st.locked].join('~');
    if (out.dataset.sig === sig) return;
    out.dataset.sig = sig; out.innerHTML = '';
    if (st.cand) out.appendChild(cardFor(st));
    else if (st.party) { const r = document.createElement('div'); r.className = 'note'; r.textContent = `Voto de legenda: o voto vai para o partido ${st.party.sigla} (${st.party.num}).`; out.appendChild(r); }
    if (st.err) { const e = document.createElement('div'); e.className = 'err'; e.textContent = st.err; out.appendChild(e); }
  });
  updatePhrase(); render();
}

export async function carregar(preset) {
  const fix = CONFIG.FIXOS;
  S.ready = false; S.sel = {};
  SLOTS.forEach((s, i) => {
    const fixed = fix[s.cargo];
    S.sel[s.key] = { raw: fixed || (preset && preset[i]) || '', cand: null, party: null, err: '', locked: !!fixed };
  });
  buildSlots();
  $('#sig').textContent = CONFIG.ASSINATURA_SITE;
  $('#carregando').hidden = false; $('#banner').hidden = true; $('#aviso').hidden = true;
  try {
    await Promise.all([...new Set(SLOTS.map(s => s.ue + '/' + s.cargo))].map(k => { const [ue, c] = k.split('/'); return getList(ue, +c); }));
    S.ready = true;
    for (const s of SLOTS) await resolve(s);
    const meta = await getMeta();
    if (meta.completo === false) {
      const quando = meta.geradoEm ? ` (gerada em ${meta.geradoEm.slice(0, 10)})` : '';
      $('#avisoMsg').textContent = `Base de candidaturas incompleta${quando}. Buscas por número ou nome podem não encontrar candidaturas que existem no TSE. Confira sempre no DivulgaCandContas.`;
      $('#aviso').hidden = false;
    }
  } catch (e) {
    $('#bannerMsg').textContent = 'Não foi possível carregar os dados dos candidatos. Verifique sua conexão e tente de novo em instantes.';
    $('#banner').hidden = false;
  } finally { $('#carregando').hidden = true; }
  buildSlots();
  updateAll();
}

export function initRetry() {
  $('#retry').addEventListener('click', () => { const pre = SLOTS.map(s => (S.sel[s.key] && S.sel[s.key].raw) || ''); carregar(pre); });
}
