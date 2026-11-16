/* Heuristic computer opponent for Key Pai Sho */
const PaiShoAI = (() => {
  const P = (typeof PaiSho !== 'undefined') ? PaiSho : require('./engine.js');
  const SECT = 16;
  function sectorsOf(a, b) {
    const out = [];
    let a1 = P.angleOf(a); const d = P.dAngle(a, b);
    const steps = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 32)));
    for (let k = 0; k <= steps; k++) {
      let ang = a1 + (d * k) / steps; ang = (ang + 4 * Math.PI) % (2 * Math.PI);
      out.push(Math.floor(ang / (2 * Math.PI / SECT)) % SECT);
    }
    return out;
  }
  function sideScore(s, q, H) {
    let sc = 0;
    const edges = H.filter((h) => h.owners.includes(q));
    sc += edges.length * 10;
    // components by union-find
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    edges.forEach(({ a, b }) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); parent.set(find(a), find(b)); });
    const cover = new Map();
    edges.forEach(({ a, b }) => {
      const [x1, y1] = P.xy(a), [x2, y2] = P.xy(b);
      if (Math.sign(x1) !== Math.sign(x2) || Math.sign(y1) !== Math.sign(y2)) sc += 5;
      const root = find(a);
      if (!cover.has(root)) cover.set(root, new Set());
      sectorsOf(a, b).forEach((x) => cover.get(root).add(x));
    });
    let best = 0; cover.forEach((set) => (best = Math.max(best, set.size)));
    sc += best * best * 0.9;
    // material
    for (let i = 0; i < P.N * P.N; i++) {
      const c = s.board[i]; if (!c || c.top.owner !== q) continue;
      if (P.isFlower(c.top.type)) {
        const [x, y] = P.xy(i); const r = Math.hypot(x, y);
        sc += 3 + (r > 2 && r < 6.5 ? 2.5 : 0) - (r > 7.5 ? 1 : 0);
        if (P.knotted(s, i)) sc -= 3;
      }
    }
    sc += P.plantedCount(s, q) * 1.5;
    return sc;
  }
  function evaluate(s, p) {
    if (s.winner === p) return 1e6;
    if (s.winner === 1 - p) return -1e6;
    if (s.winner === 'draw') return 0;
    const H = P.harmonies(s);
    if (P.findRing(s, p, H)) return 9e5;
    if (P.findRing(s, 1 - p, H)) return -9e5;
    return sideScore(s, p, H) - 1.15 * sideScore(s, 1 - p, H);
  }
  // play out a main action plus optional extra (orchid / bison) greedily, return state before 'end'
  function mainOptions(s) {
    return P.legalActions(s, { noPlace: true, noAbility: true }).filter((a) => a.t === 'move' || a.t === 'plant');
  }
  function afterMain(s, a, p) {
    let s2 = P.apply(s, a);
    if (s2.tp.extra) {
      const ex = mainOptions(s2);
      let best = null, bv = -Infinity;
      for (const e of ex.slice(0, 80)) { const v = evaluate(P.apply(s2, e), p); if (v > bv) { bv = v; best = e; } }
      if (best && bv > evaluate(s2, p)) s2 = P.apply(s2, best);
    }
    return s2;
  }
  function sample(arr, n) {
    if (arr.length <= n) return arr;
    const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }
  /* returns an array of actions to perform in order (ending with {t:'end'}) */
  function chooseTurn(s, level = 'medium') {
    const p = s.turn;
    const seq = [];
    let opts = mainOptions(s);
    if (!opts.length) return [{ t: 'end' }];
    const scored = opts.map((a) => { const s2 = afterMain(s, a, p); return { a, s2, v: evaluate(s2, p) + Math.random() * (level === 'easy' ? 25 : 3) }; });
    scored.sort((x, y) => y.v - x.v);
    let pick;
    if (level === 'easy') {
      pick = scored[Math.floor(Math.random() * Math.min(scored.length, Math.max(3, scored.length / 3)))];
      if (scored[0].v > 8e5) pick = scored[0];
    } else if (level === 'medium' || scored[0].v > 8e5) pick = scored[0];
    else {
      // hard: 2-ply on top candidates
      let best = null, bv = -Infinity;
      for (const cand of scored.slice(0, 8)) {
        const se = P.apply(cand.s2, { t: 'end' });
        if (se.winner === p) { best = cand; break; }
        const replies = sample(mainOptions(se), 70);
        let worst = Infinity;
        for (const r of replies) {
          const v = evaluate(P.apply(P.apply(se, r), { t: 'end' }), p);
          if (v < worst) worst = v;
          if (worst < bv) break;
        }
        if (!replies.length) worst = cand.v;
        if (worst > bv) { bv = worst; best = cand; }
      }
      pick = best || scored[0];
    }
    seq.push(pick.a);
    let cur = P.apply(s, pick.a);
    if (cur.tp.extra) {
      const s2 = afterMain(s, pick.a, p);
      // replay the extra that afterMain chose by diffing log length
      if (s2.log.length > cur.log.length) {
        const ex = mainOptions(cur).find((e) => JSON.stringify(P.apply(cur, e).board) === JSON.stringify(s2.board));
        if (ex) { seq.push(ex); cur = P.apply(cur, ex); }
      }
    }
    // consider placing an accent
    if (level !== 'easy') {
      const places = P.legalActions(cur).filter((a) => a.t === 'place');
      if (places.length) {
        const base = evaluate(cur, p);
        let best = null, bv = base + 6;
        for (const pl of sample(places, 60)) { const v = evaluate(P.apply(cur, pl), p); if (v > bv) { bv = v; best = pl; } }
        if (best) { seq.push(best); cur = P.apply(cur, best); }
      }
    }
    seq.push({ t: 'end' });
    return seq;
  }
  const AI_EFFECTS = { easy: [], medium: ['lotus', 'orchid', 'knotweed'], hard: ['lotus', 'orchid', 'firelily', 'knotweed', 'dragon', 'stone'] };
  return { chooseTurn, evaluate, AI_EFFECTS };
})();
if (typeof module !== 'undefined') module.exports = PaiShoAI;
