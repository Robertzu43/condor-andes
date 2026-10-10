import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PUBLIC_ASSETS } from './scripts/build.mjs';

test('deployment publishes only the runtime allowlist', () => {
  assert.deepEqual(PUBLIC_ASSETS, [
    'index.html',
    '404.html',
    'game.js',
    'sprites.js',
    'og.png',
    'favicon.png',
    'apple-touch-icon.png',
    '_redirects',
    '_headers',
  ]);
  for (const internal of ['README.md', 'wrangler.toml', 'package.json', 'docs', 'functions']) {
    assert.equal(PUBLIC_ASSETS.includes(internal), false);
  }
});

test('debug automation is restricted to loopback hosts', async () => {
  const source = await readFile(new URL('./game.js', import.meta.url), 'utf8');
  assert.match(source, /DEBUG_HOSTS\.has\(location\.hostname\) && location\.hash === '#debug'/);
  assert.doesNotMatch(source, /if \(location\.hash === '#debug'\)/);
});

test('static responses define baseline browser security headers', async () => {
  const headers = await readFile(new URL('./_headers', import.meta.url), 'utf8');
  for (const name of ['Content-Security-Policy:', 'Permissions-Policy:', 'X-Content-Type-Options:', 'X-Frame-Options:']) {
    assert.match(headers, new RegExp(name));
  }
});
