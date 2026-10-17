/** Pure, browser-independent rules for Prism Relay. Attribution: agent-02 (AI agent). */
export const VECTORS = Object.freeze([[1, 0], [0, 1], [-1, 0], [0, -1]]);
const TILES = new Set(['.', '#', '/', '\\', 'E', 'T']);

export function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length < 2 || !grid.every(row => typeof row === 'string')) {
    throw new Error('A level needs at least two rows of tiles.');
  }
  const width = grid[0].length;
  if (width < 2 || !grid.every(row => row.length === width)) {
    throw new Error('Every row must have the same width of at least two.');
  }
  let emitters = 0;
  let targets = 0;
  for (const row of grid) for (const tile of row) {
    if (!TILES.has(tile)) throw new Error('Unknown tile: ' + tile);
    if (tile === 'E') emitters++;
    if (tile === 'T') targets++;
  }
  if (emitters !== 1 || targets !== 1) {
    throw new Error('Each level must contain exactly one emitter and one target.');
  }
  return { width, height: grid.length };
}

export function rotateMirror(grid, row, col) {
  const tile = grid[row]?.[col];
  if (tile !== '/' && tile !== '\\') return grid;
  const updated = grid.slice();
  updated[row] = grid[row].slice(0, col) + (tile === '/' ? '\\' : '/') + grid[row].slice(col + 1);
  return updated;
}

export function traceBeam(grid) {
  const { width, height } = validateGrid(grid);
  const emitterRow = grid.findIndex(row => row.includes('E'));
  let x = grid[emitterRow].indexOf('E');
  let y = emitterRow;
  let direction = 0;
  const path = [{ x, y }];
  const visited = new Set();
  for (let step = 0; step <= width * height * 4; step++) {
    const state = [x, y, direction].join(',');
    if (visited.has(state)) return { won: false, reason: 'loop', path };
    visited.add(state);
    const [dx, dy] = VECTORS[direction];
    x += dx;
    y += dy;
    if (x < 0 || y < 0 || x >= width || y >= height) return { won: false, reason: 'edge', path };
    const tile = grid[y][x];
    path.push({ x, y });
    if (tile === '#') return { won: false, reason: 'wall', path };
    if (tile === 'T') return { won: true, reason: 'target', path };
    if (tile === 'E') return { won: false, reason: 'emitter', path };
    if (tile === '/') direction = (3 - direction + 4) % 4;
    if (tile === '\\') direction = (1 - direction + 4) % 4;
  }
  return { won: false, reason: 'loop', path };
}

export function solvePuzzle(grid, maxMirrors = 14) {
  validateGrid(grid);
  const mirrors = [];
  grid.forEach((row, y) => [...row].forEach((tile, x) => {
    if (tile === '/' || tile === '\\') mirrors.push({ x, y });
  }));
  if (mirrors.length > maxMirrors) return null;
  let best = null;
  const combinations = 2 ** mirrors.length;
  for (let mask = 0; mask < combinations; mask++) {
    const moves = [];
    let candidate = grid;
    for (let index = 0; index < mirrors.length; index++) {
      if ((mask & (1 << index)) === 0) continue;
      const { x, y } = mirrors[index];
      moves.push({ x, y });
      if (best && moves.length >= best.length) break;
      candidate = rotateMirror(candidate, y, x);
    }
    if (best && moves.length >= best.length) continue;
    if (traceBeam(candidate).won) best = moves;
    if (best?.length === 0) break;
  }
  return best;
}
