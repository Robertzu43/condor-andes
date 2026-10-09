// Renders og.png / favicon.png / apple-touch-icon.png from the game's own pixel art. Run: node scripts/make-images.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { GLIDE, PAL, THEME } from '../sprites.js';

const th = THEME.normal, hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const CRC = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]); len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };

function png(w, h, draw) {
  const rgb = Buffer.alloc(w * h * 3);
  const px = (x, y, [r, g, b]) => { if (x >= 0 && y >= 0 && x < w && y < h) rgb.set([r, g, b], (y * w + x) * 3); };
  const rect = (x, y, rw, rh, c) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) px(i, j, c); };
  for (let y = 0; y < h; y++) { const a = hex(th.sky0), b = hex(th.sky1), t = y / h; rect(0, y, w, 1, a.map((v, i) => Math.round(v + (b[i] - v) * t))); }
  draw(rect);
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); // filter byte 0 per row
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// condor at fractional scale s, nearest-neighbour (rows 0..25 hold the art; the rest are padding)
const condor = (rect, x0, y0, s) => GLIDE.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch !== '.') rect(Math.round(x0 + rx * s), Math.round(y0 + ry * s), Math.ceil(s), Math.ceil(s), hex(PAL.normal[ch])); }));

const S = 3, OG = { w: 400, h: 210 }, GROUND = OG.h - 24; // og = the game's 384x216 look at 3x
writeFileSync('og.png', png(OG.w * S, OG.h * S, rect => {
  const R = (x, y, rw, rh, c) => rect(x * S, y * S, rw * S, rh * S, c);
  const circle = (cx, cy, r, c) => { for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy)); R(cx - hw, cy + dy, 2 * hw + 1, 1, c); } };
  const tri = (x, h, hw, c) => { for (let i = 0; i < h; i++) { const w = Math.max(1, Math.round(hw * (h - i) / h)); R(x - w, GROUND - 1 - i, 2 * w, 1, c); } };
  circle(OG.w - 64, 48, 21, hex(th.sun)); circle(OG.w - 64, 48, 15, hex(th.sunCore));
  for (let a = 0; a < 8; a++) for (let r = 24; r < 31; r++) R(OG.w - 64 + Math.cos(a * Math.PI / 4) * r | 0, 48 + Math.sin(a * Math.PI / 4) * r | 0, 1, 1, hex(th.sun));
  for (let k = -1; k < OG.w / 70 + 2; k++) tri(k * 70, 60 + (k * 37) % 50, 55, hex(th.far2));
  for (let k = -1; k < OG.w / 55 + 2; k++) tri(k * 55, 30 + (k * 37) % 35, 45, hex(th.far));
  R(0, GROUND, OG.w, OG.h - GROUND, hex(th.ground));
  for (let x = 0; x < OG.w; x += 20) { R(x, GROUND + 3, 5, 2, hex(th.groundDark)); R(x + 10, GROUND + 7, 5, 2, hex(th.groundDark)); }
  condor(rect, 60, 110, 12);
}));
writeFileSync('favicon.png', png(64, 64, rect => condor(rect, 3, 8, 1.8)));
writeFileSync('apple-touch-icon.png', png(180, 180, rect => condor(rect, 4, 20, 5.4)));
