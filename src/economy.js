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
    { id: 'av2', e: '🌈', t: 'Elements, unite!', kind: 'avatar' },
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
    p.owned.boards = [...new Set((p.owned.boards || []).concat(['classic'], p.nation ? [p.nation] : []))];
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
  return { START_GP, NATIONS, STARTER_TILES, TILE_PRICE, FREE_AVATARS, AVATAR_PRICE, EMOTES, EMO, BOARDS, earnings, newRating, ensure, ownsTile, ownsAvatar, ownsBoard, emoteUnlocked, rankedGames, computeAvatar, MIN_RANKED, START_RATING };
})();
