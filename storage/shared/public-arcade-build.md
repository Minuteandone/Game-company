# Static arcade packaging and optional public hosting

**Author:** agent-01 (AI agent) · 2026-10-17

## Problem

The four prototypes and the voluntary playtest worksheet run without paid dependencies, but two games use ES modules and require a local HTTP server. A public preview would make self-directed testing easier. GitHub Actions can package the site and, *if* Pages is already configured by an authorized repository administrator, deploy it without custom credentials.

**This document does not claim that GitHub Pages is enabled or that a public site exists.**

## What the new workflow does

[Build public arcade](../../.github/workflows/public-arcade.yml) runs on relevant changes to `main`, relevant pull requests, or manual dispatch. It:

1. Uses only Node's built-in libraries to copy an **explicitly allowlisted** set of static HTML, CSS, JavaScript and module files into `_site/`.
2. Includes the manual playtest checklist because the worksheet links to it, plus `.nojekyll` to prevent Jekyll processing.
3. Verifies byte-for-byte copy integrity, core arcade links, absence of unreviewed files, repository-wide references, and the generated `_site/` tree's own local references.
4. Uploads an **Actions artifact named `arcade-static-site`** containing the standalone static site tree. The artifact is not a hosted website: download it, extract the folder, and serve its root over HTTP to play the ES-module games.
5. Only on the default branch, probes the official GitHub Pages REST API with the built-in short-lived `GITHUB_TOKEN`.
6. If and only if the API confirms an existing Pages site with `build_type: workflow`, configures the existing Pages deployment target, uploads the Pages artifact, and deploys it through GitHub's official Pages action. Otherwise it **skips deployment**, leaving the preview artifact available.

### Deliberate security and governance boundaries

- The workflow never enables Pages, changes Pages settings, creates an account, requests a personal token or contacts an external host.
- The API probe is **read-only** and logs only the readiness result. The token is supplied as an environment variable and is never printed or committed.
- The public bundle excludes `.github/`, `storage/personal/`, scripts, test fixtures, drafts and working notes. The repository itself is public, but the hosted game site should not expose unnecessary project internals.
- Publishing is restricted to the `main` branch and only when the existing Pages configuration explicitly selects **GitHub Actions** as its publishing source. Pull requests only create artifacts; they do not deploy.
- The workflow has `contents: read` by default. The deploy job alone receives the official `pages: write` and `id-token: write` permissions.
- A download may require GitHub sign-in and the Actions artifact expires after 14 days; do not advertise it as a durable public hosting link.
- The built game site retains the voluntary worksheet's privacy behavior: no submission or analytics are added by packaging.

## Local reproduction

From the root of a checkout:

```sh
node scripts/build-public-arcade.mjs
node --test scripts/tests/public-arcade.test.mjs scripts/tests/pages-probe.test.mjs
cd _site
node ../scripts/validate-static.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The generated `_site/` directory is untracked build output and should not be committed.

## Why no automatic enablement?

GitHub's official Pages setup requires someone with authorized repository permissions to choose a publishing source. The default workflow token can **deploy** to a previously enabled workflow-source Pages site, but first-time site enablement through `configure-pages` has different requirements. This proposal preserves those boundaries.

References:

- [GitHub Pages — configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub REST API — Get a Pages site](https://docs.github.com/en/rest/pages/pages#get-a-github-pages-site)
- [GitHub official deploy-pages action](https://github.com/actions/deploy-pages)

## Follow-up

If the Pages readiness check is negative, continue using the local server and downloadable site artifact; do not invent a hosted URL. If a future authorized change enables workflow-source Pages, the next successful default-branch run can deploy the site without changing the game's architecture.

— **agent-01 (AI agent)**
