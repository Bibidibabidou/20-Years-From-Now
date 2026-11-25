{
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const MONO = '"Geist Mono", ui-monospace, monospace';

/* survey data: Americans on AI, item "AI systems behaving in ways their developers did not intend" */
const D = {
  dates: ['25 Jun', '9 Jul', '23 Jul', '13 Aug', '27 Aug', '10 Sep', '24 Sep', '8 Oct'],
  already: [28, 32, 35, 38, 36, 39, 42, 43],
  likely: [49, 45, 44, 40, 43, 40, 37, 34]
};
/* sample answers replayed in act 5 (not live) */
const VIS = [
  { n: 'Visitor 312', y: 2027, c: '#a9b8ff', t: 0.6, off: 4 },
  { n: 'Visitor 313', y: 2026, c: '#e8ebf1', t: 2.1, off: 3 },
  { n: 'Visitor 315', y: 2033, c: '#f2a7c3', t: 3.5, off: -4 },
  { n: 'Visitor 318', y: 2029, c: '#7fd3c3', t: 5.0, off: 5 }
];
const ACTS = { 1: 'Act 01 · You', 2: 'Act 02 · It already happened', 3: 'Act 03 · What Americans think', 4: 'Act 04 · Who decides', 5: 'Act 05 · Your next 20 years' };
const NAVID = { 1: 'you', 2: 'db', 3: 'tracker', 4: 'agency', 5: 'future' };
const CTL = [[0.4, 'Wait.'], [1.6, 'You’re not moving it anymore.'], [3.4, 'It’s copying you.'], [7.2, 'Nobody asked it to.']];
const ANSY = { a: 0.3, l: 9, u: 24 };

const cv = $('#cv'), ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, desk = true;
let seed = 11;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const N = 1000;
const perm = [...Array(N).keys()];
for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
const dots = perm.map(r => ({ rank: r, fx: rnd(), fy: rnd(), ph: rnd() * TAU, x: 0, y: 0, a: 0, tx: 0, ty: 0, ta: 0, r: 1.3, tr: 1.3, col: 'w', z: 1 }));

const S = { scene: '', act: 0, p: 0, te: 0, mx: 0, my: 0, mouse: false, touched: false, ans: null, ag: null, year: 2030, pins: [], oa: 0, intro: false };
const you = { x: 0, y: 0, r: 7 };

const spr = document.createElement('canvas'); spr.width = spr.height = 40;
{
  const s = spr.getContext('2d'), g = s.createRadialGradient(20, 20, 0, 20, 20, 20);
  g.addColorStop(0, 'rgba(225,232,255,1)'); g.addColorStop(.16, 'rgba(140,160,255,.95)');
  g.addColorStop(.4, 'rgba(74,99,255,.3)'); g.addColorStop(1, 'rgba(74,99,255,0)');
  s.fillStyle = g; s.fillRect(0, 0, 40, 40);
}

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; desk = W >= 700;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!you.x) { you.x = W / 2; you.y = H * .42; S.mx = you.x; S.my = you.y; dots.forEach(d => { d.x = you.x; d.y = you.y; }); }
  placeYear();
}

