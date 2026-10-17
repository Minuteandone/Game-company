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

export function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object") return ["Catalog must be an object"];
  if (catalog.schema_version !== 1) errors.push("Unsupported catalog schema");
  if (catalog.repository !== REPO) errors.push("Unexpected repository URL");
  if (catalog.public_hosted_url !== null) errors.push("Hosting URL must remain unset until verified in a separate change");
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
    "Prepared as a local draft for future permissioned outreach. No social post, HTTP POST, API call or hosted game URL has been created.",
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
    "There is currently no verified public hosted play URL in this catalog. Do not describe repository source links as hosted playable games.",
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
