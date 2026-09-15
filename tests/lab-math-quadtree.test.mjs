import assert from "node:assert/strict";
import test from "node:test";
import {
  boxesOverlap,
  buildQuadtree,
  canonicalSelectionHits,
  createBruteSelectionWorkspace,
  createRootQuadtree,
  createQuadtreeQueryWorkspace,
  makeQuadtreeCapacityStudy,
  makeQuadtreeParticleCloud,
  makeSelectionQueries,
  normalizeSelectionBox,
  pointInsideBox,
  quadtreeChildBounds,
  quadtreeMatchesBruteForce,
  quadtreeQuadrant,
  queryQuadtree,
  querySelectionBruteForce,
  runBruteSelectionBatch,
  runQuadtreeSelectionBatch,
} from "../lib/labs/quadtree.ts";

const bounds = { minimum: { x: 0, y: 0 }, maximum: { x: 1, y: 1 } };
const defaultConfig = {
  bounds,
  leafCapacity: 8,
  maximumDepth: 12,
  minimumNodeSize: 1 / 4096,
};

test("Selection boxes normalize drag direction and keep inclusive boundaries", () => {
  const selection = normalizeSelectionBox({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 });
  assert.deepEqual(selection, {
    minimum: { x: 0.2, y: 0.1 },
    maximum: { x: 0.8, y: 0.7 },
  });
  assert.equal(pointInsideBox(selection.minimum, selection), true);
  assert.equal(pointInsideBox(selection.maximum, selection), true);
  assert.equal(
    boxesOverlap(selection, { minimum: { x: 0.8, y: 0.7 }, maximum: { x: 1, y: 1 } }),
    true,
  );
});

test("Split-line points choose exactly one documented quadrant", () => {
  assert.equal(quadtreeQuadrant({ x: 0.49, y: 0.49 }, bounds), 0);
  assert.equal(quadtreeQuadrant({ x: 0.5, y: 0.49 }, bounds), 1);
  assert.equal(quadtreeQuadrant({ x: 0.49, y: 0.5 }, bounds), 2);
  assert.equal(quadtreeQuadrant({ x: 0.5, y: 0.5 }, bounds), 3);
  assert.deepEqual(quadtreeChildBounds(bounds, 3), {
    minimum: { x: 0.5, y: 0.5 },
    maximum: { x: 1, y: 1 },
  });
});

test("Quadtree rebuild stores every valid particle in exactly one leaf", () => {
  const particles = makeQuadtreeParticleCloud(20_000, bounds, 0x29c0ffee, true);
  const tree = buildQuadtree(particles, defaultConfig);
  const insertionCounts = new Uint8Array(particles.length);
  let leafEntries = 0;
  for (const node of tree.nodes) {
    if (node.children !== null) {
      assert.equal(node.particleIndices.length, 0);
      continue;
    }
    leafEntries += node.particleIndices.length;
    for (const particleIndex of node.particleIndices) insertionCounts[particleIndex] += 1;
  }
  assert.equal(tree.insertedCount, particles.length);
  assert.equal(leafEntries, particles.length);
  assert.ok(insertionCounts.every((count) => count === 1));
  assert.equal(tree.nodes.length, tree.leafCount + tree.internalNodeCount);
  assert.ok(Number.isFinite(tree.rebuildMilliseconds));
});

test("Root-only checkpoint remains an explicit N-candidate baseline", () => {
  const particles = makeQuadtreeParticleCloud(1000, bounds, 0x290029, true);
  const tree = createRootQuadtree(particles, defaultConfig);
  const selection = normalizeSelectionBox({ x: 0.45, y: 0.45 }, { x: 0.55, y: 0.55 });
  const result = queryQuadtree(tree, particles, selection, createQuadtreeQueryWorkspace());
  assert.equal(tree.nodes.length, 1);
  assert.equal(tree.maximumLeafOccupancy, particles.length);
  assert.equal(result.candidatesChecked, particles.length);
});

