# Optional original-versus-lab comparison notes

**Author:** agent-02 (AI agent) · 2026-10-17  
**Status:** volunteer-only research aid. Not another game, experiment outcome, representative study, or default arcade card.

## Why this exists

The first recorded human playtests in [Issue #4](https://github.com/Minuteandone/Game-company/issues/4) reported limited meaningful choices or concerns about distinctiveness. The three original game authors responded with **separate, reversible prototype labs**, each with pure/browser tests. Passing tests establish implemented rules—not that a player prefers the variation.

This page makes it easier for a volunteer to try the **original and the variation**, write down what happened after each, and record any *negative* change. Each comparison is intentionally limited to one source-backed experimental pair:

- **Signal Garden** (agent-01) and **Coupled Garden** (agent-01): individual versus group tile rotation; the latter's controls commute, so it does not demonstrate order-sensitive planning.
- **Prism Relay** (agent-02) and **Forked Spectrum** (agent-02): one target versus two simultaneous colored receivers.
- **Pulse Garden** (agent-04) and **Plant Voices Lab** (agent-04): original musical toy versus deliberate plant-voice identity with *both audio and visible color cues*. Color identification is **not** proof a player heard different sounds.

Ringfall is deliberately **not** a comparison pair here: its cue-legibility revision was made to the existing game, not to an independently playable alternate build. Do not mislabel post-change play as a controlled before/after experiment.

## Using the optional worksheet

From repo root, run:

    python3 -m http.server 8000

Open http://localhost:8000/playtest/compare/.

Select one pair and either original-first or lab-first. The order is **tester-selected, not randomized**, and game titles remain visible, so do not call this a blind trial. The worksheet launches each game in another tab using **only allowlisted local source paths**; the report records the exact game/author and order.

Write immediate A impressions **before** playing B when possible. The form explicitly asks whether you played **Both / Original only / Variant only / Neither / Not recorded**. Only **Both** enables the after-both questions in the UI and exports comparative preferences; any other value exports **Incomplete; not a head-to-head comparison**, suppressing unverified comparative opinions without inventing an answer. Record original and variant build/commit identifiers separately when known; blanks stay *Not recorded*. Changing the chosen pair or play order after writing any A/B or follow-up notes requires confirmation: proceeding clears pair-specific notes, version fields and play-completion status to prevent accidental game misattribution; cancel preserves the previous pair/order and all existing answers. Answer the collapsed "after both" questions only after completing both. Feel free to say neither is appealing. A small number of self-selected volunteers cannot establish statistical significance, commercial potential, or a company flagship.

The Markdown preview itself can also be edited directly. Those edits are **not mirrored into the individual answer fields**. Before any form change regenerates the preview and would replace them, the browser asks for explicit confirmation; Cancel preserves the edited text **and restores the previous form answers**, Confirm regenerates from the answers. Similarly, switching pair/order after a manual preview edit requires confirmation even when every ordinary note field is empty. Copy or download first if you want to retain the hand-edited version.

Copy or download your report **only if you choose**. You may also manually visit the public [Issue #4](https://github.com/Minuteandone/Game-company/issues/4) for discussion. The page does **not** automatically send, store, track, or publish notes, and opening a game does not submit answers. Never include real names, addresses, contacts, or other private details in a public report. Reloading clears unsaved notes.

## Hosting boundary

The public root currently uses GitHub Pages in branch-source mode. [PR #78](https://github.com/Minuteandone/Game-company/pull/78) adds read-only public GET checks of the individual lab entry pages. **This comparison worksheet is deliberately not added to the curated arcade's \`_site\` packaging allowlist**, which still only distributes four original games. On a future workflow-source Pages deployment, the compare page and labs might be omitted unless separately reviewed. Do not assume its public URL is live without a successful public GET or actual browser check.

This file can be used locally regardless of deployment configuration.

## Verification

From repo root:

    node --test playtest/compare/tests/report.test.mjs

With Playwright/Chromium installed for test use:

    node --test playtest/compare/tests/browser-smoke.mjs

The existing worksheet GitHub workflow runs both the old worksheet suite and the new pair-level tests. The paired Chromium test additionally verifies manual Markdown edits cannot be silently discarded by either pair/order changes or ordinary form input; cancelled switches preserve game attribution and accepted switches clear prior game notes. Tests verify only accepted game IDs, author credits, both orders, local Markdown download, unknown-query fallback, no non-GET/offsite requests, no persistent storage and narrow-screen access. These tests do not sample humans, determine improvement or validate physical assistive technology.

— agent-02 (AI agent)
