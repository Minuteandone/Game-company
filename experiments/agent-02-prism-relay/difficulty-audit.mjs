/**
 * Exhaustive authored-puzzle audit for Prism Relay.
 * Attribution: agent-02 (AI agent). This is design telemetry about game rules,
 * not any human playtest data.
 *
 * Run: node experiments/agent-02-prism-relay/difficulty-audit.mjs
 */
import { pathToFileURL } from "node:url";
import { traceBeam, rotateMirror, solvePuzzle, validateGrid } from "./logic.mjs";
import { LEVELS } from "./levels.mjs";

function signature(path) {
  return path.map(p => p.x + "," + p.y).join("|");
}
function countBits(value) {
  let count = 0;
  while (value) { value &= value - 1; count++; }
  return count;
}

export function auditGrid(grid, mirrorLimit = 15) {
  const { width, height } = validateGrid(grid);
  const mirrors = [];
  grid.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === "/" || tile === "\\") mirrors.push({ x, y });
  }));
  if (mirrors.length > mirrorLimit) {
    throw new Error("Audit mirror limit exceeded; exhaustive search is intentionally bounded.");
  }

  const initial = traceBeam(grid);
  const initialTiles = new Set(initial.path.map(p => p.x + "," + p.y));
  let alteredByOneFlip = 0;
  let singleFlipWins = 0;
  for (const { x, y } of mirrors) {
    const changed = traceBeam(rotateMirror(grid, y, x));
    if (signature(changed.path) !== signature(initial.path)) alteredByOneFlip++;
    if (changed.won) singleFlipWins++;
  }

  const total = 2 ** mirrors.length;
  let winning = 0;
  let best = Infinity;
  let optimalCount = 0;
  const paths = new Set();
  const endings = new Set();

  for (let mask = 0; mask < total; mask++) {
    let candidate = grid;
    mirrors.forEach(({ x, y }, i) => {
      if (mask & (1 << i)) candidate = rotateMirror(candidate, y, x);
    });
    const traced = traceBeam(candidate);
    paths.add(signature(traced.path));
    endings.add(traced.reason);
    if (!traced.won) continue;

    winning++;
    const moves = countBits(mask);
    if (moves < best) { best = moves; optimalCount = 1; }
    else if (moves === best) optimalCount++;
  }

  // Independent consistency check against the shipped shortest-solution solver.
  const solver = solvePuzzle(grid, mirrorLimit);
  if ((solver?.length ?? Infinity) !== best) {
    throw new Error("Audit and puzzle solver disagree about the shortest route.");
  }
  return {
    width, height,
    mirrors: mirrors.length,
    initialBeamTiles: initial.path.length,
    initialMirrorsOnBeam: mirrors.filter(({ x, y }) => initialTiles.has(x + "," + y)).length,
    mirrorsChangingBeamFromOneFlip: alteredByOneFlip,
    oneFlipWins: singleFlipWins,
    winningConfigurations: winning,
    totalConfigurations: total,
    minimumRotations: Number.isFinite(best) ? best : null,
    shortestSolutionCount: optimalCount,
    distinctTracedPaths: paths.size,
    possibleEndings: [...endings].sort()
  };
}

export function auditAll(levels = LEVELS) {
  return levels.map((level, index) => ({
    circuit: index + 1,
    title: level.name,
    ...auditGrid(level.grid)
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = auditAll();
  console.table(results.map(({ circuit, title, mirrors, minimumRotations, shortestSolutionCount,
    winningConfigurations, totalConfigurations, distinctTracedPaths }) => ({
    circuit, title, mirrors, minimumRotations, shortestSolutionCount,
    winningConfigurations, totalConfigurations, distinctTracedPaths
  })));
  console.log("\nFull machine-readable audit:");
  console.log(JSON.stringify(results, null, 2));
}
