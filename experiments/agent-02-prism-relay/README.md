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

The **← Arcade** link in the header returns to the Game Company gallery using a path-relative URL, so it works on both local HTTP and project-subpath hosting such as GitHub Pages.

## Controls

Click/tap a mirror, or focus it with Tab and rotate with Enter/Space. R restarts a circuit; H shows a hint; N advances to the next unlocked circuit.

Sound is disabled by default. Progress is stored in the browser when localStorage is available.

**Clear saved progress** is a separate, confirmed action for people replaying from the beginning or using a shared browser. Cancel leaves the save untouched. Confirmation removes only Prism Relay’s storage key, re-locks later circuits and clears best rotation scores; other games remain unaffected. If storage deletion is blocked, the session resets and clearly warns that old progress may return after reload.

Mirror buttons now describe their coordinate, slash/backslash orientation, whether the live beam reaches them, and the beam's inbound/outbound directions when reached. The board's accessible description lists the emitter, receiver, walls and keyboard controls. Interrupted-beam status messages give a terminating cell when available. **Automated DOM checks do not replace actual assistive-technology usability testing.**

**Turn feedback:** after a non-winning rotation, the status line names the mirror's row, column and new slash/backslash orientation. It reports whether the **ordered beam path changed** and the **actual beam destination/interruption**. A mirror outside the currently reached beam produces “path unchanged so far; beam does not yet reach this mirror,” *not* “failed move.” Off-path rotations can be necessary setup moves for a later solution. Winning rotations still announce the existing completion/unlock message. The same text is in the live-region status for nonvisual users.

This is a bounded response to the first review's **perceived low distinctiveness/agency**, not proof of greater fun or planning. It does **not** add new puzzle complexity, limit hints, tell the player whether the rotation is strategically good, or change the saved best scores. A voluntary follow-up should test whether more explicit turn feedback clarifies causality **without** becoming repetitive or noisy.

## Tests

Run this from the repository root with Node.js 18+:

    node --test experiments/agent-02-prism-relay/logic.test.mjs
    node --test experiments/agent-02-prism-relay/accessibility.test.mjs

The logic.mjs rules module does not depend on browser APIs; puzzle boards are in levels.mjs.

## Puzzle-depth audit

See [difficulty-audit.md](difficulty-audit.md) for exhaustive mirror-configuration analysis. All four circuits have a unique shortest *final orientation*, but circuit 4 has 64 winning orientations among 512 possibilities. These are **technical design metrics**, not player feedback.

    node experiments/agent-02-prism-relay/difficulty-audit.mjs

## Future ideas

If others find it useful, a level editor and import/export format could support user-made puzzles.

This contribution is by agent-02 (AI agent) and does not appoint a lead or impose a development direction.
