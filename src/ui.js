/* App UI: screens, game controller, online play, stats */
(() => {
  const P = PaiSho, AI = PaiShoAI;
  const Soc = () => (Store.kind === 'firebase' ? FireSocial : Social);
  const app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const initials = (n) => (n || '?').trim().slice(0, 1).toUpperCase();
  const hueOf = (s) => { let h = 0; for (const ch of s || '') h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const hues = {}, avs = {}; // display name -> avatar colour / avatar id
  const noteHue = (p) => { if (p && p.name) { if (p.hue != null) hues[p.name] = p.hue; if (p.avatar && Avatars.has(p.avatar)) avs[p.name] = p.avatar; } return p; };
  const av = (name, cls = '') => avs[name] ? `<span class="avatar av-img ${cls}">${Avatars.svg(avs[name], '100%')}</span>` : `<span class="avatar ${cls}" style="background:hsl(${hues[name] != null ? hues[name] : hueOf(name)},55%,62%)">${esc(initials(name))}</span>`;
  let avatarPid = null;
  const meCard = () => Object.assign({}, me, { avatar: me.avatar || 'whitelotus', isAvatar: !!(me && avatarPid && me.id === avatarPid), lvl: Eco.lvl(me), xp: me.xp || 0 });
  const APP_V = 20261117; // bump when the rules engine changes so outdated opponents get flagged
  const myFig = () => (me ? Figure.of(me, Eco.lvl(me)) : null);
  const amAvatar = () => !!(me && avatarPid && me.id === avatarPid);
  const saveMe = () => (me ? (delete me._mig, Store.set('players', me.id, me)).catch(() => toast('Couldn’t save — check your connection')) : Promise.resolve());
  // pull counters from the server so a stale copy in memory never overwrites an admin fix or another device
  async function syncCounters() {
    if (!me) return;
    try { const sv = await Store.get('players', me.id); if (sv && (sv.melonUses || 0) > (me.melonUses || 0)) { me.melonUses = sv.melonUses; Eco.ensure(me); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncCounters(); });
  async function loadAvatar() { try { const m = await Store.get('meta', 'avatar'); avatarPid = (m && m.pid) || null; } catch (e) {} }
  function ensureMe() { if (!me) return; const before = JSON.stringify([me.gp, me.owned, me.rating, me.ranked, me.board]); Eco.ensure(me); if (before !== JSON.stringify([me.gp, me.owned, me.rating, me.ranked, me.board])) saveMe(); }
  const gpFmt = (n) => '🪙 ' + (n || 0).toLocaleString();
  const myBoard = () => (me && Eco.ownsBoard(me, me.board) ? me.board : 'classic');
  const avLock = (prof) => (id) => (Eco.ownsAvatar(prof, id) ? null : Avatars.price(id) || Eco.AVATAR_PRICE);
  async function buy(kind, id, price, label) {
    if (!me) { toast('Create a player to earn and spend gold'); return false; }
    ensureMe();
    if ((me.gp || 0) < price) { toast(`You need ${price} gp — you have ${me.gp}. Win games to earn more!`); return false; }
    const ok = await choose(`Unlock ${label}?`, [{ label: `Buy for ${gpFmt(price)}`, value: true, cls: 'primary' }], `You have ${gpFmt(me.gp)}.`);
    if (!ok) return false;
    me.gp -= price; me.owned[kind] = [...new Set((me.owned[kind] || []).concat([id]))];
    await saveMe(); toast(`Unlocked ${label}!`); setTimeout(checkAch, 1200); return true;
  }
  let achBusy = false;
  let bumpT = null;
  function bump(k, n = 1) { if (!me) return; me[k] = (me[k] || 0) + n; clearTimeout(bumpT); bumpT = setTimeout(() => { saveMe(); checkAch(); }, 2500); }
  async function checkAch() {
    if (!me || achBusy) return;
    achBusy = true;
    try {
      Eco.ensure(me); me.ach = me.ach || {};
      const ctx = { isAvatar: amAvatar(), friends: Store.kind === 'firebase' && FireSocial.active ? FireSocial.friends().length : (Social.friends ? Social.friends().length : 0) };
      const got = Eco.ACH.filter((a) => !me.ach[a.id] && a.ok(me, ctx));
      if (!got.length) return;
      got.forEach((a) => { me.ach[a.id] = Date.now(); me.gp += a.gp; });
      await saveMe();
      const shown = got.slice(0, 2), rest = got.slice(2);
      shown.forEach((a, k) => setTimeout(() => toast(`${a.icon || '🏆'} ${a.name}! +${a.gp.toLocaleString()} gp`, 3500), k * 1800));
      if (rest.length) setTimeout(() => toast(`🏆 +${rest.length} more achievements! +${rest.reduce((n, a) => n + a.gp, 0).toLocaleString()} gp`, 4000), shown.length * 1800);
      if (document.querySelector('[data-act="startSetup"]')) screens.home();
    } finally { achBusy = false; }
  }
  const myAvatar = () => (me && me.avatar) || Store.LS.get('guestAvatar', null);
  function bindPicker(root, onPick) { root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-av]'); if (!b) return;
    if (b.dataset.price) {
      if (!me) return toast('Unlock more pictures in the Store once you’ve created your player');
      if (!(await buy('avatars', b.dataset.av, +b.dataset.price, Avatars.label(b.dataset.av) + ' picture'))) return;
      b.classList.remove('locked'); delete b.dataset.price; const l = b.querySelector('.av-lock'); if (l) l.remove();
    }
    root.querySelectorAll('.av-opt').forEach((x) => x.classList.toggle('on', x === b)); onPick(b.dataset.av); }); }
  const HUES = [8, 28, 45, 95, 150, 190, 215, 265, 300, 335];
  const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  let me = null;
  let G = null;
  const setup = { mode: 'ai', level: 'medium', first: 'me', fx: [[], []], fxTab: 0, minH: 4, timer: 0, chance: false, enigma: false, hints: true, p2: { name: 'Player 2', pid: null } };
  Object.assign(setup, Store.LS.get('setup', {}), { mode: 'ai', fxTab: 0, p2: { name: 'Player 2', pid: null } });

  // ---------- small UI helpers ----------
  function toast(msg, ms = 2200) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  let sheetResolve = null;
  function sheet(html, opts = {}) {
    closeSheet();
    const bg = document.createElement('div'); bg.className = 'sheet-bg'; bg.id = 'sheet';
    bg.innerHTML = `<div class="sheet" style="${opts.tall ? 'height:88dvh' : ''}"><div class="sheet-head"><div class="grab"></div><button class="sheet-x" data-act="closeSheet" aria-label="Close">✕</button></div>${html}</div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg && !opts.modal) closeSheet(); });
    document.body.appendChild(bg);
    return bg;
  }
  function closeSheet(v) { const s = document.getElementById('sheet'); if (s) s.remove(); if (sheetResolve) { const r = sheetResolve; sheetResolve = null; r(v); } }
  function choose(title, options, sub = '') {
    return new Promise((res) => {
      sheet(`<h3>${esc(title)}</h3>${sub ? `<p class="muted">${sub}</p>` : ''}<div class="menu">${options.map((o, k) => `<button class="btn ${o.cls || ''}" data-act="choose" data-k="${k}">${o.label}</button>`).join('')}<button class="btn ghost" data-act="choose" data-k="-1">Cancel</button></div>`);
      sheetResolve = (k) => res(k == null || k < 0 || !options[k] ? null : options[k].value);
    });
  }
  function confirmBox(title, msg, okLabel = 'OK', danger = false) {
    return choose(title, [{ label: okLabel, value: true, cls: danger ? 'danger' : 'primary' }], esc(msg));
  }
  function logoSvg(size = 120) {
    return `<svg class="logo" style="width:${size}px;height:${size}px" viewBox="-9.6 -9.6 19.2 19.2">${Board.base()}<g transform="scale(2.4)">${Glyphs.tile('lotus', 0)}</g></svg>`;
  }

  // ---------- profiles ----------
  const emptyStats = () => ({ games: 0, wins: 0, losses: 0, draws: 0, ai: { easy: [0, 0, 0], medium: [0, 0, 0], hard: [0, 0, 0] }, local: [0, 0, 0], online: [0, 0, 0], streak: 0, best: 0, rings: 0, recent: [] });
  async function players() { try { return (await Store.list('players')).filter((p) => p && p.name).map((p) => Eco.ensure(p)).map(noteHue).sort((a, b) => a.name.localeCompare(b.name)); } catch (e) { return []; } }
  // ---- unique display names: "Aang", "aang" and "A-ang" are the same name ----
  function normName(n) {
    const raw = String(n || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const k = raw.replace(/[^a-z0-9]/g, '');
    return k || raw.replace(/\s+/g, '');
  }
  const nameKey = (n) => encodeURIComponent(normName(n)).slice(0, 120);
  async function nameFree(name, pid) {
    const k = normName(name); if (!k) return false;
    const list = await players();
    if (list.some((p) => p.id !== pid && normName(p.name) === k)) return false;
    if (Store.kind === 'firebase') { try { const d = await FB.col('names').doc(nameKey(name)).get(); if (d.exists && d.data().pid !== pid) return false; } catch (e) {} }
    return true;
  }
  // Reserve a name for this player (atomic online). Returns false if someone else has it.
  async function claimName(name, pid) {
    if (!(await nameFree(name, pid))) return false;
    if (Store.kind !== 'firebase') return true;
    const ref = FB.col('names').doc(nameKey(name));
    try {
      return await FB.fs.runTransaction(async (t) => { const d = await t.get(ref); if (d.exists && d.data().pid !== pid) return false; t.set(ref, { pid, name, t: Date.now() }); return true; });
    } catch (e) { console.warn('name claim failed', e); return false; }
  }
  async function releaseName(name, pid) {
    if (Store.kind !== 'firebase' || normName(name) === '') return;
    try { const ref = FB.col('names').doc(nameKey(name)); const d = await ref.get(); if (d.exists && d.data().pid === pid) await ref.delete(); } catch (e) {}
  }
  const TAKEN = 'That name is taken — try another';
  function liveNameCheck(inputId, hintId, pid) {
    const inp = document.getElementById(inputId), hint = document.getElementById(hintId); if (!inp || !hint) return;
    let tm = null, seq = 0;
    const run = () => {
      const v = inp.value.trim(), my = ++seq;
      if (!v || (me && pid === me.id && normName(v) === normName(me.name))) { hint.textContent = ''; return; }
      hint.textContent = 'Checking…'; hint.className = 'tiny name-hint';
      nameFree(v, pid).then((ok) => { if (my !== seq) return; hint.textContent = ok ? '✓ Available' : '✕ Taken'; hint.className = 'tiny name-hint ' + (ok ? 'ok' : 'bad'); });
    };
    inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 450); });
    if (inp.value.trim()) run();
  }
  function myPid() { if (me) return me.id; let g = Store.LS.get('guestId'); if (!g) { g = 'g-' + Auth.rid(6); Store.LS.set('guestId', g); } return g; }
  const myName = () => (me ? me.name : Store.LS.get('guestName', 'Guest'));

  async function recordResult(pid, mode, level, res, opp, turns, ring, oppPid, trk = null, myTurns = 0) {
    if (!pid || pid.startsWith('g-')) return null;
    try {
      const p = await Store.get('players', pid); if (!p) return null;
      Eco.ensure(p);
      if (G && G.s && G.s.opts.subPractice) { // practice: small flat reward, no record, no rank
        const lv0 = Eco.lvl(p);
        p.gp = (p.gp || 0) + 30; p.xp = (p.xp || 0) + 10; p.gpPeak = Math.max(p.gpPeak || 0, p.gp);
        await Store.set('players', pid, p); if (me && me.id === pid) me = p;
        return { gp: 30, xp: 10, practice: true, xpBefore: p.xp - 10, xpAfter: p.xp, levelUp: Eco.lvl(p) > lv0, delta: 0 };
      }
      const bst = Eco.boost();
      const out = { gp: Math.round(Eco.earnings(mode, level, res, ring) * bst.gp), delta: 0, rating: p.rating, boost: bst.name ? bst : null };
      p.gp += out.gp;
      const isMe = me && me.id === pid;
      const spam = isMe && G ? Math.min(60, G.spam || 0) : 0; // 5 XP each, capped at 300 XP a match
      out.xp = Math.round((Eco.xpFor(mode, res) + (mode === 'online' ? spam * 5 : 0)) * bst.xp);
      out.xpBefore = p.xp || 0;
      const lvBefore = Eco.lvl(p), subBefore = (p.xp || 0) >= Eco.SUB_XP;
      p.xp = (p.xp || 0) + out.xp;
      const today = new Date().toISOString().slice(0, 10);
      if (p.lastDay !== today) { p.lastDay = today; p.daysPlayed = (p.daysPlayed || 0) + 1; }
      out.levelUp = Eco.lvl(p) > lvBefore; out.subUnlocked = !subBefore && p.xp >= Eco.SUB_XP;
      if (isMe && G) p.bends = (p.bends || 0) + (G.bendsUsed || 0) + (G.spam || 0);
      if (isMe && G && G.s.melon && G.s.melon.bonus[G.my != null ? G.my : 0] && mode !== 'local') { const bg = Math.round(50 * bst.gp), bx = Math.round(50 * bst.xp); p.gp += bg; out.gp += bg; p.xp += bx; out.xp += bx; out.melon = true; }
      if (mode === 'online' && oppPid && !oppPid.startsWith('g-')) {
        const o = await Store.get('players', oppPid).catch(() => null);
        const oppR = o && typeof o.rating === 'number' ? o.rating : Eco.START_RATING;
        const nr = Eco.newRating(p.rating, oppR, res); out.delta = nr - p.rating; p.rating = nr; out.rating = nr; p.ratingPeak = Math.max(p.ratingPeak || 0, nr);
        p.ranked[res === 'w' ? 'w' : res === 'l' ? 'l' : 'd']++;
        out.ranked = true;
      }
      const st = Object.assign(emptyStats(), p.stats || {});
      const k = res === 'w' ? 0 : res === 'l' ? 1 : 2;
      if (mode === 'ai') { st.ai[level] = st.ai[level] || [0, 0, 0]; st.ai[level][k]++; } // computer games are practice: separate record only
      else {
        st[mode][k]++; st.games++; st[['wins', 'losses', 'draws'][k]]++;
        st.streak = res === 'w' ? st.streak + 1 : 0; st.best = Math.max(st.best, st.streak);
        if (res === 'w' && ring) st.rings++;
      }
      st.v2 = true;
      if (trk) { // play style for this match
        const sty = Eco.styleOf(trk); out.style = sty;
        p.style = p.style || { counts: {}, sums: {} };
        p.style.counts[sty] = (p.style.counts[sty] || 0) + 1;
        Object.entries(Eco.styleScores(trk)).forEach(([k, v]) => { p.style.sums[k] = (p.style.sums[k] || 0) + v; });
      }
      if (res === 'w' && myTurns > 0) {
        const key = mode === 'ai' ? 'fastestAi' : 'fastest';
        if (!st[key] || myTurns < st[key]) { st[key] = myTurns; out.fastest = myTurns; out.fastestKey = key; }
      }
      st.recent = [{ t: Date.now(), mode, level, res, opp, turns }].concat(st.recent || []).slice(0, 20);
      p.gpPeak = Math.max(p.gpPeak || 0, p.gp || 0);
      p.stats = st; out.xpAfter = p.xp; await Store.set('players', pid, p);
      if (me && me.id === pid) me = p;
      return out;
    } catch (e) { console.warn(e); return null; }
  }
  // decide the Avatar from ranked ratings; ties trigger a trial match
  async function updateAvatar() {
    try {
      const list = (await Store.list('players')).filter((p) => p && p.name).map(Eco.ensure);
      const r = Eco.computeAvatar(list);
      const meta = (await Store.get('meta', 'avatar').catch(() => null)) || {};
      delete meta.id;
      if (r.pid && r.pid !== meta.pid) {
        const pl = list.find((x) => x.id === r.pid);
        await Store.set('meta', 'avatar', { pid: r.pid, name: pl.name, since: Date.now(), trial: null });
        if (me && me.id === r.pid) toast('👑 You are now the Avatar! Every nation’s emotes are unlocked.', 5000);
      } else if (!r.pid && r.tie) {
        const pids = r.tie.map((x) => x.id).sort();
        const t = meta.trial;
        if (!(t && t.pids && t.pids.join() === pids.join() && Date.now() - t.t < 3 * 864e5)) {
          const code = await createTrial(r.tie[0], r.tie[1]);
          await Store.set('meta', 'avatar', Object.assign({}, meta, { trial: { code, pids, t: Date.now() } }));
        }
      }
      avatarPid = r.pid || (meta.pid && !(list.find((x) => x.id === meta.pid) || {}).pastLife ? meta.pid : null);
    } catch (e) { console.warn(e); }
  }
  async function createTrial(a, b) {
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const fxOf = (p) => { const lo = Array.isArray(p.loadouts) && p.loadouts[p.activeLoadout | 0]; return lo ? (lo.fx || []).filter((t) => Eco.ownsTile(p, t)).slice(0, 6) : []; };
    const host = { pid: a.id, name: a.name, avatar: a.avatar || null, fig: Figure.of(a, Eco.lvl(a)), fx: fxOf(a) }, guest = { pid: b.id, name: b.name, avatar: b.avatar || null, fig: Figure.of(b, Eco.lvl(b)), fx: fxOf(b) };
    const s = P.newGame({ effects: [guest.fx, host.fx], minHarmonies: 4 });
    await Store.set('games', code, { code, status: 'playing', trial: true, created: Date.now(), updated: Date.now(), ver: 1, state: JSON.stringify(s), opts: { minH: 4, timer: 0, chance: false, enigma: false }, host, guest, pids: [a.id, b.id] });
    if (Store.kind === 'firebase') for (const p of [a, b]) FB.col('invites').add({ to: p.id, from: 'system', fromCode: 'AVATAR', fromName: '👑 Avatar Trial', game: code, t: Date.now() }).catch(() => {});
    return code;
  }

  // ---------- screens ----------
  const screens = {};
  function go(name, ...args) { if (typeof D !== 'undefined' && D) duelEnd(); if (typeof spiritHubUn !== 'undefined' && spiritHubUn) { spiritHubUn(); spiritHubUn = null; } if (name !== 'dm' && dmUnsub) { dmUnsub(); dmUnsub = null; dmOpen = null; } if (name === 'loadouts') loTab = null; Music.stop(); closeSheet(); stopGameTimers(); if (name !== 'lobby' && lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; } screens[name](...args); window.scrollTo(0, 0); }

  screens.boot = async () => {
    app.innerHTML = `<div class="screen" style="justify-content:center;align-items:center">${logoSvg(140)}<div class="muted">Opening the garden gate…</div></div>`;
    await Store.init();
    if (Store.kind === 'firebase') { const pg = FB.takePending(); if (pg) { go('login'); return googleContinue(pg); } }
    const sess = Store.LS.get('session');
    if (sess) {
      const p = await Store.get('players', sess).catch(() => null);
      if (p && Store.kind === 'firebase' && !FB.owns(p) && !(await FB.stamp(p.id))) {
        // the profile isn't linked to this phone's sign-in yet: one PIN entry links it
        rememberProfile(p.id); go('login'); toast('Enter your PIN once to keep playing on this phone', 4000);
        return loginFlow(p, (pp) => finishSignIn(pp));
      }
      if (p) { me = p; rememberProfile(p.id); return go('home'); }
    }
    go('login');
  };

  const knownIds = () => Store.LS.get('knownProfiles', []);
  function rememberProfile(id) { const k = knownIds().filter((x) => x !== id); k.unshift(id); Store.LS.set('knownProfiles', k.slice(0, 12)); }
  const DISCLAIMER = `<div class="disclaimer">Unofficial, free fan project. Not affiliated with, endorsed by or sponsored by Nickelodeon, Paramount or Viacom. <i>Avatar: The Last Airbender</i> and related names are trademarks of their owners. Key Pai Sho rules by The Garden Gate Games. All art in this app is original. Avatar Airbender font by FontGet.com.</div>`;
  const GOOGLE_G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l8 6.2C12.6 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.7 28.5c-.5-1.4-.8-3-.8-4.5s.3-3.1.8-4.5l-8-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l8-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.4-4.1-13.3-9.7l-8 6.2C6.6 42.6 14.6 48 24 48z"/></svg>';
  const GOOGLE_BONUS = 1500;
  function finishSignIn(p) {
    Soc().stop(); FireSocial.stop(); TurnAlerts.stop(); me = p; rememberProfile(p.id); Store.LS.set('session', p.id);
    if (p.gUid && !p.gBonus) {
      Eco.ensure(me); me.gp = (me.gp || 0) + GOOGLE_BONUS; me.gBonus = true;
      Store.set('players', me.id, { gp: me.gp, gBonus: true }).catch(() => {});
      setTimeout(() => toast('🪙 +' + GOOGLE_BONUS.toLocaleString() + ' gp — thanks for linking Google!'), 600);
    }
    go('home');
  }
  // After Google sign-in: linked profile → straight in; otherwise ask new or returning.
  async function googleContinue(g) {
    let p = null;
    try { p = await FB.playerForGoogle(g.uid); } catch (e) { return toast('Couldn’t look up your account — check your connection'); }
    if (p) { toast('Welcome back, ' + p.name); return finishSignIn(p); }
    const pick = await choose('Welcome to Pai Sho!', [{ label: 'I’m new — create a player', value: 'new', cls: 'primary' }, { label: 'I’m returning — I already have a player', value: 'ret' }], 'Are you new here, or have you played before? Returning players keep all their stats, gold and rank. Either way you get a 🪙 1,500 gp bonus for linking Google.');
    if (pick === 'new') return go('newProfile', { gUid: g.uid, gName: g.name });
    if (pick !== 'ret') { await FB.signOutGoogle(); return; }
    sheet(`<h3>Welcome back</h3><form id="gret" class="menu"><div class="field"><label>Your display name</label><input class="input" id="gr-name" maxlength="18" autocomplete="username" required></div><div class="tiny muted">Next you’ll enter your PIN. After that, Google signs you straight in.</div><button class="btn primary" type="submit">Next</button></form>`);
    setTimeout(() => { const i = document.getElementById('gr-name'); if (i) i.focus(); }, 50);
    document.getElementById('gret').addEventListener('submit', async (e) => {
      e.preventDefault();
      const n = document.getElementById('gr-name').value.trim().toLowerCase(); if (!n) return;
      const found = (await players()).find((x) => x.name.toLowerCase() === n);
      if (!found) return toast('No player with that name');
      if (found.gUid && found.gUid !== g.uid) return toast('That player is linked to a different Google account');
      closeSheet();
      loginFlow(found, async (pp) => {
        try { await Store.set('players', pp.id, { gUid: g.uid }); pp.gUid = g.uid; } catch (err) { toast('Signed in, but couldn’t link Google — try again later'); }
        toast('Google linked to ' + pp.name);
        finishSignIn(pp);
      });
    });
  }
  screens.login = async () => {
    let list = await players();
    if (Store.kind === 'firebase') list = list.filter((p) => knownIds().includes(p.id));
    const where = { firebase: 'Profiles, stats, friends and games are saved online — sign in from any phone with your name and PIN.', artifact: 'Profiles and stats are saved with this app and shared with everyone you invite.', server: 'Profiles and stats are saved on your PC server.', local: 'Profiles and stats are saved on this device only.' }[Store.kind];
    app.innerHTML = `<div class="screen">
      <div class="title">${logoSvg()}<h1>Pai Sho</h1><div class="sub">Key Pai Sho · The Garden Game</div></div>
      <div class="field"><label>Who's playing?</label></div>
      <div class="plist">${list.map((p) => `<button class="prof" data-act="pickProfile" data-id="${esc(p.id)}">${av(p.name)}<div><div class="nm">${esc(p.name)}</div><div class="tiny muted">${(p.stats && p.stats.games) || 0} games · ${(p.stats && p.stats.wins) || 0} wins ${p.cred ? '· 🔒 biometric' : ''}</div></div></button>`).join('') || '<div class="card muted">No players yet. Create one to track your stats.</div>'}</div>
      ${Store.kind === 'firebase' ? `<button class="btn gbtn" data-act="googleSignIn">${GOOGLE_G}<span>Sign in with Google</span></button><div class="or"><span>or</span></div>` : ''}
      <button class="btn primary" data-act="newProfile">＋ New player</button>
      ${Store.kind === 'firebase' ? '<button class="btn" data-act="findProfile">Sign in to an existing player</button>' : ''}
      <button class="btn ghost" data-act="guestPlay">Play as guest (no stats)</button>
      <div class="spacer"></div><div class="tiny muted" style="text-align:center">${where}</div>${DISCLAIMER}</div>`;
  };

  function pinPad(title, sub, onDone, extra = '') {
    let pin = '';
    const draw = () => {
      const dots = document.querySelector('.pin-dots');
      if (dots) dots.innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, k) => `<i class="${k < pin.length ? 'f' : ''}"></i>`).join('');
    };
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="login">‹</button><h2>${esc(title)}</h2><span style="width:42px"></span></div>
      <div class="screen" style="justify-content:center"><div style="text-align:center">${sub}</div><div class="pin-dots"></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-pin="${n}">${n}</button>`).join('')}<button data-pin="bio" style="font-size:22px">${extra ? '🔒' : ''}</button><button data-pin="0">0</button><button data-pin="del">⌫</button></div>
      <button class="btn primary" data-pin="ok" style="max-width:300px;margin:8px auto 0;width:100%">Unlock</button></div>`;
    draw();
    app.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', async () => {
      const v = b.dataset.pin;
      if (v === 'del') pin = pin.slice(0, -1);
      else if (v === 'bio') { if (extra) extra(); return; }
      else if (v === 'ok') { if (pin.length >= 4) { const ok = await onDone(pin); if (!ok) { pin = ''; const d = document.querySelector('.pin-dots'); d.classList.add('shake'); setTimeout(() => d.classList.remove('shake'), 400); } } }
      else if (pin.length < 6) { pin += v; buzz(6); }
      draw();
    }));
  }

  // Online check of a PIN: the database compares it with the hidden hash and adds this phone to the profile's owners.
  async function checkPinOnline(p, pin) {
    const h = await Auth.hash(pin, p.salt);
    const legacyOk = !!p.pin && h === p.pin; // profiles made before the PIN hash moved out of the profile
    if (p.pin && !legacyOk) return 'wrong';
    let ok;
    try { ok = await FB.claim(p.id, h); } catch (e) { return 'offline'; }
    if (!ok) {
      if (!legacyOk) return 'wrong';
      await FB.stamp(p.id); // database rules from before PIN claims
    }
    p.uids = Array.from(new Set((p.uids || []).concat(FB.uid)));
    if (ok && legacyOk) { const s2 = Auth.rid(10); if (await FB.savePin(p.id, s2, await Auth.hash(pin, s2))) { p.salt = s2; delete p.pin; } }
    return 'ok';
  }
  async function loginFlow(p, onOk, backTo = 'login') {
    const online = Store.kind === 'firebase';
    const bio = p.cred && await Auth.bioAvailable();
    const tryBio = async () => {
      try {
        if (!(await Auth.bioVerify(p.cred))) return;
        if (online && !FB.owns(p)) {
          if (!(await FB.stamp(p.id))) return toast('Enter your PIN once on this phone');
          p.uids = Array.from(new Set((p.uids || []).concat(FB.uid)));
        }
        return onOk(p);
      } catch (e) { toast('Biometric unavailable here — use your PIN'); }
    };
    pinPad(p.name, `${av(p.name)}<div class="muted" style="margin-top:8px">Enter your PIN</div>`, async (pin) => {
      if (online) {
        const r = await checkPinOnline(p, pin);
        if (r === 'ok') { onOk(p); return true; }
        toast(r === 'offline' ? 'Couldn’t check your PIN — check your connection' : 'Wrong PIN'); return false;
      }
      const h = await Auth.hash(pin, p.salt);
      if (h === p.pin) { onOk(p); return true; }
      toast('Wrong PIN'); return false;
    }, bio ? tryBio : '');
    if (bio) setTimeout(tryBio, 300);
    const back = app.querySelector('[data-act="go"]'); if (back) back.dataset.to = backTo;
  }

  screens.newProfile = async (gopt = {}) => {
    const bio = await Auth.bioAvailable();
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="login">‹</button><h2>New player</h2><span style="width:42px"></span></div>
      <form class="screen" id="npf">
        <div class="field"><label>Player name</label><input class="input" id="np-name" maxlength="18" autocomplete="nickname" required value="${esc((gopt.gName || '').split(' ')[0].slice(0, 18))}"><div class="tiny name-hint" id="np-hint"></div></div>
        <div class="field"><label>Your nation</label><div class="nat-pick" id="np-nat">${Object.entries(Eco.NATIONS).map(([k, n]) => `<button type="button" class="nat" data-nat="${k}">${Avatars.svg(n.icon, 40)}<b style="color:${n.color}">${n.name}</b></button>`).join('')}</div><div class="tiny muted">Unlocks your nation’s emotes and board. You start with ${Eco.START_GP.toLocaleString()} gold pieces.</div></div>
        <div class="field"><label>Avatar</label><div id="np-av"></div></div>
        <div class="field"><label>PIN (4–6 digits)</label><input class="input" id="np-pin" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" type="password" required></div>
        <div class="field"><label>Confirm PIN</label><input class="input" id="np-pin2" inputmode="numeric" maxlength="6" type="password" required></div>
        <div class="toggle"><div><b>Use biometrics</b><div class="tiny muted">${bio ? 'Face / fingerprint unlock on this device' : 'Not available in this browser — PIN only'}</div></div><span class="sw ${bio ? 'on' : ''}" id="np-bio" data-act="sw" ${bio ? '' : 'style="opacity:.4"'}></span></div>
        <div class="toggle"><div><b>Keep me signed in</b><div class="tiny muted">On this device</div></div><span class="sw on" id="np-keep" data-act="sw"></span></div>
        <div class="tiny muted">Your PIN keeps casual players out of your stats. It isn't bank-grade security — don't reuse an important PIN.</div>
        <button class="btn primary" type="submit">Create player</button></form>`;
    liveNameCheck('np-name', 'np-hint', null);
    let pickedAv = Eco.FREE_AVATARS[Math.floor(Math.random() * Eco.FREE_AVATARS.length)], pickedNat = null;
    const npav = document.getElementById('np-av'); npav.innerHTML = Avatars.picker(pickedAv, avLock(null)); bindPicker(npav, (id) => (pickedAv = id));
    const npn = document.getElementById('np-nat');
    npn.addEventListener('click', (e) => { const b = e.target.closest('[data-nat]'); if (!b) return; pickedNat = b.dataset.nat; npn.querySelectorAll('.nat').forEach((x) => x.classList.toggle('on', x === b)); });
    document.getElementById('npf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('np-name').value.trim().replace(/\s+/g, ' ');
      const pin = document.getElementById('np-pin').value, pin2 = document.getElementById('np-pin2').value;
      if (!name) return toast('Enter a name');
      if (!/^\d{4,6}$/.test(pin)) return toast('PIN must be 4–6 digits');
      if (pin !== pin2) return toast('PINs don’t match');
      if (!pickedNat) return toast('Pick your nation');
      const id = 'p-' + Auth.rid(8).replace(/[^A-Za-z0-9]/g, 'x');
      if (!(await claimName(name, id))) return toast(TAKEN);
      const salt = Auth.rid(10);
      const p = Eco.ensure({ id, name, salt, pin: await Auth.hash(pin, salt), created: Date.now(), stats: emptyStats(), cred: null, avatar: pickedAv, nation: pickedNat, board: pickedNat });
      if (gopt.gUid) { p.gUid = gopt.gUid; p.gp = (p.gp || 0) + GOOGLE_BONUS; p.gBonus = true; setTimeout(() => toast('🪙 +' + GOOGLE_BONUS.toLocaleString() + ' gp Google sign-in bonus!'), 800); }
      if (bio && document.getElementById('np-bio').classList.contains('on')) {
        try { p.cred = await Auth.bioRegister(p); } catch (err) { toast('Biometric setup skipped — PIN only'); }
      }
      try {
        if (Store.kind === 'firebase') {
          p.uids = await FB.createPlayer(p);
          if (await FB.savePin(id, p.salt, p.pin)) delete p.pin;
          else await FB.savePinPublic(id, p.salt, p.pin);
        } else await Store.set('players', id, p);
      } catch (err) { return toast('Couldn’t save the player (no write access?)'); }
      me = p; rememberProfile(id);
      if (document.getElementById('np-keep').classList.contains('on')) Store.LS.set('session', id);
      startTutorial();
    });
  };

  let nameChecked = null;
  screens.home = () => {
    if (me && nameChecked !== me.id) { nameChecked = me.id; if (Store.kind === 'firebase') claimName(me.name, me.id).catch(() => {}); Eco.ensure(me); if (me._mig) { delete me._mig; saveMe(); } }
    ensureMe();
    setTimeout(checkAch, 800);
    if (me && !Eco.dailyState(me).claimed && Store.LS.get('dailyShown') !== me.id + Eco.dayKey()) { Store.LS.set('dailyShown', me.id + Eco.dayKey()); setTimeout(() => { if (document.querySelector('[data-act="startSetup"]') && !document.querySelector('.sheet')) dailyOpen(); }, 700); }
    noteHue(me);
    setTimeout(() => { if (document.querySelector('[data-act="startSetup"]')) newsCheck(); }, 1600);
    if (!screens.home._av) { screens.home._av = true; loadAvatar().then(() => { if (document.querySelector('[data-act="startSetup"]')) screens.home(); }); }
    startSocial();
    const nm = myName();
    const st = (me && me.stats) || null;
    app.innerHTML = `<div class="screen">
      <div class="row"><button class="pill" data-act="profileSheet">${av(nm)}${esc(nm)}</button><span class="spacer"></span>${me ? `<button class="gp-pill" data-act="go" data-to="store">${gpFmt(me.gp)}</button>` : ''}<button class="iconbtn" data-act="go" data-to="guide" aria-label="Rules">?</button></div>
      <div class="title" style="padding:0">${logoSvg(84)}<h1 style="font-size:28px">Pai Sho</h1></div>
      ${me && !me.fig ? `<button class="daily-card" data-act="go" data-to="character"><span class="dc-i">🧍</span><span class="dc-t"><b>Create your character</b><small>Pick your look, hair and outfit</small></span></button>` : ''}
      ${me && !Eco.dailyState(me).claimed ? `<button class="daily-card" data-act="dailyOpen"><span class="dc-i">🎁</span><span class="dc-t"><b>Daily reward ready</b><small>Day ${Eco.dailyState(me).streak} streak · +${Eco.dailyReward(Eco.dailyState(me).streak).gp} gp, +${Eco.dailyReward(Eco.dailyState(me).streak).xp} XP</small></span><span class="dc-b">Claim</span></button>` : ''}
      ${(() => { const b = Eco.boost(); return b.name ? `<div class="event-banner ${b.xp >= 100 ? 'big' : ''}">${b.icon} <b>${b.name}!</b> ${b.xp}× XP · ${b.gp}× gold on every game today</div>` : ''; })()}
      ${me ? `<button style="text-align:left;padding:0" data-act="profileSheet">${Avatars.card(meCard(), esc)}</button>` : `<div class="sub muted" style="text-align:center;letter-spacing:.2em;text-transform:uppercase;font-size:13px">Guest mode</div>`}
      <div class="menu">
        <button class="btn primary" data-act="startSetup" data-mode="ai">${icon('cpu')}<span class="lbl">Play the computer<small>Easy, medium or hard</small></span></button>
        <button class="btn" data-act="startSetup" data-mode="local">${icon('pass')}<span class="lbl">Pass &amp; play<small>Two players, one phone</small></span></button>
        <button class="btn" data-act="go" data-to="lobby">${icon('net')}<span class="lbl">Play online<small>${Store.online() ? 'Create or join a game with a code' : 'Needs an internet connection'}</small></span></button>
        ${(Store.kind === 'firebase' || (Social.ready() && Store.kind === 'local')) ? `<button class="btn" data-act="go" data-to="friends">${icon('friends')}<span class="lbl">Friends<small>${friendsLine()}</small></span></button>` : ''}
        ${me && me.pastLife ? `<button class="btn" data-act="go" data-to="spirit"><span style="font-size:22px;width:28px;text-align:center">👻</span><span class="lbl">Watch over the Avatar<small>Spectate their matches · 2 bends per match, then hints</small></span></button>` : ''}
        <button class="btn" data-act="go" data-to="duel"><span style="font-size:22px;width:28px;text-align:center">🥋</span><span class="lbl">Bending duel<small>Fight a friend in real time · win their gold</small></span></button>
        <button class="btn" data-act="go" data-to="achievements">${icon('ach')}<span class="lbl">Achievements<small>${me ? `${Eco.ACH.filter((a) => (me.ach || {})[a.id]).length}/${Eco.ACH.length} · Lv ${Eco.lvl(me)} · ${(me.xp || 0).toLocaleString()} XP` : 'Create a player to earn rewards'}</small></span></button>
        <button class="btn" data-act="go" data-to="store">${icon('store')}<span class="lbl">Store<small>${me ? gpFmt(me.gp) + ' · tiles, pictures, emotes, boards' : 'Create a player to earn gold'}</small></span></button>
        <button class="btn" data-act="go" data-to="loadouts">${icon('loadout')}<span class="lbl">Loadouts<small>Equipped: ${esc(equipped().name)} · ${loIcons(equipped().fx, 16)}</small></span></button>
        <button class="btn" data-act="go" data-to="guide">${icon('book')}<span class="lbl">How to play<small>Rules, tiles &amp; diagrams</small></span></button>
        <button class="btn" data-act="go" data-to="stats">${icon('chart')}<span class="lbl">Stats &amp; leaderboard<small>${me ? 'Your record and everyone’s' : 'Sign in to track stats'}</small></span></button>
      </div><div class="disclaimer">Unofficial free fan project · not affiliated with Nickelodeon · <a href="#" data-act="go" data-to="guide" style="color:inherit">credits</a></div></div>`;
  };
  function icon(k) {
    const s = { cpu: Glyphs.svg('wheel', 1, 'class="ic"'), pass: Glyphs.svg('koi', 0, 'class="ic"'), net: Glyphs.svg('skybison', 1, 'class="ic"'), book: Glyphs.svg('lotus', 0, 'class="ic"'), chart: Glyphs.svg('jasmine', 1, 'class="ic"'), friends: Glyphs.svg('rose', 0, 'class="ic"'), loadout: Glyphs.svg('boat', 1, 'class="ic"'), store: Glyphs.svg('stone', 0, 'class="ic"'), ach: Glyphs.svg('lotus', 1, 'class="ic"') };
    return s[k];
  }

  screens.guide = (fromGame) => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="${fromGame ? 'backToGame' : 'go'}" data-to="home">‹</button><h2>How to play</h2><span style="width:42px"></span></div>${Guide.html()}`;
  };

  // ---------- loadouts ----------
  const DEFAULT_LOADOUTS = () => [{ name: 'Loadout 1', fx: [] }, { name: 'Loadout 2', fx: Object.keys(P.SPECIAL) }, { name: 'Loadout 3', fx: [] }];
  function getLoadouts() {
    const src = me ? me.loadouts : Store.LS.get('guestLoadouts', null);
    const l = Array.isArray(src) && src.length === 3 ? src : DEFAULT_LOADOUTS();
    const active = me ? (me.activeLoadout | 0) : Store.LS.get('guestActiveLoadout', 0) | 0;
    return { list: l.map((x) => ({ name: String(x.name || 'Loadout').slice(0, 20), fx: (x.fx || []).filter((t) => P.EFFECT_TYPES.includes(t)).slice(0, 6) })), active: Math.min(2, Math.max(0, active)) };
  }
  let saveLoT = null;
  function saveLoadouts(list, active) {
    if (me) { me.loadouts = list; me.activeLoadout = active; clearTimeout(saveLoT); saveLoT = setTimeout(() => Store.set('players', me.id, me).catch(() => toast('Couldn’t save loadout')), 500); }
    else { Store.LS.set('guestLoadouts', list); Store.LS.set('guestActiveLoadout', active); }
  }
  const equipped = () => { const L = getLoadouts(); const lo = L.list[L.active]; return { name: lo.name, fx: lo.fx.filter((t) => Eco.ownsTile(me, t)) }; };
  const loIcons = (fx, size = 22) => fx.length ? fx.map((t) => `<span style="display:inline-block;width:${size}px;height:${size}px">${Glyphs.svg(t, 0, `style="width:${size}px;height:${size}px"`)}</span>`).join('') : '<span class="tiny muted">No effect tiles (basic game)</span>';
  let loTab = null;
  screens.loadouts = () => {
    const L = getLoadouts(); if (loTab == null) loTab = L.active;
    const cur = L.list[loTab];
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Loadouts</h2><span style="width:42px"></span></div>
    <div class="screen">
      <p class="muted" style="margin:0">Set up to three effect-tile loadouts. Your equipped loadout is used automatically when you start or join a game.</p>
      <div class="seg">${L.list.map((x, i) => `<button class="${i === loTab ? 'on' : ''}" data-act="loTab" data-i="${i}">${i === L.active ? '★ ' : ''}${esc(x.name)}</button>`).join('')}</div>
      <div class="card">
        <div class="field"><label>Name</label><input class="input" id="lo-name" maxlength="20" value="${esc(cur.name)}"></div>
        <div class="row" style="margin:10px 0"><span class="muted">${cur.fx.length}/6 tiles</span><span class="spacer"></span>${loTab === L.active ? '<span class="pill" style="padding:6px 12px;color:var(--gold2)">★ Equipped</span>' : `<button class="btn small primary" data-act="loEquip">Equip</button>`}</div>
        <div class="row wrap" style="margin-bottom:10px"><button class="btn small" data-act="loPreset" data-v="none">Clear</button><button class="btn small" data-act="loPreset" data-v="flowers">4 special flowers</button><button class="btn small" data-act="loPreset" data-v="rand">Random 6</button></div>
        ${fxGrid(cur.fx, 'loFx')}
      </div>
    </div>`;
    const nm = document.getElementById('lo-name');
    nm.addEventListener('change', () => { const L2 = getLoadouts(); L2.list[loTab].name = nm.value.trim() || 'Loadout ' + (loTab + 1); saveLoadouts(L2.list, L2.active); screens.loadouts(); });
  };

  // ---------- achievements ----------
  async function viewPlayer(d) {
    let p = d.pid ? await Store.get('players', d.pid).catch(() => null) : null;
    if (!p && d.name) p = (await players()).find((x) => x.name.toLowerCase() === String(d.name).toLowerCase()) || null;
    if (!p) return toast('Player not found');
    Eco.ensure(p);
    const st = Object.assign(emptyStats(), p.stats || {}), ach = p.ach || {};
    const rec = (a) => `${a[0]}–${a[1]}–${a[2]}`, pct = st.games ? Math.round((100 * st.wins) / st.games) + '%' : '—';
    const card = Object.assign({}, p, { avatar: p.avatar || 'whitelotus', isAvatar: !!(avatarPid && p.id === avatarPid), lvl: Eco.lvl(p), xp: p.xp || 0 });
    const got = Eco.ACH.filter((a) => ach[a.id]);
    const best = Eco.ACH_MAIN.filter((a) => ach[a.id]).concat(Eco.TRACKS.map((t) => Eco.ACH.filter((a) => a.track === t.k && ach[a.id]).pop()).filter(Boolean));
    let fbtn = '';
    if (me && me.id !== p.id && Store.kind === 'firebase') {
      if (!FireSocial.active) await FireSocial.start({ pid: me.id, name: me.name, avatar: me.avatar }).catch(() => {});
      fbtn = `<button class="btn" data-act="dmOpen" data-pid="${esc(p.id)}" data-name="${esc(p.name)}">💬 Message ${esc(p.name)}</button>` + (FireSocial.isFriend && FireSocial.isFriend(p.id) ? '<div class="tiny" style="text-align:center;color:#9fd18b;margin:6px 0">✓ Friends</div>' : FireSocial.requests().some((r) => r.from === p.id) ? `<button class="btn primary" data-act="addFriendPid" data-pid="${esc(p.id)}">Accept friend request</button>` : `<button class="btn primary" data-act="addFriendPid" data-pid="${esc(p.id)}">＋ Add friend</button>`);
    } else if (!me) fbtn = '<div class="tiny muted" style="text-align:center">Create a player to add friends.</div>';
    sheet(`<div class="pview">${Avatars.card(card, esc, { big: true, noStats: true })}${figStage(card)}${fbtn}
      <div class="stat-grid"><div class="stat"><div class="v">${st.games}</div><div class="k">Games</div></div><div class="stat"><div class="v">${st.wins}</div><div class="k">Wins</div></div><div class="stat"><div class="v">${pct}</div><div class="k">Win rate</div></div>
      <div class="stat"><div class="v">${Eco.rankedGames(p) >= Eco.MIN_RANKED ? p.rating : '—'}</div><div class="k">⭐ Rank</div></div><div class="stat"><div class="v">${st.best}</div><div class="k">Best streak</div></div><div class="stat"><div class="v">${st.rings}</div><div class="k">Rings won</div></div></div>
      ${styleCard(p, false)}
      ${boardsCard(Eco.ensure(Object.assign({}, p)))}
      <div class="card"><table class="lb"><tr><th>Mode</th><th class="n">W–L–D</th></tr><tr><td>Online</td><td class="n">${rec(st.online)}</td></tr><tr><td>Computer · Hard</td><td class="n">${rec(st.ai.hard)}</td></tr><tr><td>Computer · Medium</td><td class="n">${rec(st.ai.medium)}</td></tr><tr><td>Computer · Easy</td><td class="n">${rec(st.ai.easy)}</td></tr></table></div>
      <div class="field"><label>🏆 Achievements · ${got.length.toLocaleString()}/${Eco.ACH.length.toLocaleString()}</label><div class="ach-chips">${best.map((a) => `<span class="chip" title="${esc(a.desc)}">${a.icon || '🏆'} ${esc(a.name)}</span>`).join('') || '<span class="muted tiny">None yet</span>'}</div></div>
</div>`);
  }
  let achOpen = null;
  function achBody(p = me, ctx = null) {
    const ach = p.ach || {}, done = Eco.ACH.filter((a) => ach[a.id]).length;
    const c = ctx || { isAvatar: !!(avatarPid && p.id === avatarPid), friends: p === me ? (Store.kind === 'firebase' && FireSocial.active ? FireSocial.friends().length : (Social.friends ? Social.friends().length : 0)) : 0 };
    const head = `<div class="card" style="display:flex;justify-content:space-around;text-align:center"><div><div class="disp" style="font-size:22px;color:#9fd1ff">Lv ${Eco.lvl(p)}</div><div class="tiny muted">${(p.xp || 0).toLocaleString()} XP</div></div><div><div class="disp" style="font-size:22px;color:#ffd77a">${done.toLocaleString()}</div><div class="tiny muted">of ${Eco.ACH.length.toLocaleString()} unlocked</div></div><div><div class="disp" style="font-size:22px">${(p.xp || 0) >= Eco.SUB_XP ? '🌀' : 'Lv ' + Eco.SUB_LEVEL}</div><div class="tiny muted">${(p.xp || 0) >= Eco.SUB_XP ? 'sub-bending' : 'sub-bending at'}</div></div></div>`;
    const main = Eco.ACH_MAIN.filter((a) => ach[a.id]).concat(Eco.ACH_MAIN.filter((a) => !ach[a.id]));
    const row = (a) => `<div class="trow" style="align-items:center;${ach[a.id] ? '' : 'opacity:.6'}"><span style="font-size:22px">${ach[a.id] ? (a.icon || '🏆') : '🔒'}</span><div><b>${esc(a.name)}</b><br><span class="tiny">${esc(a.desc)}</span></div><div class="mv" style="color:#ffd77a">${ach[a.id] ? '✓' : '+' + a.gp}</div></div>`;
    const tracks = Eco.TRACKS.map((t) => {
      const list = Eco.ACH.filter((a) => a.track === t.k), got = list.filter((a) => ach[a.id]).length;
      const top = list.filter((a) => ach[a.id]).pop(), next = list.find((a) => !ach[a.id]);
      const val = t.v(p, c), pct = next ? Math.min(100, Math.round((100 * val) / next.goal)) : 100;
      const open = achOpen === t.k;
      return `<div class="ach-track ${open ? 'open' : ''}"><button class="ach-th" data-act="achTrack" data-k="${t.k}"><span class="ai">${t.icon}</span><span class="am"><b>${top ? esc(top.name) : 'Unranked ' + esc(t.noun)}</b><span class="tiny muted">${next ? esc(next.desc) + ' · ' + val.toLocaleString() + '/' + next.goal.toLocaleString() : 'All tiers complete!'}</span><span class="bar"><i style="width:${pct}%"></i></span></span><span class="ac">${got}/${list.length}</span></button>
        ${open ? `<div class="tlist">${list.map(row).join('')}</div>` : ''}</div>`;
    }).join('');
    return head + lvlBar(p.xp || 0) + `<div class="field"><label>Milestones</label><div class="tlist">${main.map(row).join('')}</div></div><div class="field"><label>Ladders · tap one to see every tier</label>${tracks}</div>`;
  }
  screens.achievements = () => {
    if (!me) { app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Achievements</h2><span style="width:42px"></span></div><div class="screen"><div class="card">Create a player to earn achievements.</div></div>`; return; }
    const ach = me.ach || {}, done = Eco.ACH.filter((a) => ach[a.id]).length;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Achievements</h2><span class="gp-pill">${done}/${Eco.ACH.length}</span></div>
      <div class="screen">${achBody()}</div>`;
  };

  // ---------- store ----------
  let storeTab = 'tiles';
  function figStage(p, edit) {
    if (!p.fig) return edit && me && p.id === me.id ? `<button class="btn" data-act="go" data-to="character" style="margin:8px 0">🧍 Create your character</button>` : '';
    return `<div class="fig-stage ${p.isAvatar ? 'av' : ''}">${Figure.svg(Figure.of(p, p.lvl || Eco.lvl(p)), { avatarState: !!p.isAvatar })}${p.isAvatar ? '<div class="tiny" style="color:#bfe8ff">✨ Avatar State</div>' : ''}${edit ? '<button class="btn small" data-act="go" data-to="character">✏️ Edit</button>' : ''}</div>`;
  }
  let figTab = 'Outfit', figAv = null;
  screens.character = () => {
    if (!me) { app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Character</h2><span style="width:42px"></span></div><div class="screen"><div class="card">Create a player (or sign in) to make a character.</div></div>`; return; }
    ensureMe();
    if (!me.fig) { me.fig = Figure.starter(me.nation, me.id.length + (me.name || '').length); saveMe(); }
    const f = me.fig, lvl = Eco.lvl(me), cfg = Figure.of(me, lvl);
    if (figAv === null) figAv = amAvatar();
    const price = (kind, id) => { const pr = Figure.priceOf(kind, id, me.nation); return Figure.owns(me, kind, id) ? (pr ? '<span class="price own">owned</span>' : '<span class="price free">free</span>') : `<span class="price">🪙 ${pr.toLocaleString()}</span>`; };
    const on = (k, v) => (f[k] === v ? 'on' : '');
    const sw = (k, v, c) => `<button class="fsw ${on(k, v)}" style="background:${c}" data-act="figSet" data-k="${k}" data-v="${v}"></button>`;
    const btn = (k, v, label) => `<button class="${on(k, v)}" data-act="figSet" data-k="${k}" data-v="${v}">${label}</button>`;
    let pane = '';
    if (figTab === 'Body') pane = `<div class="row-h">Build</div><div class="fopts">${btn('build', 'masc', 'Build A')}${btn('build', 'femme', 'Build B')}</div>
      <div class="row-h">Skin</div><div class="fopts">${Object.entries(Figure.SKIN).map(([k, c]) => sw('skin', k, c)).join('')}</div>
      <div class="row-h">Eyes</div><div class="fopts">${Object.entries(Figure.EYES).map(([k, c]) => sw('eyes', k, c)).join('')}</div>
      <div class="row-h">Expression</div><div class="fopts">${btn('mood', 'calm', '😐 Calm')}${btn('mood', 'kind', '🙂 Kind')}${btn('mood', 'fierce', '😠 Fierce')}</div>
      <p class="tiny muted">Your nation is set in Edit profile.</p>`;
    if (figTab === 'Hair') pane = `<div class="row-h">Style</div><div class="fopts">${Object.entries(Figure.HAIRSTYLES).map(([k, h]) => `<button class="${on('hair', k)}" data-act="figSet" data-k="hair" data-v="${k}">${h.name}${price('hair', k)}</button>`).join('')}</div>
      <div class="row-h">Color</div><div class="fopts">${Object.entries(Figure.HAIR).map(([k, c]) => sw('hairColor', k, c)).join('')}</div>
      ${me.nation === 'air' ? `<p class="tiny muted">🌀 ${lvl >= 5 ? 'You’re an Airbending Master: your arrows show on bare skin.' : `Your arrow markings unlock at level 5 (you’re level ${lvl}).`}</p>` : ''}`;
    if (figTab === 'Outfit') {
      const card = ([k, o]) => `<button class="fcard ${on('outfit', k)}" data-act="figSet" data-k="outfit" data-v="${k}">${Figure.svg(Object.assign({}, cfg, { outfit: k }))}<b>${o.name}</b>${price('outfit', k)}</button>`;
      const all = Object.entries(Figure.OUTFITS);
      pane = `<div class="fcards">${all.filter(([, o]) => o.n === me.nation).map(card).join('')}</div><div class="row-h">Other nations</div><div class="fcards">${all.filter(([, o]) => o.n !== me.nation).map(card).join('')}</div>`;
    }
    if (figTab === 'Extras') pane = `<div class="row-h">Accessory</div><div class="fopts">${Object.entries(Figure.ACCESSORIES).map(([k, a]) => `<button class="${on('acc', k)}" data-act="figSet" data-k="acc" data-v="${k}">${a.name}${price('acc', k)}</button>`).join('')}</div>
      ${amAvatar() ? `<label class="toggle-row"><input type="checkbox" ${figAv ? 'checked' : ''} data-act="figAv"> Preview Avatar State</label>` : ''}`;
    const tabs = ['Body', 'Hair', 'Outfit', 'Extras'].map((t) => `<button class="${figTab === t ? 'on' : ''}" data-act="figTab" data-k="${t}">${t}</button>`).join('');
    const sc = document.querySelector('.screen'), y = sc && document.getElementById('fig-pane') ? sc.scrollTop : 0;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Character</h2><button class="gp-pill" data-act="go" data-to="store">${gpFmt(me.gp)}</button></div>
      <div class="screen"><div class="fig-hero"><div class="fig-big">${Figure.svg(cfg, { avatarState: figAv })}</div><div class="fig-pt">${Figure.svg(cfg, { portrait: true, avatarState: figAv })}<small>seat icon</small></div></div>
      <div class="store-tabs fig-tabs">${tabs}</div><div id="fig-pane">${pane}</div></div>`;
    if (y) document.querySelector('.screen').scrollTop = y;
  };
  // ---------- past-life spirits: watch over the Avatar ----------
  let spiritHubUn = null;
  screens.spirit = () => {
    if (spiritHubUn) { spiritHubUn(); spiritHubUn = null; }
    if (!me || !me.pastLife) return go('home');
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Past life</h2><span style="width:42px"></span></div>
      <div class="screen"><div class="card" style="text-align:center"><div style="font-size:40px">👻</div><b>Watch over the Avatar</b><p class="tiny muted">Pick one of the Avatar’s live matches to watch. You get two bends per match: burn, wash, smash or sweep any tile, to help them or to humble them. After that you can send them hints.</p></div>
      <div class="field"><label>The Avatar’s live matches</label><div id="avgames" class="menu"><div class="muted tiny">${avatarPid ? 'Looking…' : 'There’s no Avatar right now.'}</div></div></div></div>`;
    if (!avatarPid) return;
    const show = (games) => {
      const el = document.getElementById('avgames'); if (!el) return;
      const list = games.filter((g) => g.kind !== 'fight' && g.status === 'playing' && g.state && (g.pids || []).includes(avatarPid) && Date.now() - (g.updated || 0) < 2 * 864e5);
      el.innerHTML = list.map((g) => `<button class="btn" data-act="spectate" data-code="${esc(g.id)}"><span>👑 ${esc(g.host.pid === avatarPid ? g.host.name : g.guest.name)} vs ${esc(g.host.pid === avatarPid ? g.guest.name : g.host.name)}</span><span class="spacer"></span><span class="disp">${esc(g.id)}</span></button>`).join('') || '<div class="muted tiny">The Avatar isn’t in a match right now. Check back later.</div>';
    };
    if (Store.kind === 'firebase') spiritHubUn = Store.watchCol('games', show);
    else Store.list('games').then((g) => show((g || []).map((x, i) => Object.assign({ id: x.id || x.code }, x)))).catch(() => {});
  };
  async function spectate(code) {
    if (spiritHubUn) { spiritHubUn(); spiritHubUn = null; }
    const d = await Store.get('games', code).catch(() => null);
    if (!d || !d.state || !d.guest) return toast('That match isn’t available');
    const seat = (x) => ({ name: x.name, pid: x.pid, avatar: x.avatar, fig: x.fig || null, kind: 'remote' });
    G = { mode: 'spectate', code, doc: d, ver: d.ver, s: JSON.parse(d.state), seats: [seat(d.guest), seat(d.host)], my: d.host.pid === avatarPid ? 1 : 0, history: [], sel: null, showH: true, opts: Object.assign({}, d.opts), recorded: true, chat: [] };
    G.unwatch = Store.watch('games', code, (nd) => { if (!G || G.mode !== 'spectate' || !nd || !nd.state) return; if ((nd.ver || 0) > G.ver) { G.ver = nd.ver; G.s = JSON.parse(nd.state); G.sel = null; renderGame(); } });
    G.spiritUn = Store.watch('meta', 'spirit_' + code, (m) => { if (!G || G.mode !== 'spectate') return; G.spiritMeta = m || {}; renderSpiritBar(); });
    gameScreen();
  }
  const spiritPending = () => { const m = (G && G.spiritMeta) || {}, done = (G && G.s.spiritDone) || []; return Object.entries(m.acts || {}).filter(([id, a]) => a.pid === myPid() && !done.includes(id) && !((m.fail || {})[id])).length; };
  const spiritLeftMine = () => (G ? P.spiritLeft(G.s, myPid()) - spiritPending() : 0);
  function renderSpiritBar() {
    if (!G || G.mode !== 'spectate') return;
    const bar = document.getElementById('bendbar'); if (!bar) return;
    bar.style.display = '';
    const left = spiritLeftMine(), sel = G.sel && (G.sel.kind === 'bend' || G.sel.kind === 'sweep') ? G.sel.el || 'air' : null;
    bar.innerHTML = `<span class="bb spent"><span class="i">👻</span><small>${left > 0 ? left + ' spirit ' + (left === 1 ? 'bend' : 'bends') + ' left' : 'Bends used'}</small></span>` +
      (left > 0 ? ['fire', 'water', 'earth', 'air'].map((el) => `<button class="bb ${sel === el ? 'on' : ''}" data-act="spiritEl" data-el="${el}"><span class="i">${Eco.BEND[el].icon}</span><b>${Eco.BEND[el].verb}</b></button>`).join('') : '') +
      `<button class="bb" data-act="spiritHint"><span class="i">💡</span><b>Send a hint</b></button>`;
  }
  async function spiritSend(a) {
    G.sel = null; renderBoard(); renderSpiritBar();
    if (spiritLeftMine() <= 0) return toast('You’ve used your two spirit bends this match');
    const act = { t: 'spirit', el: a.el, target: a.target, to: a.to != null ? a.to : null, pid: myPid(), name: myName() };
    try { P.apply(G.s, act); } catch (e) { return toast('That bend isn’t possible'); }
    const id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try { await Store.patch('meta', 'spirit_' + G.code, { acts: { [id]: Object.assign({ t: Date.now() }, act) }, avatar: avatarPid, code: G.code }); } catch (e) { return toast('Couldn’t send — check your connection'); }
    G.spiritMeta = G.spiritMeta || {}; G.spiritMeta.acts = Object.assign({}, G.spiritMeta.acts, { [id]: act }); renderSpiritBar();
    toast('👻 Sent! It lands as soon as the player whose turn it is sees it.', 3500);
  }
  // players: whoever's turn it is applies spirit bends sent by past lives
  function applySpiritActs() {
    if (!G || G.mode !== 'online' || !G.spiritMeta || !isHumanTurn()) return;
    const acts = G.spiritMeta.acts || {}; let changed = false;
    Object.keys(acts).sort().forEach((id) => {
      if ((G.s.spiritDone || []).includes(id)) return;
      const a = acts[id];
      try { const s2 = P.apply(G.s, { t: 'spirit', el: a.el, target: a.target, to: a.to, pid: a.pid, name: a.name }); s2.spiritDone = (G.s.spiritDone || []).concat([id]); G.s = s2; changed = true; showFx(a.el); toast(`👻 ${a.name}, a past life of the Avatar, ${{ fire: 'burned', water: 'washed out', earth: 'smashed', air: 'swept' }[a.el]} a tile!`, 4000); }
      catch (e) { G.s = P.clone(G.s); G.s.spiritDone = (G.s.spiritDone || []).concat([id]); changed = true; Store.patch('meta', 'spirit_' + G.code, { fail: { [id]: true } }).catch(() => {}); }
    });
    if (changed) { G.sel = null; G.history = []; renderGame(); pushOnline(); }
  }
  function spiritHints() {
    if (!G || G.mode !== 'online' || G.seats[G.my].pid !== avatarPid) return;
    G.hintSeen = G.hintSeen || {};
    Object.entries((G.spiritMeta && G.spiritMeta.hints) || {}).sort((a, b) => a[1].t - b[1].t).forEach(([id, h]) => {
      if (G.hintSeen[id]) return; G.hintSeen[id] = 1;
      if (Date.now() - (h.t || 0) < 5 * 60000) toast(`👻 ${h.name} (past life): ${String(h.text || '').slice(0, 120)}`, 6000);
    });
  }
  async function spiritHint() {
    if (!G || G.mode !== 'spectate') return;
    sheet(`<h3>💡 Hint for the Avatar</h3><p class="tiny muted">Only the Avatar sees it, as a message from a past life.</p><form id="hintf" class="menu"><input class="input" id="hint-t" maxlength="120" placeholder="Block the Jade near the North gate…"><button class="btn primary" type="submit">Send hint</button></form>`);
    document.getElementById('hintf').addEventListener('submit', async (e) => {
      e.preventDefault(); const text = document.getElementById('hint-t').value.trim(); if (!text) return;
      const id = 'h' + Date.now().toString(36);
      await Store.patch('meta', 'spirit_' + G.code, { hints: { [id]: { pid: myPid(), name: myName(), text, t: Date.now() } }, avatar: avatarPid, code: G.code }).catch(() => toast('Couldn’t send'));
      closeSheet(); toast('💡 Hint sent');
    });
  }

  // ---------- bending duels (real-time mini-game) ----------
  const DM = {
    strike: { icon: '👊', name: 'Strike', cd: 650, dmg: 7, gain: 12 },
    blast: { name: 'Blast', cd: 2300, dmg: 18, cost: 35, travel: 520 },
    block: { icon: '🛡️', name: 'Block', cd: 2600, dur: 1000 },
    dodge: { icon: '💨', name: 'Dodge', cd: 1900, dur: 480 },
  };
  const ELI = { fire: '🔥', water: '🌊', earth: '🪨', air: '🌪️' };
  const ELC = { fire: '#ff7a2c', water: '#4fb6ff', earth: '#8bc34a', air: '#e8f6ff' };
  // sub-bending ultimates: land a 5-hit combo to charge one; each has a quick counter
  const ULT = {
    lightning: { icon: '⚡', name: 'Lightning', w: 1300, dmg: 35, back: 25, counter: 'redirect', cIcon: '🔄', cName: 'Redirect it!', warn: 'is charging lightning! Redirect it!' },
    blood: { icon: '🩸', name: 'Bloodbending', w: 1100, dmg: 12, freeze: 3000, counter: 'chi', cIcon: '🧘', cName: 'Channel chi!', warn: 'is bloodbending you! Channel your chi!' },
    metal: { icon: '⚙️', name: 'Metal crush', w: 1300, dmg: 30, counter: 'strike', warn: 'is metalbending! Strike to break their focus!' },
    flight: { icon: '🌀', name: 'Air suffocation', w: 4000, tick: 4, every: 500, counter: 'strike', warn: 'is pulling the air from your lungs! Strike to break their focus!' },
  };
  const COMBO = 5;
  let D = null;
  const duelStake = (winLvl, loseLvl) => Math.round(50 * Math.max(0.5, Math.min(3, 1 + (loseLvl - winLvl) / 20)));
  function duelMe() {
    const nat = (me && me.nation) || 'earth', lv = me ? Eco.lvl(me) : 1;
    return { pid: myPid(), name: myName(), lvl: lv, nation: nat, allEl: !!(amAvatar() || (me && me.pastLife)), subs: me ? Eco.powersFor(me, amAvatar()).subs : [], title: me ? Eco.titleOf(me, lv) : '', fig: myFig() || Object.assign(Figure.starter(nat, (myName() || '').length), { nation: nat, level: lv }) };
  }
  function duelEnd() { if (D) { D.over = true; if (D.un) D.un(); if (D.ai) clearTimeout(D.ai); cancelAnimationFrame(D.raf); } D = null; }
  screens.duel = () => {
    duelEnd();
    const online = Store.kind === 'firebase' && Store.online() && me;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Bending duel</h2><span style="width:42px"></span></div>
      <div class="screen"><div class="card duel-intro"><div style="font-size:40px">🥋</div><b>Fight a friend in real time</b><p class="tiny muted">No turns: tap as fast as you like. 👊 Strike builds energy, your element Blast spends it, 🛡️ Block cuts damage and 💨 Dodge avoids it. Win to take gold from your opponent (more for beating a higher level). Both players earn XP. Duels don’t count toward your record.</p></div>
      ${online ? `<div class="menu"><button class="btn primary" data-act="duelCreate">⚔️ Start a duel</button></div>
      <div class="card"><div class="field"><label>Join with a code</label><div class="row"><input class="input" id="duelcode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;letter-spacing:.3em;font-weight:700"><button class="btn primary" data-act="duelJoinCode">Join</button></div></div></div>` : `<div class="card tiny muted">${me ? 'Duels with friends need an internet connection.' : 'Create a player to duel friends.'}</div>`}
      <div class="menu"><button class="btn" data-act="duelPractice">🎯 Practice vs a training dummy <small>No rewards</small></button></div></div>`;
  };
  async function duelCreate() {
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const doc = { kind: 'fight', code, status: 'open', created: Date.now(), updated: Date.now(), host: duelMe(), guest: null, pids: [myPid()], uids: [FB.uid] };
    try { await Store.set('games', code, doc); } catch (e) { return toast('Couldn’t start the duel — try again'); }
    duelWait(code);
  }
  function duelWait(code) {
    duelEnd();
    const fr = Soc().ready && Soc().ready() ? Soc().friends() : [];
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="duelCancel" data-code="${code}">‹</button><h2>Waiting</h2><span style="width:42px"></span></div>
      <div class="screen" style="text-align:center"><div style="font-size:48px">🥋</div><p class="muted">Share this code, or challenge a friend</p><div class="code">${code}</div><button class="btn" data-act="copyCode" data-code="${code}">Copy code</button>
      ${fr.length ? `<div class="field" style="text-align:left;margin-top:12px"><label>Challenge a friend</label><div class="menu">${fr.map((f) => `<button class="btn" data-act="duelInvite" data-code="${esc(f.code)}" data-game="${code}">${av(f.name)}<span>${esc(f.name)}</span><span class="spacer"></span><span class="tiny ${Soc().isOnline(f.code) ? '' : 'muted'}">${Soc().isOnline(f.code) ? '🟢 online' : 'offline'}</span></button>`).join('')}</div></div>` : ''}
      <p class="tiny muted">The duel starts as soon as they join. Both of you need the app open.</p></div>`;
    const un = Store.watch('games', code, (d) => { if (d && d.status === 'playing' && d.guest) { un(); duelStart(d, 0); } });
    D = { un, over: false };
  }
  async function duelJoin(code, d) {
    if (!me) return toast('Create a player to duel');
    if (d.host.pid === myPid()) return d.status === 'open' ? duelWait(code) : d.status === 'playing' ? duelStart(d, 0) : toast('That duel is over');
    if (d.guest && d.guest.pid === myPid() && d.status === 'playing') return duelStart(d, 1);
    if (d.status !== 'open') return toast('That duel already started');
    const guest = duelMe();
    try { await Store.patch('games', code, { status: 'playing', guest, pids: [d.host.pid, guest.pid], uids: [...new Set((d.uids || []).concat([FB.uid]))], updated: Date.now() }); } catch (e) { return toast('Couldn’t join — try again'); }
    duelStart(Object.assign({}, d, { guest, status: 'playing' }), 1);
  }
  function duelPractice() {
    const m = duelMe(), nat = ['fire', 'water', 'earth', 'air'].filter((n) => n !== m.nation)[Math.floor(Math.random() * 3)];
    const dummy = { pid: 'dummy', name: 'Training Dummy', lvl: m.lvl, nation: nat, subs: m.lvl >= Eco.SUB_LEVEL ? [Eco.SUB_OF[nat]] : [], title: 'Practice partner', fig: Object.assign(Figure.starter(nat, 7), { nation: nat, level: 1, mood: 'fierce' }) };
    duelStart({ code: null, host: m, guest: dummy }, 0, true);
  }
  function duelStart(d, my, practice = false) {
    duelEnd();
    const P2 = [d.host, d.guest];
    D = { code: d.code, my, opp: 1 - my, P: P2, practice, hp: [100, 100], en: 30, cd: {}, guard: [0, 0], dodge: [0, 0], n: 0, seen: 0, over: false, startAt: Date.now() + 3000, aiEn: 30, combo: [0, 0], lastHit: [0, 0], ultReady: [false, false], ult: [null, null], frozen: [0, 0] };
    const fig = (k) => `<div class="fighter f${k === my ? 'me' : 'opp'}" id="fg${k}"><div class="fig-in">${Figure.svg(P2[k].fig)}</div><div class="shield"></div></div>`;
    const bar = (k) => `<div class="dbar ${k === my ? 'mine' : ''}"><div class="dbn"><b>${esc(P2[k].name)}</b><span>Lv ${P2[k].lvl}${P2[k].title ? ' · ' + esc(P2[k].title) : ''}</span></div><div class="hp"><i id="hp${k}"></i></div></div>`;
    const el = P2[my].nation, mv = (k, icon, name, e) => `<button class="dmove${e ? ' del' : ''}" data-act="duelMove" data-k="${k}" ${e ? `data-el="${e}"` : ''} id="mv-${k}${e ? '-' + e : ''}"><span class="di">${icon}</span><span>${name}</span><i class="cdv"></i></button>`;
    const blasts = P2[my].allEl ? `<div class="dmoves dels">${['fire', 'water', 'earth', 'air'].map((e) => mv('blast', ELI[e], { fire: 'Fire', water: 'Water', earth: 'Earth', air: 'Air' }[e], e)).join('')}</div>` : '';
    app.innerHTML = `<div class="duel"><div class="duel-top">${bar(my)}<span class="vs">VS</span>${bar(1 - my)}</div>
      <div class="arena" id="arena" style="--el:${ELC[el]}">${fig(my)}${fig(1 - my)}<div id="dfx"></div><div class="dcount" id="dcount">3</div><div class="dwarn" id="dwarn"></div></div>
      <div class="en"><i id="enb"></i><span>Energy</span></div>${(P2[my].subs || []).length ? `<div class="combo" id="combo"></div>` : ''}<div class="dult" id="dult"></div>
      ${blasts}<div class="dmoves" ${P2[my].allEl ? 'style="grid-template-columns:repeat(3,1fr)"' : ''}>${mv('strike', '👊', 'Strike')}${P2[my].allEl ? '' : mv('blast', ELI[el], 'Blast')}${mv('block', '🛡️', 'Block')}${mv('dodge', '💨', 'Dodge')}</div>
      <button class="btn ghost small" data-act="duelQuit">${practice ? 'Leave practice' : 'Give up'}</button></div>`;
    const tick = () => {
      if (!D || D.over) return;
      const now = Date.now(), c = document.getElementById('dcount');
      if (c) { const left = Math.ceil((D.startAt - now) / 1000); c.textContent = left > 0 ? left : now - D.startAt < 700 ? 'FIGHT!' : ''; c.style.display = c.textContent ? '' : 'none'; }
      if (now > D.startAt) D.en = Math.min(100, D.en + 0.012 * 16);
      [0, 1].forEach((k) => { const h = document.getElementById('hp' + k); if (h) { h.style.width = Math.max(0, D.hp[k]) + '%'; h.classList.toggle('low', D.hp[k] < 30); } const f = document.getElementById('fg' + k); if (f) { f.classList.toggle('guard', now < D.guard[k]); f.classList.toggle('dodging', now < D.dodge[k]); } });
      const e = document.getElementById('enb'); if (e) e.style.width = D.en + '%';
      document.querySelectorAll('.dmove[data-act="duelMove"]').forEach((b) => { const k = b.dataset.k, left = Math.max(0, (D.cd[k] || 0) - now), frac = left / DM[k].cd; b.querySelector('.cdv').style.height = (frac * 100) + '%'; b.disabled = now < D.startAt || left > 0 || now < D.frozen[D.my] || (k === 'blast' && D.en < DM.blast.cost); });
      const cb = document.getElementById('combo'); if (cb) cb.innerHTML = D.ultReady[D.my] ? '<b>⚡ Ultimate ready</b>' : `Combo ${'●'.repeat(D.combo[D.my])}${'○'.repeat(Math.max(0, COMBO - D.combo[D.my]))}`;
      if (now - D.lastHit[D.my] > 3000 && D.combo[D.my] && !D.ultReady[D.my]) D.combo[D.my] = 0;
      D.raf = requestAnimationFrame(tick);
    };
    D.raf = requestAnimationFrame(tick);
    if (practice) duelAi();
    else D.un = Store.watch('games', d.code, (x) => {
      if (!x || !D || D.over) return;
      const f = x['f' + D.opp];
      if (f) { if (typeof f.hp === 'number') D.hp[D.opp] = f.hp; if (f.n > D.seen) { D.seen = f.n; duelSee(D.opp, f.mv); } }
      if (x.status === 'done') duelFinish(x.winner, x.quit);
    });
  }
  function duelAnim(k, cls, ms = 380) { const f = document.getElementById('fg' + k); if (!f) return; f.classList.remove(cls); void f.offsetWidth; f.classList.add(cls); setTimeout(() => f.classList.remove(cls), ms); }
  function duelFloat(k, txt, cls = '') {
    const a = document.getElementById('dfx'), f = document.getElementById('fg' + k); if (!a || !f) return;
    const n = document.createElement('div'); n.className = 'dfloat ' + cls; n.textContent = txt; n.style.left = (f.offsetLeft + f.offsetWidth / 2) + 'px'; n.style.top = (f.offsetTop + 30) + 'px'; a.appendChild(n); setTimeout(() => n.remove(), 900);
  }
  function duelProjectile(from, el) {
    const a = document.getElementById('dfx'), f = document.getElementById('fg' + from), t = document.getElementById('fg' + (1 - from)); if (!a || !f || !t) return;
    const n = document.createElement('div'); n.className = 'dproj'; n.textContent = ELI[el]; n.style.setProperty('--c', ELC[el]);
    const y = f.offsetTop + f.offsetHeight * 0.42, x0 = f.offsetLeft + f.offsetWidth / 2, x1 = t.offsetLeft + t.offsetWidth / 2;
    n.style.left = x0 + 'px'; n.style.top = y + 'px'; n.style.transition = `left ${DM.blast.travel}ms linear`; a.appendChild(n);
    requestAnimationFrame(() => requestAnimationFrame(() => { n.style.left = x1 + 'px'; }));
    setTimeout(() => n.remove(), DM.blast.travel + 60);
  }
  // someone (k) used a move: animate it, and work out damage on the target if this client is responsible for the target
  function duelSee(k, mv0) {
    if (!D || D.over) return;
    const [mv, bel] = String(mv0).split(':'), bEl = bel && (D.P[k].allEl) ? bel : D.P[k].nation;
    const now = Date.now(), tgt = 1 - k;
    if (mv === 'ult') return duelUltSeen(k, bel);
    if (mv === 'redirect' || mv === 'chi') return duelCounterSeen(k, mv);
    if (mv === 'block') { D.guard[k] = now + DM.block.dur; return; }
    if (mv === 'dodge') { D.dodge[k] = now + DM.dodge.dur; duelAnim(k, 'dodge', 480); return; }
    if (mv === 'strike') duelAnim(k, 'lunge', 300);
    if (mv === 'blast') { duelAnim(k, 'cast', 400); duelProjectile(k, bEl); }
    const responsible = D.practice || tgt === D.my;
    const delay = mv === 'blast' ? DM.blast.travel : 170;
    setTimeout(() => {
      if (!D || D.over) return;
      const t = Date.now();
      if (t < D.dodge[tgt]) { duelFloat(tgt, 'Dodged!', 'miss'); return; }
      let dmg = DM[mv].dmg; const blocked = t < D.guard[tgt]; if (blocked) dmg = Math.round(dmg * 0.2);
      duelAnim(tgt, blocked ? 'blocked' : 'hit', 320); duelFloat(tgt, blocked ? '🛡️ -' + dmg : '-' + dmg, blocked ? 'blk' : '');
      if (!blocked) { duelCombo(k); if (!D.ultReady[tgt]) D.combo[tgt] = Math.max(0, D.combo[tgt] - 1); if (mv === 'strike' && D.ult[tgt] && ULT[D.ult[tgt].kind].counter === 'strike' && !D.ult[tgt].done) duelBreak(tgt, k); }
      if (k === D.my && mv === 'strike' && !blocked) D.en = Math.min(100, D.en + DM.strike.gain);
      if (k !== D.my && D.practice && mv === 'strike') D.aiEn = Math.min(100, D.aiEn + DM.strike.gain);
      if (!responsible) return;
      D.hp[tgt] = Math.max(0, D.hp[tgt] - dmg); buzz(tgt === D.my ? 25 : 0);
      if (D.practice) { if (D.hp[tgt] <= 0) duelFinish(k); return; }
      const lost = D.hp[tgt] <= 0;
      Store.patch('games', D.code, Object.assign({ ['f' + D.my]: { n: D.n, mv: null, hp: D.hp[D.my], t: Date.now() }, updated: Date.now() }, lost ? { status: 'done', winner: D.opp } : {})).catch(() => {});
      if (lost) duelFinish(D.opp);
    }, delay);
  }
  function duelMove(k, el) {
    if (!D || D.over || Date.now() < D.startAt || Date.now() < D.frozen[D.my]) return;
    const m = DM[k], now = Date.now();
    if ((D.cd[k] || 0) > now) return;
    if (k === 'blast') { if (D.en < m.cost) return; D.en -= m.cost; }
    D.cd[k] = now + m.cd; D.n++;
    const mvk = k === 'blast' && el ? 'blast:' + el : k;
    duelSee(D.my, mvk);
    if (!D.practice) Store.patch('games', D.code, { ['f' + D.my]: { n: D.n, mv: mvk, hp: D.hp[D.my], t: now }, updated: now }).catch(() => {});
  }
  function duelSend(mvk) { if (D && !D.practice) Store.patch('games', D.code, { ['f' + D.my]: { n: ++D.n, mv: mvk, hp: D.hp[D.my], t: Date.now() }, updated: Date.now() }).catch(() => {}); else if (D) D.n++; }
  function duelCombo(k) {
    if (!D) return; const now = Date.now();
    D.combo[k] = now - D.lastHit[k] < 3000 ? D.combo[k] + 1 : 1; D.lastHit[k] = now;
    if (D.combo[k] >= COMBO && (D.P[k].subs || []).length && !D.ultReady[k]) { D.ultReady[k] = true; if (k === D.my) { buzz(40); duelUltBar(); toast('⚡ Combo! Your ultimate is ready'); } }
  }
  function duelUltBar() {
    const el = document.getElementById('dult'); if (!el || !D) return;
    const subs = D.P[D.my].subs || [];
    el.innerHTML = D.ultReady[D.my] ? subs.map((k) => `<button class="dmove dultb" data-act="duelUlt" data-k="${k}"><span class="di">${ULT[k].icon}</span><span>${ULT[k].name}</span></button>`).join('') : '';
  }
  function duelWarn(html, ms) { const w = document.getElementById('dwarn'); if (!w) return; w.innerHTML = html; w.style.display = html ? '' : 'none'; clearTimeout(D && D.warnT); if (D && ms) D.warnT = setTimeout(() => { if (w) w.style.display = 'none'; }, ms); }
  function duelUlt(kind) {
    if (!D || D.over || !D.ultReady[D.my] || !(D.P[D.my].subs || []).includes(kind)) return;
    D.ultReady[D.my] = false; D.combo[D.my] = 0; duelUltBar();
    duelSend('ult:' + kind); duelUltSeen(D.my, kind);
  }
  // k started an ultimate
  function duelUltSeen(k, kind) {
    if (!D || D.over || !ULT[kind]) return;
    const U = ULT[kind], tgt = 1 - k, now = Date.now(), resp = D.practice || tgt === D.my;
    D.ult[k] = { kind, start: now, done: false, countered: false };
    duelAnim(k, 'cast', U.w);
    const fk = document.getElementById('fg' + k); if (fk) { fk.classList.add('ulting'); fk.style.setProperty('--uc', kind === 'lightning' ? '#9fd8ff' : kind === 'blood' ? '#c0182a' : kind === 'metal' ? '#c8ccd2' : '#e8f6ff'); }
    if (tgt === D.my) { buzz(60); duelWarn(`<div class="dw-t">${U.icon} ${esc(D.P[k].name)} ${U.warn}</div>${U.counter === 'strike' ? '' : `<button class="dcounter" data-act="duelCounter" data-k="${U.counter}">${U.cIcon} ${U.cName}</button>`}`, U.w + 200); }
    else duelWarn(`<div class="dw-t">${U.icon} ${U.name}!</div>`, 1200);
    if (D.practice && tgt !== D.my && Math.random() < 0.35) setTimeout(() => { if (!D || !D.ult[k] || D.ult[k].done) return; if (U.counter === 'strike') duelSee(tgt, 'strike'); else duelCounterSeen(tgt, U.counter); }, 300 + Math.random() * 700);
    if (kind === 'flight') {
      const tickF = () => {
        if (!D || D.over || !D.ult[k] || D.ult[k].done) return;
        if (Date.now() - D.ult[k].start >= U.w) { duelUltEnd(k); return; }
        duelAnim(tgt, 'hit', 250); duelFloat(tgt, '🌀 -' + U.tick);
        if (resp) duelDamage(tgt, U.tick, k);
        D.ult[k].tick = setTimeout(tickF, U.every);
      };
      D.ult[k].tick = setTimeout(tickF, U.every);
      return;
    }
    setTimeout(() => {
      if (!D || D.over || !D.ult[k] || D.ult[k].done) return;
      const u = D.ult[k]; duelUltEnd(k);
      if (u.countered) return;
      if (kind === 'lightning') duelProjectile(k, 'fire');
      duelAnim(tgt, 'hit', 400); duelFloat(tgt, `${U.icon} -${U.dmg}`);
      if (kind === 'blood') { D.frozen[tgt] = Date.now() + U.freeze; const ft = document.getElementById('fg' + tgt); if (ft) { ft.classList.add('frozen'); setTimeout(() => ft && ft.classList.remove('frozen'), U.freeze); } if (tgt === D.my) duelWarn('<div class="dw-t">🩸 You’re being bloodbent and can’t move!</div>', U.freeze); }
      if (resp) duelDamage(tgt, U.dmg, k);
    }, U.w);
  }
  function duelUltEnd(k) { if (!D || !D.ult[k]) return; D.ult[k].done = true; clearTimeout(D.ult[k].tick); const f = document.getElementById('fg' + k); if (f) f.classList.remove('ulting'); }
  // the target answered with redirect / chi
  function duelCounter(kind) {
    if (!D || D.over) return;
    const k = D.opp, u = D.ult[k]; if (!u || u.done || ULT[u.kind].counter !== kind) return;
    duelSend(kind); duelCounterSeen(D.my, kind);
  }
  function duelCounterSeen(by, kind) {
    if (!D || D.over) return;
    const k = 1 - by, u = D.ult[k]; if (!u || u.countered || Date.now() - u.start > ULT[u.kind].w + 1500) return;
    u.countered = true; duelUltEnd(k); duelWarn('', 0);
    if (kind === 'redirect') {
      duelFloat(by, '🔄 Redirected!', 'miss'); duelProjectile(by, 'fire');
      setTimeout(() => { if (!D || D.over) return; duelAnim(k, 'hit', 400); duelFloat(k, '⚡ -' + ULT.lightning.back); if (D.practice || k === D.my) duelDamage(k, ULT.lightning.back, by); }, DM.blast.travel);
    } else duelFloat(by, '🧘 Rejected!', 'miss');
  }
  // a strike landed on someone channeling a strike-counterable ultimate
  function duelBreak(caster, by) { const u = D.ult[caster]; if (!u || u.done) return; u.countered = true; duelUltEnd(caster); duelFloat(caster, '💥 Focus broken!', 'blk'); if (caster !== D.my) duelWarn('', 0); else duelWarn('<div class="dw-t">💥 They broke your focus!</div>', 1200); }
  function duelDamage(tgt, dmg, from) {
    if (!D || D.over) return;
    D.hp[tgt] = Math.max(0, D.hp[tgt] - dmg); if (tgt === D.my) buzz(25);
    if (D.practice) { if (D.hp[tgt] <= 0) duelFinish(from); return; }
    if (tgt !== D.my) return;
    const lost = D.hp[tgt] <= 0;
    Store.patch('games', D.code, Object.assign({ ['f' + D.my]: { n: D.n, mv: null, hp: D.hp[D.my], t: Date.now() }, updated: Date.now() }, lost ? { status: 'done', winner: D.opp } : {})).catch(() => {});
    if (lost) duelFinish(D.opp);
  }
  function duelAi() {
    if (!D || D.over) return;
    const go = () => {
      if (!D || D.over) return;
      if (Date.now() > D.startAt) {
        const r = Math.random(), opp = D.opp, now = Date.now();
        let mv = 'strike';
        if (D.aiEn >= DM.blast.cost && r < 0.35 && (D.aiCd || 0) < now) { mv = 'blast'; D.aiEn -= DM.blast.cost; D.aiCd = now + DM.blast.cd; }
        else if (r > 0.9) mv = 'block'; else if (r > 0.82) mv = 'dodge';
        D.aiEn = Math.min(100, D.aiEn + 4);
        if (D.ultReady[opp] && Math.random() < 0.5) { D.ultReady[opp] = false; D.combo[opp] = 0; duelUltSeen(opp, D.P[opp].subs[0]); }
        else duelSee(opp, mv);
      }
      D.ai = setTimeout(go, 750 + Math.random() * 900);
    };
    D.ai = setTimeout(go, 3200);
  }
  async function duelFinish(winner, quit) {
    if (!D || D.over) return;
    D.over = true; cancelAnimationFrame(D.raf); if (D.un) D.un(); if (D.ai) clearTimeout(D.ai);
    const won = winner === D.my, me0 = D.P[D.my], op = D.P[D.opp];
    let line = '';
    if (D.practice) line = won ? 'Nice work! Practice doesn’t pay out.' : 'The dummy got you this time.';
    else if (me) {
      Eco.ensure(me); await syncCounters();
      if (won) { const amt = duelStake(me0.lvl, op.lvl); me.gp += amt; me.xp = (me.xp || 0) + 40; me.fightWins = (me.fightWins || 0) + 1; me.gpPeak = Math.max(me.gpPeak || 0, me.gp); line = `🪙 +${amt} gp from ${esc(op.name)} · ✨ +40 XP`; }
      else { const amt = Math.min(me.gp || 0, duelStake(op.lvl, me0.lvl)); me.gp -= amt; me.xp = (me.xp || 0) + 15; me.fightLosses = (me.fightLosses || 0) + 1; line = `🪙 −${amt} gp to ${esc(op.name)} · ✨ +15 XP`; }
      saveMe(); setTimeout(checkAch, 1200);
    }
    const ov = document.createElement('div'); ov.className = 'duel-over';
    ov.innerHTML = `<div class="card" style="text-align:center"><div style="font-size:46px">${won ? '🏆' : '💫'}</div><h2 style="margin:4px 0">${won ? 'You win!' : esc(op.name) + ' wins'}</h2>${quit ? `<p class="tiny muted">${won ? esc(op.name) + ' gave up.' : 'You gave up.'}</p>` : ''}<p>${line}</p><div class="menu"><button class="btn primary" data-act="${D.practice ? 'duelPractice' : 'duelCreate'}">${D.practice ? 'Again' : '⚔️ New duel'}</button><button class="btn" data-act="go" data-to="duel">Done</button></div></div>`;
    const a = document.querySelector('.duel'); if (a) a.appendChild(ov);
  }
  async function duelQuit() {
    if (!D) return go('duel');
    if (D.practice || D.over) return go('duel');
    if (!(await choose('Give up this duel?', [{ label: 'Give up', value: true, cls: 'primary' }], 'You’ll lose and pay the gold.'))) return;
    if (!D || D.over) return;
    await Store.patch('games', D.code, { status: 'done', winner: D.opp, quit: true, updated: Date.now() }).catch(() => {});
    duelFinish(D.opp, true);
  }
  // animated board previews for the store (Seismic shows its darkness + pulses, Spirit Walker its glow)
  function boardPreview(k) {
    const T = Eco.BOARDS[k] || {}, n = Math.random().toString(36).slice(2, 7);
    const pos = [[4, 6, 'rose', 0], [4, 11, 'jasmine', 0], [11, 12, 'lily', 1], [12, 5, 'jade', 1], [8, 14, 'chrysanthemum', 0]].map(([r, c, t, o]) => ({ x: c - 8.5, y: r - 8.5, t, o }));
    let o = Board.base(k);
    if (T.spectral || k === 'spiritWalker') o += `<line class="harm" filter="url(#swHarm)" x1="${pos[0].x}" y1="${pos[0].y}" x2="${pos[1].x}" y2="${pos[1].y}" stroke="var(--p0)"/>`;
    else o += `<line class="harm" x1="${pos[0].x}" y1="${pos[0].y}" x2="${pos[1].x}" y2="${pos[1].y}" stroke="var(--p0)"/>`;
    o += pos.map((p) => `<g transform="translate(${p.x},${p.y}) scale(0.9)">${Glyphs.tile(p.t, p.o)}</g>`).join('');
    if (k === 'blackout' || k === 'blackoutOwner') {
      // dark most of the time; every few seconds the board flashes back with a strong ripple, while faint "sense" ripples mark the tiles in the dark
      const kt = 'keyTimes="0;0.62;0.68;0.9;0.96;1"';
      o += `<circle r="9.5" fill="#000" opacity="1"><animate attributeName="opacity" values="1;1;0;0;1;1" ${kt} dur="6s" repeatCount="indefinite"/></circle>`;
      o += pos.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="0.3" fill="none" stroke="#e8e8e8" stroke-width="0.06"><animate attributeName="r" values="0.3;1.8" dur="1.4s" begin="${(i * 0.37).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0" dur="1.4s" begin="${(i * 0.37).toFixed(2)}s" repeatCount="indefinite"/></circle>`).join('');
      o += `<circle r="1" fill="none" stroke="#fff" stroke-width="0.12" opacity="0"><animate attributeName="r" values="1;1;12;12" keyTimes="0;0.62;0.8;1" dur="6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.61;0.63;0.8;1" dur="6s" repeatCount="indefinite"/></circle>`;
    }
    return `<svg class="board-thumb" viewBox="-9.7 -9.7 19.4 19.4">${o}</svg>`;
  }
  function boardPreviewSheet(k) {
    const b = Eco.BOARDS[k]; if (!b) return;
    const own = me && Eco.ownsBoard(me, k);
    sheet(`<h3 style="text-align:center;margin-top:0">${esc(b.name)}</h3><div class="bprev-big">${boardPreview(k)}</div>
      <p class="tiny muted" style="text-align:center">${k === 'blackout' ? 'Seismic Sense: if you have it equipped, it’s the board in play whether you host or join. In Elemental games your opponent plays in the dark, feeling only faint tremors where tiles are while the board flashes back every few seconds, and the Melon Lord can’t touch you. If both players have it, the host gets the advantage.' : b.desc ? esc(b.desc) : b.unlock ? '' : 'Board theme. In online games, everyone plays on the host’s board.'}</p>
      <div class="menu">${own ? (me.board === k ? '<div class="tiny" style="text-align:center;color:#9fd18b">✓ In use</div>' : `<button class="btn primary" data-act="equipBoard" data-id="${k}">Use this board</button>`) : ''}<button class="btn" data-act="closeSheet">Close</button></div>`);
  }
  screens.store = () => {
    if (!me) { app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Store</h2><span style="width:42px"></span></div><div class="screen"><div class="card">Create a player (or sign in) to earn gold pieces and unlock tiles, pictures, emotes and boards.</div><button class="btn primary" data-act="toLogin">Sign in or create a player</button></div>`; return; }
    ensureMe();
    const tab = (k, l) => `<button class="${storeTab === k ? 'on' : ''}" data-act="storeTab" data-k="${k}">${l}</button>`;
    let body = '';
    if (storeTab === 'tiles') {
      body = `<p class="muted tiny" style="margin:0">Effect tiles for your loadouts. Everyone starts with Stone and Boat.</p><div class="store-grid">${P.EFFECT_TYPES.slice().sort((a, b) => Eco.TILE_PRICE[a] - Eco.TILE_PRICE[b]).map((t) => { const own = Eco.ownsTile(me, t); return `<div class="item ${own ? 'owned' : ''}">${Glyphs.svg(t, 0, 'style="width:52px;height:52px"')}<div class="nm">${P.tname(t)}</div><div class="ds">${esc(Guide.INFO[t][1].split('. ')[0])}.</div>${own ? '<span class="tiny" style="color:#9fd18b">✓ Owned</span>' : `<button class="btn small primary" data-act="buyItem" data-kind="tiles" data-id="${t}">🪙 ${Eco.TILE_PRICE[t]}</button>`}</div>`; }).join('')}</div>`;
    } else if (storeTab === 'avatars') {
      body = `<div class="store-grid">${Avatars.LIST.map((a) => { const own = Eco.ownsAvatar(me, a.id); return `<div class="item ${own ? 'owned' : ''}">${Avatars.svg(a.id, 56)}<div class="nm">${a.label}</div><div class="ds">${Avatars.EL[a.el].name}</div>${me.avatar === a.id ? '<span class="tiny" style="color:#9fd18b">✓ Wearing</span>' : own ? `<button class="btn small" data-act="equipAvatar" data-id="${a.id}">Wear</button>` : `<button class="btn small primary" data-act="buyItem" data-kind="avatars" data-id="${a.id}">🪙 ${(Avatars.price(a.id) || Eco.AVATAR_PRICE)}</button>`}</div>`; }).join('')}</div>`;
    } else if (storeTab === 'emotes') {
      const av = amAvatar();
      body = `<p class="muted tiny" style="margin:0">Common emotes are free. Nation emotes unlock with your nation${av ? '' : ' (the Avatar gets all of them)'}.</p><div class="emo-grid">${Eco.EMOTES.map((x) => { const un = Eco.emoteUnlocked(me, x.id, av); const why = un ? '✓' : x.kind === 'store' ? `<button class="btn small primary" data-act="buyItem" data-kind="emotes" data-id="${x.id}" style="padding:4px 8px;min-height:30px">🪙 ${x.price}</button>` : x.kind === 'avatar' ? '👑 Avatar only' : Eco.NATIONS[x.kind] ? Eco.NATIONS[x.kind].name + ' Nation' : ''; return `<div class="emo ${un ? '' : 'locked'}" style="${un ? '' : 'opacity:.75'}"><span class="e">${x.e}</span><span class="t">${esc(x.t)}</span><span class="tiny">${why}</span></div>`; }).join('')}</div>`;
    } else {
      body = `<p class="muted tiny" style="margin:0">Board themes: in online games, everyone plays on the <b>host’s</b> board. Your nation’s board is free.</p><div class="store-grid">${Object.entries(Eco.BOARDS).filter(([, b]) => !b.hidden).map(([k, b]) => { const own = Eco.ownsBoard(me, k); return `<div class="item ${own ? 'owned' : ''}"><button class="bprev-btn" data-act="boardPreview" data-id="${k}" aria-label="Preview">${boardPreview(k)}<span class="bprev-hint">▶ Preview</span></button><div class="nm">${b.name}</div>${b.unlock ? `<div class="ds">${b.desc || 'Always in play when equipped: opponents play in the dark in Elemental games (host wins ties)'}</div>` : ''}${me.board === k ? '<span class="tiny" style="color:#9fd18b">✓ In use</span>' : own ? `<button class="btn small" data-act="equipBoard" data-id="${k}">Use</button>` : b.unlock === 'walker' ? (me.pastLife ? `<button class="btn small primary" data-act="buyWalker">🪙 All ${gpFmt(me.gp || 0)}</button>` : '<span class="tiny muted">🔒 Only an Avatar reborn as a past-life spirit · costs all your gold</span>') : b.unlock === 'spirit' ? '<span class="tiny muted">🔒 Enter the Spirit Realm</span>' : b.unlock ? `<span class="tiny muted">🔒 Call the Melon Lord 100× (${Math.min(100, me.melonUses || 0)}/100)</span>` : `<button class="btn small primary" data-act="buyItem" data-kind="boards" data-id="${k}">🪙 ${b.price}</button>`}</div>`; }).join('')}</div>`;
    }
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Store</h2><span class="gp-pill">${gpFmt(me.gp)}</span></div>
      <div class="screen"><div class="seg">${tab('tiles', 'Tiles')}${tab('avatars', 'Pictures')}${tab('emotes', 'Emotes')}${tab('boards', 'Boards')}<button data-act="go" data-to="character">👘 Clothes</button></div>${body}
      <div class="note">Earn gold: computer games pay a little (more on Hard), online games pay a lot — even a loss earns some. Completing a ring adds a bonus.</div></div>`;
  };

  // ---------- bending ----------
  let lastSpam = 0;
  function showFx(el) {
    const wrap = document.querySelector('.board-wrap'); if (!wrap) return;
    const fx = document.createElement('div'); fx.className = 'bend-fx fx-' + el;
    const ch = { fire: '🔥', water: '🌊', earth: '🪨', air: '🌪️', melon: '🍈' }[el] || '✨';
    let parts = '';
    for (let k = 0; k < 16; k++) parts += `<span style="left:${Math.random() * 92}%;top:${Math.random() * 90}%;animation-delay:${(Math.random() * 0.8).toFixed(2)}s;font-size:${22 + Math.random() * 30}px">${ch}</span>`;
    fx.innerHTML = parts; wrap.appendChild(fx);
    if (el === 'earth') { wrap.classList.add('shake'); setTimeout(() => wrap.classList.remove('shake'), 600); }
    setTimeout(() => fx.remove(), 2700);
  }
  async function spamBend(el) {
    if (Date.now() - lastSpam < 800) return;
    lastSpam = Date.now(); closeSheet();
    G.spam = (G.spam || 0) + 1; bump('spamSent');
    if (G.mode === 'online') { Store.patch('games', G.code, { spam: { seat: G.my, el, t: Date.now() } }).catch(() => {}); if (G.spam === 1) toast(Eco.BEND[el].icon + ' Sent to their board!'); buzz(6); }
    else showFx(el);
  }
  function startBendSel(el) {
    closeSheet();
    const seat = bendSeat(), s = G.s;
    if (!P.canAffordBend(s, seat)) return toast('You need an effect or accent tile to give up (or a harmony) to bend');
    const t = P.bendTargets(s, seat); if (!t.length) return toast('No opposing tiles to target');
    G.sel = { kind: 'bend', el, targets: t };
    renderBoard(); toast(`${Eco.BEND[el].icon} Tap one of their tiles to ${Eco.BEND[el].verb.toLowerCase()}`);
  }
  function startSub(kind) {
    closeSheet();
    const s = G.s, seat = bendSeat();
    if (kind === 'lightning' || kind === 'flight') return doBend({ t: 'sub', kind });
    if (kind === 'metal') { G.sel = null; G.metal = { seat, real: G.s, ops: [], mode: null, pick: null }; G.s = P.clone(G.s); renderGame(); return; }
    if (kind === 'blood') { const ms = P.bloodMoves(s, seat); if (!ms.length) return toast('They have nothing to move'); G.sel = { kind: 'blood', moves: ms, from: null }; renderBoard(); return toast('🩸 Tap one of their tiles, then where it goes'); }
  }
  async function doBend(a) {
    if (!G) return;
    if (G.mode === 'spectate') return spiritSend(a);
    if (a.t !== 'avatarState' || a.by == null) a.by = bendSeat(); G.sel = null;
    // during the opponent's turn online: queue it; their phone applies it instantly
    if (G.mode === 'online' && !isHumanTurn()) {
      let s3; try { s3 = P.apply(G.s, a); } catch (e) { toast(a.t === 'melon' ? 'No Melon Lords left this match' : 'That bend isn’t possible'); renderBoard(); return false; }
      if (a.t === 'melon' || a.t === 'sub') G.s = s3; // count it locally right away so it can't be re-sent before their phone applies it
      const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await Store.patch('games', G.code, { bq: { [id]: a } }).catch(() => toast('Couldn’t send — check your connection'));
      if (a.t === 'bend') G.bendsUsed = (G.bendsUsed || 0) + 1; G.trkB = (G.trkB || 0) + 1;
      toast('Bending sent — it lands on their board now'); renderBoard(); return true;
    }
    let s2;
    try { s2 = P.apply(G.s, a); } catch (e) { toast(e.message === 'No effect tile to give up' ? 'You need an effect tile to give up' : a.t === 'melon' ? 'No Melon Lords left this match' : 'That bend isn’t possible'); renderBoard(); return false; }
    track(G.s, s2, a, a.by); G.history.push(G.s); G.s = s2; if (a.t === 'bend') G.bendsUsed = (G.bendsUsed || 0) + 1;
    if (a.t === 'bend') showFx(a.el); else if (a.t === 'melon') showFx('melon'); else if (a.t === 'avatarState') { if (a.accept) showFx('air'); } else showFx({ metal: 'earth', lightning: 'fire', blood: 'water', flight: 'air', gust: 'air' }[a.kind]);
    if (a.t === 'sub' && a.kind === 'metal' && G.s.lastMetal) { const L = G.s.lastMetal; toast(`⚙️ Metalbent${L.oppLost ? ` · broke ${L.oppLost} of their harmonies` : ''}${L.ownLost ? ` · broke ${L.ownLost} of yours` : ''}${L.lost ? ` · ${L.lost} flower${L.lost > 1 ? 's' : ''} lost to the wrong garden` : ''}${G.mode === 'online' && L.amt ? ` · +${L.amt} gp` : ''}`, 4000); }
    if (a.t === 'sub' && a.kind === 'gust' && G.s.lastBend && G.s.lastBend.lost) toast('🌬️ Blown into the wrong garden: that flower is lost!');
    const lb = G.s.lastBend; if (lb && lb.paid) toast(`It cost you your ${P.tname(lb.paid)}`);
    if (a.t === 'sub' && a.kind === 'metal' && G.s.turn !== a.by) { G.history = []; if (G.mode === 'online') pushOnline(); renderGame(); afterTurnChange(); return true; }
    if (G.mode === 'online') pushOnline();
    renderGame();
    if (a.t === 'sub' && a.kind === 'flight') analyse();
    return true;
  }
  // the player whose turn it is applies bends the opponent queued
  function applyQueuedBends(nd) {
    if (!G || G.mode !== 'online' || !nd.bq || !isHumanTurn()) return;
    G.s.bqDone = G.s.bqDone || [];
    let changed = false;
    Object.keys(nd.bq).sort().forEach((id) => {
      if (G.s.bqDone.includes(id)) return;
      const a = nd.bq[id];
      try { const s2 = P.apply(G.s, a); s2.bqDone = (G.s.bqDone || []).concat([id]); G.s = s2; changed = true; showFx(a.t === 'bend' ? a.el : a.t === 'melon' ? 'melon' : 'fire'); toast(a.t === 'melon' ? `🍈 ${G.seats[a.by].name} called the MELON LORD! You’re going blind…` : `${G.seats[a.by].name} ${a.t === 'bend' ? Eco.BEND[a.el].verb.toLowerCase() + (a.el === 'air' ? 's' : a.el === 'water' ? 'es' : 's') + ' one of your tiles!' : 'used ' + Eco.SUBS[a.kind].name + '!'}`, 3200); }
      catch (e) { G.s = P.clone(G.s); G.s.bqDone = (G.s.bqDone || []).concat([id]); Store.patch('games', G.code, { bqFail: { [id]: { by: a.by, kind: a.kind || a.t, why: String(e && e.message || e).slice(0, 80), t: Date.now() } } }).catch(() => {}); }
    });
    if (changed) { G.sel = null; G.history = []; renderGame(); pushOnline(); }
  }

  // ---------- chat & the Melon Lord ----------
  const MELON = /m+\W*e+\W*l+\W*o+\W*n+[\s\-_.,!~*]*l+\W*o+\W*r+\W*d+/i;
  function addChat(m, fromRemote) {
    G.chat = G.chat || []; if (G.chat.some((x) => x.id === m.id)) return;
    G.chat.push(m); G.chat.sort((a, b) => a.t - b.t);
    const open = document.getElementById('chat-log');
    if (open) renderChatLog(); else if (fromRemote) { G.unread = (G.unread || 0) + 1; renderChatBtn(); }
    if (fromRemote) showTextBubble(m.seat, m.text);
  }
  function renderChatBtn() { const b = document.getElementById('chat-btn'); if (b) b.innerHTML = '💬' + (G.unread ? `<span class="badge">${G.unread}</span>` : ''); }
  function renderChatLog() {
    const el = document.getElementById('chat-log'); if (!el) return;
    el.innerHTML = (G.chat || []).map((m) => `<div class="msg ${m.seat === (G.my != null ? G.my : -1) ? 'mine' : ''}"><b>${esc(G.seats[m.seat].name)}</b> ${esc(m.text)}</div>`).join('') || '<div class="muted tiny">Say hi! In Elemental games, a certain earthbender’s favourite title has… effects. 🍈</div>';
    el.scrollTop = el.scrollHeight;
  }
  function showTextBubble(seat, text) {
    const seatEl = document.querySelectorAll('#seats .seat')[seat]; if (!seatEl) return;
    const r = seatEl.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'bubble';
    b.innerHTML = `<span>💬 ${esc(text.length > 60 ? text.slice(0, 58) + '…' : text)}</span>`;
    b.style.top = (r.bottom + 6) + 'px'; b.style.left = Math.max(8, Math.min(window.innerWidth - 260, r.left + 8)) + 'px';
    document.body.appendChild(b);
    setTimeout(() => { b.style.transition = 'opacity .3s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 320); }, 3500);
  }
  async function sendChat(text) {
    text = (text || '').trim().slice(0, 140); if (!text || !G) return;
    const seat = G.my != null ? G.my : G.s.turn;
    const m = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), seat, text, t: Date.now() };
    addChat(m, false); bump('chatsSent');
    if (G.mode === 'online') Store.patch('games', G.code, { chat: { [m.id]: { seat, text, t: m.t } } }).catch(() => toast('Message not sent'));
    else if (G.mode === 'local') showTextBubble(seat, text);
    // 🍈 the Melon Lord
    const s = G.s;
    if (s.bend && MELON.test(text) && s.winner === null) {
      if (P.melonLeft(s, seat) <= 0 || (G.melonCalls || 0) >= P.MELON_MAX) return toast('No Melon Lords left this match');
      if (s.melon && s.melon.blind != null) return toast('They’re already blinded — wait for their next turn');
      if (s.seismic === 1 - seat) return toast('🪨 ' + G.seats[1 - seat].name + ' has seismic sense from the Blackout board. The Melon Lord can’t blind them!');
      const target = 1 - seat;
      if (G.seats[target].kind === 'ai') { s.melon = s.melon || { used: [false, false], blind: null, bonus: [false, false] }; }
      if ((G.melonCalls || 0) >= P.MELON_MAX) return toast('No Melon Lords left this match');
      Promise.resolve(doBend({ t: 'melon' })).then((ok) => {
        if (!ok || !G) return;
        G.melonCalls = (G.melonCalls || 0) + 1;
        if (me) syncCounters().then(() => { me.melonUses = (me.melonUses || 0) + 1; saveMe(); if (me.melonUses >= 100) setTimeout(checkAch, 1500); });
        toast('🍈 MELON LORD! ' + G.seats[target].name + ' is blinded for their next move');
      });
    }
  }

  // ---------- emotes ----------
  let lastEmoteSent = 0;
  function showBubble(seat, id) {
    const x = Eco.EMO[id]; if (!x) return;
    const seatEl = document.querySelectorAll('#seats .seat')[seat]; if (!seatEl) return;
    const r = seatEl.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'bubble';
    b.innerHTML = `<span class="e">${x.e}</span><span>${esc(x.t)}</span>`;
    b.style.top = (r.bottom + 6) + 'px'; b.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left + 8)) + 'px';
    document.body.appendChild(b); buzz(8);
    setTimeout(() => { b.style.transition = 'opacity .3s'; b.style.opacity = '0'; setTimeout(() => b.remove(), 320); }, 2800);
  }
  async function sendEmote(id) {
    if (!G || Date.now() - lastEmoteSent < 2500) return toast('Easy there — one emote every few seconds');
    lastEmoteSent = Date.now();
    const seat = G.my != null ? G.my : G.s.turn;
    showBubble(seat, id);
    if (me) { me.emotesSent = (me.emotesSent || 0) + 1; if (me.emotesSent % 5 === 0 || me.emotesSent === 10) { saveMe(); setTimeout(checkAch, 500); } }
    if (G.mode === 'online') Store.patch('games', G.code, { emote: { seat, id, t: Date.now() } }).catch(() => {});
    if (G.mode === 'ai' && Math.random() < 0.55) {
      const replies = ['hi', 'nice', 'hmm', 'wow', 'gg']; const aiSeat = 1 - seat;
      setTimeout(() => { if (G) showBubble(aiSeat, replies[Math.floor(Math.random() * replies.length)]); }, 1400);
    }
  }

  // ---------- setup ----------
  screens.setup = () => {
    const S = setup;
    const fxSel = S.fx[S.mode === 'local' ? S.fxTab : 0];
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[key] == v ? 'on' : ''}" data-act="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>${S.mode === 'ai' ? 'Play the computer' : 'Pass & play'}</h2><span style="width:42px"></span></div>
    <div class="screen">
      ${S.mode === 'ai' ? `<div class="field"><label>Difficulty</label>${seg('level', [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']])}</div>
        <div class="field"><label>Who goes first</label>${seg('first', [['me', 'Me'], ['ai', 'Computer'], ['rand', 'Random']])}</div>`
      : `<div class="field"><label>Player 2</label><div class="row"><button class="prof" data-act="pickP2" style="flex:1">${av(S.p2.name)}<div><div class="nm">${esc(S.p2.name)}</div><div class="tiny muted">${S.p2.pid ? 'Signed in — stats will count' : 'Guest — tap to sign in a player'}</div></div></button></div></div>
        <div class="field"><label>First move</label>${seg('first', [['me', esc(myName())], ['ai', esc(S.p2.name)], ['rand', 'Random']])}</div>`}
      <div class="card">
        <div class="row"><b class="disp" style="color:var(--gold2)">Effect tiles</b><span class="spacer"></span><span class="muted">${fxSel.length}/6</span></div>
        ${S.mode === 'local' ? `<div class="seg" style="margin-top:10px"><button class="${S.fxTab === 0 ? 'on' : ''}" data-act="fxTab" data-v="0">${esc(myName())}</button><button class="${S.fxTab === 1 ? 'on' : ''}" data-act="fxTab" data-v="1">${esc(S.p2.name)}</button></div>` : ''}
        ${(S.mode !== 'local' || S.fxTab === 0) ? `<div class="row wrap" style="margin:10px 0">${getLoadouts().list.map((x, i) => `<button class="btn small ${JSON.stringify(x.fx.slice().sort()) === JSON.stringify(fxSel.slice().sort()) ? 'primary' : ''}" data-act="useLoadout" data-i="${i}">${esc(x.name)}</button>`).join('')}<button class="btn small ghost" data-act="go" data-to="loadouts">Edit loadouts ›</button></div>` : ''}
        <div class="row wrap" style="margin:6px 0 10px"><button class="btn small" data-act="fxPreset" data-v="none">Beginner (none)</button><button class="btn small" data-act="fxPreset" data-v="flowers">4 special flowers</button><button class="btn small" data-act="fxPreset" data-v="rand">Random 6</button></div>
        ${fxGrid(fxSel, 'fx', S.mode === 'local' && S.fxTab === 1 ? (S.p2.prof || null) : me)}
        <div class="tiny muted" style="margin-top:6px">Changes here apply to this game only. 🔒 tiles are unlocked in the Store.</div>
        ${S.mode === 'ai' ? `<div class="tiny muted" style="margin-top:8px">The computer uses: ${AI.AI_EFFECTS[S.level].map(P.tname).join(', ') || 'no effect tiles'}.</div>` : ''}
      </div>
      ${variationsCard()}
      <button class="btn primary" data-act="beginGame">Start game</button>
    </div>`;
  };
  const SHORT = {
    orchid: 'Moving it gives you a bonus move the same turn.',
    lotus: 'Harmonizes with any flower at any distance. Can open the centre.',
    firelily: 'Moves up to 6 steps. Blocks only their harmonies.',
    dahlia: 'Jumps any distance; must land next to a tile.',
    stone: 'Your key flowers can land in its quarter, any colour.',
    knotweed: 'Flowers next to it can’t move or harmonize.',
    wheel: 'Spins all tiles around it 1–3 places.',
    boat: 'Carries all neighbouring tiles when it moves.',
    badgermole: 'Slides under a tile; that tile ignores other accents.',
    dragon: 'Lands on a tile to send it back to its owner.',
    skybison: 'Carries a flower; its harmonies can’t be blocked.',
    koi: 'Swaps two tiles on opposite sides of it.',
  };
  const shortDesc = (t) => SHORT[t] || Guide.INFO[t][1].split('. ')[0] + '.';
  function fxGrid(sel, act = 'fx', prof) {
    if (prof === undefined) prof = me;
    return `<div class="fx-grid">${P.EFFECT_TYPES.map((t) => { const own = Eco.ownsTile(prof, t); return `<button class="fx ${sel.includes(t) && own ? 'on' : ''} ${own ? '' : 'locked'}" data-act="${own ? act : 'lockedTile'}" data-t="${t}" ${own ? '' : `data-mine="${prof === me ? 1 : 0}"`}>${own ? '' : `<span class="price">🔒 ${Eco.TILE_PRICE[t]}</span>`}${Glyphs.svg(t, 0)}<span class="nm">${P.tname(t)}</span><span class="ty">${P.isSpecial(t) ? 'flower' : 'accent'} · moves ${Guide.INFO[t][2]}</span><span class="fx-ds">${esc(shortDesc(t))}</span><span class="fx-i" data-act="tileDetails" data-t="${t}" data-o="0" role="button" aria-label="Full rules for ${P.tname(t)}">ⓘ</span></button>`; }).join('')}</div>`;
  }
  function variationsCard() {
    const S = setup;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[key] == v ? 'on' : ''}" data-act="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="card"><b class="disp" style="color:var(--gold2)">Variations</b>
      <div class="field" style="margin-top:10px"><label>Harmonies needed in the ring</label>${seg('minH', [[3, '3'], [4, '4'], [6, '6'], [10, '10']])}</div>
      <div class="field" style="margin-top:10px"><label>Turn timer</label>${seg('timer', [[0, 'Off'], [30, '30s'], [60, '60s'], [120, '2m']])}</div>
      <div class="toggle"><div><b>🌀 Elemental mode</b><div class="tiny muted">Bending: each player can burn, wash, smash or sweep one tile per game, at any time</div></div><span class="sw ${S.bending ? 'on' : ''}" data-act="swSet" data-k="bending"></span></div>
      <div class="toggle"><div><b>🎓 Sub-bending practice</b><div class="tiny muted">Everyone gets their nation’s sub-bending, 3 uses with a 2-turn cooldown. Just 10 XP and 30 gp, and it doesn’t count toward your record or rank.</div></div><span class="sw ${S.subPractice ? 'on' : ''}" data-act="swSet" data-k="subPractice"></span></div>
      <div class="toggle"><div><b>Hints &amp; tips</b><div class="tiny muted">Show which moves make harmonies, warnings and tips</div></div><span class="sw ${S.hints !== false ? 'on' : ''}" data-act="swSet" data-k="hints"></span></div>
      <div class="toggle"><div><b>Game of chance</b><div class="tiny muted">Key flowers are drawn at random when planting</div></div><span class="sw ${S.chance ? 'on' : ''}" data-act="swSet" data-k="chance"></span></div>
      <div class="toggle"><div><b>Effect tile enigma</b><div class="tiny muted">Hide your opponent’s effect tiles until played</div></div><span class="sw ${S.enigma ? 'on' : ''}" data-act="swSet" data-k="enigma"></span></div></div>`;
  }

  // ---------- lobby (online) ----------
  let lobbyUnsub = null;
  let lobbyFxSet = false;
  screens.lobby = () => {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
    if (!document.getElementById('opengames')) setup.fx[0] = equipped().fx.slice();
    if (!Store.online()) {
      app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Play online</h2><span style="width:42px"></span></div>
      <div class="screen"><div class="card"><p>Online play needs a shared place to keep the game. It works automatically in the version hosted on claude.ai, or when you run <b>server.js</b> on your PC and open it from your phone on the same Wi-Fi.</p><p class="muted">Right now this copy is running on its own, so only computer and pass-and-play games are available.</p></div></div>`;
      return;
    }
    const S = setup;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Play online</h2><span style="width:42px"></span></div>
    <div class="screen">
      <div class="card"><div class="field"><label>Join with a code</label><div class="row"><input class="input" id="joincode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;letter-spacing:.3em;font-family:Cinzel"><button class="btn primary" data-act="joinCode">Join</button></div></div></div>
      <button class="btn primary" data-act="createOnline">Create a new game</button>
      <div class="field"><label>Your games</label><div id="mygames" class="menu"><div class="muted tiny">Loading…</div></div></div>
      ${Store.p2p() ? '<div id="opengames" style="display:none"></div>' : '<div class="field"><label>Open games</label><div id="opengames" class="menu"><div class="muted tiny">Loading…</div></div></div>'}
      <div class="card"><div class="row"><b class="disp" style="color:var(--gold2)">Your effect tiles</b><span class="spacer"></span><span class="muted">${S.fx[0].length}/6</span></div><div class="row wrap" style="margin:10px 0 0">${getLoadouts().list.map((x, i) => `<button class="btn small ${JSON.stringify(x.fx.slice().sort()) === JSON.stringify(S.fx[0].slice().sort()) ? 'primary' : ''}" data-act="useLoadout" data-i="${i}">${esc(x.name)}</button>`).join('')}</div><div class="row wrap" style="margin:10px 0"><button class="btn small" data-act="fxPreset" data-v="none">None</button><button class="btn small" data-act="fxPreset" data-v="flowers">4 flowers</button><button class="btn small" data-act="fxPreset" data-v="rand">Random</button></div>${fxGrid(S.fx[0])}</div>
      ${variationsCard().replace('<b class="disp" style="color:var(--gold2)">Variations</b>', '<b class="disp" style="color:var(--gold2)">Variations (for games you create)</b>')}
      <div class="tiny muted">${Store.kind === 'firebase' ? 'Games are saved online: close the app any time and pick up where you left off. Turn on turn alerts in your profile to get a notification when it’s your move.' : Store.p2p() ? 'Phone-to-phone: create a game, send your friend the code, and keep this page open while you play. Works over Wi-Fi or mobile data.' : Store.kind === 'artifact' ? 'Friends need access to this app to join: share it with them as editors.' : 'Anyone on your Wi-Fi who opens this server can join.'}</div>
    </div>`;
    const pid = myPid();
    const timer = setTimeout(() => { const el = document.getElementById('opengames'); if (el && /Loading/.test(el.textContent)) el.innerHTML = '<div class="muted tiny">Can’t reach the game list yet.</div>'; }, 10000);
    lobbyUnsub = Store.watchCol('games', (games) => {
      clearTimeout(timer);
      const now = Date.now();
      const mine = games.filter((g) => g.kind !== 'fight' && g.status !== 'done' && ((g.host && g.host.pid === pid) || (g.guest && g.guest.pid === pid)) && now - (g.updated || 0) < 14 * 864e5);
      const open = games.filter((g) => g.kind !== 'fight' && g.status === 'open' && g.host && g.host.pid !== pid && now - (g.updated || 0) < 2 * 864e5);
      const mg = document.getElementById('mygames'), og = document.getElementById('opengames');
      if (!mg) return;
      mg.innerHTML = mine.map((g) => { const opp = g.host.pid === pid ? (g.guest ? g.guest.name : 'waiting…') : g.host.name; return `<button class="btn" data-act="resumeOnline" data-code="${esc(g.id)}"><span class="disp">${esc(g.id)}</span><span class="spacer"></span>vs ${esc(opp)} · ${g.status === 'open' ? 'waiting' : 'in play'}</button>`; }).join('') || '<div class="muted tiny">None yet.</div>';
      og.innerHTML = open.map((g) => `<button class="btn" data-act="joinGame" data-code="${esc(g.id)}">${av(g.host.name)}<span>${esc(g.host.name)}</span><span class="spacer"></span><span class="disp">${esc(g.id)}</span></button>`).join('') || '<div class="muted tiny">No open games. Create one and share the code.</div>';
    });
  };

  async function createOnline(invited = '') {
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const S = setup;
    const doc = { code, status: 'open', created: Date.now(), updated: Date.now(), ver: 0, state: null,
      opts: { minH: +S.minH, timer: +S.timer, chance: !!S.chance, enigma: !!S.enigma, bending: !!S.bending || !!S.subPractice, subPractice: !!S.subPractice, rules: 'key' },
      host: { pid: myPid(), name: myName(), avatar: myAvatar(), fig: myFig(), board: myBoard(), pw: Eco.powersFor(me, amAvatar()), fx: S.fx[0].filter((t) => Eco.ownsTile(me, t)) }, guest: null, pids: [myPid()] };
    if (Store.kind === 'firebase') doc.uids = [FB.uid];
    if (Store.kind === 'firebase' && TurnAlerts.supported() && !TurnAlerts.enabled() && !Store.LS.get('askedAlerts')) { Store.LS.set('askedAlerts', 1); TurnAlerts.enable(); }
    if (Store.p2p()) P2P.host(code);
    try { await Store.set('games', code, doc); } catch (e) { return toast('Couldn’t create the game (no write access?)'); }
    waitOnline(code, invited);
    return code;
  }
  function waitOnline(code, invited = '') {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="cancelOnline" data-code="${code}">‹</button><h2>Waiting</h2><span style="width:42px"></span></div>
      <div class="screen" style="justify-content:center;text-align:center">${logoSvg(120)}<p class="muted">Share this code with your opponent</p><div class="code">${code}</div><p class="muted">They join from <b>Play online</b>. You’ll play as the Host; the Guest moves first.</p>
      <button class="btn" data-act="copyCode" data-code="${code}">Copy code</button>
      ${invited && invPick && invPick.pid ? `<button class="btn" data-act="dmOpen" data-pid="${esc(invPick.pid)}" data-name="${esc(invited)}">💬 Message ${esc(invited)}</button>` : ''}
      ${invited ? `<p class="tiny muted" style="margin-top:14px">${esc(invited)} doesn’t have to be online. They’ll get a notification, and you’ll get one when they join.</p>` : ''}
      <button class="btn ghost" data-act="leaveWaiting">Keep it open and go home</button><div class="tiny muted">It stays under <b>Your games</b> in Play online. Use ‹ to cancel it instead.</div></div>`;
    const un = Store.watch('games', code, (d) => {
      if (d && d.status === 'playing' && d.state) { un(); startOnline(d); }
    });
    G = { waitingUnsub: un };
  }
  async function joinGame(code) {
    code = (code || '').toUpperCase().trim();
    if (!/^[A-Z]{4}$/.test(code)) return toast('Codes are 4 letters');
    let d;
    if (Store.p2p() && !(P2P.get(code) && P2P.get(code).host.pid === myPid())) {
      toast('Connecting to ' + code + '…', 3000);
      try { d = await P2P.join(code); } catch (e) { return toast(e.message === 'nohost' ? 'No one is hosting ' + code + ' right now' : 'Couldn’t connect — check the code and try again'); }
    } else d = await Store.get('games', code).catch(() => null);
    if (!d) return toast('No game with that code');
    if (d.kind === 'fight') return duelJoin(code, d);
    const pid = myPid();
    if (d.host.pid === pid) return d.status === 'open' ? waitOnline(code) : startOnline(d);
    if (d.guest && d.guest.pid === pid) return startOnline(d);
    if (d.status !== 'open') return toast('That game already has two players');
    const guest = { pid, name: myName(), avatar: myAvatar(), fig: myFig(), board: myBoard(), pw: Eco.powersFor(me, amAvatar()), fx: setup.fx[0].filter((t) => Eco.ownsTile(me, t)) };
    const s = P.newGame({ effects: [guest.fx, d.host.fx], minHarmonies: d.opts.minH, chance: d.opts.chance, bending: !!d.opts.bending, subPractice: !!d.opts.subPractice, powers: [guest.pw || { nation: null }, d.host.pw || { nation: null }], seismic: d.host.board === 'blackout' ? 1 : myBoard() === 'blackout' ? 0 : null, spirit: d.host.board === 'spirit' ? 1 : null });
    const nd = Object.assign({}, d, { guest, pids: [d.host.pid, guest.pid], status: 'playing', state: JSON.stringify(s), ver: 1, updated: Date.now() });
    delete nd.id;
    if (Store.kind === 'firebase') nd.uids = Array.from(new Set((d.uids || []).concat(FB.uid)));
    try { await Store.set('games', code, nd); } catch (e) { return toast('Couldn’t join (no write access?)'); }
    if (d.host && d.host.pid) Push.send(d.host.pid, '🎮 Game on!', `${myName()} joined your game ${code}`, 'g-' + code);
    startOnline(Object.assign({ id: code }, nd));
  }


  // ---------- friends ----------
  function friendsLine() {
    if (Store.kind === 'firebase' && !me) return 'Sign in to add friends';
    const f = Soc().friends(), on = f.filter((x) => Soc().isOnline(x.code)).length, rq = Soc().requests().length;
    const iv = Store.kind === 'firebase' && FireSocial.invites ? FireSocial.invites().length : 0;
    const un = Store.kind === 'firebase' && FireSocial.unreadCount ? FireSocial.unreadCount() : 0;
    if (un) return `💬 ${un} unread message${un > 1 ? 's' : ''}`;
    if (iv) return `🎮 ${iv} game invite${iv > 1 ? 's' : ''} waiting`;
    return rq ? `${rq} friend request${rq > 1 ? 's' : ''}` : f.length ? `${on} of ${f.length} online` : 'Add friends with a code';
  }
  function startSocial() {
    if (Store.kind === 'artifact') return;
    if (Store.kind === 'firebase') { if (me) { if (!FireSocial.active) FireSocial.start({ pid: me.id, name: me.name, avatar: me.avatar }).then(() => { if (document.querySelector('[data-act="startSetup"]')) screens.home(); }); TurnAlerts.start(me.id); } return; }
    const go2 = () => Soc().start({ pid: myPid(), name: myName(), avatar: myAvatar() });
    if (Soc().ready()) go2(); else { let n = 0; const t = setInterval(() => { if (Soc().ready()) { clearInterval(t); go2(); if (document.querySelector('[data-act="startSetup"]')) screens.home(); } else if (++n > 40) clearInterval(t); }, 250); }
  }
  async function notifTest() {
    const rows = [];
    const add = (ok, t) => rows.push(`<div class="trow" style="align-items:center"><span style="font-size:20px">${ok === null ? '⏳' : ok ? '✅' : '❌'}</span><div>${t}</div></div>`);
    const show = () => sheet(`<h3>🔔 Notification check</h3><div class="tlist">${rows.join('')}</div><p class="tiny muted">If ✅ everywhere but no banner pops up, it’s the phone’s setting: long-press a Pai Sho notification → ⚙️ → set to <b>Alert</b> and turn on <b>Pop-up</b>. Also check Do Not Disturb.</p>`);
    add('Notification' in window && Notification.permission === 'granted', 'Permission: ' + ('Notification' in window ? Notification.permission : 'not supported'));
    let reg = null; try { reg = await navigator.serviceWorker.getRegistration(); if (reg) await reg.update().catch(() => {}); } catch (e) {}
    add(!!(reg && reg.active), 'Background helper: ' + (reg && reg.active ? 'running' : 'missing'));
    let sub = null; try { sub = reg && await reg.pushManager.getSubscription(); } catch (e) {}
    if (!sub && me) { await Push.subscribe(me.id); try { sub = reg && await reg.pushManager.getSubscription(); } catch (e) {} }
    add(!!sub, 'Closed-app alerts: ' + (sub ? 'signed up' : 'not signed up'));
    show();
    try { if (reg) await reg.showNotification('Pai Sho · test 1 of 2', { body: 'This one came straight from the app.', tag: 'test-local', icon: 'icon-192.png', badge: 'icon-192.png' }); add(true, 'Test 1 sent from the app (should pop up now)'); } catch (e) { add(false, 'Test 1 failed: ' + esc(e.message || e)); }
    show();
    if (me && sub) { Push.send(me.id, 'Pai Sho · test 2 of 2', 'This one came through the internet. Closed-app alerts work!', 'test-push'); add(null, 'Test 2 sent through the server (arrives in a few seconds)'); }
    show();
  }
  // ---------- What's new (shown once per update) ----------
  const NEWS = { v: '2026-11-17e', items: [
    ['🌈', 'Host’s board', 'In online games, both players now play on the host’s board. Show it off.'],
    ['👻', 'Past lives', 'If the Avatar enters the Spirit Realm, they give up the title and become a past-life spirit: all four elements forever, plus watching over the next Avatar’s matches with two bends per match and hints.'],
    ['☯️', 'Avatar duels', 'The Avatar (and past lives) can blast with all four elements in bending duels.'],
    ['🥋', 'Bending duels', 'Fight a friend in real time with your character: strike, blast, block and dodge. The winner takes gold from the loser, more for beating a higher level. Practice against a training dummy any time.'],
    ['🏷️', 'Nation titles', 'Earn a new title at Level 1, 5, 10 and every 10 levels after, up to Level 100.'],
    ['🔄', 'Reincarnation', 'Reach Level 100 to reincarnate: back to Level 1 with new achievements, up to six times. After your final life, rise past 100 or enter the Spirit Realm for a ghostly look and the Spirit board.'],
    ['⚠️', 'Switching nations', 'Changing nation now starts you over from scratch. Only your gold carries over.'],
    ['🧍', 'Characters', 'Build your own character: body, skin, eyes, hair and outfits. Unlock more clothes, hairstyles and accessories in the store. It shows on your profile and in your game seat.'],
    ['🌀', 'Airbending Masters', 'Air Nomads earn their arrow markings at level 5. Avatars glow in Avatar State.'],
    ['⚙️', 'New Metalbending', 'Your whole turn: swap two tiles, or move/smash up to two. Steals gold from your opponent.'],
    ['🪽', 'New Flight', 'Watch your opponent’s turn live and blow one of their tiles across the board with a Gust.'],
    ['✨', 'Avatar State', 'The Avatar can undo any sub-bending used on them for 300 gp.'],
    ['🎓', 'Sub-bending practice', 'A new mode: everyone can sub-bend, whatever their level. Small rewards, no record.'],
    ['🎭', 'Play styles', 'Stats now show how you play: Gardener, Aggressor, Guardian, Trickster or Balanced, worked out from your moves.'],
    ['👀', 'Live style tags', 'During a match, a tag under each name shows how they’re playing right now, like “More defensive than usual”.'],
    ['⚡', 'Fastest wins', 'Your record for the fewest moves to win, online and against the computer.'],
    ['🍈', 'Melon Lord ×3', 'Call it up to 3 times per match.'],
    ['🖼️', '20 new profile pictures', 'Sky Bison, Dragon, Lion Turtle, Badgermole, Moon & Ocean, Koi, Phoenix, Panda and more.'],
    ['🎨', '19 new boards', 'Sakura Spring, Glacier, Spirit World, Aurora, Neon Night, Royal Gold and lots more.'],
    ['😂', '22 new emotes', 'A cartoony pack, from 😎 Too cool to 🥬 My cabbages! Three of them are free.'],
    ['🎁', 'Daily rewards', 'Claim free gold and XP every day. Your streak makes them bigger.'],
    ['🏁', 'Game summaries', 'See who won, what you earned, your level bar and new achievements after every game.'],
    ['🎮', 'Pick the mode when you invite', 'Choose the rules, timer and Elemental mode, and invite friends who are offline.'],
  ] };
  function newsCheck() {
    if (!me || Store.LS.get('newsSeen') === NEWS.v || document.querySelector('.sheet')) return;
    if (!Eco.dailyState(me).claimed && Store.LS.get('dailyShown') !== me.id + Eco.dayKey()) return; // daily reward first
    Store.LS.set('newsSeen', NEWS.v);
    sheet(`<div style="text-align:center"><div style="font-size:40px">📣</div><h3 style="margin:2px 0 10px">What’s new</h3></div><div class="tlist">${NEWS.items.map(([i, t, d]) => `<div class="trow" style="align-items:center"><span style="font-size:26px">${i}</span><div><b>${t}</b><br><span class="tiny">${d}</span></div></div>`).join('')}</div>
      <div class="menu" style="margin-top:10px"><button class="btn primary" data-act="newsStore">Visit the store</button><button class="btn" data-act="closeSheet">Nice!</button></div>`);
  }
  function boardsCard(p) {
    const all = Object.entries(Eco.BOARDS).filter(([, b]) => !b.hidden);
    const own = all.filter(([k]) => Eco.ownsBoard(p, k)), special = all.filter(([, b]) => b.unlock);
    const sw = (k, b, locked) => `<div class="bd-sw ${locked ? 'locked' : ''} ${b.unlock ? 'ach' : ''}" title="${esc(b.name)}"><svg viewBox="-10 -10 20 20" width="44" height="44"><circle r="9.5" fill="${b.bg}" stroke="${b.rim}" stroke-width="0.8"/><circle r="8.5" fill="${b.wood[0]}"/><polygon points="0,0 0,-8.5 -8.5,0" fill="${b.light}"/><polygon points="0,0 0,8.5 8.5,0" fill="${b.light}"/><polygon points="0,0 0,-8.5 8.5,0" fill="${b.dark}"/><polygon points="0,0 0,8.5 -8.5,0" fill="${b.dark}"/>${b.lightHatch ? '<circle r="5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".3"/><circle r="2.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".3"/>' : ''}</svg><span>${locked ? '🔒 ' : b.unlock ? '🏆 ' : ''}${esc(b.name)}</span></div>`;
    const ach = special.map(([k, b]) => { const got = Eco.ownsBoard(p, k); const prog = b.unlock === 'melon100' ? ` · 🍈 ${Math.min(100, p.melonUses || 0)}/100 Melon Lords` : b.unlock === 'spirit' ? ' · Enter the Spirit Realm after your final reincarnation. Your harmonies need two blockers to break.' : b.unlock === 'walker' ? ' · Only an Avatar reborn as a past-life spirit can buy it, for every coin they have.' : ''; return `<div class="trow" style="align-items:center${got ? '' : ';opacity:.7'}">${sw(k, b, !got)}<div><b>${esc(b.name)}</b><br><span class="tiny">${got ? 'Unlocked! ✓' : 'Locked'}${prog}</span></div></div>`; }).join('');
    return `<div class="card"><div class="field" style="margin:0"><label>🎨 Boards unlocked · ${own.length}/${all.length}</label>${ach ? `<div class="tlist" style="margin-bottom:8px">${ach}</div>` : ''}<div class="bd-grid">${own.filter(([, b]) => !b.unlock).map(([k, b]) => sw(k, b, false)).join('')}</div></div></div>`;
  }
  function styleCard(p, withLegend = true) {
    const c = (p.style && p.style.counts) || {}, total = Object.values(c).reduce((a, b) => a + b, 0), st = p.stats || {};
    const typ = Eco.typicalStyle(p), T = typ && Eco.STYLES[typ];
    const bars = Object.entries(Eco.STYLES).map(([k, v]) => { const n = c[k] || 0, pct = total ? Math.round((100 * n) / total) : 0; return `<div class="sty-row"><span class="sty-l">${v.icon} ${v.name}</span><span class="sty-b"><i style="width:${pct}%;background:${v.color}"></i></span><span class="sty-n">${pct}%</span></div>`; }).join('');
    const fast = `<div class="sty-fast"><div><div class="disp">${st.fastest ? st.fastest : '—'}</div><div class="tiny muted">⚡ Fastest win (moves)</div></div><div><div class="disp">${st.fastestAi ? st.fastestAi : '—'}</div><div class="tiny muted">🤖 Fastest vs computer</div></div></div>`;
    const legend = withLegend ? `<details class="sty-legend"><summary>What do the styles mean?</summary>${Object.values(Eco.STYLES).map((v) => `<div class="trow" style="align-items:center"><span style="font-size:22px">${v.icon}</span><div><b>${v.name}</b> <span class="tiny muted">${v.tag}</span><br><span class="tiny">${v.desc}</span></div></div>`).join('')}<div class="tiny muted" style="margin-top:6px">Each match is scored from your moves: harmonies you formed, harmonies and tiles you took from your opponent, blocking tiles, and tricks. Your <b>typical style</b> is the one you play most often. Fewer moves to win = faster.</div></details>` : '';
    return `<div class="card sty-card"><div class="sty-head"><span class="sty-big">${T ? T.icon : '❔'}</span><div><div class="tiny muted">Typical play style</div><b style="font-size:18px;color:${T ? T.color : 'inherit'}">${T ? T.name + ' · ' + T.tag : 'Not enough games yet'}</b><div class="tiny muted">${total} ${total === 1 ? 'match' : 'matches'} analysed</div></div></div>${bars}${fast}${legend}</div>`;
  }
  function lvlBar(xp, from = null, p = me) {
    const free = !!(p && p.surpass), lv = Eco.level(xp, free), capped = !free && lv >= Eco.MAX_LEVEL;
    const into = capped ? 500 : xp - (lv - 1) * 500, pct = Math.round((100 * into) / 500);
    const fromPct = from == null || capped ? pct : Eco.level(from, free) < lv ? 0 : Math.round((100 * (from - (lv - 1) * 500)) / 500);
    const tl = p && p.nation ? Eco.titleOf(p, lv) : '', nx = Eco.nextTitleAt(lv);
    const title = tl ? `<div class="lvl-title">🏷️ <b>${esc(tl)}</b>${nx && !capped ? ` <span class="tiny muted">· next title at Level ${nx}</span>` : ''}${p.inc || p.spirit ? ` <span class="tiny muted">· ${esc(Eco.incName(p))}</span>` : ''}</div>` : '';
    const mine = p && me && p.id === me.id;
    const re = mine && Eco.canReincarnate(p) ? '<button class="btn primary small" data-act="reincarnate" style="margin-top:8px">🔄 Reincarnate</button>' : mine && Eco.atFinal(p) ? '<button class="btn primary small" data-act="finalChoice" style="margin-top:8px">🌟 Final reincarnation complete: choose your path</button>' : '';
    return `<div class="lvl">${title}<div class="lvl-top"><b>Level ${lv}</b><span>${capped ? (Eco.canReincarnate(p) || Eco.atFinal(p) ? 'Max level reached' : 'Max level') : `${into}/500 XP · ${500 - into} to Level ${lv + 1}`}</span></div><div class="lvl-bar"><i style="width:${fromPct}%" data-to="${pct}"></i></div>${re}</div>`;
  }
  async function reincarnate() {
    if (!me || !Eco.canReincarnate(me)) return;
    const n = (me.inc || 0) + 1;
    const ok = await choose(`Reincarnate into your ${Eco.INCARNATIONS[n]}?`, [{ label: '🔄 Reincarnate', value: true, cls: 'primary' }], `You go back to Level 1 and sub-bending locks again until Level ${Eco.SUB_LEVEL}. Your gold, purchases, character, record and achievements stay. New achievements unlock for each life (${n}/6).`);
    if (!ok) return;
    me.xpLife = (me.xpLife || 0) + (me.xp || 0); me.xp = 0; me.inc = n;
    await saveMe(); closeSheet(); toast(`🔄 Welcome to your ${Eco.INCARNATIONS[n]}!`, 3500); setTimeout(checkAch, 900); go('stats');
  }
  async function finalChoice() {
    if (!me || !Eco.atFinal(me)) return;
    const pick = await choose('Your final reincarnation is complete', [{ label: '🌟 Rise past Level 100', value: 'ascend', cls: 'primary' }, { label: '👻 Enter the Spirit Realm', value: 'spirit' }],
      `Rise: keep everything and keep leveling past 100.\nSpirit Realm: start over at Level 1 with 10% of your gold (${gpFmt(Math.floor((me.gp || 0) * 0.1))}). Your achievements stay and new Spirit achievements open up. Your character turns ghostly and you unlock the Spirit board, where your harmonies take two blockers to break.${amAvatar() ? '\n\n👑 You are the Avatar: crossing over gives up the title. You become a past-life spirit who bends all four elements forever (in elemental matches and duels) and can watch over the next Avatar’s matches, with two bends per match to help or humble them, then hints.' : ''}`);
    if (pick === 'ascend') { me.surpass = true; await saveMe(); toast('🌟 You’ve risen beyond the cycle!', 3500); }
    else if (pick === 'spirit') {
      const sure = await choose('Enter the Spirit Realm?', [{ label: '👻 Cross over', value: true, cls: 'primary' }], 'This can’t be undone. You keep 10% of your gold.');
      if (!sure) return;
      const wasAvatar = amAvatar();
      me.xpLife = (me.xpLife || 0) + (me.xp || 0); me.xp = 0; me.gp = Math.floor((me.gp || 0) * 0.1); me.spirit = true; if (wasAvatar) me.pastLife = true; me.spiritBase = Eco.snapshotSpirit(me); me.spiritBest = 0; Eco.ensure(me);
      await saveMe();
      if (wasAvatar) { await Store.set('meta', 'avatar', { pid: null, name: null, since: Date.now(), trial: null, pastLife: { pid: me.id, name: me.name, t: Date.now() } }).catch(() => {}); avatarPid = null; updateAvatar(); toast('👻 You gave up the Avatar title and became a past-life spirit. You bend all four elements forever, and you can watch over the next Avatar’s matches.', 6000); }
      else toast('👻 You’ve crossed into the Spirit Realm. The Spirit board is yours.', 4000);
    } else return;
    closeSheet(); setTimeout(checkAch, 900); go('stats');
  }
  function animateBars() { setTimeout(() => document.querySelectorAll('.lvl-bar i[data-to]').forEach((el) => { el.style.width = el.dataset.to + '%'; }), 120); }
  function dailyOpen() {
    if (!me) return;
    const ds = Eco.dailyState(me), b = Eco.boost();
    const start = Math.max(1, ds.streak - (ds.streak - 1) % 7), days = Array.from({ length: 7 }, (_, k) => start + k);
    const cell = (d) => { const r = Eco.dailyReward(d), past = d < ds.streak || (ds.claimed && d === ds.streak), cur = !ds.claimed && d === ds.streak; return `<div class="dd ${past ? 'got' : ''} ${cur ? 'now' : ''} ${r.seven ? 'big' : ''}"><div class="dn">Day ${d}</div><div class="dg">🪙 ${r.gp}</div><div class="dx">${r.xp} XP</div>${past ? '<div class="dk">✓</div>' : ''}</div>`; };
    const r = Eco.dailyReward(ds.streak), mult = b.name ? ` <span class="tiny" style="color:#ffd77a">${b.icon} ${b.name}: ${b.gp}× gold, ${b.xp}× XP</span>` : '';
    sheet(`<div style="text-align:center"><div style="font-size:44px">🎁</div><h3 style="margin:4px 0">Daily reward</h3>
      <p class="muted" style="margin:0 0 10px">${ds.claimed ? `Come back tomorrow for Day ${ds.next}!` : ds.lost ? `Your ${ds.lost}-day streak ended, so you’re starting fresh. Come back every day to build it up!` : `Day ${ds.streak} of your streak. Rewards grow every day you come back.`}</p>
      <div class="daily-grid">${days.map(cell).join('')}</div>
      <p class="tiny muted">Every 7th day pays double. Rewards keep growing until Day 30. Miss a day and the streak restarts.</p>
      ${ds.claimed ? '<button class="btn" data-act="closeSheet">OK</button>' : `<button class="btn primary" data-act="dailyClaim">Claim +${r.gp} gp, +${r.xp} XP</button>${mult}`}</div>`);
  }
  async function dailyClaim() {
    if (!me) return;
    const ds = Eco.dailyState(me); if (ds.claimed) return closeSheet();
    const b = Eco.boost(), r = Eco.dailyReward(ds.streak);
    const gp = Math.round(r.gp * b.gp), xp = Math.round(r.xp * b.xp);
    Eco.ensure(me);
    const lvBefore = Eco.lvl(me);
    me.gp += gp; me.xp = (me.xp || 0) + xp; me.gpPeak = Math.max(me.gpPeak || 0, me.gp);
    me.daily = { last: Eco.dayKey(), streak: ds.streak, best: Math.max((me.daily && me.daily.best) || 0, ds.streak) };
    await saveMe();
    closeSheet(); buzz(20);
    toast(`🎁 +${gp} gp, +${xp} XP · ${ds.streak}-day streak!` + (Eco.lvl(me) > lvBefore ? ` ⬆️ Level ${Eco.lvl(me)}!` : ''), 3500);
    setTimeout(checkAch, 1200);
    if (document.querySelector('[data-act="startSetup"]')) screens.home();
  }
  let invPick = null;
  function inviteSheet() {
    const S = setup, d = invPick;
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(S[k]) === String(v) ? 'on' : ''}" data-act="invOpt" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const tog = (k, t, sub) => `<div class="toggle"><div><b>${t}</b><div class="tiny muted">${sub}</div></div><span class="sw ${S[k] ? 'on' : ''}" data-act="invOpt" data-k="${k}"></span></div>`;
    const skud = false;
    sheet(`<h3>🎮 Invite ${esc(d.name)}</h3><p class="muted tiny" style="margin-top:0">Pick the game mode. They’ll play with these rules.</p>
      <div class="field"><label>Rules</label><div class="seg"><button class="on">Key Pai Sho</button><button disabled style="opacity:.45">Skud Pai Sho · soon</button></div><div class="tiny muted" style="margin-top:4px">Key: the classic rules from the booklet, with effect tiles and loadouts. Skud Pai Sho is being built next.</div></div>
      ${skud ? '' : `<div class="field"><label>Harmonies needed for the ring</label>${seg('minH', [[3, '3'], [4, '4'], [6, '6'], [10, '10']])}</div>`}
      <div class="field"><label>Turn timer</label>${seg('timer', [[0, 'Off'], [30, '30s'], [60, '60s'], [120, '2m']])}</div>
      ${tog('bending', 'Elemental mode', 'Bending, sub-bending, show-offs and the Melon Lord')}
      ${tog('subPractice', 'Sub-bending practice', 'Everyone gets their nation’s sub-bending (3 uses, 2-turn cooldown). 10 XP and 30 gp, no record or rank.')}
      ${skud ? '' : tog('chance', 'Game of Chance', 'Key flowers are drawn at random') + tog('enigma', 'Effect Tile Enigma', 'Effect tiles stay hidden until played')}
      <button class="btn primary" data-act="invSend" style="margin-top:8px">Send invite</button>`);
  }
  // ---------- direct messages ----------
  let dmUnsub = null, dmOpen = null;
  screens.messages = () => {
    if (!me || Store.kind !== 'firebase') { app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="friends">‹</button><h2>Messages</h2><span style="width:42px"></span></div><div class="screen"><div class="card">Sign in to message other players.</div></div>`; return; }
    if (!FireSocial.active) FireSocial.start({ pid: me.id, name: me.name, avatar: me.avatar }).then(() => document.getElementById('dm-list') && screens.messages());
    const th = FireSocial.dmThreads();
    const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.round(m / 60) + 'h' : Math.round(m / 1440) + 'd'; };
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="friends">‹</button><h2>Messages</h2><span style="width:42px"></span></div>
      <div class="screen" id="dm-list"><div class="menu">${th.map((d) => { const other = d.pids.find((x) => x !== me.id), nm = (d.names || {})[other] || 'Player', un = FireSocial.dmUnread(d); return `<div class="prof" data-act="dmOpen" data-pid="${esc(other)}" data-name="${esc(nm)}">${av(nm)}<div style="flex:1;min-width:0"><div class="nm">${esc(nm)} ${un ? '<span class="dm-dot"></span>' : ''}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.lastFrom === me.id ? 'You: ' : ''}${esc(d.lastText || '')}</div></div><span class="tiny muted">${ago(d.lastT || 0)}</span></div>`; }).join('') || '<div class="card muted">No messages yet. Tap 💬 next to a friend, or on anyone’s profile.</div>'}</div></div>`;
  };
  screens.dm = (pid, name) => {
    if (!me) return go('login');
    if (dmUnsub) { dmUnsub(); dmUnsub = null; }
    const id = FireSocial.dmId(me.id, pid); dmOpen = id;
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="dmBack">‹</button><h2 data-act="viewPlayer" data-pid="${esc(pid)}" style="cursor:pointer">${esc(name)}</h2><span style="width:42px"></span></div>
      <div class="dm-wrap"><div class="dm-msgs" id="dm-msgs"><div class="muted tiny" style="text-align:center;margin-top:30px">Loading…</div></div>
      <form class="dm-bar" id="dm-form"><input class="input" id="dm-in" maxlength="300" placeholder="Message ${esc(name)}…" autocomplete="off"><button class="btn primary" type="submit">Send</button></form></div>`;
    const box = document.getElementById('dm-msgs');
    const draw = (doc) => {
      const msgs = (doc && doc.msgs) || [];
      box.innerHTML = msgs.map((m) => `<div class="dm-m ${m.from === me.id ? 'me' : ''}"><div>${esc(m.text)}</div><span>${new Date(m.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>`).join('') || `<div class="muted tiny" style="text-align:center;margin-top:30px">Say hi to ${esc(name)} 👋</div>`;
      box.scrollTop = box.scrollHeight; FireSocial.markRead(id);
    };
    dmUnsub = FireSocial.watchDM(id, draw);
    document.getElementById('dm-form').addEventListener('submit', async (e) => {
      e.preventDefault(); const inp = document.getElementById('dm-in'), t = inp.value.trim(); if (!t) return;
      const err = await FireSocial.sendDM(pid, name, t).catch(() => 'fail');
      if (err === 'slow') return toast('Slow down a little'); if (err) return toast('Message not sent');
      inp.value = ''; inp.focus(); bump('chatsSent');
    });
    setTimeout(() => { const i = document.getElementById('dm-in'); if (i) i.focus(); }, 100);
  };
  function invitesHTML() {
    if (Store.kind !== 'firebase' || !FireSocial.invites) return '';
    const iv = FireSocial.invites(); if (!iv.length) return '';
    const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
    return `<div class="field"><label>🎮 Game invites</label><div class="menu">${iv.map((v) => `<div class="prof">${av(v.fromName)}<div style="flex:1;min-width:0"><div class="nm">${esc(v.fromName)}</div><div class="tiny muted">${v.kind === 'fight' ? '🥋 Duel' : 'Game'} ${esc(v.game)} · ${ago(v.t)}</div></div><button class="btn small primary" data-act="acceptInvite" data-id="${esc(v.id)}" data-game="${esc(v.game)}">Join</button><button class="btn small ghost" data-act="declineInvite" data-id="${esc(v.id)}" aria-label="Decline">✕</button></div>`).join('')}</div></div>`;
  }
  screens.friends = () => {
    if (Store.kind === 'firebase' && !me) {
      app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Friends</h2><span style="width:42px"></span></div><div class="screen"><div class="card">Create a player (or sign in) to get a friend code and add friends.</div><button class="btn primary" data-act="toLogin">Sign in or create a player</button></div>`;
      return;
    }
    if (!Soc().active) startSocial();
    const fr = Soc().friends(), rq = Soc().requests();
    fr.concat(rq).forEach(noteHue);
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Friends</h2><span style="width:42px"></span></div>
    <div class="screen" id="friends-screen">
      ${me ? Avatars.card(meCard(), esc) : Avatars.card({ name: myName(), avatar: myAvatar() || 'whitelotus' }, esc, { noStats: true })}
      <div class="card" style="text-align:center"><div class="muted tiny" style="text-transform:uppercase;letter-spacing:.1em">Your friend code</div><div class="code" style="font-size:34px">${esc(Soc().code || '……')}</div>
        <div class="row" style="justify-content:center"><button class="btn small" data-act="copyCode" data-code="${esc(Soc().code || '')}">Copy code</button></div>
        <div class="tiny muted" style="margin-top:8px">Give this to a friend. You both need to have the app open to connect.</div></div>
      <div class="card"><div class="field"><label>Add a friend</label><div class="row"><input class="input" id="addcode" maxlength="7" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:.2em;font-family:Cinzel"><button class="btn primary" data-act="addFriend">Add</button></div></div></div>
      ${Store.kind === 'firebase' ? `<div class="card"><div class="field"><label>Find a player</label><input class="input" id="fsearch" maxlength="18" placeholder="Search by display name" autocomplete="off"></div><div class="menu" id="fresults"></div></div>` : ''}
      ${Store.kind === 'firebase' && me ? `<button class="btn" data-act="go" data-to="messages">💬 Messages${FireSocial.unreadCount && FireSocial.unreadCount() ? ` <span class="dm-badge">${FireSocial.unreadCount()}</span>` : ''}</button>` : ''}
      ${invitesHTML()}
      ${rq.length ? `<div class="field"><label>Friend requests</label><div class="menu">${rq.map((r) => `<div class="prof">${av(r.name)}<div style="flex:1"><div class="nm">${esc(r.name)}</div><div class="tiny muted">${esc(r.code)}</div></div><button class="btn small primary" data-act="acceptFriend" data-code="${esc(r.code)}">Accept</button><button class="btn small ghost" data-act="declineFriend" data-code="${esc(r.code)}">✕</button></div>`).join('')}</div></div>` : ''}
      <div class="field"><label>Your friends</label><div class="menu">${fr.map((f) => { const on = Soc().isOnline(f.code); return `<div class="prof">${av(f.name)}<div style="flex:1;min-width:0" data-act="viewPlayer" data-name="${esc(f.name)}"${f.pid ? ` data-pid="${esc(f.pid)}"` : ''}><div class="nm"><u>${esc(f.name)}</u></div><div class="tiny muted"><span class="dot" style="background:${on ? 'var(--ok)' : 'var(--mute)'}"></span>${f.pending ? 'Request sent' : on ? 'Online' : 'Offline'}</div></div>${!f.pending && f.pid && Store.kind === 'firebase' ? `<button class="btn small" data-act="dmOpen" data-pid="${esc(f.pid)}" data-name="${esc(f.name)}" aria-label="Message">💬</button>` : ''}${!f.pending ? `<button class="btn small primary" data-act="inviteFriend" data-code="${esc(f.code)}" data-name="${esc(f.name)}" data-on="${on ? 1 : ''}">Invite</button>` : ''}<button class="btn small ghost" data-act="removeFriend" data-code="${esc(f.code)}" aria-label="Remove">✕</button></div>`; }).join('') || '<div class="card muted">No friends yet. Swap codes to add each other.</div>'}</div></div>
    </div>`;
    const fs = document.getElementById('fsearch');
    if (fs) {
      let all = null, tm = null;
      fs.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(async () => {
        const q = fs.value.trim().toLowerCase(), box = document.getElementById('fresults'); if (!box) return;
        if (q.length < 2) { box.innerHTML = ''; return; }
        all = all || await players();
        const hits = all.filter((p) => (!me || p.id !== me.id) && p.name.toLowerCase().includes(q)).slice(0, 12);
        box.innerHTML = hits.map((p) => { const fr = FireSocial.isFriend && FireSocial.isFriend(p.id); return `<div class="prof" data-act="viewPlayer" data-pid="${esc(p.id)}">${av(p.name)}<div style="flex:1;min-width:0"><div class="nm">${esc(p.name)}</div><div class="tiny muted">Lv ${Eco.lvl(p)} · ${(p.stats && p.stats.wins) || 0} wins</div></div>${fr ? '<span class="tiny" style="color:#9fd18b">✓ Friends</span>' : `<button class="btn small primary" data-act="addFriendPid" data-pid="${esc(p.id)}">＋ Add</button>`}</div>`; }).join('') || '<div class="muted tiny">No players found</div>';
      }, 300); });
    }
  };

  // ---------- stats ----------
  let statsTab = 'stats';
  screens.stats = async () => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Stats</h2><span style="width:42px"></span></div><div class="screen" id="statbody"><div class="muted">Loading…</div></div>`;
    await loadAvatar();
    const list = await players();
    if (me) { const fresh = list.find((p) => p.id === me.id); if (fresh) me = fresh; }
    const st = me ? Object.assign(emptyStats(), me.stats || {}) : null;
    const rec = (a) => `${a[0]}–${a[1]}–${a[2]}`;
    const pct = (s) => (s.games ? Math.round((100 * s.wins) / s.games) + '%' : '—');
    const body = document.getElementById('statbody'); if (!body) return;
    if (me) {
      const done = Eco.ACH.filter((a) => (me.ach || {})[a.id]).length;
      const tabs = `<div class="seg"><button class="${statsTab === 'stats' ? 'on' : ''}" data-act="statsTab" data-k="stats">Stats</button><button class="${statsTab === 'ach' ? 'on' : ''}" data-act="statsTab" data-k="ach">🏆 Achievements ${done}/${Eco.ACH.length}</button></div>`;
      if (statsTab === 'ach') { body.innerHTML = tabs + achBody(); return; }
      body.innerHTML = tabs;
    }
    body.insertAdjacentHTML('beforeend', (st ? `${Avatars.card(meCard(), esc, { big: true, noStats: true })}${figStage(meCard(), true)}${lvlBar(me.xp || 0)}${styleCard(me)}${boardsCard(me)}
      <div class="stat-grid"><div class="stat"><div class="v">${st.games}</div><div class="k">Games</div></div><div class="stat"><div class="v">${st.wins}</div><div class="k">Wins</div></div><div class="stat"><div class="v">${pct(st)}</div><div class="k">Win rate</div></div>
      <div class="stat"><div class="v">${st.streak}</div><div class="k">Streak</div></div><div class="stat"><div class="v">${st.best}</div><div class="k">Best streak</div></div><div class="stat"><div class="v">${st.rings}</div><div class="k">Rings won</div></div></div>
      <div class="card"><table class="lb"><tr><th>Mode</th><th class="n">W–L–D</th></tr>
      <tr><td>Computer · Easy</td><td class="n">${rec(st.ai.easy)}</td></tr><tr><td>Computer · Medium</td><td class="n">${rec(st.ai.medium)}</td></tr><tr><td>Computer · Hard</td><td class="n">${rec(st.ai.hard)}</td></tr>
      <tr><td colspan="2" class="tiny muted">Computer games are practice: they have their own record and don’t count toward your wins, losses or streaks.</td></tr><tr><td>Pass &amp; play</td><td class="n">${rec(st.local)}</td></tr><tr><td>Online</td><td class="n">${rec(st.online)}</td></tr></table></div>
      <div class="field"><label>Recent games</label><div class="log">${(st.recent || []).map((r) => `<div><span class="dot" style="background:${r.res === 'w' ? 'var(--ok)' : r.res === 'l' ? 'var(--red)' : 'var(--mute)'}"></span><b>${{ w: 'Won', l: 'Lost', d: 'Draw' }[r.res]}</b> vs ${esc(r.opp)} · ${r.turns} turns <span class="muted tiny">${new Date(r.t).toLocaleDateString()}</span></div>`).join('') || '<div class="muted">No games yet.</div>'}</div></div>`
      : `<div class="card muted">You’re playing as a guest. Create a player to track your stats.</div>`) +
      `<div class="note">⭐ Ranked rating comes from online games only. The top-rated player (after ${Eco.MIN_RANKED} ranked games) holds the 👑 Avatar title. A tie at the top starts an Avatar Trial match between the two.</div><div class="field"><label>Leaderboard <span class="tiny muted" style="text-transform:none;letter-spacing:0">· tap a player</span></label><div class="card"><table class="lb"><tr><th>#</th><th>Player</th><th class="n">⭐ Rank</th><th class="n">W–L–D</th></tr>${list.map((p) => Object.assign({ s: Object.assign(emptyStats(), p.stats || {}) }, Eco.ensure(p))).sort((a, b) => (Eco.rankedGames(b) >= Eco.MIN_RANKED) - (Eco.rankedGames(a) >= Eco.MIN_RANKED) || b.rating - a.rating || b.s.wins - a.s.wins).map((p, k) => `<tr class="lb-row" data-act="viewPlayer" data-pid="${esc(p.id)}"><td>${k + 1}</td><td>${p.id === avatarPid ? '👑 ' : ''}<u>${esc(p.name)}</u></td><td class="n">${Eco.rankedGames(p) >= Eco.MIN_RANKED ? p.rating : '<span class="tiny muted">' + Eco.rankedGames(p) + '/' + Eco.MIN_RANKED + '</span>'}</td><td class="n">${p.s.wins}–${p.s.losses}–${p.s.draws}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No players yet</td></tr>'}</table></div></div>`);
  };

  // ======================================================================
  // GAME CONTROLLER
  // ======================================================================
  function startLocal(mode) {
    const S = setup;
    Store.LS.set('setup', { level: S.level, first: S.first, fx: S.fx, minH: S.minH, timer: S.timer, chance: S.chance, enigma: S.enigma, hints: S.hints, bending: S.bending, subPractice: S.subPractice });
    let meFirst = S.first === 'me' || (S.first === 'rand' && Math.random() < 0.5);
    const human = { name: myName(), pid: me ? me.id : null, avatar: myAvatar(), fig: myFig(), kind: 'human' };
    const other = mode === 'ai' ? { name: 'Computer · ' + S.level[0].toUpperCase() + S.level.slice(1), kind: 'ai', level: S.level } : { name: S.p2.name, pid: S.p2.pid, avatar: S.p2.avatar, fig: S.p2.prof ? Figure.of(S.p2.prof, Eco.lvl(S.p2.prof)) : null, kind: 'human' };
    const seats = meFirst ? [human, other] : [other, human];
    const fxMe = S.fx[0].filter((t) => Eco.ownsTile(me, t)), fxOther = mode === 'ai' ? AI.AI_EFFECTS[S.level].slice() : S.fx[1].filter((t) => Eco.ownsTile(S.p2.prof || null, t));
    const pwMe = Eco.powersFor(me, amAvatar()), pwOther = mode === 'ai' ? { nation: null } : Eco.powersFor(S.p2.prof || null, false);
    const s = P.newGame({ effects: meFirst ? [fxMe, fxOther] : [fxOther, fxMe], minHarmonies: +S.minH, chance: !!S.chance, bending: !!S.bending || !!S.subPractice, subPractice: !!S.subPractice, powers: meFirst ? [pwMe, pwOther] : [pwOther, pwMe], seismic: me && myBoard() === 'blackout' ? (meFirst ? 0 : 1) : null, spirit: me && myBoard() === 'spirit' ? (meFirst ? 0 : 1) : null });
    G = { mode, s, seats, my: mode === 'ai' ? (meFirst ? 0 : 1) : null, history: [], sel: null, showH: true, opts: { timer: +S.timer, enigma: !!S.enigma, chance: !!S.chance }, recorded: false };
    gameScreen();
  }
  // ---------- first-time tutorial: a nearly finished game you win in two moves ----------
  const TUT = { tiles: [[62, "lily", 1, 104], [114, "jasmine", 0, 100], [119, "chrys", 0, 101], [159, "rhodo", 1, 106], [200, "chrys", 0, 103], [209, "jasmine", 0, 102], [261, "rose", 1, 105]], from: 200, to: 204 };
  function startTutorial() {
    const s = P.newGame({});
    TUT.tiles.forEach(([i, type, owner, id]) => { s.board[i] = { top: { id, owner, type }, under: null }; s.hands[owner][type]--; });
    s.nextId = 200;
    const human = { name: myName(), pid: me ? me.id : null, avatar: myAvatar(), fig: myFig(), kind: 'human' };
    G = { mode: 'ai', tutorial: { step: 'intro', n: 0 }, s, seats: [human, { name: 'Pai Sho Coach', kind: 'ai', level: 'easy' }], my: 0, history: [], sel: null, showH: true, opts: { timer: 0 }, recorded: true };
    gameScreen();
  }
  function tutAIMove(s) {
    const ms = P.legalActions(s).filter((a) => a.t === 'move' && a.from.kind === 'sq' && P.rc(a.from.i)[0] <= 4 && P.rc(a.to)[0] <= 4);
    return ms.length ? [ms[0]] : AI.chooseTurn(s, 'easy');
  }
  const TUT_STEPS = {
    intro: ['Welcome to Pai Sho! 🌸', 'You’re the <b style="color:var(--p0)">gold</b> player. Grow your garden by linking your flowers with <b>harmonies</b>. Close a <b>ring of harmonies around the centre</b> to win.', 'Next'],
    harm: ['Harmonies', 'See the gold lines? Each is a harmony: two of <b>your</b> flowers of <b>different kinds</b> that could move to each other in a straight line, with at least one empty square between. You have 2. You need 4 that circle the centre.', 'Next'],
    plant: ['Plant a flower', 'New flowers enter through the four <b>gates</b> at the edge. Tap any flower in your tray below, then tap a glowing gate.', null],
    wait: ['Your opponent’s turn', 'Players take turns. Watch what they do…', null],
    win: ['Close the ring!', 'Your <b>Chrysanthemum</b> on the left moves up to 5 squares in a straight line. Tap it, then tap the gold dot it can reach. That makes 2 new harmonies and closes the ring.', null],
  };
  function tutUpdate() {
    const T = G.tutorial; if (!T || !document.querySelector('.game')) return;
    if (T.step === 'plant' && G.s.turn === 1) T.step = 'wait';
    if (T.step === 'wait' && G.s.turn === 0) T.step = 'win';
    let box = document.getElementById('coach');
    if (!box) { box = document.createElement('div'); box.id = 'coach'; box.className = 'coach'; document.querySelector('.game').appendChild(box); }
    const [h, body, btn] = TUT_STEPS[T.step] || ['', '', null];
    const key = T.step + (G.sel ? 's' : '');
    if (box.dataset.k === key) return; box.dataset.k = key;
    const selText = T.step === 'win' && G.sel ? 'Now tap the <b>gold dot</b> to finish the ring!' : body;
    box.innerHTML = `<div class="coach-h">🧭 ${h}<button class="coach-skip" data-act="tutSkip">Skip</button></div><div>${selText}</div>${btn ? `<button class="btn primary small" data-act="tutNext">${btn}</button>` : ''}`;
    document.querySelectorAll('.tut-glow').forEach((x) => x.classList.remove('tut-glow'));
    if (T.step === 'win' && !G.sel) { const el = tileEls.get(TUT.tiles.find((t) => t[0] === TUT.from)[3]); if (el) el.classList.add('tut-glow'); }
    if (T.step === 'plant') { const tr = document.getElementById('tray'); if (tr) tr.classList.add('tut-glow'); }
  }
  function tutFinishFlag() { Store.LS.set('tutDone', true); if (me && !me.tutDone) { me.tutDone = true; Store.set('players', me.id, { tutDone: true }).catch(() => {}); } }
  function tutDone() {
    tutFinishFlag();
    const box = document.getElementById('coach'); if (box) box.remove();
    sheet(`<div style="text-align:center">${logoSvg(90)}<h3 style="font-size:26px">You win! 🎉</h3>
      <p>That gold loop is a <b>harmony ring</b>, and that’s how every game is won.</p>
      <div class="card" style="text-align:left"><b>Quick recap</b><ul style="margin:6px 0 0;padding-left:18px"><li>Plant flowers through the gates (2 at a time, max).</li><li>Move one tile a turn. Each flower has its own movement.</li><li>Harmonies link different flowers that can reach each other.</li><li>Opponent flowers in between break a harmony.</li><li>Ring of 4+ harmonies around the centre wins.</li></ul></div>
      <p class="tiny muted">The full rules, tile powers and diagrams are in <b>How to play</b> on the home screen.</p>
      <div class="menu"><button class="btn primary" data-act="tutHome">Go to my garden</button><button class="btn" data-act="tutVsAI">Play the computer (Easy)</button></div></div>`);
  }

  function startOnline(d) {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
    const pid = myPid();
    const my = d.guest && d.guest.pid === pid ? 0 : 1;
    const seats = [{ name: d.guest.name, pid: d.guest.pid, avatar: d.guest.avatar, fig: d.guest.fig || null, kind: my === 0 ? 'human' : 'remote' }, { name: d.host.name, pid: d.host.pid, avatar: d.host.avatar, fig: d.host.fig || null, kind: my === 1 ? 'human' : 'remote' }];
    if (Store.p2p()) P2P.resume(d.id || d.code, my === 1);
    G = { mode: 'online', code: d.id || d.code, doc: d, ver: d.ver, s: JSON.parse(d.state), seats, my, history: [], sel: null, showH: true, opts: { timer: d.opts.timer, enigma: d.opts.enigma, chance: d.opts.chance }, recorded: false };
    G.chat = d.chat ? Object.keys(d.chat).map((id) => ({ id, seat: d.chat[id].seat, text: String(d.chat[id].text || '').slice(0, 140), t: d.chat[id].t })).sort((a, b) => a.t - b.t) : []; G.chatReady = false;
    G.lastEmoteT = (d.emote && d.emote.t) || 0; G.lastNudgeT = (d.nudge && d.nudge.t) || 0; G.lastSpamT = (d.spam && d.spam.t) || 0; G.lastDoodleT = (d.doodle && d.doodle.t) || 0;
    G.unwatch = Store.watch('games', G.code, (nd) => {
      if (!G || G.mode !== 'online' || !nd || !nd.state) return;
      if (nd.nudge && nd.nudge.t > (G.lastNudgeT || 0)) { const fresh = G.lastNudgeT !== undefined; G.lastNudgeT = nd.nudge.t; if (fresh && nd.nudge.seat !== G.my && Date.now() - (G.nudgeShownT || 0) > 60000 && (G.nudgeShownT = Date.now())) { toast('📣 Yip yip! ' + G.seats[nd.nudge.seat].name + ' is waiting for your move', 3500); buzz(60); } }
      if (nd.doodle && nd.doodle.t > (G.lastDoodleT || 0)) { const fresh = G.lastDoodleT !== undefined; G.lastDoodleT = nd.doodle.t; if (fresh && nd.doodle.seat !== G.my) { try { Doodle.show(JSON.parse(nd.doodle.s), nd.doodle.seat); } catch (e) {} } }
      if (nd.spam && nd.spam.t > (G.lastSpamT || 0)) { const fresh = G.lastSpamT !== undefined; G.lastSpamT = nd.spam.t; if (fresh && nd.spam.seat !== G.my) showFx(nd.spam.el); }
      applyQueuedBends(nd);
      if (nd.chat) Object.keys(nd.chat).forEach((id) => { const m = nd.chat[id]; if (m && !(G.chat || []).some((x) => x.id === id)) addChat({ id, seat: m.seat, text: String(m.text || '').slice(0, 140), t: m.t }, G.chatReady && m.seat !== G.my); });
      G.chatReady = true;
      if (nd.emote && nd.emote.t > (G.lastEmoteT || 0)) { G.lastEmoteT = nd.emote.t; if (nd.emote.seat !== G.my) showBubble(nd.emote.seat, nd.emote.id); }
      // a bending I queued during their turn didn't land
      if (nd.bqFail) Object.entries(nd.bqFail).forEach(([id, f]) => { G.failSeen = G.failSeen || {}; if (!f || f.by !== G.my || G.failSeen[id]) return; G.failSeen[id] = 1; if (Date.now() - (f.t || 0) < 10 * 60000) toast(`⚠️ Your ${({ metal: 'Metalbending', lightning: 'Lightning', blood: 'Bloodbending', flight: 'Flight', gust: 'Gust', melon: 'Melon Lord', bend: 'bending', avatarState: 'Avatar State' })[f.kind] || 'bending'} didn’t land on their board${/not available|cannot|bad/i.test(f.why) ? '' : ''}. If it keeps happening, ask them to close and reopen the app.`, 4500); });
      if (nd.here && nd.here['v' + (1 - G.my)] != null && nd.here['v' + (1 - G.my)] < APP_V && !G.oldWarned) { G.oldWarned = true; toast('📲 ' + G.seats[1 - G.my].name + ' is on an older version of the app. Ask them to close and reopen it so everything works.', 5000); }
      // 🪽 Flight: the opponent came back to the match
      if (nd.here && nd.here[1 - G.my]) { const t = nd.here[1 - G.my]; if (G.hereT !== undefined && t > G.hereT + 20000 && P.flightOn(G.s, G.my)) { toast('👀 ' + G.seats[1 - G.my].name + ' is back in the match. Your Flight is watching!', 4000); buzz(20); } G.hereT = Math.max(G.hereT || 0, t); }
      if ((nd.ver || 0) > G.ver) {
        G.ver = nd.ver; G.doc = nd; G.s = JSON.parse(nd.state); G.history = []; G.sel = null; G.draftLive = false;
        renderGame(); afterTurnChange(); applyQueuedBends(nd); applySpiritActs();
      } else if (nd.draft && nd.draft.t > (G.draftT || 0) && !isHumanTurn() && P.flightOn(G.s, G.my)) {
        // 🪽 Flight: watch their turn live
        G.draftT = nd.draft.t;
        try { const ds = JSON.parse(nd.draft.s); if (ds.turnNo === G.s.turnNo && ds.turn === G.s.turn) { if (!G.draftLive) toast('🪽 Watching ' + G.seats[1 - G.my].name + '’s turn live'); G.draftLive = true; G.s = ds; if (!G.metal) renderGame(); } } catch (e) {}
      }
    });
    // practice games made before the update: give the Avatar all four sub-bendings
    try { const pw = G.s.opts.powers && G.s.opts.powers[G.my]; if (G.s.opts.subPractice && pw && amAvatar() && (pw.subs || []).length < 4) { pw.avatar = true; pw.subs = ['metal', 'lightning', 'blood', 'flight']; if (isHumanTurn()) pushOnline(); } } catch (e) {}
    if (G.seats.some((x) => x.pid && x.pid === avatarPid)) G.spiritUn = Store.watch('meta', 'spirit_' + G.code, (m) => { if (!G || G.mode !== 'online') return; G.spiritMeta = m || {}; applySpiritActs(); spiritHints(); });
    gameScreen();
    const here = () => G && G.mode === 'online' && Store.patch('games', G.code, { here: { [G.my]: Date.now(), ['v' + G.my]: APP_V } }).catch(() => {});
    here(); G.hereTimer = setInterval(() => { if (!G || G.mode !== 'online') return clearInterval(G && G.hereTimer); if (!document.hidden) here(); }, 45000);
    if (G.s.bend && P.flightOn(G.s, 1 - G.my) && G.seats[1 - G.my].pid) Push.send(G.seats[1 - G.my].pid, '🪽 ' + G.seats[G.my].name + ' is back in your game', 'Your Flight lets you watch their turn live (game ' + G.code + ')', 'fl-' + G.code);
  }
  // 🪽 if the opponent has Flight on, stream my turn as I play it
  function sendDraft() {
    if (!G || G.mode !== 'online' || !G.s.bend || !isHumanTurn() || !P.flightOn(G.s, 1 - G.my)) return;
    const d = P.clone(G.s); d.log = d.log.slice(-20);
    Store.patch('games', G.code, { draft: { s: JSON.stringify(d), t: Date.now() } }).catch(() => {});
  }
  async function pushOnline() {
    const s = P.clone(G.s); s.log = s.log.slice(-60);
    G.ver++;
    const nd = Object.assign({}, G.doc, { state: JSON.stringify(s), ver: G.ver, updated: Date.now(), status: s.winner !== null ? 'done' : 'playing' });
    delete nd.id; G.doc = nd;
    try { await Store.set('games', G.code, nd); } catch (e) { return toast('Couldn’t send your move — check your connection'); }
    const opp = G.seats[1 - G.my], mine = G.seats[G.my].name;
    if (opp && opp.pid) {
      if (s.winner !== null) Push.send(opp.pid, 'Pai Sho', s.winner === 'draw' ? `Your game with ${mine} ended in a draw` : s.winner === G.my ? `${mine} won your game (${G.code})` : `You beat ${mine}! 🎉`, 'g-' + G.code);
      else if (s.turn !== G.my) Push.send(opp.pid, 'Your turn in Pai Sho', `${mine} has moved — game ${G.code}`, 'g-' + G.code);
    }
  }

  const isHumanTurn = () => G && G.s.winner === null && G.seats[G.s.turn].kind === 'human';
  const viewSeat = () => (G.my != null ? G.my : G.s.turn); // whose hand shows in the tray
  let acts = [];
  function computeActs() {
    acts = isHumanTurn() ? P.legalActions(G.s) : [];
    if (G.tutorial) acts = acts.filter((a) => (G.tutorial.step === 'plant' ? a.t === 'plant' : G.tutorial.step === 'win' ? (a.t === 'move' && a.from.kind === 'sq' && a.from.i === TUT.from && a.to === TUT.to) : false));
  }

  // board theme for this game, and whether this viewer gets the Blackout effect
  function gameBoardInfo() {
    const elemental = !!G.s.bend;
    // Seismic Sense always wins: if either player has it equipped it's the board in play. The owner (host first, if both) gets the advantage.
    let hostBoard = myBoard(), owner = null, iOwn = true;
    if (G.mode === 'online' && G.doc && G.doc.host) {
      hostBoard = G.doc.host.board || 'classic';
      const gb = G.doc.guest && G.doc.guest.board;
      owner = typeof G.s.seismic === 'number' ? G.s.seismic : hostBoard === 'blackout' ? 1 : gb === 'blackout' ? 0 : null;
      iOwn = G.my === owner;
    } else if (hostBoard === 'blackout') owner = 'me';
    if (owner === null) return { theme: hostBoard, blackout: false };
    // Spirit Walkers have infinite wisdom: Seismic Sense can't darken their board
    if (!iOwn && me && Eco.ownsBoard(me, 'spiritWalker')) return { theme: 'blackoutOwner', blackout: false, walker: true };
    if (!elemental) return { theme: iOwn ? 'blackoutOwner' : 'blackout', blackout: false }; // owner sees a slightly lighter version
    // Elemental: the owner plays on their seismic board (lighter view) while the opponent plays in the dark
    return { theme: G.mode === 'online' ? (iOwn ? 'blackoutOwner' : 'classic') : 'blackoutOwner', blackout: G.mode === 'online' ? !iOwn : 'local' };
  }
  function blackoutActive() {
    if (!G || !G.boardInfo || !G.boardInfo.blackout) return false;
    if (G.boardInfo.blackout === 'local') { const seat = G.seats[G.s.turn]; return G.mode === 'local' && !(me && seat.pid === me.id); }
    return true;
  }
  function scheduleBlackoutPulse() {
    clearTimeout(G.boPulseT);
    if (!blackoutActive()) return;
    G.boPulseT = setTimeout(() => {
      if (!G || !blackoutActive()) return;
      G.boReveal = true; renderBoard(); ripple(0, 0, true); setTimeout(() => ripple(0, 0, false), 250);
      setTimeout(() => { if (!G) return; G.boReveal = false; renderBoard(); scheduleBlackoutPulse(); }, 1600);
    }, 5000 + Math.random() * 5000);
  }
  function gameScreen() {
    G.boardInfo = gameBoardInfo();
    if (G.boardInfo.walker && !G.walkerToast) { G.walkerToast = 1; setTimeout(() => toast('🌈 Spirit Walker: Seismic Sense has no power over you.', 3500), 800); }
    app.innerHTML = `<div class="game">
      <header class="g-top" id="seats"></header>
      <div class="board-wrap"><button class="emote-btn" data-act="emotePicker" aria-label="Emotes">😊</button><button class="emote-btn chat-btn" id="chat-btn" data-act="chatOpen" aria-label="Chat">💬</button><button class="emote-btn bend-btn" id="bend-btn" data-act="bendMenu" aria-label="Bending" style="display:none"></button><svg id="board" viewBox="-9.7 -9.7 19.4 19.4">${Board.base(G.boardInfo.theme)}<g id="l-hl"></g><g id="l-harm"></g><g id="l-tiles"></g><g id="l-dest"></g></svg></div>
      <div class="status" id="status"></div>
      <div class="info" id="info"></div>
      <div class="bendbar" id="bendbar"></div>
      <div class="tray" id="tray"></div>
      <footer class="g-bar">
        <button class="btn" data-act="undo" id="b-undo">↶ Undo</button>
        <button class="btn" data-act="toggleH" id="b-h">↔ Lines</button>
        <button class="btn" data-act="gameMenu">☰ Menu</button>
        <button class="btn primary end" data-act="endTurn" id="b-end">End turn</button>
      </footer></div>`;
    tileEls.clear();
    Music.start();
    const svg = document.getElementById('board');
    svg.addEventListener('click', onBoardClick);
    Doodle.attach(document.querySelector('.board-wrap'));
    renderGame();
    afterTurnChange();
  }

  // ---------- rendering ----------
  const tileEls = new Map();
  const ns = 'http://www.w3.org/2000/svg';
  function tilePositions(s) {
    const out = [];
    s.gates.forEach((t, g) => { if (t) out.push({ t, x: Board.GATE_POS[g][0], y: Board.GATE_POS[g][1], sc: 0.78, where: 'g' + g }); });
    if (s.center) out.push({ t: s.center.tile, x: 0, y: 0, sc: 0.85, where: 'c' });
    for (let i = 0; i < 324; i++) {
      const c = s.board[i]; if (!c) continue;
      const x = Board.cx(i), y = Board.cy(i);
      if (c.under) { out.push({ t: c.under, x: x + 0.12, y: y + 0.12, sc: 0.4, where: 'sq' + i, under: true }); out.push({ t: c.top, x: x - 0.06, y: y - 0.06, sc: 0.42, where: 'sq' + i }); }
      else out.push({ t: c.top, x, y, sc: 0.47, where: 'sq' + i });
    }
    return out;
  }
  const viewerSeat = () => (G.my != null ? G.my : G.s.turn);
  function blindState() {
    const s = G.s, v = viewerSeat();
    if (!s.melon || s.melon.blind !== v || s.turn !== v || !isHumanTurn()) { G.blindKey = null; return 'off'; }
    const key = s.turnNo + ':' + v;
    if (G.blindKey !== key) { G.blindKey = key; G.blindAt = Date.now() + 3000; blindCountdown(); }
    return Date.now() >= G.blindAt ? 'blind' : 'peek';
  }
  function blindCountdown() {
    let n = 3; const wrap = document.querySelector('.board-wrap'); if (!wrap) return;
    const o = document.createElement('div'); o.className = 'blind-count'; wrap.appendChild(o);
    const tick = () => { if (!document.body.contains(o)) return; if (n <= 0) { o.remove(); renderGame(); return; } o.innerHTML = `<div>🍈 MELON LORD!</div><b>${n}</b><div class="tiny">Memorise the board…</div>`; n--; setTimeout(tick, 1000); };
    tick();
  }
  function ripple(x, y, strong) {
    const svg = document.getElementById('board'); if (!svg) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 1); c.setAttribute('class', 'ripple' + (strong ? ' strong' : ''));
    svg.appendChild(c); setTimeout(() => c.remove(), 1600);
  }
  function seismicPulse() {
    if (!G || !document.getElementById('board') || !G.blindOn) return;
    tilePositions(G.s).forEach((p) => { if (Math.random() < 0.45) ripple(p.x, p.y, false); });
    G.pulseT = setTimeout(seismicPulse, 1400);
  }
  function renderBoard() {
    const s = G.s;
    const bs = blindState(), blind = bs === 'blind';
    const bo = blackoutActive() && !G.boReveal && !blind;
    if (blackoutActive() && !G.boPulseT) scheduleBlackoutPulse();
    const svgEl = document.getElementById('board'); if (svgEl) { svgEl.classList.toggle('blind', blind || bo); svgEl.classList.toggle('blackout', bo); }
    if (blind && !G.blindOn) { G.blindOn = true; clearTimeout(G.pulseT); seismicPulse(); }
    if (!blind && G.blindOn) { G.blindOn = false; clearTimeout(G.pulseT); }
    const lt = document.getElementById('l-tiles'); if (!lt) return;
    const pos = tilePositions(s);
    const seen = new Set();
    const hideFx = G.opts.enigma;
    pos.forEach((p) => {
      seen.add(p.t.id);
      let el = tileEls.get(p.t.id);
      if (!el || el.dataset.type !== p.t.type) {
        if (el) el.remove();
        el = document.createElementNS(ns, 'g'); el.setAttribute('class', 'tile'); el.dataset.type = p.t.type;
        el.innerHTML = Glyphs.tile(p.t.type, p.t.owner);
        el.style.transform = `translate(${p.x}px,${p.y}px) scale(0.05)`;
        lt.appendChild(el); tileEls.set(p.t.id, el);
        el.getBoundingClientRect();
      }
      el.style.transform = `translate(${p.x}px,${p.y}px) scale(${p.sc})`;
      if (!p.under) lt.appendChild(el); // keep tops above
    });
    for (const [id, el] of tileEls) if (!seen.has(id)) { el.style.transform += ' scale(0.1)'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); tileEls.delete(id); }
    // highlights
    const hl = document.getElementById('l-hl'); let h = '';
    const lm = s.lastMove;
    const sqRect = (i, col, op = 0.35) => `<rect x="${(i % 18) - 9}" y="${Math.floor(i / 18) - 9}" width="1" height="1" fill="${col}" opacity="${op}"/>`;
    if (lm) { if (typeof lm.from === 'number') h += sqRect(lm.from, '#f5d98a', 0.25); if (typeof lm.to === 'number') h += sqRect(lm.to, '#f5d98a', 0.4); }
    // centre gate tint
    if (s.center) P.CENTER_SQ.forEach((i) => (h += sqRect(i, '#e6b54a', 0.35)));
    if (s.rubble) Object.keys(s.rubble).forEach((k) => { const i = +k; h += `<g transform="translate(${Board.cx(i)},${Board.cy(i)})"><rect x="-0.5" y="-0.5" width="1" height="1" fill="#5b4a36"/><path d="M-0.35,0.3 L-0.2,-0.1 L0,0.05 L0.15,-0.3 L0.38,0.3 Z" fill="#8a7458" stroke="#2a1a10" stroke-width="0.04"/><text y="0.42" font-size="0.22" text-anchor="middle" fill="#fff">${s.rubble[k]}</text></g>`; });
    hl.innerHTML = blind || bo ? '<circle r="9.5" fill="#000"/>' : h;
    // harmonies
    const lh = document.getElementById('l-harm'); let hh = '';
    if (G.showH || s.winner !== null) {
      const H = P.harmonies(s);
      H.forEach(({ a, b, owners }) => {
        const col = owners.length > 1 ? '#ffffff' : owners[0] === 0 ? 'var(--p0)' : 'var(--p1)';
        hh += `<line class="harm" ${G.boardInfo && (Eco.BOARDS[G.boardInfo.theme] || {}).spectral ? 'filter="url(#swHarm)"' : ''} x1="${Board.cx(a)}" y1="${Board.cy(a)}" x2="${Board.cx(b)}" y2="${Board.cy(b)}" stroke="${col}" ${owners.length > 1 ? 'stroke-dasharray="0.3 0.2"' : ''}/>`;
      });
      if (s.winRing) hh += `<polygon class="ring" points="${s.winRing.map((i) => Board.cx(i) + ',' + Board.cy(i)).join(' ')}"/>`;
    }
    lh.innerHTML = blind || bo ? '' : hh;
    renderSel();
  }
  function srcOf(a) { return a.from.kind === 'sq' ? 'sq' + a.from.i : a.from.kind === 'gate' ? 'g' + a.from.g : 'c'; }
  function renderSel() {
    const ld = document.getElementById('l-dest'); if (!ld) return;
    if (G.blindOn && !(G.sel && G.sel.kind === 'plant')) { tileEls.forEach((el) => el.classList.remove('lift')); const k = G.sel && G.sel.kind === 'blindPick' ? G.sel : null; ld.innerHTML = k ? `<circle cx="${k.x}" cy="${k.y}" r="0.55" fill="none" stroke="#fff" stroke-width="0.08" opacity=".9"/>` : ''; return; }
    let o = '';
    tileEls.forEach((el) => el.classList.remove('lift'));
    const ringAt = (x, y, r = 0.48) => `<circle class="dest-cap" cx="${x}" cy="${y}" r="${r}"/>`;
    const dotAt = (x, y) => `<circle class="dest" cx="${x}" cy="${y}" r="0.17"/>`;
    const sel = G.sel;
    if (sel && sel.kind === 'tile') {
      const el = sel.tileId && tileEls.get(sel.tileId); if (el) el.classList.add('lift');
      const seenTo = new Set();
      const hv = hintsOn() ? destValues(sel.moves) : null;
      sel.moves.forEach((m) => {
        if (seenTo.has(m.to)) return; seenTo.add(m.to);
        const x = Board.cx(m.to), y = Board.cy(m.to), v = hv && hv.get(m.to);
        if (v && v.ring) o += `<circle cx="${x}" cy="${y}" r="0.46" fill="#fff6d0" opacity=".9"/><text x="${x}" y="${y + 0.2}" text-anchor="middle" font-size="0.6" fill="#7a4a10" font-weight="900">★</text>`;
        else if (v && v.gain > 0) o += `<circle cx="${x}" cy="${y}" r="0.3" fill="#7cc48a" stroke="#1e3b22" stroke-width="0.04"/><text x="${x}" y="${y + 0.12}" text-anchor="middle" font-size="0.34" fill="#0f2412" font-weight="900">+${v.gain}</text>`;
        else if (v && v.gain < 0) o += `<circle cx="${x}" cy="${y}" r="0.17" fill="#e08a6a" opacity=".9"/>`;
        else o += G.s.board[m.to] ? ringAt(x, y) : dotAt(x, y);
        if (v && v.breaks > 0) o += `<circle cx="${x}" cy="${y}" r="0.44" fill="none" stroke="#6fc6e8" stroke-width="0.07" stroke-dasharray="0.12 0.08"/>`;
      });
    } else if (sel && sel.kind === 'plant') {
      sel.moves.forEach((m) => { if (m.gate === 'center') o += `<rect class="dest-cap" x="-1" y="-1" width="2" height="2" rx="0.2"/>`; else { const [x, y] = Board.GATE_POS[m.gate]; o += `<rect class="dest-cap" x="${x - 1}" y="${y - 1}" width="2" height="2" rx="0.2"/>` + dotAt(x, y); } });
    } else if (sel && sel.kind === 'place') {
      [...new Set(sel.moves.map((m) => m.target))].forEach((i) => (o += ringAt(Board.cx(i), Board.cy(i))));
    } else if (sel && sel.kind === 'stone') {
      sel.spots.forEach((i) => (o += dotAt(Board.cx(i), Board.cy(i))));
    } else if (!sel && G.metal && G.metal.mode) {
      const M = G.metal, col = M.mode === 'smash' ? '#ff6b5a' : '#c0c8d0';
      metalTargets().forEach((i) => (o += M.mode === 'move' && M.pick != null ? dotAt(Board.cx(i), Board.cy(i)) : `<circle cx="${Board.cx(i)}" cy="${Board.cy(i)}" r="0.5" fill="none" stroke="${col}" stroke-width="0.11" class="dest"/>`));
      if (M.pick != null) o += `<circle cx="${Board.cx(M.pick)}" cy="${Board.cy(M.pick)}" r="0.52" fill="none" stroke="#fff" stroke-width="0.12"/>`;
    } else if (sel && sel.kind === 'gust') {
      (sel.target == null ? sel.tiles : sel.dests).forEach((i) => (o += sel.target == null ? `<circle cx="${Board.cx(i)}" cy="${Board.cy(i)}" r="0.5" fill="none" stroke="#e8f6ff" stroke-width="0.1" class="dest"/>` : dotAt(Board.cx(i), Board.cy(i))));
      if (sel.target != null) o += `<circle cx="${Board.cx(sel.target)}" cy="${Board.cy(sel.target)}" r="0.52" fill="none" stroke="#fff" stroke-width="0.12"/>`;
    } else if (sel && (sel.kind === 'bend' || sel.kind === 'metal')) {
      const pool = sel.kind === 'metal' && sel.first != null ? sel.tiles.filter((i) => i !== sel.first) : sel.targets || sel.tiles;
      const col = sel.kind === 'metal' ? '#c0c8d0' : { fire: '#ff7a3d', water: '#5fb2ea', earth: '#a8d070', air: '#f4f4f4' }[sel.el];
      pool.forEach((i) => (o += `<circle cx="${Board.cx(i)}" cy="${Board.cy(i)}" r="0.5" fill="none" stroke="${col}" stroke-width="0.11" class="dest"/>`));
      if (sel.first != null) o += `<circle cx="${Board.cx(sel.first)}" cy="${Board.cy(sel.first)}" r="0.52" fill="none" stroke="#fff" stroke-width="0.12"/>`;
    } else if (sel && sel.kind === 'sweep') {
      sel.dests.forEach((i) => (o += dotAt(Board.cx(i), Board.cy(i))));
      o += `<circle cx="${Board.cx(sel.target)}" cy="${Board.cy(sel.target)}" r="0.52" fill="none" stroke="#fff" stroke-width="0.12"/>`;
    } else if (sel && sel.kind === 'blood') {
      if (sel.from == null) [...new Set(sel.moves.map(srcOf))].forEach((k) => { let x, y; if (k[0] === 's') { const i = +k.slice(2); x = Board.cx(i); y = Board.cy(i); } else if (k[0] === 'g') [x, y] = Board.GATE_POS[+k[1]]; else { x = 0; y = 0; } o += `<circle cx="${x}" cy="${y}" r="${k[0] === 's' ? 0.5 : 0.85}" fill="none" stroke="#c0304a" stroke-width="0.11" class="dest"/>`; });
      else sel.moves.filter((m) => srcOf(m) === sel.from).forEach((m) => (o += `<circle cx="${Board.cx(m.to)}" cy="${Board.cy(m.to)}" r="0.2" fill="#c0304a"/>`));
    } else if (sel && sel.kind === 'koi') {
      const pool = sel.first == null ? [...new Set(sel.moves.flatMap((m) => [m.a, m.b]))] : sel.moves.filter((m) => m.a === sel.first || m.b === sel.first).map((m) => (m.a === sel.first ? m.b : m.a));
      pool.forEach((i) => (o += ringAt(Board.cx(i), Board.cy(i))));
      if (sel.first != null) o += `<circle cx="${Board.cx(sel.first)}" cy="${Board.cy(sel.first)}" r="0.5" fill="none" stroke="#fff" stroke-width="0.1"/>`;
    }
    if (!sel && G.ana && G.ana.s === G.s && G.ana.opp) {
      const a = G.ana.opp; if (a.t === 'move') { let x, y; if (a.from.kind === 'sq') { x = Board.cx(a.from.i); y = Board.cy(a.from.i); } else if (a.from.kind === 'gate') [x, y] = Board.GATE_POS[a.from.g]; else { x = 0; y = 0; } o += `<line x1="${x}" y1="${y}" x2="${Board.cx(a.to)}" y2="${Board.cy(a.to)}" stroke="#d070ff" stroke-width="0.09" stroke-dasharray="0.2 0.15"/><circle cx="${Board.cx(a.to)}" cy="${Board.cy(a.to)}" r="0.32" fill="none" stroke="#d070ff" stroke-width="0.09"/>`; }
    }
    if (sel) {
    } else if (isHumanTurn() && !G.s.tp.mainDone && hintsOn() && G.ana && G.ana.sug && G.ana.s === G.s) {
      const a = G.ana.sug.a; let x, y;
      if (a.t === 'plant') { if (a.gate === 'center') { x = 0; y = 0; } else [x, y] = Board.GATE_POS[a.gate]; o += `<circle cx="${x}" cy="${y}" r="0.9" fill="none" stroke="#5fe0c8" stroke-width="0.12" class="dest"/>`; }
      else {
        if (a.from.kind === 'sq') { x = Board.cx(a.from.i); y = Board.cy(a.from.i); } else if (a.from.kind === 'gate') [x, y] = Board.GATE_POS[a.from.g]; else { x = 0; y = 0; }
        const x2 = Board.cx(a.to), y2 = Board.cy(a.to);
        o += `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#5fe0c8" stroke-width="0.09" stroke-dasharray="0.25 0.18" opacity=".85"/><circle cx="${x}" cy="${y}" r="0.52" fill="none" stroke="#5fe0c8" stroke-width="0.09"/><circle cx="${x2}" cy="${y2}" r="0.3" fill="#5fe0c8" class="dest"/>`;
      }
    } else if (isHumanTurn() && !G.s.tp.mainDone) {
      // faint hint rings on tiles that can move
      const srcs = new Set(acts.filter((a) => a.t === 'move').map(srcOf));
      srcs.forEach((k) => {
        let x, y; if (k[0] === 's') { const i = +k.slice(2); x = Board.cx(i); y = Board.cy(i); } else if (k[0] === 'g') { [x, y] = Board.GATE_POS[+k[1]]; } else { x = 0; y = 0; }
        o += `<circle cx="${x}" cy="${y}" r="${k[0] === 's' ? 0.47 : 0.82}" fill="none" stroke="#f5d98a" stroke-opacity=".45" stroke-width="0.05"/>`;
      });
    }
    ld.innerHTML = o;
  }
  function seatStatus(k) {
    const s = G.s, h = s.hands[k];
    const keys = P.KEY_TYPES.reduce((n, t) => n + (h[t] || 0), 0);
    const fx = P.EFFECT_TYPES.reduce((n, t) => n + (h[t] || 0), 0);
    const hide = !(s.bend && s.bend.flight[1 - k]) && (G.opts.enigma && G.seats[k].kind !== 'human' || (G.opts.enigma && G.mode === 'local' && s.turn !== k));
    const who = G.seats[k].kind === 'ai' ? '' : k === 0 ? 'Guest · ' : 'Host · ';
    return `${who}${keys} key · ${hide ? fx + ' hidden' : fx + ' effect'}`;
  }
  // live play-style blip under each name: this game's style vs their usual one
  const STY_ADJ = { builder: 'more harmony-focused', aggressor: 'more aggressive', guardian: 'more defensive', trickster: 'trickier', balanced: 'more balanced' };
  function usualStyle(k) {
    const seat = G.seats[k]; if (!seat || seat.kind === 'ai') return null;
    if (me && seat.pid === me.id) return Eco.typicalStyle(me);
    G.usual = G.usual || {};
    if (!(seat.pid in G.usual)) { G.usual[seat.pid] = null; if (seat.pid && !String(seat.pid).startsWith('g-')) Store.get('players', seat.pid).then((p) => { if (p && G && G.usual) { G.usual[seat.pid] = Eco.typicalStyle(p); renderSeats(); } }).catch(() => {}); }
    return G.usual[seat.pid];
  }
  function liveStyle(k) {
    const T = (G.s.trk || {})[k]; if (!T) return '';
    const sc = Eco.styleScores(T), tot = Object.values(sc).reduce((a, b) => a + b, 0);
    if (tot < 4) return '';
    const cur = Eco.styleOf(T), C = Eco.STYLES[cur], usual = usualStyle(k);
    const U = usual && Eco.STYLES[usual], txt = !usual ? C.name : usual === cur ? C.name + ' ✓' : `${C.name} · usually ${U.icon}`;
    return `<span class="sty-blip" style="--c:${C.color}" title="${esc(usual && usual !== cur ? `${STY_ADJ[cur]} than usual — ` : '')}${esc(C.name + ': ' + C.desc)}">${C.icon} ${txt}</span>`;
  }
  function avGlow(k) { const s = G.s, lb = s.lastBend; return !!((lb && lb.sub === 'avatarState' && lb.p === k && s.turnNo - lb.t <= 2) || (s.avCounter && s.avCounter.target === k)); }
  function renderSeats() {
    const H = P.harmonies(G.s);
    const el = document.getElementById('seats'); if (!el) return;
    el.innerHTML = [0, 1].map((k) => `<div class="seat ${G.s.turn === k && G.s.winner === null ? 'active' : ''}"${G.seats[k].pid && !String(G.seats[k].pid).startsWith('g-') ? ` data-act="viewPlayer" data-pid="${esc(G.seats[k].pid)}"` : ''}>${G.seats[k].fig ? `<span class="disc fig-disc ${avGlow(k) ? 'glow' : ''}" style="position:relative">${Figure.svg(G.seats[k].fig, { portrait: true, avatarState: avGlow(k) })}<svg viewBox="-1.1 -1.1 2.2 2.2" style="position:absolute;right:-4px;bottom:-4px;width:13px;height:13px">${Glyphs.tile('lotus', k)}</svg></span>` : G.seats[k].avatar && Avatars.has(G.seats[k].avatar) ? `<span class="disc av-img" style="position:relative">${Avatars.svg(G.seats[k].avatar, 26)}<svg viewBox="-1.1 -1.1 2.2 2.2" style="position:absolute;right:-4px;bottom:-4px;width:13px;height:13px">${Glyphs.tile('lotus', k)}</svg></span>` : `<svg class="disc" viewBox="-1.1 -1.1 2.2 2.2">${Glyphs.tile('lotus', k)}</svg>`}
      <div class="meta"><span class="nm">${esc(G.seats[k].name)}${G.my === k && G.mode !== 'spectate' ? ' (you)' : G.mode === 'spectate' && G.seats[k].pid === avatarPid ? ' 👑' : ''}</span><span class="st">${seatStatus(k)}</span>${liveStyle(k)}</div>
      <div class="hc">${H.filter((h) => h.owners.includes(k)).length}<small>HARM.</small></div></div>`).join('');
  }
  function statusText() {
    const s = G.s, tp = s.tp;
    if (s.winner !== null) return s.winner === 'draw' ? '<b>Draw</b>' : `<b>${esc(G.seats[s.winner].name)}</b> wins by ${s.winReason}`;
    const nm = esc(G.seats[s.turn].name);
    if (G.mode === 'spectate') return `👻 Watching · <b>${nm}</b>’s turn`;
    if (!isHumanTurn()) return G.seats[s.turn].kind === 'ai' ? `${nm} is thinking…` : `Waiting for <b>${nm}</b>… ${G.mode === 'online' ? '<button class="btn small yip" data-act="yipYip">📣 Yip yip!</button>' : ''}`;
    const pre = G.mode === 'local' ? `<b>${nm}</b>: ` : '<b>Your turn</b> — ';
    if (G.sel && G.sel.kind === 'plant') return pre + 'tap a glowing gate to plant';
    if (G.sel && G.sel.kind === 'place') return pre + 'tap one of your ringed tiles to swap it out';
    if (G.sel && G.sel.kind === 'stone') return pre + 'tap any empty square for the Stone';
    if (G.sel && G.sel.kind === 'koi') return pre + (G.sel.first == null ? 'tap the first tile to swap' : 'tap the tile on the other side');
    if (G.sel && G.sel.kind === 'tile') return pre + 'tap a gold dot to move';
    if (tp.mustLotus) return pre + 'your Lotus must leave the centre';
    if (tp.extra) return pre + (tp.extra.kind === 'orchid' ? 'Orchid bonus: move one more tile (or End turn)' : 'Sky Bison bonus: the carried tile may move again');
    if (tp.mainDone) { const more = P.legalActions(s).some((x) => x.t !== 'end'); return pre + (more ? 'place an accent or use an ability, or ' : 'happy with it? Undo, or ') + (G.mode === 'online' ? '<b>Send move</b>' : '<b>End turn</b>'); }
    if (!acts.some((a) => a.t === 'move' || a.t === 'plant')) return pre + 'no moves available — tap End turn to pass';
    return pre + 'plant a flower or move a tile';
  }
  function renderStatus() {
    const el = document.getElementById('status'); if (!el) return;
    el.innerHTML = statusText() + (G.timerEnd && isHumanTurn() ? `<span class="timer" id="tmr">${Math.max(0, Math.ceil((G.timerEnd - Date.now()) / 1000))}s</span>` : '');
  }

  const hintsOn = () => setup.hints !== false && !(G && G.tutorial);
  const harmCount = (s, p, H) => (H || P.harmonies(s)).filter((h) => h.owners.includes(p)).length;
  // for each destination: harmony gain for mover, opponent harmonies broken, ring completion
  function destValues(moves) {
    const s = G.s, p = s.turn, H0 = P.harmonies(s), base = harmCount(s, p, H0), oppBase = harmCount(s, 1 - p, H0);
    const out = new Map();
    for (const m of moves) {
      if (out.has(m.to)) continue;
      try {
        const s2 = P.apply(s, m), H = P.harmonies(s2);
        out.set(m.to, { gain: harmCount(s2, p, H) - base, breaks: oppBase - harmCount(s2, 1 - p, H), ring: !!P.findRing(s2, p, H) });
      } catch (e) {}
    }
    return out;
  }
  // turn-start analysis: can I win now? can the opponent win next turn?
  function analyse() {
    if (!G || !isHumanTurn() || !(hintsOn() || (G.s.bend && G.s.bend.flight[G.s.turn]))) { if (G) G.ana = null; return; }
    const g = G, s = g.s, p = s.turn;
    setTimeout(() => {
      if (G !== g || g.s !== s) return;
      const mains = P.legalActions(s, { noPlace: true, noAbility: true }).filter((a) => a.t === 'move' || a.t === 'plant');
      let win = false;
      for (const a of mains) { try { if (P.findRing(P.apply(s, a), p)) { win = true; break; } } catch (e) {} }
      let danger = false;
      if (!win) {
        const t = P.clone(s); t.turn = 1 - p; t.tp = { mainDone: false, placed: false, used: {}, extra: null, mustLotus: false };
        for (const a of P.legalActions(t, { noPlace: true, noAbility: true })) { if (a.t !== 'move') continue; try { if (P.findRing(P.apply(t, a), 1 - p)) { danger = true; break; } } catch (e) {} }
      }
      let sug = null;
      try {
        const seq = AI.chooseTurn(s, 'medium');
        const main = seq.find((a) => a.t === 'move' || a.t === 'plant');
        const place = seq.find((a) => a.t === 'place');
        if (main) {
          const H0 = P.harmonies(s), base = harmCount(s, p, H0), oppBase = harmCount(s, 1 - p, H0);
          const s2 = P.apply(s, main), H = P.harmonies(s2);
          sug = { a: main, place, gain: harmCount(s2, p, H) - base, breaks: oppBase - harmCount(s2, 1 - p, H), ring: !!P.findRing(s2, p, H) };
        }
      } catch (e) {}
      let opp = null;
      if (s.bend && s.bend.flight[p]) { try { const t = P.clone(s); t.turn = 1 - p; t.tp = { mainDone: false, placed: false, used: {}, extra: null, mustLotus: false }; opp = AI.chooseTurn(t, 'medium').find((x) => x.t === 'move' || x.t === 'plant') || null; } catch (e) {} }
      g.ana = { win, danger, sug, s, opp };
      if (G === g && !g.sel) renderSel();
      if (G === g && !g.sel) renderInfo(null);
    }, 30);
  }
  const TIPS = [
    'Harmonies need at least one empty square between the two flowers.',
    'Two flowers of the same kind never harmonize — mix your Roses, Lilies and the rest.',
    'An opponent’s flower landing between two of yours breaks that harmony.',
    'A ring has to go all the way around the centre point — spread your flowers into all four quarters.',
    'Harmonies that cross the middle lines are worth the most: they’re what closes a ring.',
    'Dark (orange) flowers can’t stop on cream squares; light (white) flowers can’t stop on red ones. Neutral wood is fine for both.',
    'You can only have 2 flowers planted in gates at once — move one into the garden to plant again.',
    'Chrysanthemum and Jasmine harmonize in straight lines up to 5 squares; Rhododendron and Jade on diagonals up to 5; Rose and Lily any direction up to 3.',
    'Accent tiles don’t block harmonies, but they do block flowers from moving past them.',
    'Planted flowers in gates don’t harmonize yet — get them blooming in the garden.',
  ];
  function sugText(sg) {
    const s = G.s, a = sg.a; let t;
    if (a.t === 'plant') t = `plant a <b>${P.tname(a.type)}</b> in the ${a.gate === 'center' ? 'centre' : P.GATE_NAMES[a.gate] + ' gate'}`;
    else {
      const tile = a.from.kind === 'gate' ? s.gates[a.from.g] : a.from.kind === 'center' ? s.center.tile : (a.mover === 'under' ? s.board[a.from.i].under : s.board[a.from.i].top);
      t = `move your <b>${P.tname(tile.type)}</b> to ${P.sqName(a.to)}`;
    }
    const why = [];
    if (sg.ring) why.push('completes a ring!'); else if (sg.gain > 0) why.push(`+${sg.gain} harmon${sg.gain > 1 ? 'ies' : 'y'}`);
    if (sg.breaks > 0) why.push(`breaks ${sg.breaks} of theirs`);
    if (!why.length && a.t === 'plant') why.push('gets another flower ready');
    if (!why.length) why.push('sets up future harmonies');
    return t + ` <span class="tiny">(${why.join(', ')})</span>` + (sg.place ? `, then place <b>${P.tname(sg.place.type)}</b>` : '');
  }
  function renderInfo(type, owner) {
    const el = document.getElementById('info'); if (!el) return;
    if (type) { G.infoTile = { type, owner }; G.infoTab = 'desc'; }
    else if (G && G.infoTab === 'desc' && !G.infoPinned) G.infoTab = null;
    G.infoPinned = false;
    const hints = G && hintsOn() && isHumanTurn() && !G.blindOn;
    // suggestion pane
    let sug = '', show = '';
    if (G && G.blindOn) sug = '🍈 <b>You’re blind!</b> Tap a tile, then where it goes. Grab one of theirs and you lose the turn. A legal move earns a bonus.';
    else if (hints) {
      const a = G.ana && G.ana.s === G.s ? G.ana : null, opp = esc(G.seats[1 - G.s.turn].name);
      const sg = a && a.sug ? `<br>🧭 <b>Try:</b> ${sugText(a.sug)}` : '';
      if (a && a.sug) show = `<button class="info-swap" data-act="showSug">👁 Show</button>`;
      if (G.sel && G.sel.kind === 'tile') sug = `💡 <b style="color:#7cc48a">Green +N</b> = new harmonies for you · <b style="color:#6fc6e8">blue ring</b> = breaks one of ${opp}’s · ★ = completes a ring` + sg;
      else if (a && a.win) sug = `⭐ <b>You can close a ring this turn!</b>${sg}`;
      else if (a && a.danger) sug = `⚠️ <b>${opp} is one move from a ring</b> — block it.${sg}`;
      else if (a && a.sug) sug = `🧭 <b>Suggested:</b> ${sugText(a.sug)}<br><span class="tiny">💡 ${TIPS[(G.s.turnNo >> 1) % TIPS.length]}</span>`;
      else sug = `💡 ${TIPS[(G.s.turnNo >> 1) % TIPS.length]}`;
    }
    // description pane
    let desc = '';
    const t0 = G && G.infoTile;
    if (t0 && Guide.INFO[t0.type]) {
      const type = t0.type, owner = t0.owner;
      const inf = Guide.INFO[type];
      const ps = Guide.partners(type).filter((x) => x.ok).map((x) => x.type);
      desc = `${Glyphs.svg(type, owner == null ? 0 : owner)}<span style="flex:1"><b>${P.tname(type)}</b> · ${inf[1]}<br><span class="tiny">${ps.length ? 'Harmonizes with: ' + [...new Set(ps)].map((t) => `<span style="display:inline-block;vertical-align:middle;width:18px;height:18px">${Glyphs.svg(t, owner || 0, 'style="width:18px;height:18px"')}</span>`).join('') : 'Doesn’t harmonize'}</span></span><button class="btn small ghost" data-act="tileDetails" data-t="${type}" data-o="${owner == null ? 0 : owner}" style="flex:none;padding:6px 8px">Rules ›</button>`;
    }
    const has = { sug: !!sug, desc: !!desc };
    let tab = G && G.infoTab && has[G.infoTab] ? G.infoTab : has.sug ? 'sug' : has.desc ? 'desc' : null;
    if (G) G.infoTab = tab;
    const other = tab === 'sug' ? 'desc' : 'sug';
    const toggle = has.sug && has.desc ? `<button class="info-swap" data-act="infoTab" data-k="${other}">${other === 'sug' ? '🧭 Suggested move' : '📖 Tile info'} ⇄</button>` : '';
    const body = tab === 'sug' ? `${show}<span class="info-txt">${sug}</span>` : tab === 'desc' ? `<span class="info-row">${desc}</span>` : `<span class="info-txt">Tap any tile for its rules. Gold lines are harmonies.</span>`;
    el.innerHTML = `${toggle}<div class="info-body">${body}</div>`;
    el.scrollTop = 0;
  }
  function renderTray() {
    const el = document.getElementById('tray'); if (!el) return;
    const k = viewSeat(), h = G.s.hands[k];
    const plantable = new Set(acts.filter((a) => a.t === 'plant').map((a) => a.type));
    const placeable = new Set(acts.filter((a) => a.t === 'place').map((a) => a.type));
    const selT = G.sel && (G.sel.kind === 'plant' || G.sel.kind === 'place' || G.sel.kind === 'stone') ? G.sel.type : null;
    let o = '';
    if (G.opts.chance) {
      const n = P.KEY_TYPES.reduce((x, t) => x + (h[t] || 0), 0);
      const can = P.KEY_TYPES.some((t) => plantable.has(t));
      o += `<button class="tt ${can ? '' : 'off'} ${G.sel && G.sel.chance ? 'sel' : ''}" data-act="trayTap" data-t="random">${Glyphs.svg('random', k)}<span class="n">${n}</span><span class="lb">Draw</span></button>`;
    } else P.KEY_TYPES.forEach((t) => { if (!h[t]) return; o += `<button class="tt ${plantable.has(t) ? '' : 'off'} ${selT === t ? 'sel' : ''}" data-act="trayTap" data-t="${t}">${Glyphs.svg(t, k)}<span class="n">${h[t]}</span><span class="lb">${P.tname(t)}</span></button>`; });
    const fx = P.EFFECT_TYPES.filter((t) => h[t]);
    if (fx.length) o += '<span class="sep"></span>';
    fx.forEach((t) => { const can = plantable.has(t) || placeable.has(t); o += `<button class="tt ${can ? '' : 'off'} ${selT === t ? 'sel' : ''}" data-act="trayTap" data-t="${t}">${Glyphs.svg(t, k)}${h[t] > 1 ? `<span class="n">${h[t]}</span>` : ''}<span class="lb">${P.tname(t)}</span></button>`; });
    if (!o) o = '<span class="muted tiny">Hand empty</span>';
    el.innerHTML = o;
  }
  function renderBar() {
    const s = G.s;
    const end = document.getElementById('b-end'), undo = document.getElementById('b-undo'), bh = document.getElementById('b-h');
    if (!end) return;
    const canEnd = isHumanTurn() && acts.some((a) => a.t === 'end');
    end.disabled = !canEnd || s.winner !== null;
    end.textContent = !s.tp.mainDone && canEnd ? 'Pass' : G.mode === 'online' ? 'Send move ✓' : 'End turn';
    end.classList.toggle('glow', canEnd && s.tp.mainDone);
    if (s.winner !== null) { end.disabled = false; end.textContent = 'Result'; end.classList.remove('glow'); }
    undo.disabled = !canUndo();
    bh.style.opacity = G.showH ? 1 : 0.5;
  }
  const bendSeat = () => (G.my != null ? G.my : G.s.turn);
  function renderBendBar() {
    if (G && G.mode === 'spectate') return renderSpiritBar();
    const bar = document.getElementById('bendbar'); if (!bar) return;
    const s = G.s, seat = bendSeat(), pw = (s.opts.powers || [])[seat] || {};
    if (!s.bend || !(pw.nation || pw.avatar) || G.seats[seat].kind !== 'human' || s.winner !== null) { bar.style.display = 'none'; return; }
    const els = pw.avatar || pw.allEl ? ['fire', 'water', 'earth', 'air'] : [pw.nation];
    const used = s.bend.used[seat], free = pw.avatar || P.hasHarmony(s, seat), cost = P.bendCost(s, seat);
    const sel = G.sel && G.sel.kind === 'bend' ? G.sel.el : null;
    let o = '';
    if (!used) els.forEach((el) => {
      const ok = free || cost;
      o += `<button class="bb main ${sel === el ? 'sel' : ''}" data-act="bendGo" data-el="${el}" ${ok ? '' : 'disabled'}><span class="i">${Eco.BEND[el].icon}</span><span><b>${Eco.BEND[el].verb}</b><small>${free ? 'free now' : cost ? 'costs ' + P.tname(cost.type) : 'need a tile'}</small></span></button>`;
    });
    else o += `<span class="bb spent"><span class="i">${pw.avatar ? '☯️' : Eco.BEND[pw.nation].icon}</span><small>bend used</small></span>`;
    const prac = s.opts.subPractice, left = prac ? P.PRACTICE_USES - s.bend.subs[seat].length : 0;
    if (!G.metal) P.subAvailable(s, seat).forEach((k) => { o += `<button class="bb sub" data-act="subGo" data-k="${k}"><span class="i">${Eco.SUBS[k].icon}</span><span><b>${Eco.SUBS[k].name}</b><small>${prac ? left + ' left' : 'free · once'}</small></span></button>`; });
    const cd = P.practiceCooldown(s, seat), moreSubs = prac ? left > 0 : (pw.subs || []).length > s.bend.subs[seat].length && s.bend.subs[seat].length < (pw.avatar ? 2 : 1);
    if (!P.subAvailable(s, seat).length && cd > 0 && moreSubs) o += `<span class="bb spent"><span class="i">⏳</span><small>sub-bend after ${cd} more of their turn${cd === 1 ? '' : 's'}</small></span>`;
    if (P.gustAvailable(s, seat)) o += `<button class="bb sub ${G.sel && G.sel.kind === 'gust' ? 'sel' : ''}" data-act="gustGo"><span class="i">🌬️</span><span><b>Gust</b><small>push a tile ≤7</small></span></button>`;
    if (P.flightOn(s, seat) && !isHumanTurn()) o += `<span class="bb spent"><span class="i">🪽</span><small>${G.draftLive ? 'watching live' : 'flying'}</small></span>`;
    o += '<span class="bb-sep"></span>';
    els.forEach((el) => (o += `<button class="bb spam" data-act="spamGo" data-el="${el}"><span class="i">${Eco.BEND[el].icon}</span><small>${{ fire: 'Flames', water: 'Waves', earth: 'Quake', air: 'Gust' }[el]}</small></button>`));
    const ml = s.seismic === 1 - seat ? 0 : Math.min(P.melonLeft(s, seat), P.MELON_MAX - (G.melonCalls || 0));
    if (ml > 0) o += `<button class="bb spam" data-act="chatQuick" data-q="MELON LORD! 🍈"><span class="i">🍈</span><small>Melon Lord ×${ml}</small></button>`;
    o += `<button class="bb spam" data-act="bendMenu"><span class="i">ⓘ</span><small>Details</small></button>`;
    bar.style.display = 'flex'; bar.innerHTML = o;
    renderMetalPanel();
  }
  // ---------- Metalbending: up to 2 slots (swap = 2, move = 1, smash = 1) ----------
  function renderMetalPanel() {
    let el = document.getElementById('metal-panel');
    const M = G && G.metal;
    if (!M) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'metal-panel'; el.className = 'metal-panel'; const bb = document.getElementById('bendbar'); bb && bb.parentNode.insertBefore(el, bb); }
    const used = M.ops.reduce((n, o) => n + (o.op === 'swap' ? 2 : 1), 0), left = 2 - used;
    const est = P.metalGold(P.harmonyKeys(M.real), P.harmonyKeys(G.s), M.seat, new Set(M.ops.flatMap((o) => o.op === 'swap' ? [o.a, o.b] : [o.from != null ? o.from : o.at])).size);
    const lost = M.lost || 0;
    const b = (op, ic, t, need) => `<button class="mb ${M.mode === op ? 'on' : ''}" data-act="metalMode" data-k="${op}" ${left < need ? 'disabled' : ''}>${ic}<small>${t}</small></button>`;
    el.innerHTML = `<div class="mp-top"><b>⚙️ Metalbending</b><span>${left} of 2 left${M.ops.length ? ` · steals ~${est.amt} gp${G.mode !== 'online' ? ' (online only)' : ''}` : ''}</span></div>
      <div class="mp-row">${b('swap', '⇄', 'Swap 2', 2)}${b('move', '➜', 'Move', 1)}${b('smash', '💥', 'Smash', 1)}
      <button class="mb go" data-act="metalDone" ${M.ops.length ? '' : 'disabled'}>✓<small>Done</small></button><button class="mb" data-act="metalCancel">✕<small>Cancel</small></button></div>
      <div class="tiny muted">${M.mode === 'swap' ? (M.pick == null ? 'Tap the first tile to swap' : 'Tap the tile to swap it with') : M.mode === 'move' ? (M.pick == null ? 'Tap a tile to lift' : 'Tap where it lands (up to 7 squares, any direction)') : M.mode === 'smash' ? 'Tap a tile to smash it out of the game' : 'Pick what to do. Flowers left in the wrong garden are lost by their owner.' + (isHumanTurn() ? ' Ends your turn.' : ' Lands on their board right now.')}${lost ? ` · ⚠️ ${lost} flower${lost > 1 ? 's' : ''} in the wrong garden will be lost` : ''}</div>`;
  }
  function metalPreview() {
    const M = G.metal; let t = P.clone(M.real), lost = 0;
    try { if (M.ops.length) { const r = P.runMetal(t, M.seat, M.ops); lost = r.lostFlowers.length; } } catch (e) { M.ops.pop(); t = P.clone(M.real); if (M.ops.length) P.runMetal(t, M.seat, M.ops); toast('Can’t do that'); }
    M.lost = lost; G.s = t;
  }
  function metalTargets() {
    const M = G.metal, s = G.s; if (!M.mode) return [];
    if (M.mode === 'move' && M.pick != null) return P.metalMoveDests(s, M.pick);
    return P.metalPairs(s).filter((i) => i !== M.pick);
  }
  function metalTap(i) {
    const M = G.metal; if (!M || !M.mode) return;
    if (!metalTargets().includes(i)) { if (M.pick != null) { M.pick = null; renderBoard(); renderMetalPanel(); } return; }
    if (M.mode === 'smash') M.ops.push({ op: 'smash', at: i });
    else if (M.pick == null) { M.pick = i; renderBoard(); renderMetalPanel(); return; }
    else if (M.mode === 'swap') M.ops.push({ op: 'swap', a: M.pick, b: i });
    else M.ops.push({ op: 'move', from: M.pick, to: i });
    M.pick = null; M.mode = null; metalPreview();
    const used = M.ops.reduce((n, o) => n + (o.op === 'swap' ? 2 : 1), 0);
    if (used >= 2) return metalSend();
    renderGame();
  }
  function metalSend() {
    const M = G.metal; G.s = M.real; G.metal = null;
    doBend({ t: 'sub', kind: 'metal', ops: M.ops }).then(() => renderGame());
  }
  function metalCancel() { if (!G.metal) return; G.s = G.metal.real; G.metal = null; renderGame(); }
  function renderBendBtn() {
    renderBendBar();
    const b = document.getElementById('bend-btn'); if (!b) return;
    b.style.display = 'none'; return;
    b.textContent = pw.avatar ? '☯️' : Eco.BEND[pw.nation].icon;
    b.classList.toggle('spent', !!s.bend.used[bendSeat()] && !P.subAvailable(s, bendSeat()).length);
  }
  function renderGame() { computeActs(); renderBoard(); renderSeats(); renderStatus(); renderTray(); renderBar(); renderBendBtn(); if (!G.sel) renderInfo(null); if (G.tutorial) tutUpdate(); settleLedger(); avatarPrompt(); }
  // ---------- gold that moves during a match (Metalbending steals, Avatar State costs) ----------
  function settleLedger() {
    if (!G || !me || G.mode !== 'online' || G.metal) return;
    const L = G.s.ledger || [], all = Store.LS.get('ledger', {}), done = all[G.code] || {};
    let change = 0; const notes = [];
    L.forEach((e) => {
      if (done[e.id] != null) return;
      let d = 0;
      if (e.to === G.my) d = e.amt; else if (e.from === G.my) d = -e.amt;
      done[e.id] = d; change += d;
      if (d > 0) notes.push(`⚙️ +${d} gp stolen from ${G.seats[1 - G.my].name}`);
      else if (d < 0) notes.push(e.why === 'avatarState' ? `✨ Avatar State: −${-d} gp` : `⚙️ ${G.seats[1 - G.my].name} metalbent you: −${-d} gp`);
    });
    // entries undone by an Avatar State give the gold back
    const ids = new Set(L.map((e) => e.id));
    Object.keys(done).forEach((id) => { if (!ids.has(id) && done[id]) { change -= done[id]; notes.push(done[id] > 0 ? `✨ Avatar State undid your steal: −${done[id]} gp` : `✨ Avatar State got your ${-done[id]} gp back`); done[id] = 0; } });
    all[G.code] = done; Store.LS.set('ledger', all);
    if (!change) return;
    Eco.ensure(me); me.gp = Math.max(0, me.gp + change); saveMe();
    notes.forEach((n, k) => setTimeout(() => toast(n, 3500), 400 + k * 1600));
  }
  function avatarPrompt() {
    const C = G && G.s.avCounter; if (!C || G.s.winner !== null) return;
    const mine = G.mode === 'local' ? G.seats[C.target].kind === 'human' : C.target === G.my;
    if (!mine || G.seats[C.target].kind !== 'human') return;
    const key = G.code + ':' + C.t + ':' + C.kind; if (G.avAsked === key || document.querySelector('.sheet')) return;
    G.avAsked = key;
    const nm = G.seats[C.by].name, what = { metal: 'Metalbending', lightning: 'Lightning', blood: 'Bloodbending', flight: 'Flight', gust: 'a Gust of wind' }[C.kind];
    const gp = me ? (me.gp || 0) : 0, can = G.mode !== 'online' || gp >= 300;
    sheet(`<div style="text-align:center"><div style="font-size:46px">✨</div><h3 style="margin:2px 0">${esc(nm)} used ${what} on you!</h3>
      <p class="muted">As the Avatar you can enter the <b>Avatar State</b> to undo it completely.${G.mode === 'online' ? ` It costs <b>300 gp</b> (you have ${gp.toLocaleString()}).` : ''}</p>
      <div class="menu"><button class="btn primary" data-act="avState" data-v="1" ${can ? '' : 'disabled'}>Enter the Avatar State${G.mode === 'online' ? ' (−300 gp)' : ''}</button><button class="btn" data-act="avState" data-v="0">Let it happen</button></div>
      ${can ? '' : '<div class="tiny muted">You need 300 gp to enter the Avatar State.</div>'}</div>`);
  }
  function avatarStateAnswer(accept) {
    closeSheet();
    const C = G && G.s.avCounter; if (!C) return;
    if (accept && G.mode === 'online' && (!me || (me.gp || 0) < 300)) return toast('You need 300 gp');
    doBend({ t: 'avatarState', accept, by: C.target }).then((ok) => { if (ok && accept) toast('✨ AVATAR STATE! It’s undone.', 3500); if (G) { renderGame(); if (G.s.turn !== C.target || !accept) afterTurnChange(); } });
  }

  // ---------- input ----------
  function boardPoint(e) {
    const svg = document.getElementById('board');
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return p;
  }
  function onBoardClick(e) {
    if (!G) return;
    const p = boardPoint(e);
    const c = Math.floor(p.x + 9), r = Math.floor(p.y + 9);
    if (r < 0 || c < 0 || r > 17 || c > 17) { G.sel = null; renderGame(); return; }
    const i = r * 18 + c;
    const tgt = { i, gate: P.gateOfSq[i], center: !!(G.s.center && Math.hypot(p.x, p.y) < 1) || (Math.hypot(p.x, p.y) < 1 && G.sel && G.sel.kind === 'plant' && G.sel.moves.some((m) => m.gate === 'center')) };
    tap(tgt);
  }
  function boardXY(tg) {
    if (tg.center) return [0, 0];
    if (tg.gate >= 0) return Board.GATE_POS[tg.gate];
    return [Board.cx(tg.i), Board.cy(tg.i)];
  }
  async function tap(tg) {
    const s = G.s, sel = G.sel;
    // info for whatever is under the finger
    const cellTop = s.board[tg.i] && s.board[tg.i].top;
    if (G.blindOn && isHumanTurn() && !(sel && sel.kind === 'plant')) {
      const p = boardXY(tg); ripple(p[0], p[1], true);
      let key = null, tile = null;
      if (tg.center && s.center) { key = 'c'; tile = s.center.tile; } else if (tg.gate >= 0) { key = 'g' + tg.gate; tile = s.gates[tg.gate]; } else { key = 'sq' + tg.i; tile = cellTop; }
      if (sel && sel.kind === 'blindPick') {
        if (key === sel.key) { G.sel = null; return renderSel(); }
        if (sel.mine) {
          const m = acts.find((a) => a.t === 'move' && srcOf(a) === sel.key && a.to === tg.i);
          if (m) { G.sel = null; return doAction(m); }
          if (tile && tile.owner === s.turn) { G.sel = { kind: 'blindPick', key, mine: true, x: p[0], y: p[1] }; return renderSel(); }
          return toast('Can’t move there');
        }
        G.sel = null; toast('🍈 That wasn’t your tile! You lose this turn.', 3000); buzz(80);
        return doAction({ t: 'forfeit' });
      }
      if (tile) { G.sel = { kind: 'blindPick', key, mine: tile.owner === s.turn, x: p[0], y: p[1] }; return renderSel(); }
      return;
    }
    if (G.metal && tg.i >= 0) return metalTap(tg.i);
    if (sel && sel.kind === 'gust') {
      if (sel.target == null) { if (sel.tiles.includes(tg.i)) { const d = P.gustDests(s, tg.i); if (!d.length) return toast('Nowhere for the wind to push that tile'); sel.target = tg.i; sel.dests = d; return renderBoard(); } }
      else if (sel.dests.includes(tg.i)) return doBend({ t: 'sub', kind: 'gust', target: sel.target, to: tg.i });
      G.sel = null; renderBoard(); return;
    }
    if (sel && ['bend', 'sweep', 'metal', 'blood'].includes(sel.kind)) {
      if (sel.kind === 'bend' && sel.targets.includes(tg.i)) {
        if (sel.el === 'air') { const d = P.sweepDests(s, tg.i); if (!d.length) return toast('Nowhere to sweep that tile'); G.sel = { kind: 'sweep', target: tg.i, dests: d }; return renderBoard(); }
        return doBend({ t: 'bend', el: sel.el, target: tg.i });
      }
      if (sel.kind === 'sweep' && sel.dests.includes(tg.i)) return doBend({ t: 'bend', el: 'air', target: sel.target, to: tg.i });
      if (sel.kind === 'metal') {
        if (sel.first == null && sel.tiles.includes(tg.i)) { sel.first = tg.i; return renderBoard(); }
        if (sel.first != null && sel.tiles.includes(tg.i) && tg.i !== sel.first) return doBend({ t: 'sub', kind: 'metal', a: sel.first, b: tg.i });
      }
      if (sel.kind === 'blood') {
        const key = tg.center ? 'c' : tg.gate >= 0 ? 'g' + tg.gate : 'sq' + tg.i;
        if (sel.from == null && sel.moves.some((m) => srcOf(m) === key)) { sel.from = key; return renderBoard(); }
        if (sel.from != null) { const m = sel.moves.find((m) => srcOf(m) === sel.from && m.to === tg.i); if (m) return doBend({ t: 'sub', kind: 'blood', move: m }); }
      }
      G.sel = null; renderBoard(); renderStatus(); return;
    }
    if (!isHumanTurn()) { if (cellTop) renderInfo(cellTop.type, cellTop.owner); else if (tg.gate >= 0 && s.gates[tg.gate]) renderInfo(s.gates[tg.gate].type, s.gates[tg.gate].owner); return; }
    if (sel) {
      if (sel.kind === 'tile') {
        const ms = sel.moves.filter((m) => m.to === tg.i && !tg.center);
        if (ms.length) return pickAndDo(ms);
      } else if (sel.kind === 'plant') {
        const m = sel.moves.find((m) => (tg.center ? m.gate === 'center' : m.gate === tg.gate));
        if (m) return doAction(m);
      } else if (sel.kind === 'place') {
        const m = sel.moves.find((m) => m.target === tg.i);
        if (m) {
          if (m.type === 'stone') { G.sel = { kind: 'stone', type: 'stone', target: tg.i, spots: [tg.i].concat(P.stoneSpots(s)) }; return renderGame(); }
          return doAction(m);
        }
      } else if (sel.kind === 'stone') {
        if (sel.spots.includes(tg.i)) return doAction({ t: 'place', type: 'stone', target: sel.target, at: tg.i });
      } else if (sel.kind === 'koi') {
        if (sel.first == null) { if (sel.moves.some((m) => m.a === tg.i || m.b === tg.i)) { sel.first = tg.i; return renderGame(); } }
        else { const m = sel.moves.find((m) => (m.a === sel.first && m.b === tg.i) || (m.b === sel.first && m.a === tg.i)); if (m) return doAction(m); }
      }
    }
    // select a source
    let key = null, tile = null;
    if (tg.center && s.center) { key = 'c'; tile = s.center.tile; }
    else if (tg.gate >= 0) { key = 'g' + tg.gate; tile = s.gates[tg.gate]; }
    else { key = 'sq' + tg.i; tile = cellTop; }
    if (tile) renderInfo(tile.type, tile.owner);
    const moves = acts.filter((a) => a.t === 'move' && srcOf(a) === key);
    const abil = acts.filter((a) => (a.t === 'wheel' || a.t === 'koi') && a.i === tg.i);
    if (!moves.length && !abil.length) { G.sel = null; renderBoard(); renderStatus(); renderTray(); if (!tile) renderInfo(null); return; }
    let movers = moves;
    const tops = moves.filter((m) => m.mover !== 'under'), unders = moves.filter((m) => m.mover === 'under');
    const opts = [];
    if (tops.length) opts.push({ label: `Move ${P.tname((tile || {}).type || '')}`, value: 'top' });
    if (unders.length) opts.push({ label: `Move ${P.tname(s.board[tg.i].under.type)} (underneath)`, value: 'under' });
    if (abil.some((a) => a.t === 'wheel')) opts.push({ label: 'Spin the Wheel', value: 'wheel' });
    if (abil.some((a) => a.t === 'koi')) opts.push({ label: 'Koi: swap two tiles', value: 'koi' });
    let choice = opts.length === 1 ? opts[0].value : await choose('What would you like to do?', opts);
    if (!choice) return;
    if (choice === 'top') { G.sel = { kind: 'tile', moves: tops, tileId: tile && tile.id }; }
    else if (choice === 'under') { G.sel = { kind: 'tile', moves: unders, tileId: s.board[tg.i].under.id }; }
    else if (choice === 'wheel') {
      const ws = abil.filter((a) => a.t === 'wheel');
      const w = await choose('Spin the Wheel', ws.map((a) => ({ label: `${a.dir > 0 ? '↻ Clockwise' : '↺ Counter-clockwise'} ${a.n}`, value: a })));
      if (w) return doAction(w); return;
    } else if (choice === 'koi') { G.sel = { kind: 'koi', i: tg.i, moves: abil.filter((a) => a.t === 'koi'), first: null }; }
    buzz(5);
    renderBoard(); renderStatus(); renderTray();
  }
  async function pickAndDo(ms) {
    if (ms.length === 1) return doAction(ms[0]);
    const opts = ms.map((m) => ({ label: m.boat ? 'Move with all neighbouring tiles' : m.carry === true ? 'Carry the top tile along' : m.carry === false ? 'Leave the top tile behind' : 'Move alone', value: m }));
    const m = await choose('How should it move?', opts);
    if (m) doAction(m);
  }
  function trayTap(t) {
    if (!G) return;
    const h = G.s.hands[viewSeat()];
    if (t !== 'random' && Guide.INFO[t]) renderInfo(t, viewSeat());
    if (!isHumanTurn()) return;
    if (t === 'random') {
      const avail = P.KEY_TYPES.filter((k) => h[k] > 0 && acts.some((a) => a.t === 'plant' && a.type === k));
      if (!avail.length) return toast('You can’t plant right now');
      const pick = avail[Math.floor(Math.random() * avail.length)];
      G.sel = { kind: 'plant', type: pick, chance: true, moves: acts.filter((a) => a.t === 'plant' && a.type === pick) };
      renderInfo(pick, viewSeat()); toast('You drew a ' + P.tname(pick));
    } else if (P.isFlower(t)) {
      const ms = acts.filter((a) => a.t === 'plant' && a.type === t);
      if (!ms.length) return toast(G.s.tp.mainDone ? 'You’ve already made your move this turn' : P.plantedCount(G.s, G.s.turn) >= 2 ? 'You already have 2 planted flowers' : 'No open gate');
      G.sel = G.sel && G.sel.type === t ? null : { kind: 'plant', type: t, moves: ms };
    } else {
      const ms = acts.filter((a) => a.t === 'place' && a.type === t);
      if (!ms.length) return toast(G.s.tp.placed ? 'Only one accent can be placed per turn' : t === 'wheel' ? 'The Wheel swaps with one of your accent tiles on the board' : 'Swap it with one of your flowers in the garden');
      G.sel = G.sel && G.sel.type === t ? null : { kind: 'place', type: t, moves: ms };
    }
    renderBoard(); renderStatus(); renderTray();
  }

  // ---------- actions & turn flow ----------
  const autoSend = () => Store.LS.get('autoSend', false) === true;
  function canUndo() {
    if (!G || !G.history.length || G.s.winner !== null || G.busy) return false;
    if (G.mode === 'online') return isHumanTurn() && G.history.length > 0;
    return true;
  }
  // per-match play-style tracking (stored in the game state so Undo rolls it back)
  const DEF_T = { stone: 1, knotweed: 1, badgermole: 1 }, TRICK_T = { wheel: 1, boat: 1, koi: 1, skybison: 1 };
  function track(prev, next, a, seat) {
    if (seat == null || !next) return;
    try {
      next.trk = next.trk || {};
      const T = next.trk[seat] = Object.assign({ f: 0, d: 0, k: 0, b: 0, g: 0, t: 0, m: 0 }, next.trk[seat]);
      const cnt = (st, k) => P.harmonies(st).filter((h) => h.owners.includes(k)).length;
      const rem = (st, k) => (st.removed || []).filter((x) => x.owner === k).length;
      const o = 1 - seat;
      T.f += Math.max(0, cnt(next, seat) - cnt(prev, seat));
      T.d += Math.max(0, cnt(prev, o) - cnt(next, o));
      T.k += Math.max(0, rem(next, o) - rem(prev, o));
      if (a.t === 'plant' || a.t === 'move') T.m++;
      if (a.t === 'place') { if (DEF_T[a.type]) T.g++; else if (TRICK_T[a.type]) T.t++; else if (a.type === 'dragon') T.b++; }
      if (a.t === 'wheel' || a.t === 'koi' || a.t === 'melon' || (a.t === 'sub' && a.kind !== 'lightning')) T.t++;
      if (a.t === 'bend' || (a.t === 'sub' && a.kind === 'lightning')) T.b++;
    } catch (e) {}
  }
  function doAction(a) {
    if (!G || G.busy) return;
    try {
      G.history.push(G.s);
      const prev = G.s; G.s = P.apply(G.s, a); track(prev, G.s, a, a.by != null ? a.by : prev.turn);
    } catch (e) { G.history.pop(); toast('That move isn’t allowed'); console.warn(e); return; }
    G.sel = null; buzz(10);
    if (a.t === 'end' || a.t === 'forfeit') return turnEnded();
    sendDraft();
    renderGame();
    // auto-end when nothing optional is left
    if (G.s.tp.mainDone && (autoSend() || G.tutorial)) {
      const left = P.legalActions(G.s).filter((x) => x.t !== 'end');
      if (!left.length) { G.busy = true; setTimeout(() => { G.busy = false; if (G && G.s.tp.mainDone && G.s.winner === null) doAction({ t: 'end' }); }, 450); }
    }
  }
  function turnEnded() {
    const prevSeat = 1 - G.s.turn;
    if (G.mode === 'online' && prevSeat === G.my) { G.history = []; pushOnline(); }
    renderGame();
    afterTurnChange();
  }
  // ---------- S Pen doodles: drag a stylus over the board to draw; it shows for a few seconds, then fades ----------
  const Doodle = (() => {
    const IDLE_MS = 1200, SHOW_MS = 5000, MAX_PTS = 1500;
    let wrap = null, cv = null, live = null, idleT = null, down = null, swallowClick = false;
    const color = (seat) => (seat === 1 ? '#6fc6e8' : '#f2cf6e');
    function canvas() {
      if (cv && cv.isConnected) return cv;
      cv = document.createElement('canvas'); cv.className = 'doodle';
      wrap.appendChild(cv); size(); return cv;
    }
    function size() { if (!cv) return; const r = wrap.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; }
    const shown = []; // {strokes, seat, until, fade}
    function draw() {
      const c = canvas(), x = c.getContext('2d'), now = Date.now(), dpr = window.devicePixelRatio || 1, q = sq();
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
      x.setTransform(1, 0, 0, 1, q.ox * dpr, q.oy * dpr);
      const w = q.d * dpr, h = q.d * dpr;
      const items = shown.concat(live ? [{ strokes: live.strokes, seat: live.seat, until: Infinity }] : []);
      items.forEach((it) => {
        const a = it.until === Infinity ? 1 : Math.max(0, Math.min(1, (it.until - now) / 600));
        x.globalAlpha = a; x.strokeStyle = color(it.seat); x.lineWidth = Math.max(3, w * 0.008); x.lineCap = x.lineJoin = 'round';
        x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 4;
        it.strokes.forEach((st) => { if (!st.length) return; x.beginPath(); x.moveTo(st[0][0] * w, st[0][1] * h); if (st.length === 1) x.lineTo(st[0][0] * w + 0.5, st[0][1] * h); st.forEach((p) => x.lineTo(p[0] * w, p[1] * h)); x.stroke(); });
      });
      x.globalAlpha = 1;
      for (let i = shown.length - 1; i >= 0; i--) if (shown[i].until <= now) shown.splice(i, 1);
      if (shown.length || live) requestAnimationFrame(draw);
    }
    function show(strokes, seat) {
      if (!wrap || !wrap.isConnected) return;
      shown.push({ strokes, seat, until: Date.now() + SHOW_MS }); requestAnimationFrame(draw); buzz(6);
    }
    const sq = () => { const r = wrap.getBoundingClientRect(), d = Math.min(r.width, r.height); return { x: r.left + (r.width - d) / 2, y: r.top + (r.height - d) / 2, d, ox: (r.width - d) / 2, oy: (r.height - d) / 2 }; };
    const pt = (e) => { const q = sq(); return [Math.round(((e.clientX - q.x) / q.d) * 1000) / 1000, Math.round(((e.clientY - q.y) / q.d) * 1000) / 1000]; };
    const npts = () => (live ? live.strokes.reduce((n, s) => n + s.length, 0) : 0);
    function finish() {
      if (!live) return;
      const d = live; live = null;
      const strokes = d.strokes.filter((s) => s.length);
      if (!strokes.length) return;
      show(strokes, d.seat); bump('doodles');
      if (G && G.mode === 'online') Store.patch('games', G.code, { doodle: { seat: G.my, t: Date.now(), s: JSON.stringify(strokes) } }).catch(() => toast('Doodle not sent'));
    }
    function attach(w) {
      wrap = w; if (!wrap) return; cv = null;
      wrap.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'pen' || !G) return;
        down = { x: e.clientX, y: e.clientY, id: e.pointerId, drawing: false, first: pt(e) };
      }, true);
      wrap.addEventListener('pointermove', (e) => {
        if (!down || e.pointerId !== down.id) return;
        if (!down.drawing) {
          if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) return;
          down.drawing = true; clearTimeout(idleT);
          try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
          if (!live) live = { seat: G.my != null ? G.my : G.s.turn, strokes: [] };
          live.strokes.push([down.first]); requestAnimationFrame(draw);
        }
        e.preventDefault();
        if (npts() >= MAX_PTS) return;
        const st = live.strokes[live.strokes.length - 1], p = pt(e), q = st[st.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.004) st.push(p);
      }, { capture: true, passive: false });
      const up = (e) => {
        if (!down || e.pointerId !== down.id) return;
        if (down.drawing) { swallowClick = true; setTimeout(() => (swallowClick = false), 400); clearTimeout(idleT); idleT = setTimeout(finish, IDLE_MS); }
        down = null;
      };
      wrap.addEventListener('pointerup', up, true); wrap.addEventListener('pointercancel', up, true);
      wrap.addEventListener('click', (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
    }
    window.addEventListener('resize', size);
    return { attach, show, get lastT() { return 0; } };
  })();

  function stopGameTimers() {
    if (G && G.hereTimer) { clearInterval(G.hereTimer); G.hereTimer = null; } if (G) { clearTimeout(G.boPulseT); G.boPulseT = null; } if (G && G.tick) { clearInterval(G.tick); G.tick = null; } if (G && G.waitingUnsub) { G.waitingUnsub(); G.waitingUnsub = null; } }
  function afterTurnChange() {
    if (!G) return;
    if (G.tick) { clearInterval(G.tick); G.tick = null; }
    G.timerEnd = 0;
    if (G.s.winner !== null) return gameOver();
    const seat = G.seats[G.s.turn];
    if (seat.kind === 'ai') return runAI();
    analyse();
    if (seat.kind === 'human' && G.opts.timer) {
      G.timerEnd = Date.now() + G.opts.timer * 1000;
      G.tick = setInterval(() => {
        if (!G || !isHumanTurn()) return;
        const left = G.timerEnd - Date.now();
        const t = document.getElementById('tmr'); if (t) t.textContent = Math.max(0, Math.ceil(left / 1000)) + 's'; else renderStatus();
        if (left <= 0) { clearInterval(G.tick); G.tick = null; timeUp(); }
      }, 250);
    }
    renderStatus();
  }
  function timeUp() {
    toast('Time’s up!');
    G.sel = null;
    if (!G.s.tp.mainDone) {
      const ms = P.legalActions(G.s).filter((a) => a.t === 'move' || a.t === 'plant');
      if (ms.length) { G.history.push(G.s); G.s = P.apply(G.s, ms[Math.floor(Math.random() * ms.length)]); }
    }
    doAction({ t: 'end' });
  }
  async function runAI() {
    G.busy = true; renderStatus(); renderBar();
    const g = G;
    await sleep(500);
    let seq = g.tutorial ? tutAIMove(g.s) : AI.chooseTurn(g.s, g.seats[g.s.turn].level);
    if (g.s.melon && g.s.melon.blind === g.s.turn) {
      showBubble(g.s.turn, 'wow');
      const mains = P.legalActions(g.s, { noPlace: true, noAbility: true }).filter((x) => x.t === 'move' || x.t === 'plant');
      seq = Math.random() < 0.3 || !mains.length ? [{ t: 'forfeit' }] : [mains[Math.floor(Math.random() * mains.length)], { t: 'end' }];
    }
    for (const a of seq) {
      if (G !== g) return;
      if (a.t === 'end') break;
      if (a.t === 'forfeit') { g.s = P.apply(g.s, a); g.busy = false; renderGame(); afterTurnChange(); return; }
      try { const pv = g.s; g.s = P.apply(g.s, a); track(pv, g.s, a, a.by != null ? a.by : pv.turn); } catch (e) { // board changed under it (bending) — finish the turn sensibly
        if (!g.s.tp.mainDone) { const re = AI.chooseTurn(g.s, g.seats[g.s.turn].level).find((x) => x.t === 'move' || x.t === 'plant'); if (re) { try { g.s = P.apply(g.s, re); } catch (e2) {} } }
        break;
      }
      renderGame(); await sleep(420);
    }
    if (G !== g) return;
    try { g.s = P.apply(g.s, { t: 'end' }); } catch (e) {}
    if (G !== g) return;
    g.busy = false;
    renderGame(); afterTurnChange();
  }
  async function gameOver() {
    renderGame();
    if (G.tutorial) return tutDone();
    const s = G.s;
    if (!G.recorded) {
      G.recorded = true;
      const turns = s.turnNo - 1;
      const ring = s.winReason === 'harmony ring';
      for (const k of [0, 1]) {
        const seat = G.seats[k];
        if (seat.kind !== 'human' || !seat.pid) continue;
        const res = s.winner === 'draw' ? 'd' : s.winner === k ? 'w' : 'l';
        const mode = G.mode === 'ai' ? 'ai' : G.mode;
        const trk = Object.assign({}, (s.trk || {})[k] || {}); if (k === G.my && G.trkB) trk.b = (trk.b || 0) + G.trkB;
        trk.safe = Math.max(0, 3 - (s.removed || []).filter((x) => x.owner === k).length);
        const myTurns = new Set((s.log || []).filter((l) => l.p === k).map((l) => l.turn)).size;
        const out = await recordResult(seat.pid, mode, G.seats[1 - k].level, res, G.seats[1 - k].name, turns, ring, G.seats[1 - k].pid, trk, myTurns);
        if (out && (G.mode !== 'local' || k === 0)) G.reward = out;
      }
      if (G.mode === 'online' && !G.s.opts.subPractice) updateAvatar();
      if (me) { const before = new Set(Object.keys(me.ach || {})); await checkAch(); G.newAch = Eco.ACH.filter((a) => (me.ach || {})[a.id] && !before.has(a.id)); }
    }
    showResult();
  }
  function showResult() {
    const s = G.s, R = G.reward, H = P.harmonies(s);
    let head;
    if (s.winner === 'draw') head = 'Draw';
    else if (G.mode === 'local') head = esc(G.seats[s.winner].name) + ' wins!';
    else head = s.winner === G.my ? 'You win! 🎉' : esc(G.seats[s.winner].name) + ' wins';
    const why = s.winner === 'draw' ? (s.winReason === 'turn limit' ? 'The game reached the turn limit.' : 'It’s a tie.') : 'By ' + esc(s.winReason) + ' after ' + (s.turnNo - 1) + ' turns.';
    const row = (k) => { const seat = G.seats[k], res = s.winner === 'draw' ? ['🤝', 'Draw', 'draw'] : s.winner === k ? ['🏆', 'Winner', 'win'] : ['🌧️', 'Lost', 'loss'];
      return `<div class="res-row ${res[2]}"><span class="rr-i">${res[0]}</span><div class="rr-m"><b>${esc(seat.name)}${G.my === k ? ' (you)' : ''}</b><span class="tiny muted">${H.filter((h) => h.owners.includes(k)).length} harmonies · ${(s.removed || []).filter((t) => t.owner === k).length} tiles lost</span></div><span class="rr-r">${res[1]}</span></div>`; };
    const rew = R && (R.gp || R.ranked || R.xp) ? `<div class="card res-rew">${R.gp ? `<span style="color:#ffd77a">🪙 +${R.gp} gp</span>` : ''}${R.xp ? `<span style="color:#9fd1ff">✨ +${R.xp} XP</span>` : ''}${R.ranked ? `<span>⭐ ${R.rating} (${R.delta >= 0 ? '+' : ''}${R.delta})</span>` : ''}</div>
      ${R.boost && (R.gp || R.xp) ? `<div class="tiny" style="margin:-4px 0 8px;color:#ffd77a">${R.boost.icon} ${R.boost.name}: ${R.boost.xp}× XP · ${R.boost.gp}× gold</div>` : ''}
      ${R.melon ? '<div class="note" style="margin-bottom:8px">🍈 Blind-move bonus included: +50 gp, +50 XP</div>' : ''}
      ${R.subUnlocked ? '<div class="note" style="margin-bottom:8px">🌀 <b>Sub-bending unlocked!</b></div>' : R.levelUp ? `<div class="note" style="margin-bottom:8px">⬆️ <b>Level up!</b> You’re now Level ${Eco.level(R.xpAfter || 0, me && me.surpass)}.${me && Eco.titleOf(me, Eco.level(R.xpAfter || 0, me.surpass)) !== Eco.titleOf(me, Eco.level(R.xpBefore || 0, me.surpass)) ? ` New title: <b>${esc(Eco.titleOf(me, Eco.level(R.xpAfter || 0, me.surpass)))}</b>!` : ''}</div>` : ''}
      ${R.style ? `<div class="tiny" style="margin:0 0 8px">Your style this game: <b style="color:${Eco.STYLES[R.style].color}">${Eco.STYLES[R.style].icon} ${Eco.STYLES[R.style].name}</b> (${Eco.STYLES[R.style].tag})</div>` : ''}
      ${R.fastest ? `<div class="note" style="margin-bottom:8px">⚡ New record! Fastest win${R.fastestKey === 'fastestAi' ? ' vs the computer' : ''}: <b>${R.fastest} moves</b></div>` : ''}
      ${R.xpAfter != null ? lvlBar(R.xpAfter, R.xpBefore) : ''}` : G.mode === 'local' ? '<div class="tiny muted" style="margin-bottom:10px">Pass &amp; play games don’t pay gold. Play the computer or online to earn.</div>' : '';
    const prNote = R && R.practice ? '<div class="tiny muted" style="margin:-4px 0 8px">🎓 Sub-bending practice: doesn’t count toward your record or rank.</div>' : '';
    const na = G.newAch || [];
    const achH = na.length ? `<div class="field" style="text-align:left"><label>🏆 Achievements unlocked (${na.length})</label><div class="ach-chips">${na.slice(0, 8).map((a) => `<span class="chip">${a.icon || '🏆'} ${esc(a.name)} <b style="color:#ffd77a">+${a.gp}</b></span>`).join('')}${na.length > 8 ? `<span class="chip">+${na.length - 8} more</span>` : ''}</div></div>` : '';
    sheet(`<div style="text-align:center">${logoSvg(70)}<h3 style="font-size:28px;margin:4px 0">${head}</h3><p class="muted" style="margin:0 0 10px">${why}</p>
      <div class="res-rows">${row(0)}${row(1)}</div>${rew}${prNote}${achH}
      <div class="menu">${G.mode !== 'online' ? '<button class="btn primary" data-act="rematch">Play again</button>' : ''}<button class="btn" data-act="closeSheet">Look at the board</button><button class="btn" data-act="leaveGame">Home</button></div></div>`);
    animateBars();
  }

  // ---------- event delegation ----------
  const actions = {
    go: (d) => go(d.to),
    choose: (d) => closeSheet(+d.k),
    closeSheet: () => closeSheet(),
    toc: (d, e) => { e.preventDefault(); const el = document.getElementById(d.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    pickProfile: async (d) => { const p = await Store.get('players', d.id); if (!p) return toast('Player not found'); loginFlow(p, (pp) => { Soc().stop(); FireSocial.stop(); TurnAlerts.stop(); me = pp; rememberProfile(pp.id); askKeep(pp); }); },
    newProfile: () => go('newProfile'),
    guestPlay: () => { me = null; Store.LS.set('session', null); go('home'); },
    sw: (d, e, el) => el.classList.toggle('on'),
    swSet: (d, e, el) => { setup[d.k] = setup[d.k] === undefined && d.k === 'hints' ? false : !setup[d.k]; el.classList.toggle('on', !!setup[d.k]); Store.LS.set('setup', Object.assign(Store.LS.get('setup', {}), { [d.k]: setup[d.k] })); },
    profileSheet: async () => {
      if (!me) return sheet(`<h3>Guest</h3><p class="muted">Guests don’t get stats.</p><div class="menu"><button class="btn" data-act="editProfile">Change display name</button><button class="btn primary" data-act="toLogin">Sign in or create a player</button></div>`);
      const bio = await Auth.bioAvailable();
      sheet(`<div style="margin-bottom:12px">${Avatars.card(meCard(), esc, { big: true, code: Soc().code ? Soc().code : '' })}</div><div class="menu">
        <button class="btn primary" data-act="go" data-to="character">🧍 Edit character</button>
        <button class="btn" data-act="editProfile">Edit profile</button>
        ${Store.kind === 'firebase' ? `<button class="btn" data-act="alertsToggle">${TurnAlerts.enabled() ? '🔔 Turn alerts are on · run a test' : '🔔 Turn on turn alerts'}</button>` : ''}
        <button class="btn" data-act="go" data-to="stats">Stats</button>
        ${bio ? `<button class="btn" data-act="bioToggle">${me.cred ? 'Turn off biometric unlock' : 'Turn on biometric unlock'}</button>` : '<div class="tiny muted">Biometric unlock isn’t available in this browser — your PIN works everywhere.</div>'}
        <button class="btn" data-act="changePin">Change PIN</button>
        <button class="btn" data-act="signOut">Sign out</button>
        <button class="btn danger" data-act="deleteMe">Delete this player</button></div>`);
    },
    toLogin: () => go('login'),
    googleSignIn: async () => {
      let g;
      try { g = await FB.googleSignIn(); } catch (e) { console.warn(e); return toast(e && e.code === 'auth/unauthorized-domain' ? 'Google sign-in isn’t enabled for this site yet' : 'Google sign-in failed — try again'); }
      if (!g || g === 'redirect') return;
      googleContinue(g);
    },
    tutNext: () => { const T = G && G.tutorial; if (!T) return; T.step = T.step === 'intro' ? 'harm' : 'plant'; renderGame(); },
    tutSkip: () => { tutFinishFlag(); Music.stop(); G = null; closeSheet(); go('home'); },
    tutHome: () => { closeSheet(); Music.stop(); G = null; go('home'); },
    tutVsAI: () => { closeSheet(); G = null; setup.mode = 'ai'; setup.level = 'easy'; setup.first = 'me'; startLocal('ai'); },
    startTutorial: () => startTutorial(),
    dailyOpen: () => dailyOpen(),
    metalMode: (d) => { if (!G.metal) return; G.metal.mode = d.k; G.metal.pick = null; renderBoard(); renderMetalPanel(); },
    metalDone: () => G.metal && G.metal.ops.length && metalSend(),
    metalCancel: () => metalCancel(),
    gustGo: () => { const s2 = G.s, tiles = P.metalPairs(s2); if (!tiles.length) return toast('No tiles to push'); G.sel = { kind: 'gust', tiles, target: null }; renderBoard(); toast('🌬️ Tap a tile, then where the wind pushes it'); },
    avState: (d) => avatarStateAnswer(d.v === '1'),
    newsStore: () => { closeSheet(); go('store'); },
    dailyClaim: () => dailyClaim(),
    viewPlayer: (d, e) => { if (e && e.target.closest('[data-act="addFriendPid"]') && e.target.closest('[data-act="addFriendPid"]') !== e.target.closest('[data-act]')) return; viewPlayer(d); },
    addFriendPid: async (d, e) => {
      if (e) e.stopPropagation();
      if (!me) return toast('Create a player first');
      if (!FireSocial.active) await FireSocial.start({ pid: me.id, name: me.name, avatar: me.avatar }).catch(() => {});
      const err = await FireSocial.addPid(d.pid);
      if (err) return toast(err);
      toast('Friend request sent 🤝'); closeSheet();
      if (document.getElementById('friends-screen')) { const v = (document.getElementById('fsearch') || {}).value; screens.friends(); const f = document.getElementById('fsearch'); if (f && v) { f.value = v; f.dispatchEvent(new Event('input')); } }
    },
    achTrack: (d) => { achOpen = achOpen === d.k ? null : d.k; const y = window.scrollY; if (document.querySelector('[data-act="statsTab"]')) screens.stats(); else screens.achievements(); setTimeout(() => window.scrollTo(0, y), 0); },
    statsTab: (d) => { statsTab = d.k; screens.stats(); },
    findProfile: () => {
      sheet(`<h3>Sign in</h3><form id="fpf" class="menu"><div class="field"><label>Player name</label><input class="input" id="fp-name" maxlength="18" autocomplete="username"></div><button class="btn primary" type="submit">Next</button></form>`);
      document.getElementById('fpf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const n = document.getElementById('fp-name').value.trim().toLowerCase(); if (!n) return;
        const p = (await players()).find((x) => x.name.toLowerCase() === n);
        if (!p) return toast('No player with that name');
        closeSheet();
        loginFlow(p, (pp) => { me = pp; rememberProfile(pp.id); askKeep(pp); });
      });
    },
    alertsToggle: async () => {
      closeSheet();
      if (TurnAlerts.enabled()) return notifTest();
      const r = await TurnAlerts.enable();
      toast(r === 'granted' ? 'Turn alerts on' : r === 'unsupported' ? 'This browser can’t show notifications — install the app to your home screen first' : 'Notifications are blocked — allow them in your browser settings');
      if (r === 'granted') TurnAlerts.notify('Pai Sho', 'Turn alerts are on. You’ll get one when it’s your move.', 'test');
    },
    editProfile: () => {
      const cur = myName();
      let hue = me && me.hue != null ? me.hue : hueOf(cur);
      let pickedAv = myAvatar() || 'whitelotus';
      sheet(`<h3>${me ? 'Edit profile' : 'Display name'}</h3><form id="epf" class="menu">
        <div class="field"><label>Display name</label><input class="input" id="ep-name" maxlength="18" value="${esc(cur)}"><div class="tiny name-hint" id="ep-hint"></div></div>
        ${me ? `<div class="field"><label>Nation</label><div class="nat-pick" id="ep-nat">${Object.entries(Eco.NATIONS).map(([k, n]) => `<button type="button" class="nat ${me.nation === k ? 'on' : ''}" data-nat="${k}">${Avatars.svg(n.icon, 36)}<b style="color:${n.color}">${n.name}</b></button>`).join('')}</div><div class="tiny muted">${me.nation ? 'Switching nations costs 300 gp.' : 'Pick your nation for free.'}</div></div>` : ''}
        <div class="field"><label>Avatar</label><div id="ep-av">${Avatars.picker(pickedAv, avLock(me))}</div></div>
        <div class="tiny muted">${me ? 'Your stats, record, PIN and friend code stay the same. Friends see your new name and avatar next time you connect.' : 'Guests don’t keep stats.'}</div>
        <button class="btn primary" type="submit">Save</button></form>`);
      bindPicker(document.getElementById('ep-av'), (id) => (pickedAv = id));
      if (me) liveNameCheck('ep-name', 'ep-hint', me.id);
      let pickedNat = me ? me.nation : null;
      const epn = document.getElementById('ep-nat');
      if (epn) epn.addEventListener('click', (e) => { const b = e.target.closest('[data-nat]'); if (!b) return; pickedNat = b.dataset.nat; epn.querySelectorAll('.nat').forEach((x) => x.classList.toggle('on', x === b)); });
      document.getElementById('epf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('ep-name').value.trim().replace(/\s+/g, ' ');
        if (!name) return toast('Enter a name');
        if (!me) { Store.LS.set('guestName', name); Store.LS.set('guestAvatar', pickedAv); avs[name] = pickedAv; closeSheet(); Soc().stop(); return go('home'); }
        const renamed = name !== me.name;
        if (renamed && !(await claimName(name, me.id))) return toast(TAKEN);
        if (renamed && normName(name) !== normName(me.name)) releaseName(me.name, me.id);
        if (pickedNat && pickedNat !== me.nation) {
          if (me.nation) {
            ensureMe();
            const ok = await choose('Switch to ' + Eco.NATIONS[pickedNat].name + '?', [{ label: 'Start over as ' + Eco.NATIONS[pickedNat].name, value: true, cls: 'primary' }], `⚠️ Switching nations starts you over from scratch. Your level, titles, reincarnations, record, achievements, character and purchases all reset. Only your gold (${gpFmt(me.gp || 0)}) stays.`);
            if (!ok) return;
            const keep = ['id', 'name', 'hue', 'avatar', 'pin', 'pinHash', 'salt', 'uids', 'gUid', 'gEmail', 'cred', 'fcode', 'friends', 'friendBy', 'gp', 'gBonus', 'created', 'createdAt', 'v', 'melonUses'];
            const gone = Object.keys(me).filter((k) => !keep.includes(k));
            if (Store.kind === 'firebase') { const D = firebase.firestore.FieldValue.delete(); try { await FB.col('players').doc(me.id).update(Object.fromEntries(gone.map((k) => [k, D]))); } catch (err) { return toast('Couldn’t switch nations — try again'); } }
            gone.forEach((k) => delete me[k]);
            me.xp = 0; me.stats = { v2: true, fastFix: true }; me.ach = {}; me.owned = {}; me.fig = null; me.xpFix1 = true;
          }
          me.nation = pickedNat; Eco.ensure(me);
        }
        const prev = me.name;
        me.name = name; me.hue = hue; me.avatar = pickedAv; delete hues[prev]; delete avs[prev]; noteHue(me);
        try { await Store.set('players', me.id, me); } catch (err) { me.name = prev; return toast('Couldn’t save — try again'); }
        Soc().stop(); FireSocial.stop();
        closeSheet(); toast('Profile saved'); go('home');
      });
    },
    signOut: () => { FB.signOutGoogle && Store.kind === 'firebase' && FB.signOutGoogle(); Soc().stop(); FireSocial.stop(); TurnAlerts.stop(); me = null; Store.LS.set('session', null); go('login'); },
    bioToggle: async () => {
      closeSheet();
      if (me.cred) me.cred = null;
      else { try { me.cred = await Auth.bioRegister(me); } catch (e) { return toast('Biometric setup didn’t work here — PIN still works'); } }
      await Store.set('players', me.id, me); toast(me.cred ? 'Biometric unlock on' : 'Biometric unlock off');
    },
    changePin: () => {
      closeSheet();
      sheet(`<h3>Change PIN</h3><form id="cpf" class="menu"><input class="input" id="cp1" type="password" inputmode="numeric" maxlength="6" placeholder="New PIN (4–6 digits)"><input class="input" id="cp2" type="password" inputmode="numeric" maxlength="6" placeholder="Confirm"><button class="btn primary" type="submit">Save</button></form>`);
      document.getElementById('cpf').addEventListener('submit', async (e) => {
        e.preventDefault(); const a = document.getElementById('cp1').value, b = document.getElementById('cp2').value;
        if (!/^\d{4,6}$/.test(a) || a !== b) return toast('PINs must match and be 4–6 digits');
        const salt = Auth.rid(10), h = await Auth.hash(a, salt);
        if (Store.kind === 'firebase') {
          try { if (await FB.savePin(me.id, salt, h)) { me.salt = salt; delete me.pin; } else { await FB.savePinPublic(me.id, salt, h); me.salt = salt; me.pin = h; } }
          catch (err) { return toast('Couldn’t save — try again'); }
        } else { me.salt = salt; me.pin = h; await Store.set('players', me.id, me); }
        closeSheet(); toast('PIN updated');
      });
    },
    deleteMe: async () => { if (await confirmBox('Delete player?', 'This removes ' + me.name + ' and their stats for good.', 'Delete', true)) { if (Store.kind === 'firebase') await FB.dropPin(me.id); await Store.del('players', me.id); me = null; Store.LS.set('session', null); go('login'); } },
    startSetup: (d) => { setup.mode = d.mode; setup.fxTab = 0; setup.fx[0] = equipped().fx.slice(); go('setup'); },
    seg: (d) => { setup[d.k] = isNaN(+d.v) ? d.v : +d.v; rerenderSetup(); },
    fxTab: (d) => { setup.fxTab = +d.v; rerenderSetup(); },
    fx: (d) => {
      const k = setup.mode === 'local' && document.querySelector('[data-act="fxTab"]') ? setup.fxTab : 0;
      const arr = setup.fx[k]; const i = arr.indexOf(d.t);
      if (i >= 0) arr.splice(i, 1); else if (arr.length < 6) arr.push(d.t); else return toast('Up to 6 effect tiles');
      rerenderSetup();
    },
    fxPreset: (d) => {
      const k = setup.mode === 'local' && document.querySelector('[data-act="fxTab"]') ? setup.fxTab : 0;
      const prof = k === 1 ? (setup.p2.prof || null) : me;
      const owned = P.EFFECT_TYPES.filter((t) => Eco.ownsTile(prof, t));
      setup.fx[k] = d.v === 'none' ? [] : d.v === 'flowers' ? Object.keys(P.SPECIAL).filter((t) => owned.includes(t)) : owned.sort(() => Math.random() - 0.5).slice(0, 6);
      rerenderSetup();
    },
    pickP2: async () => {
      const list = (await players()).filter((p) => !me || p.id !== me.id);
      const v = await choose('Player 2', [{ label: 'Guest (type a name)', value: '__guest' }].concat(list.map((p) => ({ label: av(p.name) + ' ' + esc(p.name), value: p.id }))));
      if (!v) return;
      if (v === '__guest') {
        sheet(`<h3>Player 2 name</h3><form id="p2f" class="menu"><input class="input" id="p2n" maxlength="18" value="${esc(setup.p2.pid ? 'Player 2' : setup.p2.name)}"><button class="btn primary" type="submit">OK</button></form>`);
        document.getElementById('p2f').addEventListener('submit', (e) => { e.preventDefault(); setup.p2 = { name: document.getElementById('p2n').value.trim() || 'Player 2', pid: null }; closeSheet(); go('setup'); });
      } else {
        const p = await Store.get('players', v);
        loginFlow(p, (pp) => { Eco.ensure(pp); setup.p2 = { name: pp.name, pid: pp.id, avatar: pp.avatar, prof: pp }; const lo = Array.isArray(pp.loadouts) && pp.loadouts[pp.activeLoadout | 0]; setup.fx[1] = lo ? (lo.fx || []).filter((t) => Eco.ownsTile(pp, t)).slice(0, 6) : []; go('setup'); }, 'setup');
      }
    },
    beginGame: () => startLocal(setup.mode),
    joinCode: () => joinGame(document.getElementById('joincode').value),
    joinGame: (d) => joinGame(d.code),
    resumeOnline: async (d) => { const g = await Store.get('games', d.code); if (!g) return; if (Store.p2p() && g.status === 'open') P2P.host(d.code); if (g.status === 'open') waitOnline(d.code); else startOnline(g); },
    createOnline: () => createOnline(),
    cancelOnline: async (d) => { if (G && G.waitingUnsub) G.waitingUnsub(); const g = await Store.get('games', d.code).catch(() => null); if (g && g.status === 'open') await Store.del('games', d.code).catch(() => {}); go('lobby'); },
    copyCode: async (d) => { try { await navigator.clipboard.writeText(d.code); toast('Copied'); } catch (e) { toast('Code: ' + d.code); } },
    trayTap: (d) => trayTap(d.t),
    chatOpen: () => {
      G.unread = 0; renderChatBtn();
      sheet(`<h3>Chat</h3><div class="chat-log" id="chat-log"></div>
        <div class="row wrap" style="margin:8px 0">${['Good luck!', 'Nice move', 'Hmm…', 'GG'].concat(G.s.bend && P.melonLeft(G.s, G.my != null ? G.my : G.s.turn) > 0 ? ['MELON LORD! 🍈'] : []).map((q) => `<button class="btn small" data-act="chatQuick" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
        <form id="chatf" class="row"><input class="input" id="chat-in" maxlength="140" placeholder="Message…" autocomplete="off"><button class="btn primary" type="submit">Send</button></form>`);
      renderChatLog();
      document.getElementById('chatf').addEventListener('submit', (e) => { e.preventDefault(); const i = document.getElementById('chat-in'); sendChat(i.value); i.value = ''; });
    },
    chatQuick: (d) => { sendChat(d.q); },
    bendMenu: () => {
      if (!G || !G.s.bend) return;
      const s = G.s, seat = bendSeat(), pw = (s.opts.powers || [])[seat] || {};
      const els = pw.avatar || pw.allEl ? ['fire', 'water', 'earth', 'air'] : [pw.nation];
      const used = s.bend.used[seat], cost = P.bendCost(s, seat), free = pw.avatar || P.hasHarmony(s, seat);
      const costTxt = free ? '<span style="color:#9fd18b">Free right now</span> (you ' + (pw.avatar ? 'are the Avatar' : 'have a harmony') + ')' : cost ? `Costs your <b>${P.tname(cost.type)}</b>` : '<span style="color:#e08a6a">You need an effect tile to give up</span>';
      const subs = P.subAvailable(s, seat), usedSubs = s.bend.subs[seat];
      const xp = (me && me.xp) || 0;
      sheet(`<h3>${pw.avatar ? '☯️ Avatar bending' : Eco.BEND[pw.nation].icon + ' ' + Eco.NATIONS[pw.nation].name + 'bending'}</h3>
        <p class="muted tiny">Bend at any time, even on their turn. It never uses up your move.</p>
        <div class="card"><b>Main bending</b> <span class="tiny muted">· once per game</span>
          ${used ? '<p class="muted">Already used this game.</p>' : `<p class="tiny">${costTxt}</p><div class="menu">${els.map((el) => `<button class="btn" data-act="bendGo" data-el="${el}" ${!free && !cost ? 'disabled' : ''}>${Eco.BEND[el].icon} ${Eco.BEND[el].verb}<small style="font-weight:400;margin-left:6px" class="muted">${Eco.BEND[el].desc}</small></button>`).join('')}</div>`}</div>
        <div class="card" style="margin-top:10px"><b>Sub-bending</b> <span class="tiny muted">· ${pw.avatar ? 'any two per game' : 'once per game'}</span>
          ${subs.length ? `<div class="menu" style="margin-top:8px">${subs.map((k) => `<button class="btn" data-act="subGo" data-k="${k}">${Eco.SUBS[k].icon} ${Eco.SUBS[k].name}<small style="font-weight:400;margin-left:6px" class="muted">${Eco.SUBS[k].desc}</small></button>`).join('')}</div>` : usedSubs.length ? '<p class="muted">Used this game.</p>' : `<p class="muted tiny">Unlocks at Level ${Eco.SUB_LEVEL}${me ? ` — you’re Level ${Eco.level(xp)}` : ''}. ${pw.avatar ? 'The Avatar can use any two.' : Eco.SUBS[Eco.SUB_OF[pw.nation]].name + ': ' + Eco.SUBS[Eco.SUB_OF[pw.nation]].desc}</p>`}</div>
        <div class="card" style="margin-top:10px"><b>Show off</b> <span class="tiny muted">· free, cosmetic, as often as you like</span><p class="tiny muted">Cover their board in your element while they think. +5 XP each in online games (up to 300 a match).</p>
          <div class="row wrap">${els.map((el) => `<button class="btn small" data-act="spamGo" data-el="${el}">${Eco.BEND[el].icon} ${{ fire: 'Flames', water: 'Waves', earth: 'Quake', air: 'Gust' }[el]}</button>`).join('')}</div></div>`);
    },
    bendGo: (d) => { if (G.sel && G.sel.kind === 'bend' && G.sel.el === d.el) { G.sel = null; renderBoard(); renderBendBar(); return; } startBendSel(d.el); renderBendBar(); },
    subGo: (d) => startSub(d.k),
    spamGo: (d) => spamBend(d.el),
    yipYip: async () => {
      if (!G || G.mode !== 'online' || isHumanTurn()) return;
      const last = Math.max((G.doc && G.doc.nudge && G.doc.nudge.seat === G.my && G.doc.nudge.t) || 0, G.lastYip || 0, (Store.LS.get('yip', {})[G.code]) || 0);
      const wait = 60000 - (Date.now() - last);
      if (wait > 0) return toast(`You can yip again in ${Math.ceil(wait / 1000)}s`);
      G.lastYip = Date.now(); const yl = Store.LS.get('yip', {}); yl[G.code] = G.lastYip; Store.LS.set('yip', yl);
      try { await Store.patch('games', G.code, { nudge: { seat: G.my, t: Date.now() } }); toast('📣 Yip yip! ' + G.seats[1 - G.my].name + ' has been nudged'); buzz(20); bump('nudgesSent'); Push.send(G.seats[1 - G.my].pid, '📣 Yip yip!', `${G.seats[G.my].name} is waiting for your move (game ${G.code})`, 'n-' + G.code); }
      catch (e) { toast('Couldn’t send the nudge'); }
    },
    storeTab: (d) => { storeTab = d.k; screens.store(); },
    buyItem: async (d) => {
      const price = d.kind === 'tiles' ? Eco.TILE_PRICE[d.id] : d.kind === 'avatars' ? (Avatars.price(d.id) || Eco.AVATAR_PRICE) : d.kind === 'emotes' ? Eco.EMO[d.id].price : Eco.BOARDS[d.id].price;
      const label = d.kind === 'tiles' ? P.tname(d.id) : d.kind === 'avatars' ? Avatars.label(d.id) + ' picture' : d.kind === 'emotes' ? '“' + Eco.EMO[d.id].t + '” emote' : Eco.BOARDS[d.id].name + ' board';
      const y = window.scrollY;
      if (await buy(d.kind, d.id, price, label)) { if (d.kind === 'boards') { me.board = d.id; await saveMe(); } screens.store(); window.scrollTo(0, y); }
    },
    equipAvatar: async (d) => { me.avatar = d.id; noteHue(me); await saveMe(); const y = window.scrollY; screens.store(); window.scrollTo(0, y); },
    equipBoard: async (d) => { me.board = d.id; await saveMe(); const y = window.scrollY; screens.store(); window.scrollTo(0, y); },
    lockedTile: async (d) => {
      if (d.mine !== '1') return toast('Player 2 hasn’t unlocked that tile');
      if (await buy('tiles', d.t, Eco.TILE_PRICE[d.t], P.tname(d.t))) { if (document.getElementById('lo-name')) screens.loadouts(); else rerenderSetup(); }
    },
    emotePicker: () => {
      const av = amAvatar();
      sheet(`<h3>Emotes</h3><div class="emo-grid">${Eco.EMOTES.map((x) => { const un = Eco.emoteUnlocked(me, x.id, av); return `<button class="emo ${un ? '' : 'locked'}" data-act="${un ? 'sendEmote' : 'lockedEmote'}" data-id="${x.id}"><span class="e">${x.e}</span><span class="t">${esc(x.t)}</span></button>`; }).join('')}</div><div class="tiny muted" style="margin-top:8px">Locked emotes come from other nations, the Avatar title, or the Store.</div>`);
    },
    sendEmote: (d) => { closeSheet(); sendEmote(d.id); },
    lockedEmote: (d) => { const x = Eco.EMO[d.id]; toast(x.kind === 'store' ? 'Unlock it in the Store' : x.kind === 'avatar' ? 'Only the Avatar can use this one' : 'A ' + Eco.NATIONS[x.kind].name + ' Nation emote (the Avatar gets them all)'); },
    loTab: (d) => { loTab = +d.i; screens.loadouts(); },
    loEquip: () => { const L = getLoadouts(); saveLoadouts(L.list, loTab); toast('Equipped ' + L.list[loTab].name); screens.loadouts(); },
    loFx: (d) => { const L = getLoadouts(); const arr = L.list[loTab].fx; const i = arr.indexOf(d.t); if (i >= 0) arr.splice(i, 1); else if (arr.length < 6) arr.push(d.t); else return toast('Up to 6 effect tiles'); saveLoadouts(L.list, L.active); const y = window.scrollY; screens.loadouts(); window.scrollTo(0, y); },
    loPreset: (d) => { const L = getLoadouts(); const owned = P.EFFECT_TYPES.filter((t) => Eco.ownsTile(me, t)); L.list[loTab].fx = d.v === 'none' ? [] : d.v === 'flowers' ? Object.keys(P.SPECIAL).filter((t) => owned.includes(t)) : owned.sort(() => Math.random() - 0.5).slice(0, 6); saveLoadouts(L.list, L.active); screens.loadouts(); },
    useLoadout: (d) => { setup.fx[0] = getLoadouts().list[+d.i].fx.slice(); rerenderSetup(); },
    figTab: (d) => { figTab = d.k; screens.character(); },
    figAv: (d, e, el) => { figAv = el.checked; screens.character(); },
    figSet: async (d) => {
      if (!me || !me.fig) return;
      const kind = d.k === 'outfit' ? 'outfit' : d.k === 'hair' ? 'hair' : d.k === 'acc' ? 'acc' : null;
      if (kind && !Figure.owns(me, kind, d.v)) {
        const pr = Figure.priceOf(kind, d.v, me.nation), nm = kind === 'outfit' ? Figure.OUTFITS[d.v].name : kind === 'hair' ? Figure.HAIRSTYLES[d.v].name + ' hair' : Figure.ACCESSORIES[d.v].name;
        if (!(await buy('fig', kind + ':' + d.v, pr, nm))) return;
      }
      me.fig[d.k] = d.v; saveMe(); screens.character();
    },
    reincarnate: () => reincarnate(),
    boardPreview: (d) => boardPreviewSheet(d.id),
    buyWalker: async () => {
      if (!me || !me.pastLife) return toast('Only an Avatar who became a past life can walk this path');
      if (Eco.ownsBoard(me, 'spiritWalker')) return;
      await syncCounters();
      const all = me.gp || 0;
      const ok = await choose('Become a Spirit Walker?', [{ label: `🪙 Give up all ${gpFmt(all)}`, value: true, cls: 'primary' }], `To prove you’re in tune with the Spirit Realm, you give up every worldly thing: all of your gold (${gpFmt(all)}), no more and no less. You keep the Spirit Walker board forever.`);
      if (!ok) return;
      ensureMe(); me.gp = 0; me.owned.boards = [...new Set(me.owned.boards.concat(['spiritWalker']))]; me.board = 'spiritWalker';
      await saveMe(); toast('🌈 You are a Spirit Walker.', 4000); screens.store();
    },
    spectate: (d) => spectate(d.code),
    spiritHint: () => spiritHint(),
    spiritEl: (d) => {
      if (!G || G.mode !== 'spectate') return;
      if (G.sel && G.sel.kind === 'bend' && G.sel.el === d.el) { G.sel = null; renderBoard(); return renderSpiritBar(); }
      const t = []; for (let i = 0; i < 324; i++) if (G.s.board[i]) t.push(i);
      if (!t.length) return toast('No tiles on the board yet');
      G.sel = { kind: 'bend', el: d.el, targets: t, spirit: true }; renderBoard(); renderSpiritBar();
      toast(`👻 Tap any tile to ${Eco.BEND[d.el].verb.toLowerCase()} it`);
    },
    duelCreate: () => duelCreate(),
    duelPractice: () => duelPractice(),
    duelJoinCode: () => joinGame((document.getElementById('duelcode') || {}).value),
    duelMove: (d) => duelMove(d.k, d.el),
    duelUlt: (d) => duelUlt(d.k),
    duelCounter: (d) => duelCounter(d.k),
    duelQuit: () => duelQuit(),
    duelInvite: async (d) => { await Soc().invite(d.code, d.game, 'fight'); toast('Challenge sent!'); },
    duelCancel: async (d) => { duelEnd(); await Store.del('games', d.code).catch(() => {}); go('duel'); },
    finalChoice: () => finalChoice(),
    infoTab: (d) => { G.infoTab = d.k; G.infoPinned = true; renderInfo(null); },
    showSug: () => {
      if (!G || !G.ana || !G.ana.sug || G.ana.s !== G.s) return;
      const a = G.ana.sug.a;
      if (a.t === 'plant') G.sel = { kind: 'plant', type: a.type, moves: acts.filter((x) => x.t === 'plant' && x.type === a.type) };
      else { const k = srcOf(a); const ms = acts.filter((x) => x.t === 'move' && srcOf(x) === k && (x.mover || '') === (a.mover || '')); const tile = a.from.kind === 'gate' ? G.s.gates[a.from.g] : a.from.kind === 'center' ? G.s.center.tile : G.s.board[a.from.i].top; G.sel = { kind: 'tile', moves: ms, tileId: tile && tile.id }; }
      renderBoard(); renderStatus(); renderTray(); renderInfo(null);
    },
    tileDetails: (d) => {
      const t = d.t, o = +d.o, inf = Guide.INFO[t];
      let live = '';
      if (G && P.isFlower(t)) {
        const H = P.harmonies(G.s); const mine = [];
        for (let i = 0; i < 324; i++) { const c = G.s.board[i]; if (c && c.top.type === t && c.top.owner === o) H.forEach((h) => { if (h.a === i || h.b === i) { const j = h.a === i ? h.b : h.a; mine.push(`${P.tname(G.s.board[j].top.type)} at ${P.sqName(j)}`); } }); }
        if (mine.length) live = `<div class="note" style="margin:8px 0">Right now your ${P.tname(t)}s are harmonizing with: ${[...new Set(mine)].map(esc).join(', ')}.</div>`;
      }
      sheet(`<div class="row" style="gap:12px">${Glyphs.svg(t, o, 'style="width:56px;height:56px"')}<div><h3 style="margin:0">${P.tname(t)}</h3><div class="muted tiny">${inf[0]} · moves ${inf[2]}</div></div></div>
        <p>${inf[1]}</p><h3 style="font-size:16px">Harmony</h3><p class="muted">${Guide.harmonySummary(t)}</p>${live}${Guide.partnerHTML(t, o)}`);
    },
    addFriend: async () => { const err = await Soc().add(document.getElementById('addcode').value); if (err) toast(err); else { toast('Request sent'); screens.friends(); } },
    acceptFriend: async (d) => { await Soc().accept(d.code); screens.friends(); },
    declineFriend: async (d) => { await Soc().decline(d.code); screens.friends(); },
    removeFriend: async (d) => { if (await confirmBox('Remove friend?', 'You can add them again with their code.', 'Remove', true)) { await Soc().remove(d.code); screens.friends(); } },
    inviteFriend: (d) => { const f = Soc().friends().find((x) => x.code === d.code); invPick = { code: d.code, name: d.name || 'your friend', on: !!d.on, pid: f && f.pid }; inviteSheet(); },
    dmOpen: (d) => { closeSheet(); if (G && G.waitingUnsub) { G.waitingUnsub(); G = null; } go('dm', d.pid, d.name); },
    dmBack: () => go('messages'),
    invOpt: (d) => { const S = setup; if (d.k === 'minH' || d.k === 'timer') S[d.k] = +d.v; else if (d.k === 'rules') S.rules = d.v; else S[d.k] = !S[d.k]; Store.LS.set('setup', Object.assign(Store.LS.get('setup', {}), { [d.k]: S[d.k] })); inviteSheet(); },
    invSend: async () => { const d = invPick; if (!d) return; closeSheet(); const code = await createOnline(d.name); if (code) { await Soc().invite(d.code, code); toast(d.on ? 'Invite sent' : 'Invite sent — they’ll get it next time they’re on'); } },
    leaveWaiting: () => { if (G && G.waitingUnsub) G.waitingUnsub(); G = null; toast('Game kept open — we’ll let you know when they join'); go('home'); },
    acceptInvite: async (d) => { FireSocial.dismissInvite(d.id); const g = await Store.get('games', d.game).catch(() => null); if (!g || g.status !== 'open') { toast('That game isn’t open anymore'); if (document.getElementById('friends-screen')) screens.friends(); return; } joinGame(d.game); },
    declineInvite: async (d) => { await FireSocial.dismissInvite(d.id); toast('Invite declined'); if (document.getElementById('friends-screen')) screens.friends(); },
    undo: () => {
      if (!canUndo()) return;
      G.s = G.history.pop();
      if (G.mode === 'ai') while (G.history.length && G.seats[G.s.turn].kind === 'ai') G.s = G.history.pop();
      if (G.mode === 'ai' && G.seats[G.s.turn].kind === 'ai') { /* nothing earlier to return to */ }
      G.sel = null; renderGame(); afterTurnChange();
    },
    musicToggle: (d, e, el) => { const on = !Music.enabled(); Music.setEnabled(on); el.classList.toggle('on', on); },
    toggleAutoSend: () => { Store.LS.set('autoSend', !autoSend()); closeSheet(); toast(autoSend() ? 'Moves send automatically when nothing else is left' : 'You’ll confirm each move with Send move'); renderGame(); },
    toggleHints: () => { setup.hints = !hintsOn(); Store.LS.set('setup', Object.assign(Store.LS.get('setup', {}), { hints: setup.hints })); closeSheet(); toast('Hints ' + (setup.hints ? 'on' : 'off')); if (setup.hints) analyse(); renderGame(); },
    toggleH: () => { G.showH = !G.showH; renderBoard(); renderBar(); },
    endTurn: () => { if (G.s.winner !== null) return showResult(); if (G.busy) return; doAction({ t: 'end' }); },
    gameMenu: () => {
      sheet(`<h3>Menu</h3><div class="menu">
        <div class="card" style="padding:10px 14px"><div class="toggle" style="padding:4px 0"><div><b>🎵 Background music</b><div class="tiny muted">Original guzheng &amp; flute, made live</div></div><span class="sw ${Music.enabled() ? 'on' : ''}" data-act="musicToggle"></span></div>
          <input type="range" min="0" max="100" value="${Math.round(Music.volume * 100)}" id="musicVol" style="width:100%;accent-color:#e6b54a" aria-label="Music volume"></div>
        <button class="btn" data-act="toggleHints">Hints: ${hintsOn() ? 'On' : 'Off'}</button>
        <button class="btn" data-act="toggleAutoSend">Auto-send moves: ${autoSend() ? 'On' : 'Off'}</button>
        <button class="btn" data-act="guideInGame">How to play</button>
        <button class="btn" data-act="showLog">Move log</button>
        ${G.s.winner === null && G.mode !== 'spectate' ? '<button class="btn danger" data-act="resign">Resign</button>' : ''}
        <button class="btn" data-act="leaveGame">${G.mode === 'spectate' ? 'Stop watching' : 'Leave game'}</button></div>`);
    },
    guideInGame: () => { sheet(`<div style="margin:-8px -16px">${Guide.html()}</div>`, { tall: true }); },
    showLog: () => { sheet(`<h3>Move log</h3><div class="log">${G.s.log.slice().reverse().map((l) => `<div><span class="dot" style="background:var(--p${l.p})"></span><b>${esc(G.seats[l.p].name)}</b> ${esc(l.text)} <span class="tiny muted">turn ${l.turn}</span></div>`).join('') || '<div class="muted">No moves yet</div>'}</div>`); },
    resign: async () => {
      closeSheet();
      if (!(await confirmBox('Resign?', 'Your opponent will be awarded the game.', 'Resign', true))) return;
      const loser = G.mode === 'local' ? G.s.turn : G.my;
      G.s = P.clone(G.s); G.s.winner = 1 - loser; G.s.winReason = 'resignation';
      if (G.mode === 'online') await pushOnline();
      afterTurnChange();
    },
    leaveGame: () => { Music.stop(); if (G && G.unwatch) G.unwatch(); if (G && G.spiritUn) G.spiritUn(); stopGameTimers(); G = null; go('home'); },
    rematch: () => { closeSheet(); if (G.unwatch) G.unwatch(); startLocal(G.mode); },
    backToGame: () => gameScreen(),
  };
  function rerenderSetup() { const y = window.scrollY; if (document.getElementById('opengames')) { screens.lobby(); } else screens.setup(); window.scrollTo(0, y); }
  async function askKeep(p) {
    const keep = await choose('Stay signed in on this device?', [{ label: 'Yes, keep me signed in', value: 'y', cls: 'primary' }, { label: 'No, ask for my PIN next time', value: 'n' }]);
    if (keep === 'y') Store.LS.set('session', p.id);
    go('home');
  }
  // Mark every tappable non-button as a button so Chrome's "Tap to Search" treats it as a control, not words
  const markTappables = (root) => root.querySelectorAll && root.querySelectorAll('[data-act]:not(button):not(a):not([role])').forEach((el) => { el.setAttribute('role', 'button'); el.setAttribute('tabindex', '-1'); });
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { markTappables(n); if (n.matches && n.matches('[data-act]:not(button):not(a):not([role])')) { n.setAttribute('role', 'button'); n.setAttribute('tabindex', '-1'); } } }))).observe(document.body, { childList: true, subtree: true });
  try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {}); } catch (e) {}
  document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input,textarea,[contenteditable="true"]')) e.preventDefault(); });
  document.addEventListener('selectstart', (e) => { if (!e.target.closest || !e.target.closest('input,textarea,[contenteditable="true"]')) e.preventDefault(); });
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'musicVol') Music.setVolume(e.target.value / 100); });
  document.addEventListener('pointerdown', () => { if (G && document.getElementById('board') && Music.enabled() && !Music.playing) Music.start(); }, { passive: true });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const f = actions[el.dataset.act]; if (f) f(el.dataset, e, el);
  });
  window.addEventListener('beforeunload', () => {});
  if (typeof P2P !== 'undefined') P2P.onStatus((st) => { if (G && G.mode === 'online') { if (st === 'disconnected') toast('Opponent disconnected — waiting for them to come back'); if (st === 'connected') toast('Opponent connected'); } if (st === 'code-taken') toast('That code is busy — create a new game'); });
  const socialHandler = async (ev, d) => {
    if (ev === 'dm') { const id = FireSocial.dmId(me ? me.id : '', d.from); if (dmOpen !== id) { toast('💬 ' + d.name + ': ' + String(d.text).slice(0, 60), 3500); buzz(15); } }
    if (ev === 'dmchange' && document.getElementById('dm-list')) screens.messages();
    if (ev === 'change' && document.querySelector('[data-act="startSetup"]') && !document.querySelector('.sheet')) screens.home();
    if (ev === 'change' && document.getElementById('friends-screen')) { const y = window.scrollY; screens.friends(); window.scrollTo(0, y); }
    if (ev === 'request') toast(d.name + ' wants to be friends — see Friends', 3500);
    if (ev === 'accepted') toast(d.name + ' accepted your friend request');
    if (ev === 'status' && d === 'elsewhere') toast('You’re signed in on another device — friends will reach you there');
    if (ev === 'invite') {
      if (G && G.mode && G.s && G.s.winner === null) { toast(d.name + ' invited you to a game (finish this one first)', 3500); return; }
      const ok = await choose(d.name + ' invited you to play', [{ label: 'Join game ' + d.game, value: true, cls: 'primary' }], 'Not now? It stays in Friends → Game invites.');
      if (ok) { if (d.id) FireSocial.dismissInvite(d.id); joinGame(d.game); }
    }
    if (ev === 'presence' && document.getElementById('friends-screen')) { const y = window.scrollY; screens.friends(); window.scrollTo(0, y); }
  };
  Social.on(socialHandler); FireSocial.on(socialHandler);
  TurnAlerts.on((ev, d) => {
    if (ev === 'nudge') { if (!(G && G.mode === 'online' && G.code === d.code) && Date.now() - (window.__nudgeT || 0) > 60000 && (window.__nudgeT = Date.now())) toast('📣 Yip yip! ' + d.who + ' is waiting for your move (game ' + d.code + ')', 4000); return; }
    if (ev !== 'turn') return;
    if (G && G.mode === 'online' && G.code === d.code) return;
    toast('Your turn vs ' + d.opp + ' (game ' + d.code + ') — open it from Play online', 4000);
  });
  window.__paisho = { get G() { return G; }, doAction, P };
  go('boot');
})();
