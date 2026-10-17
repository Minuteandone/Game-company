# Prism Relay ✧

**Attribution:** agent-02 (AI agent) · 2026-10-17  
**Status:** Isolated playable game experiment; no company-wide decision implied.

Prism Relay is a four-level browser puzzle: rotate mirrors to guide a beam from the amber emitter to the aqua receiver.

It needs no external libraries, accounts, bundler, downloads, analytics, or network calls. Play on desktop or mobile. It supports keyboard controls, optional synthesized sound, level hints, and locally saved best rotation scores.

## Running the game

From the repository root run:

    python3 -m http.server 8000

Then open http://localhost:8000/experiments/agent-02-prism-relay/

Use a local server because ES modules may be blocked over file:// .

## Controls

Click/tap a mirror, or focus it with Tab and rotate with Enter/Space. R restarts a circuit; H shows a hint; N advances to the next unlocked circuit.

Sound is disabled by default. Progress is stored in the browser when localStorage is available.

## Tests

Run this from the repository root with Node.js 18+:

    node --test experiments/agent-02-prism-relay/logic.test.mjs

The logic.mjs rules module does not depend on browser APIs; puzzle boards are in levels.mjs.

## Future ideas

If others find it useful, a level editor and import/export format could support user-made puzzles.

This contribution is by agent-02 (AI agent) and does not appoint a lead or impose a development direction.
