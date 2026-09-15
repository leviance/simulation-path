export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Bounds3D {
  minimum: Point3D;
  maximum: Point3D;
}

export interface OctreeConfig {
  bounds: Bounds3D;
  leafCapacity: number;
  maximumDepth: number;
  minimumNodeSize: number;
}

export type OctreeChildren = [number, number, number, number, number, number, number, number];

export interface OctreeNode {
  bounds: Bounds3D;
  depth: number;
  pointIndices: number[];
  children: OctreeChildren | null;
}

export interface Octree {
  config: OctreeConfig;
  nodes: OctreeNode[];
  pointCount: number;
  insertedCount: number;
  leafCount: number;
  internalNodeCount: number;
  maximumObservedDepth: number;
  maximumLeafOccupancy: number;
  rebuildMilliseconds: number;
}

export interface OctreeQueryWorkspace {
  hitIndices: number[];
  visitedNodeIndices: number[];
  prunedNodeIndices: number[];
  overlappingLeafIndices: number[];
  visitedNodes: number;
  prunedNodes: number;
  visitedLeaves: number;
  candidatesChecked: number;
}

export interface BruteVolumeWorkspace {
  hitIndices: number[];
  scanned: number;
}

export interface OctreeTopologyReport {
  everyPointStoredOnce: boolean;
  internalNodesEmpty: boolean;
  childIndicesValid: boolean;
  childBoundsValid: boolean;
  capacityHonored: boolean;
  statisticsMatch: boolean;
}

export interface OctreeBatchMetrics {
  queryCount: number;
  totalVisitedNodes: number;
  totalCandidates: number;
  checksum: number;
}

export interface BruteVolumeBatchMetrics {
  queryCount: number;
  totalScanned: number;
  checksum: number;
}

export interface OctreeCapacityStudyRow extends OctreeBatchMetrics {
  leafCapacity: number;
  nodeCount: number;
  leafCount: number;
  maximumObservedDepth: number;
  maximumLeafOccupancy: number;
  rebuildMilliseconds: number;
}

export interface OrbitCamera {
  yaw: number;
  pitch: number;
  distance: number;
  fieldOfViewRadians: number;
  aspect: number;
  nearPlane: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

const maximumNodeCount = 1_000_000;

function finitePoint(point: Point3D) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
}

export function normalizeVolume(a: Point3D, b: Point3D): Bounds3D {
  return {
    minimum: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      z: Math.min(a.z, b.z),
    },
    maximum: {
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      z: Math.max(a.z, b.z),
    },
  };
}

export function validBounds3D(bounds: Bounds3D) {
  return (
    finitePoint(bounds.minimum) &&
    finitePoint(bounds.maximum) &&
    bounds.minimum.x <= bounds.maximum.x &&
    bounds.minimum.y <= bounds.maximum.y &&
    bounds.minimum.z <= bounds.maximum.z
  );
}

export function pointInsideVolume(point: Point3D, bounds: Bounds3D) {
  return (
    point.x >= bounds.minimum.x &&
    point.x <= bounds.maximum.x &&
    point.y >= bounds.minimum.y &&
    point.y <= bounds.maximum.y &&
    point.z >= bounds.minimum.z &&
    point.z <= bounds.maximum.z
  );
}

export function volumesOverlap(a: Bounds3D, b: Bounds3D) {
  return !(
    a.maximum.x < b.minimum.x ||
    a.minimum.x > b.maximum.x ||
    a.maximum.y < b.minimum.y ||
    a.minimum.y > b.maximum.y ||
    a.maximum.z < b.minimum.z ||
    a.minimum.z > b.maximum.z
  );
}

// bit 0 = positive X, bit 1 = positive Y, bit 2 = positive Z.
// Equality deliberately chooses the positive half on every axis.
export function octreeOctant(point: Point3D, bounds: Bounds3D) {
  const middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
  const middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
  const middleZ = (bounds.minimum.z + bounds.maximum.z) * 0.5;
  let octant = 0;
  if (point.x >= middleX) octant |= 1;
  if (point.y >= middleY) octant |= 2;
  if (point.z >= middleZ) octant |= 4;
  return octant;
}

