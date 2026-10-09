# Cóndor de los Andes — design

Flappy-Bird-style browser game for Hack the Andes (Lima). Pixel art, Andean theme, an "ULTRA ANDES" cyberpunk mode, global leaderboard on Cloudflare.

## Stack

Vanilla HTML + JS + `<canvas>`, zero runtime dependencies. Hosted on Cloudflare Pages; leaderboard is one Pages Function backed by KV. Public GitHub repo `condor-andes`.

Files:

```
index.html              canvas + minimal CSS (black letterbox, pixelated)
game.js                 loop, physics, state machine, rendering, screens
sprites.js              letter-coded pixel sprites + both palettes
functions/api/scores.js GET / POST leaderboard (Cloudflare Pages Function)
wrangler.toml           pages project + KV binding SCORES
README.md
```

## Rendering

- Logical resolution **384×216**. Canvas is scaled by the largest integer that fits the window (`floor(min(innerWidth/384, innerHeight/216))`, min 1), centred on black. `image-rendering: pixelated`, `imageSmoothingEnabled=false`.
- Sprites are arrays of strings; each char maps to a colour through the active palette. `drawSprite(rows, palette, x, y)` fills 1×1 rects. Mountains are procedural (see below), not sprites.
- Two palettes, `normal` and `ultra`, with the same keys. Switching mode changes only which palette and which background routine is used. ULTRA additionally draws: synthwave striped sun low on the horizon, neon grid floor, 50 % black scanlines every other row, and the condor with a 1-px cyan outline plus `shadowBlur` glow.
- Colours (approved in mockups):
  - normal: body `#1a1a1a`, shade `#3d3d3d`, white `#f4f4f4`, head `#c0392b`, comb `#e67e22`, beak `#e8d8b0`, sky `#4aa3e0→#b8e3f8`, sun `#ffd93b/#ffb703`, rock `#7a6a5c/#5c4e42/#8d7d6e`, snow `#fff/#dde6ee`, ground `#6b8e3a/#4e6b2a`, coin `#f2d16b/#e0a020`, far mountains `#7f93a8/#9fb3c8`.
  - ultra: body `#1a0533`, shade `#3b0a6b`, white→cyan `#00f0ff`, head `#ff2a6d`, comb `#ff9f1c`, beak `#f5f500`, sky `#07010f→#2a0a4a`, sun `#ff2a6d/#ff9f1c`, rock `#1a0533/#0d0221/#3b0a6b`, snow `#ff2a6d/#ff6fa0`, ground `#0d0221` grid `#00f0ff`, coin `#00f0ff/#0a3a5a`, far `#160430/#24084a`, HUD `#00f0ff`.
- Condor: 32×32 frames, `glide` (wing up) and `flap` (wing down), as drawn in the mockups. Coin 12×12. Clouds from 5 rects + shadow row. Font: "Press Start 2P" via Google Fonts, fallback monospace.

## Game loop and physics

