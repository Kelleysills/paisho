// Pai Sho push sender (Cloudflare Worker). Sends Web Push notifications to a player's devices.
// Needs one KV binding named PUSH_KV. The VAPID key pair is generated on first use and kept in KV.
const PROJECT = 'paisho-4773a';
const ALLOWED_ORIGINS = ['https://kelleysills.github.io', 'http://localhost:8080'];
const SUBJECT = 'https://kelleysills.github.io/paisho/';

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
const concat = (...a) => { const n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n); let k = 0; for (const x of a) { o.set(x, k); k += x.length; } return o; };
async function hmac(key, data) { const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', k, data)); }

async function vapid(env) {
  let v = await env.PUSH_KV.get('vapid', 'json');
  if (!v) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { priv: await crypto.subtle.exportKey('jwk', kp.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)) };
    await env.PUSH_KV.put('vapid', JSON.stringify(v));
  }
  return v;
}
async function vapidHeader(v, endpoint) {
  const aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const c = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', v.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(h + '.' + c));
  return `vapid t=${h}.${c}.${b64u(sig)}, k=${v.pub}`;
}
// RFC 8291 (aes128gcm) payload encryption
async function encrypt(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const prkKey = await hmac(auth, ecdh);
  const ikm = await hmac(prkKey, concat(enc.encode('WebPush: info\0'), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return concat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
async function sendPush(env, v, sub, payload) {
  const body = await encrypt(sub, payload);
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(v, sub.endpoint), TTL: '86400', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Urgency: 'high' }, body });
  return r.status;
}

const clip = (s, n) => String(s || '').slice(0, n);
export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Vary': 'Origin' };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === '/vapid') return json({ key: (await vapid(env)).pub });
      if (url.pathname === '/notify' && req.method === 'POST') {
        const tok = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
        const m = await req.json();
        if (!tok || !/^[A-Za-z0-9_-]{3,40}$/.test(m.to || '')) return json({ error: 'bad request' }, 400);
        // Read the recipient's subscriptions with the caller's own Firebase sign-in (rejects strangers)
        const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/push/${m.to}`, { headers: { Authorization: 'Bearer ' + tok } });
        if (r.status === 404) return json({ sent: 0 });
        if (!r.ok) return json({ error: 'auth' }, 401);
        const doc = await r.json();
        const subs = Object.values(((doc.fields || {}).subs || {}).mapValue?.fields || {}).map((x) => { try { return JSON.parse(x.stringValue); } catch (e) { return null; } }).filter(Boolean).slice(0, 10);
        // Yip yip nudges: at most one per game per minute, whatever the sender's app does
        if (/^n-/.test(m.tag || '')) {
          const key = new Request(`https://rate.paisho/${m.to}/${encodeURIComponent(m.tag)}`), cache = caches.default;
          if (await cache.match(key)) return json({ sent: 0, limited: true });
          await cache.put(key, new Response('1', { headers: { 'Cache-Control': 'max-age=60' } }));
        }
        const v = await vapid(env);
        const payload = JSON.stringify({ title: clip(m.title, 80), body: clip(m.body, 180), tag: clip(m.tag, 60), url: clip(m.url, 200) });
        const res = await Promise.all(subs.map((s) => sendPush(env, v, s, payload).catch(() => 0)));
        return json({ sent: res.filter((s) => s >= 200 && s < 300).length, codes: res });
      }
      return json({ ok: true, name: 'paisho-push' });
    } catch (e) { return json({ error: String(e && e.message || e) }, 500); }
  },
};
