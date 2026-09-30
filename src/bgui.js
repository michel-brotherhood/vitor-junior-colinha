// Etapa 2: abas e grade de fundos.
import { CAUSES, FUNDOS, ALLBG, phraseText } from './cargos.js';
import { S, $ } from './state.js';
import { drawBG } from './backgrounds.js';
import { render } from './render.js';

export function updatePhrase() { $('#phrase').textContent = phraseText(S.bg); marcarAbas(); }

// Ponto na aba que contém o fundo escolhido, para não parecer que nada está selecionado ao trocar de aba.
function marcarAbas() {
  const dono = ALLBG[S.bg] && ALLBG[S.bg].kind;
  for (const [id, kind, nome] of [['#tabFundo', 'fundo', 'Fundo'], ['#tabCause', 'cause', 'Causa']]) {
    const b = $(id); b.toggleAttribute('data-tem-fundo', dono === kind);
    if (dono === kind) b.setAttribute('aria-label', nome + ' (fundo escolhido)'); else b.removeAttribute('aria-label');
  }
}

export function buildBgs() {
  const box = $('#bgs'); box.innerHTML = '';
  const lista = S.tab === 'cause' ? CAUSES : FUNDOS;
  lista.forEach(b => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bg'; btn.setAttribute('aria-pressed', String(S.bg === b.id));
    const cv = document.createElement('canvas'); cv.width = 180; cv.height = 320; cv.setAttribute('aria-hidden', 'true');
    const cx = cv.getContext('2d'); cx.scale(180 / 1080, 320 / 1920); drawBG(cx, b.id, 1080, 1920);
    const sp = document.createElement('span'); sp.textContent = b.label;
    btn.append(cv, sp);
    btn.addEventListener('click', () => {
      S.bg = b.id;
      box.querySelectorAll('.bg').forEach(x => x.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      updatePhrase(); render();
    });
    box.appendChild(btn);
  });
}

export function setTab(t) {
  S.tab = t;
  $('#tabCause').setAttribute('aria-pressed', String(t === 'cause'));
  $('#tabFundo').setAttribute('aria-pressed', String(t === 'fundo'));
  buildBgs(); marcarAbas();
}

export function initTabs() {
  $('#tabCause').addEventListener('click', () => setTab('cause'));
  $('#tabFundo').addEventListener('click', () => setTab('fundo'));
}
export { ALLBG };
