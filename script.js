(()=>{
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI*2;
const DATA = {
  dates:["25 Jun","9 Jul","23 Jul","13 Aug","27 Aug","10 Sep","24 Sep","8 Oct"],
  already:[28,32,35,38,36,39,42,43],
  likely:[49,45,44,40,43,40,37,34]
};
const ANS = {
  already:{label:"Already happening", year:0.3, group:"a"},
  likely:{label:"Likely to happen", year:9, group:"l"},
  unlikely:{label:"Unlikely to happen", year:23, group:"u"},
  notatall:{label:"Not at all likely to happen", year:26, group:"u"},
  notsure:{label:"Not sure", year:24.5, group:"u"}
};
const ACTS = {1:"Something’s off",2:"Naming it",3:"It’s already here",4:"Who decides?",5:"Your turn"};
const lerpArr=(arr,w)=>{const a=Math.floor(w),b=Math.min(arr.length-1,a+1);return arr[a]+(arr[b]-arr[a])*(w-a)};
const $=s=>document.querySelector(s);

/* ---------------- canvas field ---------------- */
const cv=$('#field'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
const geo={cx:0,cy:0,R0:0,Rmax:0,tilt:.46};
const chart={x0:0,yb:0,s:6,gap:13,colW:30};
const N=1000;
const perm=[...Array(N).keys()];
for(let i=N-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]]}
const dots=[];
for(let i=0;i<N;i++) dots.push({rank:perm[i],th:Math.random()*TAU,u:Math.random(),j:Math.random(),x:0,y:0,gx:0,gy:0,ph:Math.random()*TAU});
const rOfYear=y=>geo.R0*1.7 + (y/20)*(geo.Rmax-geo.R0*1.7);

function layout(){
  const desk=W>=900;
  if(desk){geo.cx=W*.62;geo.cy=H*.52;geo.Rmax=Math.min(W*.24,H*.62)}
  else{geo.cx=W/2;geo.cy=H*.29;geo.Rmax=Math.min(W*.33,H*.4)}
  geo.R0=geo.Rmax*.075;
  let ax0,ax1,top,yb;
  if(desk){ax0=W*.43;ax1=W*.8;top=H*.2;yb=H*.8}else{ax0=48;ax1=W-16;top=H*.12;yb=H*.46}
  const units=8*5+7*2.4;
  chart.s=Math.min((ax1-ax0)/units,(yb-top)/20);
  chart.colW=5*chart.s;chart.gap=2.4*chart.s;
  chart.x0=(ax0+ax1)/2-units*chart.s/2;chart.yb=yb;
  const cols=Math.round(Math.sqrt(N*W/H)), rows=Math.ceil(N/cols);
  const sx=W/cols, sy=H/rows;
  dots.forEach((d,i)=>{d.gx=((i%cols)+.5)*sx;d.gy=(Math.floor(i/cols)+.5)*sy});
}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
  const first=!dots[0].x;layout();
  if(first) dots.forEach(d=>{d.x=d.gx;d.y=d.gy});
}
addEventListener('resize',resize);resize();

const spr=document.createElement('canvas');spr.width=spr.height=40;
{const s=spr.getContext('2d'),g=s.createRadialGradient(20,20,0,20,20,20);
g.addColorStop(0,'rgba(220,228,255,1)');g.addColorStop(.12,'rgba(150,170,255,.95)');g.addColorStop(.35,'rgba(74,99,255,.35)');g.addColorStop(1,'rgba(74,99,255,0)');
s.fillStyle=g;s.fillRect(0,0,40,40);}

/* state */
let scene='intro', modeT=0, dim=1, dimT=1, oa=0, wa=0;
let Wcur=0, Wtarget=0;
let push=0, pushV=0, dragging=false, attempts=0;
let answer=null;
const you={on:false,x:0,y:0};
const pointer={x:-999,y:-999,moved:false};
const rogue={x:0,y:0,vx:0,vy:0,state:'wait',t0:0,trail:[],alive:!RM};
const t0=performance.now();

