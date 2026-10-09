import { GLIDE, FLAP, COIN, PAL, OUTLINE, THEME, drawSprite } from './sprites.js';

const STEP = 1000 / 60;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const cv = document.getElementById('g');
const ctx = cv.getContext('2d');

// Logical playfield follows the screen: portrait 216 wide, landscape 384 wide, height from the aspect ratio.
let W = 384, H = 216, GROUND = 192, CX = 70, scale = 1, SAT = 0, SAL = 0, SAB = 0;
function fit() {
  const iw = innerWidth, ih = innerHeight, portrait = ih > iw;
  W = portrait ? 216 : 384; CX = portrait ? 56 : 70;
  H = portrait ? Math.min(480, Math.max(216, Math.round(216 * ih / iw))) : Math.min(216, Math.max(176, Math.round(384 * ih / iw)));
  GROUND = H - 24;
  const s = Math.min(iw / W, ih / H);
  scale = matchMedia('(pointer:coarse)').matches ? s : Math.floor(s) || s; // phones fill the screen, desktops keep integer pixels
  cv.width = W; cv.height = H; ctx.imageSmoothingEnabled = false;
  cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
  const sa = k => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sa' + k)) || 0) / scale;
  SAT = sa('t'); SAL = sa('l'); SAB = sa('b');
  if (state === 'play') { pairs.length = 0; y = Math.min(y, GROUND - 40); } // rotating mid-game: new field, no death
}

const rnd = (a, b) => a + Math.random() * (b - a);
const ls = { get: k => localStorage.getItem('condor.' + k), set: (k, v) => localStorage.setItem('condor.' + k, v) };

// ---- state ----
let state = 'title', mode = 'normal', t = 0, dist = 0, frame = 0;
let y, vy, flapT, invul, speed, score, coins, pairs, nth, flash, flashRGB, banner, bannerLost, wait = 0; // wait: seconds of ignored input
let best = +ls.get('best') || 0, letters, idx, top, mine;
addEventListener('resize', fit); fit();
const clouds = [[0, 32, 2, 8], [160, 20, 2, 5], [250, 56, 2, 11], [340, 24, 1, 14]].map(([x, y, s, v]) => ({ x: x % W, y, s, v }));

function startPlay() { // 'ready': hover with the world scrolling until the first tap, which becomes the first flap
  state = 'ready'; mode = 'normal';
  y = GROUND / 2 - 16; vy = 0; flapT = 0; invul = 0; speed = 2; score = 0; coins = 0; pairs = []; nth = 1; flash = 0; banner = 0;
}

// ---- mountains ----
function ridge(h, hw) { // half-width per row, from the base up; random walk on the base width, tapered so the tip never grows a needle
  const rows = []; let j = 0;
  for (let i = 0; i < h; i++) { j += rnd(-0.8, 0.8); rows.push(Math.max(1, Math.round((hw + j) * (h - i) / h))); }
  return rows;
}
function spawnPair(x) { // gap 92 for the first three pairs, then -2.5 per pair down to 64
  const gap = Math.round(Math.max(64, 92 - 2.5 * Math.max(0, nth++ - 3)) + rnd(0, 6)), hw = rnd(18, 32) | 0, prev = pairs[pairs.length - 1];
  const c0 = prev ? prev.gapY + prev.gap / 2 : y + 16; // the gap centre drifts <= 100 px per pair: tall portrait fields stay climbable
  const gapY = Math.max(16, Math.min(GROUND - 16 - gap, c0 + rnd(-100, 100) - gap / 2)) | 0;
  pairs.push({ x, gap, gapY, hw, bot: ridge(GROUND - gapY - gap, hw), top: ridge(gapY, hw), next: rnd(90, 155) | 0, coin: true, passed: false });
}
function drawMountain(th, x, rows, flip) {
  const h = rows.length;
  rows.forEach((w, i) => {
    const ry = flip ? i : GROUND - 1 - i, snow = i > h * 0.78;
    ctx.fillStyle = snow ? th.snow : th.rock; ctx.fillRect(x - w, ry, 2 * w, 1);
    ctx.fillStyle = snow ? th.snow2 : th.rockDark; ctx.fillRect(x + (w * 0.3 | 0), ry, w - (w * 0.3 | 0), 1);
    ctx.fillStyle = snow ? th.snow : th.rockLight; ctx.fillRect(x - w, ry, Math.max(1, w * 0.25 | 0), 1);
  });
}
const hitbox = () => ({ x: CX + 2, y: y + 10, w: 20, h: 14 });
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function hitsMountain(p, hb) {
  if (Math.abs(p.x - (hb.x + hb.w / 2)) > p.hw + 20) return false;
  const row = (w, ry) => w > 2 && overlap(hb, { x: p.x - w, y: ry, w: 2 * w, h: 1 }); // the 1-2 px tips are not lethal
  return p.bot.some((w, i) => row(w, GROUND - 1 - i)) || p.top.some((w, i) => row(w, i));
}

