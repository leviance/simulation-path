import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOctree,
  canonicalVolumeHits,
  createBruteVolumeWorkspace,
  createOctreeQueryWorkspace,
  createRootOctree,
  inspectOctreeTopology,
  makeOctreeCapacityStudy,
  makeOctreePointCloud,
  makeVolumeQueries,
  normalizeVolume,
  octreeChildBounds,
  octreeMatchesBruteForce,
  octreeOctant,
  pointInsideVolume,
  projectPointWithOrbit,
  queryOctree,
  queryVolumeBruteForce,
  runBruteVolumeBatch,
  runOctreeVolumeBatch,
  volumesOverlap,
} from "../lib/labs/octree.ts";

const bounds = {
  minimum: { x: 0, y: 0, z: 0 },
  maximum: { x: 1, y: 1, z: 1 },
};
const config = {
  bounds,
  leafCapacity: 16,
  maximumDepth: 10,
  minimumNodeSize: 1 / 1024,
};

test("3D volumes normalize every axis and keep inclusive boundaries", () => {
  const volume = normalizeVolume({ x: 0.8, y: 0.7, z: 0.9 }, { x: 0.2, y: 0.1, z: 0.3 });
  assert.deepEqual(volume, {
    minimum: { x: 0.2, y: 0.1, z: 0.3 },
    maximum: { x: 0.8, y: 0.7, z: 0.9 },
  });
  assert.equal(pointInsideVolume(volume.minimum, volume), true);
  assert.equal(pointInsideVolume(volume.maximum, volume), true);
  assert.equal(
    volumesOverlap(volume, {
      minimum: { x: 0.8, y: 0.7, z: 0.9 },
      maximum: { x: 1, y: 1, z: 1 },
    }),
    true,
  );
});

test("split-plane equality chooses the positive half on x, y and z", () => {
  assert.equal(octreeOctant({ x: 0.49, y: 0.49, z: 0.49 }, bounds), 0);
  assert.equal(octreeOctant({ x: 0.5, y: 0.49, z: 0.49 }, bounds), 1);
  assert.equal(octreeOctant({ x: 0.49, y: 0.5, z: 0.49 }, bounds), 2);
  assert.equal(octreeOctant({ x: 0.49, y: 0.49, z: 0.5 }, bounds), 4);
  assert.equal(octreeOctant({ x: 0.5, y: 0.5, z: 0.5 }, bounds), 7);
  assert.deepEqual(octreeChildBounds(bounds, 7), {
    minimum: { x: 0.5, y: 0.5, z: 0.5 },
    maximum: { x: 1, y: 1, z: 1 },
  });
});

test("root-only Octree remains an explicit N-candidate baseline", () => {
  const points = makeOctreePointCloud(1000, bounds, 0x300030, true);
  const tree = createRootOctree(points, config);
  const volume = normalizeVolume({ x: 0.45, y: 0.45, z: 0.45 }, { x: 0.55, y: 0.55, z: 0.55 });
  const result = queryOctree(tree, points, volume, createOctreeQueryWorkspace());
  assert.equal(tree.nodes.length, 1);
  assert.equal(tree.maximumLeafOccupancy, points.length);
  assert.equal(result.candidatesChecked, points.length);
});

test("Octree rebuild stores every point in exactly one leaf", () => {
  const points = makeOctreePointCloud(20_000, bounds, 0x30c0ffee, true);
  const tree = buildOctree(points, config);
  const report = inspectOctreeTopology(tree, points.length);
  assert.deepEqual(report, {
    everyPointStoredOnce: true,
    internalNodesEmpty: true,
    childIndicesValid: true,
    childBoundsValid: true,
    capacityHonored: true,
    statisticsMatch: true,
  });
  assert.equal(tree.insertedCount, points.length);
  assert.equal(tree.nodes.length, tree.leafCount + tree.internalNodeCount);
});

test("leaf capacity is enforced until a documented guard stops splitting", () => {
  const points = makeOctreePointCloud(12_000, bounds, 0x300030, true);
  const tree = buildOctree(points, { ...config, leafCapacity: 8 });
  for (const node of tree.nodes) {
    if (node.children !== null || node.pointIndices.length <= 8) continue;
    const sizeX = node.bounds.maximum.x - node.bounds.minimum.x;
    assert.ok(node.depth === config.maximumDepth || sizeX * 0.5 < config.minimumNodeSize);
  }
  assert.ok(tree.maximumObservedDepth > 3);
});

test("Octree volume query performs an exact point-in-volume test", () => {
  const points = [
    { x: 0.2, y: 0.2, z: 0.2 },
    { x: 0.4, y: 0.4, z: 0.4 },
    { x: 0.5, y: 0.5, z: 0.5 },
    { x: 0.8, y: 0.8, z: 0.8 },
  ];
  const tree = buildOctree(points, { ...config, leafCapacity: 1 });
  const volume = normalizeVolume({ x: 0.2, y: 0.2, z: 0.2 }, { x: 0.5, y: 0.5, z: 0.5 });
  const result = queryOctree(tree, points, volume, createOctreeQueryWorkspace());
  assert.deepEqual(canonicalVolumeHits(result.hitIndices), [0, 1, 2]);
  assert.ok(result.prunedNodes > 0);
  assert.ok(result.candidatesChecked >= result.hitIndices.length);
});

