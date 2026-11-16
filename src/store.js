/* Storage backends: artifact db (claude.ai), self-hosted server (server.js), or this device only */
const Store = (() => {
  let kind = 'local', db = null, user = null, uid = null;
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('paisho.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('paisho.' + k, JSON.stringify(v)); } catch (e) {} },
  };
  const timeout = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

  async function init() {
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        db = await Promise.race([window.claude.use('db'), timeout(10000, null)]);
        user = await Promise.race([window.claude.use('user'), timeout(4000, null)]);
        if (user && user.id) uid = await user.id().catch(() => null);
        if (db) { kind = 'artifact'; return kind; }
      }
    } catch (e) {}
    if (/^https?:/.test(location.protocol)) {
      try { const r = await Promise.race([fetch('api/ping'), timeout(2500, null)]); if (r && r.ok) { kind = 'server'; return kind; } } catch (e) {}
    }
    kind = 'local'; return kind;
  }
  const p2p = () => kind === 'local' && typeof P2P !== 'undefined' && P2P.ready();
  const online = () => kind !== 'local' || p2p();
  const viaP2P = (col) => col === 'games' && p2p();

  // --- local collection emulation (single device) ---
  const localCol = (col) => LS.get('col.' + col, {});
  const localSave = (col, data) => LS.set('col.' + col, data);

  async function list(col) {
    if (viaP2P(col)) return P2P.list();
    if (kind === 'artifact') { const snap = await db.collection(col).limit(500).get(); return snap.docs.map((d) => Object.assign({ id: d.id }, d.data())); }
    if (kind === 'server') { const r = await fetch('api/c/' + col); return r.json(); }
    const c = localCol(col); return Object.keys(c).map((id) => Object.assign({ id }, c[id]));
  }
  async function get(col, id) {
    if (viaP2P(col)) return P2P.get(id);
    if (kind === 'artifact') { const d = await db.doc(col + '/' + id).get(); return d.exists ? Object.assign({ id }, d.data()) : null; }
    if (kind === 'server') { const r = await fetch('api/d/' + col + '/' + id); if (!r.ok) return null; const j = await r.json(); return j ? Object.assign({ id }, j) : null; }
    const c = localCol(col); return c[id] ? Object.assign({ id }, c[id]) : null;
  }
  async function set(col, id, data) {
    const body = JSON.parse(JSON.stringify(data)); delete body.id;
    if (viaP2P(col)) return P2P.set(id, body);
    if (kind === 'artifact') return db.doc(col + '/' + id).set(body);
    if (kind === 'server') return fetch('api/d/' + col + '/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const c = localCol(col); c[id] = body; localSave(col, c);
  }
  async function del(col, id) {
    if (viaP2P(col)) return P2P.del(id);
    if (kind === 'artifact') return db.doc(col + '/' + id).delete();
    if (kind === 'server') return fetch('api/d/' + col + '/' + id, { method: 'DELETE' });
    const c = localCol(col); delete c[id]; localSave(col, c);
  }
  // live watch of one doc
  function watch(col, id, cb) {
    if (viaP2P(col)) return P2P.watch(id, cb);
    if (kind === 'artifact') return db.doc(col + '/' + id).onSnapshot((d) => cb(d.exists ? Object.assign({ id }, d.data()) : null), () => {});
    if (kind === 'server') {
      let es; try { es = new EventSource('api/w/' + col + '/' + id); es.onmessage = (e) => { const j = JSON.parse(e.data); cb(j ? Object.assign({ id }, j) : null); }; } catch (e) {}
      let stop = false; // polling fallback
      const poll = async () => { if (stop) return; if (!es || es.readyState === 2) { cb(await get(col, id)); } setTimeout(poll, 4000); };
      setTimeout(poll, 4000);
      return () => { stop = true; es && es.close(); };
    }
    return () => {};
  }
  function watchCol(col, cb) {
    if (viaP2P(col)) { let stop = false; const tick = () => { if (stop) return; cb(P2P.list()); setTimeout(tick, 2000); }; tick(); return () => { stop = true; }; }
    if (kind === 'artifact') return db.collection(col).limit(200).onSnapshot((s) => cb(s.docs.map((d) => Object.assign({ id: d.id }, d.data()))), () => {});
    if (kind === 'server') {
      let stop = false;
      const poll = async () => { if (stop) return; try { cb(await list(col)); } catch (e) {} setTimeout(poll, 3000); };
      poll(); return () => { stop = true; };
    }
    return () => {};
  }
  return { init, online, p2p, list, get, set, del, watch, watchCol, LS, get kind() { return kind; }, get uid() { return uid; }, get user() { return user; } };
})();

/* Profiles: name + salted PIN hash, optional passkey (biometric) */
const Auth = (() => {
  const enc = new TextEncoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  async function hash(pin, salt) {
    const data = enc.encode(salt + ':' + pin + ':paisho');
    if (crypto.subtle) { let h = data; for (let i = 0; i < 2000; i++) h = new Uint8Array(await crypto.subtle.digest('SHA-256', h)); return b64(h); }
    let x = 5381; for (const b of data) x = ((x * 33) ^ b) >>> 0; return 'w' + x.toString(36);
  }
  const rid = (n = 12) => b64(crypto.getRandomValues(new Uint8Array(n)));
  async function bioAvailable() {
    try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
  }
  async function bioRegister(profile) {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Pai Sho' },
      user: { id: enc.encode(profile.id), name: profile.name, displayName: profile.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000,
    } });
    return b64(cred.rawId);
  }
  async function bioVerify(credId) {
    const a = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(credId) }], userVerification: 'required', timeout: 60000,
    } });
    return !!a;
  }
  return { hash, rid, bioAvailable, bioRegister, bioVerify };
})();