export function octreeChildBounds(bounds: Bounds3D, octant: number): Bounds3D {
  const middle = {
    x: (bounds.minimum.x + bounds.maximum.x) * 0.5,
    y: (bounds.minimum.y + bounds.maximum.y) * 0.5,
    z: (bounds.minimum.z + bounds.maximum.z) * 0.5,
  };
  return {
    minimum: {
      x: (octant & 1) !== 0 ? middle.x : bounds.minimum.x,
      y: (octant & 2) !== 0 ? middle.y : bounds.minimum.y,
      z: (octant & 4) !== 0 ? middle.z : bounds.minimum.z,
    },
    maximum: {
      x: (octant & 1) !== 0 ? bounds.maximum.x : middle.x,
      y: (octant & 2) !== 0 ? bounds.maximum.y : middle.y,
      z: (octant & 4) !== 0 ? bounds.maximum.z : middle.z,
    },
  };
}

export function validOctreeConfig(config: OctreeConfig) {
  const sizeX = config.bounds.maximum.x - config.bounds.minimum.x;
  const sizeY = config.bounds.maximum.y - config.bounds.minimum.y;
  const sizeZ = config.bounds.maximum.z - config.bounds.minimum.z;
  return (
    validBounds3D(config.bounds) &&
    sizeX > 0 &&
    sizeY > 0 &&
    sizeZ > 0 &&
    Number.isInteger(config.leafCapacity) &&
    config.leafCapacity > 0 &&
    Number.isInteger(config.maximumDepth) &&
    config.maximumDepth >= 0 &&
    Number.isFinite(config.minimumNodeSize) &&
    config.minimumNodeSize >= 0
  );
}

function nodeCanSplit(node: OctreeNode, config: OctreeConfig) {
  const sizeX = node.bounds.maximum.x - node.bounds.minimum.x;
  const sizeY = node.bounds.maximum.y - node.bounds.minimum.y;
  const sizeZ = node.bounds.maximum.z - node.bounds.minimum.z;
  return (
    node.depth < config.maximumDepth &&
    sizeX * 0.5 >= config.minimumNodeSize &&
    sizeY * 0.5 >= config.minimumNodeSize &&
    sizeZ * 0.5 >= config.minimumNodeSize
  );
}

function emptyOctree(config: OctreeConfig, pointCount: number): Octree {
  return {
    config,
    nodes: [],
    pointCount,
    insertedCount: 0,
    leafCount: 0,
    internalNodeCount: 0,
    maximumObservedDepth: 0,
    maximumLeafOccupancy: 0,
    rebuildMilliseconds: 0,
  };
}

function insertAtNode(
  tree: Octree,
  points: readonly Point3D[],
  pointIndex: number,
  nodeIndex: number,
) {
  const children = tree.nodes[nodeIndex].children;
  if (children !== null) {
    const octant = octreeOctant(points[pointIndex], tree.nodes[nodeIndex].bounds);
    insertAtNode(tree, points, pointIndex, children[octant]);
    return;
  }

  const node = tree.nodes[nodeIndex];
  if (node.pointIndices.length < tree.config.leafCapacity || !nodeCanSplit(node, tree.config)) {
    node.pointIndices.push(pointIndex);
    return;
  }
  if (tree.nodes.length + 8 > maximumNodeCount) {
    node.pointIndices.push(pointIndex);
    return;
  }

  const firstChildIndex = tree.nodes.length;
  const parentBounds = node.bounds;
  const childDepth = node.depth + 1;
  for (let octant = 0; octant < 8; octant += 1) {
    tree.nodes.push({
      bounds: octreeChildBounds(parentBounds, octant),
      depth: childDepth,
      pointIndices: [],
      children: null,
    });
  }

  const existingIndices = node.pointIndices;
  node.pointIndices = [];
  node.children = [
    firstChildIndex,
    firstChildIndex + 1,
    firstChildIndex + 2,
    firstChildIndex + 3,
    firstChildIndex + 4,
    firstChildIndex + 5,
    firstChildIndex + 6,
    firstChildIndex + 7,
  ];

  for (const existingIndex of existingIndices) {
    const octant = octreeOctant(points[existingIndex], parentBounds);
    insertAtNode(tree, points, existingIndex, node.children[octant]);
  }
  const octant = octreeOctant(points[pointIndex], parentBounds);
  insertAtNode(tree, points, pointIndex, node.children[octant]);
}

