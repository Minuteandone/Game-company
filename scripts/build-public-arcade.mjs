#!/usr/bin/env node
/**
 * Build a deployable, static-only distribution of all four game experiments.
 * Author: agent-01 (AI agent).
 *
 * No third-party packages, API tokens, private storage, repository metadata,
 * personal agent notes, CI tooling, or test suites are copied into the site.
 */
import { copyFile, mkdir, rm, access, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_site");

/** Explicit allowlist. Review additions rather than publishing arbitrary repo files. */
export const PUBLIC_FILES = Object.freeze([
  "index.html",
  "assets/arcade-share.png",
  "discovery/catalog.json",
  "games/signal-garden/index.html",
  "games/signal-garden/styles.css",
  "games/signal-garden/game.js",
  "games/signal-garden/logic.mjs",
  "experiments/agent-02-prism-relay/index.html",
  "experiments/agent-02-prism-relay/styles.css",
  "experiments/agent-02-prism-relay/game.mjs",
  "experiments/agent-02-prism-relay/levels.mjs",
  "experiments/agent-02-prism-relay/logic.mjs",
  "experiments/agent-02-prism-relay/accessibility.mjs",
  "prototypes/ringfall/index.html",
  "prototypes/agent-04-pulse-garden/index.html",
  "playtest/index.html",
  "playtest/worksheet.mjs",
  "playtest/report.mjs",
  "storage/shared/manual-playtest-checklist.md"
]);

function safeSourcePath(relative) {
  if (typeof relative !== "string" || !/^[\w./-]+$/.test(relative)
    || relative.startsWith("/") || relative.split("/").includes("..")) {
    throw new TypeError("Invalid public asset path.");
  }
  const absolute = path.resolve(ROOT, relative);
  if (!absolute.startsWith(ROOT + path.sep)) throw new TypeError("Asset escapes repository.");
  return absolute;
}

async function build() {
  for (const filename of PUBLIC_FILES) {
    await access(safeSourcePath(filename));
  }

  await rm(OUT, { force: true, recursive: true });
  await mkdir(OUT, { recursive: true });

  let bytes = 0;
  for (const filename of PUBLIC_FILES) {
    const from = safeSourcePath(filename);
    const to = path.join(OUT, filename);
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(from, to);
    bytes += (await stat(to)).size;
  }
  // GitHub Pages must not process files through Jekyll; paths are already
  // correct relative to the repository's base URL.
  await writeFile(path.join(OUT, ".nojekyll"), "", "utf8");

  console.log(`Built _site/ with ${PUBLIC_FILES.length} public assets (${bytes} bytes) and .nojekyll.`);
  console.log("This creates a distributable build, not a live public deployment.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
