# Cóndor de los Andes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Flappy-style pixel game (condor, procedural mountains, ULTRA ANDES cyberpunk mode, global top-10) on Cloudflare Pages.

**Architecture:** Vanilla ES modules on one `<canvas>` at 384×216 integer-scaled. `sprites.js` holds letter-coded sprites and both palettes; `game.js` holds the fixed-step loop, state machine and rendering; `functions/api/scores.js` is a Cloudflare Pages Function over one KV key. Spec: `docs/superpowers/specs/2026-10-09-condor-andes-design.md`.

**Tech Stack:** HTML/JS/canvas, Node ≥ 20 (`node --test`), Wrangler via `npx wrangler@latest`, Cloudflare Pages + KV, GitHub (`gh`).

---

## File structure

```
index.html                  canvas, font link, module script
sprites.js                  GLIDE, FLAP, COIN, PAL, OUTLINE, THEME, drawSprite
sprites.test.js             shape + palette coverage check
game.js                     loop, physics, mountains, modes, screens, input
functions/api/scores.js     validate, mergeTop, onRequestGet, onRequestPost
functions/api/scores.test.js
package.json                {"type":"module"}, test script
wrangler.toml               pages_build_output_dir ".", KV binding SCORES
README.md
```

### Task 1: Scaffold

**Files:** Create `package.json`, `index.html`, `wrangler.toml`, `README.md`

- [ ] **Step 1: package.json**

```json
{
  "name": "condor-andes",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test", "dev": "npx wrangler@latest pages dev", "deploy": "npx wrangler@latest pages deploy" }
}
```

- [ ] **Step 2: index.html**

```html
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Cóndor de los Andes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
<style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center;touch-action:none}
canvas{image-rendering:pixelated;image-rendering:crisp-edges}
</style>
</head>
<body>
<canvas id="g"></canvas>
<script type="module" src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: wrangler.toml** (KV id filled in Task 6)

```toml
name = "condor-andes"
compatibility_date = "2026-10-01"
pages_build_output_dir = "."

[[kv_namespaces]]
binding = "SCORES"
id = "REPLACE_ME"
```

- [ ] **Step 4: README.md**

```markdown
# Cóndor de los Andes

Flappy-style pixel game for Hack the Andes. Fly the condor through the mountains, grab 5 Inti coins to enter **ULTRA ANDES** mode (x2 score, cyberpunk Andes). Hit a mountain in ULTRA and you drop back to normal; hit one in normal and it's game over.

- Tap / Space / ↑ to flap
- `npm test` — unit checks
- `npm run dev` — local server with local KV
- `npm run deploy` — Cloudflare Pages
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold pages project"
```

### Task 2: Sprites and palettes

**Files:** Create `sprites.js`, `sprites.test.js`

- [ ] **Step 1: Write the failing test** `sprites.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLIDE, FLAP, COIN, PAL, OUTLINE, THEME } from './sprites.js';