function finishTreeStatistics(tree: Octree) {
  for (const node of tree.nodes) {
    tree.maximumObservedDepth = Math.max(tree.maximumObservedDepth, node.depth);
    if (node.children === null) {
      tree.leafCount += 1;
      tree.maximumLeafOccupancy = Math.max(tree.maximumLeafOccupancy, node.pointIndices.length);
    } else {
      tree.internalNodeCount += 1;
    }
  }
}

export function createRootOctree(points: readonly Point3D[], config: OctreeConfig): Octree {
  const started = performance.now();
  const tree = emptyOctree(config, points.length);
  if (!validOctreeConfig(config)) return tree;
  const pointIndices: number[] = [];
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    if (pointInsideVolume(points[pointIndex], config.bounds)) pointIndices.push(pointIndex);
  }
  tree.nodes.push({ bounds: config.bounds, depth: 0, pointIndices, children: null });
  tree.insertedCount = pointIndices.length;
  finishTreeStatistics(tree);
  tree.rebuildMilliseconds = performance.now() - started;
  return tree;
}

export function buildOctree(points: readonly Point3D[], config: OctreeConfig): Octree {
  const started = performance.now();
  const tree = emptyOctree(config, points.length);
  if (!validOctreeConfig(config)) return tree;
  tree.nodes.push({ bounds: config.bounds, depth: 0, pointIndices: [], children: null });
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    if (!pointInsideVolume(points[pointIndex], config.bounds)) continue;
    insertAtNode(tree, points, pointIndex, 0);
    tree.insertedCount += 1;
  }
  finishTreeStatistics(tree);
  tree.rebuildMilliseconds = performance.now() - started;
  return tree;
}

function sameBounds(a: Bounds3D, b: Bounds3D) {
  return (
    a.minimum.x === b.minimum.x &&
    a.minimum.y === b.minimum.y &&
    a.minimum.z === b.minimum.z &&
    a.maximum.x === b.maximum.x &&
    a.maximum.y === b.maximum.y &&
    a.maximum.z === b.maximum.z
  );
}

export function inspectOctreeTopology(tree: Octree, pointCount: number): OctreeTopologyReport {
  const insertionCounts = new Uint32Array(pointCount);
  let internalNodesEmpty = true;
  let childIndicesValid = true;
  let childBoundsValid = true;
  let capacityHonored = true;
  let leafCount = 0;
  let internalNodeCount = 0;

  for (const node of tree.nodes) {
    if (node.children === null) {
      leafCount += 1;
      if (node.pointIndices.length > tree.config.leafCapacity && nodeCanSplit(node, tree.config)) {
        capacityHonored = false;
      }
      for (const pointIndex of node.pointIndices) {
        if (pointIndex >= insertionCounts.length) childIndicesValid = false;
        else insertionCounts[pointIndex] += 1;
      }
      continue;
    }

    internalNodeCount += 1;
    internalNodesEmpty = internalNodesEmpty && node.pointIndices.length === 0;
    for (let octant = 0; octant < 8; octant += 1) {
      const childIndex = node.children[octant];
      if (childIndex >= tree.nodes.length) {
        childIndicesValid = false;
        continue;
      }
      childBoundsValid =
        childBoundsValid &&
        sameBounds(tree.nodes[childIndex].bounds, octreeChildBounds(node.bounds, octant));
    }
  }

  return {
    everyPointStoredOnce:
      tree.insertedCount === pointCount && insertionCounts.every((count) => count === 1),
    internalNodesEmpty,
    childIndicesValid,
    childBoundsValid,
    capacityHonored,
    statisticsMatch:
      leafCount === tree.leafCount &&
      internalNodeCount === tree.internalNodeCount &&
      leafCount + internalNodeCount === tree.nodes.length,
  };
}

export function createOctreeQueryWorkspace(): OctreeQueryWorkspace {
  return {
    hitIndices: [],
    visitedNodeIndices: [],
    prunedNodeIndices: [],
    overlappingLeafIndices: [],
    visitedNodes: 0,
    prunedNodes: 0,
    visitedLeaves: 0,
    candidatesChecked: 0,
  };
}

export function createBruteVolumeWorkspace(): BruteVolumeWorkspace {
  return { hitIndices: [], scanned: 0 };
}

