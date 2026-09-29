// Etapa 2: abas e grade de fundos.
import { GAMES, CAUSES, ALLBG, phraseText } from './cargos.js';
import { S, $ } from './state.js';
import { drawBG } from './backgrounds.js';
import { render } from './render.js';

export function updatePhrase() { $('#phrase').textContent = phraseText(S.bg); }

export function buildBgs() {
  const box = $('#bgs'); box.innerHTML = '';
  (S.tab === 'game' ? GAMES : CAUSES).forEach(b => {
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
  $('#tabGame').setAttribute('aria-pressed', String(t === 'game'));
  $('#tabCause').setAttribute('aria-pressed', String(t === 'cause'));
  buildBgs();
}

export function initTabs() {
  $('#tabGame').addEventListener('click', () => setTab('game'));
  $('#tabCause').addEventListener('click', () => setTab('cause'));
}
export { ALLBG };
