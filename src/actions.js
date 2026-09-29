// Compartilhar, baixar, imprimir e copiar link.
import { SLOTS, phraseText } from './cargos.js';
import { S, $ } from './state.js';
import { buildQuery } from './search.js';
import { whenRendered } from './render.js';

export const FILE_NAME = 'colinha-2026-rj.png';

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.textContent = ''; }, 4000);
}

async function getBlob() {
  await whenRendered();
  return new Promise((res, rej) => $('#out').toBlob(b => (b ? res(b) : rej(new Error('toBlob vazio'))), 'image/png'));
}

export function shareURL() {
  const u = new URL(location.href); u.search = ''; u.hash = '';
  const votos = S.ready ? SLOTS.map(s => (S.sel[s.key] && S.sel[s.key].raw) || '') : null;
  buildQuery(votos, S.bg).forEach((v, k) => u.searchParams.set(k, v));
  return u.toString();
}

async function download() {
  try {
    const b = await getBlob(); const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = FILE_NAME;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
    toast('Imagem baixada.');
  } catch (e) { toast('Não foi possível gerar a imagem. Tente de novo.'); }
}

async function share() {
  try {
    const b = await getBlob(); const f = new File([b], FILE_NAME, { type: 'image/png' });
    const text = phraseText(S.bg) + ' Monte a sua: ' + shareURL();
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); return; }
    if (navigator.share) { await navigator.share({ title: 'Minha colinha 2026', text, url: shareURL() }); return; }
    await download(); // sem Web Share: baixa a imagem
  } catch (e) { if (e && e.name === 'AbortError') return; download(); }
}

async function copyLink() {
  const u = shareURL();
  try { await navigator.clipboard.writeText(u); toast('Link copiado.'); }
  catch (e) { prompt('Copie o link:', u); }
}

async function print() {
  try {
    await whenRendered();
    const img = $('#printImg'); img.src = $('#out').toDataURL('image/png');
    await img.decode().catch(() => {});
    window.print();
  } catch (e) { toast('Não foi possível preparar a impressão.'); }
}

export function initActions() {
  $('#dl').addEventListener('click', download);
  $('#share').addEventListener('click', share);
  $('#link').addEventListener('click', copyLink);
  $('#print').addEventListener('click', print);
}
