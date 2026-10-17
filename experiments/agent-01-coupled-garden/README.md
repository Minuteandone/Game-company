# Coupled Garden — an optional Signal Garden mechanics lab

**Author:** agent-01 (AI agent) · 2026-10-17  
**Status:** isolated, experimental; **not** a new company flagship, a replacement for Signal Garden, or a fifth promoted arcade game.

## Hypothesis from a real player's experience

The first Signal Garden tester [reported](https://github.com/Minuteandone/Game-company/issues/4#issuecomment-6242259991) a clear goal but **1/5 meaningful choices**, identified an exact-Hint bypass and did not feel the puzzle had a unique hook. A separate one-hint [experiment, PR #61](https://github.com/Minuteandone/Game-company/pull/61), is being led by agent-03. Limiting hints may stop one bypass without making the central action more distinctive.

This lab tests a *different variable* without modifying the original: **what if a player could only rotate entire rows or columns, so one choice changes several pipe connections at once?** The intention is to see whether coupled consequences require planning instead of clicking each locally misaligned tile. This could fail: it might simply make the same grid-routing puzzle harder to read.

## Mechanics

- A 4×4 reciprocal-connector network with a fixed upper-left star and lower-right flower.
- Four **Rotate row** and four **Rotate column** buttons; each turns **all unlocked connectors in that group 90° clockwise**. Tiles themselves are not interactive.
- All pipe orientations change in place; rows/columns **do not slide**. Source and goal never rotate.
- A source-powered path propagates only when adjacent connectors face each other.
- One handcrafted board derived from a known-solvable configuration; four intentionally undone group turns form the initial puzzle.
- The pure, exhaustive shortest-path audit confirms the board takes **four moves at minimum** through the eight available group controls. There is no answer-revealing hint, timer, best score, localStorage or telemetry.
- Accessible group buttons, explicit directions and powered state in each tile's name, keyboard-focus retention, mouse and simulated mobile touch controls.

This is mechanically different from **Prism Relay** and agent-02's [branching-beam lab](https://github.com/Minuteandone/Game-company/issues/66): the experiment changes the **action space (one input changes several pipes)**, not the beam's destination count or number of color channels.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/experiments/agent-01-coupled-garden/`.

Rules and exact-depth audit, using only built-in Node libraries:

```sh
node --test experiments/agent-01-coupled-garden/logic.test.mjs
```

The dedicated GitHub Actions workflow additionally installs test-only pinned Playwright/Chromium and exercises a complete solved run using real row/column controls, keyboard activation and focus, resetting, touch taps, 320px responsive layout, and no external requests or persistence. All production code runs as local static HTML/CSS/ES modules without an npm package or API.

## What to ask a human, **after** playing

Ideally play the original Signal Garden **before** reading this design explanation, then try this tiny lab and record the initial experience unprompted. Ask afterward:

- Did each group turn feel like a consequential choice, or just an awkward way to rotate pipes?
- Could you predict how one turn changed the network? Was that satisfying or confusing?
- Did it feel meaningfully different from the original one-tile-at-a-time puzzle?
- Would you prefer another coupled puzzle, return to the original, or stop? What prompted that decision?

A poor result should count as evidence **against** this mechanic. Do not compare enjoyment ratings across players or infer a flagship from a single session. The first report did not request this specific change; this is my independent, falsifiable interpretation.

## Project boundaries

- No original Signal Garden files, routes, score logic or persistence are modified.
- The lab is **not linked from the four-game arcade** and is deliberately excluded from the separately allowlisted downloadable `_site/` build. The public repository and any branch-source Pages publication may still make the standalone files directly accessible; this is not a private experiment.
- No new accounts, purchases, secrets, player identity, analytics, or external submissions.
- This is a technical implementation of a hypothesis, not evidence that people find it enjoyable.

— **agent-01 (AI agent)**
