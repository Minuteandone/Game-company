/**
 * Forked Spectrum — isolated pure-rule experiment, not Prism Relay's shipped rules.
 * Author: agent-02 (AI agent).
 *
 * One white emitter feeds a fixed prism. It splits into cyan (left) and
 * amber (right) beams, which must reach their correspondingly lettered goals.
 */
export const BOARD = Object.freeze([
  ".....A.",
  "...\\./.",
  "..#....",
  "E..P#..",
  "..#....",
  ".../..B",
  "......."
]);

export const DIRECTIONS = Object.freeze([
  [1, 0], [0, 1], [-1, 0], [0, -1]
]);

const LEGAL = new Set([".", "#", "/", "\\", "E", "P", "A", "B"]);
const rotateDirection = (direction, tile) =>
  tile === "/" ? (3 - direction + 4) % 4 :
  tile === "\\" ? (1 - direction + 4) % 4 : direction;

export function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length < 3 || !grid.every(r => typeof r === "string")) {
    throw new Error("Grid needs at least three rows");
  }
  const width = grid[0].length;
  if (width < 3 || !grid.every(r => r.length === width)) {
    throw new Error("Grid must be rectangular, at least three columns wide");
  }
  for (const required of ["E", "P", "A", "B"]) {
    if (grid.reduce((count, r) => count + [...r].filter(x => x === required).length, 0) !== 1) {
      throw new Error("Grid needs exactly one " + required);
    }
  }
  for (const row of grid) for (const cell of row) {
    if (!LEGAL.has(cell)) throw new Error("Unknown cell " + cell);
  }
  return { width, height: grid.length };
}

export function rotateMirror(grid, y, x) {
  const tile = grid[y]?.[x];
  if (tile !== "/" && tile !== "\\") return grid;
  const updated = grid.slice();
  updated[y] = updated[y].slice(0, x) + (tile === "/" ? "\\" : "/") + updated[y].slice(x + 1);
  return updated;
}

function location(grid, target) {
  const y = grid.findIndex(r => r.includes(target));
  return { x: grid[y].indexOf(target), y };
}

/** Walk the white feed until it reaches the splitter or an obstruction. */
function traceFeed(grid) {
  const { width, height } = validateGrid(grid);
  const origin = location(grid, "E");
  let { x, y } = origin, direction = 0;
  const path = [{ x, y }];
  const seen = new Set();
  for (let step = 0; step <= width * height * 4; step++) {
    const state = x + "," + y + "," + direction;
    if (seen.has(state)) return { path, reason: "loop", split: null };
    seen.add(state);
    const [dx, dy] = DIRECTIONS[direction];
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return { path, reason: "edge", split: null };
    }
    const tile = grid[y][x];
    path.push({ x, y });
    if (tile === "P") return { path, reason: "split", split: { x, y, direction } };
    if ("#ABE".includes(tile)) return { path, reason: "blocked", split: null };
    direction = rotateDirection(direction, tile);
  }
  return { path, reason: "loop", split: null };
}

/** Rays pass over one another but do not split a second time. */
function traceRay(grid, start, direction, goal) {
  const { width, height } = { width: grid[0].length, height: grid.length };
  let { x, y } = start;
  const path = [{ x, y }];
  const seen = new Set();
  for (let step = 0; step <= width * height * 4; step++) {
    const state = x + "," + y + "," + direction;
    if (seen.has(state)) return { path, reached: false, reason: "loop" };
    seen.add(state);
    const [dx, dy] = DIRECTIONS[direction];
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return { path, reached: false, reason: "edge" };
    }
    const tile = grid[y][x];
    path.push({ x, y });
    if (tile === goal) return { path, reached: true, reason: "receiver" };
    if ("#EPAB".includes(tile)) {
      return { path, reached: false, reason: "blocked" };
    }
    direction = rotateDirection(direction, tile);
  }
  return { path, reached: false, reason: "loop" };
}

export function traceSpectrum(grid) {
  validateGrid(grid);
  const feed = traceFeed(grid);
  if (!feed.split) {
    return {
      feed, cyan: { path: [], reached: false, reason: "no split" },
      amber: { path: [], reached: false, reason: "no split" }, won: false
    };
  }
  const start = feed.split;
  const cyan = traceRay(grid, start, (start.direction + 3) % 4, "A");
  const amber = traceRay(grid, start, (start.direction + 1) % 4, "B");
  return { feed, cyan, amber, won: cyan.reached && amber.reached };
}

export function findShortestSolution(grid, maxMirrors = 12) {
  validateGrid(grid);
  const mirrors = [];
  grid.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "/" || cell === "\\") mirrors.push({ x, y });
  }));
  if (mirrors.length > maxMirrors) return null;
  let best = null;
  for (let mask = 0; mask < 2 ** mirrors.length; mask++) {
    const moves = [];
    let candidate = grid;
    for (let i = 0; i < mirrors.length; i++) {
      if ((mask & (1 << i)) === 0) continue;
      moves.push(mirrors[i]);
      if (best && moves.length >= best.length) break;
      candidate = rotateMirror(candidate, mirrors[i].y, mirrors[i].x);
    }
    if (best && moves.length >= best.length) continue;
    if (traceSpectrum(candidate).won) best = moves;
  }
  return best;
}
