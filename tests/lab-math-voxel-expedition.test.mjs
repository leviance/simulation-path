import test from "node:test";
import assert from "node:assert/strict";
import { bankData, localIndex, spawn, trace } from "../lib/labs/voxel-expedition/bank.ts";
import {
  meshCounts,
  windAt,
  swayOffset,
  oceanAt,
  flowPhase,
  sunAt,
  planStream,
  pump,
  cloudAt,
} from "../lib/labs/voxel-expedition/field.ts";
test("one connected stream and unambiguous addresses in the teaching slice", () => {
  const cells = bankData("bank");
  assert.equal(cells.length, 4096);
  assert.equal(cells.filter((b) => b !== 0).length, 1526);
  const seen = new Set();
  for (let z = 0; z < 16; z++) {
    let wet = false;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const i = localIndex(x, y, z);
        seen.add(i);
        wet ||= cells[i] === 7;
      }
    assert.ok(wet, "dry row " + z);
  }
  assert.equal(seen.size, 4096);
  assert.throws(() => localIndex(-1, 0, 0));
  const stone = bankData("stone"),
    saved = stone.slice(),
    hit = trace(stone, [7.5, 7.5, 0], [0, 0, 1]);
  assert.equal(hit.block, 3);
  assert.equal(hit.t, 7);
  assert.equal(trace(stone, spawn("stone").eye, [0, 1, 0]), undefined);
  assert.deepEqual(stone, saved);
});
test("visibility and greedy mesh counts come from voxel data", () => {
  assert.deepEqual(meshCounts("solid"), { solid: 4096, naive: 24576, visible: 1536, greedy: 6 });
  assert.deepEqual(meshCounts("empty"), { solid: 0, naive: 0, visible: 0, greedy: 0 });
  const b = meshCounts("bank");
  assert.ok(b.naive > b.visible && b.visible > b.greedy);
});
test("frozen wind, downstream tracer, geometric wave and sun direction", () => {
  assert.equal(swayOffset(0, 3, 6), 0);
  assert.equal(windAt(3, 7, 4, 0, 0), 0);
  assert.notEqual(windAt(3, 7, 4, 0, 1), windAt(6, 7, 4, 0, 1));
  const a = oceanAt(3, -7, 2),
    dx = (oceanAt(3.0001, -7, 2).height - oceanAt(2.9999, -7, 2).height) / 0.0002;
  assert.ok(Math.abs(dx + a.normal[0] / a.normal[1]) < 1e-7);
  assert.ok(Math.abs(flowPhase(1.72, 3) - flowPhase(1, 2)) < 1e-10);
  assert.ok(sunAt(7).x > 0 && sunAt(17).x < 0 && sunAt(12).day > sunAt(0).day);
});
test("reversing cancels pending cells; going home is bounded, clouds are not tied to chunks", () => {
  let s = planStream(undefined, 0, 0);
  for (let j = 0; j < 6; j++) {
    s = pump(s);
    s = planStream(s, 18, 0);
    s = pump(s);
    s = planStream(s, -3, 0);
    s = pump(s, 30);
    s = planStream(s, 0, 0);
    s = pump(s, 30);
  }
  assert.equal(s.wanted.length, 0);
  assert.ok(s.resident.size <= 49);
  for (let z = -2; z <= 2; z++)
    for (let x = -2; x <= 2; x++) assert.ok(s.resident.has(x + "," + z));
  let change = 0;
  for (let x = -40; x <= 40; x++) change += Math.abs(cloudAt(x, 21, 0, 0) - cloudAt(x, 21, 10, 0));
  assert.ok(change > 0.2);
});
