import assert from "node:assert/strict";
import test from "node:test";
import { fieldCommand } from "../lib/labs/voxel-expedition/keys.ts";

test("voxel teaching labs ignore repeat on discrete controls and retain continuous navigation", () => {
  for (const k of [" ", "r", ".", "m"]) assert.equal(fieldCommand(k, true), "handled");
  assert.equal(fieldCommand("R"), "reset");
  assert.equal(fieldCommand(" "), "pause");
  assert.equal(fieldCommand("ArrowRight", true), "arrowright");
  assert.equal(fieldCommand("W", true), "w");
  assert.equal(fieldCommand("Tab"), null);
});
