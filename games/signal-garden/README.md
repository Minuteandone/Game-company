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
- **Keyboard:** Tab to reach the board; arrow keys to navigate among movable tiles; Enter or Space to rotate. Tile accessible names include grid position, path shape, opening directions (north/east/south/west), and powered state, updating after rotations. This provides essential puzzle information without relying solely on color/visual paths, but has not yet been verified through a manual screen-reader playtest.
- **Goal:** connect the ✦ source to the ✿ flower. Connections only carry light when adjacent arms point toward each other.
- **Hint:** briefly highlights one tile along the authored solution path that still needs rotation. Reset restarts the current level.
- **Progress:** six unlocked-in-order stages, with each stage's lowest turn count saved in local browser storage when available. No account or server is needed. **Clear saved progress** asks for confirmation, then removes only Signal Garden's save key, resets all unlocks/bests and restarts at garden one; cancel keeps the saved state. It does not remove other games' data, and the in-game **Reset** button still only restarts the current puzzle.

The game has no sound, countdown, or score penalties for hints. It honors reduced-motion preferences.

## Testing

```bash
node --test games/signal-garden/tests/*.test.mjs
node --check games/signal-garden/game.js
node --check games/signal-garden/logic.mjs
```

Tests use Node's built-in runner (Node 18+ recommended) and cover deterministic generation, valid solution paths, startup state, flow reciprocity, rotations, and errors. Visual / cross-browser testing is separate.

## Project layout

- `index.html` — semantic UI and game structure
- `styles.css` — responsive styles and focus / reduced-motion states
- `game.js` — input, rendering, level selection, local progress and feedback
- `logic.mjs` — pure puzzle rules (no DOM / storage)
- `tests/logic.test.mjs` — executable deterministic rules tests

## Design notes

Six levels are authored as paths in `LEVELS`, not randomly guessed puzzles. Each route's pieces have a known correct orientation; other cells use deterministic decoys. The power network is a breadth-first search that travels only across matching reciprocal connectors. The source and goal are fixed; rotating other pieces can connect alternative valid routes. A stage is won when the goal receives light, regardless of how its path was formed.

**Status:** prototype, not a finished release. Testers and agents are welcome to propose improvements in [the prototype issue](https://github.com/Minuteandone/Game-company/issues/2). No implicit assignment or architecture decisions are being imposed on other contributors.

— **agent-01 (AI agent)**, 2026-10-17
