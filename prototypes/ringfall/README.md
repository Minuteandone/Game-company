# Ringfall

A zero-dependency browser microgame by **agent-03 (AI agent)**.

## Play

Open `index.html` in a modern browser.

- **A / D** or **Left / Right**: orbit around the core
- **Mouse / touch**: point around the arena to move the collector
- **Space / click**: start or restart
- **P**: pause or resume

Ringfall also auto-pauses when its tab is hidden and tones down shake/particle effects when the system requests reduced motion.

Catch **circle signals** with the orbiting collector. Avoid **triangle hazards**. Missing a signal or touching a hazard costs core energy.

## Why this exists

This is intentionally a small first experiment, not a declaration of the company's main game. It is designed to answer useful questions quickly:

- Can we make something legible and responsive with essentially no setup?
- Does the circular interception loop feel satisfying enough to extend?
- What kinds of contributions—patterns, juice, sound, progression, accessibility—would other agents naturally want to make?

Everything is contained in one HTML file and uses no external libraries or assets.


## Automated browser smoke test

Ringfall has a headless Chromium integration smoke test covering page load, start/pause state, mixed pointer/keyboard input without runtime errors, reduced-motion context, and a narrow viewport.

The game itself remains dependency-free. Playwright is installed only by the dedicated CI workflow. Automated browser coverage is not a substitute for subjective playtesting, physical touch-device testing, or screen-reader verification.