- `requestAnimationFrame`; fixed step 1/60 s with accumulator (cap 5 steps per frame).
- Condor: `vy += 0.35` per step, flap sets `vy = -5.2`, clamp `vy ≤ 8`. Horizontal position fixed at x=70. Hitbox: 20×16 box centred on the body (smaller than the sprite so wingtips don't kill).
- Scroll speed 2.0 px/step, +0.1 every 10 points, cap 3.5. Far mountains scroll at 0.25×, clouds 0.15×, ground 1×.
- Input is dispatched per state. `title`: any pointer down / Space / ArrowUp → play. `play`: same keys → flap. `gameover`: ArrowUp/ArrowDown or tap on the upper/lower half of the active letter → cycle letter; Space/Enter or tap anywhere else → advance; Esc or tap on a small `SKIP` label → skip posting. `table`: any tap/key → play.
- Flap animation: show `flap` frame for 7 steps after each tap, else `glide`.

## Obstacles

Each obstacle is a pair of procedural mountains at x: bottom one stands on the ground (y=192), top one hangs from y=0 flipped.

- `gap` = 58–74 px, `gapY` random so the gap stays ≥ 16 px from top and ground, half-width `hw` = 18–32, spacing to the next pair 90–155 px. All from `Math.random()` at spawn.
- Mountain shape: for row i of height h, width = `round(hw*(h-i)/h) + jag[i]` where jag is a random walk (±0.8/row). Top 22 % of the height is snow. Left 25 % highlight, right 70 % shadow. The shape (per-row widths) is generated once at spawn and stored so collision and drawing agree.
- Collision: condor hitbox vs each stored row rect of the two mountains, plus ground. O(rows) per pair, only for pairs overlapping x=70±20.
- Coin: one per pair, 12×12 at the gap centre. Collected when hitbox overlaps; removed.
- Score +1 when a pair's x passes the condor (once per pair). ×2 per pair while in ULTRA.

## Modes

```
normal --(coins == 5)--> ULTRA --(hit mountain)--> normal
normal --(hit mountain or ground)--> gameover
ULTRA  --(hit ground)--> gameover
```

- Entering ULTRA: `coins = 0`, 400 ms white flash fading out, "ULTRA ANDES / x2 SCORE" banner for 1.1 s. Palette, background, scanlines, glow switch immediately.
- Leaving ULTRA (mountain hit): 1 s invulnerability (condor blinks at 8 Hz) so the same mountain can't kill. `coins = 0`.
- Coins collected in ULTRA still count toward 5; reaching 5 again just resets to 0 (already ULTRA, small flash).

## Screens / state machine

`title → play → gameover → table → play` (title is shown only on first load)

- **title**: animated — sun rays rotate+pulse, two far-mountain layers drift (6 and 12 px/s), four clouds drift at different speeds and bob, ground stripes scroll, condor at 3× bobs (sin, ±6 px) and idle-flaps every 1.2 s, "TAP / SPACE TO FLY" blinks. Tap → play.
- **play**: HUD top-left: `SCORE n`, five 9×9 coin slots (filled = collected), `ULTRA ANDES` label in pink when active.
- **gameover**: dim overlay; `GAME OVER`, `SCORE n`, `BEST n` (localStorage `condor.best`); 3-letter name entry: ArrowUp/Down (or tap upper/lower half of the active letter) cycles A–Z then 0–9, Tap/Space/Enter advances, after the 3rd letter the score is POSTed; Esc or the `SKIP` label skips posting. If score is 0, name entry is skipped and the table is shown directly. Last name is remembered in localStorage `condor.name` and pre-filled.
- **table**: `TOP CONDORES`, top 10 `rank name score`, the player's row in cyan (first row equal to the just-posted `{name, score}`), `TAP TO FLY AGAIN`. If the fetch fails, show the local best only with "OFFLINE".

## Leaderboard API

`functions/api/scores.js` on Cloudflare Pages, KV namespace binding `SCORES`, single key `top`.

- `GET /api/scores` → `[{name, score}]` top 10, sorted desc. Cache-Control `no-store`.
- `POST /api/scores` JSON `{name, score}`. Validate: name after `toUpperCase().replace(/[^A-Z0-9]/g,'')` is 1–3 chars; score integer 1–9999. Reject otherwise (400). Read `top`, push, stable sort desc by score (ties keep insertion order, so earlier entries rank first), slice 10, write back, return new top 10.
- Same-origin only; no auth (hackathon). `ponytail:` KV read-modify-write can race under simultaneous posts; acceptable for this scale, move to Durable Object if it matters.

## Deploy

- `wrangler pages project create condor-andes`, `wrangler kv namespace create SCORES`, binding in `wrangler.toml` with `pages_build_output_dir = "."`, `wrangler pages deploy`. `docs/` gets uploaded as static assets too; harmless.
- Pages serves `index.html`, `game.js`, `sprites.js` statically; `functions/` becomes the API.

## Testing

- `sprites.js` self-check (run with `node sprites.js`): every sprite's rows have equal length, every char used exists in both palettes.
- `scores.js` logic (`mergeTop(list, entry)` + `validate(body)`) is a pure function, tested with a small `node --test` file.
- Game play tested manually in browser: flap, die on mountain/ground, 5 coins → ULTRA, mountain in ULTRA → normal, score ×2, name entry, table.

## Out of scope (v1)

Audio, mobile haptics, pause, difficulty settings, anti-cheat.
