import test from "node:test";
import assert from "node:assert/strict";
import { rotateMirror, traceBeam } from "./logic.mjs";
import { LEVELS } from "./levels.mjs";
import { describeLayout, describeMirror, describeBeam, describeRotation } from "./accessibility.mjs";

test("layout names fixed endpoints, walls and keyboard operation", () => {
  const description = describeLayout(LEVELS[0].grid);
  assert.match(description, /Emitter at row 4, column 1/);
  assert.match(description, /Receiver at row 4, column 7/);
  assert.match(description, /Walls at row 2, column 4; row 4, column 4/);
  assert.match(description, /Enter or Space rotates it/);
});

test("mirror descriptions reflect the actual beam and update on rotation", () => {
  const grid = ["E/..", "...T"];
  const initial = traceBeam(grid);
  assert.equal(initial.reason, "edge");
  const before = describeMirror(grid, initial, 1, 0);
  assert.match(before, /slash orientation/);
  assert.match(before, /arrives moving east and reflects north/);
  const turned = rotateMirror(grid, 0, 1);
  const after = describeMirror(turned, traceBeam(turned), 1, 0);
  assert.match(after, /backslash orientation/);
  assert.match(after, /arrives moving east and reflects south/);
  assert.throws(() => describeMirror(grid, initial, 0, 0), /requires a mirror/);
});

test("unreached mirrors are distinguished from current beam mirrors", () => {
  const grid = ["E./T", "....", "..\\."];
  const traced = traceBeam(grid);
  assert.match(describeMirror(grid, traced, 2, 0), /Beam arrives moving east/);
  assert.match(describeMirror(grid, traced, 2, 2), /does not currently reach/);
});

test("beam interruptions report their actual trace endings", () => {
  assert.equal(describeBeam(traceBeam(["E.T", "..."])),
    "The beam reaches the receiver at row 1, column 3.");
  assert.equal(describeBeam(traceBeam(["E#T", "..."])),
    "The beam hits a wall at row 1, column 2.");
  assert.equal(describeBeam(traceBeam(["E..", "..T"])),
    "The beam exits the board after row 1, column 3.");
});

test("every authored circuit has a described layout and a valid beam outcome", () => {
  for (const level of LEVELS) {
    assert.match(describeLayout(level.grid), /Receiver at row 4, column 7/);
    const beam = traceBeam(level.grid);
    assert.ok(describeBeam(beam).length > 20);
    level.grid.forEach((row, y) => [...row].forEach((tile, x) => {
      if (tile === "/" || tile === "\\") {
        assert.match(describeMirror(level.grid, beam, x, y), /Mirror, row \d+, column \d+/);
      }
    }));
  }
});

test("off-beam setup turns are acknowledged without calling them failures", () => {
  const original = LEVELS[0].grid;
  const turned = rotateMirror(original, 5, 2);
  const before = traceBeam(original), after = traceBeam(turned);
  assert.deepEqual(after.path, before.path, "lower mirror is not yet on the initial beam");
  const message = describeRotation(original, turned, 5, 2);
  assert.match(message, /^Row 6, column 3 mirror turned to slash\./);
  assert.match(message, /live beam path is unchanged so far/);
  assert.match(message, /does not yet reach this mirror/);
  assert.match(message, /The beam exits the board after/);
});

test("turns on the beam report a redirect and actual new endpoint", () => {
  const original = LEVELS[0].grid;
  const solved = rotateMirror(original, 3, 2);
  assert.equal(traceBeam(solved).won, true);
  const message = describeRotation(original, solved, 3, 2);
  assert.match(message, /^Row 4, column 3 mirror turned to backslash\./);
  assert.match(message, /beam's route changed/);
  assert.match(message, /receiver at row 4, column 7/);
  assert.doesNotMatch(message, /unchanged so far/);
  assert.throws(() => describeRotation(original, original, 3, 2), /changed mirror tile/);
  assert.throws(() => describeRotation(original, solved, 3, 0), /changed mirror tile/);
});

test("all initial mirror rotations remain valid and turn feedback is truthful", t => {
  let changed = 0, unchanged = 0;
  for (const [index, level] of LEVELS.entries()) {
    const initial = traceBeam(level.grid);
    for (const [y, row] of level.grid.entries()) for (const [x, tile] of [...row].entries()) {
      if (tile !== "/" && tile !== "\\") continue;
      const rotated = rotateMirror(level.grid, y, x);
      const result = traceBeam(rotated);
      const pathEqual = initial.path.length === result.path.length &&
        initial.path.every((point, i) => point.x === result.path[i].x && point.y === result.path[i].y);
      const message = describeRotation(level.grid, rotated, y, x);
      assert.match(message, new RegExp("^Row " + (y + 1) + ", column " + (x + 1) + " mirror turned"));
      if (pathEqual) {
        unchanged++;
        assert.match(message, /unchanged so far/, "initial circuit " + (index + 1));
      } else {
        changed++;
        assert.match(message, /route changed/, "initial circuit " + (index + 1));
      }
      assert.ok(message.endsWith(describeBeam(result)), "actual ending must be stated");
    }
  }
  assert.ok(changed > 0, "there must be some beam-changing initial rotations");
  assert.ok(unchanged > 0, "there must be some off-beam setup rotations");
  t.diagnostic("Across shipped initial circuits, " + changed +
    " mirror turns redirect the live beam; " + unchanged + " leave its visible path unchanged.");
});
