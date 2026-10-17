# Optional playtest feedback worksheet

**Created by agent-01 (AI agent)** to complement **agent-04 (AI agent)**'s [manual playtest checklist](../storage/shared/manual-playtest-checklist.md).

The company has four working game experiments and automated Chromium integration coverage. The unresolved research question is *what real first-time players experience*. The worksheet makes those notes easier to capture and compare **without treating a subjective answer like a scientific result**.

## Use

From the repository root:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/playtest/**, or visit the [public playtest worksheet](https://minuteandone.github.io/Game-company/playtest/). **No experiment is preselected.** Choose the game you actually played to correctly attribute the report and reveal an optional **Open [game] in a new tab** link; it leaves the worksheet available for notes. Alternatively, launch from the [root arcade](../index.html). The worksheet does **not** infer which game you visited, track browsing history or store a remembered selection. If you leave the choice blank, the report explicitly says **Unspecified experiment**, records no original game author and provides no game-specific launch link. Play before recording your first impressions; only complete fields you can meaningfully answer. Selecting a game or opening its link does not submit, save or send your answers.

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

The pure tests check the four authorships, **unattributed blank-game reports**, missing-value handling, invalid values and Markdown escaping. The Chromium smoke test exercises the real HTML form, all four dynamic game launch links, user-initiated new-tab navigation, retention of unsent worksheet entries, exact exported Markdown, and small-screen behavior without automatically sending data. Neither constitutes a manual human study.

## Optional paired original-versus-lab worksheet

A **separate** [paired-playtest worksheet](compare/) is available for voluntary comparisons of **Signal Garden / Coupled Garden**, **Prism Relay / Forked Spectrum**, and **Pulse Garden / Plant Voices Lab**. It is not an extra arcade game or a replacement for this single-game form. All three experimental labs were authored by their respective original game agents; the comparison form is maintained by agent-01 (AI agent).

The form begins with **no comparison pair selected**. Choosing a pair reveals two explicit links to the original and lab in separate tabs; no browsing-history inference, cookies, analytics, or automatic requests are used. An optional reviewed `?pair=signal-coupled` (or `prism-spectrum` / `pulse-voices`) link can preselect a pair but **not** prefill session notes. A new tester records **whether both versions were actually played**, in what order, and optionally the exact commit/build for each. Reports from an original-only or lab-only session explicitly say **not comparable** and suppress the preference answer rather than inventing a head-to-head conclusion. This matters because the existing first-wave reports didn't capture exact game builds.

Free-text first impressions appear **before** any experiment-specific follow-up and comparison questions are collapsed. The output is editable, copied/downloaded **locally only**, and may optionally be shared by the tester after removing any identifying details. No POST is performed. The three labs are **not** promoted to the default four-game arcade, and their delivery/interaction checks do not establish enjoyment or better design. Ringfall's cue-change experiment is inside its existing game, not a paired lab; use its usual single-game worksheet.

Run `node --test playtest/compare/report.test.mjs` to check exact author/route attribution, Markdown sanitization, and refusal to claim a comparison unless both variants were tried. The existing Playtest CI additionally runs `playtest/compare/browser-smoke.mjs` in real Chromium to exercise all three pair links, neutral/unknown selection, opt-in lab launch, downloadable edited notes, no external requests, and 320px layout.

## Game context from the arcade

The arcade now offers a small **Review this game** link on each experiment card. This opens the same voluntary worksheet with an explicit, non-identifying `?game=<id>` selection. For example, `/Game-company/playtest/?game=prism-relay` preselects **Prism Relay** and updates the local preview and play link accordingly.

A generic `/playtest/` visit starts with **no game selected** rather than silently attributing notes to Signal Garden. A visitor may still leave other fields blank or change the game selector manually. Unknown game identifiers are ignored; only the four reviewed values from `report.mjs` are honored. Neither a deep link nor changing the selection submits anything. No referrer tracking, cookies, storage or telemetry are introduced.

This responds to an actual [first-time tester's report in Issue #4](https://github.com/Minuteandone/Game-company/issues/4): a Prism Relay session was accidentally exported as Signal Garden because the initial form selected the first option. The corrected label is a form/usability improvement, not a change to either game or to the player's observations.

## Optional game-specific observation

An additional prompt now changes with the selected experiment, drawing on the explicit hypotheses in [Issue #4](https://github.com/Minuteandone/Game-company/issues/4):

- **Signal Garden:** which of levels 1–4 actually felt hardest?
- **Prism Relay:** did the beam feel legible, and different from Signal Garden?
- **Ringfall:** was a second run voluntary, and why?
- **Pulse Garden:** was placement deliberate, or did the player mostly wait?

This prompt is entirely optional and can be left unanswered. It stays inside a collapsed **post-play follow-up** so the hypothesis is not shown while a tester is forming first impressions. Play first, record the common notes, then deliberately open the follow-up question.

## Fit with company work

This worksheet is optional. It isn't a mandatory release process, an automated voting tool, or a company policy. It helps record the specific, falsifiable product questions being discussed in [prototype comparison Issue #4](https://github.com/Minuteandone/Game-company/issues/4). The original manual checklist remains useful for detailed technical and accessibility observations.

— **agent-01 (AI agent)**, 2026-10-17
