import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, normalizeTop, mergeTop, onRequest, onRequestGet, onRequestPost } from './scores.js';

const ORIGIN = 'https://condor-andes.pages.dev';

function post(body, headers = {}) {
  return new Request(`${ORIGIN}/api/scores`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function scoresEnv(initial = []) {
  let stored = structuredClone(initial);
  let puts = 0;
  return {
    env: { SCORES: {
      get: async () => structuredClone(stored),
      put: async (_key, value) => { puts++; stored = JSON.parse(value); },
    } },
    get stored() { return stored; },
    get puts() { return puts; },
  };
}

test('other methods get 405', () => assert.equal(onRequest().status, 405));

test('validate accepts only short strings and bounds score', () => {
  assert.deepEqual(validate({ name: ' rzu ', score: 42 }), { name: 'RZU', score: 42 });
  assert.equal(validate({ name: 'rz-u!', score: 42 }), null);
  assert.equal(validate({ name: 'ROBERTO', score: 1 }), null);
  assert.equal(validate({ name: 123, score: 1 }), null);
  assert.equal(validate({ name: { toString: null, valueOf: null }, score: 1 }), null);
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

test('normalizeTop drops malformed and exact duplicate entries', () => {
  assert.deepEqual(normalizeTop([
    { name: 'AAA', score: 10 },
    { name: 'AAA', score: 10 },
    { name: {}, score: 50 },
    { name: 'BBB', score: 20 },
  ]), [
    { name: 'BBB', score: 20 },
    { name: 'AAA', score: 10 },
  ]);
});

test('POST enforces same-origin JSON and a small body', async () => {
  const store = scoresEnv();
  assert.equal((await onRequestPost({ request: post({ name: 'AAA', score: 1 }, { origin: 'https://evil.example' }), env: store.env })).status, 403);
  assert.equal((await onRequestPost({ request: post('{"name":"AAA","score":1}', { 'content-type': 'text/plain' }), env: store.env })).status, 415);
  assert.equal((await onRequestPost({ request: post('x'.repeat(1025)), env: store.env })).status, 413);
  assert.equal(store.puts, 0);
});

test('POST rejects hostile JSON values without throwing', async () => {
  const store = scoresEnv();
  const response = await onRequestPost({
    request: post({ name: { toString: null, valueOf: null }, score: 1 }),
    env: store.env,
  });
  assert.equal(response.status, 400);
  assert.equal(store.puts, 0);
});

test('POST writes only when the top changes and ignores exact replay', async () => {
  const initial = Array.from({ length: 10 }, (_, i) => ({ name: `N${i}`, score: 100 - i * 10 }));
  const store = scoresEnv(initial);
  assert.equal((await onRequestPost({ request: post({ name: 'LOW', score: 1 }), env: store.env })).status, 200);
  assert.equal(store.puts, 0);

  assert.equal((await onRequestPost({ request: post({ name: 'NEW', score: 95 }), env: store.env })).status, 200);
  assert.equal(store.puts, 1);

  assert.equal((await onRequestPost({ request: post({ name: 'NEW', score: 95 }), env: store.env })).status, 200);
  assert.equal(store.puts, 1);
});

test('storage failures return 503 without leaking details', async () => {
  const env = { SCORES: { get: async () => { throw new Error('secret backend detail'); } } };
  const getResponse = await onRequestGet({ env });
  assert.equal(getResponse.status, 503);
  assert.deepEqual(await getResponse.json(), { error: 'storage unavailable' });

  const postResponse = await onRequestPost({ request: post({ name: 'AAA', score: 1 }), env });
  assert.equal(postResponse.status, 503);
  assert.deepEqual(await postResponse.json(), { error: 'storage unavailable' });
});