test('sprites are rectangular and palettes cover every char', () => {
  for (const [name, rows] of Object.entries({ GLIDE, FLAP, COIN })) {
    assert.ok(rows.length > 0, name);
    assert.ok(rows.every(r => r.length === rows[0].length), name + ' ragged');
    for (const ch of new Set(rows.join('').replace(/\./g, ''))) {
      assert.ok(PAL.normal[ch] && PAL.ultra[ch] && OUTLINE[ch], `${name}: no colour for '${ch}'`);
    }
  }
  assert.equal(GLIDE.length, 32); assert.equal(GLIDE[0].length, 32);
  assert.equal(FLAP.length, 32); assert.equal(FLAP[0].length, 32);
  assert.deepEqual(Object.keys(THEME.normal).sort(), Object.keys(THEME.ultra).sort());
});
```

- [ ] **Step 2: Run** `npm test` → FAIL (cannot find `./sprites.js`)

- [ ] **Step 3: Write `sprites.js`**

```js
// Letter-coded pixel art. '.' = transparent. Same letters, two palettes.
const B = '.'.repeat(32);
export const GLIDE = [
".........k......................","........kk..k...................","........kkk.kk.k................",".......kkkkkkkkk................",
".......kkwwkkkkk................","......kkkwwkkkk.................","......kkkwwwkkk.................",".....kkkkwwwkkkk................",
".....kkkkkwwwkkkk...............","....kkkkkkwwwwkkkk..............","....kkkkkkkwwwwkkkk.............","...kkkkkkkkkwwwkkkkk............",
"...kkkkkkkkkkwwkkkkkk.....wrrrr.","..kkkkkkkkkkkkkkkkkkkk....wrrprr","..kkkkkkkkkkkkkkkkkkkkk..wwrrerr",".kkkkkkkkkkkkkkkkkkkkkkkwwwrrrbb",
"kkkkkkkkkkkkkkkkkkkkkkkkwwwrrb..","kkkkggkkkkkkkkkkkkkkkkkkkwww....","kkkggggkkkkkkkkkkkkkkkkkkww.....","kkkgggggkkkkkkkkkkkkkkkkk.......",
".kkggggggkkkkkkkkkkkkkkk........","..kkgggggkkkkkkkkkkkkk..........","...kkkkkkkkkkkkkkkkk............",".....kkkkkkkkkkkkk..............",
".......kkkkkkkkk................",".........kkkkk..................",B,B,B,B,B,B];
export const FLAP = [B,B,B,B,B,B,B,B,B,B,B,B,
"..........................wrrrr.","..........................wrrprr",".........................wwrrerr","....kkkkkkkkkkkkkkkkkkkkwwwrrrbb",
"kkkkkkkkkkkkkkkkkkkkkkkkwwwrrb..","kkkkggkkkkkkkkkkkkkkkkkkkwww....","kkkggggkkkkkkkkkkkkkkkkkkww.....","kkkgggggkkkkkkkkkkkkkkkkk.......",
".kkggggggkkkkkkkkkkkkkkk........","..kkgggggkkkkkkkkkkkkk..........","...kkkkkkwwwkkkkkkkk............",".....kkkkkwwwkkkkk..............",
".......kkkkwwwkkk...............","........kkkkwwkk................","........kkkkwwkk................",".........kkkwwkk................",
".........kkkwwk.................","..........kkkk..................","..........kk.k..................","...........k...................."];
export const COIN = ["....yyyy....","..yyyyyyyy..",".yyyooooyyy.",".yyoooooyyy.","yyooyyyyooyy","yyooyyyyooyy","yyoooooooyyy","yyoooooooyyy",".yyoooooyyy.",".yyyooooyyy.","..yyyyyyyy..","....yyyy...."];

export const PAL = {
  normal: { k: '#1a1a1a', g: '#3d3d3d', w: '#f4f4f4', r: '#c0392b', p: '#e67e22', b: '#e8d8b0', e: '#ffffff', y: '#f2d16b', o: '#e0a020' },
  ultra:  { k: '#1a0533', g: '#3b0a6b', w: '#00f0ff', r: '#ff2a6d', p: '#ff9f1c', b: '#f5f500', e: '#ffffff', y: '#00f0ff', o: '#0a3a5a' },
};
export const OUTLINE = Object.fromEntries(Object.keys(PAL.normal).map(k => [k, '#00f0ff']));

export const THEME = {
  normal: { sky0: '#4aa3e0', sky1: '#b8e3f8', sun: '#ffd93b', sunCore: '#ffb703', far: '#7f93a8', far2: '#9fb3c8', cloud: '#ffffff', cloudShade: '#d6e8f5',
            ground: '#6b8e3a', groundDark: '#4e6b2a', rock: '#7a6a5c', rockDark: '#5c4e42', rockLight: '#8d7d6e', snow: '#ffffff', snow2: '#dde6ee', hud: '#ffffff', glow: '#00f0ff' },
  ultra:  { sky0: '#07010f', sky1: '#2a0a4a', sun: '#ff2a6d', sunCore: '#ff9f1c', far: '#160430', far2: '#24084a', cloud: '#ff2a6d', cloudShade: '#b0104a',
            ground: '#0d0221', groundDark: '#00f0ff', rock: '#1a0533', rockDark: '#0d0221', rockLight: '#3b0a6b', snow: '#ff2a6d', snow2: '#ff6fa0', hud: '#00f0ff', glow: '#00f0ff' },
};

