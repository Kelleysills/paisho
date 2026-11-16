/* Firebase backend (GitHub Pages version): online games, profiles, stats, friends, turn alerts */
const FB = (() => {
  const CONFIG = {
    apiKey: 'AIzaSyCt4dFBAXTWafJ8ZDum8C-xj4QRw5r1Ngs',
    authDomain: 'paisho-4773a.firebaseapp.com',
    projectId: 'paisho-4773a',
    storageBucket: 'paisho-4773a.firebasestorage.app',
    messagingSenderId: '839606764596',
    appId: '1:839606764596:web:6ae32ecaf5f57507113661',
  };
  let fs = null, uid = null;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function init() {
    for (let i = 0; i < 40 && !(window.firebase && firebase.firestore && firebase.auth); i++) await wait(150);
    if (!(window.firebase && firebase.firestore && firebase.auth)) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG);
      const cred = await Promise.race([firebase.auth().signInAnonymously(), wait(8000).then(() => null)]);
      if (!cred) return false;
      uid = cred.user.uid;
      fs = firebase.firestore();
      try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
      return true;
    } catch (e) { console.warn('Firebase unavailable', e); return false; }
  }
  const col = (c) => fs.collection(c);
  const now = () => Date.now();
  return { init, col, get fs() { return fs; }, get uid() { return uid; }, now };
})();

/* Friends over Firestore: friend codes, requests, presence, invites */
const FireSocial = (() => {
  let me = null, unsubs = [], beat = null, friendDocs = [], reqDocs = [];
  const listeners = new Set();
  const emit = (ev, d) => listeners.forEach((f) => { try { f(ev, d); } catch (e) {} });
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => A[b % A.length]).join('');
  const ONLINE_MS = 150000;
  function ready() { return Store.kind === 'firebase'; }
  async function start(profile) {
    if (!ready() || !profile || !profile.pid || profile.pid.startsWith('g-')) return false;
    if (me && me.pid === profile.pid) { me.name = profile.name; me.avatar = profile.avatar; return true; }
    stop();
    const ref = FB.col('players').doc(profile.pid);
    const snap = await ref.get(); const d = snap.exists ? snap.data() : {};
    let fcode = d.fcode;
    if (!fcode) { fcode = newCode(); await ref.set({ fcode }, { merge: true }); }
    me = { pid: profile.pid, name: profile.name, avatar: profile.avatar, fcode, friends: d.friends || [] };
    const heartbeat = () => ref.set({ seen: FB.now() }, { merge: true }).catch(() => {});
    heartbeat(); beat = setInterval(heartbeat, 60000);
    unsubs.push(ref.onSnapshot((s) => { const x = s.data() || {}; me.friends = x.friends || []; watchFriends(); }));
    unsubs.push(FB.col('requests').where('to', '==', me.pid).onSnapshot((qs) => {
      const prev = new Set(reqDocs.map((r) => r.id));
      reqDocs = qs.docs.map((x) => Object.assign({ id: x.id }, x.data()));
      reqDocs.forEach((r) => { if (!prev.has(r.id) && Date.now() - (r.t || 0) < 120000) emit('request', { code: r.fromCode, name: r.fromName }); });
      emit('change');
    }, () => {}));
    unsubs.push(FB.col('invites').where('to', '==', me.pid).onSnapshot((qs) => {
      qs.docChanges().forEach((ch) => {
        if (ch.type !== 'added') return;
        const v = ch.doc.data();
        ch.doc.ref.delete().catch(() => {});
        if (Date.now() - (v.t || 0) < 10 * 60000) emit('invite', { code: v.fromCode, name: v.fromName, game: v.game });
      });
    }, () => {}));
    return true;
  }
  let friendUnsub = null, lastFriendKey = '';
  function watchFriends() {
    const ids = (me.friends || []).slice(0, 30), key = ids.join(',');
    if (key === lastFriendKey) return; lastFriendKey = key;
    if (friendUnsub) { friendUnsub(); friendUnsub = null; }
    if (!ids.length) { friendDocs = []; emit('change'); return; }
    friendUnsub = FB.col('players').where(firebase.firestore.FieldPath.documentId(), 'in', ids).onSnapshot((qs) => {
      friendDocs = qs.docs.map((x) => { const v = x.data(); return { pid: x.id, code: v.fcode || '??????', name: v.name || 'Player', avatar: v.avatar || null, seen: v.seen || 0 }; });
      emit('change');
    }, () => {});
  }
  setInterval(() => { if (me && friendDocs.length) emit('presence'); }, 60000);
  function stop() {
    unsubs.forEach((u) => { try { u(); } catch (e) {} }); unsubs = [];
    if (friendUnsub) { friendUnsub(); friendUnsub = null; } lastFriendKey = '';
    clearInterval(beat); beat = null; me = null; friendDocs = []; reqDocs = [];
  }
  async function add(code) {
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{6}$/.test(code)) return 'Friend codes are 6 letters/numbers';
    if (!me) return 'Create a player first to add friends';
    if (code === me.fcode) return 'That’s your own code';
    const qs = await FB.col('players').where('fcode', '==', code).limit(1).get();
    if (qs.empty) return 'No player has that code';
    const them = qs.docs[0];
    if ((me.friends || []).includes(them.id)) return 'Already friends';
    // if they already asked me, just accept
    const back = reqDocs.find((r) => r.from === them.id);
    if (back) { await accept(code); return null; }
    await FB.col('requests').doc(me.pid + '_' + them.id).set({ from: me.pid, to: them.id, fromCode: me.fcode, fromName: me.name, fromAvatar: me.avatar || null, t: FB.now() });
    return null;
  }
  async function accept(code) {
    const r = reqDocs.find((x) => x.fromCode === code); if (!r) return;
    const FV = firebase.firestore.FieldValue;
    await FB.col('players').doc(me.pid).set({ friends: FV.arrayUnion(r.from) }, { merge: true });
    await FB.col('players').doc(r.from).set({ friends: FV.arrayUnion(me.pid) }, { merge: true });
    await FB.col('requests').doc(r.id).delete();
    emit('accepted', { code, name: r.fromName });
  }
  async function decline(code) { const r = reqDocs.find((x) => x.fromCode === code); if (r) await FB.col('requests').doc(r.id).delete(); }
  async function remove(code) {
    const f = friendDocs.find((x) => x.code === code); if (!f) return;
    const FV = firebase.firestore.FieldValue;
    await FB.col('players').doc(me.pid).set({ friends: FV.arrayRemove(f.pid) }, { merge: true });
    await FB.col('players').doc(f.pid).set({ friends: FV.arrayRemove(me.pid) }, { merge: true }).catch(() => {});
  }
  async function invite(code, game) {
    const f = friendDocs.find((x) => x.code === code); if (!f) return;
    await FB.col('invites').add({ to: f.pid, from: me.pid, fromCode: me.fcode, fromName: me.name, game, t: FB.now() });
  }
  const friends = () => friendDocs.slice().sort((a, b) => (b.seen > Date.now() - ONLINE_MS) - (a.seen > Date.now() - ONLINE_MS) || a.name.localeCompare(b.name));
  const requests = () => reqDocs.map((r) => ({ code: r.fromCode, name: r.fromName, avatar: r.fromAvatar }));
  const isOnline = (code) => { const f = friendDocs.find((x) => x.code === code); return !!(f && Date.now() - f.seen < ONLINE_MS); };
  const on = (f) => { listeners.add(f); return () => listeners.delete(f); };
  return { ready, start, stop, add, accept, decline, remove, invite, friends, requests, isOnline, on, get code() { return me && me.fcode; }, get active() { return !!me; }, async: true };
})();

