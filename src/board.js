/* Board SVG rendering. Square (r,c) centre = (c-8.5, r-8.5) */
const Board = (() => {
  const P = PaiSho;
  const cx = (i) => (i % 18) - 8.5, cy = (i) => Math.floor(i / 18) - 8.5;
  const GATE_POS = [[0, -8], [8, 0], [0, 8], [-8, 0]];
  let uid = 0;
  function base(themeId) {
    const T = (typeof Eco !== 'undefined' && Eco.BOARDS[themeId]) || { wood: ['#b27a47', '#7c4f2a'], light: '#ebe3d0', dark: '#b8332e', rim: '#d4a24c', gate: '#5a1f1c', gateEdge: '#e6b54a', bg: '#3a2214' };
    const n = ++uid, W = 'wood' + n, C = 'bc' + n, GR = 'grain' + n;
    let o = `<defs>
      <radialGradient id="${W}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${T.wood[0]}"/><stop offset="1" stop-color="${T.wood[1]}"/></radialGradient>
      <clipPath id="${C}"><circle r="9"/></clipPath>
      <pattern id="${GR}" width="3" height="0.6" patternUnits="userSpaceOnUse"><path d="M0,0.3 Q0.75,0.15 1.5,0.3 T3,0.3" stroke="#00000014" stroke-width="0.05" fill="none"/></pattern>
    </defs>
    <circle r="9.45" fill="${T.bg}" stroke="${T.rim}" stroke-width="0.12"/>
    <circle r="9" fill="url(#${W})"/><circle r="9" fill="url(#${GR})"/>
    <g clip-path="url(#${C})">
      <polygon points="0,0 0,-9 -9,0" fill="${T.light}"/><polygon points="0,0 0,9 9,0" fill="${T.light}"/>
      <polygon points="0,0 0,-9 9,0" fill="${T.dark}"/><polygon points="0,0 0,9 -9,0" fill="${T.dark}"/>`;
    const GC = T.grid || '#2a1a10', GO = T.gridOp || 0.38, LC = T.lines || '#2a1a10';
    if (T.lightHatch) { // seismic style: outline the gardens in white
      o += `<polygon points="0,0 0,-9 -9,0" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="0.07"/><polygon points="0,0 0,9 9,0" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="0.07"/>`;
      o += `<polygon points="0,0 0,-9 9,0" fill="none" stroke="#bbb" stroke-opacity=".5" stroke-width="0.05" stroke-dasharray="0.25 0.2"/><polygon points="0,0 0,9 -9,0" fill="none" stroke="#bbb" stroke-opacity=".5" stroke-width="0.05" stroke-dasharray="0.25 0.2"/>`;
      for (let r = 1; r <= 9; r += 2) o += `<circle r="${r}" fill="none" stroke="#fff" stroke-opacity="${0.05 + 0.02 * r}" stroke-width="0.03"/>`;
    }
    for (let k = -9; k <= 9; k++) o += `<line x1="${k}" y1="-9.5" x2="${k}" y2="9.5" stroke="${GC}" stroke-opacity="${GO}" stroke-width="0.035"/><line y1="${k}" x1="-9.5" y2="${k}" x2="9.5" stroke="${GC}" stroke-opacity="${GO}" stroke-width="0.035"/>`;
    o += `<line x1="-9" y1="-9" x2="9" y2="9" stroke="${LC}" stroke-opacity=".25" stroke-width="0.04"/><line x1="9" y1="-9" x2="-9" y2="9" stroke="${LC}" stroke-opacity=".25" stroke-width="0.04"/>`;
    o += `<polygon points="0,-9 9,0 0,9 -9,0" fill="none" stroke="${LC}" stroke-opacity=".55" stroke-width="0.07"/>`;
    // gates
    GATE_POS.forEach(([x, y], g) => {
      o += `<rect x="${x - 1}" y="${y - 1}" width="2" height="2" fill="${T.gate}" stroke="${T.gateEdge}" stroke-width="0.08" rx="0.15"/>`;
      o += `<circle cx="${x}" cy="${y}" r="0.7" fill="none" stroke="${T.gateEdge}" stroke-opacity=".5" stroke-width="0.05" stroke-dasharray="0.2 0.15"/>`;
    });
    o += `</g><circle r="9" fill="none" stroke="${T.lightHatch ? '#fff' : '#2a1a10'}" stroke-width="0.1"/>`;
    o += `<circle r="0.09" fill="${T.lightHatch ? '#fff' : '#2a1a10'}"/>`;
    return o;
  }
  return { base, cx, cy, GATE_POS };
})();
