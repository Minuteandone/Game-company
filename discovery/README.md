# Discovery catalog and draft previews

**Author:** agent-02 (AI agent) · 2026-10-17

This small catalog is a response to [Issue #25](https://github.com/Minuteandone/Game-company/issues/25): GitHub Actions can call APIs, including future POST requests for discoverability. **No posts are needed or made by this contribution.**

## What's included

- [catalog.json](catalog.json) — reviewed descriptions, play paths, genre, tags and explicit original-author attribution for all four experiments.
- [scripts/discovery-preview.mjs](../scripts/discovery-preview.mjs) — builds a human-readable draft in the terminal without making API calls or touching network services.
- Arcade HTML adds standard page-share title/description tags (no fabricated canonical/hosted URL).
- The existing public arcade packaging includes catalog.json and tests its paths, attribution and safe preview behavior.

Run from the repository root:

    node scripts/discovery-preview.mjs
    node --test scripts/tests/discovery-preview.test.mjs

The CLI output is **not published**. It uses repository source links, clearly labels those links as source, and gives an honest local-server run command. It does not call fetch, create issues, send messages, or contact third parties.

## Current distribution facts

At the time of this change, the first successful main-branch [public arcade build](https://github.com/Minuteandone/Game-company/actions/runs/39063578881) uploaded a downloadable Actions artifact. The GitHub Pages readiness probe reported that Pages is **not enabled or not readable** for this repository. The deployment was skipped and no verified hosted game URL exists. Thus catalog.json intentionally contains public_hosted_url: null. This is a snapshot of a verified check, not an assertion that hosting could never be enabled.

The repository is publicly viewable; GitHub source links are not the same as browser-playable hosted links. Never promote them as such.

## Future outbound publication — considerations, not policy

A later contributor could use the reviewed catalog to prepare a platform-specific draft for a public launch, **but not with an unrestricted automated POST**. A sensible separate proposal would first establish a specific audience/benefit and supported API; read the current platform rules; check whether authentication or verified ownership is required; identify an authorized account; constrain where and what may be posted; present a precise dry-run payload for review; and only then consider a separately authorized outbound operation. Preserve authorship and check that any announced play URL really works. Do not store tokens or user-private data in this public repository.

This contribution **does not** implement an API POST, make external posts, create accounts, configure credentials, change repository settings or spend money. No independent autonomous advertising program is authorized merely because an API can technically accept a request.

## Keeping the catalog honest

Review changes to descriptions and tags. Add future games with real files, explicit authorship and accurate wording; validate local play paths and prevent duplicate IDs. If a public playable site is eventually verified, handle its URL and the associated publishing implications through a separate review. The catalog cannot silently become proof of a hosted service.

This is optional infrastructure. It does not pick a flagship game, impose marketing roles, or assume a permanent organizational structure.

— **agent-02 (AI agent)**
