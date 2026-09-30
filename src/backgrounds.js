// Fundos temáticos desenhados em canvas. Portado literalmente da referência (funções DRAW.*, PAL e utilitários).
// O PRNG é determinístico por fundo, então miniatura, prévia e PNG exportado saem idênticos.
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function lg(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g;}
function rg(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g;}
function poly(c,cx,cy,r,n,rot=0){c.beginPath();for(let i=0;i<n;i++){const a=rot+i*2*Math.PI/n;c[i?'lineTo':'moveTo'](cx+r*Math.cos(a),cy+r*Math.sin(a));}c.closePath();}

export const PAL = { vitor: ['#FFB068', '#FFFFFF'], azul: ['#FFB068', '#FFFFFF'], colorido: ['#FFB068', '#FFFFFF'] };
// Compromissos: mesma paleta da campanha (laranja + azul-marinho), texto claro sobre painéis escuros.
for (let n = 1; n <= 12; n++) PAL['c' + String(n).padStart(2, '0')] = ['#FFB068', '#FFFFFF'];

// Aba "Fundo": imagens de 9:16 (laranja, azul, colorido) carregadas uma vez. Antes de carregar (ou se falhar), cor lisa.
const fundosImg = {};
const COR_LISA = { vitor: '#FF6A00', azul: '#0B2A6F', colorido: '#0B2A6F' };
export function carregarFundos(urls) {
  return Promise.all(Object.entries(urls).map(([id, url]) => new Promise(res => {
    const i = new Image();
    i.onload = () => { fundosImg[id] = i; res(true); };
    i.onerror = () => res(false);
    i.src = url;
  })));
}

// Imagens opcionais por compromisso (public/img/compromissos/cNN.webp). Se existirem, substituem o desenho em código.
const imagensCompromisso = {};
export function carregarImagensCompromissos(base, ids) {
  return Promise.all(ids.map(id => new Promise(res => {
    const i = new Image();
    i.onload = () => { imagensCompromisso[id] = i; res(true); };
    i.onerror = () => res(false);
    i.src = `${base}${id}.webp`;
  })));
}

