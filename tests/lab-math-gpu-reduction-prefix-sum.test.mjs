import assert from "node:assert/strict";
import test from "node:test";
import {
  BLOCK_SPAN,
  barrierMessage,
  blellochStages,
  cpuExclusiveScan,
  cpuInclusiveScan,
  cpuReduction,
  makeDeterministicInput,
  makeHierarchy,
  makePassLabels,
  scanDispatchCount,
  validateExclusiveScan,
  validateReduction,
  workgroupReductionStages,
} from "../lib/labs/gpu-reduction-prefix-sum.ts";

test("Project 39 CPU oracles distinguish reduction and exclusive scan", () => {
  const input = [3, 1, 4, 2];
  assert.equal(cpuReduction(input), 10);
  assert.deepEqual(cpuExclusiveScan(input), [0, 3, 4, 8]);
  assert.deepEqual(cpuInclusiveScan(input), [3, 4, 8, 10]);
});

test("hierarchy covers a non-power-of-two tail without an unbounded loop", () => {
  const levels = makeHierarchy(1_000_003);
  assert.deepEqual(
    levels.map((level) => level.blockCount),
    [1954, 4, 1],
  );
  assert.equal(levels[0].zeroPadding, 445);
  assert.equal(levels[0].launchedValues, 1_000_448);
  assert.equal(scanDispatchCount(1_000_003), 5);
  assert.equal(BLOCK_SPAN, 512);
  assert.deepEqual(
    makeHierarchy(1_000_003, 256).map((level) => level.blockCount),
    [3907, 16, 1],
  );
});

test("workgroup reduction and Blelloch stages reach the expected outputs", () => {
  const input = [3, 1, 4, 2, 5, 0, 2, 1];
  const reductionStages = workgroupReductionStages(input);
  assert.equal(reductionStages.at(-1).values[0], 18);
  const staleStages = workgroupReductionStages(input, false);
  assert.notEqual(staleStages.at(-1).values[0], 18);
  const scanStages = blellochStages(input);
  assert.deepEqual(scanStages.at(-1).values, [0, 3, 4, 8, 10, 15, 15, 17]);
  assert.ok(scanStages.some((stage) => stage.phase === "root-zero"));
});

test("deterministic input and validation reports expose the first failure", () => {
  const first = makeDeterministicInput(1024, 39);
  const second = makeDeterministicInput(1024, 39);
  const other = makeDeterministicInput(1024, 40);
  assert.deepEqual(first, second);
  assert.notEqual(first[777], other[777]);

  const scan = cpuExclusiveScan(first);
  assert.equal(validateExclusiveScan(first, scan).passed, true);
  scan[17] += 0.1;
  const wrong = validateExclusiveScan(first, scan);
  assert.equal(wrong.passed, false);
  assert.equal(wrong.firstMismatch, 17);
  assert.ok(wrong.maximumAbsoluteError > 0.09);
  assert.equal(validateReduction(first, cpuReduction(first)).passed, true);
});

test("pass labels and barrier contracts name the whole GPU graph", () => {
  assert.equal(makePassLabels("reduction", 1_000_003).length, 3);
  assert.equal(makePassLabels("exclusive-scan", 1_000_003).length, 5);
  assert.equal(makePassLabels("inclusive-scan", 1_000_003).length, 5);
  assert.equal(makePassLabels("reduction", 1_000_003, 256).length, 3);
  assert.equal(barrierMessage("compute-pass", "compute-pass", "shader-storage").passed, true);
  assert.equal(
    barrierMessage("final-compute", "readback", "shader-storage").expected,
    "buffer-update",
  );
});
