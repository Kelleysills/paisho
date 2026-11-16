/* Board SVG rendering. Square (r,c) centre = (c-8.5, r-8.5) */
const Board = (() => {
  const P = PaiSho;
  const cx = (i) => (i % 18) - 8.5, cy = (i) => Math.floor(i / 18) - 8.5;
  const GATE_POS = [[0, -8], [8, 0], [0, 8], [-8, 0]];
  function base() {
    let o = `<defs>
      <radialGradient id="wood" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#b27a47"/><stop offset="1" stop-color="#7c4f2a"/></radialGradient>
      <clipPath id="bc"><circle r="9"/></clipPath>
      <pattern id="grain" width="3" height="0.6" patternUnits="userSpaceOnUse"><path d="M0,0.3 Q0.75,0.15 1.5,0.3 T3,0.3" stroke="#00000014" stroke-width="0.05" fill="none"/></pattern>
    </defs>
    <circle r="9.45" fill="#3a2214" stroke="#d4a24c" stroke-width="0.12"/>
    <circle r="9" fill="url(#wood)"/><circle r="9" fill="url(#grain)"/>
    <g clip-path="url(#bc)">
      <polygon points="0,0 0,-9 -9,0" fill="#ebe3d0"/><polygon points="0,0 0,9 9,0" fill="#ebe3d0"/>
      <polygon points="0,0 0,-9 9,0" fill="#b8332e"/><polygon points="0,0 0,9 -9,0" fill="#b8332e"/>`;
    for (let k = -9; k <= 9; k++) o += `<line x1="${k}" y1="-9.5" x2="${k}" y2="9.5" stroke="#2a1a10" stroke-opacity=".38" stroke-width="0.035"/><line y1="${k}" x1="-9.5" y2="${k}" x2="9.5" stroke="#2a1a10" stroke-opacity=".38" stroke-width="0.035"/>`;
    o += `<line x1="-9" y1="-9" x2="9" y2="9" stroke="#2a1a10" stroke-opacity=".25" stroke-width="0.04"/><line x1="9" y1="-9" x2="-9" y2="9" stroke="#2a1a10" stroke-opacity=".25" stroke-width="0.04"/>`;
    o += `<polygon points="0,-9 9,0 0,9 -9,0" fill="none" stroke="#2a1a10" stroke-opacity=".55" stroke-width="0.07"/>`;
    // gates
    GATE_POS.forEach(([x, y], g) => {
      o += `<rect x="${x - 1}" y="${y - 1}" width="2" height="2" fill="#5a1f1c" stroke="#e6b54a" stroke-width="0.08" rx="0.15"/>`;
      o += `<circle cx="${x}" cy="${y}" r="0.7" fill="none" stroke="#e6b54a" stroke-opacity=".5" stroke-width="0.05" stroke-dasharray="0.2 0.15"/>`;
    });
    o += `</g><circle r="9" fill="none" stroke="#2a1a10" stroke-width="0.1"/>`;
    // shade off-board squares? none needed; centre point
    o += `<circle r="0.09" fill="#2a1a10"/>`;
    return o;
  }
  return { base, cx, cy, GATE_POS };
})();
