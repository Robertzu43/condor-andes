import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, mergeTop, onRequest } from './scores.js';

test('other methods get 405', () => assert.equal(onRequest().status, 405));

test('validate cleans name and bounds score', () => {
  assert.deepEqual(validate({ name: 'rz-u!', score: 42 }), { name: 'RZU', score: 42 });
  assert.deepEqual(validate({ name: 'ROBERTO', score: 1 }), { name: 'ROB', score: 1 });
  assert.equal(validate({ name: '', score: 5 }), null);
  assert.equal(validate({ name: 'AAA', score: 0 }), null);
  assert.deepEqual(validate({ name: 'AAA', score: 2000 }), { name: 'AAA', score: 2000 });
  assert.equal(validate({ name: 'AAA', score: 2001 }), null);
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
