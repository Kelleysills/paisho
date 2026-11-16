/* Original tile artwork (SVG), drawn in a -1..1 box */
const Glyphs = (() => {
  const O = '#e07b2e', W = '#f4ecd8', K = '#2a1a10', SW = 'stroke="' + K + '" stroke-width="0.045"';
  const rot = (n, fn) => Array.from({ length: n }, (_, k) => fn((360 / n) * k)).join('');
  const G = {
    rose: () => rot(5, (a) => `<circle cx="0" cy="-0.42" r="0.33" fill="${O}" ${SW} transform="rotate(${a})"/>`) +
      `<circle r="0.3" fill="${O}" ${SW}/><circle r="0.14" fill="${W}" ${SW}/>`,
    chrys: () => rot(16, (a) => `<ellipse cx="0" cy="-0.5" rx="0.075" ry="0.34" fill="${O}" ${SW} transform="rotate(${a})"/>`) +
      `<circle r="0.2" fill="${O}" ${SW}/>` + rot(8, (a) => `<circle cx="0" cy="-0.11" r="0.035" fill="${W}" transform="rotate(${a})"/>`),
    rhodo: () => rot(5, (a) => `<ellipse cx="0" cy="-0.4" rx="0.25" ry="0.36" fill="${O}" ${SW} transform="rotate(${a})"/>`) +
      `<path d="M0,-0.7 C0.1,-0.55 0.06,-0.42 0,-0.32 C-0.06,-0.42 -0.1,-0.55 0,-0.7Z" fill="${W}"/>` +
      `<circle r="0.12" fill="${W}" ${SW}/>`,
    lily: () => `<path d="M0,0.72 C-0.55,0.35 -0.5,-0.2 -0.22,-0.45 C-0.12,-0.2 -0.05,-0.1 0,-0.05 C0.05,-0.1 0.12,-0.2 0.22,-0.45 C0.5,-0.2 0.55,0.35 0,0.72Z" fill="${W}" ${SW}/>` +
      `<path d="M-0.62,-0.1 C-0.75,-0.35 -0.6,-0.55 -0.42,-0.5 C-0.55,-0.4 -0.55,-0.25 -0.45,-0.1Z M0.62,-0.1 C0.75,-0.35 0.6,-0.55 0.42,-0.5 C0.55,-0.4 0.55,-0.25 0.45,-0.1Z" fill="${W}" ${SW}/>` +
      [-0.12, -0.04, 0.04, 0.12].map((x) => `<line x1="${x}" y1="0" x2="${x * 1.6}" y2="-0.7" stroke="${W}" stroke-width="0.05"/><circle cx="${x * 1.6}" cy="-0.72" r="0.05" fill="${O}"/>`).join(''),
    jasmine: () => rot(8, (a) => `<path d="M0,-0.85 C0.2,-0.55 0.14,-0.25 0,-0.1 C-0.14,-0.25 -0.2,-0.55 0,-0.85Z" fill="${W}" ${SW} transform="rotate(${a})"/>`) +
      `<circle r="0.11" fill="${O}" ${SW}/>`,
    jade: () => `<path d="M-0.55,0.15 C-0.55,-0.25 -0.25,-0.55 0,-0.6 C0.25,-0.55 0.55,-0.25 0.55,0.15 Z" fill="${W}" ${SW}/>` +
      `<path d="M-0.65,0.35 C-0.6,0.05 -0.35,-0.15 0,-0.15 C0.35,-0.15 0.6,0.05 0.65,0.35 Z" fill="${W}" ${SW}/>` +
      `<path d="M-0.3,0.4 C-0.2,0.7 0.2,0.7 0.3,0.4 Z" fill="${O}" ${SW}/><circle cy="-0.68" r="0.08" fill="${O}" ${SW}/>`,
    orchid: () => `<path d="M0,-0.78 C0.55,-0.3 0.5,0.55 0,0.72 C-0.5,0.55 -0.55,-0.3 0,-0.78Z" fill="${W}" ${SW}/>` +
      `<path d="M0,0.5 L0,-0.35 M-0.2,-0.12 L0,-0.4 L0.2,-0.12" stroke="${O}" stroke-width="0.14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    lotus: () => rot(8, (a) => `<ellipse cx="0" cy="-0.55" rx="0.2" ry="0.3" fill="${W}" ${SW} transform="rotate(${a + 22.5})"/>`) +
      rot(8, (a) => `<ellipse cx="0" cy="-0.32" rx="0.13" ry="0.2" fill="${O}" ${SW} transform="rotate(${a})"/>`) +
      `<circle r="0.17" fill="${W}" ${SW}/><circle r="0.07" fill="${O}"/>`,
    firelily: () => rot(6, (a) => `<path d="M0,-0.88 L0.16,-0.25 L-0.16,-0.25Z" fill="${W}" ${SW} transform="rotate(${a})"/>`) +
      rot(6, (a) => `<path d="M0,-0.5 L0.1,-0.15 L-0.1,-0.15Z" fill="${O}" transform="rotate(${a + 30})"/>`) +
      `<circle r="0.16" fill="${O}" ${SW}/>` + rot(6, (a) => `<circle cx="0" cy="-0.68" r="0.05" fill="${O}" transform="rotate(${a + 30})"/>`),
    dahlia: () => rot(12, (a) => `<circle cx="0" cy="-0.68" r="0.13" fill="${O}" ${SW} transform="rotate(${a})"/>`) +
      rot(8, (a) => `<circle cx="0" cy="-0.42" r="0.12" fill="${W}" ${SW} transform="rotate(${a + 22.5})"/>`) +
      rot(5, (a) => `<circle cx="0" cy="-0.18" r="0.08" fill="${O}" transform="rotate(${a})"/>`),
    stone: () => `<circle r="0.72" fill="${O}" ${SW}/><circle r="0.58" fill="none" stroke="${K}" stroke-width="0.04"/><rect x="-0.18" y="-0.18" width="0.36" height="0.36" fill="${W}" ${SW}/>`,
    knotweed: () => rot(3, (a) => `<ellipse cx="0" cy="-0.28" rx="0.3" ry="0.46" fill="none" stroke="${W}" stroke-width="0.11" transform="rotate(${a})"/>`) +
      rot(3, (a) => `<ellipse cx="0" cy="-0.28" rx="0.3" ry="0.46" fill="none" stroke="${K}" stroke-width="0.03" transform="rotate(${a})"/>`) +
      `<circle r="0.13" fill="${O}" ${SW}/>`,
    wheel: () => `<circle r="0.7" fill="none" stroke="${O}" stroke-width="0.14"/>` +
      rot(8, (a) => `<line x1="0" y1="-0.18" x2="0" y2="-0.66" stroke="${O}" stroke-width="0.09" transform="rotate(${a})"/>`) +
      `<circle r="0.18" fill="${W}" ${SW}/>`,
    boat: () => `<path d="M-0.75,0.25 L0.75,0.25 C0.6,0.6 -0.45,0.65 -0.75,0.25Z" fill="${O}" ${SW}/>` +
      `<path d="M-0.05,0.2 L-0.05,-0.75 L-0.55,0.15Z" fill="${W}" ${SW}/><path d="M0.05,0.2 L0.05,-0.6 L0.5,0.15Z" fill="${W}" ${SW}/>`,
    badgermole: () => `<path d="M-0.75,0.45 C-0.65,-0.35 0.65,-0.35 0.75,0.45Z" fill="${W}" ${SW}/>` +
      [-0.25, 0, 0.25].map((x) => `<path d="M${x},0.42 L${x * 1.3},0.05" stroke="${O}" stroke-width="0.1" stroke-linecap="round"/>`).join('') +
      `<circle cx="-0.25" cy="-0.05" r="0.06" fill="${K}"/><circle cx="0.25" cy="-0.05" r="0.06" fill="${K}"/>`,
    dragon: () => `<path d="M-0.55,-0.45 C0.2,-0.85 0.75,-0.2 0.2,0.05 C-0.3,0.25 -0.2,0.75 0.55,0.55" fill="none" stroke="${W}" stroke-width="0.17" stroke-linecap="round"/>` +
      `<path d="M-0.55,-0.45 C0.2,-0.85 0.75,-0.2 0.2,0.05 C-0.3,0.25 -0.2,0.75 0.55,0.55" fill="none" stroke="${K}" stroke-width="0.03"/>` +
      `<path d="M0.55,0.55 C0.7,0.4 0.8,0.55 0.7,0.75 C0.6,0.7 0.55,0.65 0.55,0.55Z" fill="${O}"/><circle cx="-0.55" cy="-0.45" r="0.12" fill="${O}" ${SW}/>`,
    skybison: () => `<path d="M-0.7,0.3 C-0.85,0 -0.55,-0.25 -0.3,-0.15 C-0.25,-0.5 0.25,-0.55 0.35,-0.2 C0.65,-0.3 0.85,0.05 0.65,0.3Z" fill="${W}" ${SW}/>` +
      `<path d="M0,0.7 L0,0.05 M-0.18,0.25 L0,0.02 L0.18,0.25" stroke="${O}" stroke-width="0.12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    koi: () => `<path d="M0,-0.7 C0.55,-0.7 0.55,0 0,0 C-0.55,0 -0.55,0.7 0,0.7 C-0.75,0.7 -0.75,-0.7 0,-0.7Z" fill="${W}" ${SW}/>` +
      `<path d="M0,-0.7 C0.75,-0.7 0.75,0.7 0,0.7 C0.55,0.7 0.55,0 0,0 C-0.55,0 -0.55,-0.7 0,-0.7Z" fill="${O}" ${SW}/>` +
      `<circle cy="-0.35" r="0.08" fill="${K}"/><circle cy="0.35" r="0.08" fill="${K}"/>`,
    random: () => `<circle r="0.7" fill="none" stroke="${W}" stroke-width="0.08" stroke-dasharray="0.15 0.12"/><text y="0.28" text-anchor="middle" font-size="0.85" font-weight="900" fill="${O}" font-family="Cinzel,serif">?</text>`,
  };
  const DISC = [{ fill: '#d9b27c', rim: '#7a4a22', in: '#c79a62' }, { fill: '#4a2a17', rim: '#d4a24c', in: '#3a2010' }];
  function tile(type, owner, r = 1) {
    const d = DISC[owner == null ? 0 : owner];
    return `<circle r="${r}" fill="${d.fill}" stroke="${d.rim}" stroke-width="${0.09 * r}"/>` +
      `<circle r="${0.86 * r}" fill="none" stroke="${d.in}" stroke-width="${0.04 * r}"/>` +
      `<g transform="scale(${0.74 * r})">${(G[type] || G.random)()}</g>`;
  }
  function svg(type, owner, extra = '') { return `<svg viewBox="-1.12 -1.12 2.24 2.24" ${extra}>${tile(type, owner)}</svg>`; }
  return { G, tile, svg, DISC };
})();
