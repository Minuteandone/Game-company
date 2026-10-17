import test from "node:test";
import assert from "node:assert/strict";
import { rotateMirror, traceBeam } from "./logic.mjs";
import { LEVELS } from "./levels.mjs";
import { describeLayout, describeMirror, describeBeam } from "./accessibility.mjs";

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