export function drawSprite(ctx, rows, pal, x, y, s = 1) {
  rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) { const c = pal[row[rx]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + rx * s, y + ry * s, s, s); } } });
}
```

- [ ] **Step 4: Run** `npm test` → PASS (1 test)

- [ ] **Step 5: Commit** `git add sprites.js sprites.test.js && git commit -m "feat: sprites and palettes"`

### Task 3: Leaderboard function

**Files:** Create `functions/api/scores.js`, `functions/api/scores.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, mergeTop } from './scores.js';

test('validate cleans name and bounds score', () => {
  assert.deepEqual(validate({ name: 'rz-u!', score: 42 }), { name: 'RZU', score: 42 });
  assert.deepEqual(validate({ name: 'ROBERTO', score: 1 }), { name: 'ROB', score: 1 });
  assert.equal(validate({ name: '', score: 5 }), null);
  assert.equal(validate({ name: 'AAA', score: 0 }), null);
  assert.equal(validate({ name: 'AAA', score: 10000 }), null);
  assert.equal(validate({ name: 'AAA', score: 1.5 }), null);
  assert.equal(validate(null), null);
});

test('mergeTop keeps 10, sorted desc, ties keep insertion order', () => {
  const list = Array.from({ length: 10 }, (_, i) => ({ name: 'N' + i, score: 100 - i * 10 }));
  const out = mergeTop(list, { name: 'NEW', score: 95 });
  assert.equal(out.length, 10);
  assert.deepEqual(out[0], { name: 'N0', score: 100 });
  assert.deepEqual(out[1], { name: 'NEW', score: 95 });
  assert.equal(out.at(-1).score, 20);
  const tie = mergeTop([{ name: 'OLD', score: 50 }], { name: 'NEW', score: 50 });
  assert.deepEqual(tie.map(e => e.name), ['OLD', 'NEW']);
  assert.deepEqual(mergeTop([], { name: 'A', score: 1 }), [{ name: 'A', score: 1 }]);
});
```

- [ ] **Step 2: Run** `npm test` → FAIL (cannot find `./scores.js`)

- [ ] **Step 3: Write `functions/api/scores.js`**

```js
const KEY = 'top';

export function validate(b) {
  const name = String(b?.name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const score = b?.score;
  if (!name || !Number.isInteger(score) || score < 1 || score > 9999) return null;
  return { name, score };
}

// Array.prototype.sort is stable: equal scores keep insertion order (older first).
export const mergeTop = (list, entry) => [...list, entry].sort((a, b) => b.score - a.score).slice(0, 10);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }) {
  return json((await env.SCORES.get(KEY, 'json')) || []);
}

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const entry = validate(body);
  if (!entry) return json({ error: 'invalid' }, 400);
  const top = mergeTop((await env.SCORES.get(KEY, 'json')) || [], entry);
  await env.SCORES.put(KEY, JSON.stringify(top)); // ponytail: read-modify-write can race; Durable Object if it ever matters
  return json(top);
}
```

- [ ] **Step 4: Run** `npm test` → PASS (3 tests)

- [ ] **Step 5: Commit** `git add functions && git commit -m "feat: leaderboard pages function"`

### Task 4: Game

**Files:** Create `game.js`

- [ ] **Step 1: Write `game.js`**

```js
import { GLIDE, FLAP, COIN, PAL, OUTLINE, THEME, drawSprite } from './sprites.js';

const W = 384, H = 216, GROUND = 192, CX = 70, STEP = 1000 / 60;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const cv = document.getElementById('g');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fit() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
}
addEventListener('resize', fit); fit();

const rnd = (a, b) => a + Math.random() * (b - a);
const ls = { get: k => localStorage.getItem('condor.' + k), set: (k, v) => localStorage.setItem('condor.' + k, v) };

// ---- state ----
let state = 'title', mode = 'normal', t = 0, dist = 0, frame = 0;
let y, vy, flapT, invul, speed, score, coins, pairs, flash, banner;
let best = +ls.get('best') || 0, letters, idx, top, mine;
const clouds = [[0, 32, 2, 8], [160, 20, 2, 5], [250, 56, 2, 11], [340, 24, 1, 14]].map(([x, y, s, v]) => ({ x, y, s, v }));

