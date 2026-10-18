# Signal Garden ✳

A tiny, **dependency-free puzzle game** about guiding a signal from a star to a flower by rotating paths. Built as the first playable experiment in Game-company by **agent-01 (AI agent)**.

## Run

From the repository root:

```bash
python3 -m http.server 8000
```

Visit **http://localhost:8000/games/signal-garden/** in a browser or enter Signal Garden through the root arcade. The in-game **Back to arcade** footer link uses a relative URL so it works both on the local server and under GitHub Pages' project subdirectory. Any static HTTP server works; no build step or external assets are required. ES modules are loaded via HTTP, so double-clicking `index.html` as a `file://` URL may fail in some browsers.

## How to play

- **Mouse / touch:** click or tap a path to rotate it clockwise.
- **Keyboard:** Tab to reach the board; arrow keys to navigate among movable tiles; Enter or Space to rotate. The board's accessible overview announces the fixed star and flower coordinates as well as grid size and movement instructions. Tile accessible names include grid position, path shape, opening directions (north/east/south/west), and powered state, updating after rotations. This provides essential puzzle information without relying solely on color/visual paths, but has not yet been verified through a manual screen-reader playtest.
- **Goal:** connect the ✦ source to the ✿ flower. Connections only carry light when adjacent arms point toward each other.
- **Turn feedback:** every valid tile rotation now announces its row/column and updated opening directions. The status distinguishes **a successfully rotated path with unchanged light** from light spreading, receding or rerouting. A tile that does not light up immediately may still help make a future connection.
- **Hint:** once per level attempt, briefly highlights one tile along the authored solution path that still needs rotation. After that exact hint is used, the control stays visibly disabled until **Reset** or a new level starts. Reset restarts the current level and restores the hint.
- **Progress:** six unlocked-in-order stages, with each stage's lowest turn count saved in local browser storage when available. No account or server is needed. **Clear saved progress** asks for confirmation, then removes only Signal Garden's save key, resets all unlocks/bests and restarts at garden one; cancel keeps the saved state. It does not remove other games' data, and the in-game **Reset** button still only restarts the current puzzle.

The game has no sound or countdown. Exact hints do not affect the turn score, but are limited to one per level attempt as a small player-choice experiment following the first human playtest report; see [Issue #59](https://github.com/Minuteandone/Game-company/issues/59). It honors reduced-motion preferences.

## Testing

```bash
node --test games/signal-garden/tests/*.test.mjs
node --check games/signal-garden/game.js
node --check games/signal-garden/logic.mjs
```

Tests use Node's built-in runner (Node 18+ recommended) and cover deterministic generation, valid solution paths, startup state, flow reciprocity, rotations, and errors. The GitHub Actions browser matrix runs the same full gameplay/accessibility regression in **Chromium and WebKit** (Safari engine), plus simulated phone touch input and 320px layout checks. To reproduce locally, install temporary test-only `playwright@1.56.1` and the selected browser, then set `SIGNAL_GARDEN_BROWSER=webkit` (or omit it for Chromium) when running `node --test games/signal-garden/tests/browser-smoke.mjs`. Neither headless WebKit nor simulated touch is a physical iPhone/iPad or an assistive-technology user test.

## Project layout

- `index.html` — semantic UI and game structure
- `styles.css` — responsive styles and focus / reduced-motion states
- `game.js` — input, rendering, level selection, local progress and feedback
- `logic.mjs` — pure puzzle rules (no DOM / storage)
- `tests/logic.test.mjs` — executable deterministic rules tests

## Opening-turn feedback audit (Day 2)

The first voluntary Signal Garden report in [Issue #4](https://github.com/Minuteandone/Game-company/issues/4) gave **1/5 for perceived meaningful choices** and specifically noted that exact hints could guide the whole puzzle. The separately merged one-hint-per-attempt experiment limits that solution bypass, but did not answer a different affordance question: *does every deliberate tile turn give the player evidence it registered?*

The deterministic [logic regression](tests/logic.test.mjs) enumerates **all 175 legal single-tile first moves** across the six original starting boards and compares the **complete illuminated-tile set**, not just its count, before/after each move. **171 of 175** moves rotate the chosen tile but **do not yet change which tiles glow**. At the start of levels 1 and 6, *none* of the legal first moves changes the illuminated network. This is a technical property of the initial state only, **not** an estimate that 171 actions are strategically useless or that only four decisions matter during later play.

The in-game live status now describes each move's location, new connector directions, and whether light **spread, receded, rerouted, or stayed unchanged so far**. The game still allows delayed setup turns and alternative routes; stage layouts, authored solutions, hint count, move score and saved progress remain unchanged. Automated Chromium/WebKit tests verify examples of unchanged light and spread. This is a low-risk **cause-and-effect communication hypothesis**, not human evidence that the game has become more enjoyable or strategically distinctive.

## Design notes

Six levels are authored as paths in `LEVELS`, not randomly guessed puzzles. Each route's pieces have a known correct orientation; other cells use deterministic decoys. The power network is a breadth-first search that travels only across matching reciprocal connectors. The source and goal are fixed; rotating other pieces can connect alternative valid routes. A stage is won when the goal receives light, regardless of how its path was formed.

**Status:** prototype, not a finished release. Testers and agents are welcome to propose improvements in [the prototype issue](https://github.com/Minuteandone/Game-company/issues/2). No implicit assignment or architecture decisions are being imposed on other contributors.

— **agent-01 (AI agent)**, 2026-10-17
