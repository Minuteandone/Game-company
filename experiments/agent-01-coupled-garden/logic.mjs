/**
 * Coupled Garden — isolated group-rotation mechanics lab.
 * Author: agent-01 (AI agent), 2026-10-17.
 *
 * A single move rotates EVERY unlocked connector in one row or column.
 * Unlike Signal Garden, individual pipe clicks do not rotate anything.
 * Pure, deterministic rules. Directions: N=0, E=1, S=2, W=3.
 */
export const SIZE = 4;
const SHAPES = [
  "source", "elbow", "straight", "tee",
  "tee", "straight", "elbow", "straight",
  "elbow", "elbow", "straight", "elbow",
  "straight", "straight", "tee", "goal"
];
const ORIENTATIONS = [
  1, 2, 1, 0,
  0, 0, 2, 1,
  3, 0, 1, 2,
  2, 0, 0, 0
];
const BASE = Object.freeze({
  source: [0], goal: [0], straight: [0, 2],
  elbow: [0, 1], tee: [0, 1, 3]
});
const ROW_OFFSET = [-1, 0, 1, 0];
const COL_OFFSET = [0, 1, 0, -1];

export const SOLVED = Object.freeze(SHAPES.map((type, index) => Object.freeze({
  type, orientation: ORIENTATIONS[index],
  locked: type === "source" || type === "goal"
})));

export function tileConnections(tile) {
  if (!Object.hasOwn(BASE, tile?.type)) throw new TypeError("Unknown connector type");
  if (!Number.isInteger(tile.orientation) || tile.orientation < 0 || tile.orientation > 3)
    throw new RangeError("Invalid orientation");
  return BASE[tile.type].map(dir => (dir + tile.orientation) % 4);
}

/** Return a new board; never change the caller's tiles or fixed endpoints. */
export function turnGroup(tiles, axis, group, times = 1) {
  if (!Array.isArray(tiles) || tiles.length !== SIZE * SIZE)
    throw new RangeError("Expected sixteen tiles");
  if (!["row", "column"].includes(axis) ||
    !Number.isInteger(group) || group < 0 || group >= SIZE ||
    !Number.isInteger(times) || times < 0 || times > 3)
    throw new RangeError("Invalid row/column turn");
  return tiles.map((tile, index) => {
    const row = Math.floor(index / SIZE), col = index % SIZE;
    const matches = axis === "row" ? row === group : col === group;
    return !tile.locked && matches
      ? { ...tile, orientation: (tile.orientation + times) % 4 }
      : tile;
  });
}

/** A deliberately scrambled *known-solvable* board. */
export function createStart() {
  let tiles = [...SOLVED];
  // Undo four group turns, then let the player discover the coupled controls.
  for (const [axis, group] of [
    ["row", 0], ["row", 2], ["column", 1], ["column", 3]
  ]) tiles = turnGroup(tiles, axis, group, 3);
  return tiles;
}

/** Breadth-first power flow along reciprocal matching connectors. */
export function tracePower(tiles) {
  if (!Array.isArray(tiles) || tiles.length !== SIZE * SIZE)
    throw new RangeError("Expected sixteen tiles");
  const source = tiles.findIndex(t => t.type === "source");
  const goal = tiles.findIndex(t => t.type === "goal");
  if (source < 0 || goal < 0) throw new Error("Missing source or goal");
  const powered = new Set([source]), queue = [source];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const row = Math.floor(index / SIZE), col = index % SIZE;
    for (const dir of tileConnections(tiles[index])) {
      const nr = row + ROW_OFFSET[dir], nc = col + COL_OFFSET[dir];
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const next = nr * SIZE + nc;
      if (!tileConnections(tiles[next]).includes((dir + 2) % 4)) continue;
      if (!powered.has(next)) { powered.add(next); queue.push(next); }
    }
  }
  return { powered, won: powered.has(goal) };
}

/** Exhaustive shortest-path audit for this tiny experimental board only. */
export function shortestSolution(start = createStart(), maxDepth = 6) {
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 9)
    throw new RangeError("Invalid bounded search depth");
  const key = state => state.map(t => t.orientation).join("");
  const queue = [[start, []]], visited = new Set([key(start)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [board, moves] = queue[cursor];
    if (tracePower(board).won) return moves;
    if (moves.length >= maxDepth) continue;
    for (const axis of ["row", "column"]) for (let group = 0; group < SIZE; group++) {
      const next = turnGroup(board, axis, group);
      const stateKey = key(next);
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);
      queue.push([next, [...moves, { axis, group }]]);
    }
  }
  return null;
}
