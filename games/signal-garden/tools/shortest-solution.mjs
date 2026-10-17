/**
 * Small-board exact minimum-turn audit for Signal Garden.
 * Author: agent-01 (AI agent).
 *
 * A powered goal implies a simple reciprocal path from source to goal.
 * We enumerate simple paths in least-total-clockwise-turn order, choosing
 * the cheapest orientation for each path tile's incoming and outgoing edges.
 * Therefore the first complete path minimizes actual tile-click count.
 *
 * Exponential worst case: intended for small authored boards, not runtime play.
 */
import { tileConnections } from "../logic.mjs";

const OFFSETS = [[-1, 0], [0, 1], [1, 0], [0, -1]];

function orientationChoice(tile, incoming, outgoing) {
  let best = null;
  for (let orientation = 0; orientation < 4; orientation++) {
    if (tile.locked && orientation !== tile.orientation) continue;
    const connections = tileConnections({ type: tile.type, orientation });
    if (incoming >= 0 && !connections.includes(incoming)) continue;
    if (!connections.includes(outgoing)) continue;
    const turns = (orientation - tile.orientation + 4) % 4;
    if (best === null || turns < best.turns) best = { orientation, turns };
  }
  return best;
}

/**
 * Find a minimum number of clockwise clicks to connect the source to goal.
 * Returns { moves, actions:[{ index, orientation, turns }], path, explored }.
 * Returns null when no valid route is found; throws when exploration cap reached.
 * maxStates is a safety bound against unexpectedly expensive future boards.
 */
export function shortestSolution(board, { maxStates = 100_000 } = {}) {
  const { size, tiles, sourceIndex, goalIndex } = board;
  if (!Number.isInteger(size) || size <= 0 || tiles.length !== size * size
    || !Number.isInteger(sourceIndex) || !Number.isInteger(goalIndex)
    || sourceIndex < 0 || goalIndex < 0 || sourceIndex >= tiles.length
    || goalIndex >= tiles.length || sourceIndex === goalIndex) {
    throw new RangeError("Invalid puzzle board.");
  }
  if (!Number.isInteger(maxStates) || maxStates < 1) {
    throw new RangeError("maxStates must be a positive integer.");
  }

  const initial = {
    index: sourceIndex, incoming: -1, visited: 1n << BigInt(sourceIndex),
    moves: 0, path: [sourceIndex], actions: []
  };
  const queue = [initial];
  const seen = new Map([[stateKey(initial), 0]]);
  let explored = 0;

  while (queue.length) {
    // Small authored grids keep the queue short. Sorting is clear and
    // avoids adding a separate priority-queue dependency.
    queue.sort((a, b) => b.moves - a.moves);
    const node = queue.pop();
    if (node.moves !== seen.get(stateKey(node))) continue;
    if (++explored > maxStates) {
      throw new RangeError(`Puzzle search exceeded ${maxStates} states.`);
    }
    const tile = tiles[node.index];

    if (node.index === goalIndex) {
      const correctEnd = tileConnections(tile).includes(node.incoming);
      if (correctEnd) {
        return {
          moves: node.moves,
          actions: node.actions,
          path: node.path,
          explored
        };
      }
      continue;
    }

    const row = Math.floor(node.index / size);
    const col = node.index % size;
    for (let outgoing = 0; outgoing < 4; outgoing++) {
      const [dr, dc] = OFFSETS[outgoing];
      const nextRow = row + dr, nextCol = col + dc;
      if (nextRow < 0 || nextCol < 0 || nextRow >= size || nextCol >= size) continue;
      const nextIndex = nextRow * size + nextCol;
      const nextBit = 1n << BigInt(nextIndex);
      if (node.visited & nextBit) continue;

      const choice = orientationChoice(tile, node.incoming, outgoing);
      if (!choice) continue;
      const next = {
        index: nextIndex,
        incoming: (outgoing + 2) % 4,
        visited: node.visited | nextBit,
        moves: node.moves + choice.turns,
        path: [...node.path, nextIndex],
        actions: [...node.actions, {
          index: node.index,
          orientation: choice.orientation,
          turns: choice.turns
        }]
      };
      const key = stateKey(next);
      if (seen.has(key) && seen.get(key) <= next.moves) continue;
      seen.set(key, next.moves);
      queue.push(next);
    }
  }
  return null;
}

function stateKey(state) {
  return `${state.index}:${state.incoming}:${state.visited}`;
}

/** Cheapest clockwise rotation cost along the level's *authored* path. */
export function authoredPathMoves(board) {
  if (!Array.isArray(board.pathIndices)) throw new TypeError("Missing authored path.");
  return board.pathIndices.reduce((total, index) => {
    const tile = board.tiles[index];
    if (tile.locked) return total;
    const required = tileConnections({
      type: tile.type,
      orientation: tile.solutionOrientation
    });
    const candidates = [0, 1, 2, 3]
      .filter((orientation) => {
        const actual = tileConnections({ type: tile.type, orientation });
        return actual.length === required.length && actual.every((dir) => required.includes(dir));
      })
      .map((orientation) => (orientation - tile.orientation + 4) % 4);
    if (!candidates.length) throw new Error(`Authored path tile ${index} has no valid orientation.`);
    return total + Math.min(...candidates);
  }, 0);
}
