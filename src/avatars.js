/* Original element-themed avatars and profile cards (no show artwork) */
const Avatars = (() => {
  const EL = {
    air:    { name: 'Air',    c: ['#f7cf63', '#d9772a'], ink: '#fff8e6' },
    water:  { name: 'Water',  c: ['#5fb2ea', '#1b4a8a'], ink: '#eef7ff' },
    earth:  { name: 'Earth',  c: ['#8cc152', '#2c5a1c'], ink: '#f2f8e8' },
    fire:   { name: 'Fire',   c: ['#f0633f', '#7a140f'], ink: '#fff0e6' },
    spirit: { name: 'Spirit', c: ['#b893e3', '#38215f'], ink: '#f6efff' },
    lotus:  { name: 'Lotus',  c: ['#f3e7c9', '#b88a4a'], ink: '#3a2414' },
  };
  const S = (ink, w = 0.11) => `fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const F = (ink) => `fill="${ink}"`;
  const LIST = [
    { id: 'gust', el: 'air', label: 'Gust', g: (i) => `<path d="M-0.6,-0.25 H0.25 A0.22,0.22 0 1 0 0.05,-0.55" ${S(i)}/><path d="M-0.65,0.05 H0.45 A0.25,0.25 0 1 1 0.25,0.35" ${S(i)}/><path d="M-0.5,0.35 H-0.05" ${S(i)}/>` },
    { id: 'cloud', el: 'air', label: 'Cloud', g: (i) => `<path d="M-0.6,0.3 C-0.8,0.3 -0.8,-0.05 -0.55,-0.05 C-0.55,-0.4 -0.1,-0.45 0,-0.2 C0.15,-0.45 0.6,-0.35 0.5,0 C0.8,0 0.8,0.3 0.55,0.3 Z" ${F(i)}/>` },
    { id: 'kite', el: 'air', label: 'Kite', g: (i) => `<path d="M0,-0.65 L0.4,-0.1 L0,0.35 L-0.4,-0.1 Z M0,-0.65 V0.35 M-0.4,-0.1 H0.4" ${S(i, 0.08)}/><path d="M0,0.35 C-0.15,0.5 0.15,0.55 0,0.7" ${S(i, 0.07)}/>` },
    { id: 'wave', el: 'water', label: 'Wave', g: (i) => `<path d="M-0.7,0.1 C-0.45,-0.15 -0.25,-0.15 -0.05,0.1 C0.15,0.35 0.4,0.35 0.7,0.1" ${S(i)}/><path d="M-0.7,0.42 C-0.45,0.17 -0.25,0.17 -0.05,0.42 C0.15,0.67 0.4,0.67 0.7,0.42" ${S(i)}/><path d="M-0.35,-0.25 C-0.35,-0.6 0.15,-0.7 0.25,-0.4 C0.05,-0.5 -0.15,-0.4 -0.1,-0.2" ${S(i, 0.09)}/>` },
    { id: 'moon', el: 'water', label: 'Moon', g: (i) => `<path d="M0.15,-0.62 A0.62,0.62 0 1 0 0.55,0.38 A0.5,0.5 0 1 1 0.15,-0.62 Z" ${F(i)}/><circle cx="0.5" cy="-0.4" r="0.06" ${F(i)}/><circle cx="0.62" cy="-0.1" r="0.04" ${F(i)}/>` },
    { id: 'drop', el: 'water', label: 'Droplet', g: (i) => `<path d="M0,-0.68 C0.35,-0.2 0.48,0.05 0.48,0.22 A0.48,0.48 0 0 1 -0.48,0.22 C-0.48,0.05 -0.35,-0.2 0,-0.68 Z" ${S(i, 0.1)}/><path d="M-0.2,0.2 A0.22,0.22 0 0 0 0.05,0.42" ${S(i, 0.08)}/>` },
    { id: 'peak', el: 'earth', label: 'Peak', g: (i) => `<path d="M-0.75,0.5 L-0.2,-0.4 L0.08,0.05 L0.3,-0.2 L0.75,0.5 Z" ${F(i)}/><path d="M-0.36,-0.14 L-0.2,-0.4 L-0.05,-0.15" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="0.07"/>` },
    { id: 'crystal', el: 'earth', label: 'Crystal', g: (i) => `<path d="M0,-0.7 L0.22,-0.35 L0.22,0.45 L0,0.65 L-0.22,0.45 L-0.22,-0.35 Z" ${F(i)}/><path d="M-0.32,0.5 L-0.55,0.25 L-0.5,-0.15 L-0.3,0.05 Z M0.32,0.5 L0.55,0.25 L0.5,-0.15 L0.3,0.05 Z" ${F(i)}/>` },
    { id: 'boulder', el: 'earth', label: 'Boulder', g: (i) => `<path d="M-0.6,0.4 L-0.55,-0.15 L-0.2,-0.5 L0.35,-0.45 L0.62,-0.05 L0.55,0.42 Z" ${S(i, 0.1)}/><path d="M-0.2,-0.5 L-0.05,0 L0.62,-0.05 M-0.05,0 L-0.25,0.4" ${S(i, 0.07)}/>` },
    { id: 'flame', el: 'fire', label: 'Flame', g: (i) => `<path d="M0,0.68 C-0.45,0.62 -0.55,0.2 -0.35,-0.1 C-0.3,0.1 -0.15,0.15 -0.1,0.05 C-0.2,-0.25 0,-0.5 0.15,-0.7 C0.15,-0.4 0.55,-0.2 0.45,0.25 C0.42,0.5 0.25,0.66 0,0.68 Z" ${F(i)}/><path d="M0,0.55 C-0.18,0.5 -0.2,0.3 -0.08,0.15 C0,0.25 0.12,0.2 0.1,0.05 C0.25,0.2 0.25,0.48 0,0.55 Z" fill="rgba(0,0,0,.22)"/>` },
    { id: 'sun', el: 'fire', label: 'Sun', g: (i) => `<circle r="0.3" ${F(i)}/>` + Array.from({ length: 8 }, (_, k) => `<path d="M0,-0.45 L0,-0.68" ${S(i, 0.1)} transform="rotate(${k * 45})"/>`).join('') },
    { id: 'ember', el: 'fire', label: 'Ember', g: (i) => `<path d="M-0.45,0.5 C-0.1,0.3 -0.6,-0.1 -0.2,-0.5 C-0.2,-0.2 0.1,-0.1 0,0.15 C0.3,0 0.2,-0.35 0.45,-0.45 C0.55,0 0.35,0.35 0.45,0.5 Z" ${F(i)}/>` },
    { id: 'lantern', el: 'spirit', label: 'Lantern', g: (i) => `<path d="M-0.08,-0.68 H0.08 M0,-0.68 V-0.52" ${S(i, 0.08)}/><path d="M-0.25,-0.52 H0.25 C0.5,-0.3 0.5,0.3 0.25,0.5 H-0.25 C-0.5,0.3 -0.5,-0.3 -0.25,-0.52 Z" ${F(i)}/><path d="M0,-0.5 V0.48 M-0.18,-0.48 C-0.3,-0.15 -0.3,0.15 -0.18,0.46 M0.18,-0.48 C0.3,-0.15 0.3,0.15 0.18,0.46" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="0.05"/><path d="M0,0.5 V0.7" ${S(i, 0.07)}/>` },
    { id: 'spiral', el: 'spirit', label: 'Spiral', g: (i) => `<path d="M0,0 C0.12,0 0.12,-0.18 0,-0.18 C-0.24,-0.18 -0.24,0.18 0,0.2 C0.35,0.22 0.38,-0.36 0,-0.38 C-0.5,-0.4 -0.55,0.42 0,0.45 C0.62,0.48 0.66,-0.6 0.05,-0.62" ${S(i, 0.09)}/>` },
    { id: 'tea', el: 'lotus', label: 'Teacup', g: (i) => `<path d="M-0.5,-0.05 H0.4 C0.4,0.35 0.2,0.5 -0.05,0.5 C-0.3,0.5 -0.5,0.35 -0.5,-0.05 Z" ${F(i)}/><path d="M0.4,0.05 C0.65,0.05 0.65,0.3 0.35,0.32" ${S(i, 0.08)}/><path d="M-0.65,0.6 H0.55" ${S(i, 0.08)}/><path d="M-0.2,-0.2 C-0.3,-0.35 -0.1,-0.45 -0.2,-0.6 M0.1,-0.2 C0,-0.35 0.2,-0.45 0.1,-0.6" ${S(i, 0.06)}/>` },
    { id: 'whitelotus', el: 'lotus', label: 'White Lotus', g: (i) => Array.from({ length: 8 }, (_, k) => `<ellipse cx="0" cy="-0.42" rx="0.15" ry="0.26" ${F(i)} transform="rotate(${k * 45 + 22.5})"/>`).join('') + `<circle r="0.18" ${F(i)}/><circle r="0.08" fill="rgba(0,0,0,.25)"/>` },
  ];
  const byId = Object.fromEntries(LIST.map((a) => [a.id, a]));
  let n = 0;
  function svg(id, size = 44, extra = '') {
    const a = byId[id]; if (!a) return '';
    const e = EL[a.el], gid = 'avg' + ++n;
    return `<svg viewBox="-1 -1 2 2" width="${size}" height="${size}" ${extra} style="flex:none;border-radius:50%;display:block"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${e.c[0]}"/><stop offset="1" stop-color="${e.c[1]}"/></linearGradient></defs><circle r="1" fill="url(#${gid})"/><circle r="0.9" fill="none" stroke="${e.ink}" stroke-opacity=".35" stroke-width="0.04"/><g transform="scale(0.9)">${a.g(e.ink)}</g></svg>`;
  }
  const random = () => LIST[Math.floor(Math.random() * LIST.length)].id;
  const elementOf = (id) => (byId[id] ? EL[byId[id].el] : null);
  const label = (id) => (byId[id] ? byId[id].label : '');
  function picker(selected) {
    const groups = Object.keys(EL);
    return `<div class="av-pick">${groups.map((g) => `<div class="av-row"><span class="av-el" style="color:${EL[g].c[0]}">${EL[g].name}</span>${LIST.filter((a) => a.el === g).map((a) => `<button type="button" class="av-opt ${a.id === selected ? 'on' : ''}" data-av="${a.id}" aria-label="${a.label}">${svg(a.id, 46)}</button>`).join('')}</div>`).join('')}</div>`;
  }
  // profile card (stats optional)
  function card(p, esc, opts = {}) {
    const id = byId[p.avatar] ? p.avatar : 'whitelotus';
    const e = EL[byId[id].el];
    const st = p.stats || {};
    const pct = st.games ? Math.round((100 * st.wins) / st.games) + '%' : '—';
    return `<div class="pcard" style="--c1:${e.c[0]};--c2:${e.c[1]};--ink:${e.ink}">
      <div class="pc-top">${svg(id, opts.big ? 84 : 64)}<div class="pc-id"><div class="pc-name">${esc(p.name)}</div><div class="pc-sub">${e.name} · ${byId[id].label}${opts.code ? ` · <span class="pc-code">${esc(opts.code)}</span>` : ''}</div></div></div>
      ${opts.noStats ? '' : `<div class="pc-stats"><div><b>${st.wins || 0}</b><span>Wins</span></div><div><b>${st.losses || 0}</b><span>Losses</span></div><div><b>${pct}</b><span>Win %</span></div><div><b>${st.rings || 0}</b><span>Rings</span></div><div><b>${st.best || 0}</b><span>Best streak</span></div></div>`}
    </div>`;
  }
  return { LIST, EL, svg, random, picker, card, elementOf, label, has: (id) => !!byId[id] };
})();