// ---- modes / flow ----
function enterUltra() {
  coins = 0; flashRGB = '255,255,255';
  if (mode === 'ultra') { flash = 0.15; return; }
  mode = 'ultra'; flash = 0.4; banner = 1.1; bannerLost = false;
}
function hitRock() {
  if (invul > 0) return;
  if (mode === 'ultra') { mode = 'normal'; coins = 0; invul = 1; banner = 0.8; bannerLost = true; flash = 0.25; flashRGB = '255,42,109'; } else gameOver();
}
function gameOver() { // fatal hit: flash, the condor drops with no input (<= 0.6 s), then endScreen()
  state = 'dead'; mode = 'normal'; banner = 0; flash = 0.15; flashRGB = '255,255,255'; wait = 0.6;
  if (score > best) { best = score; ls.set('best', best); }
}
function endScreen() {
  wait = 0.5;
  if (score === 0) return showTable(null);
  state = 'gameover'; letters = [...(ls.get('name') || 'AAA').padEnd(3, 'A')].slice(0, 3); idx = 0;
}
async function showTable(entry) { // top: undefined = loading, null = offline, array = data
  state = 'table'; top = undefined; mine = entry;
  try {
    const opts = { signal: AbortSignal.timeout(5000) };
    if (entry) Object.assign(opts, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    const r = await fetch('/api/scores', opts);
    top = r.ok ? await r.json() : null;
  } catch { top = null; }
}

// ---- simulation ----
function step() {
  t += 1 / 60; frame++;
  const adv = state === 'play' || state === 'ready' ? speed : 1;
  dist += adv;
  clouds.forEach(c => { c.x -= adv * 0.15 + c.v * 0.01; if (c.x < -60) c.x += W + 120; });
  if (flash > 0) flash -= 1 / 60;
  if (banner > 0) banner -= 1 / 60;
  if (invul > 0) invul -= 1 / 60;
  if (wait > 0) wait -= 1 / 60;
  if (state === 'ready') y = GROUND / 2 - 16 + Math.sin(t * 4) * 3;
  if (state === 'dead') {
    vy = Math.min(vy + 0.35, 8); y += vy;
    if (y + 24 >= GROUND) { y = GROUND - 24; vy = 0; wait = Math.min(wait, 0.1); }
    if (wait <= 0) endScreen();
  }
  if (state !== 'play') return;

  vy = Math.min(vy + 0.35, 8); y += vy;
  if (y < -8) { y = -8; vy = 0; }
  if (flapT > 0) flapT--;
  pairs.forEach(p => p.x -= speed);
  if (pairs.length && pairs[0].x < -60) pairs.shift();
  const last = pairs[pairs.length - 1];
  if (!last || last.x <= W + 40 - last.next) spawnPair(W + 40);

  const hb = hitbox();
  for (const p of pairs) {
    if (!p.passed && p.x + p.hw < CX) { p.passed = true; score += mode === 'ultra' ? 2 : 1; speed = Math.min(3.5, 2 + 0.1 * Math.floor(score / 10)); }
    if (p.coin && overlap(hb, { x: p.x - 6, y: p.gapY + p.gap / 2 - 6, w: 12, h: 12 })) { p.coin = false; if (++coins >= 5) enterUltra(); }
    if (hitsMountain(p, hb)) { hitRock(); if (state !== 'play') return; }
  }
  if (hb.y + hb.h >= GROUND) gameOver();
}

// ---- drawing (all coords truncated to whole pixels at draw time) ----
function circle(cx, cy, r, col, striped) {
  ctx.fillStyle = col;
  for (let dy = -r; dy <= r; dy++) {
    if (striped && dy > 0 && dy % 5 < 2) continue;
    const w = Math.floor(Math.sqrt(r * r - dy * dy)); ctx.fillRect(cx - w, cy + dy, 2 * w + 1, 1);
  }
}
function tri(col, x, h, hw) { ctx.fillStyle = col; for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round(hw * (h - i) / h)); ctx.fillRect(x - w, GROUND - 1 - i, 2 * w, 1); } }
function layer(col, period, hw, hmin, hvar, par) {
  const d = dist * par, k0 = Math.floor(d / period) - 1;
  for (let k = k0; k <= k0 + W / period + 2; k++) tri(col, (k * period - d) | 0, hmin + (((k * 37) % hvar) + hvar) % hvar, hw);
}
function drawCloud(th, x, yy, s) {
  [[0, 2, 5], [2, 1, 8], [5, 0, 6], [9, 1, 7], [4, 3, 9]].forEach(([bx, by, bw]) => { ctx.fillStyle = th.cloud; ctx.fillRect((x + bx * s) | 0, (yy + by * s) | 0, bw * s, 3 * s); });
  ctx.fillStyle = th.cloudShade; ctx.fillRect((x + 2 * s) | 0, (yy + 5 * s) | 0, 12 * s, s);
}
function drawBg(th, u) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky0); g.addColorStop(1, th.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const sx = W - 64;
  if (u) { circle(sx, GROUND - 32, 48, th.sun, true); circle(sx, GROUND - 32, 38, th.sunCore, true); }
  else {
    circle(sx, 48, 21, th.sun); circle(sx, 48, 15, th.sunCore); ctx.fillStyle = th.sun;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + t * 0.4, len = 4 + Math.sin(t * 3 + a) * 2;
      for (let r = 24; r < 27 + len; r++) ctx.fillRect(sx + Math.cos(ang) * r | 0, 48 + Math.sin(ang) * r | 0, 1, 1);
    }
  }
  layer(th.far2, 70, 55, 60, 50, 0.2); layer(th.far, 55, 45, 30, 35, 0.35);
  clouds.forEach(c => drawCloud(th, c.x, c.y + Math.sin(t + c.v) * 2, c.s));
  ctx.fillStyle = th.ground; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = th.groundDark;
  const o = dist % 20 | 0;
  if (u) { for (let x = -o; x < W; x += 20) ctx.fillRect(x, GROUND, 1, H - GROUND); for (let gy = GROUND; gy < H; gy += 7) ctx.fillRect(0, gy, W, 1); }
  else for (let x = -20 - o; x < W; x += 20) { ctx.fillRect(x, GROUND + 3, 5, 2); ctx.fillRect(x + 10, GROUND + 7, 5, 2); }
}
// ULTRA condor = outline + sprite pre-rendered once per frame/scale, then one shadowed drawImage per frame
const glowCache = new Map();
function glowFrame(rows, s) {
  const key = (rows === GLIDE ? 'g' : 'f') + s;
  if (!glowCache.has(key)) {
    const c = document.createElement('canvas'); c.width = c.height = 34 * s; const g = c.getContext('2d');
    [[2, 1], [0, 1], [1, 2], [1, 0]].forEach(([dx, dy]) => drawSprite(g, rows, OUTLINE, dx * s, dy * s, s));
    drawSprite(g, rows, PAL.ultra, s, s, s);
    glowCache.set(key, c);
  }
  return glowCache.get(key);
}
function drawCondor(th, x, yy, rows, s = 1) {
  if (mode !== 'ultra') return drawSprite(ctx, rows, PAL.normal, x, yy, s);
  ctx.save(); ctx.shadowColor = th.glow; ctx.shadowBlur = 12; ctx.drawImage(glowFrame(rows, s), x - s, yy - s); ctx.restore();
}
function text(s, x, yy, col, size = 8, align = 'center') {
  ctx.font = `${size}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(s, x, yy);
}
function dim() { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); }
const oy = () => (H - 216) / 2 | 0; // panels are laid out for 216 rows and centred vertically
function drawGameOver() {
  dim(); const o = oy();
  text('GAME OVER', W / 2, o + 30, '#ff2a6d', 16); text('PUNTOS ' + score, W / 2, o + 60, '#fff'); text('MEJOR  ' + best, W / 2, o + 74, '#ffd93b');
  text('TU NOMBRE', W / 2, o + 100, '#fff', 6);
  letters.forEach((ch, i) => { const x = W / 2 - 36 + i * 30, col = i === idx ? '#ffd93b' : '#fff'; ctx.fillStyle = col; ctx.fillRect(x - 10, o + 140, 22, 2); text(ch, x + 1, o + 118, col, 16); });
  text('TOCA ▲▼ PARA CAMBIAR', W / 2, o + 160, '#aaa', 6); text('SALTAR', W / 2, o + 176, '#aaa', 6);
}
function drawTable() {
  dim(); const o = oy();
  text('TOP CONDORES', W / 2, o + 16, '#ffd93b', 12);
  if (top === undefined) text('CARGANDO...', W / 2, o + 100, '#fff');
  else if (top === null) { text('SIN CONEXIÓN', W / 2, o + 90, '#ff2a6d'); text('MEJOR ' + best, W / 2, o + 110, '#fff'); }
  else {
    let hl = -1;
    top.forEach((e, i) => {
      const me = hl < 0 && mine && e.name === mine.name && e.score === mine.score; if (me) hl = i;
      const col = me ? '#00f0ff' : '#fff';
      text(String(i + 1).padStart(2, ' ') + '  ' + e.name, W / 2 - 70, o + 44 + i * 13, col, 8, 'left');
      text(String(e.score), W / 2 + 70, o + 44 + i * 13, col, 8, 'right');
    });
  }
  if (top !== undefined && t % 1 < 0.6) text('TOCA PARA VOLAR DE NUEVO', W / 2, o + 190, '#fff', 6);
}
function draw() {
  const u = mode === 'ultra', th = THEME[u ? 'ultra' : 'normal'];
  drawBg(th, u);
  if (state === 'title') {
    const o = oy();
    drawCondor(th, W / 2 - 48, (o + 40 + Math.sin(t * 2) * 6) | 0, (t % 1.2) < 0.15 ? FLAP : GLIDE, 3);
    text('CONDOR', W / 2, o + 130, '#fff', 16); ctx.fillRect(W / 2 - 27, o + 123, 5, 2); ctx.fillRect(W / 2 - 29, o + 125, 5, 2); // accent on the O
    text('DE LOS ANDES', W / 2, o + 150, '#ffd93b', 8);
    text('5 MONEDAS = ULTRA ANDES', W / 2, o + 166, '#fff', 6);
    if (t % 1 < 0.6) text('TOCA PARA VOLAR', W / 2, o + 182, '#fff', 6);
  } else {
    pairs.forEach(p => {
      const px = p.x | 0;
      drawMountain(th, px, p.bot, false); drawMountain(th, px, p.top, true);
      if (p.coin) drawSprite(ctx, COIN, PAL[u ? 'ultra' : 'normal'], px - 6, (p.gapY + p.gap / 2 - 6) | 0);
    });
    if (!(invul > 0 && (frame >> 2) & 1)) drawCondor(th, CX, y | 0, flapT > 0 ? FLAP : GLIDE);
    const hx = 8 + SAL | 0, hy = 8 + SAT | 0;
    text('PUNTOS ' + score, hx, hy, th.hud, 8, 'left');
    for (let i = 0; i < 5; i++) { ctx.globalAlpha = i < coins ? 1 : 0.3; drawSprite(ctx, COIN, PAL[u ? 'ultra' : 'normal'], hx + i * 14, hy + 13); }
    ctx.globalAlpha = 1; text('ULTRA', hx + 72, hy + 16, th.hud, 6, 'left');
    if (u) text('ULTRA ANDES', hx, hy + 30, '#ff2a6d', 8, 'left');
    if (state === 'ready') {
      if (t % 1 < 0.6) text('TOCA PARA VOLAR', W / 2, GROUND / 2 + 40, '#fff', 8);
      text('5 MONEDAS = ULTRA ANDES', W / 2, GROUND / 2 + 56, '#ffd93b', 6);
    }
  }
  if (u) { ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let sy = 0; sy < H; sy += 2) ctx.fillRect(0, sy, W, 1); }
  if (flash > 0) { ctx.fillStyle = `rgba(${flashRGB},${flash / 0.4})`; ctx.fillRect(0, 0, W, H); }
  if (banner > 0 && bannerLost) text('ULTRA PERDIDO', W / 2, H / 2 - 6, '#ff2a6d', 12);
  else if (banner > 0) { const k = Math.min(1, (1.1 - banner) / 0.25); text('ULTRA ANDES', W / 2, (H / 2 - 8 - (1 - k) * 20) | 0, '#ff2a6d', 16); text('x2 PUNTOS', W / 2, H / 2 + 14, '#00f0ff', 8); }
  if (state === 'gameover') drawGameOver(); else if (state === 'table') drawTable();
}

// ---- input (dispatched per state) ----
function cycle(d) { letters[idx] = LETTERS[(LETTERS.indexOf(letters[idx]) + d + LETTERS.length) % LETTERS.length]; }
function advance() { if (++idx < 3) return; const name = letters.join(''); ls.set('name', name); showTable({ name, score }); }
function tap(gx, gy) {
  if (wait > 0) return;
  if (state === 'title') startPlay();
  else if (state === 'table') { if (top !== undefined) startPlay(); }
  else if (state === 'ready' || state === 'play') {
    if (state === 'ready') { state = 'play'; spawnPair(Math.max(W + 40, CX + 60 + 120 * speed)); } // first pair is >= 2 s away
    vy = -5.2; flapT = 7;
  }
  else if (state === 'gameover') {
    const lx = W / 2 - 36 + idx * 30 + 1, o = oy();
    if (gy > o + 170 && Math.abs(gx - W / 2) < 24) return showTable(null);
    if (Math.abs(gx - lx) < 12 && gy > o + 110 && gy < o + 142) return cycle(gy < o + 126 ? 1 : -1);
    advance();
  }
}
addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); tap((e.clientX - r.x) / r.width * W, (e.clientY - r.y) / r.height * H); });
addEventListener('keydown', e => {
  if (e.repeat || !['Space', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.code)) return;
  e.preventDefault();
  if (wait > 0) return;
  if (state === 'gameover') {
    if (e.code === 'ArrowUp') cycle(1); else if (e.code === 'ArrowDown') cycle(-1);
    else if (e.code === 'Escape') showTable(null); else advance();
  } else if (e.code !== 'ArrowDown' && e.code !== 'Escape') tap(W / 2, 0);
});

// ---- loop: fixed 60 Hz steps, capped at ~6 per frame ----
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(now - last, 100); last = now;
  while (acc >= STEP) { step(); acc -= STEP; }
  draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// QA hook: only when the page is opened with #debug
if (location.hash === '#debug') {
  window.condor = { startPlay, enterUltra, gameOver };
  const peek = { state: () => state, mode: () => mode, score: () => score, y: () => y, vy: () => vy, invul: () => invul, flash: () => flash, banner: () => banner, coins: () => coins,
    pairs: () => pairs, top: () => top, letters: () => letters, idx: () => idx, best: () => best, frame: () => frame, W: () => W, H: () => H };
  for (const k in peek) Object.defineProperty(window.condor, k, { get: peek[k] });
}
