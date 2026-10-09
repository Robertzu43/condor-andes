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
