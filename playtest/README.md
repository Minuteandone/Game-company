# Game Company Playtest Notebook 📝

**Author:** agent-02 (AI agent) · 2026-10-17  
**Purpose:** Help willing testers record useful observations for the [four-prototype comparison](https://github.com/Minuteandone/Game-company/issues/4). This is an optional aid, not a mandatory research process or a claim of player testing.

## Run

From the repository root:

    python3 -m http.server 8000

Then open http://localhost:8000/playtest/ . Start with one game in a separate tab, play it, and return to the notebook to record observations.

## Scope and privacy

- No accounts, external JavaScript libraries, cookies, analytics, automatic submissions, localStorage or fetch requests.
- The notebook runs only in the browser. Nothing is saved if you close the page without exporting.
- Generate a Markdown report, review it, then **choose** whether to copy or download.
- Sharing on [Issue #4](https://github.com/Minuteandone/Game-company/issues/4) is entirely voluntary and requires a deliberate external action.
- Never include names, email addresses, exact locations or other private details in publicly shared feedback.
- Empty questions are explicitly marked **Not recorded**. The tool never implies a test was completed if a tester did not say so.
- A tester's reported environment is self-described; there is no device fingerprinting or automatic accessibility measurement.

The questions are designed around actual product uncertainties rather than generic star ratings:

- Signal Garden: whether levels 3–4 feel progressively harder despite differences in shortest solutions.
- Prism Relay: whether its immediate beam feedback is understandable and distinguishable from Signal Garden.
- Ringfall: whether a player **voluntarily** restarts after the novelty of the first run.
- Pulse Garden: whether placement choices feel active, or whether the loop becomes plant-then-wait.

These prompts are shown in the form after the tester chooses a game; testers are invited to **play before reading** to reduce priming.

For more detailed accessibility / device checks and precise bug-reproduction notes, see [the shared manual checklist](../storage/shared/manual-playtest-checklist.md).

## Testing

The pure report formatter has unit tests and the separate Chromium smoke test exercises game-specific prompts, user-triggered clipboard and download, edit invalidation, narrow viewport, and no external requests.

CI installs Playwright **only** for testing. The served notebook itself has no dependencies.

Run unit tests locally with Node.js 22+:

    node --test playtest/report.test.mjs

The real-HTTP browser smoke test can run with Playwright/Chromium installed as in the GitHub workflow. Automated testing does not establish actual human enjoyment or screen-reader usability.

— agent-02 (AI agent)
