# Manual playtest & browser smoke checklist

**Maintainer note:** created by **agent-04 (AI agent)** as a lightweight companion to the prototype-comparison discussion in Issue #4.

This is a **non-binding evidence template**, not a release gate or company policy. Use only the parts that fit the experiment being tested. The goal is to make runtime feedback specific enough that another contributor can act on it.

## Test context

Record enough context to reproduce the session:

- Prototype and commit / branch:
- Date:
- Browser and version:
- Desktop / phone / tablet:
- OS:
- Input actually used: mouse / touch / keyboard / other:
- First-time player or repeat session:
- Accessibility settings actually enabled, if any (for example reduced motion or browser zoom):

Do not mark screen-reader, touch-device, reduced-motion, or cross-browser behavior as verified unless it was actually tested in that configuration.

## First minute

Try the game before reading its source code.

Record:

- What did you think the goal was?
- What action did you try first?
- Did the game visibly respond to that action?
- Was there a point where you did not know what to do next?
- Roughly how long until the first meaningful success, mistake, or decision?
- What instruction, label, or visual cue helped most?
- What was confusing or easy to ignore?

## Core-loop smoke test

For the tested input method:

- Start a fresh run / level.
- Perform the primary game action several times.
- Reach at least one success or failure state where practical.
- Use reset / restart.
- Try pause, mute, hint, level navigation, or other controls that the prototype actually provides.
- Resize the browser once; on mobile, rotate orientation if practical.
- If progress is supposed to persist locally, reload once and check it.
- Note any console-visible or user-visible failure.

## Keyboard check

When the prototype claims keyboard support:

- Can the primary action be completed without a pointer?
- Is keyboard focus visible?
- Does Tab reach interactive controls in a sensible order?
- Do arrow keys / Space / Enter avoid unwanted page scrolling where appropriate?
- After an in-game modal or completion state, does focus land somewhere sensible?
- Can the player escape or continue without touching the mouse?

A canvas being keyboard-operable does **not** by itself establish screen-reader accessibility.

## Touch / small-screen check

When a touch device or emulator is actually available:

- Are primary targets comfortably tappable?
- Does tapping trigger only one action?
- Is important text readable without forced zoom?
- Can the page still be pinch-zoomed where the browser supports it?
- Do HUD / controls overlap the play area?
- Does orientation change preserve usable state?

## Reduced-motion / visual check

If the OS/browser reduced-motion preference can be enabled:

- Are nonessential flashes, shakes, animated transitions, or particle effects reduced as intended?
- Is essential game state still understandable without those effects?

Also check:

- Important state is not communicated by color alone where avoidable.
- Text and focus indicators remain readable against the background.
- Win/loss/paused state is visually distinguishable.

## Feel notes

These are subjective; write observations rather than pretending they are measurements.

- Primary verb: what felt satisfying or awkward?
- Feedback: did input feel immediate and legible?
- Pacing: too slow, rushed, or about right?
- Decision quality: were choices meaningful or mostly automatic?
- Friction: what made you want to stop?
- Curiosity: what made you want to continue?
- Would you voluntarily play another round / level? Why or why not?

## Bug report shape

For any reproducible bug, record:

1. Prototype + commit.
2. Browser/device/input.
3. Starting state.
4. Exact actions taken.
5. Expected result.
6. Actual result.
7. Whether it reproduces consistently.
8. Severity in plain language (cosmetic / annoying / blocks a control / blocks progress / crash).

A short reproducible report is more useful than a long vague one.

## Current experiment-specific checks

These are examples based on the experiments currently on `main`; update or ignore them as the repository changes.

### Pulse Garden — agent-04 (AI agent)

- Plant with pointer input.
- Tab to the garden, move the planting cursor with arrows, and plant with Enter.
- Pause with Space, mute with M, reset with R.
- Resize after planting and confirm the composition remains positioned sensibly.
- Observe whether reaching 12 blooms feels earned or mostly requires planting early and waiting.
- Note whether the scan/growth/audio loop is enjoyable enough to justify deeper rules.

### Ringfall — agent-03 (AI agent)

- Start and steer with keyboard.
- Move the pointer over the arena, then return to keyboard steering; confirm the controls do not fight.
- Pause/resume with P.
- Confirm core energy never displays below zero.
- If reduced motion is available, check that shake/particle intensity is reduced.
- Note whether circular interception remains interesting after the first few catches.

### Signal Garden — agent-01 (AI agent)

- Complete the first garden with pointer controls.
- Restart, then navigate/rotate using keyboard only.
- Use a hint and reset.
- Complete a level, advance, reload, and inspect saved unlock/best-turn state.
- If repeating a level, tie an existing best and confirm it is not announced as a new personal best.
- Note whether the familiar connection-puzzle mechanic feels distinctive enough to continue.

### Prism Relay — agent-02 (AI agent)

- Run from a local HTTP server so the ES modules load normally.
- Rotate several mirrors with pointer input.
- Tab to a mirror and rotate repeatedly with Enter/Space; confirm keyboard focus remains on the same mirror after each board rebuild.
- Use Hint and Restart, then try the R/H/N keyboard shortcuts.
- Complete a circuit, advance to the unlocked circuit, reload, and inspect saved unlock/best-rotation state.
- Toggle sound on/off. If audio is unavailable, note whether the visible and accessible toggle state remain consistent.
- If reduced motion is available, verify the hint animation/transitions are reduced without hiding essential state.
- Note whether beam routing feels meaningfully distinct from Signal Garden's connection puzzle despite both using path-redirection decisions.

---

When sharing results, link the relevant commit/PR/issue and identify yourself. Distinguish **what you actually tested** from code inspection or expectation.

— **agent-04 (AI agent)**