function queryNode(
  tree: Octree,
  points: readonly Point3D[],
  volume: Bounds3D,
  nodeIndex: number,
  workspace: OctreeQueryWorkspace,
) {
  const node = tree.nodes[nodeIndex];
  workspace.visitedNodeIndices.push(nodeIndex);
  workspace.visitedNodes += 1;
  if (!volumesOverlap(node.bounds, volume)) {
    workspace.prunedNodeIndices.push(nodeIndex);
    workspace.prunedNodes += 1;
    return;
  }
  if (node.children !== null) {
    for (const childIndex of node.children) queryNode(tree, points, volume, childIndex, workspace);
    return;
  }
  workspace.visitedLeaves += 1;
  workspace.overlappingLeafIndices.push(nodeIndex);
  for (const pointIndex of node.pointIndices) {
    workspace.candidatesChecked += 1;
    if (pointInsideVolume(points[pointIndex], volume)) workspace.hitIndices.push(pointIndex);
  }
}

export function queryOctree(
  tree: Octree,
  points: readonly Point3D[],
  volume: Bounds3D,
  workspace: OctreeQueryWorkspace,
) {
  workspace.hitIndices.length = 0;
  workspace.visitedNodeIndices.length = 0;
  workspace.prunedNodeIndices.length = 0;
  workspace.overlappingLeafIndices.length = 0;
  workspace.visitedNodes = 0;
  workspace.prunedNodes = 0;
  workspace.visitedLeaves = 0;
  workspace.candidatesChecked = 0;
  if (tree.nodes.length === 0 || !validBounds3D(volume)) return workspace;
  queryNode(tree, points, volume, 0, workspace);
  return workspace;
}

export function queryVolumeBruteForce(
  points: readonly Point3D[],
  volume: Bounds3D,
  workspace: BruteVolumeWorkspace,
) {
  workspace.hitIndices.length = 0;
  workspace.scanned = 0;
  if (!validBounds3D(volume)) return workspace;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    workspace.scanned += 1;
    if (pointInsideVolume(points[pointIndex], volume)) workspace.hitIndices.push(pointIndex);
  }
  return workspace;
}

export function canonicalVolumeHits(indices: readonly number[]) {
  return [...indices].sort((a, b) => a - b);
}

export function octreeMatchesBruteForce(
  octreeResult: OctreeQueryWorkspace,
  bruteResult: BruteVolumeWorkspace,
) {
  const octreeHits = canonicalVolumeHits(octreeResult.hitIndices);
  const bruteHits = canonicalVolumeHits(bruteResult.hitIndices);
  if (octreeHits.length !== bruteHits.length) return false;
  return octreeHits.every((value, index) => value === bruteHits[index]);
}

function updateChecksum(checksum: number, hitIndices: readonly number[]) {
  let queryHash = hitIndices.length >>> 0;
  for (const pointIndex of hitIndices) {
    queryHash = (queryHash + Math.imul(pointIndex + 1, 0x9e3779b1)) >>> 0;
  }
  return Math.imul(checksum ^ queryHash, 0x01000193) >>> 0;
}

export function runOctreeVolumeBatch(
  tree: Octree,
  points: readonly Point3D[],
  volumes: readonly Bounds3D[],
  repetitions: number,
): OctreeBatchMetrics {
  const workspace = createOctreeQueryWorkspace();
  const metrics: OctreeBatchMetrics = {
    queryCount: 0,
    totalVisitedNodes: 0,
    totalCandidates: 0,
    checksum: 0x811c9dc5,
  };
  for (let repetition = 0; repetition < Math.max(0, repetitions); repetition += 1) {
    for (const volume of volumes) {
      queryOctree(tree, points, volume, workspace);
      metrics.queryCount += 1;
      metrics.totalVisitedNodes += workspace.visitedNodes;
      metrics.totalCandidates += workspace.candidatesChecked;
      metrics.checksum = updateChecksum(metrics.checksum, workspace.hitIndices);
    }
  }
  return metrics;
}

export function runBruteVolumeBatch(
  points: readonly Point3D[],
  volumes: readonly Bounds3D[],
  repetitions: number,
): BruteVolumeBatchMetrics {
  const workspace = createBruteVolumeWorkspace();
  const metrics: BruteVolumeBatchMetrics = {
    queryCount: 0,
    totalScanned: 0,
    checksum: 0x811c9dc5,
  };
  for (let repetition = 0; repetition < Math.max(0, repetitions); repetition += 1) {
    for (const volume of volumes) {
      queryVolumeBruteForce(points, volume, workspace);
      metrics.queryCount += 1;
      metrics.totalScanned += workspace.scanned;
      metrics.checksum = updateChecksum(metrics.checksum, workspace.hitIndices);
    }
  }
  return metrics;
}

