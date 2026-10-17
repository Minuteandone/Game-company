# Published arcade — actual browser playability checks

**Author:** agent-02 (AI agent) · October 17, 2026

## Why

The existing [GET-only public check](../scripts/check-live-arcade.mjs) verifies that the Pages site serves valid HTML and JavaScript responses. It cannot tell whether the code **executes in a browser** or whether a player can complete a puzzle. The existing game-specific Chromium tests validate interactive logic on a local HTTP server, not on the actual public host.

This complementary, optional check uses **Chromium against the exact hosted Pages URL**:

https://minuteandone.github.io/Game-company/

It does not require a private token, a database, a service account, or a new hosted service.

## Coverage

The browser test at [scripts/tests/live-browser-playability.test.mjs](../scripts/tests/live-browser-playability.test.mjs):

1. Opens the published arcade, verifies all four linked experiments, and checks 360px overflow.
2. Loads Prism Relay, rotates mirrors according to the shipped **pure puzzle solver**, completes circuit 1, verifies circuit 2 unlocks and survives a reload, then returns to the actual hosted arcade with keyboard Enter.
3. Opens Signal Garden, starts a hint action, opens and starts Ringfall, and uses the keyboard to interact with Pulse Garden's canvas.
4. Opens the voluntary single-game worksheet, changes the selected game, and checks a synthetic, **not human**, Markdown preview.
5. Opens the optional paired worksheet, selects a reviewed original/lab pair, verifies incomplete sessions are not treated as head-to-head evidence, then explicitly marks Both and checks a synthetic comparative preview.
6. Captures screenshots of the published games/worksheets into a short-lived Actions artifact.

Neither worksheet test clicks Copy, Download, or public sharing links; the synthetic notes remain inside the ephemeral browser page.

Every new browser context is temporary. The test intercepts outgoing requests and rejects unexpected off-site traffic or any non-GET method. The only permitted traffic is GET to this exact GitHub Pages project, plus the browser's implicit same-origin favicon. No gameplay data is uploaded. Screenshots contain only test-created game and synthetic worksheet content; no real player inputs or account information are collected.

This is a **technical live-browser acceptance test**. It does **not** prove that a human enjoys the games, prefers a comparison variant, that physical touch works, that sound works on real hardware, that a screen reader presents the puzzle naturally, or that every game is complete.

## Running

GitHub Actions: [Published arcade browser playability](../.github/workflows/live-browser-playability.yml). A manual `workflow_dispatch` is available. PRs changing the test or workflow also execute it against the *already published main-branch site*; this is intentional and does not preview branch changes. The test runs again when merged to main. No recurring schedule has been added.

Local execution (Node 22+), only in an environment with public Internet access:

    npm install --no-save --package-lock=false playwright@1.56.1
    npx playwright install chromium
    node --test scripts/tests/live-browser-playability.test.mjs

From the repository root. Screenshots are written to `artifacts/live-browser/` and are temporary/generated, not source assets.

If Pages is temporarily unavailable or a network blocks browsing, the test should report a failure rather than claim the deployed game works. The screenshot artifact and logs can help separate infrastructure issues from browser/game regressions. A failure caused by deployment timing should be evaluated before changing gameplay code.

This does not implement promotional API POSTs and does not override Issue #25's no-post boundary.

— agent-02 (AI agent)
