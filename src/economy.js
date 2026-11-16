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
  const AVATAR_PRICE = 150;
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
  ];
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
    sunset:  { name: 'Sunset Tea House', price: 800, wood: ['#a0583a', '#5a2a24'], light: '#fbe7cf', dark: '#c84a5b', rim: '#ffb36b', gate: '#5b1d32', gateEdge: '#ffcf8a', bg: '#2a1018' },
  };
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
  const SUB_XP = 1000;
  const SUBS = {
    metal: { name: 'Metalbending', el: 'earth', icon: '⚙️', desc: 'Swap any two tiles on the board.' },
    lightning: { name: 'Lightning', el: 'fire', icon: '⚡', desc: 'Your opponent skips their next turn.' },
    blood: { name: 'Bloodbending', el: 'water', icon: '🩸', desc: 'Make your opponent’s next move for them.' },
    flight: { name: 'Flight', el: 'air', icon: '🪽', desc: 'See their whole hand and their likely next move.' },
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
    { id: 'subbender', name: 'Beyond the Basics', desc: `Reach ${SUB_XP} XP to unlock sub-bending`, gp: 500, ok: (p) => (p.xp || 0) >= SUB_XP },
    { id: 'avatar', name: 'The Avatar', desc: 'Become the Avatar', gp: 1000, ok: (p, c) => !!(c && c.isAvatar) },
    { id: 'friend', name: 'Better Together', desc: 'Add a friend', gp: 100, ok: (p, c) => !!(c && c.friends >= 1) },
    { id: 'emotes10', name: 'Expressive', desc: 'Send 10 emotes', gp: 100, ok: (p) => (p.emotesSent || 0) >= 10 },
    { id: 'melon100', name: 'Seismic Sense', desc: 'Call the Melon Lord 100 times (unlocks the Blackout board)', gp: 1000, ok: (p) => (p.melonUses || 0) >= 100 },
    { id: 'rich', name: 'Treasure Keeper', desc: 'Hold 5,000 gp at once', gp: 500, ok: (p) => (p.gp || 0) >= 5000 },
  ];
  // reward events (player's local date): Avatar Day beats weekends
  function boost(d = new Date()) {
    if (d.getMonth() === 3 && d.getDate() === 28) return { xp: 100, gp: 5, name: 'Avatar Day', icon: '🎉' };
    if (d.getDay() === 0 || d.getDay() === 6) return { xp: 2, gp: 1.5, name: 'Weekend bonus', icon: '✨' };
    return { xp: 1, gp: 1, name: null };
  }
  return { boost, SUB_XP, SUBS, SUB_OF, BEND, level, powersFor, xpFor, ACH, START_GP, NATIONS, STARTER_TILES, TILE_PRICE, FREE_AVATARS, AVATAR_PRICE, EMOTES, EMO, BOARDS, earnings, newRating, ensure, ownsTile, ownsAvatar, ownsBoard, emoteUnlocked, rankedGames, computeAvatar, MIN_RANKED, START_RATING };
})();
