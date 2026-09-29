// Fundos temáticos desenhados em canvas. Portado literalmente da referência (funções DRAW.*, PAL e utilitários).
// O PRNG é determinístico por fundo, então miniatura, prévia e PNG exportado saem idênticos.
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function lg(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g;}
function rg(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g;}
function poly(c,cx,cy,r,n,rot=0){c.beginPath();for(let i=0;i<n;i++){const a=rot+i*2*Math.PI/n;c[i?'lineTo':'moveTo'](cx+r*Math.cos(a),cy+r*Math.sin(a));}c.closePath();}

export const PAL = {
  rpg:['#E8B84A','#B08CFF'], rts:['#7CFFB2','#FFD166'], fps:['#FF6B3D','#00EAFF'], luta:['#FFD23F','#FF3B5C'],
  corrida:['#FF2E4C','#F7F7F7'], plataforma:['#FFD23F','#2BD96B'], puzzle:['#FF4FD8','#4FF0FF'], moba:['#3CE0C8','#FF5A5A'],
  vitor:['#FFB068','#FFFFFF'],
  educacao:['#FFE27A','#9FE8C3'], ciencia:['#5CE1FF','#B28CFF'], saude:['#5CFFB0','#FF6B81'], seguranca:['#4DA3FF','#FFC845'],
  cultura:['#FF7AD9','#FFD166'], ambiente:['#B6FF5C','#FFD166'], esporte:['#FFE14D','#F7F7F7'], tecnologia:['#00EAFF','#7CFF6B']
};

