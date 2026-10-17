/**
 * Signal Garden — deterministic, dependency-free puzzle rules.
 * Author: agent-01 (AI agent). Directions: N=0, E=1, S=2, W=3.
 */
export const LEVELS = Object.freeze([
  { name: "First Light", size: 4, route: "00 01 11 21 22 23 33" },
  { name: "The Detour", size: 5, route: "00 10 20 21 11 12 13 23 33 34 44" },
  { name: "Skyward", size: 5, route: "40 30 31 21 11 12 22 23 13 03 04" },
  { name: "Roundabout", size: 6, route: "00 01 02 12 13 23 33 32 42 43 44 54 55" },
  { name: "Wild Vines", size: 6, route: "50 40 41 31 21 22 12 13 03 04 14 24 34 35 45 55" },
  { name: "Night Bloom", size: 7, route: "00 10 11 21 31 32 33 23 13 14 24 34 44 45 55 56 66" }
]);

const OFFSETS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const BASE_CONNECTIONS = {
  source: [0],
  goal: [0],
  straight: [0, 2],
  elbow: [0, 1],
  tee: [0, 1, 3]
};

function hash(n) {
  let x = Math.imul(n + 17, 0x9e3779b1);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return x >>> 0;
}

export function tileConnections(tile) {
  const base = BASE_CONNECTIONS[tile.type];
  if (!base) throw new Error(`Unknown tile type: ${tile.type}`);
  return base.map((direction) => (direction + tile.orientation) % 4);
}

function directionBetween(a, b) {
  const dr = b[0] - a[0], dc = b[1] - a[1];
  const index = OFFSETS.findIndex(([r, c]) => r === dr && c === dc);
  if (index < 0) throw new Error("A route contains non-adjacent steps.");
  return index;
}

function sameDirections(a, b) {
  return a.length === b.length && a.every((direction) => b.includes(direction));
}

function solvedOrientation(type, requiredDirections) {
  for (let orientation = 0; orientation < 4; orientation++) {
    if (sameDirections(tileConnections({ type, orientation }), requiredDirections)) {
      return orientation;
    }
  }
  throw new Error("Route tile cannot match the required directions.");
}

/** Construct a board from a known-solvable path, plus harmless deterministic decoys. */
export function createBoard(levelIndex) {
  const level = LEVELS[levelIndex];
  if (!level) throw new RangeError("Unknown garden level.");
  const { size } = level;
  const route = level.route.split(" ").map((step) => [+step[0], +step[1]]);
  const pathIndices = route.map(([row, col]) => row * size + col);
  if (new Set(pathIndices).size !== pathIndices.length) throw new Error("Route repeats a cell.");

  const tiles = Array.from({ length: size * size }, (_, index) => {
    const n = hash(index + levelIndex * 103);
    return {
      type: ["straight", "elbow", "tee"][n % 3],
      orientation: (n >>> 5) % 4,
      locked: false,
      onRoute: false
    };
  });

  route.forEach((current, step) => {
    const index = pathIndices[step];
    const isSource = step === 0;
    const isGoal = step === route.length - 1;
    const required = isSource
      ? [directionBetween(current, route[step + 1])]
      : isGoal
        ? [directionBetween(current, route[step - 1])]
        : [directionBetween(current, route[step - 1]), directionBetween(current, route[step + 1])];
    const type = isSource ? "source" : isGoal ? "goal"
      : (required[0] + 2) % 4 === required[1] ? "straight" : "elbow";
    const solutionOrientation = solvedOrientation(type, required);
    const offset = type === "straight" ? 1 : 1 + (hash(index + levelIndex * 97) % 3);
    tiles[index] = {
      type,
      orientation: isSource || isGoal ? solutionOrientation : (solutionOrientation + offset) % 4,
      solutionOrientation,
      locked: isSource || isGoal,
      onRoute: true
    };
  });

  return {
    size,
    tiles,
    pathIndices,
    sourceIndex: pathIndices[0],
    goalIndex: pathIndices[pathIndices.length - 1]
  };
}

/** Returns a new tile array; locked source and goal never rotate. */
export function rotateTile(tiles, index) {
  if (!Number.isInteger(index) || index < 0 || index >= tiles.length || tiles[index].locked) {
    return tiles;
  }
  return tiles.map((tile, at) => at === index
    ? { ...tile, orientation: (tile.orientation + 1) % 4 }
    : tile);
}

/** Trace reciprocal connections outward from the source, with no diagonal flow. */
export function tracePower(tiles, size) {
  if (tiles.length !== size * size) throw new RangeError("Invalid board dimensions.");
  const sourceIndex = tiles.findIndex((tile) => tile.type === "source");
  const goalIndex = tiles.findIndex((tile) => tile.type === "goal");
  if (sourceIndex < 0 || goalIndex < 0) throw new Error("Board needs a source and a goal.");

  const powered = new Set([sourceIndex]);
  const queue = [sourceIndex];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const row = Math.floor(index / size), col = index % size;
    for (const direction of tileConnections(tiles[index])) {
      const [dr, dc] = OFFSETS[direction];
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const neighbor = nr * size + nc;
      if (!tileConnections(tiles[neighbor]).includes((direction + 2) % 4)) continue;
      if (!powered.has(neighbor)) {
        powered.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return { powered, goalReached: powered.has(goalIndex) };
}

export function isRouteTileCorrect(tile) {
  if (!tile.onRoute || tile.locked) return true;
  return sameDirections(
    tileConnections(tile),
    tileConnections({ ...tile, orientation: tile.solutionOrientation })
  );
}

/** Select a still-misaligned route tile without revealing the whole solution. */
export function hintIndex(board) {
  return board.pathIndices.find((index) => !isRouteTileCorrect(board.tiles[index])) ?? -1;
}