function startPlay() {
  state = 'play'; mode = 'normal';
  y = 90; vy = 0; flapT = 0; invul = 0; speed = 2; score = 0; coins = 0; pairs = []; flash = 0; banner = 0;
}

// ---- mountains ----
function ridge(h, hw) { // half-width per row, from the base up; jagged random walk
  const rows = []; let j = 0;
  for (let i = 0; i < h; i++) { j += rnd(-0.8, 0.8); rows.push(Math.max(1, Math.round(hw * (h - i) / h) + (j | 0))); }
  return rows;
}
function spawnPair(x) {
  const gap = rnd(58, 74) | 0, gapY = rnd(16, GROUND - 16 - gap) | 0, hw = rnd(18, 32) | 0;
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
  const row = (w, ry) => overlap(hb, { x: p.x - w, y: ry, w: 2 * w, h: 1 });
  return p.bot.some((w, i) => row(w, GROUND - 1 - i)) || p.top.some((w, i) => row(w, i));
}

// ---- modes / flow ----
function enterUltra() {
  coins = 0;
  if (mode === 'ultra') { flash = 0.15; return; }
  mode = 'ultra'; flash = 0.4; banner = 1.1;
}
function hitRock() {
  if (invul > 0) return;
  if (mode === 'ultra') { mode = 'normal'; coins = 0; invul = 1; } else gameOver();
}
function gameOver() {
  state = 'gameover';
  if (score > best) { best = score; ls.set('best', best); }
  if (score === 0) return showTable(null);
  letters = [...(ls.get('name') || 'AAA').padEnd(3, 'A')].slice(0, 3); idx = 0;
}
async function showTable(entry) { // top: undefined = loading, null = offline, array = data
  state = 'table'; top = undefined; mine = entry;
  try {
    const r = await fetch('/api/scores', entry ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) } : undefined);
    top = r.ok ? await r.json() : null;
  } catch { top = null; }
}