test("Octree queries keep corner, face and split-plane boundaries inclusive", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0.5, z: 0.5 },
    { x: 0.5, y: 0, z: 0.5 },
    { x: 0.5, y: 0.5, z: 0 },
    { x: 0.5, y: 0.5, z: 0.5 },
    { x: 1, y: 0.5, z: 0.5 },
    { x: 1, y: 1, z: 1 },
  ];
  const tree = buildOctree(points, { ...config, leafCapacity: 1 });
  const volumes = [
    normalizeVolume({ x: 0, y: 0, z: 0 }, { x: 0.1, y: 0.1, z: 0.1 }),
    normalizeVolume({ x: 0, y: 0.25, z: 0.25 }, { x: 0, y: 0.75, z: 0.75 }),
    normalizeVolume({ x: 0.5, y: 0, z: 0 }, { x: 0.5, y: 1, z: 1 }),
    normalizeVolume({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 0.5, z: 1 }),
    normalizeVolume({ x: 0, y: 0, z: 0.5 }, { x: 1, y: 1, z: 0.5 }),
  ];
  const treeWorkspace = createOctreeQueryWorkspace();
  const bruteWorkspace = createBruteVolumeWorkspace();
  for (const volume of volumes) {
    queryOctree(tree, points, volume, treeWorkspace);
    queryVolumeBruteForce(points, volume, bruteWorkspace);
    assert.equal(octreeMatchesBruteForce(treeWorkspace, bruteWorkspace), true);
  }
});

test("Octree matches the brute-force oracle for deterministic edge probes", () => {
  const points = makeOctreePointCloud(30_000, bounds, 0x30c0ffee, true);
  const tree = buildOctree(points, config);
  const volumes = [
    normalizeVolume({ x: 0, y: 0, z: 0 }, { x: 0.12, y: 0.12, z: 0.12 }),
    normalizeVolume({ x: 0.88, y: 0.88, z: 0.88 }, { x: 1, y: 1, z: 1 }),
    ...makeVolumeQueries(24, bounds, { x: 0.14, y: 0.12, z: 0.1 }, 0x300030),
  ];
  const treeWorkspace = createOctreeQueryWorkspace();
  const bruteWorkspace = createBruteVolumeWorkspace();
  for (const volume of volumes) {
    queryOctree(tree, points, volume, treeWorkspace);
    queryVolumeBruteForce(points, volume, bruteWorkspace);
    assert.equal(octreeMatchesBruteForce(treeWorkspace, bruteWorkspace), true);
  }
});

test("batch metrics preserve checksum while reducing exact candidate work", () => {
  const points = makeOctreePointCloud(50_000, bounds, 0x30c0ffee, true);
  const tree = buildOctree(points, config);
  const volumes = makeVolumeQueries(20, bounds, { x: 0.14, y: 0.12, z: 0.1 }, 0x300030);
  const treeMetrics = runOctreeVolumeBatch(tree, points, volumes, 2);
  const bruteMetrics = runBruteVolumeBatch(points, volumes, 2);
  assert.equal(treeMetrics.checksum, bruteMetrics.checksum);
  assert.equal(bruteMetrics.totalScanned, points.length * volumes.length * 2);
  assert.ok(treeMetrics.totalCandidates < bruteMetrics.totalScanned / 4);
});

test("capacity study exposes topology versus candidate-work trade-offs", () => {
  const points = makeOctreePointCloud(30_000, bounds, 0x30c0ffee, true);
  const volumes = makeVolumeQueries(12, bounds, { x: 0.14, y: 0.12, z: 0.1 }, 0x300030);
  const rows = makeOctreeCapacityStudy(points, bounds, volumes, [8, 16, 32, 64], 1);
  assert.equal(rows.length, 4);
  assert.ok(rows[0].nodeCount > rows[3].nodeCount);
  assert.ok(rows[0].totalCandidates <= rows[3].totalCandidates);
  assert.ok(rows.every((row) => row.checksum === rows[0].checksum));
});

test("orbit projection keeps finite visible coordinates in front of the near plane", () => {
  const projected = projectPointWithOrbit(
    { x: 0.5, y: 0.5, z: 0.5 },
    {
      yaw: 0.7,
      pitch: -0.35,
      distance: 2.4,
      fieldOfViewRadians: Math.PI / 3,
      aspect: 16 / 9,
      nearPlane: 0.1,
    },
  );
  assert.equal(projected.visible, true);
  assert.ok(Number.isFinite(projected.x));
  assert.ok(Number.isFinite(projected.y));
  assert.ok(projected.depth > 0.1);
});
