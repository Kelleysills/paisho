# Skud Pai Sho — handoff brief

**Goal:** add Skud Pai Sho as a second ruleset next to the existing Key Pai Sho rules. Players pick it in game setup and in the invite mode picker.

## Where things stand
- The Rules selector already exists in setup (`src/ui.js`, search `const skud = false`). The Skud button is disabled and labeled "soon", and Key-only options (harmonies needed, Game of Chance, Effect Tile Enigma) are hidden when `skud` is true.
- No Skud engine code exists yet.

## Architecture to follow
- `src/engine.js` — `PaiSho`, the Key rules. Immutable `apply(s0, a)`, `legalActions(s)`, `harmonies(s)`, `newGame(opts)`. The board is 18×18 indices (`i = r*18 + c`) with a circular mask, gates and gardens.
- `src/ai.js` — computer opponent, built on `legalActions` and `apply`.
- `src/board.js` — board SVG. `Board.base(theme)` is shared, so Skud can reuse it.
- `src/ui.js` — game screen (`gameScreen`, `renderBoard`, `tap`, tray), setup (`screens.setup`), online play (`startOnline`/`joinGame`; game doc fields `state` JSON, `ver`, `opts`).
- `node build.js` concatenates `src/*.js` into `dist/index.html` and copies it to the repo root (GitHub Pages).

**Suggested approach:** a separate `src/skud.js` exposing the same interface as `PaiSho` (`newGame`, `apply`, `legalActions`, `harmonies`, `clone`, plus whatever UI helpers it needs). Store `s.rules = 'skud'` in state and route through a small `Rules(s)` selector, so online sync, undo, history and rendering keep working unchanged.

## Skud rules to implement (verify against the official Skud Pai Sho rules / skudpaisho.com)
- **Tiles per player:** basic flowers (Rose, Chrysanthemum, Rhododendron, Jasmine, Lily, White Jade; 3 of each in the 3/4/5 families), special flowers (White Lotus, Orchid), accent tiles (Rock, Wheel, Knotweed, Boat; each player picks 4).
- **Planting:** basic flowers are planted in an open gate and move up to their number of spaces. Special flowers have their own movement and planting rules.
- **Harmonies:** same-colour neighbours in the cycle, in line with no tiles between. Opposite flowers clash and may not line up (blocking rule).
- **Gardens:** red flowers can't land in white gardens and vice versa. Neutral squares are fine.
- **Harmony bonus:** forming a new harmony lets you plant a special/accent tile or plant a basic flower.
- **Accent tiles:** Rock blocks and cancels harmonies; Wheel rotates surrounding tiles; Knotweed drains adjacent flowers' harmonies; Boat moves a flower or removes an accent.
- **Orchid / White Lotus interactions:** Orchid traps adjacent opposing flowers when your Lotus is on the board; Lotus harmonizes with all.
- **Win:** a harmony ring that surrounds the centre of the board. If no tiles are left to play, the player with the most tiles in harmony wins.

## Integration checklist
1. Enable the Skud button in setup and in the invite mode picker (`inviteSheet`). Pass `opts.rules = 'skud'` into the new game.
2. Tray and selection UI for accent selection at game start.
3. Rules/Guide screens (`src/guide.js`) and a short Skud tutorial.
4. Computer opponent for Skud (start with a greedy one: harmonies formed minus harmonies allowed).
5. Online play: the state JSON already round-trips. Check that the opponent's older app version is flagged (`APP_V`).
6. Decide how these work in Skud, or turn them off for it at first: elemental bending/sub-bending, Melon Lord, the Seismic board, the Spirit Realm board (two-blocker rule lives in `PaiSho.pathClear`), past-life spirit bends (`t:'spirit'` action).
7. Stats, loot and ranked: Skud wins can count the same as Key wins (`recordResult` is ruleset-agnostic).

## Testing
- Playwright with `/opt/npm-tools/node_modules/playwright` and `/usr/bin/google-chrome`, local file mode, seeding localStorage (`paisho.col.players`, `paisho.session`, `paisho.tutDone`, `paisho.newsSeen` = current `NEWS.v`).
- Add engine unit tests for movement, garden, clash and ring detection before the UI work.