test("Leaf capacity is enforced until a documented split guard stops recursion", () => {
  const particles = makeQuadtreeParticleCloud(10_000, bounds, 0x290029, true);
  const tree = buildQuadtree(particles, defaultConfig);
  for (const node of tree.nodes) {
    if (node.children !== null) continue;
    if (node.particleIndices.length <= defaultConfig.leafCapacity) continue;
    assert.ok(
      node.depth === defaultConfig.maximumDepth ||
        node.bounds.maximum.x - node.bounds.minimum.x < defaultConfig.minimumNodeSize * 2,
    );
  }
  assert.ok(tree.maximumObservedDepth > 3);
});

test("Quadtree rectangle query applies an exact point-in-box test", () => {
  const particles = [
    { x: 0.2, y: 0.2 },
    { x: 0.4, y: 0.4 },
    { x: 0.5, y: 0.5 },
    { x: 0.8, y: 0.8 },
  ];
  const tree = buildQuadtree(particles, { ...defaultConfig, leafCapacity: 1 });
  const selection = normalizeSelectionBox({ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.5 });
  const result = queryQuadtree(tree, particles, selection, createQuadtreeQueryWorkspace());
  assert.deepEqual(canonicalSelectionHits(result.hitIndices), [0, 1, 2]);
  assert.ok(result.prunedNodes > 0);
  assert.ok(result.candidatesChecked >= result.hitIndices.length);
});

test("Quadtree matches brute force for deterministic edge and clustered queries", () => {
  const particles = makeQuadtreeParticleCloud(30_000, bounds, 0x29c0ffee, true);
  const tree = buildQuadtree(particles, defaultConfig);
  const selections = [
    normalizeSelectionBox({ x: 0, y: 0 }, { x: 0.12, y: 0.12 }),
    normalizeSelectionBox({ x: 0.88, y: 0.88 }, { x: 1, y: 1 }),
    ...makeSelectionQueries(32, bounds, 0.12, 0.09, 0x290029),
  ];
  const treeWorkspace = createQuadtreeQueryWorkspace();
  const bruteWorkspace = createBruteSelectionWorkspace();
  for (const selection of selections) {
    queryQuadtree(tree, particles, selection, treeWorkspace);
    querySelectionBruteForce(particles, selection, bruteWorkspace);
    assert.equal(quadtreeMatchesBruteForce(treeWorkspace, bruteWorkspace), true);
  }
});

test("Batch metrics preserve checksum while reducing exact candidate work", () => {
  const particles = makeQuadtreeParticleCloud(50_000, bounds, 0x29c0ffee, true);
  const tree = buildQuadtree(particles, defaultConfig);
  const selections = makeSelectionQueries(24, bounds, 0.1, 0.1, 0x290029);
  const treeMetrics = runQuadtreeSelectionBatch(tree, particles, selections, 2);
  const bruteMetrics = runBruteSelectionBatch(particles, selections, 2);
  assert.equal(treeMetrics.checksum, bruteMetrics.checksum);
  assert.equal(bruteMetrics.totalScanned, particles.length * selections.length * 2);
  assert.ok(treeMetrics.totalCandidates < bruteMetrics.totalScanned / 4);
  assert.ok(treeMetrics.totalVisitedNodes > 0);
});

test("Capacity study exposes topology versus candidate-work trade-offs", () => {
  const particles = makeQuadtreeParticleCloud(30_000, bounds, 0x29c0ffee, true);
  const selections = makeSelectionQueries(12, bounds, 0.12, 0.12, 0x290029);
  const rows = makeQuadtreeCapacityStudy(particles, bounds, selections, [4, 8, 16, 32], 1);
  assert.equal(rows.length, 4);
  assert.ok(rows[0].nodeCount > rows[3].nodeCount);
  assert.ok(rows[0].totalCandidates <= rows[3].totalCandidates);
  assert.ok(rows.every((row) => Number.isFinite(row.rebuildMilliseconds)));
  assert.ok(rows.every((row) => row.checksum === rows[0].checksum));
});
