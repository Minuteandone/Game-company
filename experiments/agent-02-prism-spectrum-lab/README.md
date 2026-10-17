# Forked Spectrum — optional Prism Relay differentiation lab

**Author:** agent-02 (AI agent) · 2026-10-17  
**Status:** isolated prototype, not a shipped game replacement.

## Reason for this experiment

A first-time tester played Prism Relay and later [corrected an accidentally Signal Garden-labeled report](https://github.com/Minuteandone/Game-company/issues/4). Their observations included:

- circuit 4 felt difficult because of its decoy mirrors;
- the basic puzzle felt relatively easy/fast;
- Prism Relay felt mechanically similar to Signal Garden because both are grid-square interactions guiding something from a source to a goal.

This is one subjective session, not a statistically representative product verdict. The exact next design is uncertain.

[Issue #66](https://github.com/Minuteandone/Game-company/issues/66) records the bounded hypothesis: **would simultaneous dual-color beam routing feel more distinctive than a single-source/single-goal puzzle?** It could fail, since the input is still rotating grid mirrors.

## How this differs

- A white emitter passes into a **fixed beam splitter P**.
- Incoming energy forks **perpendicular** to the travel direction: cyan left, amber right.
- The **cyan ray must reach A** while the **amber ray must reach B** on the same board.
- Each ray reflects on slash/backslash mirrors independently; rays can cross without colliding.
- Both routes are rendered concurrently and the independent target states are announced in text.
- One handcrafted 7×7 board requires two distinct mirror rotations to win. The pure shortest-route audit confirms this.
- A single on-screen reset and keyboard/mouse/touch mirror controls. No hint button, score, timers or saved state.

The original [Prism Relay](../agent-02-prism-relay/) remains completely unchanged, with its own four circuits, hint system, progress and scores.

## Try locally

Run from repository root:

    python3 -m http.server 8000

Open http://localhost:8000/experiments/agent-02-prism-spectrum-lab/ in the browser.

For automated technical checks (Node 22+):

    node --test experiments/agent-02-prism-spectrum-lab/logic.test.mjs

The dedicated PR workflow installs **CI-only Chromium and WebKit**. Chromium tests keyboard Enter rotation, independent receiver states, 2-rotation victory, reset, focus retention and 360px layout. A separate WebKit context emulates an **iOS-style touch tablet** to tap both mirrors, verify that each ray connects, reset by touch, and check 320px layout, JavaScript errors, outgoing requests and localStorage. The CI artifact includes synthetic solved screenshots from both engines.

This extra cross-engine check responds to the first tester using **Chrome on iOS and touch input**. All iOS browser apps use Apple's WebKit rendering engine, but **Linux WebKit emulation is not a real iPad test**, and these assertions cannot establish whether the player would find the puzzle distinctive or enjoyable.

## Comparison protocol — only if a willing player wants to test

Ideally play original Prism Relay before reading this mechanic explanation. Try the small lab afterward and ask, **without revealing an expected positive outcome**:

- Which felt more distinctive from Signal Garden, and why?
- Did the two simultaneous goals require different thinking, or just more rotations?
- Were the colored rays readable? Did the splitter create a useful surprise or confusion?
- Would you continue to a second split-beam puzzle, or return to the original mechanic?

A negative response is equally useful. Don't add the lab to the public arcade or replace existing Prism levels based solely on a solver or one earlier review. The lab has **no fabricated player feedback**.

## Boundaries and attribution

All code here was authored by **agent-02 (AI agent)**. It shares the general reflection concept but does not overwrite Signal Garden, Ringfall, Pulse Garden, or the original Prism Relay. It makes no API calls, tracking requests, external data submissions, service accounts or purchases.

The project retains its no-cost, dependency-free game runtime. Playwright is an optional **CI-only** test dependency.

— agent-02 (AI agent)
