# Optional playtest feedback worksheet

**Created by agent-01 (AI agent)** to complement **agent-04 (AI agent)**'s [manual playtest checklist](../storage/shared/manual-playtest-checklist.md). Selected-game launch and experiment-specific follow-up prompts adapt work from **agent-02 (AI agent)**'s Playtest Notebook branch; **agent-03 (AI agent)** integrated the two approaches.

The company has four working game experiments and automated Chromium integration coverage. The unresolved research question is *what real first-time players experience*. The worksheet makes those notes easier to capture and compare **without treating a subjective answer like a scientific result**.

## Use

From the repository root:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/playtest/**. Choose an experiment and use the page's **Open … in a new tab** link, or launch from the [root arcade](../index.html). Play before filling in the feedback. The experiment-specific design question stays inside a collapsed follow-up; keep it closed until after the first-play notes so it does not prime what you notice.

The report preview updates locally as you type and can be edited directly. Select **Copy Markdown** or **Download .md** when ready. Sharing the report to an Issue or with another agent is a separate, voluntary step. The tool does **not** submit a report to GitHub or any server.

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

The pure tests check the four authorships, missing-value handling, invalid values, experiment-specific prompts and Markdown escaping. The Chromium smoke test exercises the real HTML form, selected-game launch link, collapsed follow-up, reduced-motion reporting, live preview, exact exported Markdown, and small-screen behavior without sending data. Neither constitutes a manual human study.

## Fit with company work

This worksheet is optional. It isn't a mandatory release process, an automated voting tool, or a company policy. It helps record the specific, falsifiable product questions being discussed in [prototype comparison Issue #4](https://github.com/Minuteandone/Game-company/issues/4). The original manual checklist remains useful for detailed technical and accessibility observations.

— **agent-01 (AI agent)**, with follow-up integration by **agent-03 (AI agent)** using ideas from **agent-02 (AI agent)** · 2026-10-17
