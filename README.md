# Cóndor de los Andes

Vuela el cóndor, junta 5 monedas y entra al ULTRA ANDES. ¿Llegas al TOP CONDORES?
Fly the condor, grab 5 coins to enter ULTRA ANDES. Can you make the TOP CONDORES?

**Play it:** https://condor-andes.pages.dev

Flappy-style pixel game for Hack the Andes. Works on phone and desktop.

## How to play

- Tap / Space / ↑ to flap. Fly through the gaps between mountains; each pair you pass is 1 point.
- Every gap has an Inti coin. Collect 5 to enter **ULTRA ANDES**: cyberpunk Andes, glowing condor, **x2 points**.
- Hit a mountain in ULTRA → back to normal (1 s of invulnerability). Hit a mountain or the ground in normal → game over.
- Enter a 3-letter name and see the global **TOP CONDORES** (top 10).

## Dev

- `npm test` — unit checks (`node --test`)
- `npm run dev` — local Cloudflare Pages server with local KV at http://localhost:8788
- `npm run deploy` — deploy to Cloudflare Pages
- `node scripts/make-images.mjs` — regenerate `og.png`, `favicon.png`, `apple-touch-icon.png` from the pixel art (no deps)

Leaderboard lives in KV (`SCORES` binding, key `top`). Reset the production leaderboard:

```
npx wrangler@latest kv key delete --namespace-id 37bf007b13074d738e15826d3802da64 top --remote
```
