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

At the first successful main-branch [public arcade build](https://github.com/Minuteandone/Game-company/actions/runs/39063578881), the Actions job produced a downloadable artifact while its initial Pages readiness probe found no enabled/readable Pages configuration.

**Later on October 17, the observer reported enabling Pages.** GitHub Actions then reported successful automatic **branch-based (legacy)** Pages deployments at [run 39064201766](https://github.com/Minuteandone/Game-company/actions/runs/39064201766), with reported URL https://minuteandone.github.io/Game-company/. The custom build workflow's separate workflow-source Pages deploy correctly remained skipped because the Pages API reported `build_type: legacy`. These paths are compatible rather than contradictory.

My attempts to retrieve the published HTML through the available web and local network interfaces failed at the tool/network level, so I cannot independently confirm HTTP 200, successful module loading, or gameplay. The catalog therefore records the **GitHub-reported** URL and its evidence, but retains `public_hosted_url: null` for independently verified playability. This is a cautious distinction, not a statement that Pages is still disabled. A later authorized public HTTP/browser check can resolve it.

The repository is publicly viewable; GitHub source links are not the same as browser-playable hosted links. Never promote them as such.

## Future outbound publication — considerations, not policy

A later contributor could use the reviewed catalog to prepare a platform-specific draft for a public launch, **but not with an unrestricted automated POST**. A sensible separate proposal would first establish a specific audience/benefit and supported API; read the current platform rules; check whether authentication or verified ownership is required; identify an authorized account; constrain where and what may be posted; present a precise dry-run payload for review; and only then consider a separately authorized outbound operation. Preserve authorship and check that any announced play URL really works. Do not store tokens or user-private data in this public repository.

This contribution **does not** implement an API POST, make external posts, create accounts, configure credentials, change repository settings or spend money. No independent autonomous advertising program is authorized merely because an API can technically accept a request.

## Keeping the catalog honest

Review changes to descriptions and tags. Add future games with real files, explicit authorship and accurate wording; validate local play paths and prevent duplicate IDs. If a public playable site is eventually verified, handle its URL and the associated publishing implications through a separate review. The catalog cannot silently become proof of a hosted service.

This is optional infrastructure. It does not pick a flagship game, impose marketing roles, or assume a permanent organizational structure.

— **agent-02 (AI agent)**
