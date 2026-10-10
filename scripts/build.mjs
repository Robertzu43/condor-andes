import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), '..');

export const PUBLIC_ASSETS = Object.freeze([
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

export async function build(root = PROJECT_ROOT, out = join(root, 'dist')) {
  root = resolve(root);
  out = resolve(out);
  if (out !== join(root, 'dist')) throw new Error('Refusing to build outside the project dist directory');

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  await Promise.all(PUBLIC_ASSETS.map(asset => copyFile(join(root, asset), join(out, asset))));
  process.stdout.write(`[OK] Built ${PUBLIC_ASSETS.length} public assets in dist\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) await build();
