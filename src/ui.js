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
  const myAvatar = () => (me && me.avatar) || Store.LS.get('guestAvatar', null);
  function bindPicker(root, onPick) { root.addEventListener('click', (e) => { const b = e.target.closest('[data-av]'); if (!b) return; root.querySelectorAll('.av-opt').forEach((x) => x.classList.toggle('on', x === b)); onPick(b.dataset.av); }); }
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
  async function players() { try { return (await Store.list('players')).filter((p) => p && p.name).map(noteHue).sort((a, b) => a.name.localeCompare(b.name)); } catch (e) { return []; } }
  function myPid() { if (me) return me.id; let g = Store.LS.get('guestId'); if (!g) { g = 'g-' + Auth.rid(6); Store.LS.set('guestId', g); } return g; }
  const myName = () => (me ? me.name : Store.LS.get('guestName', 'Guest'));

  async function recordResult(pid, mode, level, res, opp, turns, ring) {
    if (!pid || pid.startsWith('g-')) return;
    try {
      const p = await Store.get('players', pid); if (!p) return;
      const st = Object.assign(emptyStats(), p.stats || {});
      const k = res === 'w' ? 0 : res === 'l' ? 1 : 2;
      st.games++; st[['wins', 'losses', 'draws'][k]]++;
      if (mode === 'ai') { st.ai[level] = st.ai[level] || [0, 0, 0]; st.ai[level][k]++; } else st[mode][k]++;
      st.streak = res === 'w' ? st.streak + 1 : 0; st.best = Math.max(st.best, st.streak);
      if (res === 'w' && ring) st.rings++;
      st.recent = [{ t: Date.now(), mode, level, res, opp, turns }].concat(st.recent || []).slice(0, 20);
      p.stats = st; await Store.set('players', pid, p);
      if (me && me.id === pid) me = p;
    } catch (e) { console.warn(e); }
  }

  // ---------- screens ----------
  const screens = {};
  function go(name, ...args) { if (name === 'loadouts') loTab = null; Music.stop(); closeSheet(); stopGameTimers(); if (name !== 'lobby' && lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; } screens[name](...args); window.scrollTo(0, 0); }

  screens.boot = async () => {
    app.innerHTML = `<div class="screen" style="justify-content:center;align-items:center">${logoSvg(140)}<div class="muted">Opening the garden gate…</div></div>`;
    await Store.init();
    const sess = Store.LS.get('session');
    if (sess) { const p = await Store.get('players', sess).catch(() => null); if (p) { me = p; rememberProfile(p.id); return go('home'); } }
    go('login');
  };

  const knownIds = () => Store.LS.get('knownProfiles', []);
  function rememberProfile(id) { const k = knownIds().filter((x) => x !== id); k.unshift(id); Store.LS.set('knownProfiles', k.slice(0, 12)); }
  screens.login = async () => {
    let list = await players();
    if (Store.kind === 'firebase') list = list.filter((p) => knownIds().includes(p.id));
    const where = { firebase: 'Profiles, stats, friends and games are saved online — sign in from any phone with your name and PIN.', artifact: 'Profiles and stats are saved with this app and shared with everyone you invite.', server: 'Profiles and stats are saved on your PC server.', local: 'Profiles and stats are saved on this device only.' }[Store.kind];
    app.innerHTML = `<div class="screen">
      <div class="title">${logoSvg()}<h1>Pai Sho</h1><div class="sub">Key Pai Sho · The Garden Game</div></div>
      <div class="field"><label>Who's playing?</label></div>
      <div class="plist">${list.map((p) => `<button class="prof" data-act="pickProfile" data-id="${esc(p.id)}">${av(p.name)}<div><div class="nm">${esc(p.name)}</div><div class="tiny muted">${(p.stats && p.stats.games) || 0} games · ${(p.stats && p.stats.wins) || 0} wins ${p.cred ? '· 🔒 biometric' : ''}</div></div></button>`).join('') || '<div class="card muted">No players yet. Create one to track your stats.</div>'}</div>
      <button class="btn primary" data-act="newProfile">＋ New player</button>
      ${Store.kind === 'firebase' ? '<button class="btn" data-act="findProfile">Sign in to an existing player</button>' : ''}
      <button class="btn ghost" data-act="guestPlay">Play as guest (no stats)</button>
      <div class="spacer"></div><div class="tiny muted" style="text-align:center">${where}</div></div>`;
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

  async function loginFlow(p, onOk, backTo = 'login') {
    const bio = p.cred && await Auth.bioAvailable();
    const tryBio = async () => {
      try { if (await Auth.bioVerify(p.cred)) return onOk(p); } catch (e) { toast('Biometric unavailable here — use your PIN'); }
    };
    pinPad(p.name, `${av(p.name)}<div class="muted" style="margin-top:8px">Enter your PIN</div>`, async (pin) => {
      const h = await Auth.hash(pin, p.salt);
      if (h === p.pin) { onOk(p); return true; }
      toast('Wrong PIN'); return false;
    }, bio ? tryBio : '');
    if (bio) setTimeout(tryBio, 300);
    const back = app.querySelector('[data-act="go"]'); if (back) back.dataset.to = backTo;
  }

  screens.newProfile = async () => {
    const bio = await Auth.bioAvailable();
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="login">‹</button><h2>New player</h2><span style="width:42px"></span></div>
      <form class="screen" id="npf">
        <div class="field"><label>Player name</label><input class="input" id="np-name" maxlength="18" autocomplete="nickname" required></div>
        <div class="field"><label>Avatar</label><div id="np-av"></div></div>
        <div class="field"><label>PIN (4–6 digits)</label><input class="input" id="np-pin" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" type="password" required></div>
        <div class="field"><label>Confirm PIN</label><input class="input" id="np-pin2" inputmode="numeric" maxlength="6" type="password" required></div>
        <div class="toggle"><div><b>Use biometrics</b><div class="tiny muted">${bio ? 'Face / fingerprint unlock on this device' : 'Not available in this browser — PIN only'}</div></div><span class="sw ${bio ? 'on' : ''}" id="np-bio" data-act="sw" ${bio ? '' : 'style="opacity:.4"'}></span></div>
        <div class="toggle"><div><b>Keep me signed in</b><div class="tiny muted">On this device</div></div><span class="sw on" id="np-keep" data-act="sw"></span></div>
        <div class="tiny muted">Your PIN keeps casual players out of your stats. It isn't bank-grade security — don't reuse an important PIN.</div>
        <button class="btn primary" type="submit">Create player</button></form>`;
    let pickedAv = Avatars.random();
    const npav = document.getElementById('np-av'); npav.innerHTML = Avatars.picker(pickedAv); bindPicker(npav, (id) => (pickedAv = id));
    document.getElementById('npf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('np-name').value.trim();
      const pin = document.getElementById('np-pin').value, pin2 = document.getElementById('np-pin2').value;
      if (!name) return toast('Enter a name');
      if (!/^\d{4,6}$/.test(pin)) return toast('PIN must be 4–6 digits');
      if (pin !== pin2) return toast('PINs don’t match');
      const list = await players();
      if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast('That name is taken');
      const id = 'p-' + Auth.rid(8).replace(/[^A-Za-z0-9]/g, 'x');
      const salt = Auth.rid(10);
      const p = { id, name, salt, pin: await Auth.hash(pin, salt), created: Date.now(), stats: emptyStats(), cred: null, avatar: pickedAv };
      if (bio && document.getElementById('np-bio').classList.contains('on')) {
        try { p.cred = await Auth.bioRegister(p); } catch (err) { toast('Biometric setup skipped — PIN only'); }
      }
      try { await Store.set('players', id, p); } catch (err) { return toast('Couldn’t save the player (no write access?)'); }
      me = p; rememberProfile(id);
      if (document.getElementById('np-keep').classList.contains('on')) Store.LS.set('session', id);
      go('home');
    });
  };

  screens.home = () => {
    noteHue(me);
    startSocial();
    const nm = myName();
    const st = (me && me.stats) || null;
    app.innerHTML = `<div class="screen">
      <div class="row"><button class="pill" data-act="profileSheet">${av(nm)}${esc(nm)}</button><span class="spacer"></span><button class="iconbtn" data-act="go" data-to="guide" aria-label="Rules">?</button></div>
      <div class="title" style="padding:0">${logoSvg(84)}<h1 style="font-size:28px">Pai Sho</h1></div>
      ${me ? `<button style="text-align:left;padding:0" data-act="profileSheet">${Avatars.card(Object.assign({}, me, { avatar: me.avatar || 'whitelotus' }), esc)}</button>` : `<div class="sub muted" style="text-align:center;letter-spacing:.2em;text-transform:uppercase;font-size:13px">Guest mode</div>`}
      <div class="menu">
        <button class="btn primary" data-act="startSetup" data-mode="ai">${icon('cpu')}<span class="lbl">Play the computer<small>Easy, medium or hard</small></span></button>
        <button class="btn" data-act="startSetup" data-mode="local">${icon('pass')}<span class="lbl">Pass &amp; play<small>Two players, one phone</small></span></button>
        <button class="btn" data-act="go" data-to="lobby">${icon('net')}<span class="lbl">Play online<small>${Store.online() ? 'Create or join a game with a code' : 'Needs an internet connection'}</small></span></button>
        ${(Store.kind === 'firebase' || (Social.ready() && Store.kind === 'local')) ? `<button class="btn" data-act="go" data-to="friends">${icon('friends')}<span class="lbl">Friends<small>${friendsLine()}</small></span></button>` : ''}
        <button class="btn" data-act="go" data-to="loadouts">${icon('loadout')}<span class="lbl">Loadouts<small>Equipped: ${esc(equipped().name)} · ${loIcons(equipped().fx, 16)}</small></span></button>
        <button class="btn" data-act="go" data-to="guide">${icon('book')}<span class="lbl">How to play<small>Rules, tiles &amp; diagrams</small></span></button>
        <button class="btn" data-act="go" data-to="stats">${icon('chart')}<span class="lbl">Stats &amp; leaderboard<small>${me ? 'Your record and everyone’s' : 'Sign in to track stats'}</small></span></button>
      </div></div>`;
  };
  function icon(k) {
    const s = { cpu: Glyphs.svg('wheel', 1, 'class="ic"'), pass: Glyphs.svg('koi', 0, 'class="ic"'), net: Glyphs.svg('skybison', 1, 'class="ic"'), book: Glyphs.svg('lotus', 0, 'class="ic"'), chart: Glyphs.svg('jasmine', 1, 'class="ic"'), friends: Glyphs.svg('rose', 0, 'class="ic"'), loadout: Glyphs.svg('boat', 1, 'class="ic"') };
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
  const equipped = () => { const L = getLoadouts(); return L.list[L.active]; };
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
        ${fxGrid(fxSel)}
        <div class="tiny muted" style="margin-top:6px">Changes here apply to this game only.</div>
        ${S.mode === 'ai' ? `<div class="tiny muted" style="margin-top:8px">The computer uses: ${AI.AI_EFFECTS[S.level].map(P.tname).join(', ') || 'no effect tiles'}.</div>` : ''}
      </div>
      ${variationsCard()}
      <button class="btn primary" data-act="beginGame">Start game</button>
    </div>`;
  };
  function fxGrid(sel, act = 'fx') {
    return `<div class="fx-grid">${P.EFFECT_TYPES.map((t) => `<button class="fx ${sel.includes(t) ? 'on' : ''}" data-act="${act}" data-t="${t}">${Glyphs.svg(t, 0)}<span class="nm">${P.tname(t)}</span><span class="ty">${P.isSpecial(t) ? 'flower' : 'accent'}</span></button>`).join('')}</div>`;
  }
  function variationsCard() {
    const S = setup;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[key] == v ? 'on' : ''}" data-act="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="card"><b class="disp" style="color:var(--gold2)">Variations</b>
      <div class="field" style="margin-top:10px"><label>Harmonies needed in the ring</label>${seg('minH', [[3, '3'], [4, '4'], [6, '6'], [10, '10']])}</div>
      <div class="field" style="margin-top:10px"><label>Turn timer</label>${seg('timer', [[0, 'Off'], [30, '30s'], [60, '60s'], [120, '2m']])}</div>
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
      const mine = games.filter((g) => g.status !== 'done' && ((g.host && g.host.pid === pid) || (g.guest && g.guest.pid === pid)) && now - (g.updated || 0) < 14 * 864e5);
      const open = games.filter((g) => g.status === 'open' && g.host && g.host.pid !== pid && now - (g.updated || 0) < 2 * 864e5);
      const mg = document.getElementById('mygames'), og = document.getElementById('opengames');
      if (!mg) return;
      mg.innerHTML = mine.map((g) => { const opp = g.host.pid === pid ? (g.guest ? g.guest.name : 'waiting…') : g.host.name; return `<button class="btn" data-act="resumeOnline" data-code="${esc(g.id)}"><span class="disp">${esc(g.id)}</span><span class="spacer"></span>vs ${esc(opp)} · ${g.status === 'open' ? 'waiting' : 'in play'}</button>`; }).join('') || '<div class="muted tiny">None yet.</div>';
      og.innerHTML = open.map((g) => `<button class="btn" data-act="joinGame" data-code="${esc(g.id)}">${av(g.host.name)}<span>${esc(g.host.name)}</span><span class="spacer"></span><span class="disp">${esc(g.id)}</span></button>`).join('') || '<div class="muted tiny">No open games. Create one and share the code.</div>';
    });
  };

  async function createOnline() {
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
    const S = setup;
    const doc = { code, status: 'open', created: Date.now(), updated: Date.now(), ver: 0, state: null,
      opts: { minH: +S.minH, timer: +S.timer, chance: !!S.chance, enigma: !!S.enigma },
      host: { pid: myPid(), name: myName(), avatar: myAvatar(), fx: S.fx[0].slice() }, guest: null, pids: [myPid()] };
    if (Store.kind === 'firebase' && TurnAlerts.supported() && !TurnAlerts.enabled() && !Store.LS.get('askedAlerts')) { Store.LS.set('askedAlerts', 1); TurnAlerts.enable(); }
    if (Store.p2p()) P2P.host(code);
    try { await Store.set('games', code, doc); } catch (e) { return toast('Couldn’t create the game (no write access?)'); }
    waitOnline(code);
    return code;
  }
  function waitOnline(code) {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="cancelOnline" data-code="${code}">‹</button><h2>Waiting</h2><span style="width:42px"></span></div>
      <div class="screen" style="justify-content:center;text-align:center">${logoSvg(120)}<p class="muted">Share this code with your opponent</p><div class="code">${code}</div><p class="muted">They join from <b>Play online</b>. You’ll play as the Host; the Guest moves first.</p>
      <button class="btn" data-act="copyCode" data-code="${code}">Copy code</button></div>`;
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
    const pid = myPid();
    if (d.host.pid === pid) return d.status === 'open' ? waitOnline(code) : startOnline(d);
    if (d.guest && d.guest.pid === pid) return startOnline(d);
    if (d.status !== 'open') return toast('That game already has two players');
    const guest = { pid, name: myName(), avatar: myAvatar(), fx: setup.fx[0].slice() };
    const s = P.newGame({ effects: [guest.fx, d.host.fx], minHarmonies: d.opts.minH, chance: d.opts.chance });
    const nd = Object.assign({}, d, { guest, pids: [d.host.pid, guest.pid], status: 'playing', state: JSON.stringify(s), ver: 1, updated: Date.now() });
    delete nd.id;
    try { await Store.set('games', code, nd); } catch (e) { return toast('Couldn’t join (no write access?)'); }
    startOnline(Object.assign({ id: code }, nd));
  }


  // ---------- friends ----------
  function friendsLine() {
    if (Store.kind === 'firebase' && !me) return 'Sign in to add friends';
    const f = Soc().friends(), on = f.filter((x) => Soc().isOnline(x.code)).length, rq = Soc().requests().length;
    return rq ? `${rq} friend request${rq > 1 ? 's' : ''}` : f.length ? `${on} of ${f.length} online` : 'Add friends with a code';
  }
  function startSocial() {
    if (Store.kind === 'artifact') return;
    if (Store.kind === 'firebase') { if (me) { if (!FireSocial.active) FireSocial.start({ pid: me.id, name: me.name, avatar: me.avatar }).then(() => { if (document.querySelector('[data-act="startSetup"]')) screens.home(); }); TurnAlerts.start(me.id); } return; }
    const go2 = () => Soc().start({ pid: myPid(), name: myName(), avatar: myAvatar() });
    if (Soc().ready()) go2(); else { let n = 0; const t = setInterval(() => { if (Soc().ready()) { clearInterval(t); go2(); if (document.querySelector('[data-act="startSetup"]')) screens.home(); } else if (++n > 40) clearInterval(t); }, 250); }
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
      ${Avatars.card({ name: myName(), avatar: myAvatar() || 'whitelotus', stats: me && me.stats }, esc, { noStats: !me })}
      <div class="card" style="text-align:center"><div class="muted tiny" style="text-transform:uppercase;letter-spacing:.1em">Your friend code</div><div class="code" style="font-size:34px">${esc(Soc().code || '……')}</div>
        <div class="row" style="justify-content:center"><button class="btn small" data-act="copyCode" data-code="${esc(Soc().code || '')}">Copy code</button></div>
        <div class="tiny muted" style="margin-top:8px">Give this to a friend. You both need to have the app open to connect.</div></div>
      <div class="card"><div class="field"><label>Add a friend</label><div class="row"><input class="input" id="addcode" maxlength="7" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:.2em;font-family:Cinzel"><button class="btn primary" data-act="addFriend">Add</button></div></div></div>
      ${rq.length ? `<div class="field"><label>Friend requests</label><div class="menu">${rq.map((r) => `<div class="prof">${av(r.name)}<div style="flex:1"><div class="nm">${esc(r.name)}</div><div class="tiny muted">${esc(r.code)}</div></div><button class="btn small primary" data-act="acceptFriend" data-code="${esc(r.code)}">Accept</button><button class="btn small ghost" data-act="declineFriend" data-code="${esc(r.code)}">✕</button></div>`).join('')}</div></div>` : ''}
      <div class="field"><label>Your friends</label><div class="menu">${fr.map((f) => { const on = Soc().isOnline(f.code); return `<div class="prof">${av(f.name)}<div style="flex:1;min-width:0"><div class="nm">${esc(f.name)}</div><div class="tiny muted"><span class="dot" style="background:${on ? 'var(--ok)' : 'var(--mute)'}"></span>${f.pending ? 'Request sent' : on ? 'Online' : 'Offline'}</div></div>${on && !f.pending ? `<button class="btn small primary" data-act="inviteFriend" data-code="${esc(f.code)}">Invite</button>` : ''}<button class="btn small ghost" data-act="removeFriend" data-code="${esc(f.code)}" aria-label="Remove">✕</button></div>`; }).join('') || '<div class="card muted">No friends yet. Swap codes to add each other.</div>'}</div></div>
    </div>`;
  };

  // ---------- stats ----------
  screens.stats = async () => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Stats</h2><span style="width:42px"></span></div><div class="screen" id="statbody"><div class="muted">Loading…</div></div>`;
    const list = await players();
    if (me) { const fresh = list.find((p) => p.id === me.id); if (fresh) me = fresh; }
    const st = me ? Object.assign(emptyStats(), me.stats || {}) : null;
    const rec = (a) => `${a[0]}–${a[1]}–${a[2]}`;
    const pct = (s) => (s.games ? Math.round((100 * s.wins) / s.games) + '%' : '—');
    const body = document.getElementById('statbody'); if (!body) return;
    body.innerHTML = (st ? `${Avatars.card(Object.assign({}, me, { avatar: me.avatar || 'whitelotus' }), esc, { big: true, noStats: true })}
      <div class="stat-grid"><div class="stat"><div class="v">${st.games}</div><div class="k">Games</div></div><div class="stat"><div class="v">${st.wins}</div><div class="k">Wins</div></div><div class="stat"><div class="v">${pct(st)}</div><div class="k">Win rate</div></div>
      <div class="stat"><div class="v">${st.streak}</div><div class="k">Streak</div></div><div class="stat"><div class="v">${st.best}</div><div class="k">Best streak</div></div><div class="stat"><div class="v">${st.rings}</div><div class="k">Rings won</div></div></div>
      <div class="card"><table class="lb"><tr><th>Mode</th><th class="n">W–L–D</th></tr>
      <tr><td>Computer · Easy</td><td class="n">${rec(st.ai.easy)}</td></tr><tr><td>Computer · Medium</td><td class="n">${rec(st.ai.medium)}</td></tr><tr><td>Computer · Hard</td><td class="n">${rec(st.ai.hard)}</td></tr>
      <tr><td>Pass &amp; play</td><td class="n">${rec(st.local)}</td></tr><tr><td>Online</td><td class="n">${rec(st.online)}</td></tr></table></div>
      <div class="field"><label>Recent games</label><div class="log">${(st.recent || []).map((r) => `<div><span class="dot" style="background:${r.res === 'w' ? 'var(--ok)' : r.res === 'l' ? 'var(--red)' : 'var(--mute)'}"></span><b>${{ w: 'Won', l: 'Lost', d: 'Draw' }[r.res]}</b> vs ${esc(r.opp)} · ${r.turns} turns <span class="muted tiny">${new Date(r.t).toLocaleDateString()}</span></div>`).join('') || '<div class="muted">No games yet.</div>'}</div></div>`
      : `<div class="card muted">You’re playing as a guest. Create a player to track your stats.</div>`) +
      `<div class="field"><label>Leaderboard</label><div class="card"><table class="lb"><tr><th>#</th><th>Player</th><th class="n">W–L–D</th><th class="n">Win%</th></tr>${list.map((p) => Object.assign({ s: Object.assign(emptyStats(), p.stats || {}) }, p)).sort((a, b) => b.s.wins - a.s.wins || a.s.losses - b.s.losses).map((p, k) => `<tr><td>${k + 1}</td><td>${esc(p.name)}</td><td class="n">${p.s.wins}–${p.s.losses}–${p.s.draws}</td><td class="n">${pct(p.s)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No players yet</td></tr>'}</table></div></div>`;
  };

  // ======================================================================
  // GAME CONTROLLER
  // ======================================================================
  function startLocal(mode) {
    const S = setup;
    Store.LS.set('setup', { level: S.level, first: S.first, fx: S.fx, minH: S.minH, timer: S.timer, chance: S.chance, enigma: S.enigma, hints: S.hints });
    let meFirst = S.first === 'me' || (S.first === 'rand' && Math.random() < 0.5);
    const human = { name: myName(), pid: me ? me.id : null, avatar: myAvatar(), kind: 'human' };
    const other = mode === 'ai' ? { name: 'Computer · ' + S.level[0].toUpperCase() + S.level.slice(1), kind: 'ai', level: S.level } : { name: S.p2.name, pid: S.p2.pid, avatar: S.p2.avatar, kind: 'human' };
    const seats = meFirst ? [human, other] : [other, human];
    const fxMe = S.fx[0].slice(), fxOther = mode === 'ai' ? AI.AI_EFFECTS[S.level].slice() : S.fx[1].slice();
    const s = P.newGame({ effects: meFirst ? [fxMe, fxOther] : [fxOther, fxMe], minHarmonies: +S.minH, chance: !!S.chance });
    G = { mode, s, seats, my: mode === 'ai' ? (meFirst ? 0 : 1) : null, history: [], sel: null, showH: true, opts: { timer: +S.timer, enigma: !!S.enigma, chance: !!S.chance }, recorded: false };
    gameScreen();
  }
  function startOnline(d) {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
    const pid = myPid();
    const my = d.guest && d.guest.pid === pid ? 0 : 1;
    const seats = [{ name: d.guest.name, pid: d.guest.pid, avatar: d.guest.avatar, kind: my === 0 ? 'human' : 'remote' }, { name: d.host.name, pid: d.host.pid, avatar: d.host.avatar, kind: my === 1 ? 'human' : 'remote' }];
    if (Store.p2p()) P2P.resume(d.id || d.code, my === 1);
    G = { mode: 'online', code: d.id || d.code, doc: d, ver: d.ver, s: JSON.parse(d.state), seats, my, history: [], sel: null, showH: true, opts: { timer: d.opts.timer, enigma: d.opts.enigma, chance: d.opts.chance }, recorded: false };
    G.unwatch = Store.watch('games', G.code, (nd) => {
      if (!G || G.mode !== 'online' || !nd || !nd.state) return;
      if ((nd.ver || 0) > G.ver) {
        G.ver = nd.ver; G.doc = nd; G.s = JSON.parse(nd.state); G.history = []; G.sel = null;
        renderGame(); afterTurnChange();
      }
    });
    gameScreen();
  }
  async function pushOnline() {
    const s = P.clone(G.s); s.log = s.log.slice(-60);
    G.ver++;
    const nd = Object.assign({}, G.doc, { state: JSON.stringify(s), ver: G.ver, updated: Date.now(), status: s.winner !== null ? 'done' : 'playing' });
    delete nd.id; G.doc = nd;
    try { await Store.set('games', G.code, nd); } catch (e) { toast('Couldn’t send your move — check your connection'); }
  }

  const isHumanTurn = () => G && G.s.winner === null && G.seats[G.s.turn].kind === 'human';
  const viewSeat = () => (G.my != null ? G.my : G.s.turn); // whose hand shows in the tray
  let acts = [];
  function computeActs() { acts = isHumanTurn() ? P.legalActions(G.s) : []; }

  function gameScreen() {
    app.innerHTML = `<div class="game">
      <header class="g-top" id="seats"></header>
      <div class="board-wrap"><svg id="board" viewBox="-9.7 -9.7 19.4 19.4">${Board.base()}<g id="l-hl"></g><g id="l-harm"></g><g id="l-tiles"></g><g id="l-dest"></g></svg></div>
      <div class="status" id="status"></div>
      <div class="info" id="info"></div>
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
  function renderBoard() {
    const s = G.s;
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
    hl.innerHTML = h;
    // harmonies
    const lh = document.getElementById('l-harm'); let hh = '';
    if (G.showH || s.winner !== null) {
      const H = P.harmonies(s);
      H.forEach(({ a, b, owners }) => {
        const col = owners.length > 1 ? '#ffffff' : owners[0] === 0 ? 'var(--p0)' : 'var(--p1)';
        hh += `<line class="harm" x1="${Board.cx(a)}" y1="${Board.cy(a)}" x2="${Board.cx(b)}" y2="${Board.cy(b)}" stroke="${col}" ${owners.length > 1 ? 'stroke-dasharray="0.3 0.2"' : ''}/>`;
      });
      if (s.winRing) hh += `<polygon class="ring" points="${s.winRing.map((i) => Board.cx(i) + ',' + Board.cy(i)).join(' ')}"/>`;
    }
    lh.innerHTML = hh;
    renderSel();
  }
  function srcOf(a) { return a.from.kind === 'sq' ? 'sq' + a.from.i : a.from.kind === 'gate' ? 'g' + a.from.g : 'c'; }
  function renderSel() {
    const ld = document.getElementById('l-dest'); if (!ld) return;
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
    } else if (sel && sel.kind === 'koi') {
      const pool = sel.first == null ? [...new Set(sel.moves.flatMap((m) => [m.a, m.b]))] : sel.moves.filter((m) => m.a === sel.first || m.b === sel.first).map((m) => (m.a === sel.first ? m.b : m.a));
      pool.forEach((i) => (o += ringAt(Board.cx(i), Board.cy(i))));
      if (sel.first != null) o += `<circle cx="${Board.cx(sel.first)}" cy="${Board.cy(sel.first)}" r="0.5" fill="none" stroke="#fff" stroke-width="0.1"/>`;
    } else if (isHumanTurn() && !G.s.tp.mainDone && hintsOn() && G.ana && G.ana.sug) {
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
    const hide = G.opts.enigma && G.seats[k].kind !== 'human' || (G.opts.enigma && G.mode === 'local' && s.turn !== k);
    const who = G.seats[k].kind === 'ai' ? '' : k === 0 ? 'Guest · ' : 'Host · ';
    return `${who}${keys} key · ${hide ? fx + ' hidden' : fx + ' effect'}`;
  }
  function renderSeats() {
    const H = P.harmonies(G.s);
    const el = document.getElementById('seats'); if (!el) return;
    el.innerHTML = [0, 1].map((k) => `<div class="seat ${G.s.turn === k && G.s.winner === null ? 'active' : ''}">${G.seats[k].avatar && Avatars.has(G.seats[k].avatar) ? `<span class="disc av-img" style="position:relative">${Avatars.svg(G.seats[k].avatar, 26)}<svg viewBox="-1.1 -1.1 2.2 2.2" style="position:absolute;right:-4px;bottom:-4px;width:13px;height:13px">${Glyphs.tile('lotus', k)}</svg></span>` : `<svg class="disc" viewBox="-1.1 -1.1 2.2 2.2">${Glyphs.tile('lotus', k)}</svg>`}
      <div class="meta"><span class="nm">${esc(G.seats[k].name)}${G.my === k ? ' (you)' : ''}</span><span class="st">${seatStatus(k)}</span></div>
      <div class="hc">${H.filter((h) => h.owners.includes(k)).length}<small>HARM.</small></div></div>`).join('');
  }
  function statusText() {
    const s = G.s, tp = s.tp;
    if (s.winner !== null) return s.winner === 'draw' ? '<b>Draw</b>' : `<b>${esc(G.seats[s.winner].name)}</b> wins by ${s.winReason}`;
    const nm = esc(G.seats[s.turn].name);
    if (!isHumanTurn()) return G.seats[s.turn].kind === 'ai' ? `${nm} is thinking…` : `Waiting for <b>${nm}</b>…`;
    const pre = G.mode === 'local' ? `<b>${nm}</b>: ` : '<b>Your turn</b> — ';
    if (G.sel && G.sel.kind === 'plant') return pre + 'tap a glowing gate to plant';
    if (G.sel && G.sel.kind === 'place') return pre + 'tap one of your ringed tiles to swap it out';
    if (G.sel && G.sel.kind === 'stone') return pre + 'tap any empty square for the Stone';
    if (G.sel && G.sel.kind === 'koi') return pre + (G.sel.first == null ? 'tap the first tile to swap' : 'tap the tile on the other side');
    if (G.sel && G.sel.kind === 'tile') return pre + 'tap a gold dot to move';
    if (tp.mustLotus) return pre + 'your Lotus must leave the centre';
    if (tp.extra) return pre + (tp.extra.kind === 'orchid' ? 'Orchid bonus: move one more tile (or End turn)' : 'Sky Bison bonus: the carried tile may move again');
    if (tp.mainDone) return pre + 'place an accent or use an ability, or End turn';
    if (!acts.some((a) => a.t === 'move' || a.t === 'plant')) return pre + 'no moves available — tap End turn to pass';
    return pre + 'plant a flower or move a tile';
  }
  function renderStatus() {
    const el = document.getElementById('status'); if (!el) return;
    el.innerHTML = statusText() + (G.timerEnd && isHumanTurn() ? `<span class="timer" id="tmr">${Math.max(0, Math.ceil((G.timerEnd - Date.now()) / 1000))}s</span>` : '');
  }

  const hintsOn = () => setup.hints !== false;
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
    if (!G || !isHumanTurn() || !hintsOn()) { if (G) G.ana = null; return; }
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
      g.ana = { win, danger, sug };
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
    if (!type) {
      if (G && hintsOn() && isHumanTurn()) {
        const a = G.ana, opp = esc(G.seats[1 - G.s.turn].name);
        if (G.sel && G.sel.kind === 'tile') { el.innerHTML = `<span>💡 <b style="color:#7cc48a">Green +N</b> = new harmonies for you · <b style="color:#6fc6e8">blue ring</b> = breaks one of ${opp}’s · ★ = completes a ring</span>`; return; }
        const sg = a && a.sug ? `<br>🧭 <b>Try:</b> ${sugText(a.sug)}` : '';
        const show = a && a.sug ? `<button class="btn small" data-act="showSug" style="flex:none;padding:6px 10px">Show</button>` : '';
        if (a && a.win) { el.innerHTML = `<span style="flex:1">⭐ <b>You can close a ring this turn!</b>${sg}</span>${show}`; return; }
        if (a && a.danger) { el.innerHTML = `<span style="flex:1">⚠️ <b>${opp} is one move from a ring</b> — block it.${sg}</span>${show}`; return; }
        if (a && a.sug) { el.innerHTML = `<span style="flex:1">🧭 <b>Suggested:</b> ${sugText(a.sug)}<br><span class="tiny">💡 ${TIPS[(G.s.turnNo >> 1) % TIPS.length]}</span></span>${show}`; return; }
        el.innerHTML = `<span>💡 ${TIPS[(G.s.turnNo >> 1) % TIPS.length]}</span>`; return;
      }
      el.innerHTML = `<span>Tap any tile for its rules. Gold lines are harmonies.</span>`; return;
    }
    const inf = Guide.INFO[type];
    const ps = Guide.partners(type).filter((x) => x.ok).map((x) => x.type);
    el.innerHTML = `${Glyphs.svg(type, owner == null ? 0 : owner)}<span style="flex:1"><b>${P.tname(type)}</b> · ${inf[1]}<br><span class="tiny">${ps.length ? 'Harmonizes with: ' + [...new Set(ps)].map((t) => `<span style="display:inline-block;vertical-align:middle;width:18px;height:18px">${Glyphs.svg(t, owner || 0, 'style="width:18px;height:18px"')}</span>`).join('') : 'Doesn’t harmonize'}</span></span><button class="btn small ghost" data-act="tileDetails" data-t="${type}" data-o="${owner == null ? 0 : owner}" style="flex:none;padding:6px 8px">Rules ›</button>`;
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
    end.textContent = !s.tp.mainDone && canEnd ? 'Pass' : 'End turn';
    end.classList.toggle('glow', canEnd && s.tp.mainDone);
    if (s.winner !== null) { end.disabled = false; end.textContent = 'Result'; end.classList.remove('glow'); }
    undo.disabled = !canUndo();
    bh.style.opacity = G.showH ? 1 : 0.5;
  }
  function renderGame() { computeActs(); renderBoard(); renderSeats(); renderStatus(); renderTray(); renderBar(); if (!G.sel) renderInfo(null); }

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
  async function tap(tg) {
    const s = G.s, sel = G.sel;
    // info for whatever is under the finger
    const cellTop = s.board[tg.i] && s.board[tg.i].top;
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
  function canUndo() {
    if (!G || !G.history.length || G.s.winner !== null || G.busy) return false;
    if (G.mode === 'online') return isHumanTurn() && G.history.length > 0;
    return true;
  }
  function doAction(a) {
    if (!G || G.busy) return;
    try {
      G.history.push(G.s);
      G.s = P.apply(G.s, a);
    } catch (e) { G.history.pop(); toast('That move isn’t allowed'); console.warn(e); return; }
    G.sel = null; buzz(10);
    if (a.t === 'end') return turnEnded();
    renderGame();
    // auto-end when nothing optional is left
    if (G.s.tp.mainDone) {
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
  function stopGameTimers() { if (G && G.tick) { clearInterval(G.tick); G.tick = null; } if (G && G.waitingUnsub) { G.waitingUnsub(); G.waitingUnsub = null; } }
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
    const seq = AI.chooseTurn(g.s, g.seats[g.s.turn].level);
    for (const a of seq) {
      if (G !== g) return;
      if (a.t === 'end') { g.s = P.apply(g.s, a); break; }
      g.s = P.apply(g.s, a); renderGame(); await sleep(420);
    }
    if (G !== g) return;
    g.busy = false;
    renderGame(); afterTurnChange();
  }
  async function gameOver() {
    renderGame();
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
        await recordResult(seat.pid, mode, G.seats[1 - k].level, res, G.seats[1 - k].name, turns, ring);
      }
    }
    showResult();
  }
  function showResult() {
    const s = G.s;
    let head;
    if (s.winner === 'draw') head = 'Draw';
    else if (G.mode === 'local') head = esc(G.seats[s.winner].name) + ' wins!';
    else head = s.winner === G.my ? 'You win!' : esc(G.seats[s.winner].name) + ' wins';
    sheet(`<div style="text-align:center">${logoSvg(90)}<h3 style="font-size:28px">${head}</h3><p class="muted">${s.winner === 'draw' ? 'The game reached the turn limit.' : 'By ' + esc(s.winReason) + ' after ' + (s.turnNo - 1) + ' turns.'}</p></div>
      <div class="menu">${G.mode !== 'online' ? '<button class="btn primary" data-act="rematch">Play again</button>' : ''}<button class="btn" data-act="closeSheet">Look at the board</button><button class="btn" data-act="leaveGame">Home</button></div>`);
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
      sheet(`<div style="margin-bottom:12px">${Avatars.card(Object.assign({}, me, { avatar: me.avatar || 'whitelotus' }), esc, { big: true, code: Soc().code ? Soc().code : '' })}</div><div class="menu">
        <button class="btn primary" data-act="editProfile">Edit profile</button>
        ${Store.kind === 'firebase' ? `<button class="btn" data-act="alertsToggle">${TurnAlerts.enabled() ? '🔔 Turn alerts are on (send a test)' : '🔔 Turn on turn alerts'}</button>` : ''}
        <button class="btn" data-act="go" data-to="stats">Stats</button>
        ${bio ? `<button class="btn" data-act="bioToggle">${me.cred ? 'Turn off biometric unlock' : 'Turn on biometric unlock'}</button>` : '<div class="tiny muted">Biometric unlock isn’t available in this browser — your PIN works everywhere.</div>'}
        <button class="btn" data-act="changePin">Change PIN</button>
        <button class="btn" data-act="signOut">Sign out</button>
        <button class="btn danger" data-act="deleteMe">Delete this player</button></div>`);
    },
    toLogin: () => go('login'),
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
      const r = await TurnAlerts.enable();
      toast(r === 'granted' ? 'Turn alerts on' : r === 'unsupported' ? 'This browser can’t show notifications — install the app to your home screen first' : 'Notifications are blocked — allow them in your browser settings');
      if (r === 'granted') TurnAlerts.notify('Pai Sho', 'Turn alerts are on. You’ll get one when it’s your move.', 'test');
    },
    editProfile: () => {
      const cur = myName();
      let hue = me && me.hue != null ? me.hue : hueOf(cur);
      let pickedAv = myAvatar() || 'whitelotus';
      sheet(`<h3>${me ? 'Edit profile' : 'Display name'}</h3><form id="epf" class="menu">
        <div class="field"><label>Display name</label><input class="input" id="ep-name" maxlength="18" value="${esc(cur)}"></div>
        <div class="field"><label>Avatar</label><div id="ep-av">${Avatars.picker(pickedAv)}</div></div>
        <div class="tiny muted">${me ? 'Your stats, record, PIN and friend code stay the same. Friends see your new name and avatar next time you connect.' : 'Guests don’t keep stats.'}</div>
        <button class="btn primary" type="submit">Save</button></form>`);
      bindPicker(document.getElementById('ep-av'), (id) => (pickedAv = id));
      document.getElementById('epf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('ep-name').value.trim().replace(/\s+/g, ' ');
        if (!name) return toast('Enter a name');
        if (!me) { Store.LS.set('guestName', name); Store.LS.set('guestAvatar', pickedAv); avs[name] = pickedAv; closeSheet(); Soc().stop(); return go('home'); }
        if (name.toLowerCase() !== me.name.toLowerCase()) {
          const list = await players();
          if (list.some((p) => p.id !== me.id && p.name.toLowerCase() === name.toLowerCase())) return toast('That name is taken');
        }
        const prev = me.name;
        me.name = name; me.hue = hue; me.avatar = pickedAv; delete hues[prev]; delete avs[prev]; noteHue(me);
        try { await Store.set('players', me.id, me); } catch (err) { me.name = prev; return toast('Couldn’t save — try again'); }
        Soc().stop(); FireSocial.stop();
        closeSheet(); toast('Profile saved'); go('home');
      });
    },
    signOut: () => { Soc().stop(); FireSocial.stop(); TurnAlerts.stop(); me = null; Store.LS.set('session', null); go('login'); },
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
        me.salt = Auth.rid(10); me.pin = await Auth.hash(a, me.salt); await Store.set('players', me.id, me); closeSheet(); toast('PIN updated');
      });
    },
    deleteMe: async () => { if (await confirmBox('Delete player?', 'This removes ' + me.name + ' and their stats for good.', 'Delete', true)) { await Store.del('players', me.id); me = null; Store.LS.set('session', null); go('login'); } },
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
      setup.fx[k] = d.v === 'none' ? [] : d.v === 'flowers' ? Object.keys(P.SPECIAL) : P.EFFECT_TYPES.slice().sort(() => Math.random() - 0.5).slice(0, 6);
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
        loginFlow(p, (pp) => { setup.p2 = { name: pp.name, pid: pp.id, avatar: pp.avatar }; const lo = Array.isArray(pp.loadouts) && pp.loadouts[pp.activeLoadout | 0]; if (lo) setup.fx[1] = (lo.fx || []).slice(0, 6); go('setup'); }, 'setup');
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
    loTab: (d) => { loTab = +d.i; screens.loadouts(); },
    loEquip: () => { const L = getLoadouts(); saveLoadouts(L.list, loTab); toast('Equipped ' + L.list[loTab].name); screens.loadouts(); },
    loFx: (d) => { const L = getLoadouts(); const arr = L.list[loTab].fx; const i = arr.indexOf(d.t); if (i >= 0) arr.splice(i, 1); else if (arr.length < 6) arr.push(d.t); else return toast('Up to 6 effect tiles'); saveLoadouts(L.list, L.active); const y = window.scrollY; screens.loadouts(); window.scrollTo(0, y); },
    loPreset: (d) => { const L = getLoadouts(); L.list[loTab].fx = d.v === 'none' ? [] : d.v === 'flowers' ? Object.keys(P.SPECIAL) : P.EFFECT_TYPES.slice().sort(() => Math.random() - 0.5).slice(0, 6); saveLoadouts(L.list, L.active); screens.loadouts(); },
    useLoadout: (d) => { setup.fx[0] = getLoadouts().list[+d.i].fx.slice(); rerenderSetup(); },
    showSug: () => {
      if (!G || !G.ana || !G.ana.sug) return;
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
    inviteFriend: async (d) => { const code = await createOnline(); if (code) { await Soc().invite(d.code, code); toast('Invite sent'); } },
    undo: () => {
      if (!canUndo()) return;
      G.s = G.history.pop();
      if (G.mode === 'ai') while (G.history.length && G.seats[G.s.turn].kind === 'ai') G.s = G.history.pop();
      if (G.mode === 'ai' && G.seats[G.s.turn].kind === 'ai') { /* nothing earlier to return to */ }
      G.sel = null; renderGame(); afterTurnChange();
    },
    musicToggle: (d, e, el) => { const on = !Music.enabled(); Music.setEnabled(on); el.classList.toggle('on', on); },
    toggleHints: () => { setup.hints = !hintsOn(); Store.LS.set('setup', Object.assign(Store.LS.get('setup', {}), { hints: setup.hints })); closeSheet(); toast('Hints ' + (setup.hints ? 'on' : 'off')); if (setup.hints) analyse(); renderGame(); },
    toggleH: () => { G.showH = !G.showH; renderBoard(); renderBar(); },
    endTurn: () => { if (G.s.winner !== null) return showResult(); if (G.busy) return; doAction({ t: 'end' }); },
    gameMenu: () => {
      sheet(`<h3>Menu</h3><div class="menu">
        <div class="card" style="padding:10px 14px"><div class="toggle" style="padding:4px 0"><div><b>🎵 Background music</b><div class="tiny muted">Original guzheng &amp; flute, made live</div></div><span class="sw ${Music.enabled() ? 'on' : ''}" data-act="musicToggle"></span></div>
          <input type="range" min="0" max="100" value="${Math.round(Music.volume * 100)}" id="musicVol" style="width:100%;accent-color:#e6b54a" aria-label="Music volume"></div>
        <button class="btn" data-act="toggleHints">Hints: ${hintsOn() ? 'On' : 'Off'}</button>
        <button class="btn" data-act="guideInGame">How to play</button>
        <button class="btn" data-act="showLog">Move log</button>
        ${G.s.winner === null ? '<button class="btn danger" data-act="resign">Resign</button>' : ''}
        <button class="btn" data-act="leaveGame">Leave game</button></div>`);
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
    leaveGame: () => { Music.stop(); if (G && G.unwatch) G.unwatch(); stopGameTimers(); G = null; go('home'); },
    rematch: () => { closeSheet(); if (G.unwatch) G.unwatch(); startLocal(G.mode); },
    backToGame: () => gameScreen(),
  };
  function rerenderSetup() { const y = window.scrollY; if (document.getElementById('opengames')) { screens.lobby(); } else screens.setup(); window.scrollTo(0, y); }
  async function askKeep(p) {
    const keep = await choose('Stay signed in on this device?', [{ label: 'Yes, keep me signed in', value: 'y', cls: 'primary' }, { label: 'No, ask for my PIN next time', value: 'n' }]);
    if (keep === 'y') Store.LS.set('session', p.id);
    go('home');
  }
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'musicVol') Music.setVolume(e.target.value / 100); });
  document.addEventListener('pointerdown', () => { if (G && document.getElementById('board') && Music.enabled() && !Music.playing) Music.start(); }, { passive: true });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const f = actions[el.dataset.act]; if (f) f(el.dataset, e, el);
  });
  window.addEventListener('beforeunload', () => {});
  if (typeof P2P !== 'undefined') P2P.onStatus((st) => { if (G && G.mode === 'online') { if (st === 'disconnected') toast('Opponent disconnected — waiting for them to come back'); if (st === 'connected') toast('Opponent connected'); } if (st === 'code-taken') toast('That code is busy — create a new game'); });
  const socialHandler = async (ev, d) => {
    if (ev === 'change' && document.getElementById('friends-screen')) { const y = window.scrollY; screens.friends(); window.scrollTo(0, y); }
    if (ev === 'request') toast(d.name + ' wants to be friends — see Friends', 3500);
    if (ev === 'accepted') toast(d.name + ' accepted your friend request');
    if (ev === 'status' && d === 'elsewhere') toast('You’re signed in on another device — friends will reach you there');
    if (ev === 'invite') {
      if (G && G.mode && G.s && G.s.winner === null) { toast(d.name + ' invited you to a game (finish this one first)', 3500); return; }
      const ok = await choose(d.name + ' invited you to play', [{ label: 'Join game ' + d.game, value: true, cls: 'primary' }]);
      if (ok) joinGame(d.game);
    }
    if (ev === 'presence' && document.getElementById('friends-screen')) { const y = window.scrollY; screens.friends(); window.scrollTo(0, y); }
  };
  Social.on(socialHandler); FireSocial.on(socialHandler);
  TurnAlerts.on((ev, d) => {
    if (ev !== 'turn') return;
    if (G && G.mode === 'online' && G.code === d.code) return;
    toast('Your turn vs ' + d.opp + ' (game ' + d.code + ') — open it from Play online', 4000);
  });
  window.__paisho = { get G() { return G; }, doAction, P };
  go('boot');
})();
