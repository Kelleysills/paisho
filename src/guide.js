/* Built-in rules guide (paraphrased from the Key Pai Sho booklet) */
const Guide = (() => {
  const P = PaiSho;
  const INFO = {
    rose: ['Dark key flower', 'Moves up to 3 squares in any of the 8 directions. Harmonizes the same way.', 3],
    chrys: ['Dark key flower', 'Moves up to 5 squares straight up, down, left or right.', 5],
    rhodo: ['Dark key flower', 'Moves up to 5 squares diagonally.', 5],
    lily: ['Light key flower', 'Moves up to 3 squares in any of the 8 directions.', 3],
    jasmine: ['Light key flower', 'Moves up to 5 squares straight up, down, left or right.', 5],
    jade: ['Light key flower', 'Moves up to 5 squares diagonally.', 5],
    orchid: ['Special flower', 'Moves 1 square. If you move the Orchid as your turn’s move, you get one more move that turn (another tile, or the Orchid again).', 1],
    lotus: ['Special flower', 'Moves 1 square, up to twice a turn. Harmonizes with any flower of either player at any distance in a straight line (flowers in between block it). Can be planted on the centre point if the four centre squares are empty — it must leave next turn.', 1],
    firelily: ['Special flower', 'Moves 1 square, up to 6 times a turn. Never harmonizes (except with a Lotus), but blocks your opponent’s harmonies — never yours.', 1],
    dahlia: ['Special flower', 'Moves any distance in a straight line and may jump over tiles, but must finish right beside another tile.', '∞'],
    stone: ['Accent tile', 'When switched in, it can be put on any empty garden square. Lets all your key flowers land in its quarter of the board regardless of colour. Cannot move.', 0],
    knotweed: ['Accent tile', 'Flowers next to it (yours too) cannot harmonize and cannot move by themselves. Moves 2.', 2],
    wheel: ['Accent tile', 'Switched in for one of your accent tiles, not a flower. Once a turn it can spin every tile around it 1–3 places clockwise or counter-clockwise (all must be able to land). Moves 3.', 3],
    boat: ['Accent tile', 'When it moves it can take every tile around it along, keeping their positions (all must be able to land). Moves 4.', 4],
    badgermole: ['Accent tile', 'Can land on a tile and slide underneath it. The tile on top ignores all other accent tiles. Can carry the top tile when it moves. Moves 5.', 5],
    dragon: ['Accent tile', 'Land on a tile to send it back to its owner’s hand. If any effect tile lands on the Dragon, the Dragon leaves the game for good. Moves 5.', 5],
    skybison: ['Accent tile', 'Can land on a tile and slide underneath. A flower on top cannot have its harmonies blocked by flowers. After carrying a tile, that tile may move once more straight away. Moves 5.', 5],
    koi: ['Accent tile', 'Once a turn, swap two tiles that sit on opposite sides of it in a straight or diagonal line (both must be allowed to land). Moves 5.', 5],
  };

  // ----- mini diagram renderer -----
  function mini({ size = 7, cells = [], dots = [], lines = [], colors = null, gate = false, label = '' }) {
    const s = size; let o = `<svg viewBox="-0.2 -0.2 ${s + 0.4} ${s + 0.4}">`;
    for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) {
      const col = colors ? colors(r, c) : 'n';
      const f = { n: '#9a6a3e', l: '#eae2cf', d: '#b8332e', g: '#5a1f1c', x: '#24170f' }[col];
      o += `<rect x="${c}" y="${r}" width="1" height="1" fill="${f}" stroke="#2a1a10" stroke-width="0.03"/>`;
    }
    lines.forEach(([r1, c1, r2, c2, col]) => (o += `<line x1="${c1 + 0.5}" y1="${r1 + 0.5}" x2="${c2 + 0.5}" y2="${r2 + 0.5}" stroke="${col || '#f5d98a'}" stroke-width="0.14" stroke-linecap="round"/>`));
    dots.forEach(([r, c, col]) => (o += `<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.16" fill="${col || '#f5d98a'}"/>`));
    cells.forEach(([r, c, t, ow, sc]) => (o += `<g transform="translate(${c + 0.5},${r + 0.5}) scale(${(sc || 1) * 0.44})">${Glyphs.tile(t, ow || 0)}</g>`));
    return o + '</svg>';
  }
  function moveDots(r0, c0, dirs, range, size) {
    const out = [];
    dirs.forEach(([a, b]) => { for (let k = 1; k <= range; k++) { const r = r0 + a * k, c = c0 + b * k; if (r >= 0 && c >= 0 && r < size && c < size) out.push([r, c]); } });
    return out;
  }
  const O4 = [[-1,0],[1,0],[0,-1],[0,1]], D4 = [[-1,-1],[-1,1],[1,-1],[1,1]], A8 = O4.concat(D4);
  function fullBoard(opts = {}) {
    let o = `<svg viewBox="-9.6 -9.6 19.2 19.2">` + Board.base(true);
    (opts.tiles || []).forEach(([r, c, t, ow]) => (o += `<g transform="translate(${c - 8.5},${r - 8.5}) scale(0.44)">${Glyphs.tile(t, ow)}</g>`));
    (opts.lines || []).forEach(([a, b, c, d]) => (o += `<line x1="${b - 8.5}" y1="${a - 8.5}" x2="${d - 8.5}" y2="${c - 8.5}" stroke="#f5d98a" stroke-width="0.2" stroke-linecap="round"/>`));
    (opts.dots || []).forEach(([r, c]) => (o += `<circle cx="${c - 8.5}" cy="${r - 8.5}" r="0.25" fill="#f5d98a"/>`));
    return o + '</svg>';
  }
  const fig = (svgs) => `<div class="fig">${svgs.map(([s, cap]) => `<figure>${s}<figcaption>${cap}</figcaption></figure>`).join('')}</div>`;
  const trow = (t) => `<div class="trow">${Glyphs.svg(t, 0)}<div><b>${P.tname(t)}</b> <span class="tiny muted">${INFO[t][0]}</span><br>${INFO[t][1]}</div><div class="mv">${INFO[t][2]}</div></div>`;

  function pairTable() {
    const K = P.KEY_TYPES;
    return `<div style="overflow-x:auto"><table class="lb" style="font-size:11px;min-width:420px"><tr><th></th>${K.map((b) => `<th style="text-align:center">${Glyphs.svg(b, 0, 'style="width:26px;height:26px"')}</th>`).join('')}</tr>${K.map((a) => `<tr><td>${Glyphs.svg(a, 0, 'style="width:26px;height:26px"')}</td>${K.map((b) => `<td style="text-align:center">${a === b ? '✕' : pairRule(a, b).replace('straight ', '↔ ').replace('diagonal ', '⤢ ').replace(' · ', '<br>')}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }
  function html() {
    const ring = [[6, 6, 'jasmine', 0], [6, 11, 'chrys', 0], [11, 11, 'jasmine', 0], [11, 6, 'chrys', 0]];
    const sec = [
      ['goal', 'Goal', `<p>Two players take turns growing a garden. Link your flowers with <b>harmonies</b> — invisible lines between two of your flowers — and be the first to close a chain of at least <b>four harmonies that circles the centre</b> of the board.</p>` +
        fig([[fullBoard({ tiles: ring, lines: [[6, 6, 6, 11], [6, 11, 11, 11], [11, 11, 11, 6], [11, 6, 6, 6]] }), 'A winning ring of four harmonies around the centre']])],
      ['board', 'The board', `<p>The board is a circle of squares. Tiles sit <b>inside squares</b>. There are three kinds of garden:</p><ul><li><b>Light gardens</b> (cream) — top-left and bottom-right quarters of the central diamond.</li><li><b>Dark gardens</b> (red) — top-right and bottom-left quarters.</li><li><b>Neutral garden</b> (wood) — everything outside the diamond. Squares cut in half by the diamond’s edge count as half neutral, so anyone may land there.</li></ul><p>The four <b>gates</b> sit at the edge at north, east, south and west. Each gate covers the 2×2 block of squares at the edge; no tile in the garden can land on or pass through those squares.</p>` + fig([[fullBoard({}), 'Gardens and the four gates']])],
      ['turn', 'Your turn', `<p>On your turn you must do <b>one</b> of these:</p><ul><li><b>Plant</b> a flower from your hand into an empty gate. You may have at most <b>2 planted</b> flowers at once.</li><li><b>Move</b> one of your tiles already on the board.</li></ul><p>You may <b>also</b>, once per turn, before or after that: <b>place</b> an accent tile by swapping it with one of your flowers in the garden (the flower goes back to your hand), and use each accent tile’s ability once.</p><p>A flower leaving a gate takes its first step into any of the squares around the gate block:</p>` +
        fig([[mini({ size: 6, colors: (r, c) => (r >= 4 && (c === 2 || c === 3) ? 'g' : 'n'), dots: [[3, 1], [3, 2], [3, 3], [3, 4], [4, 1], [5, 1], [4, 4], [5, 4]], cells: [[4.5, 2.5, 'rose', 0, 1.6]] }), 'Planted Rose: first-step squares']])],
      ['keys', 'Key flowers', `<p>Each player starts with 3 of each of the 6 key flowers. A key flower moves <b>once</b> per turn, in <b>one</b> straight direction, up to its number of squares, and never over other tiles.</p><div class="tlist">${P.KEY_TYPES.map(trow).join('')}</div>` +
        fig([[mini({ dots: moveDots(3, 3, A8, 3, 7), cells: [[3, 3, 'rose', 0]] }), 'Rose / Lily: 3, any direction'], [mini({ dots: moveDots(3, 3, O4, 5, 7), cells: [[3, 3, 'chrys', 0]] }), 'Chrysanthemum / Jasmine: 5, straight'], [mini({ dots: moveDots(3, 3, D4, 5, 7), cells: [[3, 3, 'rhodo', 0]] }), 'Rhododendron / Jade: 5, diagonal']]) +
        `<h3>Who harmonizes with whom</h3><p>A harmony forms if <i>either</i> flower could reach the other, so the longer-reaching flower sets the distance. Tap any tile in a game to see its full list.</p>` + pairTable() +
        `<p><b>Garden colour:</b> dark flowers (orange) can’t <i>finish</i> a move in a light garden and light flowers (white) can’t finish in a dark garden. Both may pass through, and both may land in neutral or half-neutral squares.</p>`],
      ['harmony', 'Harmonies', `<p>A harmony is a line between two of your blooming flowers (not planted ones). It follows four rules:</p><ul><li>It forms when one key flower’s movement could reach the other flower’s square (garden colour is ignored here).</li><li>There must be <b>at least one square between</b> them.</li><li>Never between two flowers of the <b>same kind</b>.</li><li>It is <b>broken</b> if an opponent’s flower sits between them. Accent tiles in between don’t break it.</li></ul><p>Harmonies can’t stretch across the exact centre point or across gate squares.</p>` +
        fig([[mini({ cells: [[3, 1, 'chrys', 0], [3, 5, 'lily', 0]], lines: [[3, 1, 3, 5]] }), 'Chrysanthemum reaches the Lily → harmony'], [mini({ cells: [[3, 1, 'chrys', 0], [3, 5, 'lily', 0], [3, 3, 'rose', 1]], lines: [[3, 1, 3, 2.6, '#7a5a3a'], [3, 3.4, 3, 5, '#7a5a3a']] }), 'Opponent’s Rose in between breaks it']])],
      ['win', 'Winning', `<p>The first player to complete a closed chain of at least 4 harmonies that <b>encircles the centre</b> wins. The app checks at the end of every turn and draws the ring in gold. (Harmony Minima variation: change 4 to 3, 6 or 10.)</p>`],
      ['effects', 'Effect tiles', `<p>Before the game each player may choose up to <b>6 effect tiles</b>, one of each kind, from the special flowers and accent tiles below. Beginners should play with none until the basics feel natural.</p><h3>Special flowers</h3><p>They are planted in gates like key flowers, can land in any garden colour, and each has its own movement.</p><div class="tlist">${Object.keys(P.SPECIAL).map(trow).join('')}</div><h3>Accent tiles</h3><p>Accent tiles are never planted. You <b>place</b> one by swapping it with one of your blooming flowers. They don’t harmonize or block harmonies, but they <b>do block flower movement</b>. They move once per turn in any of the 8 directions and may jump over tiles.</p><div class="tlist">${Object.keys(P.ACCENT).map(trow).join('')}</div>`],
      ['fine', 'Fine print', `<ul><li>You can’t pass: you must plant, place or move something.</li><li>Steps leaving a gate count the first square outside the gate as step one.</li><li>A tile only "lands" on its final square, and harmonies form only after it stops.</li><li>Tiles in the garden never affect planted tiles, and a tile in the garden can never go back onto a gate.</li><li>Only one tile per gate.</li><li>Moving a flower by carrying it with an accent counts as moving the accent.</li><li>Knotweed affects your own flowers too, but accent tiles can still move those flowers.</li><li>An accent that moves another tile can’t drop it where it couldn’t normally land.</li><li>Badgermoles and Sky Bisons can’t land on a tile while carrying one, and flowers can land on them but can’t move over them.</li><li>A Dragon can’t land on a tile sitting on a Badgermole; landing on a tile with a Sky Bison underneath removes both.</li></ul>`],
      ['ranks', 'Gold, ranks & the Avatar', `<ul><li><b>Gold pieces (gp):</b> every new player starts with 1,000. Computer games pay a little (more on Hard), online games pay much more, and even a loss earns some. Completing a ring adds a bonus. Pass-and-play doesn’t pay.</li><li><b>Store:</b> spend gp on effect tiles (new players start with Stone and Boat), profile pictures, emotes and board themes.</li><li><b>Nations:</b> pick Air, Water, Earth or Fire. Your nation unlocks its own emotes and its board theme for free.</li><li><b>Ranked rating:</b> online games only. Beat stronger players to climb faster.</li><li><b>The Avatar:</b> the top-rated player (after 3 ranked games) holds the title, and only one player can hold it at a time. If someone passes your rating, the title moves to them. A tie at the top automatically starts an Avatar Trial match. The Avatar can use every nation’s emotes.</li><li><b>Emotes:</b> tap 😊 on the board during a game.</li><li><b>📣 Yip yip!:</b> in an online game, if your opponent is slow, tap Yip yip! to nudge them (once a minute). They get a notification if they have turn alerts on.</li></ul>`],
      ['bending', 'Elemental mode (bending)', `<p>Turn on <b>Elemental mode</b> in a game’s variations. Each player bends their nation’s element. Bending can happen at <b>any time, even on your opponent’s turn</b>, and it never uses up your move.</p><ul><li><b>Main bending, once per game:</b> 🔥 Fire burns an opponent’s tile out of the game · 🌊 Water washes it back to their hand · 🪨 Earth smashes it and leaves rubble on that square for 4 turns · 🌪️ Air sweeps it up to 3 squares.</li><li><b>The cost:</b> you give up one of your own effect or accent tiles, unless you have a harmony on the board or you’re the Avatar.</li><li><b>Sub-bending</b> unlocks at <b>Level ${Eco.SUB_LEVEL}</b> (${Eco.SUB_XP.toLocaleString()} XP). It’s free and once per game: ⚙️ Metal (Earth) swaps any two tiles · ⚡ Lightning (Fire) makes your opponent skip a turn · 🩸 Blood (Water) lets you make their next move for them · 🪽 Flight (Air) shows their whole hand and their likely next move. The Avatar can use any two of the four.</li><li><b>Show off:</b> free, cosmetic flames, waves, quakes and gusts across your opponent’s board while they think. In online games, each one adds 5 bonus XP, up to 300 XP a match.</li><li><b>💬 Chat &amp; the Melon Lord 🍈:</b> chat with your opponent from the 💬 button. In Elemental games, typing <i>Melon Lord</i> (shout it however you like) blinds your opponent, up to <b>3 times per match</b> (one blinding at a time). It doesn’t work on a host using the <b>Blackout (Seismic)</b> board: they have seismic sense. They get 3 seconds to memorise the board, then see only faint outlines and ripples. If they grab one of your tiles, they lose the turn. A legal blind move earns them +50 gp and +50 XP.</li><li><b>Blackout board:</b> call the Melon Lord 100 times to unlock it. In Elemental games you host, you see a normal board while your opponent plays in the dark, with a pulse every 5–10 seconds that briefly reveals everything. Their move tips and dots still work. In normal games it’s a seismic-style board that both players see.</li><li><b>XP:</b> online wins give 100, losses 30, draws 50. Computer games give 40, 10 and 20.</li><li><b>Events:</b> every <b>April 28 is Avatar Day</b> with 100× XP and 5× gold. <b>Weekends</b> give 2× XP and 1.5× gold.</li><li><b>Achievements</b> pay gold, such as +1,000 gp for your first win. See the Achievements screen.</li></ul>`],
      ['vars', 'Variations', `<ul><li><b>Basic Key Pai Sho</b> — no effect tiles.</li><li><b>Harmony Minima</b> — change the ring size needed to win (3, 6 or 10).</li><li><b>Timed Turns</b> — a clock per turn. When it runs out, the app makes a random move for you.</li><li><b>Game of Chance</b> — key flowers are drawn at random when you plant.</li><li><b>Effect Tile Enigma</b> — your opponent’s effect tiles stay hidden until played.</li></ul>`],
      ['about', 'About & credits', `<p><b>Unofficial fan project.</b> This app is free and is not affiliated with, endorsed by or sponsored by Nickelodeon, Paramount Global or Viacom International. <i>Avatar: The Last Airbender</i>, Pai Sho as shown in the series, and all related names and characters belong to their owners.</p><p><b>Rules:</b> Key Pai Sho was created by The Garden Gate Games. The rules here are paraphrased from their booklet. Please support the creators and their official sets.</p><p><b>Art &amp; music:</b> all tile, board and profile art and the background music were made from scratch for this app. No artwork, audio or footage from the show is used.</p><p>No ads, no paid items. Gold is earned only by playing.</p>`],
      ['app', 'Using the app', `<ul><li>Tap one of your tiles to see where it can go (gold dots), then tap a dot.</li><li>Tap a tile in the tray at the bottom to plant it (gates light up) or to place an accent (your flowers light up).</li><li>Tap an accent you own on the board to move it or use its ability.</li><li>After your move, press <b>End turn</b> (<b>Send move</b> online). Until then you can Undo. Prefer speed? Turn on <b>Auto-send moves</b> in the game menu.</li><li>The ↔ button shows or hides harmony lines. Undo works against the computer and in pass-and-play.</li><li><b>✍️ S Pen doodles:</b> on a phone with a stylus (like a Galaxy S Ultra), drag the pen across the board to draw or write a note. A pen tap still plays normally. A second after you lift the pen, your doodle is sent to your opponent. It stays on screen for 5 seconds, then fades.</li></ul>
        <div class="note"><b>House readings</b> where the booklet leaves room: a gate covers a 2×2 block with 8 exit squares; a Lotus’s harmonies count for both players (it’s neutral); Dahlia jumps in straight lines; moving an accent tile uses your turn’s move; abilities (Wheel, Koi) are free extras.</div>`],
    ];
    return `<button class="btn primary" data-act="startTutorial" style="margin-bottom:10px">▶ Play the 2-minute tutorial</button><nav class="toc">${sec.map(([id, t]) => `<a href="#g-${id}" data-act="toc" data-id="g-${id}">${t}</a>`).join('')}</nav>` +
      `<div class="guide">${sec.map(([id, t, body]) => `<section id="g-${id}"><h3>${t}</h3>${body}</section>`).join('')}</div>`;
  }
  // ---- harmony rules per tile ----
  const reach = (t) => { const k = P.KEY[t]; return { o: k.dirs !== 'diag' ? k.range : 0, d: k.dirs !== 'ortho' ? k.range : 0 }; };
  function pairRule(a, b) {
    const ra = reach(a), rb = reach(b), o = Math.max(ra.o, rb.o), d = Math.max(ra.d, rb.d), parts = [];
    if (o >= 2) parts.push('straight 2–' + o);
    if (d >= 2) parts.push('diagonal 2–' + d);
    return parts.join(' · ');
  }
  // [{type, rule, ok}] for the "harmonizes with" list
  function partners(t) {
    if (P.isKey(t)) return P.KEY_TYPES.map((b) => (b === t ? { type: b, ok: false, rule: 'never (same kind)' } : { type: b, ok: true, rule: pairRule(t, b) }))
      .concat([{ type: 'lotus', ok: true, rule: 'any distance, any direction' }, { type: 'orchid', ok: true, rule: 'when this flower can reach it' }, { type: 'dahlia', ok: true, rule: 'when this flower can reach it' }]);
    if (t === 'orchid' || t === 'dahlia') return P.KEY_TYPES.map((b) => { const r = reach(b); return { type: b, ok: true, rule: [r.o ? 'straight 2–' + r.o : '', r.d ? 'diagonal 2–' + r.d : ''].filter(Boolean).join(' · ') }; }).concat([{ type: 'lotus', ok: true, rule: 'any distance' }]);
    if (t === 'lotus') return P.KEY_TYPES.concat(['orchid', 'dahlia', 'firelily', 'lotus']).map((b) => ({ type: b, ok: true, rule: 'any distance, any direction, even adjacent' }));
    if (t === 'firelily') return [{ type: 'lotus', ok: true, rule: 'only with a White Lotus' }];
    return [];
  }
  function harmonySummary(t) {
    if (P.isAccent(t)) return 'Accent tiles never harmonize and don’t block harmonies — but they do block flower movement.';
    if (P.isKey(t)) { const r = reach(t); return `Harmonizes with your other key flowers (not other ${P.tname(t)}s) ${r.o && r.d ? 'in any direction' : r.o ? 'in straight lines' : 'on diagonals'} up to ${P.KEY[t].range} squares, with at least one square between. A longer-reaching partner can extend that.`; }
    if (t === 'lotus') return 'Harmonizes with any flower of either player at any distance in a straight or diagonal line. The Lotus is neutral: its harmonies count for both players. Flowers in between block it.';
    if (t === 'firelily') return 'Never harmonizes except with a White Lotus. It blocks your opponent’s harmonies but never yours.';
    return 'Harmonizes with your key flowers when that key flower could move onto its square.';
  }
  function partnerHTML(t, owner) {
    const ps = partners(t); if (!ps.length) return '';
    return `<div class="tlist">${ps.map((x) => `<div class="trow" style="padding:6px 8px;align-items:center;${x.ok ? '' : 'opacity:.5'}">${Glyphs.svg(x.type, owner || 0)}<div><b>${P.tname(x.type)}</b><br><span class="tiny">${x.ok ? x.rule : x.rule}</span></div><div class="mv">${x.ok ? '✓' : '✕'}</div></div>`).join('')}</div>`;
  }
  return { html, INFO, mini, partners, pairRule, harmonySummary, partnerHTML };
})();
