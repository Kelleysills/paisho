/* App UI: screens, game controller, online play, stats */
(() => {
  const P = PaiSho, AI = PaiShoAI;
  const app = document.getElementById('app');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const initials = (n) => (n || '?').trim().slice(0, 1).toUpperCase();
  const hueOf = (s) => { let h = 0; for (const ch of s || '') h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const av = (name, cls = '') => `<span class="avatar ${cls}" style="background:hsl(${hueOf(name)},55%,62%)">${esc(initials(name))}</span>`;
  const buzz = (ms = 12) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  let me = null;
  let G = null;
  const setup = { mode: 'ai', level: 'medium', first: 'me', fx: [[], []], fxTab: 0, minH: 4, timer: 0, chance: false, enigma: false, p2: { name: 'Player 2', pid: null } };
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
    bg.innerHTML = `<div class="sheet" style="${opts.tall ? 'height:88dvh' : ''}"><div class="grab"></div>${html}</div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg && !opts.modal) closeSheet(); });
    document.body.appendChild(bg);
    return bg;
  }
  function closeSheet(v) { const s = document.getElementById('sheet'); if (s) s.remove(); if (sheetResolve) { const r = sheetResolve; sheetResolve = null; r(v); } }
  function choose(title, options, sub = '') {
    return new Promise((res) => {
      sheet(`<h3>${esc(title)}</h3>${sub ? `<p class="muted">${sub}</p>` : ''}<div class="menu">${options.map((o, k) => `<button class="btn ${o.cls || ''}" data-act="choose" data-k="${k}">${o.label}</button>`).join('')}<button class="btn ghost" data-act="choose" data-k="-1">Cancel</button></div>`);
      sheetResolve = (k) => res(k == null || k < 0 ? null : options[k].value);
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
  async function players() { try { return (await Store.list('players')).filter((p) => p && p.name).sort((a, b) => a.name.localeCompare(b.name)); } catch (e) { return []; } }
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
  function go(name, ...args) { closeSheet(); stopGameTimers(); if (name !== 'lobby' && lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; } screens[name](...args); window.scrollTo(0, 0); }

  screens.boot = async () => {
    app.innerHTML = `<div class="screen" style="justify-content:center;align-items:center">${logoSvg(140)}<div class="muted">Opening the garden gate…</div></div>`;
    await Store.init();
    const sess = Store.LS.get('session');
    if (sess) { const p = await Store.get('players', sess).catch(() => null); if (p) { me = p; return go('home'); } }
    go('login');
  };

  screens.login = async () => {
    const list = await players();
    const where = { artifact: 'Profiles and stats are saved with this app and shared with everyone you invite.', server: 'Profiles and stats are saved on your PC server.', local: 'Profiles and stats are saved on this device only.' }[Store.kind];
    app.innerHTML = `<div class="screen">
      <div class="title">${logoSvg()}<h1>Pai Sho</h1><div class="sub">Key Pai Sho · The Garden Game</div></div>
      <div class="field"><label>Who's playing?</label></div>
      <div class="plist">${list.map((p) => `<button class="prof" data-act="pickProfile" data-id="${esc(p.id)}">${av(p.name)}<div><div class="nm">${esc(p.name)}</div><div class="tiny muted">${(p.stats && p.stats.games) || 0} games · ${(p.stats && p.stats.wins) || 0} wins ${p.cred ? '· 🔒 biometric' : ''}</div></div></button>`).join('') || '<div class="card muted">No players yet. Create one to track your stats.</div>'}</div>
      <button class="btn primary" data-act="newProfile">＋ New player</button>
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
        <div class="field"><label>PIN (4–6 digits)</label><input class="input" id="np-pin" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" type="password" required></div>
        <div class="field"><label>Confirm PIN</label><input class="input" id="np-pin2" inputmode="numeric" maxlength="6" type="password" required></div>
        <div class="toggle"><div><b>Use biometrics</b><div class="tiny muted">${bio ? 'Face / fingerprint unlock on this device' : 'Not available in this browser — PIN only'}</div></div><span class="sw ${bio ? 'on' : ''}" id="np-bio" data-act="sw" ${bio ? '' : 'style="opacity:.4"'}></span></div>
        <div class="toggle"><div><b>Keep me signed in</b><div class="tiny muted">On this device</div></div><span class="sw on" id="np-keep" data-act="sw"></span></div>
        <div class="tiny muted">Your PIN keeps casual players out of your stats. It isn't bank-grade security — don't reuse an important PIN.</div>
        <button class="btn primary" type="submit">Create player</button></form>`;
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
      const p = { id, name, salt, pin: await Auth.hash(pin, salt), created: Date.now(), stats: emptyStats(), cred: null };
      if (bio && document.getElementById('np-bio').classList.contains('on')) {
        try { p.cred = await Auth.bioRegister(p); } catch (err) { toast('Biometric setup skipped — PIN only'); }
      }
      try { await Store.set('players', id, p); } catch (err) { return toast('Couldn’t save the player (no write access?)'); }
      me = p;
      if (document.getElementById('np-keep').classList.contains('on')) Store.LS.set('session', id);
      go('home');
    });
  };

  screens.home = () => {
    const nm = myName();
    const st = (me && me.stats) || null;
    app.innerHTML = `<div class="screen">
      <div class="row"><button class="pill" data-act="profileSheet">${av(nm)}${esc(nm)}</button><span class="spacer"></span><button class="iconbtn" data-act="go" data-to="guide" aria-label="Rules">?</button></div>
      <div class="title" style="padding-top:4px">${logoSvg(110)}<h1>Pai Sho</h1><div class="sub">${st ? `${st.wins}W · ${st.losses}L · ${st.draws}D` : 'Guest mode'}</div></div>
      <div class="menu">
        <button class="btn primary" data-act="startSetup" data-mode="ai">${icon('cpu')}<span class="lbl">Play the computer<small>Easy, medium or hard</small></span></button>
        <button class="btn" data-act="startSetup" data-mode="local">${icon('pass')}<span class="lbl">Pass &amp; play<small>Two players, one phone</small></span></button>
        <button class="btn" data-act="go" data-to="lobby">${icon('net')}<span class="lbl">Play online<small>${Store.online() ? 'Create or join a game with a code' : 'Needs the hosted version'}</small></span></button>
        <button class="btn" data-act="go" data-to="guide">${icon('book')}<span class="lbl">How to play<small>Rules, tiles &amp; diagrams</small></span></button>
        <button class="btn" data-act="go" data-to="stats">${icon('chart')}<span class="lbl">Stats &amp; leaderboard<small>${me ? 'Your record and everyone’s' : 'Sign in to track stats'}</small></span></button>
      </div></div>`;
  };
  function icon(k) {
    const s = { cpu: Glyphs.svg('wheel', 1, 'class="ic"'), pass: Glyphs.svg('koi', 0, 'class="ic"'), net: Glyphs.svg('skybison', 1, 'class="ic"'), book: Glyphs.svg('lotus', 0, 'class="ic"'), chart: Glyphs.svg('jasmine', 1, 'class="ic"') };
    return s[k];
  }

  screens.guide = (fromGame) => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="${fromGame ? 'backToGame' : 'go'}" data-to="home">‹</button><h2>How to play</h2><span style="width:42px"></span></div>${Guide.html()}`;
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
        <div class="row wrap" style="margin:10px 0"><button class="btn small" data-act="fxPreset" data-v="none">Beginner (none)</button><button class="btn small" data-act="fxPreset" data-v="flowers">4 special flowers</button><button class="btn small" data-act="fxPreset" data-v="rand">Random 6</button></div>
        ${fxGrid(fxSel)}
        ${S.mode === 'ai' ? `<div class="tiny muted" style="margin-top:8px">The computer uses: ${AI.AI_EFFECTS[S.level].map(P.tname).join(', ') || 'no effect tiles'}.</div>` : ''}
      </div>
      ${variationsCard()}
      <button class="btn primary" data-act="beginGame">Start game</button>
    </div>`;
  };
  function fxGrid(sel) {
    return `<div class="fx-grid">${P.EFFECT_TYPES.map((t) => `<button class="fx ${sel.includes(t) ? 'on' : ''}" data-act="fx" data-t="${t}">${Glyphs.svg(t, 0)}<span class="nm">${P.tname(t)}</span><span class="ty">${P.isSpecial(t) ? 'flower' : 'accent'}</span></button>`).join('')}</div>`;
  }
  function variationsCard() {
    const S = setup;
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${S[key] == v ? 'on' : ''}" data-act="seg" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="card"><b class="disp" style="color:var(--gold2)">Variations</b>
      <div class="field" style="margin-top:10px"><label>Harmonies needed in the ring</label>${seg('minH', [[3, '3'], [4, '4'], [6, '6'], [10, '10']])}</div>
      <div class="field" style="margin-top:10px"><label>Turn timer</label>${seg('timer', [[0, 'Off'], [30, '30s'], [60, '60s'], [120, '2m']])}</div>
      <div class="toggle"><div><b>Game of chance</b><div class="tiny muted">Key flowers are drawn at random when planting</div></div><span class="sw ${S.chance ? 'on' : ''}" data-act="swSet" data-k="chance"></span></div>
      <div class="toggle"><div><b>Effect tile enigma</b><div class="tiny muted">Hide your opponent’s effect tiles until played</div></div><span class="sw ${S.enigma ? 'on' : ''}" data-act="swSet" data-k="enigma"></span></div></div>`;
  }

  // ---------- lobby (online) ----------
  let lobbyUnsub = null;
  screens.lobby = () => {
    if (lobbyUnsub) { lobbyUnsub(); lobbyUnsub = null; }
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
      <div class="field"><label>Open games</label><div id="opengames" class="menu"><div class="muted tiny">Loading…</div></div></div>
      <div class="card"><div class="row"><b class="disp" style="color:var(--gold2)">Your effect tiles</b><span class="spacer"></span><span class="muted">${S.fx[0].length}/6</span></div><div class="row wrap" style="margin:10px 0"><button class="btn small" data-act="fxPreset" data-v="none">None</button><button class="btn small" data-act="fxPreset" data-v="flowers">4 flowers</button><button class="btn small" data-act="fxPreset" data-v="rand">Random</button></div>${fxGrid(S.fx[0])}</div>
      ${variationsCard().replace('<b class="disp" style="color:var(--gold2)">Variations</b>', '<b class="disp" style="color:var(--gold2)">Variations (for games you create)</b>')}
      <div class="tiny muted">Friends need access to this app to join: share it with them as editors.</div>
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
      host: { pid: myPid(), name: myName(), fx: S.fx[0].slice() }, guest: null };
    try { await Store.set('games', code, doc); } catch (e) { return toast('Couldn’t create the game (no write access?)'); }
    waitOnline(code);
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
    const d = await Store.get('games', code).catch(() => null);
    if (!d) return toast('No game with that code');
    const pid = myPid();
    if (d.host.pid === pid) return d.status === 'open' ? waitOnline(code) : startOnline(d);
    if (d.guest && d.guest.pid === pid) return startOnline(d);
    if (d.status !== 'open') return toast('That game already has two players');
    const guest = { pid, name: myName(), fx: setup.fx[0].slice() };
    const s = P.newGame({ effects: [guest.fx, d.host.fx], minHarmonies: d.opts.minH, chance: d.opts.chance });
    const nd = Object.assign({}, d, { guest, status: 'playing', state: JSON.stringify(s), ver: 1, updated: Date.now() });
    delete nd.id;
    try { await Store.set('games', code, nd); } catch (e) { return toast('Couldn’t join (no write access?)'); }
    startOnline(Object.assign({ id: code }, nd));
  }

  // ---------- stats ----------
  screens.stats = async () => {
    app.innerHTML = `<div class="topbar"><button class="iconbtn" data-act="go" data-to="home">‹</button><h2>Stats</h2><span style="width:42px"></span></div><div class="screen" id="statbody"><div class="muted">Loading…</div></div>`;
    const list = await players();
    if (me) { const fresh = list.find((p) => p.id === me.id); if (fresh) me = fresh; }
    const st = me ? Object.assign(emptyStats(), me.stats || {}) : null;
    const rec = (a) => `${a[0]}–${a[1]}–${a[2]}`;
    const pct = (s) => (s.games ? Math.round((100 * s.wins) / s.games) + '%' : '—');
    const body = document.getElementById('statbody'); if (!body) return;
    body.innerHTML = (st ? `<div class="row">${av(me.name)}<h3 class="disp" style="color:var(--gold2)">${esc(me.name)}</h3></div>
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
    Store.LS.set('setup', { level: S.level, first: S.first, fx: S.fx, minH: S.minH, timer: S.timer, chance: S.chance, enigma: S.enigma });
    let meFirst = S.first === 'me' || (S.first === 'rand' && Math.random() < 0.5);
    const human = { name: myName(), pid: me ? me.id : null, kind: 'human' };
    const other = mode === 'ai' ? { name: 'Computer · ' + S.level[0].toUpperCase() + S.level.slice(1), kind: 'ai', level: S.level } : { name: S.p2.name, pid: S.p2.pid, kind: 'human' };
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
    const seats = [{ name: d.guest.name, pid: d.guest.pid, kind: my === 0 ? 'human' : 'remote' }, { name: d.host.name, pid: d.host.pid, kind: my === 1 ? 'human' : 'remote' }];
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
      sel.moves.forEach((m) => { if (seenTo.has(m.to)) return; seenTo.add(m.to); o += G.s.board[m.to] ? ringAt(Board.cx(m.to), Board.cy(m.to)) : dotAt(Board.cx(m.to), Board.cy(m.to)); });
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
    el.innerHTML = [0, 1].map((k) => `<div class="seat ${G.s.turn === k && G.s.winner === null ? 'active' : ''}"><svg class="disc" viewBox="-1.1 -1.1 2.2 2.2">${Glyphs.tile(k === 0 ? 'lotus' : 'lotus', k)}</svg>
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
  function renderInfo(type, owner) {
    const el = document.getElementById('info'); if (!el) return;
    if (!type) { el.innerHTML = `<span>Tap any tile for its rules. Gold lines are harmonies.</span>`; return; }
    const inf = Guide.INFO[type];
    el.innerHTML = `${Glyphs.svg(type, owner == null ? 0 : owner)}<span><b>${P.tname(type)}</b> · ${inf[0]}. ${inf[1]}</span>`;
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
    pickProfile: async (d) => { const p = await Store.get('players', d.id); if (!p) return toast('Player not found'); loginFlow(p, (pp) => { me = pp; askKeep(pp); }); },
    newProfile: () => go('newProfile'),
    guestPlay: () => { me = null; Store.LS.set('session', null); go('home'); },
    sw: (d, e, el) => el.classList.toggle('on'),
    swSet: (d, e, el) => { setup[d.k] = !setup[d.k]; el.classList.toggle('on', setup[d.k]); },
    profileSheet: async () => {
      if (!me) return sheet(`<h3>Guest</h3><p class="muted">Guests don’t get stats.</p><div class="menu"><button class="btn primary" data-act="toLogin">Sign in or create a player</button></div>`);
      const bio = await Auth.bioAvailable();
      sheet(`<h3>${esc(me.name)}</h3><div class="menu">
        <button class="btn" data-act="go" data-to="stats">Stats</button>
        ${bio ? `<button class="btn" data-act="bioToggle">${me.cred ? 'Turn off biometric unlock' : 'Turn on biometric unlock'}</button>` : '<div class="tiny muted">Biometric unlock isn’t available in this browser — your PIN works everywhere.</div>'}
        <button class="btn" data-act="changePin">Change PIN</button>
        <button class="btn" data-act="signOut">Sign out</button>
        <button class="btn danger" data-act="deleteMe">Delete this player</button></div>`);
    },
    toLogin: () => go('login'),
    signOut: () => { me = null; Store.LS.set('session', null); go('login'); },
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
    startSetup: (d) => { setup.mode = d.mode; setup.fxTab = 0; go('setup'); },
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
        loginFlow(p, (pp) => { setup.p2 = { name: pp.name, pid: pp.id }; go('setup'); }, 'setup');
      }
    },
    beginGame: () => startLocal(setup.mode),
    joinCode: () => joinGame(document.getElementById('joincode').value),
    joinGame: (d) => joinGame(d.code),
    resumeOnline: async (d) => { const g = await Store.get('games', d.code); if (!g) return; if (g.status === 'open') waitOnline(d.code); else startOnline(g); },
    createOnline: () => createOnline(),
    cancelOnline: async (d) => { if (G && G.waitingUnsub) G.waitingUnsub(); const g = await Store.get('games', d.code).catch(() => null); if (g && g.status === 'open') await Store.del('games', d.code).catch(() => {}); go('lobby'); },
    copyCode: async (d) => { try { await navigator.clipboard.writeText(d.code); toast('Copied'); } catch (e) { toast('Code: ' + d.code); } },
    trayTap: (d) => trayTap(d.t),
    undo: () => {
      if (!canUndo()) return;
      G.s = G.history.pop();
      if (G.mode === 'ai') while (G.history.length && G.seats[G.s.turn].kind === 'ai') G.s = G.history.pop();
      if (G.mode === 'ai' && G.seats[G.s.turn].kind === 'ai') { /* nothing earlier to return to */ }
      G.sel = null; renderGame(); afterTurnChange();
    },
    toggleH: () => { G.showH = !G.showH; renderBoard(); renderBar(); },
    endTurn: () => { if (G.s.winner !== null) return showResult(); if (G.busy) return; doAction({ t: 'end' }); },
    gameMenu: () => {
      sheet(`<h3>Menu</h3><div class="menu">
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
    leaveGame: () => { if (G && G.unwatch) G.unwatch(); stopGameTimers(); G = null; go('home'); },
    rematch: () => { closeSheet(); if (G.unwatch) G.unwatch(); startLocal(G.mode); },
    backToGame: () => gameScreen(),
  };
  function rerenderSetup() { const y = window.scrollY; if (document.getElementById('opengames')) { screens.lobby(); } else screens.setup(); window.scrollTo(0, y); }
  async function askKeep(p) {
    const keep = await choose('Stay signed in on this device?', [{ label: 'Yes, keep me signed in', value: 'y', cls: 'primary' }, { label: 'No, ask for my PIN next time', value: 'n' }]);
    if (keep === 'y') Store.LS.set('session', p.id);
    go('home');
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const f = actions[el.dataset.act]; if (f) f(el.dataset, e, el);
  });
  window.addEventListener('beforeunload', () => {});
  window.__paisho = { get G() { return G; }, doAction, P };
  go('boot');
})();
