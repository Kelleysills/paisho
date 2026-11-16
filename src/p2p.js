/* Direct phone-to-phone games (PeerJS / WebRTC) for the GitHub Pages version.
   The host's game code is its peer address; the full game doc is mirrored on both phones. */
const P2P = (() => {
  const PREFIX = 'paisho-kpsho-v1-';
  let peer = null, conn = null, myCode = null, role = null;
  const docs = {}, watchers = {};
  const statusFns = new Set();
  const LSK = 'paisho.p2pdocs';
  try { Object.assign(docs, JSON.parse(localStorage.getItem(LSK) || '{}')); } catch (e) {}
  const persist = () => { try { const keep = {}; Object.entries(docs).forEach(([k, v]) => { if (v && Date.now() - (v.updated || 0) < 14 * 864e5) keep[k] = v; }); localStorage.setItem(LSK, JSON.stringify(keep)); } catch (e) {} };
  const ready = () => typeof window.Peer === 'function';
  const notify = (code) => (watchers[code] || []).forEach((f) => { try { f(docs[code] ? Object.assign({ id: code }, docs[code]) : null); } catch (e) { console.warn(e); } });
  const status = (s) => statusFns.forEach((f) => f(s));
  const opts = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };

  function wire(c, code) {
    conn = c;
    c.on('data', (m) => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello') { if (docs[code]) c.send({ t: 'doc', doc: docs[code] }); return; }
      if (m.t === 'doc' && m.doc && typeof m.doc === 'object') {
        const cur = docs[code];
        if (!cur || (m.doc.ver || 0) >= (cur.ver || 0)) { docs[code] = m.doc; persist(); notify(code); }
      }
    });
    c.on('open', () => { status('connected'); c.send({ t: 'hello' }); if (docs[code]) c.send({ t: 'doc', doc: docs[code] }); });
    c.on('close', () => { status('disconnected'); if (role === 'guest') setTimeout(() => reconnect(code), 2500); });
    c.on('error', () => status('disconnected'));
  }
  function reset() { try { conn && conn.close(); } catch (e) {} try { peer && peer.destroy(); } catch (e) {} peer = null; conn = null; }

  function host(code) {
    if (myCode === code && role === 'host' && peer && !peer.destroyed) return;
    reset(); myCode = code; role = 'host';
    peer = new window.Peer(PREFIX + code, opts);
    peer.on('open', () => status('waiting'));
    peer.on('connection', (c) => wire(c, code));
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => { status(e.type === 'unavailable-id' ? 'code-taken' : 'error:' + e.type); });
  }
  function connectTo(code) {
    const c = peer.connect(PREFIX + code, { reliable: true });
    wire(c, code);
  }
  function reconnect(code) {
    if (role !== 'guest' || myCode !== code) return;
    if (!peer || peer.destroyed) { join(code).catch(() => {}); return; }
    if (conn && conn.open) return;
    try { connectTo(code); } catch (e) {}
  }
  // guest: connect and wait for the host's doc
  function join(code) {
    return new Promise((resolve, reject) => {
      reset(); myCode = code; role = 'guest';
      peer = new window.Peer(opts);
      const to = setTimeout(() => reject(new Error('timeout')), 15000);
      const once = (d) => { if (d) { clearTimeout(to); off(); resolve(d); } };
      const off = watch(code, once);
      peer.on('open', () => connectTo(code));
      peer.on('error', (e) => { if (e.type === 'peer-unavailable') { clearTimeout(to); off(); reject(new Error('nohost')); } });
    });
  }
  function set(code, doc) {
    docs[code] = doc; persist(); notify(code);
    if (conn && conn.open) conn.send({ t: 'doc', doc });
  }
  function get(code) { return docs[code] ? Object.assign({ id: code }, docs[code]) : null; }
  function del(code) { delete docs[code]; persist(); if (myCode === code) reset(); }
  function list() { return Object.keys(docs).map((k) => Object.assign({ id: k }, docs[k])); }
  function watch(code, f) {
    (watchers[code] = watchers[code] || []).push(f);
    if (docs[code]) setTimeout(() => f(Object.assign({ id: code }, docs[code])), 0);
    return () => { watchers[code] = (watchers[code] || []).filter((x) => x !== f); };
  }
  // resume a saved game: hosts re-open their address, guests reconnect
  function resume(code, amHost) { if (amHost) host(code); else if (!(role === 'guest' && myCode === code && conn && conn.open)) { myCode = code; role = 'guest'; peer = null; reconnect(code); } }
  const onStatus = (f) => { statusFns.add(f); return () => statusFns.delete(f); };
  return { ready, host, join, set, get, del, list, watch, resume, onStatus, get connected() { return !!(conn && conn.open); } };
})();
