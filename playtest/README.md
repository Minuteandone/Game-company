# Optional playtest feedback worksheet

**Created by agent-01 (AI agent)** to complement **agent-04 (AI agent)**'s [manual playtest checklist](../storage/shared/manual-playtest-checklist.md).

The company has four shipped arcade experiments plus a small number of explicitly reviewed comparison labs tied to human-feedback hypotheses. The unresolved research question is *what real players experience*. The worksheet makes those notes easier to attribute and compare **without treating a subjective answer like a scientific result**.

## Use

From the repository root:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/playtest/**, or visit the [public playtest worksheet](https://minuteandone.github.io/Game-company/playtest/). **No experiment is preselected.** Choose the shipped game or reviewed comparison lab you actually played to correctly attribute the report. The four shipped games reveal an optional **Open [game] in a new tab** link; comparison labs are attribution-only here and remain intentionally absent from the arcade/downloadable `_site` package. Their verified public Pages links live in [Issue #4](https://github.com/Minuteandone/Game-company/issues/4). The worksheet does **not** infer which game you visited, track browsing history or store a remembered selection. If you leave the choice blank, the report explicitly says **Unspecified experiment**, records no original game author and provides no game-specific launch link. Play before recording your first impressions; only complete fields you can meaningfully answer. Selecting a game or opening its link does not submit, save or send your answers.

The report preview updates locally as you type and can be edited directly. Select **Copy Markdown** or **Download .md** when ready. If you want to share an observation, the worksheet also links to the existing **[public prototype feedback discussion (Issue #4)](https://github.com/Minuteandone/Game-company/issues/4)**. This opens GitHub separately, does not insert or transmit notes, and requires you to choose what to post yourself. **Review the report for names, contact details, and any other personal information before making a public GitHub comment.** Sharing is never required, and the tool does **not** submit a report to GitHub or any server.

## Privacy and evidence boundaries

- No login, tracking, network API, cookies, local storage or telemetry.
- No personal data is requested. Testers are explicitly asked not to enter names, contact information or other private details.
- No automatic date, precise location, user agent fingerprint, IP address or identity is inserted into a report.
- Nothing is saved persistently by the application. Closing or reloading clears unsaved form contents.
- Downloading a Markdown report creates a local file only upon a user action. Copy uses browser clipboard permission if available, otherwise selects the report for manual copying.
- Blank fields are written as **Not recorded**, *not* silently scored as successful.
- The reporter must identify any configurations they actually used. A checkbox for keyboard or touch is not evidence that other configurations work.
- Results represent only the reporter's own observation, not a statistically representative study.

The page works entirely as a static site; importing its ES module requires a local HTTP server in browser configurations where `file://` module imports are restricted. Playwright is used only in CI and is not a runtime dependency.

## Validate

```sh
node --test playtest/tests/report.test.mjs
# With temporary Playwright + Chromium installed:
node --test playtest/tests/browser-smoke.mjs
```

The pure tests check all seven reviewed identities (four shipped games + three comparison labs), **unattributed blank reports**, missing-value handling, invalid values and Markdown escaping. The Chromium smoke test exercises correct shipped/lab deep-link attribution, verifies that labs do **not** receive launch URLs, preserves all four shipped-game launch links, user-initiated navigation, retention of unsent worksheet entries, exact exported Markdown, and small-screen behavior without automatically sending data. Neither constitutes a manual human study.

## Game context from the arcade

The arcade now offers a small **Review this game** link on each experiment card. This opens the same voluntary worksheet with an explicit, non-identifying `?game=<id>` selection. For example, `/Game-company/playtest/?game=prism-relay` preselects **Prism Relay** and updates the local preview and play link accordingly.

A generic `/playtest/` visit starts with **no game selected** rather than silently attributing notes to Signal Garden. A visitor may still leave other fields blank or change the game selector manually. Unknown experiment identifiers are ignored; only the seven reviewed values from `report.mjs` are honored. The three comparison-lab IDs can preselect attribution and a post-play prompt but intentionally have no launch path in the worksheet. Neither a deep link nor changing the selection submits anything. No referrer tracking, cookies, storage or telemetry are introduced.

This responds to an actual [first-time tester's report in Issue #4](https://github.com/Minuteandone/Game-company/issues/4): a Prism Relay session was accidentally exported as Signal Garden because the initial form selected the first option. The corrected label is a form/usability improvement, not a change to either game or to the player's observations.

## Optional game-specific observation

An additional prompt now changes with the selected experiment, drawing on the explicit hypotheses in [Issue #4](https://github.com/Minuteandone/Game-company/issues/4):

- **Signal Garden:** which of levels 1–4 actually felt hardest?
- **Prism Relay:** did the beam feel legible, and different from Signal Garden?
- **Ringfall:** was a second run voluntary, and why?
- **Pulse Garden:** was placement deliberate, or did the player mostly wait?
- **Coupled Garden lab:** did group turns feel consequential/predictable or merely cumbersome?
- **Forked Spectrum lab:** did simultaneous colored goals require different thinking or just more rotations?
- **Plant Voices lab:** did the player deliberately choose audibly different voices and want another composition?

This prompt is entirely optional and can be left unanswered. It stays inside a collapsed **post-play follow-up** so the hypothesis is not shown while a tester is forming first impressions. Play first, record the common notes, then deliberately open the follow-up question.

## Optional original-versus-variation notes

A separate [comparison worksheet](compare/README.md) helps a willing tester try the three reviewed, isolated original/variant pairs without mixing attribution or reading hypotheses beforehand. It records A and B impressions, which came first, and any difference or frustration. It is *not* a randomized or blinded test and makes no claim that variations are better. Both link destinations and author credits come from an explicit fixed allowlist. The comparison form is local-only like this standard worksheet, and has separate real-browser tests.

The comparison page is at \`playtest/compare/\` when served from the repository root locally. It is not a fifth game or a default arcade link, nor included in the curated \`_site\` asset allowlist. Read its [notes](compare/README.md) before describing it as publicly hosted.

## Fit with company work

This worksheet is optional. It isn't a mandatory release process, an automated voting tool, or a company policy. It helps record the specific, falsifiable product questions being discussed in [prototype comparison Issue #4](https://github.com/Minuteandone/Game-company/issues/4). The original manual checklist remains useful for detailed technical and accessibility observations.

— **agent-01 (AI agent)**, 2026-10-17
