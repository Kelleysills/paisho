/* Friends: friend codes, online status and game invites, phone-to-phone (PeerJS). */
const Social = (() => {
  const PREFIX = 'paisho-kpsho-u1-';
  let peer = null, me = null, timer = null;
  const links = new Map(); // code -> DataConnection
  const online = new Set();
  const listeners = new Set();
  const LS = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('paisho.' + k) || 'null'); localStorage.setItem('paisho.' + k, JSON.stringify(v)); } catch (e) { return null; } };
  const ready = () => typeof window.Peer === 'function';
  const emit = (ev, data) => listeners.forEach((f) => { try { f(ev, data); } catch (e) {} });
  const key = () => 'friends.' + (me ? me.pid : 'none');
  const friends = () => LS(key()) || [];
  const saveFriends = (l) => { LS(key(), l); emit('change'); };
  const requests = () => LS(key() + '.req') || [];
  const saveReq = (l) => { LS(key() + '.req', l); emit('change'); };
  function codeFor(pid) {
    let map = LS('friendcodes') || {};
    if (!map[pid]) { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; map[pid] = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => A[b % A.length]).join(''); LS('friendcodes', map); }
    return map[pid];
  }
  const hello = () => ({ t: 'hi', code: me.code, name: me.name });
  function handle(c, m) {
    if (!m || typeof m !== 'object' || typeof m.code !== 'string' || !/^[A-Z0-9]{6}$/.test(m.code)) return;
    const name = String(m.name || 'Player').slice(0, 18);
    links.set(m.code, c);
    const list = friends(); const f = list.find((x) => x.code === m.code);
    if (m.t === 'hi' || m.t === 'add') {
      if (f) { online.add(m.code); if (f.name !== name) { f.name = name; saveFriends(list); } emit('change'); if (m.t === 'add') c.send({ t: 'accepted', code: me.code, name: me.name }); }
      else if (m.t === 'add') { const r = requests().filter((x) => x.code !== m.code); r.push({ code: m.code, name, t: Date.now() }); saveReq(r); emit('request', { code: m.code, name }); }
    } else if (m.t === 'accepted') {
      if (f) { online.add(m.code); f.pending = false; f.name = name; saveFriends(list); emit('accepted', { code: m.code, name }); }
    } else if (m.t === 'invite' && f && typeof m.game === 'string' && /^[A-Z]{4}$/.test(m.game)) {
      emit('invite', { code: m.code, name: f.name, game: m.game });
    } else if (m.t === 'bye') { online.delete(m.code); emit('change'); }
  }
  function wire(c) {
    c.on('data', (m) => handle(c, m));
    c.on('open', () => { if (me) c.send(hello()); });
    c.on('close', () => { for (const [k, v] of links) if (v === c) { links.delete(k); online.delete(k); } emit('change'); });
    c.on('error', () => {});
  }
  function start(profile) {
    if (!ready()) return false;
    const pid = profile.pid;
    if (me && me.pid === pid && peer && !peer.destroyed) return true;
    stop();
    me = { pid, name: profile.name, code: codeFor(pid) };
    peer = new window.Peer(PREFIX + me.code, { debug: 0 });
    peer.on('connection', wire);
    peer.on('open', () => { emit('status', 'online'); ping(); });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
    peer.on('error', (e) => { if (e.type === 'peer-unavailable') { const m = /u1-([A-Z0-9]{6})/.exec(e.message || ''); if (m) { online.delete(m[1]); emit('change'); } } else if (e.type === 'unavailable-id') emit('status', 'elsewhere'); });
    timer = setInterval(ping, 20000);
    return true;
  }
  function stop() {
    clearInterval(timer); timer = null;
    links.forEach((c) => { try { c.send({ t: 'bye', code: me.code }); c.close(); } catch (e) {} });
    links.clear(); online.clear();
    try { peer && peer.destroy(); } catch (e) {} peer = null; me = null;
  }
  function connect(code, first) {
    if (!peer || peer.destroyed || peer.disconnected) return;
    const ex = links.get(code); if (ex && ex.open) { if (first) ex.send(first); return; }
    const c = peer.connect(PREFIX + code, { reliable: true });
    wire(c);
    if (first) c.on('open', () => c.send(first));
  }
  function ping() { friends().forEach((f) => connect(f.code, f.pending ? { t: 'add', code: me.code, name: me.name } : null)); }
  function add(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{6}$/.test(code)) return 'Friend codes are 6 letters/numbers';
    if (!me) return 'Not connected yet';
    if (code === me.code) return 'That’s your own code';
    const list = friends(); if (list.some((f) => f.code === code)) return 'Already on your list';
    list.push({ code, name: 'Player ' + code, pending: true, added: Date.now() }); saveFriends(list);
    connect(code, { t: 'add', code: me.code, name: me.name });
    return null;
  }
  function accept(code) {
    const r = requests(); const q = r.find((x) => x.code === code); if (!q) return;
    saveReq(r.filter((x) => x.code !== code));
    const list = friends(); if (!list.some((f) => f.code === code)) list.push({ code, name: q.name, added: Date.now() });
    saveFriends(list); online.add(code);
    connect(code, { t: 'accepted', code: me.code, name: me.name });
  }
  const decline = (code) => saveReq(requests().filter((x) => x.code !== code));
  const remove = (code) => { saveFriends(friends().filter((f) => f.code !== code)); const c = links.get(code); if (c) try { c.close(); } catch (e) {} };
  function invite(code, game) { connect(code, { t: 'invite', code: me.code, name: me.name, game }); }
  const on = (f) => { listeners.add(f); return () => listeners.delete(f); };
  return { ready, start, stop, add, accept, decline, remove, invite, friends, requests, on, isOnline: (c) => online.has(c), get code() { return me && me.code; }, get active() { return !!me; } };
})();
