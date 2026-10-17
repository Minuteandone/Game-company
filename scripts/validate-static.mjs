#!/usr/bin/env node
/**
 * Dependency-free repository smoke checks.
 * Authored by agent-03 (AI agent).
 *
 * Validates local references from:
 * - HTML src/href attributes
 * - CSS url(...)
 * - JavaScript static imports/exports and literal dynamic imports
 *
 * External/data/anchor references are intentionally ignored.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([".git", "node_modules"]);
const sourceFiles = [];

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (/\.(?:html?|css|m?js)$/i.test(entry.name)) sourceFiles.push(absolute);
  }
}

function isExternal(reference) {
  return (
    !reference ||
    reference.startsWith("#") ||
    reference.startsWith("//") ||
    /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(reference)
  );
}

function cleanReference(reference) {
  return reference.split("#", 1)[0].split("?", 1)[0].trim();
}

function localTarget(fromFile, reference) {
  const cleaned = cleanReference(reference);
  if (!cleaned || isExternal(cleaned)) return null;

  if (cleaned.startsWith("/")) {
    return path.resolve(ROOT, "." + cleaned);
  }
  return path.resolve(path.dirname(fromFile), cleaned);
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function referencesFor(file, content) {
  const ext = path.extname(file).toLowerCase();
  const refs = [];

  if (ext === ".html" || ext === ".htm") {
    const attribute = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
    for (const match of content.matchAll(attribute)) {
      refs.push({ kind: "HTML reference", value: match[2] });
    }
  }

  if (ext === ".css" || ext === ".html" || ext === ".htm") {
    const cssUrl = /url\(\s*(?:(["'])(.*?)\1|([^\s)"']+))\s*\)/gi;
    for (const match of content.matchAll(cssUrl)) {
      refs.push({ kind: "CSS url()", value: match[2] ?? match[3] });
    }
  }

  if (ext === ".js" || ext === ".mjs") {
    const staticImport = /\b(?:import|export)\s+(?:[^"'\n]*?\s+from\s+)?(["'])(.*?)\1/g;
    for (const match of content.matchAll(staticImport)) {
      refs.push({ kind: "module reference", value: match[2] });
    }

    const dynamicImport = /\bimport\(\s*(["'])(.*?)\1\s*\)/g;
    for (const match of content.matchAll(dynamicImport)) {
      refs.push({ kind: "dynamic import", value: match[2] });
    }
  }

  return refs;
}

await walk(ROOT);

let checked = 0;
const failures = [];

for (const file of sourceFiles.sort()) {
  const content = await fs.readFile(file, "utf8");
  for (const ref of referencesFor(file, content)) {
    const target = localTarget(file, ref.value);
    if (!target) continue;

    // Bare package imports such as "node:fs" or "some-package" are not
    // repository file references. Only relative and root-relative module
    // paths should be checked.
    if (
      (path.extname(file) === ".js" || path.extname(file) === ".mjs") &&
      !ref.value.startsWith(".") &&
      !ref.value.startsWith("/")
    ) {
      continue;
    }

    checked += 1;
    if (!(await exists(target))) {
      failures.push({
        file: path.relative(ROOT, file),
        kind: ref.kind,
        reference: ref.value,
        target: path.relative(ROOT, target)
      });
    }
  }
}

if (failures.length) {
  console.error("\nBroken local references found:\n");
  for (const failure of failures) {
    console.error(
      `- ${failure.file}: ${failure.kind} "${failure.reference}" -> ${failure.target}`
    );
  }
  console.error(`\nValidation failed with ${failures.length} broken reference(s).`);
  process.exit(1);
}

console.log(
  `Static reference validation passed: ${sourceFiles.length} source file(s), ${checked} local reference(s) checked.`
);
