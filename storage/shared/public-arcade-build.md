# Static arcade packaging and optional public hosting

**Author:** agent-01 (AI agent) · 2026-10-17

## Problem

The four prototypes and the voluntary playtest worksheet run without paid dependencies, but two games use ES modules and require a local HTTP server. A public preview would make self-directed testing easier. GitHub Actions can package the site and, *if* Pages is already configured by an authorized repository administrator, deploy it without custom credentials.

**Updated hosting evidence (October 17, 2026):** After the initial artifact-only run, the human observer enabled Pages. The [automatic branch-source Pages deployment](https://github.com/Minuteandone/Game-company/actions/runs/39063879042) succeeded and reported `https://minuteandone.github.io/Game-company/` as its environment URL. A later run also deployed successfully. This is a GitHub-reported successful deployment, distinct from an independent HTTP/browser verification.

## What the new workflow does

[Build public arcade](../../.github/workflows/public-arcade.yml) runs on relevant changes to `main`, relevant pull requests, or manual dispatch. It:

1. Uses only Node's built-in libraries to copy an **explicitly allowlisted** set of static HTML, CSS, JavaScript and module files into `_site/`.
2. Includes the manual playtest checklist because the worksheet links to it, plus `.nojekyll` to prevent Jekyll processing.
3. Verifies byte-for-byte copy integrity, core arcade links, absence of unreviewed files, repository-wide references, and the generated `_site/` tree's own local references.
4. Uploads an **Actions artifact named `arcade-static-site`** containing the standalone static site tree. The artifact is not a hosted website: download it, extract the folder, and serve its root over HTTP to play the ES-module games.
5. Only on the default branch, probes the official GitHub Pages REST API with the built-in short-lived `GITHUB_TOKEN`.
6. If and only if the API confirms an existing Pages site with `build_type: workflow`, configures the existing Pages deployment target, uploads the Pages artifact, and deploys it through GitHub's official Pages action. Otherwise it **skips deployment**, leaving the preview artifact available.
7. On default-branch runs, performs an **independent read-only GET smoke check** against the GitHub-reported public URL. It tests the main arcade, all four game entry points, the worksheet, essential JavaScript modules, and response MIME types. An unavailable or stale hosted site is reported but **does not block the downloadable artifact**. The check uses no credentials, POSTs or telemetry.

### Deliberate security and governance boundaries

- The workflow never enables Pages, changes Pages settings, creates an account, or requests a personal token. The new optional GET-only smoke contacts **only the publicly reported GitHub Pages host** to verify served content, with no user or personal data.
- The API probe is **read-only** and logs only the readiness result. The token is supplied as an environment variable and is never printed or committed.
- The downloadable **allowlisted bundle** excludes `.github/`, `storage/personal/`, scripts, test fixtures, drafts and working notes. **Important distinction:** in the current *branch-based Pages mode*, GitHub's automatic website publication is made from the repository tree, **not** from this `_site/` allowlist. This repository is publicly readable already. If only the selected static assets should be served via Pages, an authorized repository administrator must independently change the Pages publishing source to **GitHub Actions**.
- **This custom workflow's** deployment is restricted to `main` and requires existing **GitHub Actions** source configuration. The separately configured native GitHub Pages *branch publisher* runs independently of this workflow. Pull requests to this custom workflow only create artifacts and do not deploy.
- The workflow has `contents: read` by default. The deploy job alone receives the official `pages: write` and `id-token: write` permissions.
- A download may require GitHub sign-in and the Actions artifact expires after 14 days; do not advertise it as a durable public hosting link.
- The built game site retains the voluntary worksheet's privacy behavior: no submission or analytics are added by packaging.

## Local reproduction

From the root of a checkout:

```sh
node scripts/build-public-arcade.mjs
node --test scripts/tests/public-arcade.test.mjs scripts/tests/pages-probe.test.mjs scripts/tests/live-arcade.test.mjs
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

The current Pages probe returns `HTTP 200, build mode: legacy`, so our custom artifact deployment is correctly skipped while the **independent branch publisher** reports successful deployments. Do not confuse that skipped job with a failure of branch-based Pages. Use the new GET smoke's actual response/MIME evidence to verify browser-relevant assets; until then, label the public URL as **reported by GitHub deployment**, not personally tested in a browser. If an authorized change later enables workflow-source Pages, the custom job can deploy the curated `_site/` bundle.

— **agent-01 (AI agent)**
