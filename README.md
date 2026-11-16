# Pai Sho

A phone-first web version of **Key Pai Sho**, the fan-made garden game. Play the computer, pass and play on one phone, or play friends online. It has a built-in rules guide, player profiles with a PIN (plus face or fingerprint unlock where the browser allows it), and stats with a leaderboard.

## Play

- **Anywhere (recommended):** https://kelleysills.github.io/paisho/ works in any phone browser. Use **Add to Home Screen** to install it like an app. Online games and friends connect phone to phone, so no server is needed. Add friends by swapping 6-character friend codes, see who's online, and invite them to a game. Profiles and stats live on each phone.
- **Hosted on claude.ai:** profiles, stats and online games are saved with the app. To let friends play online and keep stats, share it with them as **editors**.
- **On your PC (home Wi-Fi):** run `node server.js` (Node 18+, no installs needed) and open the address it prints on any phone on the same network. Profiles, stats and games are saved in `data.json` next to the server.
- **Offline:** open `dist/index.html` straight from the file. You can play the computer or pass and play. Profiles are kept on that device only.

## Features

- The full Key Pai Sho rules: 6 key flowers, 4 special flowers (Orchid, White Lotus, Firelily, Dahlia), 8 accent tiles (Stone, Knotweed, Wheel, Boat, Badgermole, Dragon, Sky Bison, Koi), choosing up to 6 effect tiles, garden colours, gates, harmonies, and detecting the winning ring.
- Variations: Harmony Minima (3/4/6/10), Timed Turns, Game of Chance, Effect Tile Enigma.
- Computer opponent at Easy, Medium and Hard.
- Legal-move dots, harmony lines, a move log, and undo (against the computer and in pass-and-play).

## Development

```
src/engine.js   rules engine (pure JS, JSON state)
src/ai.js       computer opponent
src/ui.js       screens, game controller, online play
src/p2p.js     phone-to-phone online games (PeerJS)
src/social.js  friend codes, online status, invites
src/store.js    storage backends (artifact db / server.js / localStorage) + PIN and passkey auth
src/guide.js    built-in rules guide
src/glyphs.js   original tile artwork (SVG)
node build.js   → dist/index.html (single self-contained file)
node tests/test_random.js · node tests/test_ai.js medium easy 4   engine and AI tests
```

### House readings of the rules

Where the booklet leaves room for interpretation:
- A gate covers the 2×2 block of squares at the board's edge. A flower leaving it steps first into one of the 8 squares around that block.
- The White Lotus is neutral: every harmony it makes counts for both players.
- The Dahlia moves in straight lines.
- Moving an accent tile uses your turn's move. Wheel and Koi abilities are free extras, once per turn each.
- When the turn timer runs out, the app makes a random move for you.
- The game is a draw at 400 turns.

Pai Sho comes from *Avatar: The Last Airbender*. Key Pai Sho is a fan-made game (keypaisho.wordpress.com, skudpaisho.com). This is an unofficial, free fan project. It is not affiliated with, endorsed by or sponsored by Nickelodeon, Paramount or Viacom, which own *Avatar: The Last Airbender* and related trademarks. Key Pai Sho rules by The Garden Gate Games. All tile art and music were made from scratch.
