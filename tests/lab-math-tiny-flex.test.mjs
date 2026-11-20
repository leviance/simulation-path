import assert from "node:assert/strict";
import test from "node:test";
import { shareLine } from "../lib/labs/tiny-flex-space.ts";

test("the ruler reproduces Project 70's native two-child fixture", () => {
  assert.deepEqual(shareLine(150, 2), { first: 50, second: 90, remainder: 90, overflow: 0 });
  assert.deepEqual(shareLine(60, 2), { first: 20, second: 30, remainder: 0, overflow: 0 });
  assert.deepEqual(shareLine(50, 2), { first: 20, second: 30, remainder: 0, overflow: 10 });
  for (let w = 60; w <= 220; w++)
    for (let g = 0; g <= 3; g++) {
      const { first, second } = shareLine(w, g);
      assert.ok(Math.abs(first + 10 + second - w) < 1e-9);
      assert.ok(Math.abs(second - 30 - g * (first - 20)) < 1e-9);
    }
});