/* Turn alerts: watches your online games; shows a system notification when it becomes your turn */
const TurnAlerts = (() => {
  let unsub = null, pid = null; const seen = {};
  const listeners = new Set();
  function supported() { return 'Notification' in window; }
  const enabled = () => supported() && Notification.permission === 'granted';
  async function enable() {
    if (!supported()) return 'unsupported';
    try { const r = await Notification.requestPermission(); return r; } catch (e) { return 'denied'; }
  }
  async function notify(title, body, tag) {
    if (!enabled()) return;
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      const opts = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', renotify: true, data: { url: location.href.split('#')[0] } };
      if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
    } catch (e) {}
  }
  function start(myPid, onTurn) {
    if (Store.kind !== 'firebase' || !myPid) return;
    if (pid === myPid && unsub) return;
    stop(); pid = myPid;
    unsub = FB.col('games').where('pids', 'array-contains', myPid).onSnapshot((qs) => {
      qs.docs.forEach((d) => {
        const g = d.data(); if (!g || g.status !== 'playing' || !g.state) return;
        // Yip yip nudges
        const nz = g.nudge, nkey = 'n:' + d.id, mineSeat = g.guest && g.guest.pid === myPid ? 0 : 1;
        if (nz && nz.t) {
          const pn = seen[nkey]; seen[nkey] = nz.t;
          if (pn !== undefined && nz.t > pn && nz.seat !== mineSeat && Date.now() - nz.t < 10 * 60000) {
            const who = nz.seat === 0 ? g.guest.name : g.host.name;
            if (document.hidden) notify('📣 Yip yip!', `${who} is waiting for your move (game ${d.id})`, 'n-' + d.id);
            listeners.forEach((f) => f('nudge', { code: d.id, who }));
          }
        }
        const v = g.ver || 0, prev = seen[d.id]; seen[d.id] = v;
        if (prev === undefined || v <= prev) return;
        let s; try { s = JSON.parse(g.state); } catch (e) { return; }
        const mySeat = g.guest && g.guest.pid === myPid ? 0 : 1;
        const opp = mySeat === 0 ? g.host.name : g.guest.name;
        if (s.winner !== null && s.winner !== undefined) { if (document.hidden) notify('Pai Sho', s.winner === mySeat ? `You beat ${opp}!` : `${opp} won the game`, 'g-' + d.id); listeners.forEach((f) => f('over', d.id)); return; }
        if (s.turn === mySeat) {
          if (document.hidden) notify('Your turn in Pai Sho', `${opp} has moved — game ${d.id}`, 'g-' + d.id);
          listeners.forEach((f) => f('turn', { code: d.id, opp }));
        }
      });
    }, () => {});
  }
  function stop() { if (unsub) unsub(); unsub = null; pid = null; }
  const on = (f) => { listeners.add(f); return () => listeners.delete(f); };
  return { supported, enabled, enable, start, stop, on, notify };
})();
