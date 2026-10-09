const KEY = 'top';

export function validate(b) {
  const name = String(b?.name ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  const score = b?.score;
  if (!name || !Number.isInteger(score) || score < 1 || score > 2000) return null; // ponytail: plausibility cap, not anti-cheat
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

export const onRequest = () => json({ error: 'method not allowed' }, 405); // any method without a specific handler above
