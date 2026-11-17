// Figure: layered vector cartoon characters (workshop — not shipped yet)
const Figure = (() => {
  let uid = 0;
  const OL = '#2b1d14'; // outline
  const SW = 2.4;
  const M = (d) => `<g transform="translate(200,0) scale(-1,1)">${d}</g>`; // mirror right side
  const both = (d) => d + M(d);
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const L = (d, c = OL, w = 1.6, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

  const SKIN = { porcelain: '#f6dcc4', light: '#efc9a4', tan: '#d9a77a', olive: '#c48f5f', brown: '#9c6a43', deep: '#6e4529' };
  const HAIR = { black: '#1d1714', brown: '#4a2f1e', chestnut: '#6b3a1f', auburn: '#8a3b22', sandy: '#b98b55', silver: '#c9c4bd', white: '#efeae2' };
  const EYES = { brown: '#4a2c17', amber: '#b77a1c', gray: '#6c7a86', blue: '#3d78b8', green: '#4f7d3c', gold: '#d79a22' };
  const NATION = {
    earth: { name: 'Earth Kingdom', main: '#4f7a3a', dark: '#2f4a24', light: '#86a865', accent: '#b89a55', glow: '#9df07a' },
    fire: { name: 'Fire Nation', main: '#a3261d', dark: '#5e1813', light: '#d2543d', accent: '#e0a83a', glow: '#ff9a3c' },
    air: { name: 'Air Nomads', main: '#e0812c', dark: '#a95518', light: '#f2c04a', accent: '#f6d77a', glow: '#bfe8ff' },
    water: { name: 'Water Tribe', main: '#3f6ea8', dark: '#24446e', light: '#8db3dc', accent: '#f4f4f4', glow: '#7fd4ff' },
  };

  // ---------- body ----------
  const B = {
    masc: { torso: 'M100,130 L78,130 Q60,132 57,142 L63,200 L100,200 Z', arm: 'M60,138 C47,148 44,176 44,198 L57,199 C57,180 61,160 69,150 Z', hand: [50, 205, 7.5], leg: 'M66,197 L99,197 L97,258 L75,258 Z', foot: [84, 263, 13, 6.5], sh: 57, hip: 63, waist: 64 },
    femme: { torso: 'M100,131 L82,131 Q66,133 63,142 L67,166 Q63,182 66,200 L100,200 Z', arm: 'M65,139 C54,148 51,176 51,198 L62,199 C62,180 65,160 72,150 Z', hand: [56, 205, 6.8], leg: 'M68,197 L99,197 L97,258 L77,258 Z', foot: [86, 263, 12, 6], sh: 63, hip: 66, waist: 67 },
  };
  function body(b, skin) {
    const k = B[b], s = SKIN[skin] || skin, sd = shade(s, -0.12);
    const [hx, hy, hr] = k.hand, [fx, fy, fw, fh] = k.foot;
    return {
      back: both(P(k.arm, s)),
      core: both(P(k.leg, s) + `<ellipse cx="${fx}" cy="${fy}" rx="${fw}" ry="${fh}" fill="${sd}" stroke="${OL}" stroke-width="${SW}"/>`) + both(P(k.torso.replace('Z', ''), s, '')),
      chest: b === 'masc' ? L('M84,156 Q92,160 98,156', sd, 1.6) + L('M102,156 Q108,160 116,156', sd, 1.6) + L('M100,166 L100,190', sd, 1.3) + L('M88,176 L96,176 M104,176 L112,176 M89,186 L96,186 M104,186 L111,186', sd, 1.2) : L('M100,160 L100,192', sd, 1.2),
      hands: both(P(`M${hx - hr},${hy - 3} C${hx - hr - 1},${hy + hr + 2} ${hx + hr + 1},${hy + hr + 2} ${hx + hr},${hy - 3} L${hx + hr - 1},${hy - hr + 1} L${hx - hr + 1},${hy - hr + 1} Z`, s) + P(`M${hx + hr - 1},${hy - 2} C${hx + hr + 5},${hy - 1} ${hx + hr + 5},${hy + 5} ${hx + hr - 1},${hy + 4}`, s) + L(`M${hx - 3},${hy + 4} L${hx - 3},${hy + 8} M${hx + 1},${hy + 5} L${hx + 1},${hy + 9}`, sd, 1.1)),
      neck: P('M91,112 L109,112 L110,134 L90,134 Z', s) + L('M92,128 Q100,133 108,128', sd, 1.4),
    };
  }

  // ---------- head ----------
  const FACE = 'M61,80 C61,42 139,42 139,80 C139,98 132,110 118,118 C110,123 106,124 100,124 C94,124 90,123 82,118 C68,110 61,98 61,80 Z';
  function head(o, glow) {
    const s = SKIN[o.skin] || o.skin, sd = shade(s, -0.15), e = EYES[o.eyes] || EYES.brown, hc = HAIR[o.hairColor] || o.hairColor;
    let h = both(`<ellipse cx="61" cy="88" rx="6" ry="8.5" fill="${s}" stroke="${OL}" stroke-width="${SW}"/>` + L('M60,85 Q63,88 60,92', sd, 1.3));
    h += P(FACE, s);
    h += `<ellipse cx="78" cy="101" rx="7" ry="4" fill="#e87a6a" opacity=".22"/><ellipse cx="122" cy="101" rx="7" ry="4" fill="#e87a6a" opacity=".22"/>`;
    // brows
    const br = { calm: 'M72,74 Q80,69 91,72', fierce: 'M72,70 Q82,72 91,77', kind: 'M72,75 Q80,68 91,71' }[o.mood] || 'M72,74 Q80,69 91,72';
    h += both(L(br, shade(hc, 0.05), 3.2));
    if (glow) {
      const eye = 'M73,87 Q79,79 91,82 Q89,91 81,92 Q75,91 73,87 Z';
      h += both(`<path d="${eye}" fill="#fff" transform="translate(82,86) scale(1.5) translate(-82,-86)" filter="url(#${glow})"/><path d="${eye}" fill="#fff"/>` + L('M72,86.5 Q79,77.5 92,81', OL, 2.4));
    } else {
      const eye = 'M73,87 Q79,79 91,82 Q89,91 81,92 Q75,91 73,87 Z';
      h += `<clipPath id="${o._id}e"><path d="${eye}"/></clipPath>`;
      h += both(`<path d="${eye}" fill="#fff"/><g clip-path="url(#${o._id}e)"><circle cx="83.5" cy="87" r="5.2" fill="${e}"/><circle cx="83.5" cy="87.5" r="2.5" fill="#140d08"/><circle cx="85.5" cy="84.8" r="1.5" fill="#fff"/></g>` + L('M72,86.5 Q79,77.5 92,81', OL, 2.8) + (o.build === 'femme' ? L('M73,85 L69,82 M74,83 L71,79', OL, 1.6) : '') + L('M76,91 Q81,93 88,90.5', OL, 1.1, 'opacity=".6"'));
    }
    h += L('M99,92 Q97,99 101,100', sd, 1.8);
    const mouth = { calm: 'M93,108 Q100,111 107,108', fierce: 'M93,109 L107,108', kind: 'M91,106 Q100,115 109,106' }[o.mood] || 'M93,108 Q100,111 107,108';
    h += L(mouth, '#6b2a1e', 2.2);
    return h;
  }

  // ---------- hair (back layer, front layer) ----------
  function hair(style, color) {
    const c = HAIR[color] || color, hl = shade(c, 0.22), dk = shade(c, -0.25);
    const cap = 'M58,84 C52,40 78,30 100,30 C122,30 148,40 142,84 C138,64 124,52 100,52 C76,52 62,64 58,84 Z';
    const shine = L('M78,40 Q92,34 108,36', hl, 3, 'opacity=".7"');
    const S = {
      bald: { back: '', front: '' },
      short: { back: '', front: P('M57,84 C50,42 76,28 100,29 C126,28 152,42 143,84 L137,70 L133,77 L126,61 L119,72 L111,57 L103,70 L96,56 L89,70 L81,59 L76,73 L68,64 L64,76 Z', c) + shine },
      swept: { back: '', front: P('M57,86 C50,40 80,28 104,30 C128,30 150,42 143,84 C140,70 134,62 124,58 C112,66 92,72 66,72 C62,76 59,80 57,86 Z', c) + L('M80,62 Q100,58 120,52', dk, 1.5) + shine },
      topknot: { back: '', front: P(cap, c) + `<circle cx="100" cy="27" r="11" fill="${c}" stroke="${OL}" stroke-width="${SW}"/>` + P('M92,36 L108,36 L107,42 L93,42 Z', '#c9a24a') + L('M74,58 Q100,48 126,58', dk, 1.3) + L('M74,50 Q84,44 92,44', hl, 3, 'opacity=".7"') },
      long: { back: P('M58,84 C50,38 150,38 142,84 L152,176 Q100,186 48,176 Z', dk), front: P('M58,88 C54,40 96,32 100,42 C104,32 146,40 142,88 C136,62 114,52 100,50 C86,52 64,62 58,88 Z', c) + both(P('M60,82 C56,100 56,120 62,140 L70,138 C66,118 66,100 68,86 Z', c)) + L('M70,52 Q82,42 94,42', hl, 3, 'opacity=".7"') },
      ponytail: { back: P('M126,56 C152,62 156,104 146,152 C140,140 136,110 130,84 Z', dk), front: P(cap, c) + P('M120,40 C132,36 140,44 138,52 L126,52 Z', '#c9a24a') + L('M72,60 Q100,48 128,56', dk, 1.3) + shine },
      buns: { back: '', front: both(`<circle cx="67" cy="46" r="13" fill="${c}" stroke="${OL}" stroke-width="${SW}"/>` + L('M60,42 Q67,38 74,44', hl, 2)) + P('M58,84 C52,40 148,40 142,84 C138,66 124,56 100,58 C76,56 62,66 58,84 Z', c) + P('M64,78 C66,62 84,56 100,58 C90,62 82,70 80,80 Z', c) + L('M80,48 Q94,43 110,45', hl, 3, 'opacity=".7"') },
      braid: { back: '', front: P(cap, c) + [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${132 + i * 1.5}" cy="${108 + i * 15}" rx="${8 - i * 0.6}" ry="9" fill="${i % 2 ? c : shade(c, 0.08)}" stroke="${OL}" stroke-width="2"/>`).join('') + `<path d="M134,178 l-4,10 l10,0 Z" fill="${c}" stroke="${OL}" stroke-width="2"/>` + P('M124,60 C138,66 142,84 136,100 L128,98 C132,84 130,72 122,66 Z', c) + shine },
    };
    return S[style] || S.short;
  }

  // ---------- garments ----------
  const G = {
    pantsWide: (c, b) => both(P(`M${B[b].hip + 2},194 L100,194 L100,206 C98,228 96,244 95,251 L74,251 C68,236 ${B[b].hip - 2},218 ${B[b].hip + 2},194 Z`, c) + P('M74,249 L95,249 L95,256 L75,256 Z', shade(c, -0.2)) + L('M80,214 Q86,226 84,240', shade(c, -0.22), 1.3)),
    pantsFit: (c, b) => both(P(`M${B[b].hip + 1},194 L100,194 L98,252 L75,252 Z`, c)),
    shorts: (c, b) => both(P(`M${B[b].hip},194 L100,194 L99,226 L${B[b].hip + 3},228 Z`, c) + L(`M${B[b].hip + 3},222 L99,220`, shade(c, -0.25), 1.4)),
    shinWraps: (b) => both(P('M76,226 L97,226 L97,256 L76,256 Z', '#e9e1cf') + L('M76,232 L97,234 M76,239 L97,241 M76,246 L97,248 M76,252 L97,254', '#b8ad94', 1.2)),
    armWraps: (b, col = '#e9e1cf') => { const x = b === 'masc' ? 44 : 51; return both(P(`M${x},178 L${x + 13},178 L${x + 13},198 L${x},198 Z`, col) + L(`M${x},184 L${x + 13},186 M${x},190 L${x + 13},192`, shade(col, -0.25), 1.2)); },
    boots: (c) => both(P('M74,234 L97,234 L98,262 C98,268 70,270 70,264 L72,250 Z', c) + P('M73,234 L98,234 L98,240 L73,240 Z', shade(c, 0.12)) + L('M76,258 Q82,262 88,262', shade(c, 0.3), 1.4, 'opacity=".8"')),
    sleeves: (c, b, len = 'long', cuff) => {
      const k = B[b], y = len === 'long' ? 196 : len === 'mid' ? 178 : 158, x0 = b === 'masc' ? 43 : 50;
      const d = `M${k.sh + 3},136 C${x0 + 3},146 ${x0},170 ${x0 - 1},${y} L${x0 + 15},${y + 1} C${x0 + 14},178 ${k.sh + 4},160 ${k.sh + 14},150 Z`;
      return both(P(d, c) + (len === 'long' ? L(`M${x0 + 2},${170} Q${x0 + 7},${173} ${x0 + 13},${169}`, shade(c, -0.25), 1.1) : '') + (cuff ? P(`M${x0 - 1},${y - 6} L${x0 + 15},${y - 5} L${x0 + 15},${y + 1} L${x0 - 1},${y} Z`, cuff) : ''));
    },
    tunic: (c, b, hem = 232, flare = 8) => { const k = B[b], dk = shade(c, -0.22); return both(P(`M100,128 L80,128 Q${k.sh + 1},130 ${k.sh - 1},141 L${k.hip + 1},196 L${k.hip - flare},${hem} L100,${hem} Z`, c) + (hem > 214 ? L(`M${k.hip + 8},${204} Q${k.hip + 4},${(204 + hem) / 2} ${k.hip + 2 - flare / 2},${hem - 3}`, dk, 1.2) + L(`M88,206 Q87,${(206 + hem) / 2} 86,${hem - 3}`, dk, 1) : '') + L(`M${k.sh + 8},150 Q${k.sh + 12},166 ${k.sh + 10},182`, dk, 1, 'opacity=".7"')); },
    wrapTop: (c, b) => both(P(`M100,138 L80,136 Q${B[b].sh + 4},138 ${B[b].sh + 4},146 L${B[b].sh + 7},168 L100,170 Z`, c)) + L('M70,140 L130,166 M72,152 L124,140', shade(c, -0.22), 1.4),
    monkWrap: (c, c2, b) => { const k = B[b]; return P(`M${200 - k.sh},140 Q${200 - k.sh - 4},132 118,130 L84,186 L${k.hip + 2},196 L${k.hip},170 Q${k.sh + 6},150 ${k.sh + 10},146 Z`, c) + P(`M118,130 L130,132 L${200 - k.hip - 2},196 L84,196 Z`, c) + L('M118,132 L86,190', shade(c, -0.25), 1.5) + L('M124,140 L100,192', shade(c, -0.2), 1.2); },
    sash: (c, b, tails = true) => { const w = B[b].waist; return P(`M${w},186 L${200 - w},186 L${200 - w + 1},198 L${w - 1},198 Z`, c) + (tails ? `<ellipse cx="${w + 10}" cy="192" rx="5" ry="6" fill="${shade(c, -0.08)}" stroke="${OL}" stroke-width="1.8"/>` : '') + (tails ? P(`M${w + 6},196 L${w + 14},196 L${w + 12},226 L${w + 4},224 Z`, shade(c, -0.1)) : '') + L(`M${w + 2},192 L${200 - w - 2},192`, shade(c, -0.25), 1.2); },
    collarV: (c) => P('M88,128 L100,146 L112,128 L108,126 L100,138 L92,126 Z', c),
    highCollar: (c) => P('M86,124 L114,124 L116,136 Q100,142 84,136 Z', c),
    fur: (y1, y2, b, fl = 8) => { const k = B[b]; let d = `M${k.hip - fl - 2},${y1}`; for (let x = k.hip - fl - 2; x <= 200 - k.hip + fl - 6; x += 8) d += ` q4,${y2 - y1} 8,0`; return `<path d="${d}" fill="#f7f4ee" stroke="${OL}" stroke-width="2"/>`; },
    furCollar: () => P('M78,124 Q72,134 82,142 Q90,148 100,146 Q110,148 118,142 Q128,134 122,124 Q112,130 100,130 Q88,130 78,124 Z', '#f7f4ee') + L('M86,136 l2,4 M96,140 l1,4 M106,140 l-1,4 M114,136 l-2,4', '#cfc8bc', 1.2),
    plates: (c, x1, x2, y1, y2, rows = 4, cols = 5) => { let o = P(`M${x1},${y1} L${x2},${y1} L${x2 - 2},${y2} L${x1 + 2},${y2} Z`, c); const dy = (y2 - y1) / rows, dx = (x2 - x1) / cols; for (let i = 1; i < rows; i++) o += L(`M${x1 + 1},${y1 + i * dy} L${x2 - 1},${y1 + i * dy}`, shade(c, -0.35), 1.2); for (let r = 0; r < rows; r++) for (let j = 1; j < cols; j++) o += L(`M${x1 + j * dx},${y1 + r * dy + 1} L${x1 + j * dx},${y1 + (r + 1) * dy - 1}`, shade(c, -0.3), 1); return o; },
    pauldron: (c, b) => { const x = B[b].sh; return both(P(`M${x - 8},150 C${x - 10},134 ${x + 4},126 ${x + 22},132 L${x + 18},146 C${x + 8},144 ${x - 2},148 ${x - 8},150 Z`, c) + L(`M${x - 4},142 Q${x + 6},136 ${x + 18},139`, shade(c, -0.3), 1.2)); },
    cape: (c, b, len = 250) => P(`M${B[b].sh + 4},136 Q100,124 ${200 - B[b].sh - 4},136 L${200 - B[b].sh + 20},${len} Q100,${len + 12} ${B[b].sh - 20},${len} Z`, c),
    mantle: (c, b) => P(`M${B[b].sh - 4},150 Q${B[b].sh},130 100,128 Q${200 - B[b].sh},130 ${200 - B[b].sh + 4},150 Q${200 - B[b].sh + 8},170 ${200 - B[b].sh + 2},176 Q100,168 ${B[b].sh - 2},176 Q${B[b].sh - 8},170 ${B[b].sh - 4},150 Z`, c) + `<circle cx="100" cy="136" r="3.5" fill="#d9b24c" stroke="${OL}" stroke-width="1.4"/>`,
    vest: (c, b) => both(P(`M100,148 L88,130 L80,130 Q${B[b].sh + 4},134 ${B[b].sh + 4},144 L${B[b].hip + 3},196 L98,196 Z`, c)) + `<circle cx="100" cy="162" r="2.6" fill="#d9b24c" stroke="${OL}" stroke-width="1.2"/>`,
    pattern: (c, x1, x2, y1, y2) => { let o = ''; for (let y = y1; y < y2; y += 13) for (let x = x1 + ((y / 13) % 2) * 6; x < x2; x += 12) o += `<path d="M${x},${y} q3,-4 6,0 q-3,4 -6,0" fill="none" stroke="${c}" stroke-width="1.1" opacity=".7"/>`; return o; },
    trimHem: (c, b, y, flare = 8) => { const k = B[b]; return P(`M${k.hip - flare},${y - 6} L${200 - k.hip + flare},${y - 6} L${200 - k.hip + flare},${y} L${k.hip - flare},${y} Z`, c); },
    emblem: (n, x, y, s = 1, col = '#e0a83a') => {
      const d = { fire: 'M0,-9 C4,-4 7,0 4,6 C2,9 -2,9 -4,6 C-6,2 -3,-2 -1,-4 C-1,0 1,1 2,0 C3,-3 1,-6 0,-9 Z', earth: 'M-8,6 L-8,-2 L-4,-6 L4,-6 L8,-2 L8,6 Z M-3,1 L3,1 L3,6 L-3,6 Z', water: 'M-8,0 A8,8 0 1 1 8,0 Q4,-4 0,0 Q-4,4 -8,0 Z', air: 'M0,0 m-6,0 a6,6 0 1 1 6,6 a3,3 0 1 1 -3,-3' }[n];
      return `<path transform="translate(${x},${y}) scale(${s})" d="${d}" fill="${n === 'air' ? 'none' : col}" stroke="${n === 'air' ? col : OL}" stroke-width="${n === 'air' ? 2 : 1.2}"/>`;
    },
  };

  // ---------- outfit catalog ----------
  // tier: 0 free starter, 1-3 store
  const OUTFITS = {
    earth_train: { n: 'earth', tier: 0, name: 'Quarry Wraps', price: 0, draw: (b, N, f) => ({ under: G.pantsWide('#5b4330', b) + G.shinWraps(b) + (b === 'femme' ? G.wrapTop(N.main, b) : '') + G.sash('#a88a5c', b) + G.armWraps(b), sleeves: '' }) },
    earth_tunic: { n: 'earth', tier: 1, name: 'Village Tunic', price: 1500, draw: (b, N) => ({ under: G.pantsWide(N.dark, b) + G.boots('#3a2a1c') + G.tunic(N.main, b, 230) + G.collarV(N.light) + G.sash(N.accent, b), sleeves: G.sleeves(N.main, b, 'long', N.dark) }) },
    earth_armor: { n: 'earth', tier: 2, name: 'Stonewall Armor', price: 4500, draw: (b, N) => ({ under: G.pantsWide('#2e2a22', b) + G.boots('#2a2018') + G.tunic(N.main, b, 238, 10) + G.plates('#4b4436', 72, 128, 140, 190, 4, 5) + G.sash(N.dark, b, false) + G.highCollar(N.dark), sleeves: G.sleeves(N.main, b, 'long', '#4b4436'), over: G.pauldron('#4b4436', b) }) },
    earth_noble: { n: 'earth', tier: 3, name: 'Jade Court Robe', price: 9000, draw: (b, N) => ({ under: G.boots('#2a2018') + G.tunic(N.dark, b, 258, 16) + G.pattern(N.accent, 66, 134, 140, 252) + G.trimHem(N.accent, b, 258, 16) + G.collarV(N.accent) + G.sash(N.main, b) + G.emblem('earth', 100, 166, 1, N.accent), sleeves: G.sleeves(N.dark, b, 'long', N.accent) }) },

    fire_train: { n: 'fire', tier: 0, name: 'Ember Shorts', price: 0, draw: (b, N) => ({ under: G.shorts(N.main, b) + (b === 'femme' ? G.wrapTop(N.main, b) : '') + G.armWraps(b, N.main) + both(P('M78,248 L96,248 L96,258 L78,258 Z', N.main)), sleeves: '' }) },
    fire_tunic: { n: 'fire', tier: 1, name: 'Cadet Tunic', price: 1500, draw: (b, N) => ({ under: G.pantsFit('#4a2a24', b) + G.boots('#2a1612') + G.tunic(N.main, b, 226) + G.collarV(N.dark) + G.sash(N.dark, b, false), sleeves: G.sleeves(N.main, b, 'mid', N.dark) }) },
    fire_armor: { n: 'fire', tier: 2, name: 'Flame Guard Armor', price: 4500, draw: (b, N) => ({ under: G.pantsFit('#2b1715', b) + G.boots('#1e1110') + G.tunic('#3a1b18', b, 246, 12) + G.plates(N.main, 72, 128, 138, 188, 3, 1) + G.emblem('fire', 100, 160, 1.5, N.accent) + G.sash(N.accent, b, false) + G.highCollar(N.main), sleeves: G.sleeves('#3a1b18', b, 'long', N.main), over: G.pauldron(N.main, b) }) },
    fire_royal: { n: 'fire', tier: 3, name: 'Royal Sunrise Robe', price: 9000, draw: (b, N) => ({ under: G.boots('#1e1110') + G.tunic(N.main, b, 260, 18) + both(P('M100,140 L92,140 L86,258 L100,258 Z', N.dark)) + G.trimHem(N.accent, b, 260, 18) + G.highCollar(N.accent) + G.sash(N.accent, b) + G.emblem('fire', 100, 162, 1.3, N.accent), sleeves: G.sleeves(N.main, b, 'long', N.accent), over: G.pauldron(N.dark, b) }) },

    air_train: { n: 'air', tier: 0, name: 'Monk Wraps', price: 0, draw: (b, N) => ({ under: G.pantsWide(N.light, b) + G.boots('#7a4a26') + G.monkWrap(N.main, N.light, b) + G.sash('#b8452a', b), sleeves: '' }) },
    air_tunic: { n: 'air', tier: 1, name: 'Nomad Tunic', price: 1500, draw: (b, N) => ({ under: G.pantsWide(N.light, b) + G.boots('#7a4a26') + G.tunic(N.light, b, 206, 0) + G.sash(N.main, b, false), sleeves: G.sleeves(N.light, b, 'long', N.main), over: G.mantle(N.main, b) }) },
    air_cape: { n: 'air', tier: 2, name: 'Sky Mantle', price: 4500, draw: (b, N) => ({ back: G.cape(N.dark, b, 252), under: G.pantsWide(N.light, b) + G.boots('#7a4a26') + G.tunic(N.light, b, 206, 0) + G.sash(N.main, b, false), sleeves: G.sleeves(N.light, b, 'long', N.main), over: G.mantle(N.main, b) + G.emblem('air', 100, 152, 0.9, N.accent) }) },
    air_vest: { n: 'air', tier: 3, name: 'Glider Vest', price: 9000, draw: (b, N) => ({ under: G.pantsWide(N.light, b) + G.boots('#6a3e1e') + G.tunic(N.light, b, 206, 0) + G.vest('#8a5528', b) + G.sash(N.main, b) + G.highCollar(N.main), sleeves: G.sleeves(N.light, b, 'long', N.main) }) },

    water_train: { n: 'water', tier: 0, name: 'Tide Shorts', price: 0, draw: (b, N) => ({ under: G.shorts(N.dark, b) + G.shinWraps(b) + (b === 'femme' ? G.wrapTop(N.main, b) : '') + G.armWraps(b) + P('M90,124 Q100,130 110,124 L110,130 Q100,136 90,130 Z', '#f0ead8'), sleeves: '' }) },
    water_tunic: { n: 'water', tier: 1, name: 'Tribe Tunic', price: 1500, draw: (b, N) => ({ under: G.pantsWide(N.dark, b) + G.boots('#4a3424') + G.tunic(N.light, b, 222, 4) + both(P(`M100,196 L${B[b].hip + 1},196 L${B[b].hip - 4},222 L100,236 Z`, N.light)) + L('M70,222 L100,236 L130,222', N.accent, 3) + G.collarV(N.accent) + G.sash(N.dark, b, false), sleeves: G.sleeves(N.light, b, 'long', N.dark) }) },
    water_parka: { n: 'water', tier: 2, name: 'Polar Parka', price: 4500, draw: (b, N) => ({ under: G.pantsWide(N.dark, b) + G.boots('#4a3424') + G.tunic(N.main, b, 236, 8) + G.fur(230, 238, b, 9) + both(L('M100,140 L100,230', N.accent, 3)) + G.sash(N.dark, b, false), sleeves: G.sleeves(N.main, b, 'long', '#f7f4ee'), over: G.furCollar() }) },
    water_armor: { n: 'water', tier: 3, name: 'Glacier Armor', price: 9000, draw: (b, N) => ({ under: G.pantsWide(N.dark, b) + G.boots('#2a3346') + G.tunic(N.dark, b, 240, 10) + G.plates('#6f9fd2', 72, 128, 138, 192, 4, 4) + G.emblem('water', 100, 152, 1, '#e8f4ff') + G.sash('#e8f4ff', b, false), sleeves: G.sleeves(N.dark, b, 'long', '#6f9fd2'), over: G.pauldron('#6f9fd2', b) }) },
  };
  const HAIRSTYLES = { short: { name: 'Short & Messy', price: 0 }, swept: { name: 'Side Swept', price: 0 }, topknot: { name: 'Topknot', price: 0 }, ponytail: { name: 'Ponytail', price: 0 }, buns: { name: 'Twin Buns', price: 0 }, braid: { name: 'Braid', price: 1200 }, long: { name: 'Long & Draping', price: 1200 }, bald: { name: 'Shaved', price: 0 } };

  const ACCESSORIES = { none: { name: 'None', price: 0 }, headband: { name: 'Headband', price: 600 }, scarf: { name: 'Travel Scarf', price: 900 }, beads: { name: 'Bead Necklace', price: 900 }, earrings: { name: 'Gold Earrings', price: 1200 } };
  function accessory(k, N, hairStyle) {
    if (k === 'headband') return P('M58,70 C70,58 130,58 142,70 L142,78 C130,66 70,66 58,78 Z', N.main) + P('M138,72 L152,82 L148,86 L136,78 Z', N.main) + P('M138,74 L150,92 L145,94 L135,80 Z', shade(N.main, -0.15));
    if (k === 'scarf') return P('M80,124 Q100,136 120,124 L124,134 Q100,148 76,134 Z', N.light) + P('M84,134 L96,140 L90,170 L80,166 Z', N.light) + L('M82,152 L92,155 M81,160 L91,163', shade(N.light, -0.25), 1.2);
    if (k === 'beads') return [-14, -7, 0, 7, 14].map((dx, i) => `<circle cx="${100 + dx}" cy="${136 + Math.abs(dx) * -0.25 + 4}" r="${i === 2 ? 3.6 : 2.6}" fill="${i === 2 ? N.light : '#e8dcc2'}" stroke="${OL}" stroke-width="1.2"/>`).join('');
    if (k === 'earrings') return both(`<circle cx="61" cy="99" r="2.8" fill="#e0b13a" stroke="${OL}" stroke-width="1.2"/>`);
    return '';
  }

  // Air Nomad arrow markings (only ever drawn for air nomads, level 5+ masters)
  // stripes run down the arms to arrowheads on the hands and down the legs to the feet; head arrow runs over the crown to the forehead
  function arrows(style, b, color, part, glowId, clip) {
    const k = B[b], [hx, hy] = k.hand, [fx, fy] = k.foot;
    const ax = b === 'masc' ? 50.5 : 57;
    const arm = `M${k.sh + 3},146 C${ax},156 ${ax - 1},178 ${ax},${hy - 8}`;
    const handHead = `M${hx - 5},${hy - 9} L${hx + 5},${hy - 9} L${hx},${hy + 1} Z`;
    const leg = `M${fx},200 C${fx - 1},220 ${fx - 1},242 ${fx},${fy - 6}`;
    const footHead = `M${fx - 5},${fy - 7} L${fx + 5},${fy - 7} L${fx},${fy + 1} Z`;
    const head = style === 'bald' ? 'M95,46 L105,46 L105,64 L111,64 L100,79 L89,64 L95,64 Z' : 'M96,54 L104,54 L104,65 L110,65 L100,79 L90,65 L96,65 Z';
    const draw = (f, c) => {
      const st = (d, w) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${f}/>`;
      const fl = (d) => `<path d="${d}" fill="${c}" ${f}/>`;
      return { arms: both(st(arm, 5)), legs: both(st(leg, 5) + fl(footHead)), hands: both(fl(handHead)), head: fl(head) }[part] || '';
    };
    return glowId ? draw(`filter="url(#${glowId})"`, color) + draw('', '#fff') : draw('', color);
    return '';
  }

  // ---------- compose ----------
  const DEFAULT = { level: 1, build: 'masc', skin: 'tan', hair: 'short', hairColor: 'black', eyes: 'brown', mood: 'calm', nation: 'earth', outfit: 'earth_train', acc: 'none', markings: false };
  function svg(cfg = {}, opts = {}) {
    const o = Object.assign({}, DEFAULT, cfg), b = o.build, N = NATION[o.nation] || NATION.earth;
    const out = (OUTFITS[o.outfit] || OUTFITS[o.nation + '_train']).draw(b, NATION[(OUTFITS[o.outfit] || {}).n || o.nation]);
    const id = 'fg' + ++uid; o._id = id; const av = !!opts.avatarState, gid = av ? id + 'g' : null;
    const air = o.nation === 'air';
    const bd = body(b, o.skin), hr = hair(o.hair, o.hairColor);
    const defs = `<defs><filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter><filter id="${id}a" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter><radialGradient id="${id}r"><stop offset="0" stop-color="${N.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${N.glow}" stop-opacity="0"/></radialGradient></defs>`;
    let s = defs;
    if (av) s += `<ellipse cx="100" cy="165" rx="98" ry="152" fill="url(#${id}r)"/><ellipse cx="100" cy="165" rx="72" ry="138" fill="none" stroke="${N.glow}" stroke-width="6" opacity=".6" filter="url(#${id}a)"/>`;
    const master = air && ((o.level || 1) >= 5 || o.markings);
    const AC = av ? '#ffffff' : '#3f8fd6';
    const BODY = 'translate(100,130) scale(.93,1.3) translate(-100,-130)', HEADT = 'translate(100,124) scale(.84) translate(-100,-124)';
    s += `<g transform="${BODY}">`;
    s += out.back || '';
    s += `<g transform="${HEADT}">${hr.back}</g>`;
    // figure (body + clothes), then a cel-shade pass using the same shapes, clipped to the shadow side
    const K = B[b], [kfx, kfy, kfw, kfh] = K.foot;
    s += `<clipPath id="${id}ka"><path d="${K.arm}"/></clipPath><clipPath id="${id}kl"><path d="${K.leg}"/><ellipse cx="${kfx}" cy="${kfy}" rx="${kfw}" ry="${kfh}"/></clipPath>`;
    const mk = (q) => (master ? arrows(o.hair, b, AC, q, av ? gid : null, id + 'k') : '');
    let fig = bd.back + mk('arms') + (out.sleeves || '');
    fig += bd.core + bd.chest + mk('legs');
    fig += out.under + bd.hands + bd.neck + (out.over || '');
    s += fig;
    s += `<clipPath id="${id}c"><path d="M124,118 C146,150 144,220 134,272 L200,272 L200,118 Z M44,196 L70,196 L70,212 L44,212 Z M60,250 L140,250 L140,272 L60,272 Z M88,134 L112,134 L112,140 L88,140 Z"/></clipPath>`;
    s += `<g clip-path="url(#${id}c)" class="${id}sh">${fig}</g><style>.${id}sh *{fill:#1a0c04!important;fill-opacity:.22!important;stroke:none!important;filter:none!important}</style>`;
    if (master && !av) s += arrows(o.hair, b, AC, 'hands');
    if (master && av) s += arrows(o.hair, b, AC, 'hands', gid);
    const late = o.acc === 'headband' || o.acc === 'earrings';
    if (!late) s += accessory(o.acc, N, o.hair);
    s += `</g><g transform="${HEADT}">`;
    s += `<g>${head(o, av ? gid : null)}</g>`;
    // hair shadow on the face
    s += `<clipPath id="${id}f"><path d="${FACE}"/></clipPath><g clip-path="url(#${id}f)"><g transform="translate(0,4)" class="${id}hs">${hr.front}</g></g><style>.${id}hs *{fill:#3a1a08!important;fill-opacity:.18!important;stroke:none!important}</style>`;
    s += hr.front;
    if (late) s += accessory(o.acc, N, o.hair);
    if (master) s += `<g clip-path="url(#${id}f)">${arrows(o.hair, b, AC, 'head', av ? gid : null)}</g>`;
    s += '</g>';
    const vb = opts.portrait ? '54 22 92 102' : '0 0 200 316';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="figure">${s}</svg>`;
  }
  // prices & ownership: p.owned.fig = ['outfit:air_tunic', 'hair:braid', 'acc:scarf']
  const OTHER_STARTER = 300;
  function priceOf(kind, id, nation) {
    if (kind === 'outfit') { const o = OUTFITS[id]; if (!o) return 0; return o.price || (o.n === nation ? 0 : OTHER_STARTER); }
    if (kind === 'hair') return (HAIRSTYLES[id] || {}).price || 0;
    if (kind === 'acc') return (ACCESSORIES[id] || {}).price || 0;
    return 0;
  }
  const owns = (p, kind, id) => priceOf(kind, id, p && p.nation) === 0 || !!(p && p.owned && (p.owned.fig || []).includes(kind + ':' + id));
  function starter(nation, seed = 0) {
    const n = NATION[nation] ? nation : 'earth', sk = Object.keys(SKIN), hs = ['short', 'topknot', 'ponytail', 'buns', 'swept'];
    return { build: seed % 2 ? 'femme' : 'masc', skin: sk[(seed >> 1) % sk.length], hair: hs[(seed >> 2) % hs.length], hairColor: 'black', eyes: 'brown', mood: 'calm', outfit: n + '_train', acc: 'none' };
  }
  // the bits of a profile the figure needs; safe to embed in game docs
  const of = (p, level) => (p && p.fig ? Object.assign({}, p.fig, { nation: p.nation || (OUTFITS[p.fig.outfit] || {}).n || 'earth', level: level || 1 }) : null);
  return { svg, priceOf, owns, starter, of, OUTFITS, HAIRSTYLES, ACCESSORIES, SKIN, HAIR, EYES, NATION, DEFAULT };
})();
if (typeof module !== 'undefined') module.exports = Figure;