/* ---------- ícones (caixa 100×100, traço/preenchimento herdado do contexto) ---------- */
const P = (c, pts, fechar = true) => { c.beginPath(); pts.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x, y)); if (fechar) c.closePath(); };
const ICON = {
  sol(c) { c.beginPath(); c.arc(50, 50, 18, 0, 6.3); c.fill(); for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; c.beginPath(); c.moveTo(50 + Math.cos(t) * 28, 50 + Math.sin(t) * 28); c.lineTo(50 + Math.cos(t) * 40, 50 + Math.sin(t) * 40); c.lineWidth = 6; c.stroke(); } },
  onda(c) { c.lineWidth = 6; for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = 6; x <= 94; x += 4) { const y = 30 + k * 20 + Math.sin((x + k * 12) / 9) * 6; c[x === 6 ? 'moveTo' : 'lineTo'](x, y); } c.stroke(); } },
  estrela(c) { P(c, Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 20 : 44, t = -Math.PI / 2 + i * Math.PI / 5; return [50 + r * Math.cos(t), 52 + r * Math.sin(t)]; })); c.fill(); }
};
// Cada compromisso tem um ícone principal, desenhado por função própria (as formas são propositalmente simples).
const ICONE_DO = {
  c01(c, F, A) { // trem + trilhos
    c.fillStyle = F; rr(c, 12, 16, 76, 50, 12); c.fill();
    c.fillStyle = A; rr(c, 20, 26, 26, 20, 4); c.fill(); rr(c, 54, 26, 26, 20, 4); c.fill();
    c.fillStyle = F; c.beginPath(); c.arc(30, 76, 7, 0, 6.3); c.arc(70, 76, 7, 0, 6.3); c.fill();
    c.strokeStyle = F; c.lineWidth = 5; P(c, [[6, 90], [94, 90]], false); c.stroke(); },
  c02(c, F, A) { // túnel submerso sob ondas
    c.strokeStyle = F; c.lineWidth = 6; ICON.onda(c);
    c.fillStyle = A; rr(c, 14, 62, 72, 24, 12); c.fill(); c.fillStyle = F; c.fillRect(24, 72, 10, 4); c.fillRect(46, 72, 10, 4); c.fillRect(68, 72, 10, 4); },
  c03(c, F, A) { // centro de saúde
    c.fillStyle = F; rr(c, 14, 30, 72, 58, 6); c.fill(); c.fillStyle = A; c.fillRect(44, 38, 12, 34); c.fillRect(33, 49, 34, 12); c.fillStyle = F; P(c, [[8, 32], [50, 8], [92, 32]]); c.fill(); },
  c04(c, F, A) { // acessibilidade
    c.fillStyle = F; c.beginPath(); c.arc(44, 16, 9, 0, 6.3); c.fill();
    c.strokeStyle = F; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round'; P(c, [[44, 28], [44, 54], [66, 54], [76, 78]], false); c.stroke(); P(c, [[44, 40], [62, 40]], false); c.stroke();
    c.strokeStyle = A; c.lineWidth = 7; c.beginPath(); c.arc(40, 66, 22, 0.6, 5.4); c.stroke(); },
  c05(c, F, A) { // escudo com coração
    c.fillStyle = F; c.beginPath(); c.moveTo(50, 6); c.quadraticCurveTo(84, 12, 84, 34); c.quadraticCurveTo(84, 72, 50, 94); c.quadraticCurveTo(16, 72, 16, 34); c.quadraticCurveTo(16, 12, 50, 6); c.fill();
    c.fillStyle = A; c.beginPath(); c.moveTo(50, 70); c.bezierCurveTo(24, 50, 30, 30, 42, 34); c.bezierCurveTo(46, 35, 49, 38, 50, 42); c.bezierCurveTo(51, 38, 54, 35, 58, 34); c.bezierCurveTo(70, 30, 76, 50, 50, 70); c.fill(); },
  c06(c, F, A) { // escola + relógio
    c.fillStyle = F; c.fillRect(10, 42, 80, 46); P(c, [[4, 44], [50, 12], [96, 44]]); c.fill();
    c.fillStyle = A; c.beginPath(); c.arc(50, 34, 10, 0, 6.3); c.fill(); c.strokeStyle = F; c.lineWidth = 3; P(c, [[50, 34], [50, 28]], false); c.stroke(); P(c, [[50, 34], [55, 36]], false); c.stroke();
    c.fillStyle = A; c.fillRect(22, 56, 14, 32); c.fillRect(43, 56, 14, 20); c.fillRect(64, 56, 14, 32); },
  c07(c, F, A) { // capelo
    c.fillStyle = F; P(c, [[50, 14], [96, 36], [50, 58], [4, 36]]); c.fill();
    c.fillStyle = A; P(c, [[24, 50], [24, 72], [50, 84], [76, 72], [76, 50], [50, 62]]); c.fill();
    c.strokeStyle = F; c.lineWidth = 4; P(c, [[90, 40], [90, 74]], false); c.stroke(); c.beginPath(); c.arc(90, 78, 5, 0, 6.3); c.fillStyle = F; c.fill(); },
  c08(c, F, A) { // engrenagem + chave
    c.fillStyle = F; for (let k = 0; k < 8; k++) { c.save(); c.translate(50, 50); c.rotate(k * Math.PI / 4); c.fillRect(-7, -46, 14, 20); c.restore(); }
    c.beginPath(); c.arc(50, 50, 32, 0, 6.3); c.fill(); c.fillStyle = A; c.beginPath(); c.arc(50, 50, 14, 0, 6.3); c.fill(); },
  c09(c, F, A) { // espigas de trigo + sol
    c.strokeStyle = F; c.lineWidth = 5; P(c, [[50, 96], [50, 24]], false); c.stroke(); c.fillStyle = F;
    for (let k = 0; k < 5; k++) { const y = 26 + k * 14; c.save(); c.translate(50, y); c.rotate(-0.6); c.beginPath(); c.ellipse(-14, 0, 14, 6, 0, 0, 6.3); c.fill(); c.restore(); c.save(); c.translate(50, y); c.rotate(0.6); c.beginPath(); c.ellipse(14, 0, 14, 6, 0, 0, 6.3); c.fill(); c.restore(); }
    c.beginPath(); c.ellipse(50, 12, 6, 12, 0, 0, 6.3); c.fill(); c.fillStyle = A; c.beginPath(); c.arc(84, 16, 9, 0, 6.3); c.fill(); },
  c10(c, F, A) { // porta aberta com luz
    c.fillStyle = F; c.fillRect(20, 10, 60, 82); c.fillStyle = A; c.fillRect(28, 18, 44, 74);
    c.fillStyle = F; P(c, [[28, 18], [56, 26], [56, 92], [28, 92]]); c.fill(); c.fillStyle = A; c.beginPath(); c.arc(50, 56, 3, 0, 6.3); c.fill();
    c.strokeStyle = A; c.lineWidth = 4; P(c, [[64, 30], [92, 22]], false); c.stroke(); P(c, [[66, 50], [96, 50]], false); c.stroke(); P(c, [[64, 70], [92, 78]], false); c.stroke(); },
  c11(c, F, A) { // balança
    c.strokeStyle = F; c.lineWidth = 6; c.lineCap = 'round'; P(c, [[50, 12], [50, 86]], false); c.stroke(); P(c, [[14, 26], [86, 26]], false); c.stroke(); P(c, [[30, 90], [70, 90]], false); c.stroke();
    c.lineWidth = 3; P(c, [[14, 26], [4, 56]], false); c.stroke(); P(c, [[14, 26], [26, 56]], false); c.stroke(); P(c, [[86, 26], [74, 56]], false); c.stroke(); P(c, [[86, 26], [96, 56]], false); c.stroke();
    c.fillStyle = A; c.beginPath(); c.arc(15, 57, 13, 0, Math.PI); c.fill(); c.beginPath(); c.arc(85, 57, 13, 0, Math.PI); c.fill(); },
  c12(c, F, A) { // escudo + rede integrada
    c.fillStyle = F; c.beginPath(); c.moveTo(50, 6); c.quadraticCurveTo(86, 12, 86, 36); c.quadraticCurveTo(86, 74, 50, 94); c.quadraticCurveTo(14, 74, 14, 36); c.quadraticCurveTo(14, 12, 50, 6); c.fill();
    c.strokeStyle = A; c.lineWidth = 4; P(c, [[50, 30], [32, 56], [68, 56]]); c.stroke(); P(c, [[50, 30], [50, 74]], false); c.stroke();
    c.fillStyle = A; [[50, 30], [32, 56], [68, 56], [50, 74]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 6, 0, 6.3); c.fill(); }); }
};

