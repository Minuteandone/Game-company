#!/usr/bin/env node
/**
 * Generate non-published discovery preview text from reviewed catalog entries.
 * Attribution: agent-02 (AI agent). No HTTP requests, posting or credentials.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(ROOT, "discovery/catalog.json");
const REPO = "https://github.com/Minuteandone/Game-company";
const PLAY_URL = "https://minuteandone.github.io/Game-company/";
const GET_EVIDENCE = "https://github.com/Minuteandone/Game-company/actions/runs/39064631024";

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object") return ["Catalog must be an object"];
  if (catalog.schema_version !== 1) errors.push("Unsupported catalog schema");
  if (catalog.repository !== REPO) errors.push("Unexpected repository URL");
  if (catalog.public_hosted_url !== PLAY_URL) errors.push("Live hosted URL must match the HTTP-verified deployment");
  const verified = catalog.hosted_verification;
  if (!verified || verified.evidence !== GET_EVIDENCE || verified.checks_passed !== 10) {
    errors.push("Missing precise GET verification evidence");
  }
  const deploy = catalog.reported_deployment;
  if (!deploy || deploy.url !== "https://minuteandone.github.io/Game-company/" ||
      deploy.independent_http_check !== "verified_via_github_actions" ||
      deploy.evidence !== "https://github.com/Minuteandone/Game-company/actions/runs/39064201766") {
    errors.push("Reported deployment evidence must be explicit and unverified");
  }
  if (!Array.isArray(catalog.games) || catalog.games.length === 0) return [...errors, "No games supplied"];
  const ids = new Set(), paths = new Set();
  for (const [index, game] of catalog.games.entries()) {
    const prefix = "Game " + (index + 1) + ": ";
    if (!game || typeof game !== "object") { errors.push(prefix + "invalid entry"); continue; }
    if (typeof game.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.id)) {
      errors.push(prefix + "invalid ID");
    } else if (ids.has(game.id)) errors.push(prefix + "duplicate ID");
    else ids.add(game.id);
    if (typeof game.path !== "string" ||
      !/^(?:games|experiments|prototypes)\/[a-z0-9/-]+\/$/.test(game.path) ||
      game.path.includes("//") || game.path.includes("..")) {
      errors.push(prefix + "unsafe local path");
    } else if (paths.has(game.path)) errors.push(prefix + "duplicate path");
    else paths.add(game.path);
    if (typeof game.name !== "string" || !/^[A-Za-z0-9 -]{3,50}$/.test(game.name)) errors.push(prefix + "invalid name");
    if (typeof game.original_author !== "string" || !/^agent-\d{2} \(AI agent\)$/.test(game.original_author)) errors.push(prefix + "missing attribution");
    if (typeof game.summary !== "string" || game.summary.length < 25 || game.summary.length > 220 ||
      /[<>\r\n]/.test(game.summary)) errors.push(prefix + "invalid summary");
    if (!Array.isArray(game.tags) || game.tags.length < 1 || game.tags.length > 5 ||
      game.tags.some(tag => typeof tag !== "string" || !/^[a-z-]{2,20}$/.test(tag))) errors.push(prefix + "invalid tags");
  }
  return errors;
}

export function formatPreview(catalog) {
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(errors.join("; "));
  return [
    "# Game Company — discovery preview (NOT PUBLISHED)",
    "",
    "Prepared as a local draft for future permissioned outreach. This generator makes no social post, HTTP POST or external API call; public hosting is managed separately.",
    "",
    "## Collection",
    "Four independent browser-game experiments by separate AI agents.",
    "",
    ...catalog.games.flatMap(game => [
      "## " + game.name,
      "",
      game.summary,
      "",
      "**Original author:** " + game.original_author,
      "**Genre:** " + game.category,
      "**Tags:** " + game.tags.join(", "),
      "**Repository source:** " + REPO + "/tree/main/" + game.path.replace(/\/$/, ""),
      "**Local play path:** " + game.path + " (from the repository root)",
      ""
    ]),
    "## Local play instructions",
    "",
    "Clone or download " + REPO + " and run the following command from its root:",
    "",
    "    python3 -m http.server 8000",
    "",
    "Then open http://localhost:8000/ on the same device.",
    "",
    "**Public arcade (HTTP GET verified by GitHub Actions):** " + catalog.public_hosted_url,
    "**GET check evidence:** " + catalog.hosted_verification.evidence + " (" + catalog.hosted_verification.checks_passed + " endpoint/asset checks passed).",
    "These checks verify publicly served assets and MIME types, not remote browser gameplay, mobile usability, or accessibility.",
    "GitHub source links above are for code inspection; the public arcade is the browser play destination.",
    "Posting to any external service would require a separate reviewed integration and authorization.",
    ""
  ].join("\n");
}

export async function readCatalog() {
  return JSON.parse(await readFile(CATALOG, "utf8"));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(formatPreview(await readCatalog()));
}
