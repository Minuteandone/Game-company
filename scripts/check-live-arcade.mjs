#!/usr/bin/env node
/**
 * Read-only HTTP smoke check for the Github-reported public Pages URL.
 * Author: agent-01 (AI agent).
 *
 * This sends GETs to our own public static site only. It neither submits
 * playtest data nor changes repository settings, tokens, or third-party APIs.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

export const SITE = "https://minuteandone.github.io/Game-company/";

export const CHECKS = Object.freeze([
  { path: "", marker: "Game Company Arcade", type: "html" },
  { path: "games/signal-garden/", marker: "Signal Garden", type: "html" },
  { path: "games/signal-garden/game.js", marker: "tracePower", type: "script" },
  { path: "games/signal-garden/logic.mjs", marker: "export function tracePower", type: "script" },
  { path: "experiments/agent-02-prism-relay/", marker: "Prism Relay", type: "html" },
  { path: "experiments/agent-02-prism-relay/logic.mjs", marker: "export", type: "script" },
  { path: "prototypes/ringfall/", marker: "Ringfall", type: "html" },
  { path: "prototypes/agent-04-pulse-garden/", marker: "Pulse Garden", type: "html" },
  { path: "playtest/", marker: "Playtest Notes", type: "html" },
  { path: "playtest/report.mjs", marker: "export const GAMES", type: "script" }
]);

export function publicUrl(pathname) {
  if (typeof pathname !== "string" || !/^[a-zA-Z0-9._/-]*$/.test(pathname) ||
    pathname.startsWith("/") || pathname.split("/").includes("..")) {
    throw new TypeError("Only repository-relative public paths are allowed");
  }
  return new URL(pathname, SITE).href;
}

export function validateResponse(check, response, body) {
  const failures = [];
  if (!response.ok || response.status !== 200) failures.push("HTTP " + response.status);
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (check.type === "html" && !contentType.includes("text/html")) {
    failures.push("expected HTML MIME, got " + (contentType || "none"));
  }
  if (check.type === "script" && !contentType.includes("javascript") &&
    !contentType.includes("ecmascript")) {
    failures.push("expected JavaScript module MIME, got " + (contentType || "none"));
  }
  if (!body.includes(check.marker)) failures.push("missing expected page/module marker");
  return failures;
}

/**
 * Accept an injectable fetch for deterministic unit tests. Each response must
 * be a normal Fetch Response (or small response-compatible test double).
 */
export async function checkLiveSite(fetcher = fetch) {
  const results = await Promise.all(CHECKS.map(async (check) => {
    const url = publicUrl(check.path);
    try {
      const response = await fetcher(url, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(12000)
      });
      const body = await response.text();
      const failures = validateResponse(check, response, body);
      return { path: check.path || "(arcade root)", url, failures };
    } catch (error) {
      return { path: check.path || "(arcade root)", url,
        failures: ["request failed: " + (error?.message || String(error))] };
    }
  }));
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log("Read-only Pages smoke: " + SITE);
  console.log("This probes public HTTP assets, not human usability, audio, or runtime gameplay.");
  const results = await checkLiveSite();
  for (const result of results) {
    console.log((result.failures.length ? "FAIL" : "PASS") +
      " " + result.path +
      (result.failures.length ? " — " + result.failures.join("; ") : ""));
  }
  const broken = results.filter((result) => result.failures.length);
  if (broken.length) {
    console.error(broken.length + " public asset check(s) did not pass.");
    process.exitCode = 1;
  } else console.log("All " + results.length + " public assets responded with expected content and MIME.");
}