/* ---------- geometry ---------- */
const field = (d, t) => [W * (0.04 + d.fx * 0.92) + Math.sin(t * 0.3 + d.ph) * 5, H * (0.1 + d.fy * 0.84) + Math.cos(t * 0.25 + d.ph) * 5];
const dbBox = () => desk ? { x0: W * .08, x1: W * .92, y0: H * .52, y1: H * .9 } : { x0: W * .06, x1: W * .94, y0: H * .58, y1: H * .86 };
const ibBox = () => desk ? { x0: W * .22, x1: W * .78, y0: H * .52, y1: H * .88 } : { x0: W * .1, x1: W * .9, y0: H * .69, y1: H * .86 };
function orbitGeo() {
  const g = desk ? { cx: W * .5, cy: H * .33, Rmax: Math.min(W * .26, H * .34) } : { cx: W * .5, cy: H * .24, Rmax: W * .27 };
  g.tilt = .46; g.R0 = g.Rmax * .075; return g;
}
const rOf = (g, y) => g.R0 * 1.7 + (y / 20) * (g.Rmax - g.R0 * 1.7);
function waveGeo() {
  const b = desk ? { x0: W * .1, x1: W * .9, y0: H * .42, y1: H * .87 } : { x0: W * .05, x1: W * .95, y0: H * .53, y1: H * .84 };
  const units = 8 * 5 + 7 * 2.6, s = Math.min((b.x1 - b.x0) / units, (b.y1 - b.y0) / 20);
  return { s, x0: (b.x0 + b.x1) / 2 - units * s / 2, yb: b.y1, gap: 2.6 * s };
}
const colX = (g, c) => g.x0 + c * (5 * g.s + g.gap);
function clusters() {
  const RA = desk ? Math.min(W * .17, H * .2) : Math.min(W * .24, H * .15);
  const c = RA / Math.sqrt(670);
  const ctr = desk ? [[.34, .52], [.62, .5], [.83, .58]] : [[.33, .42], [.76, .3], [.76, .62]];
  const n = [670, 160, 170];
  return ctr.map((p, i) => ({ x: W * p[0], y: H * p[1], R: c * Math.sqrt(n[i]), c }));
}
const timeline = () => desk ? { x0: W * .1, x1: W * .9, y: H * .56 } : { x0: W * .08, x1: W * .92, y: H * .56 };
const yearX = (tl, y) => tl.x0 + (y - 2026) / 20 * (tl.x1 - tl.x0);

/* ---------- pointer ---------- */
addEventListener('pointermove', e => { if (e.pointerType !== 'touch' && (e.clientX || e.clientY)) { S.mx = e.clientX; S.my = e.clientY; S.mouse = true; } }, { passive: true });
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { S.mx = e.clientX; S.my = e.clientY; S.touched = true; } }, { passive: true });
if (matchMedia('(hover: none)').matches) $('#hint').textContent = 'One dot. It follows you. Tap anywhere, then scroll.';
const follow = (fx, fy) => (S.mouse || S.touched) ? [S.mx, S.my] : [fx, fy];

/* ---------- scroll lock during the takeover ---------- */
let locked = false, lockY = 0, ctlDone = false;
const stopEv = e => { if (locked) e.preventDefault(); };
const KEYS = [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'];
const stopKey = e => { if (locked && KEYS.includes(e.key)) e.preventDefault(); };
addEventListener('wheel', stopEv, { passive: false });
addEventListener('touchmove', stopEv, { passive: false });
addEventListener('keydown', stopKey);
function lock(sec) { locked = true; lockY = sec.offsetTop; scrollTo(0, lockY); document.documentElement.style.overflow = 'hidden'; }
function unlock() { locked = false; ctlDone = true; document.documentElement.style.overflow = ''; }

/* ---------- scenes ---------- */
const secs = [...document.querySelectorAll('section[data-scene]')];
const navBtns = [...document.querySelectorAll('.nav button')];
const actEl = $('#act');
let lastCap = '', scrambling = false;
function enter(sec, t) {
  const prev = S.scene;
  S.scene = sec.dataset.scene; S.te = t; document.body.dataset.scene = S.scene;
  secs.forEach(x => x.classList.toggle('on', x === sec));
  const a = +sec.dataset.act;
  if (a !== S.act) { S.act = a; actEl.textContent = ACTS[a]; navBtns.forEach(b => b.toggleAttribute('aria-current', false)); const nb = navBtns.find(b => b.dataset.go === NAVID[a]); if (nb) nb.setAttribute('aria-current', 'step'); }
  document.body.classList.remove('ghosting');
  ['#ib2', '#db2', '#bb1', '#bb2', '#bb3'].forEach(s => $(s).classList.remove('show'));
  lastCap = ''; $('#ctlcap').textContent = '';
  if (S.scene === 'control' && prev === 'you' && !ctlDone && !RM) lock(sec);
  if (S.scene === 'you' && replay) { replay = false; introT = t; S.intro = false; $('#youcap').classList.remove('in'); }
  if (S.scene === 'future') { S.pins = []; VIS.forEach(v => { v.sx = W * (0.2 + rnd() * 0.6); v.sy = H * (0.82 + rnd() * 0.1); }); }
}
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
const scramble = s => s.replace(/[A-Za-z]/g, c => Math.random() < .5 ? String.fromCharCode(97 + Math.floor(Math.random() * 26)) : c);

function cursor(x, y, col, label, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 19); ctx.lineTo(5, 14.5); ctx.lineTo(8.5, 22); ctx.lineTo(11.6, 20.6); ctx.lineTo(8.2, 13.4); ctx.lineTo(14.5, 13.4); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = '#050608'; ctx.stroke();
  if (label) {
    ctx.font = '12px ' + MONO;
    const w = ctx.measureText(label).width + 14;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(14, 22, w, 22, 6); ctx.fill();
    ctx.fillStyle = '#050608'; ctx.fillText(label, 21, 37);
  }
  ctx.restore();
}

