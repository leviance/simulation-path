import assert from "node:assert/strict";
import test from "node:test";
import {
  makeParticleCloud,
  makeParticleProbeQueries,
} from "../lib/labs/brute-force-particle-query.ts";
import {
  buildSpatialGrid,
  canonicalSpatialGridHits,
  createSpatialGridQueryWorkspace,
  makeSpatialGridCellSizeStudy,
  queryNeighborsBruteForce,
  querySpatialGrid,
  runBruteForceNeighborBatch,
  runSpatialGridQueryBatch,
  spatialGridAddress,
  spatialGridDimensions,
  spatialGridQueryCellRange,
  spatialGridResultMatchesBruteForce,
} from "../lib/labs/spatial-grid.ts";

const bounds = { minimum: { x: 0, y: 0 }, maximum: { x: 1, y: 1 } };

test("Spatial Grid maps inclusive bounds to stable row-major cells", () => {
  const config = { bounds, cellSize: 0.25 };
  const dimensions = spatialGridDimensions(config);
  assert.deepEqual(dimensions, { columns: 4, rows: 4 });
  assert.deepEqual(spatialGridAddress({ x: 0, y: 0 }, config, 4, 4), {
    column: 0,
    row: 0,
    index: 0,
  });
  assert.deepEqual(spatialGridAddress({ x: 1, y: 1 }, config, 4, 4), {
    column: 3,
    row: 3,
    index: 15,
  });
  assert.equal(spatialGridAddress({ x: 1.01, y: 0.5 }, config, 4, 4), null);
});

test("Spatial Grid rejects a cell size that would create an unsafe bucket count", () => {
  const dimensions = spatialGridDimensions({ bounds, cellSize: 1e-12 });
  assert.deepEqual(dimensions, { columns: 0, rows: 0 });
  const grid = buildSpatialGrid([], { bounds, cellSize: 1e-12 });
  assert.equal(grid.buckets.length, 0);
});

test("Grid rebuild inserts every valid particle exactly once", () => {
  const particles = makeParticleCloud(10_000, bounds, 0x280028);
  const grid = buildSpatialGrid(particles, { bounds, cellSize: 0.05 });
  const flattened = grid.buckets.flat();
  assert.equal(grid.columns, 20);
  assert.equal(grid.rows, 20);
  assert.equal(grid.insertedCount, particles.length);
  assert.equal(flattened.length, particles.length);
  assert.equal(new Set(flattened).size, particles.length);
  assert.ok(grid.nonEmptyCells > 0);
  assert.ok(grid.maximumBucketSize > 0);
  assert.ok(Number.isFinite(grid.rebuildMilliseconds));
});

test("Candidate rectangle is conservative while the circle test stays exact", () => {
  const particles = [
    { x: 0.5, y: 0.5 },
    { x: 0.6, y: 0.5 },
    { x: 0.6, y: 0.6 },
    { x: 0.9, y: 0.9 },
  ];
  const grid = buildSpatialGrid(particles, { bounds, cellSize: 0.25 });
  const query = { center: { x: 0.5, y: 0.5 }, radius: 0.1 };
  const range = spatialGridQueryCellRange(grid, query);
  assert.deepEqual(range, {
    minimumColumn: 1,
    maximumColumn: 2,
    minimumRow: 1,
    maximumRow: 2,
  });

  const result = querySpatialGrid(grid, particles, query);
  assert.deepEqual(canonicalSpatialGridHits(result.hitIndices), [0, 1]);
  assert.ok(result.candidatesChecked > result.hitIndices.length);
  assert.equal(result.nearestIndex, 0);
});

test("Spatial Grid matches the brute-force oracle on deterministic queries", () => {
  const particles = makeParticleCloud(25_000, bounds, 0x12345678);
  const queries = makeParticleProbeQueries(32, bounds, 0.08, 0x87654321);
  const grid = buildSpatialGrid(particles, { bounds, cellSize: 0.05 });
  for (const query of queries) {
    const gridResult = querySpatialGrid(grid, particles, query);
    const bruteForceResult = queryNeighborsBruteForce(particles, query);
    assert.equal(spatialGridResultMatchesBruteForce(gridResult, bruteForceResult), true);
    assert.ok(gridResult.candidatesChecked <= particles.length);
  }
});

test("Grid query clamps edge ranges and never visits one cell twice", () => {
  const particles = makeParticleCloud(5_000, bounds, 0xc001d00d);
  const grid = buildSpatialGrid(particles, { bounds, cellSize: 0.1 });
  const edgeQuery = { center: { x: 0, y: 0 }, radius: 0.2 };
  const result = querySpatialGrid(grid, particles, edgeQuery);
  assert.equal(result.visitedCells, 9);
  assert.equal(new Set(result.hitIndices).size, result.hitIndices.length);
  assert.equal(
    spatialGridResultMatchesBruteForce(result, queryNeighborsBruteForce(particles, edgeQuery)),
    true,
  );
});

test("Batch metrics are deterministic and count candidates instead of all particles", () => {
  const particles = makeParticleCloud(100_000, bounds, 0x00c0ffee);
  const queries = makeParticleProbeQueries(12, bounds, 0.06, 0x280028);
  const grid = buildSpatialGrid(particles, { bounds, cellSize: 0.05 });
  const workspace = createSpatialGridQueryWorkspace();
  const first = runSpatialGridQueryBatch(grid, particles, queries, 2, workspace);
  const second = runSpatialGridQueryBatch(grid, particles, queries, 2, workspace);
  const bruteForce = runBruteForceNeighborBatch(particles, queries, 2);
  assert.deepEqual(first, second);
  assert.equal(first.queryCount, 24);
  assert.equal(first.totalScanned, first.totalCandidates);
  assert.ok(first.totalCandidates < particles.length * first.queryCount);
  assert.ok(first.totalVisitedCells > 0);
  assert.equal(first.checksum, bruteForce.checksum);
});

test("Cell-size study exposes the cell-versus-candidate trade-off", () => {
  const particles = makeParticleCloud(50_000, bounds, 0x00c0ffee);
  const queries = makeParticleProbeQueries(8, bounds, 0.08, 0x280028);
  const rows = makeSpatialGridCellSizeStudy(particles, bounds, queries, [0.025, 0.05, 0.1, 0.2], 1);
  assert.equal(rows.length, 4);
  assert.ok(rows[0].totalVisitedCells > rows[3].totalVisitedCells);
  assert.ok(rows[0].totalCandidates < rows[3].totalCandidates);
  for (const row of rows) {
    assert.equal(row.queryCount, queries.length);
    assert.ok(row.totalCandidates < particles.length * queries.length);
    assert.ok(row.maximumBucketSize > 0);
    assert.ok(Number.isFinite(row.rebuildMilliseconds));
  }
});