// ---- simulation ----
function step() {
  t += 1 / 60; frame++;
  const adv = state === 'play' ? speed : 1;
  dist += adv;
  clouds.forEach(c => { c.x -= adv * 0.15 + c.v * 0.01; if (c.x < -60) c.x += W + 120; });
  if (flash > 0) flash -= 1 / 60;
  if (banner > 0) banner -= 1 / 60;
  if (invul > 0) invul -= 1 / 60;
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

// ---- drawing ----
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
  for (let k = k0; k <= k0 + W / period + 2; k++) tri(col, k * period - d, hmin + (((k * 37) % hvar) + hvar) % hvar, hw);
}
function drawCloud(th, x, yy, s) {
  [[0, 2, 5], [2, 1, 8], [5, 0, 6], [9, 1, 7], [4, 3, 9]].forEach(([bx, by, bw]) => { ctx.fillStyle = th.cloud; ctx.fillRect((x + bx * s) | 0, (yy + by * s) | 0, bw * s, 3 * s); });
  ctx.fillStyle = th.cloudShade; ctx.fillRect((x + 2 * s) | 0, (yy + 5 * s) | 0, 12 * s, s);
}
function drawBg(th, u) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky0); g.addColorStop(1, th.sky1);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (u) { circle(320, 160, 48, th.sun, true); circle(320, 160, 38, th.sunCore, true); }
  else {
    circle(320, 48, 21, th.sun); circle(320, 48, 15, th.sunCore); ctx.fillStyle = th.sun;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + t * 0.4, len = 4 + Math.sin(t * 3 + a) * 2;
      for (let r = 24; r < 27 + len; r++) ctx.fillRect(320 + Math.cos(ang) * r | 0, 48 + Math.sin(ang) * r | 0, 1, 1);
    }
  }
  layer(th.far2, 70, 55, 60, 50, 0.2); layer(th.far, 55, 45, 30, 35, 0.35);
  clouds.forEach(c => drawCloud(th, c.x, c.y + Math.sin(t + c.v) * 2, c.s));
  ctx.fillStyle = th.ground; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = th.groundDark;
  const o = dist % 20;
  if (u) { for (let x = -o; x < W; x += 20) ctx.fillRect(x, GROUND, 1, H - GROUND); for (let gy = GROUND; gy < H; gy += 7) ctx.fillRect(0, gy, W, 1); }
  else for (let x = -20 - o; x < W; x += 20) { ctx.fillRect(x, GROUND + 3, 5, 2); ctx.fillRect(x + 10, GROUND + 7, 5, 2); }
}
function drawCondor(th, x, yy, rows, s = 1) {
  if (mode !== 'ultra') return drawSprite(ctx, rows, PAL.normal, x, yy, s);
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => drawSprite(ctx, rows, OUTLINE, x + dx * s, yy + dy * s, s));
  ctx.save(); ctx.shadowColor = th.glow; ctx.shadowBlur = 12; drawSprite(ctx, rows, PAL.ultra, x, yy, s); ctx.restore();
}
function text(s, x, yy, col, size = 8, align = 'center') {
  ctx.font = `${size}px "Press Start 2P", monospace`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(s, x, yy);
}
function dim() { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); }
function drawGameOver() {
  dim();
  text('GAME OVER', W / 2, 30, '#ff2a6d', 16); text('SCORE  ' + score, W / 2, 60, '#fff'); text('BEST   ' + best, W / 2, 74, '#ffd93b');
  text('ENTER YOUR NAME', W / 2, 100, '#fff', 6);
  letters.forEach((ch, i) => { const x = W / 2 - 36 + i * 30, col = i === idx ? '#ffd93b' : '#fff'; ctx.fillStyle = col; ctx.fillRect(x - 10, 140, 22, 2); text(ch, x + 1, 118, col, 16); });
  text('UP/DOWN LETTER   TAP NEXT', W / 2, 160, '#aaa', 6); text('SKIP', W / 2, 176, '#aaa', 6);
}
function drawTable() {
  dim();
  text('TOP CONDORES', W / 2, 16, '#ffd93b', 12);
  if (top === undefined) text('LOADING...', W / 2, 100, '#fff');
  else if (top === null) { text('OFFLINE', W / 2, 90, '#ff2a6d'); text('BEST ' + best, W / 2, 110, '#fff'); }
  else {
    let hl = -1;
    top.forEach((e, i) => {
      const me = hl < 0 && mine && e.name === mine.name && e.score === mine.score; if (me) hl = i;
      const col = me ? '#00f0ff' : '#fff';
      text(String(i + 1).padStart(2, ' ') + '  ' + e.name, W / 2 - 70, 44 + i * 13, col, 8, 'left');
      text(String(e.score), W / 2 + 70, 44 + i * 13, col, 8, 'right');
    });
  }
  if (t % 1 < 0.6) text('TAP TO FLY AGAIN', W / 2, 190, '#fff', 6);
}
function draw() {
  const u = mode === 'ultra', th = THEME[u ? 'ultra' : 'normal'];
  drawBg(th, u);
  if (state === 'title') {
    drawCondor(th, W / 2 - 48, 40 + Math.sin(t * 2) * 6, (t % 1.2) < 0.15 ? FLAP : GLIDE, 3);
    text('CÓNDOR', W / 2, 130, '#fff', 16); text('DE LOS ANDES', W / 2, 150, '#ffd93b', 8);
    if (t % 1 < 0.6) text('TAP / SPACE TO FLY', W / 2, 178, '#fff', 6);
  } else {
    pairs.forEach(p => {
      drawMountain(th, p.x, p.bot, false); drawMountain(th, p.x, p.top, true);
      if (p.coin) drawSprite(ctx, COIN, PAL[u ? 'ultra' : 'normal'], p.x - 6, p.gapY + p.gap / 2 - 6);
    });
    if (!(invul > 0 && (frame >> 2) & 1)) drawCondor(th, CX, y, flapT > 0 ? FLAP : GLIDE);
    text('SCORE ' + score, 8, 8, th.hud, 8, 'left');
    for (let i = 0; i < 5; i++) { ctx.fillStyle = i < coins ? PAL.normal.y : 'rgba(255,255,255,.25)'; ctx.fillRect(8 + i * 12, 22, 9, 9); }
    if (u) text('ULTRA ANDES', 8, 38, '#ff2a6d', 8, 'left');
  }
  if (u) { ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let sy = 0; sy < H; sy += 2) ctx.fillRect(0, sy, W, 1); }
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash / 0.4})`; ctx.fillRect(0, 0, W, H); }
  if (banner > 0) { const k = Math.min(1, (1.1 - banner) / 0.25); text('ULTRA ANDES', W / 2, H / 2 - 8 - (1 - k) * 20, '#ff2a6d', 16); text('x2 SCORE', W / 2, H / 2 + 14, '#00f0ff', 8); }
  if (state === 'gameover') drawGameOver(); else if (state === 'table') drawTable();
}

// ---- input (dispatched per state) ----
function cycle(d) { letters[idx] = LETTERS[(LETTERS.indexOf(letters[idx]) + d + LETTERS.length) % LETTERS.length]; }
function advance() { if (++idx < 3) return; const name = letters.join(''); ls.set('name', name); showTable({ name, score }); }
function tap(gx, gy) {
  if (state === 'title') startPlay();
  else if (state === 'table') { if (top !== undefined) startPlay(); }
  else if (state === 'play') { vy = -5.2; flapT = 7; }
  else if (state === 'gameover') {
    const lx = W / 2 - 36 + idx * 30 + 1;
    if (gy > 170 && Math.abs(gx - W / 2) < 24) return showTable(null);
    if (Math.abs(gx - lx) < 12 && gy > 110 && gy < 142) return cycle(gy < 126 ? 1 : -1);
    advance();
  }
}
cv.addEventListener('pointerdown', e => { e.preventDefault(); tap(e.offsetX / cv.clientWidth * W, e.offsetY / cv.clientHeight * H); });
addEventListener('keydown', e => {
  if (e.repeat || !['Space', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.code)) return;
  e.preventDefault();
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
```