const SC={
  intro:{m:0,d:1}, reveal:{m:0,d:.55}, question:{m:0,d:.35},
  orbit:{m:1,d:1,w:0}, time:{m:2,d:1,w:'user'}, groups:{m:1,d:.16,w:7},
  push:{m:1,d:1,w:7}, agency:{m:1,d:.14,w:7}, future:{m:1,d:.12,w:7}, room:{m:1,d:.1,w:7}, end:{m:1,d:.45,w:7}
};

function catOf(d,w){
  const A=lerpArr(DATA.already,w)*10, L=A+lerpArr(DATA.likely,w)*10;
  return d.rank<A?0:d.rank<L?1:2;
}
function ellR(px,py){const dx=px-geo.cx,dy=(py-geo.cy)/geo.tilt;return Math.hypot(dx,dy)}

function frame(now){
  const t=(now-t0)/1000;
  const k=RM?1:.075;
  oa+=((modeT===1?1:0)-oa)*(RM?1:.05);
  wa+=((modeT===2?1:0)-wa)*(RM?1:.05);
  dim+=(dimT-dim)*(RM?1:.06);
  Wcur+=(Wtarget-Wcur)*(RM?1:.09);
  if(!dragging){pushV+=-push*.018;pushV*=.9;push+=pushV;if(Math.abs(push)<.05&&Math.abs(pushV)<.05){push=0;pushV=0}}
  ctx.clearRect(0,0,W,H);
  const spin=RM?0:1;
  const {cx,cy,tilt}=geo;

  /* rings */
  if(oa>.02){
    const ra=oa*dim;
    ctx.lineWidth=1;
    [[5,'2031'],[10,'2036'],[15,'2041'],[20,'2046']].filter(([y])=>W>=900||y===20).forEach(([y,l])=>{
      const r=rOfYear(y);
      ctx.strokeStyle=`rgba(232,235,241,${.09*ra})`;
      ctx.beginPath();ctx.ellipse(cx,cy,r,r*tilt,0,0,TAU);ctx.stroke();
      ctx.fillStyle=`rgba(140,147,161,${.9*ra})`;ctx.font='10px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(l,cx+r+8,cy+3);
    });
    // dashed ring: already + likely
    const rb=rOfYear(20.8);
    ctx.setLineDash([2,5]);ctx.strokeStyle=`rgba(217,244,95,${.55*ra})`;
    ctx.beginPath();ctx.ellipse(cx,cy,rb,rb*tilt,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
    const both=Math.round(lerpArr(DATA.already,Wcur)+lerpArr(DATA.likely,Wcur));
    ctx.fillStyle=`rgba(217,244,95,${.9*ra})`;ctx.textAlign='center';
    ctx.fillText(`ALREADY + LIKELY · ${both}%`,cx,cy-rb*tilt-10);
    ctx.fillStyle=`rgba(140,147,161,${.8*ra})`;
    ctx.fillText('UNLIKELY OR NOT SURE',cx,cy+rOfYear(26)*tilt+18);
    ctx.textAlign='left';
  }

  const w=Wcur;
  const back=[],front=[];
  for(let i=0;i<N;i++){
    const d=dots[i];
    let tx,ty,cat=-1,z=1;
    d.rev=true;
    if(modeT===2){
      if(d.rank>=800){cat=-2;tx=d.x;ty=d.y}
      else{
        const c=d.rank%8, kk=Math.floor(d.rank/8), A=DATA.already[c], L=A+DATA.likely[c];
        tx=chart.x0+c*(chart.colW+chart.gap)+(kk%5+.5)*chart.s;
        ty=chart.yb-(Math.floor(kk/5)+.5)*chart.s;
        cat=kk<A?0:kk<L?1:2;d.rev=c<=w+.02;
      }
    }else if(modeT>.5){
      cat=catOf(d,w);
      const yrs=cat===0?.15+d.j*.55:cat===1?1+d.u*19:21.6+d.u*5.4;
      let r=rOfYear(yrs);
      if(cat===0) r+=push*(.75+d.j*.5);
      const sp=cat===0?.16:.07/(1+yrs*.06);
      const a=d.th+t*sp*spin;
      tx=cx+Math.cos(a)*r;ty=cy+Math.sin(a)*r*tilt;z=Math.sin(a);
    }else{
      tx=d.gx;ty=d.gy;
    }
    d.x+=(tx-d.x)*k;d.y+=(ty-d.y)*k;
    d.cat=cat;d.z=z;
    (z<0?back:front).push(d);
  }
  const drawDot=(d)=>{
    if(d.cat===-2)return;
    if(modeT===2&&d.cat>=0){
      const s=chart.s;
      if(!d.rev){ctx.fillStyle=`rgba(140,147,161,${.16*dim})`;ctx.beginPath();ctx.arc(d.x,d.y,s*.2,0,TAU);ctx.fill();return}
      if(d.cat===0){const z=s*1.7;ctx.globalAlpha=dim;ctx.drawImage(spr,d.x-z/2,d.y-z/2,z,z);ctx.globalAlpha=1}
      else{ctx.fillStyle=d.cat===1?`rgba(232,235,241,${.85*dim})`:`rgba(140,147,161,${.4*dim})`;ctx.beginPath();ctx.arc(d.x,d.y,s*(d.cat===1?.24:.2),0,TAU);ctx.fill()}
      return;
    }
    if(d.cat===-1){
      const lowBlue=Math.max(0,(d.y/H-.45)/.55);
      const tw=RM?.5:.5+.5*Math.sin(t*1.3+d.ph);
      const a=(.16+.22*tw+lowBlue*.5)*dim;
      ctx.fillStyle=lowBlue>.05?`rgba(${200-lowBlue*60|0},${210-lowBlue*40|0},255,${a})`:`rgba(232,235,241,${a})`;
      ctx.fillRect(d.x-.8,d.y-.8,1.6,1.6);
    }else if(d.cat===0){
      const s=d.z<0?8:11;ctx.globalAlpha=dim*(d.z<0?.55:1);
      ctx.drawImage(spr,d.x-s/2,d.y-s/2,s,s);ctx.globalAlpha=1;
    }else if(d.cat===1){
      ctx.fillStyle=`rgba(232,235,241,${(d.z<0?.4:.8)*dim})`;ctx.fillRect(d.x-.8,d.y-.8,1.7,1.7);
    }else{
      ctx.fillStyle=`rgba(140,147,161,${(d.z<0?.18:.36)*dim})`;ctx.fillRect(d.x-.7,d.y-.7,1.4,1.4);
    }
  };
  back.forEach(drawDot);

  /* sphere: now */
  if(oa>.02){
    const R=geo.R0*1.05+push*.04, a=oa*dim;
    const g=ctx.createRadialGradient(cx-R*.35,cy-R*.4,R*.1,cx,cy,R);
    g.addColorStop(0,`rgba(235,238,245,${a})`);g.addColorStop(.6,`rgba(120,126,140,${a})`);g.addColorStop(1,`rgba(30,33,40,${a})`);
    const h=ctx.createRadialGradient(cx,cy,R*.8,cx,cy,R*4);
    h.addColorStop(0,`rgba(74,99,255,${.35*a})`);h.addColorStop(1,'rgba(74,99,255,0)');
    ctx.fillStyle=h;ctx.beginPath();ctx.arc(cx,cy,R*4,0,TAU);ctx.fill();
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.fill();
    ctx.fillStyle=`rgba(232,235,241,${.9*a})`;ctx.font='10px "Geist Mono", ui-monospace, monospace';ctx.textAlign='center';
    ctx.fillText('NOW · 2026',cx,cy+R+16);ctx.textAlign='left';
  }
  front.forEach(drawDot);

  /* wave chart overlay */
  if(wa>.02){
    const a=wa*dim, s=chart.s, yb=chart.yb, last=Math.floor(w+.02), cur=last;
    const cxOf=c=>chart.x0+c*(chart.colW+chart.gap)+chart.colW/2;
    const yOf=v=>yb-v/5*s;
    ctx.font='10px "Geist Mono", ui-monospace, monospace';
    // axis
    ctx.strokeStyle=`rgba(232,235,241,${.18*a})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(chart.x0-8,yb+2);ctx.lineTo(cxOf(7)+chart.colW/2+8,yb+2);ctx.stroke();
    ctx.fillStyle=`rgba(140,147,161,${a})`;ctx.textAlign='right';
    [[0,'0%'],[50,'50%'],[100,'100%']].forEach(([v,l])=>ctx.fillText(l,chart.x0-12,yOf(v)+3));
    // dates
    ctx.textAlign='center';
    DATA.dates.forEach((d,c)=>{
      if(W<900&&c!==0&&c!==7&&c!==cur)return;
      ctx.fillStyle=c===cur?`rgba(232,235,241,${a})`:`rgba(140,147,161,${(c<=last?.9:.4)*a})`;
      ctx.fillText(d.toUpperCase(),cxOf(c),yb+20);
    });
    // lines through revealed waves
    const line=(arr,style,dash,width)=>{
      ctx.setLineDash(dash);ctx.strokeStyle=style;ctx.lineWidth=width;ctx.beginPath();
      for(let c=0;c<=last;c++){const x=cxOf(c),y=yOf(arr(c));c?ctx.lineTo(x,y):ctx.moveTo(x,y)}
      ctx.stroke();ctx.setLineDash([]);
    };
    line(c=>DATA.already[c]+DATA.likely[c],`rgba(217,244,95,${.9*a})`,[3,4],1.2);
    line(c=>DATA.already[c],`rgba(169,184,255,${a})`,[],1.6);
    // labels on the current wave
    const A=DATA.already[cur], B=A+DATA.likely[cur], xr=cxOf(cur)+chart.colW/2+8;
    if(W>=900){ctx.textAlign='left';ctx.font='500 12px "Geist Mono", ui-monospace, monospace';
    ctx.fillStyle=`rgba(169,184,255,${a})`;ctx.fillText(`${A}% ALREADY`,xr,yOf(A)+4);
    ctx.fillStyle=`rgba(217,244,95,${a})`;ctx.fillText(`${B}% ALREADY + LIKELY`,xr,yOf(B)-6);
    }
    ctx.lineWidth=1;
  }

  /* the visitor's dot */
  if(you.on){
    let tx,ty;
    if(modeT===2){
      const c=Math.round(Wcur), A=DATA.already[c], L=DATA.likely[c], g=ANS[answer].group;
      const v=g==='a'?A/2:g==='l'?A+L/2:A+L+(100-A-L)/2;
      tx=chart.x0+c*(chart.colW+chart.gap)-chart.s*1.4;ty=chart.yb-v/5*chart.s;
    }else if(modeT>.5){
      const y=ANS[answer].year, r=rOfYear(y)+(answer==='already'?push:0), a=-.75+t*.05*spin;
      tx=cx+Math.cos(a)*r;ty=cy+Math.sin(a)*r*tilt;
    }else{const b=document.querySelector('#answers .is-on');const rc=b?b.getBoundingClientRect():null;
      tx=rc?rc.right+18:you.x;ty=rc?rc.top+rc.height/2:you.y;}
    you.x+=(tx-you.x)*(RM?1:.08);you.y+=(ty-you.y)*(RM?1:.08);
    const ya=Math.max(.35,dim);
    ctx.strokeStyle=`rgba(217,244,95,${.35*ya})`;ctx.beginPath();ctx.arc(you.x,you.y,9+Math.sin(t*3)*1.5*spin,0,TAU);ctx.stroke();
    ctx.fillStyle=`rgba(217,244,95,${ya})`;ctx.beginPath();ctx.arc(you.x,you.y,3.6,0,TAU);ctx.fill();
    if(modeT===1){ctx.font='10px "Geist Mono", ui-monospace, monospace';ctx.fillText('YOU',you.x+14,you.y-8)}
    else if(modeT===2){ctx.font='10px "Geist Mono", ui-monospace, monospace';ctx.textAlign='right';ctx.fillText('YOU',you.x-10,you.y+3);ctx.textAlign='left'}
  }

  /* the rogue dot (act 1) */
  if(rogue.alive&&(scene==='intro'||scene==='reveal')){
    const el=performance.now()-t0;
    if(rogue.state==='wait'){rogue.x=W*.5;rogue.y=H*.72;if(pointer.moved){rogue.state='follow';rogue.t0=el}else if(el>6500){rogue.state='drift';rogue.vx=.9;rogue.vy=-.5}}
    if(rogue.state==='follow'){rogue.x+=(pointer.x+16-rogue.x)*.14;rogue.y+=(pointer.y+16-rogue.y)*.14;if(el-rogue.t0>2600){rogue.state='drift';const a=Math.random()*TAU;rogue.vx=Math.cos(a)*.8;rogue.vy=Math.sin(a)*.8-.3}}
    if(rogue.state==='drift'){rogue.x+=rogue.vx;rogue.y+=rogue.vy;rogue.vx*=1.006;rogue.vy*=1.006;rogue.vx+=Math.sin(el/400)*.02}
    rogue.trail.push([rogue.x,rogue.y]);if(rogue.trail.length>22)rogue.trail.shift();
    rogue.trail.forEach(([x,y],i)=>{ctx.fillStyle=`rgba(217,244,95,${i/22*.35})`;ctx.fillRect(x-1,y-1,2,2)});
    ctx.fillStyle='rgba(217,244,95,1)';ctx.beginPath();ctx.arc(rogue.x,rogue.y,4,0,TAU);ctx.fill();
    if(rogue.state==='drift'&&(rogue.x<-50||rogue.x>W+50||rogue.y<-50||rogue.y>H+50))rogue.alive=false;
  }

  updateTime();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------------- pointer: hover tooltip + push ---------------- */
const tip=$('#tip');
addEventListener('pointermove',e=>{
  pointer.x=e.clientX;pointer.y=e.clientY;pointer.moved=true;
  if(dragging){
    const r=ellR(e.clientX,e.clientY);
    push=Math.max(0,Math.min(geo.Rmax*1.15,(r-rOfYear(.5))*.82));
    return;
  }
  if(scene==='time'&&e.target===cv){
    const s=chart.s, c=Math.floor((e.clientX-chart.x0)/(chart.colW+chart.gap)), inCol=(e.clientX-chart.x0)-c*(chart.colW+chart.gap)<=chart.colW;
    if(c>=0&&c<8&&inCol&&e.clientY<chart.yb+8&&e.clientY>chart.yb-20*s-8){
      const A=DATA.already[c],L=DATA.likely[c];
      tip.innerHTML=`${DATA.dates[c]} · already <b>${A}%</b> · likely ${L}% · rest ${100-A-L}%`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.hidden=false;
    }else tip.hidden=true;
  }else if(scene==='orbit'&&e.target===cv){
    const r=ellR(e.clientX,e.clientY), w=Math.round(Wcur);
    let txt=null;
    const a=DATA.already[w], l=DATA.likely[w];
    if(r<rOfYear(1)) txt=`Already happening · <b>${a}%</b>`;
    else if(r<rOfYear(20.6)) txt=`Likely to happen · <b>${l}%</b>`;
    else if(r<rOfYear(28)) txt=`Unlikely or not sure · <b>${100-a-l}%</b>`;
    if(txt){tip.innerHTML=`${txt} · ${DATA.dates[w]}`;tip.style.left=e.clientX+'px';tip.style.top=e.clientY+'px';tip.hidden=false}else tip.hidden=true;
  }else tip.hidden=true;
},{passive:true});
cv.addEventListener('pointerdown',e=>{
  if(scene!=='push')return;
  if(ellR(e.clientX,e.clientY)<rOfYear(4)){dragging=true;document.body.classList.add('dragging');cv.setPointerCapture(e.pointerId);e.preventDefault()}
});
const endDrag=()=>{if(!dragging)return;dragging=false;document.body.classList.remove('dragging');registerAttempt()};
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
function registerAttempt(){
  attempts++;$('#attempts').textContent=attempts;
  const msgs=["It drifts back.","It drifts back. Again.","Whether we want it or not."];
  $('#pushmsg').textContent=msgs[Math.min(attempts-1,msgs.length-1)];
}
$('#pushbtn').addEventListener('click',()=>{
  if(RM){registerAttempt();return}
  let s=performance.now();dragging=true;
  const target=geo.Rmax*.95;
  const step=n=>{const p=Math.min(1,(n-s)/700);push=target*(1-Math.pow(1-p,3));if(p<1)requestAnimationFrame(step);else{dragging=false;registerAttempt()}};
  requestAnimationFrame(step);
});

/* ---------------- intro typing ---------------- */
const typed=$('#typed');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function typeIn(text,speed,cls){
  const span=document.createElement('span');if(cls)span.className=cls;typed.appendChild(span);
  for(const ch of text){span.textContent+=ch;await sleep(speed+Math.random()*40)}
  return span;
}
async function intro(){
  if(RM){typed.innerHTML='In the next 20 years, AI <span class="rogue-word">is…</span>';selfPick();return}
  await sleep(500);
  await typeIn('In the next 20 years, AI ',55);
  const w=await typeIn('will…',70);
  await sleep(1100);
  for(let i=w.textContent.length;i>0;i--){w.textContent=w.textContent.slice(0,-1);await sleep(90)}
  w.remove();
  await sleep(350);
  await typeIn('is…',150,'rogue-word');
  await sleep(1300);
  selfPick();
}
function selfPick(){$('#continue').classList.add('self');$('#selfnote').classList.add('show')}
intro();

/* ---------------- question ---------------- */
document.querySelectorAll('#answers .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#answers .btn').forEach(x=>{x.classList.remove('is-on');x.setAttribute('aria-checked','false')});
  b.classList.add('is-on');b.setAttribute('aria-checked','true');
  answer=b.dataset.a;
  if(!you.on){const rc=b.getBoundingClientRect();you.x=rc.left+rc.width/2;you.y=rc.top+rc.height/2;you.on=true}
  $('#placed').textContent='Your dot is placed · scroll to meet 1,000 Americans ↓';
  $('#legend-you-txt').textContent='You: '+ANS[answer].label;
  updateRoom();
}));
document.querySelector('#answers').addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp'].includes(e.key))return;
  const bs=[...document.querySelectorAll('#answers .btn')];let i=bs.indexOf(document.activeElement);
  i=(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length;bs[i].focus();e.preventDefault();
});

/* ---------------- time scrub ---------------- */
const wave=$('#wave'), ticks=$('#ticks');
ticks.innerHTML=DATA.dates.map(d=>`<span>${d}</span>`).join('');
let playing=null, played=false;
function setWave(v){wave.value=v;wave.setAttribute('aria-valuetext',DATA.dates[v]+' 2026, '+DATA.already[v]+'% already happening');if(scene==='time')Wtarget=+v}
wave.addEventListener('input',()=>{stopPlay();setWave(+wave.value)});
function stopPlay(){if(playing){clearInterval(playing);playing=null;$('#play').textContent='▶ Play'}}
function play(){
  stopPlay();let v=+wave.value>=7?0:+wave.value;setWave(v);played=true;
  $('#play').textContent='❚❚ Pause';
  playing=setInterval(()=>{v++;if(v>7){stopPlay();return}setWave(v)},RM?300:950);
}
$('#play').addEventListener('click',()=>playing?stopPlay():play());
let lastShown=-1;
function updateTime(){
  const w=Wcur, a=Math.round(lerpArr(DATA.already,w)), l=Math.round(lerpArr(DATA.likely,w));
  const key=a*1000+l;
  if(key===lastShown)return;lastShown=key;
  $('#c-big').textContent=a+'%';$('#s-a').textContent=a+'%';$('#s-l').textContent=l+'%';$('#s-b').textContent=(a+l)+'%';
  const wi=Math.round(w);$('#c-date').textContent=DATA.dates[wi]+' 2026';
  [...ticks.children].forEach((s,i)=>s.classList.toggle('on',i===wi));
}

/* ---------------- groups ---------------- */
const G=[["Party",[["Democrats",31,53],["Republicans",24,35]]],["Age",[["18–34",29,42],["65+",27,42]]],["Gender",[["Men",27,45],["Women",28,41]]]];
const MAXP=60;
let gh=`<div class="gaxis" aria-hidden="true"><span></span><div class="ax">${[0,20,40,60].map(v=>`<span style="left:${v/MAXP*100}%">${v}%</span>`).join('')}</div><span></span></div>`;
G.forEach(([sec,rows])=>{
  gh+=`<div class="gsect">${sec}</div>`;
  rows.forEach(([n,s,e])=>{gh+=`<div class="grow"><span class="gname">${n}</span><div class="gtrack" style="--s:${s/MAXP*100}%;--e:${e/MAXP*100}%" role="img" aria-label="${n}: ${s}% in June, ${e}% in October"><span class="bar"></span><i class="s"></i><i class="e"></i></div><span class="gval">${s} → ${e}%<b>+${e-s}</b></span></div>`});
});
$('#gchart').innerHTML=gh;

/* ---------------- agency grids ---------------- */
document.querySelectorAll('.dgrid').forEach(g=>{const n=+g.dataset.n;g.innerHTML=Array.from({length:100},(_,i)=>`<i class="${i<n?'on':''}" style="--k:${i}"></i>`).join('')});
const replay=el=>{el.classList.remove('run');void el.offsetWidth;el.classList.add('run')};

/* ---------------- future ---------------- */
const year=$('#year'), hist=$('#hist');
const demoYears=[3,2,4,6,9,7,8,5,6,4,5,3,3,2,2,4,1,1,1,0,3]; // demo visitor answers, 2026–2046
function drawHist(){hist.innerHTML=demoYears.map((c,i)=>`<div class="${2026+i===+year.value?'on':''}">${'<i></i>'.repeat(c+(2026+i===+year.value?1:0))}</div>`).join('')}
function onYear(){$('#yearout').textContent=year.value===`2026`?'Now':year.value;year.setAttribute('aria-valuetext',year.value);drawHist();updateRoom()}
year.addEventListener('input',onYear);
const AREAS=['Work','News','Health','Relationships','Education','Creativity'];
$('#pills').innerHTML=AREAS.map((a,i)=>`<label class="pill"><input type="checkbox" id="area-${i}" value="${a}"><span>${a}</span></label>`).join('');
$('#pills').addEventListener('change',()=>{
  const boxes=[...document.querySelectorAll('#pills input')],on=boxes.filter(b=>b.checked);
  boxes.forEach(b=>b.disabled=!b.checked&&on.length>=2);updateRoom();
});

/* ---------------- room ---------------- */
const VIS={a:58,l:49,u:21};
function stack(el,lbl,v){
  const tot=v.a+v.l+v.u;const p=k=>Math.round(v[k]/tot*100);
  el.innerHTML=`<span class="a" style="flex-grow:${v.a}"></span><span class="l" style="flex-grow:${v.l}"></span><span class="u" style="flex-grow:${v.u}"></span>`;
  lbl.innerHTML=`<span>Already ${p('a')}%</span><span>Likely ${p('l')}%</span><span>Unlikely / not sure ${100-p('a')-p('l')}%</span>`;
}
let agPick=null;
function updateRoom(){
  const v={...VIS};if(answer)v[ANS[answer].group]++;
  $('#vn').textContent=v.a+v.l+v.u;
  stack($('#vstack'),$('#vlbl'),v);
  stack($('#astack'),$('#albl'),{a:43,l:34,u:23});
  const areas=[...document.querySelectorAll('#pills input:checked')].map(b=>b.value);
  const yr=year.value==='2026'?'now':year.value;
  if(answer){
    $('#youline').innerHTML=`You answered <em>${ANS[answer].label.toLowerCase()}</em>. You expect it in your own life by <em>${yr}</em>${areas.length?`, and you still want a say in <em>${areas.join(' and ').toLowerCase()}</em>`:''}.`;
  }
  $('#cardyr').textContent=year.value==='2026'?'Now':year.value;
  $('#cardsay').innerHTML=`I still want a say in: <b>${areas.length?areas.join(' & '):'—'}</b>`;
}
document.querySelectorAll('.choice .btn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.choice .btn').forEach(x=>{x.classList.remove('is-on');x.setAttribute('aria-checked','false')});
  b.classList.add('is-on');b.setAttribute('aria-checked','true');agPick=+b.dataset.g;
  const share=[67,16,17][agPick];
  $('#agfb').textContent=agPick===2?'Most Americans did pick one of the two statements: 67% the first, 16% the second.':`In October, ${share}% of Americans chose the same statement as you.`;
}));
$('#copy').addEventListener('click',()=>{
  const areas=[...document.querySelectorAll('#pills input:checked')].map(b=>b.value);
  const txt=`20 Years From Now · my card\nI expect AI to start doing things nobody intended in my own life by ${year.value==='2026'?'now':year.value}.\nI still want a say in: ${areas.length?areas.join(' & '):'(not chosen yet)'}.\n43% of Americans say it is already happening (Americans on AI, Oct 2026).`;
  const ta=$('#cardtext');ta.value=txt;
  const fb=$('#copyfb');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>{fb.textContent='Copied';ta.hidden=true}).catch(()=>{ta.hidden=false;ta.select();fb.textContent='Select the text below and copy it'});
  }else{ta.hidden=false;ta.select();fb.textContent='Select the text below and copy it'}
});
onYear();updateRoom();

/* ---------------- scenes ---------------- */
const secs=[...document.querySelectorAll('.scene')];
const navBtns=[...document.querySelectorAll('.nav button')];
navBtns.forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.go).scrollIntoView({behavior:RM?'auto':'smooth'})));
function setScene(sec){
  const s=sec.dataset.scene;if(s===scene)return;scene=s;document.body.dataset.scene=s;
  const c=SC[s];modeT=c.m;dimT=c.d;
  if(c.w==='user')Wtarget=+wave.value;else if(c.w!==undefined)Wtarget=c.w;
  if(s!=='time')stopPlay();
  if(s==='time'&&!played&&!RM)setTimeout(()=>{if(scene==='time'&&!played)play()},700);
  if(s==='groups')replay($('#gchart'));
  if(s==='agency')replay($('#agencyviz'));
  tip.hidden=true;
  cv.style.touchAction=s==='push'?'none':'auto';
  const act=sec.dataset.act;$('#actlabel').innerHTML=`Act 0${act} · <span>${ACTS[act]}</span>`;
  const map={1:'intro',2:'reveal',3:'orbit',4:'push',5:'future'};
  navBtns.forEach(b=>b.toggleAttribute('aria-current',false));
  const nb=navBtns.find(b=>b.dataset.go===map[act]);if(nb)nb.setAttribute('aria-current','step');
}
document.body.dataset.scene='intro';navBtns[0].setAttribute('aria-current','step');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setScene(e.target)}),{rootMargin:'-50% 0px -50% 0px'});
secs.forEach(s=>io.observe(s));
const prog=$('#progress');
addEventListener('scroll',()=>{const m=document.documentElement.scrollHeight-innerHeight;prog.style.width=(m>0?scrollY/m*100:0)+'%'},{passive:true});

/* ---------------- drawer ---------------- */
const drawer=$('#drawer'),scrim=$('#scrim');let lastFocus=null;drawer.inert=true;
function openDrawer(){lastFocus=document.activeElement;drawer.classList.add('open');scrim.classList.add('open');drawer.setAttribute('aria-hidden','false');drawer.inert=false;$('#closedrawer').focus()}
function closeDrawer(){drawer.classList.remove('open');scrim.classList.remove('open');drawer.setAttribute('aria-hidden','true');drawer.inert=true;if(lastFocus)lastFocus.focus()}
$('#howbtn').addEventListener('click',openDrawer);$('#howbtn2').addEventListener('click',openDrawer);
$('#closedrawer').addEventListener('click',closeDrawer);scrim.addEventListener('click',closeDrawer);
addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))closeDrawer()});
})();
