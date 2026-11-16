/* Key Pai Sho rules engine — pure JS, JSON-serializable state.
   Players: 0 = Guest (moves first), 1 = Host. */
const PaiSho = (() => {
  const N = 18;
  const R = 9; // board radius in squares
  const idx = (r, c) => r * N + c;
  const rc = (i) => [Math.floor(i / N), i % N];
  const xy = (i) => { const [r, c] = rc(i); return [c - 8.5, 8.5 - r]; };

  const ORTHO = [[-1,0],[1,0],[0,-1],[0,1]];
  const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]];
  const ALL8 = ORTHO.concat(DIAG);

  const KEY = {
    rose:   { color: 'dark',  dirs: 'all',   range: 3, name: 'Rose' },
    chrys:  { color: 'dark',  dirs: 'ortho', range: 5, name: 'Chrysanthemum' },
    rhodo:  { color: 'dark',  dirs: 'diag',  range: 5, name: 'Rhododendron' },
    lily:   { color: 'light', dirs: 'all',   range: 3, name: 'Lily' },
    jasmine:{ color: 'light', dirs: 'ortho', range: 5, name: 'Jasmine' },
    jade:   { color: 'light', dirs: 'diag',  range: 5, name: 'Jade' },
  };
  const SPECIAL = {
    orchid:  { name: 'Orchid' },
    lotus:   { name: 'White Lotus' },
    firelily:{ name: 'Firelily' },
    dahlia:  { name: 'Dahlia' },
  };
  const ACCENT = {
    stone:     { range: 0, name: 'Stone' },
    knotweed:  { range: 2, name: 'Knotweed' },
    wheel:     { range: 3, name: 'Wheel' },
    boat:      { range: 4, name: 'Boat' },
    badgermole:{ range: 5, name: 'Badgermole' },
    dragon:    { range: 5, name: 'Dragon' },
    skybison:  { range: 5, name: 'Sky Bison' },
    koi:       { range: 5, name: 'Koi' },
  };
  const KEY_TYPES = Object.keys(KEY);
  const EFFECT_TYPES = Object.keys(SPECIAL).concat(Object.keys(ACCENT));
  const isKey = (t) => !!KEY[t];
  const isSpecial = (t) => !!SPECIAL[t];
  const isFlower = (t) => isKey(t) || isSpecial(t);
  const isAccent = (t) => !!ACCENT[t];
  const isCarrier = (t) => t === 'badgermole' || t === 'skybison';
  const dirsOf = (d) => d === 'all' ? ALL8 : d === 'ortho' ? ORTHO : DIAG;
  const tname = (t) => (KEY[t] || SPECIAL[t] || ACCENT[t] || {}).name || t;

  // ---------- static board geometry ----------
  const onBoard = new Array(N * N).fill(false);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    let inside = 0; const S = 12;
    for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
      const x = c - 9 + (a + 0.5) / S, y = 9 - r - (b + 0.5) / S;
      if (x * x + y * y <= R * R) inside++;
    }
    onBoard[idx(r, c)] = inside / (S * S) > 0.5;
  }
  // gates: 0 N, 1 E, 2 S, 3 W — each a 2x2 block at the edge midpoint
  const GATE_BLOCK = [[0, 8], [8, 16], [16, 8], [8, 0]];
  const GATE_NAMES = ['North', 'East', 'South', 'West'];
  const gateSquares = GATE_BLOCK.map(([r0, c0]) => [idx(r0, c0), idx(r0, c0 + 1), idx(r0 + 1, c0), idx(r0 + 1, c0 + 1)]);
  const gateOfSq = new Array(N * N).fill(-1);
  gateSquares.forEach((sqs, g) => sqs.forEach((s) => (gateOfSq[s] = g)));
  const gateExits = GATE_BLOCK.map(([r0, c0]) => {
    const out = [];
    for (let r = r0 - 1; r <= r0 + 2; r++) for (let c = c0 - 1; c <= c0 + 2; c++) {
      if (r < 0 || c < 0 || r >= N || c >= N) continue;
      if (r >= r0 && r <= r0 + 1 && c >= c0 && c <= c0 + 1) continue;
      if (onBoard[idx(r, c)]) out.push(idx(r, c));
    }
    return out;
  });
  const CENTER_SQ = [idx(8, 8), idx(8, 9), idx(9, 8), idx(9, 9)];
  const sqType = new Array(N * N).fill('off');
  const quadrant = new Array(N * N).fill(-1);
  for (let i = 0; i < N * N; i++) {
    if (!onBoard[i]) continue;
    const [x, y] = xy(i);
    const s = Math.abs(x) + Math.abs(y);
    const q = y > 0 ? (x < 0 ? 0 : 1) : (x < 0 ? 2 : 3); // 0 TL,1 TR,2 BL,3 BR
    quadrant[i] = q;
    if (gateOfSq[i] >= 0) sqType[i] = 'gate';
    else if (s <= 8) sqType[i] = (q === 0 || q === 3) ? 'light' : 'dark';
    else if (s === 9) sqType[i] = 'half';
    else sqType[i] = 'neutral';
  }
  const step = (i, dr, dc) => {
    const [r, c] = rc(i); const r2 = r + dr, c2 = c + dc;
    if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) return -1;
    const j = idx(r2, c2);
    return onBoard[j] ? j : -1;
  };
  const neighbors = (i) => ALL8.map(([a, b]) => step(i, a, b)).filter((j) => j >= 0);
  const RING_ORDER = [[-1,-1],[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1]]; // clockwise

  // ---------- state ----------
  function newGame(opts = {}) {
    const o = Object.assign({ minHarmonies: 4, effects: [[], []], chance: false, maxTurns: 400 }, opts);
    const hands = [0, 1].map((p) => {
      const h = {}; KEY_TYPES.forEach((t) => (h[t] = 3));
      (o.effects[p] || []).slice(0, 6).forEach((t) => { if (EFFECT_TYPES.includes(t)) h[t] = 1; });
      return h;
    });
    return {
      v: 1, board: new Array(N * N).fill(null), gates: [null, null, null, null], center: null,
      hands, turn: 0, turnNo: 1, nextId: 1, winner: null, winReason: '', removed: [],
      tp: freshTP(), opts: o, log: [], lastMove: null,
    };
  }
  function freshTP() { return { mainDone: false, placed: false, used: {}, extra: null, mustLotus: false }; }
  const clone = (s) => JSON.parse(JSON.stringify(s));

  // ---------- queries ----------
  const cell = (s, i) => s.board[i];
  const topAt = (s, i) => (s.board[i] ? s.board[i].top : null);
  const isGateSq = (s, i) => gateOfSq[i] >= 0 || (s.center && CENTER_SQ.includes(i));
  const plantedCount = (s, p) => s.gates.filter((t) => t && t.owner === p).length + (s.center && s.center.owner === p ? 1 : 0);
  function protectedByBadger(s, i) { const c = s.board[i]; return !!(c && c.under && c.under.type === 'badgermole'); }
  function onSkybison(s, i) { const c = s.board[i]; return !!(c && c.under && c.under.type === 'skybison'); }
  function knotted(s, i) {
    if (protectedByBadger(s, i)) return false;
    return neighbors(i).some((j) => { const t = topAt(s, j); return t && t.type === 'knotweed'; });
  }
  function stoneAllows(s, p, i) {
    const q = quadrant[i];
    for (let j = 0; j < N * N; j++) { const t = topAt(s, j); if (t && t.type === 'stone' && t.owner === p && quadrant[j] === q) return true; }
    return false;
  }
  // can tile physically end in square i (ignoring occupancy)
  function colorOK(s, tile, i) {
    if (!onBoard[i] || isGateSq(s, i)) return false;
    if (!isKey(tile.type)) return true;
    const st = sqType[i];
    const bad = KEY[tile.type].color === 'dark' ? 'light' : 'dark';
    if (st !== bad) return true;
    return stoneAllows(s, tile.owner, i);
  }
  const isLoneCarrier = (s, i) => { const c = s.board[i]; return !!(c && !c.under && isCarrier(c.top.type)); };
  const isLoneDragon = (s, i) => { const c = s.board[i]; return !!(c && !c.under && c.top.type === 'dragon'); };
  const isEffect = (t) => isSpecial(t) || isAccent(t);

  // ---------- movement generation ----------
  // returns array of {to, path?} destinations for a flower moving from square/gate/center
  function flowerDests(s, tile, from) {
    const t = tile.type;
    const res = new Map();
    const passable = (j) => j >= 0 && !isGateSq(s, j) && !s.board[j];
    const finalOK = (j) => {
      if (j < 0 || !colorOK(s, tile, j)) return false;
      const c = s.board[j];
      if (!c) return true;
      if (isLoneCarrier(s, j)) return true; // land on top of a badgermole / sky bison
      if (isEffect(t) && isLoneDragon(s, j)) return true; // effect tile on dragon removes it
      return false;
    };
    const add = (j) => { if (finalOK(j)) res.set(j, true); };
    // starting cells for the first step
    let starts; // list of [square, stepsUsed] where square is already step 1
    if (from.kind === 'sq') starts = null;
    else if (from.kind === 'gate') starts = gateExits[from.g];
    else starts = CENTER_SQ; // lotus leaving centre
    const centerFree = from.kind === 'center'; // centre squares become normal once lotus leaves
    const passableC = (j) => j >= 0 && !s.board[j] && (!isGateSq(s, j) || (centerFree && CENTER_SQ.includes(j)));
    const finalOKC = (j) => {
      if (centerFree && CENTER_SQ.includes(j)) return !s.board[j];
      return finalOK(j);
    };

    if (isKey(t) || t === 'orchid' || t === 'dahlia') {
      const dirs = isKey(t) ? dirsOf(KEY[t].dirs) : ALL8;
      const range = isKey(t) ? KEY[t].range : t === 'orchid' ? 1 : 99;
      const over = t === 'dahlia';
      const lineFrom = (i0, left) => {
        for (const [dr, dc] of dirs) {
          let j = i0;
          for (let k = 0; k < left; k++) {
            j = step(j, dr, dc);
            if (j < 0 || isGateSq(s, j)) break;
            if (s.board[j]) { if (!over) { add(j); break; } else continue; }
            add(j);
          }
        }
      };
      if (!starts) lineFrom(from.i, range);
      else for (const e of starts) {
        if (s.board[e]) { if (!over) add(e); continue; }
        add(e);
        lineFrom(e, range - 1);
      }
      if (t === 'dahlia') { // must land beside another tile
        for (const j of [...res.keys()]) {
          const ok = neighbors(j).some((n) => n !== (from.kind === 'sq' ? from.i : -1) && s.board[n]);
          if (!ok && !s.board[j]) res.delete(j);
        }
      }
    } else { // lotus (2 steps) / firelily (6 steps): BFS of single steps
      const maxSteps = t === 'lotus' ? 2 : 6;
      const seen = new Map();
      let frontier = [];
      if (!starts) frontier = [from.i];
      else {
        for (const e of starts) {
          if (passableC(e)) { seen.set(e, 1); frontier.push(e); if (finalOKC(e)) res.set(e, true); }
          else if (finalOK(e)) res.set(e, true);
        }
      }
      const used0 = starts ? 1 : 0;
      for (let d = used0; d < maxSteps; d++) {
        const next = [];
        for (const f of frontier) for (const n of neighbors(f)) {
          if (seen.has(n) || n === from.i) continue;
          if (passable(n)) { seen.set(n, d + 1); next.push(n); add(n); }
          else if (finalOK(n)) res.set(n, true);
        }
        frontier = next;
      }
    }
    return [...res.keys()];
  }

  function accentDests(s, tile, i, carrying) {
    const t = tile.type; const range = ACCENT[t].range; const res = [];
    if (range === 0) return res;
    const top = carrying ? s.board[i].top : null;
    for (const [dr, dc] of ALL8) {
      let j = i;
      for (let k = 0; k < range; k++) {
        j = step(j, dr, dc);
        if (j < 0 || isGateSq(s, j)) break;
        const c = s.board[j];
        if (!c) {
          if (top && !colorOK(s, top, j)) continue;
          res.push(j); continue;
        }
        // landing on an occupied square
        if (isLoneDragon(s, j) && !carrying) { res.push(j); continue; }
        if (t === 'dragon' && !c.under) { res.push(j); continue; }
        if (t === 'dragon' && c.under && c.under.type === 'skybison') { res.push(j); continue; }
        if (isCarrier(t) && !carrying && !c.under && c.top.type !== 'dragon') { res.push(j); continue; }
      }
    }
    return [...new Set(res)];
  }

  // which of my pieces can make a "move" right now, as move actions
  function moveActions(s, p, only) {
    const acts = [];
    const pushMoves = (from, tile, dests, extra = {}) => dests.forEach((to) => acts.push(Object.assign({ t: 'move', from, to }, extra)));
    // planted flowers
    s.gates.forEach((tile, g) => {
      if (!tile || tile.owner !== p) return;
      if (only && only !== tile.id) return;
      pushMoves({ kind: 'gate', g }, tile, flowerDests(s, tile, { kind: 'gate', g }));
    });
    if (s.center && s.center.owner === p && (!only || only === s.center.tile.id)) {
      pushMoves({ kind: 'center' }, s.center.tile, flowerDests(s, s.center.tile, { kind: 'center' }));
    }
    for (let i = 0; i < N * N; i++) {
      const c = s.board[i]; if (!c) continue;
      const top = c.top;
      if (top.owner === p && (!only || only === top.id)) {
        if (isFlower(top.type)) {
          if (!knotted(s, i)) pushMoves({ kind: 'sq', i }, top, flowerDests(s, top, { kind: 'sq', i }));
        } else if (isAccent(top.type) && !c.under) {
          const ds = accentDests(s, top, i, false);
          pushMoves({ kind: 'sq', i }, top, ds);
          if (top.type === 'boat') ds.forEach((to) => { if (boatValid(s, i, to)) acts.push({ t: 'move', from: { kind: 'sq', i }, to, boat: true }); });
        }
      }
      if (c.under && c.under.owner === p && (!only || only === c.under.id)) {
        // carrier underneath someone: move carrying or alone
        accentDests(s, c.under, i, true).forEach((to) => { if (!s.board[to]) acts.push({ t: 'move', from: { kind: 'sq', i }, to, carry: true, mover: 'under' }); });
        accentDests(s, c.under, i, false).forEach((to) => acts.push({ t: 'move', from: { kind: 'sq', i }, to, carry: false, mover: 'under' }));
      }
    }
    return acts;
  }

  function boatValid(s, from, to) {
    const [r0, c0] = rc(from), [r1, c1] = rc(to);
    const dr = r1 - r0, dc = c1 - c0;
    const group = neighbors(from).filter((j) => s.board[j]);
    if (!group.length) return false;
    const moving = new Set([from, ...group]);
    for (const j of group) {
      if (protectedByBadger(s, j)) return false;
      const [r, c] = rc(j); const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || c2 < 0 || r2 >= N || c2 >= N) return false;
      const k = idx(r2, c2);
      if (!onBoard[k] || isGateSq(s, k)) return false;
      if (s.board[k] && !moving.has(k)) return false;
      if (k === to) return false;
      const top = s.board[j].top; if (!colorOK(s, top, k)) return false;
      if (s.board[j].under && !colorOK(s, s.board[j].under, k)) return false;
    }
    if (s.board[to]) return false;
    return true;
  }

  function wheelOptions(s, i) {
    const out = [];
    const ring = RING_ORDER.map(([a, b]) => step(i, a, b));
    const occ = ring.map((j) => (j >= 0 ? s.board[j] : null));
    if (!occ.some(Boolean)) return out;
    for (const dir of [1, -1]) for (let n = 1; n <= 3; n++) {
      let ok = true;
      for (let k = 0; k < 8 && ok; k++) {
        if (!occ[k]) continue;
        if (protectedByBadger(s, ring[k])) { ok = false; break; }
        const dest = ring[(k + dir * n + 80) % 8];
        if (dest < 0 || isGateSq(s, dest)) { ok = false; break; }
        if (!colorOK(s, occ[k].top, dest)) ok = false;
      }
      if (ok) out.push({ t: 'wheel', i, dir, n });
    }
    return out;
  }
  function koiOptions(s, i) {
    const out = [];
    for (const [dr, dc] of [[-1, 0], [0, -1], [-1, -1], [-1, 1]]) {
      const side = (a, b) => { const l = []; let j = i; for (;;) { j = step(j, a, b); if (j < 0) break; if (s.board[j]) l.push(j); } return l; };
      const A = side(dr, dc), B = side(-dr, -dc);
      for (const a of A) for (const b of B) {
        if (protectedByBadger(s, a) || protectedByBadger(s, b)) continue;
        if (isGateSq(s, a) || isGateSq(s, b)) continue;
        const ta = s.board[a], tb = s.board[b];
        if (!colorOK(s, ta.top, b) || !colorOK(s, tb.top, a)) continue;
        out.push({ t: 'koi', i, a, b });
      }
    }
    return out;
  }

  function placeActions(s, p) {
    const out = [];
    const h = s.hands[p];
    for (const type of Object.keys(ACCENT)) {
      if (!h[type]) continue;
      for (let i = 0; i < N * N; i++) {
        const c = s.board[i]; if (!c || c.under || c.top.owner !== p) continue;
        if (type === 'wheel') { if (isAccent(c.top.type) && c.top.type !== 'wheel') out.push({ t: 'place', type, target: i, at: i }); }
        else if (isFlower(c.top.type)) out.push({ t: 'place', type, target: i, at: i });
      }
    }
    return out;
  }
  function stoneSpots(s) { const o = []; for (let i = 0; i < N * N; i++) if (onBoard[i] && !isGateSq(s, i) && !s.board[i]) o.push(i); return o; }

  function plantActions(s, p) {
    const out = [];
    if (plantedCount(s, p) >= 2) return out;
    const h = s.hands[p];
    const types = Object.keys(h).filter((t) => h[t] > 0 && isFlower(t));
    s.gates.forEach((g, gi) => { if (!g) types.forEach((type) => out.push({ t: 'plant', type, gate: gi })); });
    if (h.lotus && !s.center && CENTER_SQ.every((i) => !s.board[i])) out.push({ t: 'plant', type: 'lotus', gate: 'center' });
    return out;
  }

  function legalActions(s, opts = {}) {
    if (s.winner !== null) return [];
    const p = s.turn, tp = s.tp, out = [];
    if (!tp.mainDone) {
      if (tp.mustLotus && s.center && s.center.owner === p) {
        const lm = moveActions(s, p, s.center.tile.id);
        if (lm.length) out.push(...lm); else { out.push(...plantActions(s, p), ...moveActions(s, p)); }
      } else out.push(...plantActions(s, p), ...moveActions(s, p));
    } else if (tp.extra) out.push(...moveActions(s, p, tp.extra.only || null));
    if (!tp.placed && !opts.noPlace) out.push(...placeActions(s, p));
    if (!opts.noAbility) for (let i = 0; i < N * N; i++) {
      const c = s.board[i]; if (!c || c.under || c.top.owner !== p || tp.used[c.top.id]) continue;
      if (c.top.type === 'wheel') out.push(...wheelOptions(s, i));
      if (c.top.type === 'koi') out.push(...koiOptions(s, i));
    }
    const mainAvail = tp.mainDone || !out.some((a) => a.t === 'move' || a.t === 'plant');
    if (tp.mainDone || mainAvail) out.push({ t: 'end' });
    return out;
  }

  // ---------- applying actions ----------
  function returnToHand(s, tile) {
    if (!tile) return;
    s.hands[tile.owner][tile.type] = (s.hands[tile.owner][tile.type] || 0) + 1;
  }
  function apply(s0, a) {
    const s = clone(s0); const p = s.turn; const tp = s.tp;
    const desc = describe(s0, a);
    if (a.t === 'plant') {
      if (s.hands[p][a.type] <= 0) throw new Error('No tile');
      s.hands[p][a.type]--;
      const tile = { id: s.nextId++, owner: p, type: a.type };
      if (a.gate === 'center') { s.center = { owner: p, tile }; }
      else { if (s.gates[a.gate]) throw new Error('Gate occupied'); s.gates[a.gate] = tile; }
      tp.mainDone = true;
      s.lastMove = { to: a.gate === 'center' ? 'center' : 'g' + a.gate };
    } else if (a.t === 'move') {
      let tile, carriedTop = null;
      const wasExtra = tp.mainDone;
      if (a.from.kind === 'gate') { tile = s.gates[a.from.g]; s.gates[a.from.g] = null; }
      else if (a.from.kind === 'center') { tile = s.center.tile; s.center = null; }
      const fromI = a.from.kind === 'sq' ? a.from.i : -1;
      if (a.from.kind === 'sq') {
        const c = s.board[a.from.i];
        if (a.mover === 'under') {
          tile = c.under;
          if (a.carry) { s.board[a.from.i] = null; landCarrier(s, a.to, { top: c.top, under: c.under }); carriedTop = c.top; }
          else { s.board[a.from.i] = { top: c.top, under: null }; landAccent(s, a.to, c.under); }
        } else {
          tile = c.top;
          s.board[a.from.i] = c.under ? { top: c.under, under: null } : null;
          if (a.boat) {
            const [r0, c0] = rc(a.from.i), [r1, c1] = rc(a.to);
            const group = neighbors(a.from.i).filter((j) => s.board[j]);
            const lifted = group.map((j) => [j, s.board[j]]);
            group.forEach((j) => (s.board[j] = null));
            lifted.forEach(([j, cc]) => { const [r, c2] = rc(j); s.board[idx(r + r1 - r0, c2 + c1 - c0)] = cc; });
            s.board[a.to] = { top: tile, under: null };
          } else if (isFlower(tile.type)) landFlower(s, a.to, tile);
          else landAccent(s, a.to, tile);
        }
      } else landFlower(s, a.to, tile);
      tp.extra = null;
      if (!wasExtra) {
        tp.mainDone = true;
        if (tile.type === 'orchid' && a.mover !== 'under') tp.extra = { only: null, kind: 'orchid' };
      }
      if (carriedTop && tile.type === 'skybison') tp.extra = { only: carriedTop.id, kind: 'bison' };
      if (tp.mustLotus && tile.type === 'lotus') tp.mustLotus = false;
      s.lastMove = { from: a.from.kind === 'sq' ? a.from.i : a.from.kind === 'gate' ? 'g' + a.from.g : 'center', to: a.to };
    } else if (a.t === 'place') {
      if (tp.placed) throw new Error('Already placed');
      if (!s.hands[p][a.type]) throw new Error('No accent');
      const c = s.board[a.target];
      if (!c || c.under || c.top.owner !== p) throw new Error('Bad target');
      if (a.at !== a.target && (a.type !== 'stone' || s.board[a.at] || isGateSq(s, a.at) || !onBoard[a.at])) throw new Error('Bad spot');
      s.hands[p][a.type]--;
      returnToHand(s, c.top);
      const tile = { id: s.nextId++, owner: p, type: a.type };
      s.board[a.target] = null;
      s.board[a.at] = { top: tile, under: null };
      tp.placed = true;
      s.lastMove = { to: a.at };
    } else if (a.t === 'wheel') {
      const ring = RING_ORDER.map(([x, y]) => step(a.i, x, y));
      const occ = ring.map((j) => (j >= 0 ? s.board[j] : null));
      ring.forEach((j) => { if (j >= 0) s.board[j] = null; });
      occ.forEach((cc, k) => { if (cc) s.board[ring[(k + a.dir * a.n + 80) % 8]] = cc; });
      tp.used[s.board[a.i].top.id] = true;
    } else if (a.t === 'koi') {
      const tmp = s.board[a.a]; s.board[a.a] = s.board[a.b]; s.board[a.b] = tmp;
      tp.used[s.board[a.i].top.id] = true;
    } else if (a.t === 'end') {
      return endTurn(s, desc);
    }
    if (desc) s.log.push({ p, turn: s.turnNo, text: desc });
    return s;
  }
  function landFlower(s, to, tile) {
    const c = s.board[to];
    if (!c) s.board[to] = { top: tile, under: null };
    else if (isLoneCarrier(s, to)) s.board[to] = { top: tile, under: c.top };
    else if (isLoneDragon(s, to)) { s.removed.push(c.top); s.board[to] = { top: tile, under: null }; }
    else throw new Error('Square occupied');
  }
  function landCarrier(s, to, stack) {
    s.board[to] = stack;
  }
  function landAccent(s, to, tile) {
    const c = s.board[to];
    if (!c) { s.board[to] = { top: tile, under: null }; return; }
    if (isLoneDragon(s, to)) { s.removed.push(c.top); s.board[to] = { top: tile, under: null }; return; }
    if (tile.type === 'dragon') {
      if (c.under && c.under.type === 'skybison') { returnToHand(s, c.top); returnToHand(s, c.under); }
      else returnToHand(s, c.top);
      s.board[to] = { top: tile, under: null }; return;
    }
    if (isCarrier(tile.type)) { s.board[to] = { top: c.top, under: tile }; return; }
    throw new Error('Square occupied');
  }

  function endTurn(s, desc) {
    const p = s.turn;
    // win check: mover first, then opponent
    for (const q of [p, 1 - p]) {
      const ring = findRing(s, q);
      if (ring) { s.winner = q; s.winRing = ring; s.winReason = 'harmony ring'; break; }
    }
    if (s.winner === null && s.turnNo >= s.opts.maxTurns) { s.winner = 'draw'; s.winReason = 'turn limit'; }
    if (s.center && s.center.owner === p) s.centerAge = (s.centerAge || 0) + 1;
    s.turn = 1 - p; s.turnNo++;
    s.tp = freshTP();
    if (s.center && s.center.owner === s.turn) s.tp.mustLotus = true;
    return s;
  }

  // ---------- harmonies ----------
  function lineInfo(a, b) {
    const [r1, c1] = rc(a), [r2, c2] = rc(b);
    const dr = r2 - r1, dc = c2 - c1;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
    const d = Math.max(Math.abs(dr), Math.abs(dc));
    if (d === 0) return null;
    return { d, sr: Math.sign(dr), sc: Math.sign(dc), kind: dr === 0 || dc === 0 ? 'ortho' : 'diag' };
  }
  function crossesCenter(a, b) {
    const [x1, y1] = xy(a), [x2, y2] = xy(b);
    return Math.abs(x1 * y2 - x2 * y1) < 1e-9 && x1 * x2 + y1 * y2 < 0;
  }
  function keyReaches(type, li) {
    const k = KEY[type]; if (!k) return false;
    if (li.d < 2 || li.d > k.range) return false;
    return k.dirs === 'all' || k.dirs === li.kind;
  }
  function pathClear(s, a, li, owner, ignoreFlowers) {
    const [r, c] = rc(a);
    for (let k = 1; k < li.d; k++) {
      const j = idx(r + li.sr * k, c + li.sc * k);
      if (!onBoard[j] || isGateSq(s, j)) return false;
      if (ignoreFlowers) continue;
      const t = topAt(s, j);
      if (t && isFlower(t.type)) {
        if (t.type === 'firelily' && t.owner === owner) continue; // firelily only blocks opponents
        return false;
      }
    }
    return true;
  }
  // returns list of {a,b,owners:[...]}
  function harmonies(s) {
    const flowers = [];
    for (let i = 0; i < N * N; i++) { const t = topAt(s, i); if (t && isFlower(t.type)) flowers.push([i, t]); }
    const out = [];
    for (let x = 0; x < flowers.length; x++) for (let y = x + 1; y < flowers.length; y++) {
      const [a, ta] = flowers[x], [b, tb] = flowers[y];
      const li = lineInfo(a, b); if (!li) continue;
      if (crossesCenter(a, b)) continue;
      if (knotted(s, a) || knotted(s, b)) continue;
      const shield = onSkybison(s, a) || onSkybison(s, b);
      let owners = [];
      if (ta.type === 'lotus' || tb.type === 'lotus') {
        if (ta.type === 'lotus' && tb.type === 'lotus') owners = [...new Set([ta.owner, tb.owner])];
        else owners = [0, 1]; // the Lotus is neutral: its harmonies count for both players
        if (!pathClear(s, a, li, -1, shield)) continue;
      } else {
        if (ta.owner !== tb.owner) continue;
        if (ta.type === tb.type) continue;
        if (ta.type === 'firelily' || tb.type === 'firelily') continue;
        const ka = isKey(ta.type), kb = isKey(tb.type);
        if (!ka && !kb) continue;
        let ok = false;
        if (ka && keyReaches(ta.type, li)) ok = true;
        if (kb && keyReaches(tb.type, li)) ok = true;
        if (!ok) continue;
        if (!pathClear(s, a, li, ta.owner, shield)) continue;
        owners = [ta.owner];
      }
      out.push({ a, b, owners });
    }
    return out;
  }
  function angleOf(i) { const [x, y] = xy(i); return Math.atan2(y, x); }
  function dAngle(a, b) { let d = angleOf(b) - angleOf(a); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function findRing(s, p, H) {
    const hs = (H || harmonies(s)).filter((h) => h.owners.includes(p));
    const minLen = s.opts.minHarmonies || 4;
    if (hs.length < minLen) return null;
    const adj = new Map();
    hs.forEach(({ a, b }) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); });
    const nodes = [...adj.keys()].sort((x, y) => x - y);
    let budget = 200000;
    for (const start of nodes) {
      const path = [start]; const inPath = new Set([start]);
      const dfs = (u, ang) => {
        if (--budget < 0) return null;
        for (const v of adj.get(u)) {
          if (v === start && path.length >= minLen) {
            const tot = ang + dAngle(u, v);
            if (Math.abs(tot) > Math.PI) return path.slice();
            continue;
          }
          if (v <= start || inPath.has(v)) continue;
          path.push(v); inPath.add(v);
          const r = dfs(v, ang + dAngle(u, v));
          if (r) return r;
          path.pop(); inPath.delete(v);
        }
        return null;
      };
      const r = dfs(start, 0);
      if (r) return r;
    }
    return null;
  }

  // ---------- descriptions ----------
  function sqName(i) { const [r, c] = rc(i); return String.fromCharCode(65 + c) + (N - r); }
  function fromName(f) { return f.kind === 'sq' ? sqName(f.i) : f.kind === 'gate' ? GATE_NAMES[f.g] + ' gate' : 'centre'; }
  function describe(s, a) {
    if (a.t === 'plant') return `planted ${tname(a.type)} in ${a.gate === 'center' ? 'the centre' : GATE_NAMES[a.gate] + ' gate'}`;
    if (a.t === 'move') {
      let tile = a.from.kind === 'gate' ? s.gates[a.from.g] : a.from.kind === 'center' ? s.center.tile : (a.mover === 'under' ? s.board[a.from.i].under : s.board[a.from.i].top);
      return `moved ${tname(tile.type)} ${fromName(a.from)} → ${sqName(a.to)}${a.boat ? ' (with cargo)' : ''}${a.carry ? ' (carrying)' : ''}`;
    }
    if (a.t === 'place') return `placed ${tname(a.type)} at ${sqName(a.at)}`;
    if (a.t === 'wheel') return `turned Wheel ${a.dir > 0 ? 'clockwise' : 'counter-clockwise'} ${a.n}`;
    if (a.t === 'koi') return `Koi swapped ${sqName(a.a)} ↔ ${sqName(a.b)}`;
    return '';
  }

  return {
    N, idx, rc, xy, onBoard, sqType, quadrant, gateSquares, gateOfSq, gateExits, CENTER_SQ, GATE_NAMES,
    KEY, SPECIAL, ACCENT, KEY_TYPES, EFFECT_TYPES, isKey, isSpecial, isFlower, isAccent, tname,
    newGame, clone, legalActions, apply, harmonies, findRing, plantedCount, knotted, colorOK,
    flowerDests, stoneSpots, wheelOptions, koiOptions, isGateSq, sqName, describe, neighbors, angleOf, dAngle,
  };
})();
if (typeof module !== 'undefined') module.exports = PaiSho;
