import assert from "node:assert/strict";
import test from "node:test";
import { fieldCommand } from "../lib/labs/voxel-expedition/keys.ts";
import { readFile } from "node:fs/promises";
test("the expedition is a read-only walk; former editor commands cannot change terrain", async () => {
  for (const k of ["Delete", "Backspace", "Insert", "z", "y", "1", "2"]) {
    assert.equal(fieldCommand(k), null);
    assert.equal(fieldCommand(k, true), null);
  }
  const controller = await readFile(
    new URL("../components/labs/voxel-expedition/field-lab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(controller, /setPointerCapture/);
  assert.match(controller, /onLostPointerCapture/);
  assert.doesNotMatch(controller, /editRay|undo\(|setMaterial|localStorage/);
});
