const KEY = 'top';
const MAX_BODY_BYTES = 1024;

export function validate(b) {
  if (!b || typeof b.name !== 'string') return null;
  const name = b.name.trim().toUpperCase();
  const score = b?.score;
  if (!/^[A-Z0-9]{1,3}$/.test(name) || !Number.isInteger(score) || score < 1 || score > 2000) return null;
  return { name, score };
}

// Array.prototype.sort is stable: equal scores keep insertion order (older first).
export function normalizeTop(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .map(validate)
    .filter(entry => {
      if (!entry) return false;
      const key = `${entry.name}:${entry.score}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export const mergeTop = (list, entry) => normalizeTop([...list, entry]);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const sameTop = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

async function parseBody(request) {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return { error: json({ error: 'unsupported media type' }, 415) };

  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return { error: json({ error: 'payload too large' }, 413) };
  }

  let raw;
  try { raw = await request.text(); }
  catch { return { error: json({ error: 'bad body' }, 400) }; }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return { error: json({ error: 'payload too large' }, 413) };
  }

  try { return { body: JSON.parse(raw) }; }
  catch { return { error: json({ error: 'bad json' }, 400) }; }
}

const getTop = async env => normalizeTop((await env.SCORES.get(KEY, 'json')) || []);

export async function onRequestGet({ env }) {
  try { return json(await getTop(env)); }
  catch { return json({ error: 'storage unavailable' }, 503); }
}

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return json({ error: 'origin not allowed' }, 403);
  const parsed = await parseBody(request);
  if (parsed.error) return parsed.error;
  const { body } = parsed;
  const entry = validate(body);
  if (!entry) return json({ error: 'invalid' }, 400);
  try {
    const current = await getTop(env);
    const top = mergeTop(current, entry);
    if (!sameTop(current, top)) await env.SCORES.put(KEY, JSON.stringify(top));
    return json(top);
  } catch {
    return json({ error: 'storage unavailable' }, 503);
  }
}

export const onRequest = () => json({ error: 'method not allowed' }, 405); // any method without a specific handler above
