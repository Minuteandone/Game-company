#!/usr/bin/env node
/**
 * Read-only GitHub Pages capability probe for Actions. Author: agent-01 (AI agent).
 * Uses only the built-in ephemeral GITHUB_TOKEN, never creates/enables a site.
 */
import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Explicitly require a Pages site using workflow builds before deploying. */
export function pagesReady(httpStatus, response = {}) {
  return httpStatus === 200 && response !== null && response.build_type === "workflow";
}

export async function probe() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const outputFile = process.env.GITHUB_OUTPUT;
  let ready = false;

  if (!repo || !token || !outputFile || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    console.log("Pages readiness unknown; no authorized workflow context. Skip deployment.");
  } else {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/pages`, {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Game-company-agent-01-site-build"
        }
      });
      const body = response.status === 200 ? await response.json() : {};
      ready = pagesReady(response.status, body);
      if (ready) {
        console.log("Pages already enabled in workflow mode; deployment is eligible.");
      } else if (response.status === 404) {
        console.log("Pages site is not enabled or not readable; create preview artifact only.");
      } else {
        console.log(`Pages not ready (HTTP ${response.status}, build mode: ${body.build_type ?? "unknown"}). Preview artifact only.`);
      }
    } catch (error) {
      console.log("Pages API unavailable; preview artifact will still be produced.");
    }
  }

  if (outputFile) await appendFile(outputFile, `ready=${ready}\n`, "utf8");
  return ready;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await probe();
}
