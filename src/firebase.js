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
      const auth = firebase.auth();
      try { const rr = await Promise.race([auth.getRedirectResult(), wait(6000).then(() => null)]); if (rr && rr.user && !rr.user.isAnonymous) pendingGoogle = info(rr.user); } catch (e) { console.warn('Google redirect failed', e); }
      const existing = await Promise.race([new Promise((r) => { const un = auth.onAuthStateChanged((u) => { un(); r(u); }); }), wait(6000).then(() => null)]);
      let user = existing;
      if (!user) { const cred = await Promise.race([auth.signInAnonymously(), wait(8000).then(() => null)]); user = cred && cred.user; }
      if (!user) return false;
      uid = user.uid;
      fs = firebase.firestore();
      try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
      return true;
    } catch (e) { console.warn('Firebase unavailable', e); return false; }
  }
  let pendingGoogle = null;
  const info = (u) => ({ uid: u.uid, name: u.displayName || '', email: u.email || '' });
  const googleUser = () => { const u = window.firebase && firebase.apps.length && firebase.auth().currentUser; return u && !u.isAnonymous ? info(u) : null; };
  // Sign in with Google. Returns {uid,name,email}, null if cancelled, or 'redirect' when the page is leaving to sign in.
  async function googleSignIn() {
    const auth = firebase.auth(), provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await auth.signInWithPopup(provider);
      uid = cred.user.uid; return info(cred.user);
    } catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(e.code)) { await auth.signInWithRedirect(provider); return 'redirect'; }
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e.code)) return null;
      throw e;
    }
  }
  async function signOutGoogle() {
    if (!googleUser()) return;
    try { await firebase.auth().signOut(); const c = await firebase.auth().signInAnonymously(); uid = c.user.uid; } catch (e) {}
  }
  async function playerForGoogle(gUid) {
    const qs = await fs.collection('players').where('gUid', '==', gUid).limit(1).get();
    return qs.empty ? null : Object.assign({ id: qs.docs[0].id }, qs.docs[0].data());
  }
  const takePending = () => { const p = pendingGoogle; pendingGoogle = null; return p; };
  const col = (c) => fs.collection(c);
  const now = () => Date.now();
  return { init, col, get fs() { return fs; }, get uid() { return uid; }, now, googleSignIn, signOutGoogle, googleUser, playerForGoogle, takePending };
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
  async function addPid(pid) {
    if (!me) return 'Create a player first to add friends';
    if (pid === me.pid) return 'That’s you!';
    const ref = FB.col('players').doc(pid), d = await ref.get();
    if (!d.exists) return 'Player not found';
    let code = d.data().fcode;
    if (!code) { code = newCode(); await ref.set({ fcode: code }, { merge: true }); }
    return add(code);
  }
  const isFriend = (pid) => !!(me && (me.friends || []).includes(pid));
  const sentTo = (pid) => false;
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
    Push.send(them.id, '🤝 Friend request', `${me.name} wants to be friends in Pai Sho`, 'fr-' + me.pid);
    return null;
  }
  async function accept(code) {
    const r = reqDocs.find((x) => x.fromCode === code); if (!r) return;
    const FV = firebase.firestore.FieldValue;
    await FB.col('players').doc(me.pid).set({ friends: FV.arrayUnion(r.from) }, { merge: true });
    await FB.col('players').doc(r.from).set({ friends: FV.arrayUnion(me.pid) }, { merge: true });
    await FB.col('requests').doc(r.id).delete();
    Push.send(r.from, '🤝 New friend', `${me.name} accepted your friend request`, 'fa-' + me.pid);
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
    Push.send(f.pid, '🎮 Game invite', `${me.name} invited you to a game of Pai Sho`, 'inv-' + me.pid);
  }
  const friends = () => friendDocs.slice().sort((a, b) => (b.seen > Date.now() - ONLINE_MS) - (a.seen > Date.now() - ONLINE_MS) || a.name.localeCompare(b.name));
  const requests = () => reqDocs.map((r) => ({ code: r.fromCode, name: r.fromName, avatar: r.fromAvatar }));
  const isOnline = (code) => { const f = friendDocs.find((x) => x.code === code); return !!(f && Date.now() - f.seen < ONLINE_MS); };
  const on = (f) => { listeners.add(f); return () => listeners.delete(f); };
  return { ready, start, stop, add, addPid, isFriend, accept, decline, remove, invite, friends, requests, isOnline, on, get code() { return me && me.fcode; }, get active() { return !!me; }, async: true };
})();

/* Turn alerts: watches your online games; shows a system notification when it becomes your turn */
/* Closed-app push: subscriptions live in push/{pid}; a small Cloudflare Worker sends them */
const Push = (() => {
  const URL_ = 'https://paisho-push.kelleysills.workers.dev';
  const ready = () => /^https:/.test(URL_) && 'serviceWorker' in navigator && 'PushManager' in window;
  const u8 = (b64) => { b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '='; return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); };
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return 'd' + (h >>> 0).toString(36); };
  async function subscribe(pid) {
    if (!ready() || !pid || pid.startsWith('g-') || Store.kind !== 'firebase' || Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { key } = await (await fetch(URL_ + '/vapid')).json();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) });
      }
      const j = sub.toJSON();
      await FB.col('push').doc(pid).set({ subs: { [hash(j.endpoint)]: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }) }, t: Date.now() }, { merge: true });
      return true;
    } catch (e) { console.warn('push subscribe failed', e); return false; }
  }
  async function send(to, title, body, tag, url) {
    if (!/^https:/.test(URL_) || !to || String(to).startsWith('g-') || Store.kind !== 'firebase') return;
    try {
      const u = firebase.auth().currentUser; if (!u) return;
      const tok = await u.getIdToken();
      fetch(URL_ + '/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ to, title, body, tag, url: url || location.href.split('#')[0].split('?')[0] }), keepalive: true }).catch(() => {});
    } catch (e) {}
  }
  return { ready, subscribe, send };
})();

const TurnAlerts = (() => {
  let unsub = null, pid = null; const seen = {};
  const listeners = new Set();
  function supported() { return 'Notification' in window; }
  const enabled = () => supported() && Notification.permission === 'granted';
  async function enable() {
    if (!supported()) return 'unsupported';
    try { const r = await Notification.requestPermission(); if (r === 'granted') await Push.subscribe(pid); return r; } catch (e) { return 'denied'; }
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
    if (enabled()) Push.subscribe(myPid);
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