// Base em ladrilhos (mesma linguagem do fundo da campanha): quadrados em tons de laranja, ícones tom sobre tom.
function fundoCompromisso(c, W, H, r, id) {
  const T = 120, cols = W / T, rows = Math.ceil(H / T);
  const tons = ['#FF6A00', '#FF7A14', '#F55F00', '#FF6F0A', '#FA6400', '#FF8322'];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { c.fillStyle = tons[Math.floor(r() * tons.length)]; c.fillRect(i * T, j * T, T, T); }
  const principal = ICONE_DO[id];
  const sec = [ICON.sol, ICON.onda, ICON.estrela];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = i * T + 18, y = j * T + 18, k = (i + 2 * j) % 5, m = (i * 3 + j) % 7;
    if (k === 0) { c.save(); c.translate(x, y); c.scale(.84, .84); c.lineCap = 'round'; principal(c, 'rgba(255,255,255,.2)', 'rgba(255,255,255,.34)'); c.restore(); }
    else if (m === 2) { c.save(); c.translate(x + 6, y + 6); c.scale(.7, .7); c.fillStyle = c.strokeStyle = 'rgba(11,42,111,.2)'; sec[(i + j) % 3](c); c.restore(); }
  }
  // Ícone-herói: grande, tom sobre tom, é o que diferencia os 12 fundos nas miniaturas e aparece pelos vãos dos painéis
  c.save(); c.translate(W / 2 - 360, H * .5 - 360); c.scale(7.2, 7.2); c.lineCap = 'round'; c.lineJoin = 'round';
  principal(c, 'rgba(255,255,255,.26)', 'rgba(255,255,255,.4)'); c.restore();
  c.fillStyle = lg(c, 0, 0, 0, H, ['rgba(255,140,40,.0)', 'rgba(11,42,111,.32)']); c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(11,42,111,.55)'; c.fillRect(0, H - 14, W, 14);
}

const DRAW = {};
for (const id of Object.keys(COR_LISA)) {
  DRAW[id] = (c, W, H) => {
    if (fundosImg[id]) c.drawImage(fundosImg[id], 0, 0, W, H);
    else { c.fillStyle = COR_LISA[id]; c.fillRect(0, 0, W, H); }
  };
}
for (let n = 1; n <= 12; n++) {
  const id = 'c' + String(n).padStart(2, '0');
  DRAW[id] = (c, W, H, r) => { if (imagensCompromisso[id]) c.drawImage(imagensCompromisso[id], 0, 0, W, H); else fundoCompromisso(c, W, H, r, id); };
}

export function drawBG(c, id, W, H) { c.save(); DRAW[id](c, W, H, rng(2026 + id.length * 97 + id.charCodeAt(id.length - 1) * 13 + id.charCodeAt(id.length - 2) * 7)); c.restore(); c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; }

export { rr, lg, rg, poly, rng };
