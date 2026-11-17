/* Nations, gold pieces, store catalogue, emotes, board themes, ranked rating and the Avatar title */
const Eco = (() => {
  const START_GP = 1000;
  const NATIONS = {
    air:   { name: 'Air',   icon: 'gust',   color: '#f2b84b' },
    water: { name: 'Water', icon: 'wave',   color: '#4fa3e0' },
    earth: { name: 'Earth', icon: 'peak',   color: '#7cb342' },
    fire:  { name: 'Fire',  icon: 'flame',  color: '#e8513a' },
  };
  // effect tiles: free starters + prices for the rest
  const STARTER_TILES = ['stone', 'boat'];
  const TILE_PRICE = { stone: 0, boat: 0, wheel: 200, knotweed: 300, orchid: 300, firelily: 350, dahlia: 350, koi: 400, badgermole: 450, skybison: 500, dragon: 600, lotus: 750 };
  // profile pictures (Avatars.LIST ids)
  const FREE_AVATARS = ['gust', 'wave', 'peak', 'flame', 'lantern', 'tea'];
  const PRICE_MULT = 3; // store prices tripled (Nov 2026); items already owned stay owned
  const AVATAR_PRICE = 150 * PRICE_MULT;
  Object.keys(TILE_PRICE).forEach((k) => (TILE_PRICE[k] *= PRICE_MULT));
  // emotes
  const EMOTES = [
    { id: 'hi', e: '👋', t: 'Hello!', kind: 'common' },
    { id: 'nice', e: '👍', t: 'Nice move', kind: 'common' },
    { id: 'wow', e: '😮', t: 'Whoa!', kind: 'common' },
    { id: 'hmm', e: '🤔', t: 'Hmm…', kind: 'common' },
    { id: 'oops', e: '😅', t: 'Oops', kind: 'common' },
    { id: 'gg', e: '🙏', t: 'Good game', kind: 'common' },
    { id: 'yip', e: '🦬', t: 'Yip yip!', kind: 'common' },
    { id: 'air1', e: '🌬️', t: 'Light as a breeze', kind: 'air' },
    { id: 'air2', e: '🍃', t: 'Go with the wind', kind: 'air' },
    { id: 'air3', e: '🌀', t: 'Spun you around!', kind: 'air' },
    { id: 'water1', e: '🌊', t: 'Here comes the tide', kind: 'water' },
    { id: 'water2', e: '💧', t: 'Smooth and steady', kind: 'water' },
    { id: 'water3', e: '🌙', t: 'Calm as the moon', kind: 'water' },
    { id: 'earth1', e: '🪨', t: 'Rock solid', kind: 'earth' },
    { id: 'earth2', e: '⛰️', t: 'I don’t budge', kind: 'earth' },
    { id: 'earth3', e: '💎', t: 'Pressure makes diamonds', kind: 'earth' },
    { id: 'fire1', e: '🔥', t: 'Feel the heat', kind: 'fire' },
    { id: 'fire2', e: '☀️', t: 'Rising like the sun', kind: 'fire' },
    { id: 'fire3', e: '🎇', t: 'Sparks are flying', kind: 'fire' },
    { id: 'av1', e: '✨', t: 'All four in balance', kind: 'avatar' },
    { id: 'av2', e: '☯️', t: 'Master of all four', kind: 'avatar' },
    { id: 'tea', e: '🍵', t: 'Time for tea', kind: 'store', price: 100 },
    { id: 'owl', e: '🦉', t: 'A wise move', kind: 'store', price: 100 },
    { id: 'party', e: '🎉', t: 'Let’s go!', kind: 'store', price: 120 },
    { id: 'sleep', e: '😴', t: 'Your move… eventually', kind: 'store', price: 120 },
    { id: 'flex', e: '💪', t: 'Too easy', kind: 'store', price: 150 },
    { id: 'lotus', e: '🪷', t: 'The garden blooms', kind: 'store', price: 200 },
    // cartoony pack
    { id: 'lol', e: '😂', t: 'LOL', kind: 'common' },
    { id: 'eyes', e: '👀', t: 'I see what you did', kind: 'common' },
    { id: 'salute', e: '🫡', t: 'Respect', kind: 'common' },
    { id: 'cool', e: '😎', t: 'Too cool', kind: 'store', price: 80 },
    { id: 'mind', e: '🤯', t: 'Mind = blown', kind: 'store', price: 100 },
    { id: 'fine', e: '🥲', t: 'It’s fine. I’m fine.', kind: 'store', price: 100 },
    { id: 'hmph', e: '😤', t: 'Hmph!', kind: 'store', price: 100 },
    { id: 'clown', e: '🤡', t: 'Clowned', kind: 'store', price: 120 },
    { id: 'dead', e: '💀', t: 'I’m dead', kind: 'store', price: 120 },
    { id: 'melt', e: '🫠', t: 'Melting…', kind: 'store', price: 120 },
    { id: 'slow', e: '🐢', t: 'Any day now…', kind: 'store', price: 120 },
    { id: 'rawr', e: '🐉', t: 'RAWR', kind: 'store', price: 150 },
    { id: 'dig', e: '🦡', t: 'Digging in', kind: 'store', price: 150 },
    { id: 'melon', e: '🍈', t: 'Melon time', kind: 'store', price: 150 },
    { id: 'cold', e: '🥶', t: 'Ice cold', kind: 'store', price: 150 },
    { id: 'zen', e: '🧘', t: 'Inner peace', kind: 'store', price: 150 },
    { id: 'evil', e: '😈', t: 'Mwahaha', kind: 'store', price: 180 },
    { id: 'bull', e: '🎯', t: 'Bullseye', kind: 'store', price: 180 },
    { id: 'truce', e: '🤝', t: 'Truce?', kind: 'store', price: 180 },
    { id: 'crown', e: '👑', t: 'Bow down', kind: 'store', price: 250 },
    { id: 'rocket', e: '🚀', t: 'To the moon', kind: 'store', price: 250 },
    { id: 'cabbage', e: '🥬', t: 'My cabbages!', kind: 'store', price: 300 },
  ];
  EMOTES.forEach((x) => { if (x.price) x.price *= PRICE_MULT; });
  const EMO = Object.fromEntries(EMOTES.map((x) => [x.id, x]));
  // board themes
  const BOARDS = {
    classic: { name: 'Classic',       price: 0,   wood: ['#b27a47', '#7c4f2a'], light: '#ebe3d0', dark: '#b8332e', rim: '#d4a24c', gate: '#5a1f1c', gateEdge: '#e6b54a', bg: '#3a2214' },
    air:     { name: 'Air Temple',    price: 400, nation: 'air',   wood: ['#dcbc80', '#a87e45'], light: '#fbf5e3', dark: '#e48a32', rim: '#f6cf62', gate: '#9a4d16', gateEdge: '#ffe08a', bg: '#5a3a12' },
    water:   { name: 'Water Tribe',   price: 400, nation: 'water', wood: ['#7f9fb8', '#3f5f7c'], light: '#eef6fc', dark: '#2b6cb4', rim: '#bfe3ff', gate: '#163a66', gateEdge: '#9fd2ff', bg: '#132538' },
    earth:   { name: 'Earth Kingdom', price: 400, nation: 'earth', wood: ['#97764a', '#5e4524'], light: '#ece7c9', dark: '#3e8a38', rim: '#d1b66b', gate: '#28461c', gateEdge: '#cfe08a', bg: '#2a2010' },
    fire:    { name: 'Fire Nation',   price: 400, nation: 'fire',  wood: ['#5a2a1a', '#2c120b'], light: '#f2dcbc', dark: '#b51f18', rim: '#f2b52f', gate: '#4e0b08', gateEdge: '#ffc44d', bg: '#170806' },
    moon:    { name: 'Moonlit',       price: 600, wood: ['#34405e', '#171d31'], light: '#dce1f2', dark: '#5d61a0', rim: '#d3daff', gate: '#1b2042', gateEdge: '#aab4ff', bg: '#0d1020' },
    jade:    { name: 'Jade Garden',   price: 600, wood: ['#406552', '#243a2f'], light: '#e8f0e3', dark: '#3a906a', rim: '#bfe6c8', gate: '#1d3b2c', gateEdge: '#9de0b3', bg: '#101d16' },
    blackout: { name: 'Blackout (Seismic)', price: null, unlock: 'melon100', wood: ['#050505', '#000000'], light: '#0b0b0b', dark: '#000000', rim: '#e8e8e8', gate: '#000000', gateEdge: '#f0f0f0', bg: '#000000', grid: '#ffffff', gridOp: 0.22, lines: '#ffffff', lightHatch: true },
    blackoutOwner: { name: 'Blackout (owner view)', hidden: true, price: null, unlock: 'melon100', wood: ['#141414', '#111111'], light: '#242424', dark: '#000000', rim: '#e8e8e8', gate: '#000000', gateEdge: '#f0f0f0', bg: '#000000', grid: '#ffffff', gridOp: 0.22, lines: '#ffffff', lightHatch: true },
    sakura:  { name: 'Sakura Spring',    price: 700,  wood: ['#c98b9a', '#8a4f5c'], light: '#fff1f4', dark: '#e07a98', rim: '#ffc8d6', gate: '#6e2a3c', gateEdge: '#ffd3df', bg: '#2a1218' },
    glacier: { name: 'Glacier',          price: 700,  wood: ['#9fc3d6', '#5d8aa4'], light: '#f4fbff', dark: '#6aa9d6', rim: '#e0f4ff', gate: '#24506e', gateEdge: '#c9ecff', bg: '#0e1f2b' },
    desert:  { name: 'Desert Oasis',     price: 700,  wood: ['#d9b27a', '#a37a42'], light: '#fbf0d9', dark: '#d07a2a', rim: '#ffd88a', gate: '#7a3e12', gateEdge: '#ffe2a2', bg: '#3a2410' },
    swamp:   { name: 'Misty Swamp',      price: 700,  wood: ['#5b6b45', '#323d24'], light: '#e3e8cf', dark: '#5f8a3a', rim: '#b8cf8a', gate: '#25351a', gateEdge: '#cfe39a', bg: '#141a0e' },
    ember:   { name: 'Ember Glow',       price: 800,  wood: ['#3a1a12', '#1a0a06'], light: '#ffe0b8', dark: '#ff5a1f', rim: '#ffb02e', gate: '#3a0a04', gateEdge: '#ffcc66', bg: '#0e0402' },
    ocean:   { name: 'Deep Ocean',       price: 800,  wood: ['#1f4a66', '#0d2436'], light: '#d9f0ff', dark: '#1a7fb8', rim: '#7fd4ff', gate: '#082033', gateEdge: '#9fe0ff', bg: '#04101a' },
    spirit:  { name: 'Spirit World',     price: 900,  wood: ['#5b3a7a', '#2c1a40'], light: '#f1e6ff', dark: '#9a5fd6', rim: '#e0c4ff', gate: '#2a1442', gateEdge: '#d9b8ff', bg: '#120a1e' },
    aurora:  { name: 'Aurora',           price: 900,  wood: ['#24414a', '#0f2026'], light: '#e6fff6', dark: '#2fb889', rim: '#9fffe0', gate: '#0c2e26', gateEdge: '#b8ffe8', bg: '#06120f' },
    autumn:  { name: 'Autumn Leaves',    price: 700,  wood: ['#9a5a2a', '#5e3214'], light: '#fbecd8', dark: '#c4521f', rim: '#f2a54a', gate: '#5a240c', gateEdge: '#ffc77a', bg: '#26120a' },
    marble:  { name: 'White Marble',     price: 1000, wood: ['#d8d6d0', '#a8a49a'], light: '#ffffff', dark: '#8a8a8a', rim: '#f0ece0', gate: '#4a4a4a', gateEdge: '#ffffff', bg: '#2a2a2a' },
    obsidian:{ name: 'Obsidian',         price: 1000, wood: ['#2a2a32', '#121216'], light: '#cfcfd8', dark: '#4a3a6a', rim: '#9a8ac8', gate: '#0a0a12', gateEdge: '#c8b8ff', bg: '#050508' },
    gold:    { name: 'Royal Gold',       price: 1500, wood: ['#c9a24a', '#8a6a1a'], light: '#fff7dc', dark: '#b8862a', rim: '#ffe28a', gate: '#5a3e0a', gateEdge: '#fff0b0', bg: '#2a1e06' },
    lotusb:  { name: 'Lotus Pond',       price: 900,  wood: ['#3f6a5e', '#1f3a32'], light: '#f6fff9', dark: '#e48ab0', rim: '#ffd6e6', gate: '#1a3a30', gateEdge: '#ffd6e6', bg: '#0c1a16' },
    candy:   { name: 'Candy Garden',     price: 800,  wood: ['#e89ac0', '#b05a8a'], light: '#fff6fb', dark: '#7ab8ff', rim: '#ffd1ea', gate: '#7a2a5a', gateEdge: '#ffe0f0', bg: '#2a1020' },
    neon:    { name: 'Neon Night',       price: 1200, wood: ['#141428', '#07070f'], light: '#1e1e3a', dark: '#ff2fa8', rim: '#2ff3ff', gate: '#07070f', gateEdge: '#2ff3ff', bg: '#020206' },
    stormy:  { name: 'Storm Clouds',     price: 800,  wood: ['#4f5866', '#272c34'], light: '#e8ecf2', dark: '#5a6f8f', rim: '#c8d4e6', gate: '#1a1f28', gateEdge: '#e0e8ff', bg: '#0c0f14' },
    meadow:  { name: 'Spring Meadow',    price: 600,  wood: ['#8fb45a', '#56782e'], light: '#fbfff0', dark: '#f2b23a', rim: '#e6ff9a', gate: '#3a5418', gateEdge: '#f2ffb8', bg: '#16200a' },
    bamboo:  { name: 'Bamboo Grove',     price: 700,  wood: ['#b8c46a', '#7a8a32'], light: '#f8fbe6', dark: '#4f8a3a', rim: '#e2ef9a', gate: '#33501c', gateEdge: '#eaf7b0', bg: '#141c08' },
    sunset:  { name: 'Sunset Tea House', price: 800, wood: ['#a0583a', '#5a2a24'], light: '#fbe7cf', dark: '#c84a5b', rim: '#ffb36b', gate: '#5b1d32', gateEdge: '#ffcf8a', bg: '#2a1018' },
  };
  Object.values(BOARDS).forEach((b) => { if (b.price) b.price *= PRICE_MULT; });
  // earnings
  const EARN = {
    ai: { easy: [12, 4, 6], medium: [25, 6, 10], hard: [45, 10, 18] }, // [win, loss, draw]
    online: [150, 40, 70],
    ringBonus: 25,
  };
  function earnings(mode, level, res, ring) {
    const k = res === 'w' ? 0 : res === 'l' ? 1 : 2;
    let gp = 0;
    if (mode === 'ai') gp = (EARN.ai[level] || EARN.ai.medium)[k];
    else if (mode === 'online') gp = EARN.online[k];
    if (res === 'w' && ring && gp) gp += mode === 'online' ? EARN.ringBonus : Math.round(EARN.ringBonus / 5);
    return gp;
  }
  // ranked rating (Elo)
  const START_RATING = 1000, K = 32, MIN_RANKED = 3;
  function newRating(mine, theirs, res) {
    const exp = 1 / (1 + Math.pow(10, (theirs - mine) / 400));
    const score = res === 'w' ? 1 : res === 'l' ? 0 : 0.5;
    return Math.round(mine + K * (score - exp));
  }
  // player economy defaults / migration
  function ensure(p) {
    if (!p) return p;
    if (typeof p.gp !== 'number') p.gp = START_GP;
    if (p.stats && !p.stats.fastFix) { // fastest wins from recent games (your moves ≈ half the turns)
      (p.stats.recent || []).filter((r) => r.res === 'w' && r.turns > 0).forEach((r) => {
        const k = r.mode === 'ai' ? 'fastestAi' : 'fastest', n = Math.ceil(r.turns / 2);
        if (!p.stats[k] || n < p.stats[k]) p.stats[k] = n;
      });
      p.stats.fastFix = true; p._mig = true;
    }
    if (!p.xpFix1) { // credit XP for games played before XP existed
      const S = p.stats || {}, A = S.ai || {}, row = (a, t) => (a ? a[0] * t[0] + a[1] * t[1] + a[2] * t[2] : 0);
      const base = row(S.online, XP.online) + row(A.easy, XP.ai) + row(A.medium, XP.ai) + row(A.hard, XP.ai);
      if (base > (p.xp || 0)) p.xp = base;
      p.xpFix1 = true; p._mig = true;
    }
    if (p.stats && !p.stats.v2) { // computer games no longer count toward overall wins/losses
      const S = p.stats, add = (a) => (a || [0, 0, 0]);
      const on = add(S.online), lo = add(S.local);
      S.wins = on[0] + lo[0]; S.losses = on[1] + lo[1]; S.draws = on[2] + lo[2]; S.games = S.wins + S.losses + S.draws;
      S.best = Math.min(S.best || 0, S.wins); S.streak = Math.min(S.streak || 0, S.wins); S.rings = Math.min(S.rings || 0, S.wins);
      S.v2 = true; p._mig = true;
    }
    p.owned = p.owned || {};
    p.owned.tiles = [...new Set((p.owned.tiles || []).concat(STARTER_TILES))];
    p.owned.avatars = [...new Set((p.owned.avatars || []).concat(FREE_AVATARS, p.avatar ? [p.avatar] : []))];
    p.owned.emotes = p.owned.emotes || [];
    p.owned.boards = [...new Set((p.owned.boards || []).concat(['classic'], p.nation ? [p.nation] : [], (p.melonUses || 0) >= 100 ? ['blackout'] : []))];
    if (typeof p.rating !== 'number') p.rating = START_RATING;
    p.ranked = p.ranked || { w: 0, l: 0, d: 0 };
    p.board = p.board || 'classic';
    return p;
  }
  const ownsTile = (p, t) => !p ? STARTER_TILES.includes(t) : (ensure(p).owned.tiles.includes(t));
  const ownsAvatar = (p, id) => !p ? FREE_AVATARS.includes(id) : ensure(p).owned.avatars.includes(id);
  const ownsBoard = (p, id) => id === 'classic' || (!!p && ensure(p).owned.boards.includes(id));
  function emoteUnlocked(p, id, isAvatar) {
    const e = EMO[id]; if (!e) return false;
    if (e.kind === 'common') return true;
    if (!p) return false;
    if (isAvatar && (e.kind === 'avatar' || NATIONS[e.kind])) return true;
    if (NATIONS[e.kind]) return p.nation === e.kind;
    if (e.kind === 'store') return ensure(p).owned.emotes.includes(id);
    return false;
  }
  const rankedGames = (p) => { const r = (p && p.ranked) || {}; return (r.w || 0) + (r.l || 0) + (r.d || 0); };
  // who is the Avatar: unique top rating among players with enough ranked games
  function computeAvatar(players) {
    const eligible = players.filter((p) => rankedGames(p) >= MIN_RANKED).map((p) => ({ p, r: typeof p.rating === 'number' ? p.rating : START_RATING })).sort((a, b) => b.r - a.r);
    if (!eligible.length) return { pid: null, tie: null };
    if (eligible.length > 1 && eligible[0].r === eligible[1].r) return { pid: null, tie: [eligible[0].p, eligible[1].p] };
    return { pid: eligible[0].p.id, tie: null };
  }
  // ---- XP, sub-bending, achievements ----
  const SUB_LEVEL = 10, SUB_XP = (SUB_LEVEL - 1) * 500; // level(xp) = 1 + floor(xp/500) → Level 10 = 4,500 XP
  const SUBS = {
    metal: { name: 'Metalbending', el: 'earth', icon: '⚙️', desc: 'Your move for the turn: swap two tiles, or move/smash up to two. Steals gold from your opponent.' },
    lightning: { name: 'Lightning', el: 'fire', icon: '⚡', desc: 'Your opponent skips their next turn.' },
    blood: { name: 'Bloodbending', el: 'water', icon: '🩸', desc: 'Make your opponent’s next move for them.' },
    flight: { name: 'Flight', el: 'air', icon: '🪽', desc: 'See their hand, watch their next turn live, and blow one tile up to 7 squares with a gust.' },
  };
  const SUB_OF = { earth: 'metal', fire: 'lightning', water: 'blood', air: 'flight' };
  const BEND = {
    fire: { icon: '🔥', verb: 'Burn', desc: 'Burn an opponent’s tile out of the game.' },
    water: { icon: '🌊', verb: 'Wash out', desc: 'Wash an opponent’s tile back to their hand.' },
    earth: { icon: '🪨', verb: 'Smash', desc: 'Smash a tile and leave rubble there for 4 turns.' },
    air: { icon: '🌪️', verb: 'Sweep', desc: 'Sweep a tile up to 3 squares in a straight line.' },
  };
  const level = (xp) => 1 + Math.floor((xp || 0) / 500);
  function powersFor(p, isAvatar) {
    if (!p || !p.nation) return { nation: null };
    const xp = p.xp || 0;
    return { nation: p.nation, avatar: !!isAvatar, subs: xp >= SUB_XP ? (isAvatar ? Object.keys(SUBS) : [SUB_OF[p.nation]]) : [] };
  }
  const XP = { online: [100, 30, 50], ai: [40, 10, 20] };
  const xpFor = (mode, res) => { const t = XP[mode]; if (!t) return 0; return t[res === 'w' ? 0 : res === 'l' ? 1 : 2]; };
  const ACH = [
    { id: 'first_win', name: 'First Victory', desc: 'Win your first match', gp: 1000, ok: (p) => (p.stats && p.stats.wins) >= 1 },
    { id: 'first_online', name: 'Out in the World', desc: 'Win an online match', gp: 300, ok: (p) => (p.stats && p.stats.online && p.stats.online[0]) >= 1 },
    { id: 'ring', name: 'Full Circle', desc: 'Win by completing a ring', gp: 200, ok: (p) => (p.stats && p.stats.rings) >= 1 },
    { id: 'hard', name: 'Master Strategist', desc: 'Beat the Hard computer', gp: 400, ok: (p) => (p.stats && p.stats.ai && p.stats.ai.hard && p.stats.ai.hard[0]) >= 1 },
    { id: 'streak3', name: 'On a Roll', desc: 'Win 3 matches in a row', gp: 300, ok: (p) => (p.stats && p.stats.best) >= 3 },
    { id: 'vet25', name: 'Veteran', desc: 'Play 25 matches', gp: 500, ok: (p) => (p.stats && p.stats.games) >= 25 },
    { id: 'lotus', name: 'White Lotus', desc: 'Unlock the White Lotus tile', gp: 250, ok: (p) => p.owned && p.owned.tiles.includes('lotus') },
    { id: 'arsenal', name: 'Full Arsenal', desc: 'Unlock all 12 effect tiles', gp: 1000, ok: (p) => p.owned && Object.keys(TILE_PRICE).every((t) => p.owned.tiles.includes(t)) },
    { id: 'board', name: 'Redecorated', desc: 'Buy a board theme', gp: 100, ok: (p) => p.owned && p.owned.boards.some((b) => b !== 'classic' && b !== p.nation) },
    { id: 'bender', name: 'Bender', desc: 'Use bending in a match', gp: 150, ok: (p) => (p.bends || 0) >= 1 },
    { id: 'fury25', name: 'Elemental Fury', desc: 'Bend 25 times', gp: 300, ok: (p) => (p.bends || 0) >= 25 },
    { id: 'fury100', name: 'Force of Nature', desc: 'Bend 100 times', gp: 750, ok: (p) => (p.bends || 0) >= 100 },
    { id: 'subbender', name: 'Beyond the Basics', desc: `Reach Level ${SUB_LEVEL} to unlock sub-bending`, gp: 500, ok: (p) => (p.xp || 0) >= SUB_XP },
    { id: 'avatar', name: 'The Avatar', desc: 'Become the Avatar', gp: 1000, ok: (p, c) => !!(c && c.isAvatar) },
    { id: 'friend', name: 'Better Together', desc: 'Add a friend', gp: 100, ok: (p, c) => !!(c && c.friends >= 1) },
    { id: 'emotes10', name: 'Expressive', desc: 'Send 10 emotes', gp: 100, ok: (p) => (p.emotesSent || 0) >= 10 },
    { id: 'melon100', name: 'Seismic Sense', desc: 'Call the Melon Lord 100 times (unlocks the Blackout board)', gp: 1000, ok: (p) => (p.melonUses || 0) >= 100 },
    { id: 'rich', name: 'Treasure Keeper', desc: 'Hold 5,000 gp at once', gp: 500, ok: (p) => (p.gp || 0) >= 5000 },
  ];
  // ---- 1,500 themed tier achievements: ladders across many skills ----
  const TIER_WORDS = ['Seedling', 'Sprout', 'Petal', 'Bud', 'Blossom', 'Pebble', 'Ember', 'Ripple', 'Breeze', 'Novice',
    'Spark', 'Stone', 'Wave', 'Gust', 'Apprentice', 'Lily', 'Jasmine', 'Rose', 'Jade', 'Chrysanthemum',
    'Flame', 'Current', 'Boulder', 'Gale', 'Disciple', 'Bronze', 'Copper', 'Iron', 'Silver', 'Gold',
    'Blaze', 'Tide', 'Cliff', 'Whirlwind', 'Adept', 'Dawn', 'Noon', 'Dusk', 'Twilight', 'Moonrise',
    'Inferno', 'Riptide', 'Mountain', 'Cyclone', 'Expert', 'Orchid', 'Dahlia', 'Firelily', 'Knotweed', 'Lotus',
    'Wildfire', 'Maelstrom', 'Earthshaker', 'Tempest', 'Veteran', 'Platinum', 'Crystal', 'Moonstone', 'Sunstone', 'Obsidian',
    'Comet', 'Starfall', 'Aurora', 'Solstice', 'Equinox', 'Eclipse', 'Master', 'Grandmaster', 'Sage', 'Elder',
    'Guardian', 'Luminary', 'Paragon', 'Legend', 'Mythic', 'Spirit', 'Ascended', 'Celestial', 'Eternal', 'Infinite'];
  const pl = (x, one, many) => (x === 1 ? one : many);
  const sum3 = (a) => (a ? (a[0] || 0) + (a[1] || 0) + (a[2] || 0) : 0);
  const st = (p) => p.stats || {};
  const TRACKS = [
    { k: 'wins', n: 80, a: 1, b: 20000, noun: 'Victor', icon: '🏆', d: (x) => `Win ${x} ${pl(x, 'match', 'matches')}`, v: (p) => st(p).wins || 0 },
    { k: 'games', n: 80, a: 1, b: 40000, noun: 'Gardener', icon: '🌱', d: (x) => `Play ${x} ${pl(x, 'match', 'matches')}`, v: (p) => st(p).games || 0 },
    { k: 'onl', n: 80, a: 1, b: 10000, noun: 'Wanderer', icon: '🌍', d: (x) => `Win ${x} online ${pl(x, 'match', 'matches')}`, v: (p) => (st(p).online || [])[0] || 0 },
    { k: 'onlg', n: 60, a: 1, b: 20000, noun: 'Traveler', icon: '🧭', d: (x) => `Play ${x} online ${pl(x, 'match', 'matches')}`, v: (p) => sum3(st(p).online) },
    { k: 'ring', n: 80, a: 1, b: 15000, noun: 'Harmonist', icon: '⭕', d: (x) => `Win ${x} ${pl(x, 'match', 'matches')} by completing a ring`, v: (p) => st(p).rings || 0 },
    { k: 'easy', n: 50, a: 1, b: 5000, noun: 'Student', icon: '🍵', d: (x) => `Beat the Easy computer ${x} ${pl(x, 'time', 'times')}`, v: (p) => ((st(p).ai || {}).easy || [])[0] || 0 },
    { k: 'med', n: 55, a: 1, b: 5000, noun: 'Tactician', icon: '♟️', d: (x) => `Beat the Medium computer ${x} ${pl(x, 'time', 'times')}`, v: (p) => ((st(p).ai || {}).medium || [])[0] || 0 },
    { k: 'hard', n: 70, a: 1, b: 5000, noun: 'Strategist', icon: '🐉', d: (x) => `Beat the Hard computer ${x} ${pl(x, 'time', 'times')}`, v: (p) => ((st(p).ai || {}).hard || [])[0] || 0 },
    { k: 'aig', n: 50, a: 1, b: 20000, noun: 'Practitioner', icon: '🤖', d: (x) => `Play ${x} ${pl(x, 'match', 'matches')} against the computer`, v: (p) => { const a = st(p).ai || {}; return sum3(a.easy) + sum3(a.medium) + sum3(a.hard); } },
    { k: 'local', n: 45, a: 1, b: 5000, noun: 'Host', icon: '🤝', d: (x) => `Play ${x} pass-and-play matches`, v: (p) => sum3(st(p).local) },
    { k: 'streak', n: 50, a: 2, b: 100, lin: true, noun: 'Unbroken', icon: '🔥', d: (x) => `Win ${x} ${pl(x, 'match', 'matches')} in a row`, v: (p) => st(p).best || 0 },
    { k: 'loss', n: 60, a: 1, b: 10000, noun: 'Persistent', icon: '🌧️', d: (x) => `Keep playing through ${x} ${pl(x, 'loss', 'losses')}`, v: (p) => st(p).losses || 0 },
    { k: 'draw', n: 32, a: 1, b: 1000, noun: 'Balanced', icon: '☯️', d: (x) => `Draw ${x} ${pl(x, 'match', 'matches')}`, v: (p) => st(p).draws || 0 },
    { k: 'bend', n: 80, a: 1, b: 25000, noun: 'Bender', icon: '🌀', d: (x) => `Bend ${x} ${pl(x, 'time', 'times')}`, v: (p) => p.bends || 0 },
    { k: 'spam', n: 70, a: 5, b: 200000, noun: 'Showoff', icon: '🎇', d: (x) => `Show off with ${x} flames, waves, quakes or gusts`, v: (p) => p.spamSent || 0 },
    { k: 'lvl', n: 60, a: 2, b: 500, noun: 'Ascendant', icon: '📈', d: (x) => `Reach Level ${x}`, v: (p) => 1 + Math.floor((p.xp || 0) / 500) },
    { k: 'rate', n: 50, a: 1050, b: 3500, lin: true, step: 50, noun: 'Contender', icon: '⭐', d: (x) => `Reach a ranked rating of ${x}`, v: (p) => p.ratingPeak || p.rating || 0 },
    { k: 'emote', n: 65, a: 1, b: 50000, noun: 'Expressive', icon: '😊', d: (x) => `Send ${x} ${pl(x, 'emote', 'emotes')}`, v: (p) => p.emotesSent || 0 },
    { k: 'chat', n: 65, a: 1, b: 50000, noun: 'Storyteller', icon: '💬', d: (x) => `Send ${x} chat ${pl(x, 'message', 'messages')}`, v: (p) => p.chatsSent || 0 },
    { k: 'melon', n: 45, a: 1, b: 10000, noun: 'Seismic', icon: '🍈', d: (x) => `Call the Melon Lord ${x} ${pl(x, 'time', 'times')}`, v: (p) => p.melonUses || 0 },
    { k: 'nudge', n: 43, a: 1, b: 5000, noun: 'Sky Herder', icon: '📣', d: (x) => `Send ${x} Yip yip! ${pl(x, 'nudge', 'nudges')}`, v: (p) => p.nudgesSent || 0 },
    { k: 'doodle', n: 40, a: 1, b: 10000, noun: 'Calligrapher', icon: '✍️', d: (x) => `Draw ${x} S Pen ${pl(x, 'doodle', 'doodles')}`, v: (p) => p.doodles || 0 },
    { k: 'days', n: 70, a: 1, b: 2000, noun: 'Devotee', icon: '📅', d: (x) => `Play on ${x} different ${pl(x, 'day', 'days')}`, v: (p) => p.daysPlayed || 0 },
    { k: 'gold', n: 55, a: 2000, b: 5000000, noun: 'Treasure Keeper', icon: '🪙', d: (x) => `Hold ${x.toLocaleString()} gp at once`, v: (p) => Math.max(p.gp || 0, p.gpPeak || 0) },
    { k: 'friend', n: 35, a: 1, b: 100, noun: 'Companion', icon: '🫂', d: (x) => `Have ${x} ${pl(x, 'friend', 'friends')}`, v: (p, c) => (c && c.friends) || 0 },
    { k: 'coll', n: 30, a: 3, b: 120, lin: true, noun: 'Collector', icon: '🎴', d: (x) => `Own ${x} store items (tiles, pictures, emotes and boards)`, v: (p) => { const o = p.owned || {}; return (o.tiles || []).length + (o.avatars || []).length + (o.emotes || []).length + (o.boards || []).length; } },
  ];
  function ladder(t) {
    const out = []; let prev = 0;
    for (let i = 0; i < t.n; i++) {
      const f = t.n === 1 ? 1 : i / (t.n - 1);
      let x = t.lin ? t.a + (t.b - t.a) * f : t.a * Math.pow(t.b / t.a, f);
      const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, x))) - 1));
      x = t.lin || x < 20 ? Math.round(x) : Math.round(x / mag) * mag;
      if (t.step) x = Math.round(x / t.step) * t.step;
      if (x <= prev) x = prev + 1;
      out.push(x); prev = x;
    }
    return out;
  }
  TRACKS.forEach((t) => {
    t.tiers = ladder(t);
    t.tiers.forEach((x, i) => {
      const word = TIER_WORDS[Math.min(TIER_WORDS.length - 1, Math.floor((i / t.n) * TIER_WORDS.length))];
      ACH.push({ id: t.k + '_' + i, track: t.k, tier: i, name: `${word} ${t.noun}`, desc: t.d(x), goal: x, icon: t.icon, gp: Math.round(20 + 480 * Math.pow(i / Math.max(1, t.n - 1), 1.6)), ok: (p, c) => t.v(p, c) >= x });
    });
  });
  const ACH_MAIN = ACH.filter((a) => !a.track);
  // ---- play styles (worked out from each match's moves) ----
  const STYLES = {
    builder:   { icon: '🌸', name: 'Gardener', tag: 'Builder', color: '#e48ab0', desc: 'Grows harmonies fast. Most of their moves link flowers and push toward a ring.' },
    aggressor: { icon: '🔥', name: 'Aggressor', tag: 'Offensive', color: '#ff7a3d', desc: 'Goes after you. Breaks your harmonies, removes your tiles and bends at you.' },
    guardian:  { icon: '🛡️', name: 'Guardian', tag: 'Defensive', color: '#7fb4ff', desc: 'Plays it safe. Blocks with Stone, Knotweed and Badgermole and rarely loses tiles.' },
    trickster: { icon: '🌀', name: 'Trickster', tag: 'Tricky', color: '#b08cff', desc: 'Loves surprises: Wheel spins, Koi swaps, Boats, sub-bending and the Melon Lord.' },
    balanced:  { icon: '☯️', name: 'Balanced', tag: 'All-rounder', color: '#d8c89a', desc: 'Mixes building, attacking and defending without leaning on one.' },
  };
  function styleScores(T) {
    T = T || {};
    return { builder: (T.f || 0) * 2, aggressor: (T.d || 0) * 2 + (T.k || 0) * 3 + (T.b || 0) * 2, guardian: (T.g || 0) * 2 + (T.safe || 0), trickster: (T.t || 0) * 2 };
  }
  function styleOf(T) {
    const sc = styleScores(T), tot = Object.values(sc).reduce((a, b) => a + b, 0);
    if (tot < 4) return 'balanced';
    const [top, v] = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
    return v / tot >= 0.45 ? top : 'balanced';
  }
  const typicalStyle = (p) => { const c = (p.style && p.style.counts) || {}; const e = Object.entries(c).sort((a, b) => b[1] - a[1]); return e.length && e[0][1] ? e[0][0] : null; };
  // ---- daily sign-in rewards: streak grows each consecutive day, resets if a day is missed ----
  const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function dailyReward(day) {
    const n = Math.min(day, 30), seven = day % 7 === 0;
    const gp = Math.min(850, 100 + 25 * (n - 1)) * (seven ? 2 : 1), xp = Math.min(300, 25 + 10 * (n - 1)) * (seven ? 2 : 1);
    return { gp, xp, seven };
  }
  function dailyState(p, now = new Date()) {
    const d = p.daily || {}, today = dayKey(now), y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.last === today) return { claimed: true, streak: d.streak || 1, next: (d.streak || 1) + 1 };
    const streak = d.last === dayKey(y) ? (d.streak || 0) + 1 : 1;
    return { claimed: false, streak, next: streak, lost: !!d.last && d.last !== dayKey(y) && (d.streak || 0) > 1 ? d.streak : 0 };
  }
  // reward events (player's local date): Avatar Day beats weekends
  function boost(d = new Date()) {
    if (d.getMonth() === 3 && d.getDate() === 28) return { xp: 100, gp: 5, name: 'Avatar Day', icon: '🎉' };
    if (d.getDay() === 0 || d.getDay() === 6) return { xp: 2, gp: 1.5, name: 'Weekend bonus', icon: '✨' };
    return { xp: 1, gp: 1, name: null };
  }
  return { STYLES, styleOf, styleScores, typicalStyle, PRICE_MULT, boost, dayKey, dailyReward, dailyState, TRACKS, ACH_MAIN, SUB_XP, SUB_LEVEL, SUBS, SUB_OF, BEND, level, powersFor, xpFor, ACH, START_GP, NATIONS, STARTER_TILES, TILE_PRICE, FREE_AVATARS, AVATAR_PRICE, EMOTES, EMO, BOARDS, earnings, newRating, ensure, ownsTile, ownsAvatar, ownsBoard, emoteUnlocked, rankedGames, computeAvatar, MIN_RANKED, START_RATING };
})();
