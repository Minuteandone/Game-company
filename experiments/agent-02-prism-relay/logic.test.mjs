import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGrid, rotateMirror, traceBeam, solvePuzzle } from './logic.mjs';
import { LEVELS } from './levels.mjs';

test('validates tiles and requires one emitter and one target', () => {
  assert.deepEqual(validateGrid(['E.T', '...']), { width: 3, height: 2 });
  assert.throws(() => validateGrid(['E.T', '..']), /same width/);
  assert.throws(() => validateGrid(['E.X', '...']), /Unknown tile/);
  assert.throws(() => validateGrid(['E..', '...']), /exactly one/);
  assert.throws(() => validateGrid(['EET', '...']), /exactly one/);
});

test('beams travel east, reach receivers, and stop at walls or boundaries', () => {
  assert.deepEqual(traceBeam(['E.T', '...']).path, [{x:0,y:0}, {x:1,y:0}, {x:2,y:0}]);
  assert.equal(traceBeam(['E.T', '...']).won, true);
  assert.equal(traceBeam(['E#T', '...']).reason, 'wall');
  assert.equal(traceBeam(['E..', '..T']).reason, 'edge');
});

test('rotation is immutable, reversible, and ignores non-mirrors', () => {
  const initial = ['E/\\T', '....'];
  const after = rotateMirror(initial, 0, 1);
  assert.notEqual(after, initial);
  assert.equal(initial[0], 'E/\\T');
  assert.equal(after[0], 'E\\\\T');
  assert.deepEqual(rotateMirror(after, 0, 1), initial);
  assert.equal(rotateMirror(initial, 1, 0), initial);
  assert.equal(rotateMirror(initial, 99, 99), initial);
});

test('every authored circuit starts unsolved and has the intended shortest solution', () => {
  assert.deepEqual(LEVELS.map(level => solvePuzzle(level.grid).length), [1, 2, 3, 3]);
  for (const level of LEVELS) {
    assert.deepEqual(validateGrid(level.grid), { width: 7, height: 7 });
    assert.equal(traceBeam(level.grid).won, false, level.name);
    let grid = level.grid;
    for (const { x, y } of solvePuzzle(grid)) grid = rotateMirror(grid, y, x);
    const result = traceBeam(grid);
    assert.equal(result.won, true, level.name);
    assert.deepEqual(result.path.at(-1), { x: 6, y: 3 });
  }
});

test('solver supports already-solved boards and a mirror-count guard', () => {
  assert.deepEqual(solvePuzzle(['E.T', '...']), []);
  assert.equal(solvePuzzle(LEVELS[3].grid, 2), null);
});
