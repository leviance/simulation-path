import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGpuCsrGrid,
  estimateGpuGridCandidateWork,
  gpuGridBarrierContract,
  gpuGridCandidateRange,
  gpuGridCellAddress,
  gpuGridExclusiveScan,
  gpuGridScanHierarchy,
  injectGpuGridError,
  makeGpuGridPassLabels,
  makeGpuGridPositions,
  makeGpuGridSpec,
  queryGpuBruteForceNeighbors,
  queryGpuCsrNeighbors,
  simulateGpuCellCountArrivals,
  validateGpuCsrGrid,
} from "../lib/labs/gpu-spatial-grid-neighbors.ts";

test("Project 40 maps world bounds to stable row-major cell IDs", () => {
  const spec = makeGpuGridSpec(8);
  assert.deepEqual(gpuGridCellAddress({ x: 0, y: 0 }, spec), { column: 0, row: 0, id: 0 });
  assert.deepEqual(gpuGridCellAddress({ x: 1024, y: 576 }, spec), {
    column: 127,
    row: 71,
    id: 9215,
  });
});

test("count scan and scatter create a complete CSR permutation", () => {
  const spec = makeGpuGridSpec(32);
  const points = makeGpuGridPositions(4097, 40, spec);
  const grid = buildGpuCsrGrid(points, spec);
  assert.equal(
    grid.counts.reduce((sum, value) => sum + value, 0),
    points.length,
  );
  assert.equal(validateGpuCsrGrid(grid, points.length).passed, true);
  assert.deepEqual(gpuGridExclusiveScan([2, 0, 3, 1]), [0, 2, 2, 5]);

  const reversed = buildGpuCsrGrid(points, spec, points.map((_, index) => index).reverse());
  assert.equal(validateGpuCsrGrid(reversed, points.length).passed, true);
  assert.notDeepEqual(reversed.sortedIndices, grid.sortedIndices);
});

test("atomic arrival model preserves every update while read+write loses collisions", () => {
  const spec = makeGpuGridSpec(8, 32, 16);
  const points = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
    { x: 20, y: 3 },
  ];
  const atomic = simulateGpuCellCountArrivals(points, spec, points.length, true, 4);
  const plain = simulateGpuCellCountArrivals(points, spec, points.length, false, 4);
  assert.equal(
    atomic.reduce((total, count) => total + count, 0),
    4,
  );
  assert.equal(
    plain.reduce((total, count) => total + count, 0),
    2,
  );
});

test("candidate range grows beyond 3x3 and exact query matches brute force", () => {
  const spec = makeGpuGridSpec(8);
  const range = gpuGridCandidateRange({ x: 96, y: 96 }, 10, spec);
  assert.equal(range.visitedCellCount, 16);
  const points = [
    { x: 10, y: 10 },
    { x: 13, y: 14 },
    { x: 7, y: 6 },
    { x: 14.9, y: 14.9 },
  ];
  const grid = buildGpuCsrGrid(points, spec);
  const actual = queryGpuCsrNeighbors(points, grid, 0, 5);
  const expected = queryGpuBruteForceNeighbors(points, 0, 5);
  assert.equal(actual.neighborCount, 2);
  assert.equal(actual.nearestIndex, 1);
  assert.deepEqual(actual, expected);
});

test("named invariants identify count offset and scatter failures", () => {
  const spec = makeGpuGridSpec(16);
  const points = makeGpuGridPositions(1024, 8, spec);
  const grid = buildGpuCsrGrid(points, spec);
  assert.equal(
    validateGpuCsrGrid(injectGpuGridError(grid, "lost-count"), points.length).countsTotalMatches,
    false,
  );
  assert.equal(
    validateGpuCsrGrid(injectGpuGridError(grid, "wrong-offset"), points.length).passed,
    false,
  );
  assert.equal(
    validateGpuCsrGrid(injectGpuGridError(grid, "duplicate-index"), points.length)
      .particlePermutation,
    false,
  );
});

test("pass graph and barrier contract remain finite and explicit", () => {
  assert.deepEqual(gpuGridScanHierarchy(9216), [
    { inputCount: 9216, blockCount: 18 },
    { inputCount: 18, blockCount: 1 },
  ]);
  assert.equal(makeGpuGridPassLabels(9216).length, 8);
  assert.equal(gpuGridBarrierContract("compute", "shader-storage").passed, true);
  assert.equal(gpuGridBarrierContract("readback", "shader-storage").expected, "buffer-update");
});

test("candidate-work budget rejects a dangerous count radius combination", () => {
  const safe = estimateGpuGridCandidateWork(262_147, makeGpuGridSpec(8), 6);
  const dangerous = estimateGpuGridCandidateWork(1_000_003, makeGpuGridSpec(4), 48);
  assert.equal(safe.withinBudget, true);
  assert.equal(dangerous.withinBudget, false);
  assert.ok(dangerous.estimatedCandidateVisits > 1_000_000_000);
});