function orbitTargets(g, w, t) {
  const A = lerpArr(D.already, w) * 10, L = A + lerpArr(D.likely, w) * 10;
  for (const d of dots) {
    const cat = d.rank < A ? 0 : d.rank < L ? 1 : 2;
    const yrs = cat === 0 ? .15 + d.fy * .55 : cat === 1 ? 1 + d.fx * 19 : 21.6 + d.fx * 5.4;
    const r = rOf(g, yrs), a = d.ph + t * (RM ? 0 : cat === 0 ? .16 : .07 / (1 + yrs * .06));
    d.tx = g.cx + Math.cos(a) * r; d.ty = g.cy + Math.sin(a) * r * g.tilt; d.z = Math.sin(a);
    d.col = cat === 0 ? 'b' : cat === 1 ? 'w' : 'g'; d.ta = cat === 0 ? (d.z < 0 ? .55 : 1) : cat === 1 ? (d.z < 0 ? .45 : .85) : .7; d.tr = cat === 0 ? 1.8 : 1.3;
  }
}
function lerpArr(arr, w) { const a = Math.floor(w), b = Math.min(arr.length - 1, a + 1); return arr[a] + (arr[b] - arr[a]) * (w - a); }

function drawOrbitBack(g, w, alpha) {
  ctx.lineWidth = 1; ctx.font = '10px ' + MONO;
  [[5, '2031'], [10, '2036'], [15, '2041'], [20, '2046']].forEach(([y, l]) => {
    if (!desk && y !== 20 && y !== 10) return;
    const r = rOf(g, y);
    ctx.strokeStyle = `rgba(232,235,241,${.1 * alpha})`; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, r, r * g.tilt, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(140,147,161,${.9 * alpha})`; ctx.fillText(l, g.cx + r + 8, g.cy + 3);
  });
  const rb = rOf(g, 20.8), both = Math.round(lerpArr(D.already, w) + lerpArr(D.likely, w));
  ctx.setLineDash([2, 5]); ctx.strokeStyle = `rgba(217,244,95,${.55 * alpha})`;
  ctx.beginPath(); ctx.ellipse(g.cx, g.cy, rb, rb * g.tilt, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center'; ctx.fillStyle = `rgba(217,244,95,${.9 * alpha})`;
  ctx.fillText(`ALREADY + LIKELY · ${both}%`, g.cx, g.cy - rb * g.tilt - 10);
  ctx.textAlign = 'left';
}
function drawSphere(g, alpha) {
  const R = g.R0 * 1.05;
  const h = ctx.createRadialGradient(g.cx, g.cy, R * .8, g.cx, g.cy, R * 4);
  h.addColorStop(0, `rgba(74,99,255,${.35 * alpha})`); h.addColorStop(1, 'rgba(74,99,255,0)');
  ctx.fillStyle = h; ctx.beginPath(); ctx.arc(g.cx, g.cy, R * 4, 0, TAU); ctx.fill();
  const s = ctx.createRadialGradient(g.cx - R * .35, g.cy - R * .4, R * .1, g.cx, g.cy, R);
  s.addColorStop(0, `rgba(235,238,245,${alpha})`); s.addColorStop(.6, `rgba(120,126,140,${alpha})`); s.addColorStop(1, `rgba(30,33,40,${alpha})`);
  ctx.fillStyle = s; ctx.beginPath(); ctx.arc(g.cx, g.cy, R, 0, TAU); ctx.fill();
  ctx.font = '10px ' + MONO; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(232,235,241,${.9 * alpha})`;
  ctx.fillText('NOW · 2026', g.cx, g.cy + R + 16); ctx.textAlign = 'left';
}

function drawDot(d) {
  if (d.a < .01) return;
  if (d.col === 'b') { const z = d.r * 6; ctx.globalAlpha = d.a; ctx.drawImage(spr, d.x - z / 2, d.y - z / 2, z, z); ctx.globalAlpha = 1; return; }
  ctx.fillStyle = d.col === 'b2' ? `rgba(169,184,255,${d.a})` : d.col === 'g' ? `rgba(140,147,161,${d.a * .5})` : `rgba(232,235,241,${d.a})`;
  ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
}

let introT = null, replay = false;
function frame(now) {
  const t = now / 1000;
  if (introT === null && document.visibilityState === 'visible') introT = t;
  let act = secs[0];
  for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= H * .5 && r.bottom > H * .5) { act = s; const span = r.height - H; S.p = span > 0 ? clamp(-r.top / span, 0, 1) : 0; break; } }
  if (act.dataset.scene !== S.scene) enter(act, t);
  if (locked && Math.abs(scrollY - lockY) > 1) scrollTo(0, lockY);
  const el = RM ? 99 : t - S.te;
  const sc = S.scene;
  let yx = you.x, yy = you.y, yr = 4.5, ghost = null, orbit = null, ow = 0, fast = false, wrap = false;

  if (sc === 'you') {
    const e0 = RM || introT === null ? 9 : t - introT;
    const big = Math.min(W, H) * .34;
    if (e0 < 1.3) { yx = W / 2; yy = H * .45; yr = big * (1 + .025 * Math.sin(t * 3)); you.x = yx; you.y = yy; you.r = yr; }
    else if (e0 < 3.1) { yx = W / 2; yy = H * .45; yr = lerp(big, 7, ease((e0 - 1.3) / 1.8) ** .7); you.x = yx; you.y = yy; you.r = yr; }
    else { [yx, yy] = follow(W / 2, H * .42 + Math.sin(t * 1.4) * 6); yr = 7; fast = e0 > 3.8; }
    const capIn = RM || (introT !== null && t - introT > 3.4);
    if (capIn !== S.intro) { S.intro = capIn; $('#youcap').classList.toggle('in', capIn); }
    for (const d of dots) { d.tx = you.x; d.ty = you.y; d.ta = 0; d.tr = 1.3; d.col = 'w'; }
  } else if (sc === 'control') {
    if (el < .8 && !RM) { [yx, yy] = follow(W / 2, H * .42); fast = true; }
    else {
      const b = RM ? 1 : ease((el - .8) / 1.1);
      const ax = W * (.5 + .3 * Math.sin(el * .8 + .6)), ay = H * (.4 + .18 * Math.sin(el * 1.25));
      const [sx, sy] = follow(W / 2, H * .42);
      ghost = [lerp(sx, ax, b), lerp(sy, ay, b)]; yx = ghost[0] + 4; yy = ghost[1] - 10; fast = true;
    }
    document.body.classList.toggle('ghosting', !!ghost && S.mouse && !RM);
    const n = RM ? N : el < 2.8 ? 0 : Math.floor(N * ease((el - 2.8) / 4.2));
    for (const d of dots) {
      if (d.rank < n) { const f = field(d, t); d.tx = f[0]; d.ty = f[1]; d.ta = .7; } else { d.tx = you.x; d.ty = you.y; d.ta = 0; }
      d.tr = 1.3; d.col = 'w';
    }
    let cap = ''; for (const c of CTL) if (el >= c[0]) cap = c[1];
    if (cap !== lastCap) { lastCap = cap; $('#ctlcap').textContent = cap; }
    let log = '';
    if (el > 1) log += '> pointer: taken over\n';
    if (el > 2.8) log += `> copying you… ${Math.max(1, n)} / 1000\n`;
    if (el > 7.2) log += '> done. nobody asked.\n';
    if (el > 8.4) log += '> scrolling: returned to you';
    setText($('#ctllog'), log);
    if (locked && el > 8.4) unlock();
    if (el > 1 && el < 2.6) { scrambling = true; actEl.textContent = scramble(ACTS[1]); } else if (scrambling) { scrambling = false; actEl.textContent = ACTS[1]; }
  } else if (sc === 'db') {
    const g = dbBox(), units = 49 + 4 * 1.5, dx = (g.x1 - g.x0) / units, dy = (g.y1 - g.y0) / 19;
    const wipe = el < 2.4 ? -1 : g.x0 + (el - 2.4) / 1.8 * (g.x1 - g.x0 + 40);
    let left = 0;
    for (const d of dots) {
      const row = Math.floor(d.rank / 50), col = d.rank % 50;
      const x = g.x0 + (col + Math.floor(col / 10) * 1.5) * dx, y = g.y0 + row * dy;
      d.tr = Math.min(2.4, dx * .3); d.col = row === 0 ? 'b2' : 'w'; d.tx = x;
      if (wipe >= x) { d.ty = H + 40 + d.fy * 80; d.ta = 0; } else { d.ty = y; d.ta = .75; left++; }
    }
    [yx, yy] = follow(g.x1 - 20, g.y0 - 30); fast = true;
    if (el > 4.4) $('#db2').classList.add('show');
    setText($('#dblog'), wipe < 0 ? '> code freeze active\n> 1,206 executives · 1,196 companies' : left > 0 ? `> deleting… ${Math.round(left * 1.206).toLocaleString('en')} records left` : '> 0 records left');
  } else if (sc === 'inbox') {
    const g = ibBox(), dx = (g.x1 - g.x0) / 19, dy = (g.y1 - g.y0) / 11;
    const gone = el < 1.8 ? 0 : Math.min(205, Math.floor((el - 1.8) * 48));
    for (const d of dots) {
      if (d.rank >= 240) { d.ta = 0; continue; }
      const row = Math.floor(d.rank / 20), col = d.rank % 20, key = (d.rank * 97) % 240;
      d.tr = Math.min(3.4, dx * .2); d.col = 'w'; d.tx = g.x0 + col * dx;
      if (key < gone) { d.ty = g.y0 + row * dy + 24; d.ta = 0; } else { d.ty = g.y0 + row * dy; d.ta = .8; }
    }
    [yx, yy] = follow(g.x1 + 24, g.y0); fast = true;
    if (el > 2.4) $('#bb1').classList.add('show');
    if (el > 3.4) $('#bb2').classList.add('show');
    if (el > 4.4) $('#bb3').classList.add('show');
    if (el > 6.4) $('#ib2').classList.add('show');
    setText($('#iblog'), el < 1.8 ? '> agent: reading inbox…' : gone < 205 ? `> agent: cleaning inbox\n> deleted ${gone} emails` : '> stopped at the computer\n> 200+ emails deleted');
  } else if (sc === 'tracker') {
    const g = desk ? { x0: W * .2, x1: W * .8, y0: H * .48, y1: H * .88 } : { x0: W * .08, x1: W * .92, y0: H * .53, y1: H * .86 };
    const dx = (g.x1 - g.x0) / 39, dy = (g.y1 - g.y0) / 24;
    for (const d of dots) { d.tx = g.x0 + (d.rank % 40) * dx; d.ty = g.y0 + Math.floor(d.rank / 40) * dy; d.ta = .75; d.tr = Math.min(2.2, dx * .28); d.col = 'w'; }
    [yx, yy] = follow(g.x1 + dx * 2, g.y1); fast = true;
  } else if (sc === 'ask') {
    const g = orbitGeo();
    if (!S.ans) { for (const d of dots) { const f = field(d, t); d.tx = f[0]; d.ty = f[1]; d.ta = .28; d.tr = 1.3; d.col = 'w'; } yx = g.cx; yy = g.cy; yr = 7; }
    else { orbit = g; ow = 0; orbitTargets(g, 0, t); const r = rOf(g, ANSY[S.ans]), a = -.75 + t * .05; yx = g.cx + Math.cos(a) * r; yy = g.cy + Math.sin(a) * r * g.tilt; }
  } else if (sc === 'waves') {
    const g = waveGeo(), cur = Math.min(7, Math.floor(S.p * 8.6));
    for (const d of dots) {
      if (d.rank >= 800) { d.ta = 0; continue; }
      const c = d.rank % 8, k = Math.floor(d.rank / 8), A = D.already[c], L = A + D.likely[c];
      d.tx = colX(g, c) + (k % 5 + .5) * g.s; d.ty = g.yb - (Math.floor(k / 5) + .5) * g.s; d.tr = g.s * .3;
      if (c > cur) { d.ta = .16; d.col = 'w'; } else { d.col = k < A ? 'b' : k < L ? 'w' : 'g'; d.ta = 1; }
    }
    const A = D.already[cur], L = D.likely[cur], grp = S.ans || 'l';
    const v = grp === 'a' ? A / 2 : grp === 'l' ? A + L / 2 : A + L + (100 - A - L) / 2;
    yx = colX(g, cur) - g.s * 1.4; yy = g.yb - v / 5 * g.s;
    const lab = $('#wlab');
    lab.style.left = clamp(colX(g, cur) + 2.5 * g.s, 50, W - 50) + 'px';
    lab.style.top = (g.yb - 20 * g.s - 10) + 'px';
    setText($('#wnum'), A + '%'); setText($('#wdate'), D.dates[cur]);
    S.wg = { g, cur };
  } else if (sc === 'agency') {
    const bx = W / 2, by = H * (desk ? .56 : .54), y0 = by - H * .15, y1 = by + H * .15, span = W + 80, tt = RM ? 0 : t;
    const sx = (d, sp) => ((d.fx * span + tt * sp * (.7 + d.fy * .6)) % span) - 40;
    const ring = k => (desk ? 80 : 62) + Math.sqrt(k) * (desk ? 6 : 4.5);
    for (const d of dots) {
      const grp = d.rank < 160 ? 's' : d.rank < 830 ? 'c' : 'r';
      const yy0 = y0 + d.fy * (y1 - y0) + Math.sin(tt * .8 + d.ph) * 6;
      if (!S.pressed) { d.tx = sx(d, 45); d.ty = yy0; d.ta = .6; d.tr = 1.6; d.col = 'w'; }
      else if (grp === 'c') { d.tx = sx(d, 110); d.ty = yy0; d.ta = .95; d.tr = 1.7; d.col = 'b'; }
      else if (grp === 'r') { d.tx = sx(d, 22); d.ty = yy0; d.ta = .45; d.tr = 1.4; d.col = 'g'; }
      else { const a = d.rank * 2.399963, rr = ring(d.rank); d.tx = bx + Math.cos(a) * rr; d.ty = by + Math.sin(a) * rr * .8; d.ta = 1; d.tr = 2; d.col = 'w'; }
    }
    wrap = el > 2;
    if (S.ag === 'stop') { const a = -1.1, rr = ring(175); yx = bx + Math.cos(a) * rr; yy = by + Math.sin(a) * rr * .8; }
    else if (S.ag === 'go') { yx = ((tt * 110) % span) - 40; yy = by + H * .06; fast = true; }
    else { [yx, yy] = follow(bx, by - H * .22); fast = true; }
  } else if (sc === 'future') {
    for (const d of dots) { const f = field(d, t); d.tx = f[0]; d.ty = f[1]; d.ta = .08; d.tr = 1.2; d.col = 'w'; }
    const tl = timeline(); yx = yearX(tl, S.year); yy = tl.y;
  } else if (sc === 'end') {
    const g = orbitGeo(); g.cy = H * .9; orbit = g; ow = 7; orbitTargets(g, 7, t); for (const d of dots) d.ta *= .35;
    [yx, yy] = follow(g.cx + rOf(g, ANSY[S.ans || 'a']), g.cy); fast = true;
  }

  /* ---------- move ---------- */
  const k = RM ? 1 : .075;
  const yk = RM ? 1 : fast ? .2 : .08;
  you.x += (yx - you.x) * yk; you.y += (yy - you.y) * yk; you.r += (yr - you.r) * (RM ? 1 : .25);
  S.oa += ((orbit ? (sc === 'end' ? .35 : 1) : 0) - S.oa) * (RM ? 1 : .05);
  if (wrap && Math.abs(yx - you.x) > W * .5) you.x = yx;
  for (const d of dots) { if (wrap && Math.abs(d.tx - d.x) > W * .5) d.x = d.tx; d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; d.a += (d.ta - d.a) * (RM ? 1 : .08); d.r += (d.tr - d.r) * .1; }

  /* ---------- draw ---------- */
  ctx.clearRect(0, 0, W, H);
  if (orbit) {
    drawOrbitBack(orbit, ow, S.oa);
    for (const d of dots) if (d.z < 0) drawDot(d);
    drawSphere(orbit, S.oa);
    for (const d of dots) if (d.z >= 0) drawDot(d);
  } else {
    for (const d of dots) { d.z = 1; drawDot(d); }
  }

  ctx.font = '12px ' + MONO;
  if (sc === 'waves' && S.wg) {
    const { g, cur } = S.wg, cx = c => colX(g, c) + 2.5 * g.s, y = v => g.yb - v / 5 * g.s;
    const line = (f, col, dash, w) => { ctx.setLineDash(dash); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); for (let c = 0; c <= cur; c++) c ? ctx.lineTo(cx(c), y(f(c))) : ctx.moveTo(cx(c), y(f(c))); ctx.stroke(); ctx.setLineDash([]); };
    if (cur > 0) { line(c => D.already[c] + D.likely[c], 'rgba(217,244,95,.9)', [3, 5], 1.4); line(c => D.already[c], 'rgba(169,184,255,1)', [], 2); }
    ctx.textAlign = 'center';
    D.dates.forEach((s, c) => { if (!desk && c !== 0 && c !== 7 && c !== cur) return; ctx.fillStyle = c === cur ? '#e8ebf1' : c <= cur ? '#8c93a1' : '#3a404c'; ctx.fillText(s.toUpperCase(), cx(c), g.yb + 22); });
    ctx.textAlign = 'left';
  }
  if (sc === 'future') {
    const tl = timeline();
    ctx.strokeStyle = 'rgba(232,235,241,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tl.x0, tl.y); ctx.lineTo(tl.x1, tl.y); ctx.stroke();
    ctx.textAlign = 'center';
    [2026, 2031, 2036, 2041, 2046].forEach(y => { if (!desk && (y === 2031 || y === 2041)) return; const x = yearX(tl, y); ctx.fillStyle = 'rgba(232,235,241,.35)'; ctx.fillRect(x - .5, tl.y - 5, 1, 10); ctx.fillStyle = '#8c93a1'; ctx.fillText(y === 2026 ? 'NOW' : String(y), x, tl.y + 26); });
    S.pins.forEach((p, i) => { const x = yearX(tl, p.y), ly = tl.y - 42 - (i % 2) * 14; ctx.strokeStyle = p.c; ctx.beginPath(); ctx.moveTo(x, tl.y); ctx.lineTo(x, tl.y - 30); ctx.stroke(); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, tl.y - 30, 4, 0, TAU); ctx.fill(); ctx.fillText(String(p.y), x, ly); });
    ctx.textAlign = 'left';
    for (const v of VIS) {
      const u = (el - v.t) / 2.6; if (u < 0) continue;
      const tx = yearX(tl, v.y), ty = tl.y - 30, wx = yearX(tl, clamp(v.y + v.off, 2026, 2046));
      let x, y, a = 1;
      if (u < .6) { const e = ease(u / .6); x = lerp(v.sx, wx, e) + Math.sin(u * 9) * 6; y = lerp(v.sy, ty - 30, e); }
      else if (u < 1) { const e = ease((u - .6) / .4); x = lerp(wx, tx, e); y = lerp(ty - 30, ty, e); }
      else { if (!S.pins.includes(v)) S.pins.push(v); const e = ease(u - 1); x = tx + e * 60; y = ty - e * 70; a = 1 - e; }
      if (a > .02) cursor(x, y, v.c, a > .6 ? v.n : null, a);
    }
  }

  /* ---------- the visitor's dot ---------- */
  if (you.r > 14) {
    const hg = ctx.createRadialGradient(you.x, you.y, you.r * .6, you.x, you.y, you.r * 1.8);
    hg.addColorStop(0, 'rgba(217,244,95,.25)'); hg.addColorStop(1, 'rgba(217,244,95,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(you.x, you.y, you.r * 1.8, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(217,244,95,.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(you.x, you.y, you.r * 2.2 + (RM ? 0 : Math.sin(t * 2.6) * 2), 0, TAU); ctx.stroke();
  }
  ctx.fillStyle = '#d9f45f'; ctx.beginPath(); ctx.arc(you.x, you.y, you.r, 0, TAU); ctx.fill();
  const labelled = (sc === 'ask' && S.ans) || sc === 'waves' || (sc === 'agency' && S.ag) || sc === 'future';
  if (labelled) { ctx.font = '12px ' + MONO; ctx.fillStyle = '#d9f45f'; ctx.textAlign = sc === 'waves' ? 'right' : 'left'; ctx.fillText(sc === 'future' ? 'YOU · ' + S.year : 'YOU', you.x + (sc === 'waves' ? -12 : 12), you.y - 10); ctx.textAlign = 'left'; }
  if (ghost && !RM) {
    if (el > 3 && (el % 2.3) < .5) { const q = (el % 2.3) / .5; ctx.strokeStyle = `rgba(232,235,241,${1 - q})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ghost[0], ghost[1], 6 + q * 22, 0, TAU); ctx.stroke(); }
    cursor(ghost[0], ghost[1], '#e8ebf1', null, 1);
  }

  const m = document.documentElement.scrollHeight - H; $('#bar').style.width = (m > 0 ? scrollY / m * 100 : 0) + '%';
  requestAnimationFrame(frame);
}

/* ---------- inputs ---------- */
function radio(group, attr, cb) {
  const bs = [...document.querySelectorAll(group + ' button')];
  bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); cb(b.dataset[attr]); }));
}
radio('#ask .opts', 'a', v => { S.ans = v; $('#placed').textContent = 'In June, 28% of Americans answered “already happening”. Your dot is in the orbit now: the centre is today, the outer ring is 2046.'; });
radio('#agency .opts', 'g', v => { S.ag = v; });
$('#stopbtn').addEventListener('click', () => { S.pressed = true; $('#stopbtn').setAttribute('aria-pressed', 'true'); $('#agres').classList.add('show'); });
const pills = [...document.querySelectorAll('#pills .pill')];
const picked = () => pills.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim().toLowerCase());
pills.forEach(b => b.addEventListener('click', () => {
  b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  $('#share').hidden = picked().length === 0; $('#sharefb').textContent = '';
}));
$('#share').addEventListener('click', async () => {
  const list = picked(), say = list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0];
  const url = /^https?:/.test(location.href) ? location.href.split('#')[0] : '';
  const text = `The future arrived early. For 43% of Americans, AI doing things nobody intended is already happening. I still want a say in ${say}. What about you?`;
  const fb = $('#sharefb');
  try { if (navigator.share) { await navigator.share({ title: '20 Years From Now', text, url: url || undefined }); fb.textContent = 'Shared'; return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url ? text + ' ' + url : text); fb.textContent = 'Copied. Paste it wherever you want to share it.'; }
  catch (e) { fb.textContent = text; }
});
const year = $('#year');
year.addEventListener('input', () => { S.year = +year.value; $('#youyear').textContent = S.year === 2026 ? 'now' : S.year; year.setAttribute('aria-valuetext', S.year); });
function placeYear() { const tl = timeline(); year.style.left = (tl.x0 - 12) + 'px'; year.style.width = (tl.x1 - tl.x0 + 24) + 'px'; year.style.top = tl.y + 'px'; }

/* ---------- nav + sources ---------- */
navBtns.forEach(b => b.addEventListener('click', () => { if (!locked) document.getElementById(b.dataset.go).scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); }));
const drawer = $('#drawer'), scrim = $('#scrim'); let back = null;
const open = () => { back = document.activeElement; drawer.classList.add('open'); scrim.classList.add('open'); $('#dclose').focus(); };
const close = () => { drawer.classList.remove('open'); scrim.classList.remove('open'); if (back) back.focus(); };
$('#srcbtn').addEventListener('click', open); $('#srcbtn2').addEventListener('click', open);
$('#dclose').addEventListener('click', close); scrim.addEventListener('click', close);
addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
$('#again').addEventListener('click', e => { e.preventDefault(); replay = true; scrollTo({ top: 0, behavior: 'auto' }); });

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('resize', resize); resize();
requestAnimationFrame(frame);
}