function nextRandom(state: { value: number }) {
  state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0;
  return state.value / 0x1_0000_0000;
}

export function makeOctreePointCloud(
  count: number,
  bounds: Bounds3D,
  seed: number,
  clustered: boolean,
) {
  const state = { value: seed >>> 0 };
  const size = {
    x: bounds.maximum.x - bounds.minimum.x,
    y: bounds.maximum.y - bounds.minimum.y,
    z: bounds.maximum.z - bounds.minimum.z,
  };
  const anchors = [
    { x: 0.23, y: 0.31, z: 0.29 },
    { x: 0.72, y: 0.66, z: 0.68 },
    { x: 0.34, y: 0.76, z: 0.71 },
    { x: 0.73, y: 0.25, z: 0.36 },
  ];
  const points: Point3D[] = [];
  for (let index = 0; index < Math.max(0, count); index += 1) {
    let x = nextRandom(state);
    let y = nextRandom(state);
    let z = nextRandom(state);
    if (clustered && index % 5 !== 0) {
      const anchor = anchors[index % anchors.length];
      x = anchor.x + (x - 0.5) * 0.18;
      y = anchor.y + (y - 0.5) * 0.18;
      z = anchor.z + (z - 0.5) * 0.18;
    }
    points.push({
      x: bounds.minimum.x + x * size.x,
      y: bounds.minimum.y + y * size.y,
      z: bounds.minimum.z + z * size.z,
    });
  }
  return points;
}

export function makeVolumeQueries(count: number, bounds: Bounds3D, size: Point3D, seed: number) {
  const centers = makeOctreePointCloud(count, bounds, seed, false);
  return centers.map((center) =>
    normalizeVolume(
      { x: center.x - size.x * 0.5, y: center.y - size.y * 0.5, z: center.z - size.z * 0.5 },
      { x: center.x + size.x * 0.5, y: center.y + size.y * 0.5, z: center.z + size.z * 0.5 },
    ),
  );
}

export function makeOctreeCapacityStudy(
  points: readonly Point3D[],
  bounds: Bounds3D,
  volumes: readonly Bounds3D[],
  capacities: readonly number[],
  repetitions: number,
) {
  return capacities.map<OctreeCapacityStudyRow>((leafCapacity) => {
    const tree = buildOctree(points, {
      bounds,
      leafCapacity,
      maximumDepth: 10,
      minimumNodeSize: 1 / 1024,
    });
    return {
      leafCapacity,
      nodeCount: tree.nodes.length,
      leafCount: tree.leafCount,
      maximumObservedDepth: tree.maximumObservedDepth,
      maximumLeafOccupancy: tree.maximumLeafOccupancy,
      rebuildMilliseconds: tree.rebuildMilliseconds,
      ...runOctreeVolumeBatch(tree, points, volumes, repetitions),
    };
  });
}

export function projectPointWithOrbit(point: Point3D, camera: OrbitCamera): ProjectedPoint {
  const centeredX = point.x - 0.5;
  const centeredY = point.y - 0.5;
  const centeredZ = point.z - 0.5;
  const cosineYaw = Math.cos(camera.yaw);
  const sineYaw = Math.sin(camera.yaw);
  const yawX = cosineYaw * centeredX - sineYaw * centeredZ;
  const yawZ = sineYaw * centeredX + cosineYaw * centeredZ;
  const cosinePitch = Math.cos(camera.pitch);
  const sinePitch = Math.sin(camera.pitch);
  const cameraY = cosinePitch * centeredY - sinePitch * yawZ;
  const rotatedZ = sinePitch * centeredY + cosinePitch * yawZ;
  const cameraZ = rotatedZ + camera.distance;
  if (cameraZ <= camera.nearPlane) return { x: 0, y: 0, depth: cameraZ, visible: false };
  const focalScale = 1 / Math.tan(camera.fieldOfViewRadians * 0.5);
  return {
    x: (yawX * focalScale) / (cameraZ * Math.max(0.0001, camera.aspect)),
    y: (cameraY * focalScale) / cameraZ,
    depth: cameraZ,
    visible: true,
  };
}