// Fundo da campanha: imagem 1080×1920 carregada uma vez. Antes de carregar (ou se falhar), laranja liso.
let vitorImg = null;
export function carregarFundoVitor(url) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => { vitorImg = i; res(true); };
    i.onerror = () => res(false);
    i.src = url;
  });
}
const DRAW = {
  vitor(c,W,H){
    if (vitorImg) c.drawImage(vitorImg,0,0,W,H);
    else { c.fillStyle='#FF6A00'; c.fillRect(0,0,W,H); }
  },
  rpg(c,W,H,r){
    c.fillStyle=rg(c,W/2,H*.42,80,H*.85,['#35264f','#1a1229','#0b0712']);c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(255,255,255,.035)';c.lineWidth=2;
    for(let y=0,row=0;y<H;y+=60,row++){for(let x=row%2?-60:0;x<W;x+=120)c.strokeRect(x,y,120,60);}
    for(let i=0;i<110;i++){const s=4+Math.floor(r()*3)*3;c.fillStyle=`rgba(232,184,74,${.15+r()*.5})`;c.fillRect(Math.floor(r()*W/6)*6,Math.floor(r()*H/6)*6,s,s);}
    c.strokeStyle='#E8B84A';c.lineWidth=6;c.strokeRect(20,20,W-40,H-40);c.lineWidth=2;c.strokeRect(34,34,W-68,H-68);
    c.fillStyle='#E8B84A';[[20,20],[W-20,20],[20,H-20],[W-20,H-20]].forEach(([x,y])=>{poly(c,x,y,20,4);c.fill();});
    // gemas nas laterais
    c.fillStyle='#B08CFF';[[W/2,20],[W/2,H-20],[20,H/2],[W-20,H/2]].forEach(([x,y])=>{poly(c,x,y,13,4);c.fill();});
  },
  rts(c,W,H,r){
    c.fillStyle='#0d1a17';c.fillRect(0,0,W,H);
    for(let i=0;i<34;i++){const x=r()*W,y=r()*H,R=120+r()*260;c.fillStyle=rg(c,x,y,0,R,[r()<.5?'rgba(46,110,70,.35)':'rgba(90,80,40,.28)','rgba(0,0,0,0)']);c.fillRect(x-R,y-R,R*2,R*2);}
    c.strokeStyle='rgba(124,255,178,.08)';c.lineWidth=2;
    for(let k=-2*H;k<W+2*H;k+=80){c.beginPath();c.moveTo(k,0);c.lineTo(k+2*H,H);c.stroke();c.beginPath();c.moveTo(k,0);c.lineTo(k-2*H,H);c.stroke();}
    for(let g=0;g<7;g++){const cx=r()*W,cy=r()*H,col=g%2?'#7CFFB2':'#FFD166';for(let i=0;i<9;i++){c.fillStyle=col;c.globalAlpha=.35;c.fillRect(cx+(r()-.5)*90,cy+(r()-.5)*90,10,10);}}
    c.globalAlpha=1;
    c.fillStyle=rg(c,W/2,H/2,H*.35,H*.75,['rgba(0,0,0,0)','rgba(0,0,0,.65)']);c.fillRect(0,0,W,H);
    c.fillStyle='rgba(0,0,0,.6)';c.fillRect(0,0,W,40);c.fillStyle='#FFD166';c.font='400 22px CutePixel,monospace';c.textBaseline='middle';
    c.fillText('◆ OURO 2026',28,21);c.fillStyle='#7CFFB2';c.fillText('▲ RECURSOS 1000',300,21);c.fillStyle='#F7F7F7';c.textAlign='right';c.fillText('TIME 6/6',W-28,21);c.textAlign='left';c.textBaseline='alphabetic';
  },
  fps(c,W,H,r){
    c.fillStyle=lg(c,0,0,0,H,['#0b0f14','#18222e','#0b0f14']);c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(255,255,255,.03)';c.lineWidth=14;for(let x=-H;x<W;x+=60){c.beginPath();c.moveTo(x,H);c.lineTo(x+H,0);c.stroke();}
    const cx=W/2,cy=H*.56;c.strokeStyle='rgba(0,234,255,.16)';c.lineWidth=3;
    [430,280].forEach(R=>{c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.stroke();});
    c.lineWidth=5;[[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>{c.beginPath();c.moveTo(cx+dx*120,cy+dy*120);c.lineTo(cx+dx*520,cy+dy*520);c.stroke();});
    for(let a=0;a<360;a+=10){const t=a*Math.PI/180,l=a%30?12:26;c.beginPath();c.moveTo(cx+Math.cos(t)*430,cy+Math.sin(t)*430);c.lineTo(cx+Math.cos(t)*(430-l),cy+Math.sin(t)*(430-l));c.stroke();}
    c.fillStyle='rgba(0,0,0,.2)';for(let y=0;y<H;y+=6)c.fillRect(0,y,W,2);
    c.strokeStyle='#FF6B3D';c.lineWidth=7;const L=72,I=22;
    [[I,I,1,1],[W-I,I,-1,1],[I,H-I,1,-1],[W-I,H-I,-1,-1]].forEach(([x,y,sx,sy])=>{c.beginPath();c.moveTo(x,y+sy*L);c.lineTo(x,y);c.lineTo(x+sx*L,y);c.stroke();});
  },
  luta(c,W,H,r){
    c.fillStyle=lg(c,0,0,W*.6,H*.6,['#9a1230','#3a0612']);c.beginPath();c.moveTo(0,0);c.lineTo(W,0);c.lineTo(0,H);c.closePath();c.fill();
    c.fillStyle=lg(c,W,H,W*.4,H*.4,['#1340a8','#07153f']);c.beginPath();c.moveTo(W,0);c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(0,0,W,H);
    c.strokeStyle='rgba(255,255,255,.07)';c.lineWidth=3;
    for(let i=0;i<150;i++){const a=r()*Math.PI*2,r1=260+r()*300,r2=r1+200+r()*700;c.beginPath();c.moveTo(W/2+Math.cos(a)*r1,H/2+Math.sin(a)*r1);c.lineTo(W/2+Math.cos(a)*r2,H/2+Math.sin(a)*r2);c.stroke();}
    c.strokeStyle='rgba(255,210,63,.4)';c.lineWidth=10;c.beginPath();c.moveTo(W,0);c.lineTo(0,H);c.stroke();
    const bw=W/2-90;c.fillStyle='rgba(0,0,0,.6)';c.fillRect(24,12,bw,26);c.fillRect(W-24-bw,12,bw,26);
    c.fillStyle='#FFD23F';c.fillRect(28,16,bw-8,18);c.fillStyle='#FF3B5C';c.fillRect(W-20-bw,16,(bw-8)*.8,18);
    c.fillStyle='#F7F7F7';c.font='400 28px CutePixel,monospace';c.textAlign='center';c.fillText('VS',W/2,36);c.textAlign='left';
  },
  corrida(c,W,H,r){
    c.fillStyle='#16161c';c.fillRect(0,0,W,H);
    for(let i=0;i<4000;i++){c.fillStyle=`rgba(255,255,255,${r()*.06})`;c.fillRect(r()*W,r()*H,2,2);}
    const vx=W/2,vy=-260;c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=8;
    [-500,W+500].forEach(x=>{c.beginPath();c.moveTo(vx,vy);c.lineTo(x,H);c.stroke();});
    c.strokeStyle='rgba(255,210,63,.3)';c.lineWidth=14;
    for(let t=.05;t<1;t+=.09){const t2=t+.045;c.beginPath();c.moveTo(vx,vy+(H-vy)*t);c.lineTo(vx,vy+(H-vy)*t2);c.stroke();}
    for(let y=40;y<H;y+=60){const red=(y/60|0)%2;c.fillStyle=red?'#FF2E4C':'#F7F7F7';c.fillRect(0,y,24,60);c.fillRect(W-24,y,24,60);}
    for(let x=0,i=0;x<W;x+=20,i++){for(let row=0;row<2;row++){c.fillStyle=(i+row)%2?'#F7F7F7':'#16161c';c.fillRect(x,row*20,20,20);}}
    c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=3;
    for(let i=0;i<45;i++){const y=r()*H,x=r()*W,l=80+r()*260;c.beginPath();c.moveTo(x,y);c.lineTo(x+l,y);c.stroke();}
  },
  plataforma(c,W,H,r){
    c.fillStyle=lg(c,0,0,0,H,['#2743c9','#4f8cf0','#8fd0ff']);c.fillRect(0,0,W,H);
    const cloud=(x,y,s)=>{c.fillStyle='rgba(255,255,255,.9)';[[1,0,3,1],[0,1,5,1],[0,2,6,1],[1,3,4,1]].forEach(([a,b,w,h])=>c.fillRect(x+a*s,y+b*s,w*s,h*s));};
    for(let i=0;i<9;i++)cloud(r()*(W-160),60+r()*(H-500),14+Math.floor(r()*3)*6);
    c.fillStyle='#177a43';c.beginPath();c.arc(220,H-150,300,Math.PI,0);c.fill();
    c.fillStyle='#1f9e57';c.beginPath();c.arc(W-160,H-150,380,Math.PI,0);c.fill();
    c.fillStyle='#b5562b';c.fillRect(0,H-160,W,160);c.strokeStyle='#7a3316';c.lineWidth=4;
    for(let y=H-160,row=0;y<H;y+=40,row++){for(let x=row%2?-40:0;x<W;x+=80)c.strokeRect(x,y,80,40);}
    c.fillStyle='#2BD96B';c.fillRect(0,H-170,W,20);
    for(let i=0;i<14;i++){const x=40+r()*(W-80),y=200+r()*(H-500);c.fillStyle='#FFD23F';c.beginPath();c.ellipse(x,y,14,20,0,0,Math.PI*2);c.fill();c.fillStyle='#b8860b';c.fillRect(x-3,y-10,6,20);}
    [[140,H*.52],[W-300,H*.3]].forEach(([x,y])=>{for(let i=0;i<3;i++){c.fillStyle='#FFD23F';c.fillRect(x+i*64,y,60,60);c.strokeStyle='#a8761a';c.lineWidth=4;c.strokeRect(x+i*64+2,y+2,56,56);c.fillStyle='#a8761a';[[8,8],[44,8],[8,44],[44,44]].forEach(([a,b])=>c.fillRect(x+i*64+a,y+b,8,8));}});
  },
  puzzle(c,W,H,r){
    c.fillStyle=lg(c,0,0,W,H,['#221444','#120a26']);c.fillRect(0,0,W,H);
    const cols=['#FF4FD8','#4FF0FF','#FFD84F','#7CFF6B','#FF7A4F'];const cs=90;
    for(let y=cs/2;y<H;y+=cs)for(let x=cs/2;x<W;x+=cs){if(r()<.4)continue;const col=cols[r()*cols.length|0],t=r()*4|0,hi=r()<.08;
      c.globalAlpha=hi?.75:.2;c.fillStyle=col;
      if(t===0){poly(c,x,y,34,4);c.fill();}else if(t===1){c.beginPath();c.arc(x,y,30,0,Math.PI*2);c.fill();}else if(t===2){poly(c,x,y,32,6,Math.PI/6);c.fill();}else{poly(c,x,y,34,3,-Math.PI/2);c.fill();}
      if(hi){c.globalAlpha=.8;c.fillStyle='#fff';c.fillRect(x-14,y-18,8,8);}}
    c.globalAlpha=1;c.strokeStyle='rgba(255,255,255,.05)';c.lineWidth=2;
    for(let x=0;x<=W;x+=cs){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}for(let y=0;y<=H;y+=cs){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  },
  moba(c,W,H,r){
    c.fillStyle='#0b1220';c.fillRect(0,0,W,H);
    for(let i=0;i<40;i++){const x=r()*W,y=r()*H,R=80+r()*200;c.fillStyle=rg(c,x,y,0,R,['rgba(20,70,50,.35)','rgba(0,0,0,0)']);c.fillRect(x-R,y-R,2*R,2*R);}
    c.lineCap='round';c.strokeStyle='rgba(60,140,255,.2)';c.lineWidth=170;c.beginPath();c.moveTo(-50,-50);c.lineTo(W+50,H+50);c.stroke();
    c.strokeStyle='rgba(247,247,247,.08)';c.lineWidth=70;const m=100;
    [[[m,H-m],[m,m],[W-m,m]],[[m,H-m],[W-m,H-m],[W-m,m]],[[m,H-m],[W-m,m]]].forEach(p=>{c.beginPath();p.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.stroke();});
    c.lineCap='butt';
    c.fillStyle='rgba(60,224,200,.35)';c.beginPath();c.arc(m,H-m,130,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(255,90,90,.35)';c.beginPath();c.arc(W-m,m,130,0,Math.PI*2);c.fill();
    const tw=(x,y,col)=>{c.fillStyle=col;c.fillRect(x-14,y-14,28,28);c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=3;c.strokeRect(x-14,y-14,28,28);};
    [[m,H*.7],[m,H*.45],[W*.3,H-m],[W*.55,H-m],[W*.3,H*.72],[W*.42,H*.62]].forEach(([x,y])=>tw(x,y,'#3CE0C8'));
    [[W-m,H*.3],[W-m,H*.55],[W*.7,m],[W*.45,m],[W*.7,H*.28],[W*.58,H*.38]].forEach(([x,y])=>tw(x,y,'#FF5A5A'));
  },
  educacao(c,W,H,r){
    c.fillStyle='#6b4526';c.fillRect(0,0,W,H);c.fillStyle='rgba(0,0,0,.15)';for(let y=0;y<H;y+=9)c.fillRect(0,y,W,3);
    c.fillStyle=lg(c,0,0,W,H,['#24473a','#1a3429']);c.fillRect(30,30,W-60,H-60);
    for(let i=0;i<70;i++){c.fillStyle=`rgba(255,255,255,${.015+r()*.03})`;c.beginPath();c.ellipse(r()*W,r()*H,60+r()*200,20+r()*60,r()*3,0,Math.PI*2);c.fill();}
    const f=['a² + b² = c²','E = mc²','H₂O','√81 = 9','ABC','π ≈ 3,14','2 + 2 = 4','Δ = b² − 4ac','sujeito + verbo','CO₂ + H₂O → luz','1822','x + 7 = 12','ÁGUA','Brasil ✶','1, 2, 3...','LER · ESCREVER'];
    c.fillStyle='rgba(255,255,255,.16)';
    for(let i=0;i<22;i++){c.save();c.translate(60+r()*(W-240),80+r()*(H-160));c.rotate((r()-.5)*.25);c.font=`600 ${40+r()*30|0}px Rajdhani,sans-serif`;c.fillText(f[i%f.length],0,0);c.restore();}
    c.strokeStyle='rgba(255,226,122,.18)';c.lineWidth=4;for(let i=0;i<6;i++){c.beginPath();c.arc(r()*W,r()*H,30+r()*60,0,Math.PI*(1+r()));c.stroke();}
  },
  ciencia(c,W,H,r){
    c.fillStyle='#0a1a36';c.fillRect(0,0,W,H);
    for(let x=0;x<=W;x+=40){c.strokeStyle=x%200?'rgba(92,225,255,.05)':'rgba(92,225,255,.1)';c.lineWidth=2;c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
    for(let y=0;y<=H;y+=40){c.strokeStyle=y%200?'rgba(92,225,255,.05)':'rgba(92,225,255,.1)';c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
    const atom=(x,y,s,a)=>{c.strokeStyle=`rgba(92,225,255,${a})`;c.lineWidth=4;[0,Math.PI/3,2*Math.PI/3].forEach(t=>{c.beginPath();c.ellipse(x,y,220*s,76*s,t,0,Math.PI*2);c.stroke();});c.fillStyle=`rgba(178,140,255,${a*1.6})`;c.beginPath();c.arc(x,y,26*s,0,Math.PI*2);c.fill();};
    atom(W-170,H*.62,1.3,.22);atom(170,H*.25,.8,.18);
    for(let m=0;m<12;m++){const x=r()*W,y=r()*H,n=3+(r()*3|0);let px=x,py=y;const pts=[[x,y]];for(let i=0;i<n;i++){px+=(r()-.5)*160;py+=(r()-.5)*160;pts.push([px,py]);}
      c.strokeStyle='rgba(92,225,255,.18)';c.lineWidth=4;c.beginPath();pts.forEach(([a,b],i)=>c[i?'lineTo':'moveTo'](a,b));c.stroke();
      pts.forEach(([a,b],i)=>{c.fillStyle=i%2?'rgba(178,140,255,.35)':'rgba(92,225,255,.35)';c.beginPath();c.arc(a,b,12+r()*10,0,Math.PI*2);c.fill();});}
    c.strokeStyle='rgba(178,140,255,.18)';c.lineWidth=4;[[W*.2,H*.8],[W*.6,H*.15],[W*.4,H*.5]].forEach(([x,y])=>{poly(c,x,y,60,6);c.stroke();poly(c,x,y,40,6);c.stroke();});
  },
  saude(c,W,H,r){
    c.fillStyle=lg(c,0,0,W,H,['#0a2a30','#0f4d52']);c.fillRect(0,0,W,H);
    c.fillStyle='rgba(92,255,176,.07)';for(let y=60;y<H;y+=140)for(let x=((y/140|0)%2)*70+40;x<W;x+=140){c.fillRect(x-18,y-6,36,12);c.fillRect(x-6,y-18,12,36);}
    const ecg=(y,a,lw)=>{c.strokeStyle=`rgba(255,107,129,${a})`;c.lineWidth=lw;c.lineJoin='round';c.beginPath();c.moveTo(0,y);let x=0;while(x<W){x+=120;c.lineTo(x,y);c.lineTo(x+20,y-30);c.lineTo(x+40,y);c.lineTo(x+60,y+40);c.lineTo(x+80,y-150);c.lineTo(x+100,y+80);c.lineTo(x+120,y);x+=160;c.lineTo(x,y);}c.stroke();};
    ecg(H*.5,.14,6);ecg(H*.9,.3,6);
    c.fillStyle=rg(c,W*.8,H*.15,0,420,['rgba(92,255,176,.18)','rgba(0,0,0,0)']);c.fillRect(0,0,W,H);
  },
  seguranca(c,W,H,r){
    c.fillStyle=lg(c,0,0,0,H,['#070d24','#10214f']);c.fillRect(0,0,W,H);
    [[180,'rgba(77,163,255,.14)'],[W-180,'rgba(255,200,69,.10)']].forEach(([x,col])=>{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-30,-10);c.lineTo(x+30,-10);c.lineTo(x+(x<W/2?520:-120),H);c.lineTo(x+(x<W/2?120:-520),H);c.closePath();c.fill();});
    c.strokeStyle='rgba(77,163,255,.07)';c.lineWidth=2;const R=44,hw=R*Math.sqrt(3);
    for(let row=0,y=0;y<H+R;y+=R*1.5,row++)for(let x=row%2?hw/2:0;x<W+hw;x+=hw){poly(c,x,y,R,6,Math.PI/6);c.stroke();}
    const sh=(x,y,s,col,lw)=>{c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.moveTo(x,y-s);c.quadraticCurveTo(x+s*.9,y-s*.8,x+s*.8,y-s*.55);c.quadraticCurveTo(x+s*.8,y+s*.5,x,y+s);c.quadraticCurveTo(x-s*.8,y+s*.5,x-s*.8,y-s*.55);c.quadraticCurveTo(x-s*.9,y-s*.8,x,y-s);c.stroke();};
    sh(W/2,H*.56,420,'rgba(255,200,69,.09)',14);sh(W/2,H*.56,340,'rgba(77,163,255,.08)',8);
  },
  cultura(c,W,H,r){
    c.fillStyle=lg(c,0,0,0,H,['#1c0a28','#2c0f3a','#140820']);c.fillRect(0,0,W,H);
    [[W*.15,'rgba(255,122,217,.16)'],[W*.4,'rgba(255,209,102,.13)'],[W*.65,'rgba(92,225,255,.12)'],[W*.9,'rgba(178,140,255,.15)']].forEach(([x,col],i)=>{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;const d=(i-1.5)*220;c.beginPath();c.moveTo(x-20,0);c.lineTo(x+20,0);c.lineTo(x+d+260,H);c.lineTo(x+d-260,H);c.closePath();c.fill();});
    const cols=['#FF7AD9','#FFD166','#5CE1FF','#B28CFF','#7CFF6B'];
    for(let i=0;i<180;i++){c.save();c.translate(r()*W,r()*H);c.rotate(r()*6);c.globalAlpha=.25+r()*.4;c.fillStyle=cols[r()*5|0];c.fillRect(-9,-4,18,8);c.restore();}
    c.globalAlpha=1;c.fillStyle='rgba(255,255,255,.14)';c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=6;
    for(let i=0;i<12;i++){const x=r()*W,y=r()*H,s=.7+r()*.8;c.beginPath();c.ellipse(x,y,20*s,14*s,-.4,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(x+18*s,y);c.lineTo(x+18*s,y-90*s);c.quadraticCurveTo(x+40*s,y-70*s,x+44*s,y-44*s);c.stroke();}
  },
  ambiente(c,W,H,r){
    c.fillStyle=lg(c,0,0,0,H,['#0b2616','#12472a','#0b2616']);c.fillRect(0,0,W,H);
    c.fillStyle=rg(c,W*.85,H*.1,0,520,['rgba(255,209,102,.4)','rgba(255,209,102,.08)','rgba(0,0,0,0)']);c.fillRect(0,0,W,H);
    const cols=['#1f7a3a','#2f9e4f','#5cc46a','#B6FF5C','#3fb36b'];
    for(let i=0;i<80;i++){const x=r()*W,y=r()*H,s=40+r()*70,a=r()*6;c.save();c.translate(x,y);c.rotate(a);c.globalAlpha=.18+r()*.35;c.fillStyle=cols[r()*5|0];
      c.beginPath();c.moveTo(-s,0);c.quadraticCurveTo(0,-s*.55,s,0);c.quadraticCurveTo(0,s*.55,-s,0);c.fill();
      c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=3;c.beginPath();c.moveTo(-s*.9,0);c.lineTo(s*.9,0);c.stroke();c.restore();}
    c.globalAlpha=1;
  },
  esporte(c,W,H,r){
    for(let y=0,i=0;y<H;y+=160,i++){c.fillStyle=i%2?'#0f5a36':'#0d4f30';c.fillRect(0,y,W,160);}
    c.strokeStyle='rgba(255,255,255,.4)';c.lineWidth=7;const m=44;
    c.strokeRect(m,m,W-2*m,H-2*m);c.beginPath();c.moveTo(m,H/2);c.lineTo(W-m,H/2);c.stroke();
    c.beginPath();c.arc(W/2,H/2,190,0,Math.PI*2);c.stroke();c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.arc(W/2,H/2,10,0,Math.PI*2);c.fill();
    [[m,1],[H-m,-1]].forEach(([y,d])=>{c.strokeRect(W/2-340,d>0?y:y-310,680,310);c.strokeRect(W/2-160,d>0?y:y-110,320,110);c.beginPath();c.arc(W/2,y+d*310,110,d>0?0:Math.PI,d>0?Math.PI:2*Math.PI);c.stroke();});
    c.fillStyle=rg(c,W/2,H/2,H*.3,H*.8,['rgba(0,0,0,0)','rgba(0,0,0,.45)']);c.fillRect(0,0,W,H);
  },
  tecnologia(c,W,H,r){
    c.fillStyle='#05131a';c.fillRect(0,0,W,H);const st=40;
    for(let i=0;i<90;i++){let x=Math.round(r()*W/st)*st,y=Math.round(r()*H/st)*st;const col=r()<.6?'rgba(0,234,255,':'rgba(124,255,107,';
      c.strokeStyle=col+'.16)';c.lineWidth=4;c.beginPath();c.moveTo(x,y);c.fillStyle=col+'.35)';c.fillRect(x-6,y-6,12,12);
      const n=3+(r()*4|0);for(let k=0;k<n;k++){const d=r()*4|0,l=(1+(r()*5|0))*st;if(d===0)x+=l;else if(d===1)y+=l;else if(d===2){x+=l;y+=l;}else{y-=l;x+=l;}c.lineTo(x,y);}
      c.stroke();c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();}
    for(let i=0;i<5;i++){const x=80+r()*(W-300),y=120+r()*(H-360),w=120+r()*80,h=90+r()*60;c.fillStyle='rgba(0,0,0,.55)';c.fillRect(x,y,w,h);c.strokeStyle='rgba(0,234,255,.25)';c.lineWidth=3;c.strokeRect(x,y,w,h);
      c.fillStyle='rgba(0,234,255,.3)';for(let p=x+12;p<x+w-8;p+=20){c.fillRect(p,y-10,8,10);c.fillRect(p,y+h,8,10);}}
  }
};

export function drawBG(c,id,W,H){ c.save(); DRAW[id](c,W,H,rng(2026+id.length*97)); c.restore(); c.globalAlpha=1; c.textAlign='left'; c.textBaseline='alphabetic'; }

export { rr, lg, rg, poly, rng };