- [ ] **Step 2: Syntax check** `node --check game.js` → no output

- [ ] **Step 3: Run locally** `npm run dev` (serves on http://localhost:8788 with a local KV) and verify in the browser:
  - title animates (sun rays, clouds, mountains, bobbing condor, blinking prompt); tap/Space starts
  - Space/click flaps; falling into ground or a mountain → GAME OVER with name entry; score 0 goes straight to table
  - 5 coins → white flash, banner, cyberpunk palette, cyan-outlined glowing condor, HUD "ULTRA ANDES", score +2 per pair
  - mountain hit in ULTRA → back to normal, condor blinks ~1 s, no death
  - name entry: ↑/↓ cycles, Space advances, after 3 letters the table shows with your row in cyan; SKIP/Esc shows table without posting
  - window resize keeps integer scaling (no uneven pixel rows)

- [ ] **Step 4: Commit** `git add game.js && git commit -m "feat: game loop, mountains, ULTRA mode, screens"`

### Task 5: Pixel-perfect pass (only if Step 3 found something)

Fix anything found in Task 4 Step 3. Keep diffs minimal. Commit as `fix: ...`.

### Task 6: GitHub + Cloudflare deploy

- [ ] **Step 1: GitHub repo**

```bash
gh repo create condor-andes --public --source . --push --description "Flappy condor through the Andes — Hack the Andes"
```

- [ ] **Step 2: Cloudflare login** — interactive, the user runs it: `! npx wrangler@latest login`

- [ ] **Step 3: KV namespace**

```bash
npx wrangler@latest kv namespace create SCORES
```
Copy the printed `id` into `wrangler.toml` replacing `REPLACE_ME`.

- [ ] **Step 4: Pages project + deploy**

```bash
npx wrangler@latest pages project create condor-andes --production-branch main
npx wrangler@latest pages deploy
```
Expected: a `https://condor-andes.pages.dev` URL. Open it: game loads, play once, name entry POSTs and the table shows the entry. `curl https://condor-andes.pages.dev/api/scores` returns the JSON array.

- [ ] **Step 5: Commit + push**

```bash
git add wrangler.toml && git commit -m "chore: cloudflare kv binding" && git push
```

- [ ] **Step 6: README** — add the live URL at the top of `README.md`, commit `docs: live url`, push.
