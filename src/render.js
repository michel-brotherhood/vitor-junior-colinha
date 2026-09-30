// Desenho da colinha (1080×1920). É a única fonte da prévia, do PNG baixado/compartilhado e da impressão.
import { CONFIG } from './config.js';
import { CARGOS, SLOTS, CAUSES, phraseText } from './cargos.js';
import { S, $ } from './state.js';
import { status } from './search.js';
import { photoURLs, logoURL } from './dataStore.js';
import { drawBG, PAL, rr, carregarFundos, carregarImagensCompromissos } from './backgrounds.js';
import { enderecoParaImagem } from './site.js';

const imgCache = new Map();
// Aceita uma URL só (logo) ou uma lista de URLs para tentar em ordem (foto local · foto ao vivo).
function loadImg(urls){
  if(!urls) return Promise.resolve(null);
  const list = Array.isArray(urls) ? urls : [urls];
  const key = list.join('|');
  if(!imgCache.has(key)) imgCache.set(key,(async()=>{
    for(const u of list){
      const img = await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=u;});
      if(img) return img;
    }
    return null;
  })());
  return imgCache.get(key);
}

function fitFont(c,text,weight,family,maxW,start,min){let s=start;do{c.font=`${weight} ${s}px ${family}`;if(c.measureText(text).width<=maxW)return s;s-=2;}while(s>min);c.font=`${weight} ${min}px ${family}`;return min;}
function ellipsize(c,text,maxW){if(c.measureText(text).width<=maxW)return text;let t=text;while(t.length>1&&c.measureText(t+'…').width>maxW)t=t.slice(0,-1);return t+'…';}
function wrap(c,text,maxW){const words=text.split(' ');const lines=[];let cur='';words.forEach(w=>{const t=cur?cur+' '+w:w;if(c.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;});if(cur)lines.push(cur);return lines;}

let renderToken=0; let fontsReady=null; let onFontsReady=()=>{}; let onDrawn=()=>{};
// Callbacks: onFontsReady redesenha as miniaturas quando as fontes carregam; onDrawn avisa que o canvas está pronto.
export function setRenderHooks(h){ onFontsReady=h.onFontsReady||onFontsReady; onDrawn=h.onDrawn||onDrawn; }
let pending=Promise.resolve();
// Resolve quando o desenho mais recente terminou; download/compartilhar/imprimir esperam por isso para não exportar um quadro velho.
export const whenRendered=()=>pending;
export function render(){ const t=++renderToken; updateCanvasLabel(); pending=new Promise(res=>requestAnimationFrame(()=>draw(t).then(res,res))); }

// Texto alternativo do canvas: resume a colinha para leitores de tela.
function updateCanvasLabel(){
  const partes = SLOTS.map((s,i)=>{
    const st = S.sel[s.key]||{};
    if(st.cand) return `${s.label}: ${st.cand.urna}, número ${st.cand.num}`;
    if(st.party) return `${s.label}: voto na legenda ${st.party.sigla}, número ${st.party.num}`;
    return `${s.label}: ainda vou decidir`;
  });
  $('#out').setAttribute('aria-label','Prévia da sua colinha. '+partes.join('. ')+'.');
}
export async function draw(token){
  if(!fontsReady) fontsReady = Promise.all(['700 80px Rajdhani','600 30px Rajdhani','400 30px CutePixel'].map(f=>document.fonts.load(f).catch(()=>{})).concat(carregarFundos(CONFIG.FUNDOS), CONFIG.IMAGENS_COMPROMISSOS ? carregarImagensCompromissos('public/img/compromissos/', CAUSES.map(c => c.id)) : [])).then(()=>onFontsReady());
  await fontsReady;
  const sl = SLOTS;
  const rows = sl.map(s=>{
    const st = S.sel[s.key]||{}; const cg=CARGOS[s.cargo];
    if(st.cand){const c=st.cand;return {label:s.label,dig:cg.dig,num:c.num,name:c.urna,sigla:c.sigla,photo:photoURLs(c),logo:logoURL(c.sigla),stt:status(c.sit)};}
    if(st.party) return {label:s.label,dig:2,num:st.party.num,name:'VOTO NA LEGENDA',sigla:st.party.sigla,logo:logoURL(st.party.sigla),legenda:true};
    return {label:s.label,dig:cg.dig,empty:true};
  });
  const [imgs, logoRodape] = await Promise.all([Promise.all(rows.map(r=>Promise.all([loadImg(r.photo),loadImg(r.logo)]))), loadImg(CONFIG.LOGO_RODAPE)]);
  if(token!==renderToken) return;
  const cv=$('#out'), c=cv.getContext('2d'); const W=1080,H=1920,M=52; const [acc,acc2]=PAL[S.bg];
  c.clearRect(0,0,W,H); drawBG(c,S.bg,W,H);
  // vidro fosco: cópia borrada do fundo, usada dentro dos painéis
  const blur=document.createElement('canvas'); blur.width=W/4; blur.height=H/4;
  const bc=blur.getContext('2d'); bc.filter='blur(6px)'; bc.drawImage(cv,0,0,W/4,H/4);
  const glass=(x,y,w,h,r,a)=>{c.save();rr(c,x,y,w,h,r);c.clip();c.drawImage(blur,0,0,W,H);c.fillStyle=`rgba(10,9,24,${a})`;c.fillRect(x,y,w,h);c.restore();rr(c,x,y,w,h,r);c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=2;c.stroke();};

  // cabeçalho
  const phrase = phraseText(S.bg); const hx=M, hw=W-2*M; const pad=40;
  const [head,tail]=phrase.split(/ (?=Esse é o meu time:$)/); // o fecho fica inteiro na última linha
  const quebra=w=>tail?[...wrap(c,head,w),tail]:wrap(c,phrase,w);
  let fs=84; let lines; c.font=`700 ${fs}px Rajdhani,sans-serif`;
  while(true){c.font=`700 ${fs}px Rajdhani,sans-serif`;lines=quebra(hw-2*pad);if(lines.length<=3||fs<=56)break;fs-=4;}
  { // equilibra as linhas (evita palavra sozinha na última linha)
    const n0=lines.length; let lo=(hw-2*pad)*.5, hi=hw-2*pad;
    for(let k=0;k<14;k++){const mid=(lo+hi)/2; if(quebra(mid).length>n0) lo=mid; else hi=mid;}
    lines=quebra(hi);
  }
  const lh=fs*1.0; const hh=pad+30+22+lines.length*lh+18+36+pad-6;
  glass(hx,M,hw,hh,22,.62);
  c.fillStyle=acc;c.font='400 28px CutePixel,monospace';c.fillText('COLINHA · ELEIÇÕES 2026',hx+pad,M+pad+22);
  c.fillStyle='#F7F7F7';c.font=`700 ${fs}px Rajdhani,sans-serif`;
  lines.forEach((l,i)=>c.fillText(l,hx+pad,M+pad+30+22+lh*(i+1)-fs*.18));
  c.fillStyle='rgba(247,247,247,.72)';c.font='600 34px Rajdhani,sans-serif';
  c.fillText(`Rio de Janeiro · 1º turno · 4 de outubro de 2026`,hx+pad,M+hh-pad+6);

  // linhas
  const footH=162; const footY=H-M-footH;
  const top=M+hh+30, gap=22, n=rows.length; const avail=footY-26-top;
  const rh=Math.min(n===1?300:200,(avail-gap*(n-1))/n); const y0 = n===1? top+(avail-rh)/2 : top;
  rows.forEach((r,i)=>{
    const y=y0+i*(rh+gap), x=M, w=W-2*M, p=16;
    glass(x,y,w,rh,18,.66);
    // foto
    const ph=rh-2*p, pw=Math.round(ph*.75), px=x+p, py=y+p;
    c.save();rr(c,px,py,pw,ph,12);c.clip();
    const [photo,logo]=imgs[i];
    if(photo){const s=Math.max(pw/photo.width,ph/photo.height);c.drawImage(photo,px+(pw-photo.width*s)/2,py+(ph-photo.height*s)/2,photo.width*s,photo.height*s);}
    else{c.fillStyle='rgba(247,247,247,.08)';c.fillRect(px,py,pw,ph);c.fillStyle='rgba(247,247,247,.22)';
      if(r.legenda){c.font=`700 ${pw*.42}px Rajdhani,sans-serif`;c.textAlign='center';c.fillStyle=acc;c.fillText(r.num,px+pw/2,py+ph/2+pw*.15);c.textAlign='left';}
      else{c.beginPath();c.arc(px+pw/2,py+ph*.38,pw*.2,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(px+pw/2,py+ph*.92,pw*.38,ph*.3,0,Math.PI,0);c.fill();}}
    c.restore();
    // número (teclas da urna)
    const bw=r.dig>=5?62:r.dig===4?70:76, bh=Math.min(92,rh-2*p-20), bg=8; const tw=r.dig*bw+(r.dig-1)*bg; const bx=x+w-p-tw-6, by=y+(rh-bh)/2;
    for(let d=0;d<r.dig;d++){const kx=bx+d*(bw+bg);
      c.fillStyle=r.empty?'rgba(247,247,247,.1)':'#F7F7F7';rr(c,kx,by,bw,bh,10);c.fill();
      if(!r.empty){c.fillStyle='#121122';c.font=`700 ${Math.round(bh*.78)}px Rajdhani,sans-serif`;c.textAlign='center';c.fillText(r.num[d]||'',kx+bw/2,by+bh*.78);c.textAlign='left';}}
    // textos
    const tx=px+pw+24, tW=bx-24-tx;
    c.fillStyle=acc;const lfs=fitFont(c,`${i+1} · ${r.label.toUpperCase()}`,400,'CutePixel,monospace',(r.empty?(W-2*M):bx-24-tx)-8,30,22);c.fillText(`${i+1} · ${r.label.toUpperCase()}`,tx,y+p+26);
    if(r.empty){c.fillStyle='rgba(247,247,247,.86)';c.font='600 42px Rajdhani,sans-serif';c.fillText('Ainda vou decidir',tx,y+rh/2+22);return;}
    const nfs=fitFont(c,r.name,700,'Rajdhani,sans-serif',tW,56,34);c.fillStyle='#F7F7F7';c.fillText(ellipsize(c,r.name,tW),tx,y+p+26+nfs*.95+4);
    // partido
    const by2=y+rh-p-8;
    if(logo){const lh2=46,lw2=Math.min(tW*.55,logo.width*(lh2/logo.height));c.fillStyle='rgba(247,247,247,.95)';rr(c,tx,by2-lh2-6,lw2+16,lh2+12,8);c.fill();c.drawImage(logo,tx+8,by2-lh2,lw2,lh2);}
    else{const txt=`${r.num.slice(0,2)} · ${r.sigla}`;c.font='700 28px Rajdhani,sans-serif';const lw2=Math.min(tW,c.measureText(txt).width+28);
      c.fillStyle=acc;rr(c,tx,by2-40,lw2,44,22);c.fill();c.fillStyle='#121122';c.fillText(ellipsize(c,txt,lw2-28),tx+14,by2-8);}
    if(r.stt&&r.stt.cls==='bad'){c.fillStyle='#FF93A0';c.font='700 26px Rajdhani,sans-serif';c.textAlign='right';c.fillText('⚠ '+(r.stt.short||'ATENÇÃO'),x+w-p-6,y+p+22);c.textAlign='left';}
  });

  // rodapé
  glass(M,footY,W-2*M,footH,18,.7);
  const fx=M+30;
  // logo do partido à direita; todo texto do rodapé fica à esquerda dele, com folga
  let logoW=0;
  if(logoRodape){const lh=54;logoW=lh*logoRodape.width/logoRodape.height;c.drawImage(logoRodape,W-M-30-logoW,footY+(footH-lh)/2,logoW,lh);}
  const maxW=W-2*M-60-(logoW?logoW+24:0);
  const site=enderecoParaImagem(CONFIG.SITE,location.host);
  const linhas=site?[46,92,138]:[58,112];
  c.textBaseline='alphabetic';
  c.fillStyle='#F7F7F7';c.font='700 30px Rajdhani,sans-serif';
  c.fillText(ellipsize(c,'Celular não entra na cabine: leve impresso ou anotado.',W-2*M-60),fx,footY+linhas[0]);
  if(site){
    const txt=`Monte a sua: ${site}`;
    fitFont(c,txt,400,'CutePixel,monospace',maxW,30,20);
    c.fillStyle=acc2;c.fillText(ellipsize(c,txt,maxW),fx,footY+linhas[1]);
  }
  // identificação do responsável (obrigatória em material de campanha)
  c.fillStyle='rgba(247,247,247,.86)';c.font='600 30px Rajdhani,sans-serif';
  const fsAss=fitFont(c,CONFIG.ASSINATURA_IMAGEM,600,'Rajdhani,sans-serif',W-2*M-60,30,24);
  c.fillStyle='rgba(247,247,247,.86)';c.fillText(ellipsize(c,CONFIG.ASSINATURA_IMAGEM,W-2*M-60),fx,footY+linhas[site?2:1]);
  onDrawn(token);
}
