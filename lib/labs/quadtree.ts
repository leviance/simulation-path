import {
  makeParticleCloud,
  type ParticleBounds,
  type ParticlePoint,
} from "./brute-force-particle-query.ts";

export interface SelectionBox {
  minimum: ParticlePoint;
  maximum: ParticlePoint;
}

export interface QuadtreeConfig {
  bounds: ParticleBounds;
  leafCapacity: number;
  maximumDepth: number;
  minimumNodeSize: number;
}

export type QuadtreeChildren = [number, number, number, number];

export interface QuadtreeNode {
  bounds: ParticleBounds;
  depth: number;
  particleIndices: number[];
  children: QuadtreeChildren | null;
}

export interface Quadtree {
  config: QuadtreeConfig;
  nodes: QuadtreeNode[];
  particleCount: number;
  insertedCount: number;
  leafCount: number;
  internalNodeCount: number;
  maximumObservedDepth: number;
  maximumLeafOccupancy: number;
  rebuildMilliseconds: number;
}

export interface QuadtreeQueryWorkspace {
  hitIndices: number[];
  visitedNodeIndices: number[];
  prunedNodeIndices: number[];
  overlappingLeafIndices: number[];
  visitedNodes: number;
  prunedNodes: number;
  visitedLeaves: number;
  candidatesChecked: number;
}

export interface QuadtreeTopologyReport {
  everyParticleStoredOnce: boolean;
  internalNodesEmpty: boolean;
  childIndicesValid: boolean;
  capacityHonored: boolean;
  statisticsMatch: boolean;
}

export interface BruteSelectionWorkspace {
  hitIndices: number[];
  scanned: number;
}

export interface QuadtreeBatchMetrics {
  queryCount: number;
  totalVisitedNodes: number;
  totalCandidates: number;
  checksum: number;
}

export interface BruteSelectionBatchMetrics {
  queryCount: number;
  totalScanned: number;
  checksum: number;
}

export interface QuadtreeCapacityStudyRow extends QuadtreeBatchMetrics {
  leafCapacity: number;
  nodeCount: number;
  leafCount: number;
  maximumObservedDepth: number;
  maximumLeafOccupancy: number;
  rebuildMilliseconds: number;
}

const maximumNodeCount = 1_000_000;

export function normalizeSelectionBox(a: ParticlePoint, b: ParticlePoint): SelectionBox {
  return {
    minimum: { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    maximum: { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
  };
}

export function validSelectionBox(selection: SelectionBox) {
  return (
    Number.isFinite(selection.minimum.x) &&
    Number.isFinite(selection.minimum.y) &&
    Number.isFinite(selection.maximum.x) &&
    Number.isFinite(selection.maximum.y) &&
    selection.minimum.x <= selection.maximum.x &&
    selection.minimum.y <= selection.maximum.y
  );
}

export function pointInsideBox(point: ParticlePoint, box: SelectionBox | ParticleBounds) {
  return (
    point.x >= box.minimum.x &&
    point.x <= box.maximum.x &&
    point.y >= box.minimum.y &&
    point.y <= box.maximum.y
  );
}

export function boxesOverlap(a: SelectionBox | ParticleBounds, b: SelectionBox | ParticleBounds) {
  return !(
    a.maximum.x < b.minimum.x ||
    a.minimum.x > b.maximum.x ||
    a.maximum.y < b.minimum.y ||
    a.minimum.y > b.maximum.y
  );
}

export function quadtreeQuadrant(point: ParticlePoint, bounds: ParticleBounds) {
  const middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
  const middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
  const east = point.x >= middleX;
  const north = point.y >= middleY;
  if (north) return east ? 3 : 2;
  return east ? 1 : 0;
}

export function quadtreeChildBounds(bounds: ParticleBounds, quadrant: number): ParticleBounds {
  const middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
  const middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
  if (quadrant === 0) {
    return { minimum: bounds.minimum, maximum: { x: middleX, y: middleY } };
  }
  if (quadrant === 1) {
    return {
      minimum: { x: middleX, y: bounds.minimum.y },
      maximum: { x: bounds.maximum.x, y: middleY },
    };
  }
  if (quadrant === 2) {
    return {
      minimum: { x: bounds.minimum.x, y: middleY },
      maximum: { x: middleX, y: bounds.maximum.y },
    };
  }
  return { minimum: { x: middleX, y: middleY }, maximum: bounds.maximum };
}

export function validQuadtreeConfig(config: QuadtreeConfig) {
  const width = config.bounds.maximum.x - config.bounds.minimum.x;
  const height = config.bounds.maximum.y - config.bounds.minimum.y;
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0 &&
    Number.isInteger(config.leafCapacity) &&
    config.leafCapacity > 0 &&
    Number.isInteger(config.maximumDepth) &&
    config.maximumDepth >= 0 &&
    Number.isFinite(config.minimumNodeSize) &&
    config.minimumNodeSize >= 0
  );
}

function nodeCanSplit(node: QuadtreeNode, config: QuadtreeConfig) {
  const width = node.bounds.maximum.x - node.bounds.minimum.x;
  const height = node.bounds.maximum.y - node.bounds.minimum.y;
  return (
    node.depth < config.maximumDepth &&
    width * 0.5 >= config.minimumNodeSize &&
    height * 0.5 >= config.minimumNodeSize
  );
}

function insertAtNode(
  tree: Quadtree,
  particles: readonly ParticlePoint[],
  particleIndex: number,
  nodeIndex: number,
) {
  const children = tree.nodes[nodeIndex].children;
  if (children !== null) {
    const quadrant = quadtreeQuadrant(particles[particleIndex], tree.nodes[nodeIndex].bounds);
    insertAtNode(tree, particles, particleIndex, children[quadrant]);
    return;
  }

  const node = tree.nodes[nodeIndex];
  if (node.particleIndices.length < tree.config.leafCapacity || !nodeCanSplit(node, tree.config)) {
    node.particleIndices.push(particleIndex);
    return;
  }

  const firstChildIndex = tree.nodes.length;
  if (firstChildIndex + 4 > maximumNodeCount) {
    node.particleIndices.push(particleIndex);
    return;
  }

  const parentBounds = node.bounds;
  const childDepth = node.depth + 1;
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    tree.nodes.push({
      bounds: quadtreeChildBounds(parentBounds, quadrant),
      depth: childDepth,
      particleIndices: [],
      children: null,
    });
  }

  const existingIndices = node.particleIndices;
  node.particleIndices = [];
  node.children = [firstChildIndex, firstChildIndex + 1, firstChildIndex + 2, firstChildIndex + 3];

  for (const existingIndex of existingIndices) {
    const quadrant = quadtreeQuadrant(particles[existingIndex], parentBounds);
    insertAtNode(tree, particles, existingIndex, node.children[quadrant]);
  }
  const quadrant = quadtreeQuadrant(particles[particleIndex], parentBounds);
  insertAtNode(tree, particles, particleIndex, node.children[quadrant]);
}

export function buildQuadtree(
  particles: readonly ParticlePoint[],
  config: QuadtreeConfig,
): Quadtree {
  const started = performance.now();
  const tree: Quadtree = {
    config,
    nodes: [],
    particleCount: particles.length,
    insertedCount: 0,
    leafCount: 0,
    internalNodeCount: 0,
    maximumObservedDepth: 0,
    maximumLeafOccupancy: 0,
    rebuildMilliseconds: 0,
  };
  if (!validQuadtreeConfig(config)) return tree;

  tree.nodes.push({ bounds: config.bounds, depth: 0, particleIndices: [], children: null });
  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    if (!pointInsideBox(particles[particleIndex], config.bounds)) continue;
    insertAtNode(tree, particles, particleIndex, 0);
    tree.insertedCount += 1;
  }

  for (const node of tree.nodes) {
    tree.maximumObservedDepth = Math.max(tree.maximumObservedDepth, node.depth);
    if (node.children === null) {
      tree.leafCount += 1;
      tree.maximumLeafOccupancy = Math.max(tree.maximumLeafOccupancy, node.particleIndices.length);
    } else {
      tree.internalNodeCount += 1;
    }
  }
  tree.rebuildMilliseconds = performance.now() - started;
  return tree;
}

export function createRootQuadtree(
  particles: readonly ParticlePoint[],
  config: QuadtreeConfig,
): Quadtree {
  const started = performance.now();
  const tree: Quadtree = {
    config,
    nodes: [],
    particleCount: particles.length,
    insertedCount: 0,
    leafCount: 0,
    internalNodeCount: 0,
    maximumObservedDepth: 0,
    maximumLeafOccupancy: 0,
    rebuildMilliseconds: 0,
  };
  if (!validQuadtreeConfig(config)) return tree;

  const particleIndices: number[] = [];
  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    if (!pointInsideBox(particles[particleIndex], config.bounds)) continue;
    particleIndices.push(particleIndex);
  }
  tree.nodes.push({ bounds: config.bounds, depth: 0, particleIndices, children: null });
  tree.insertedCount = particleIndices.length;
  tree.leafCount = 1;
  tree.maximumLeafOccupancy = particleIndices.length;
  tree.rebuildMilliseconds = performance.now() - started;
  return tree;
}

export function createQuadtreeQueryWorkspace(): QuadtreeQueryWorkspace {
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

export function inspectQuadtreeTopology(
  tree: Quadtree,
  particleCount: number,
): QuadtreeTopologyReport {
  const insertionCounts = new Uint32Array(particleCount);
  let internalNodesEmpty = true;
  let childIndicesValid = true;
  let capacityHonored = true;
  let leafCount = 0;
  let internalNodeCount = 0;

  for (const node of tree.nodes) {
    if (node.children === null) {
      leafCount += 1;
      if (
        node.particleIndices.length > tree.config.leafCapacity &&
        nodeCanSplit(node, tree.config)
      ) {
        capacityHonored = false;
      }
      for (const particleIndex of node.particleIndices) {
        if (particleIndex >= insertionCounts.length) {
          childIndicesValid = false;
        } else {
          insertionCounts[particleIndex] += 1;
        }
      }
    } else {
      internalNodeCount += 1;
      internalNodesEmpty = internalNodesEmpty && node.particleIndices.length === 0;
      for (const childIndex of node.children) {
        childIndicesValid = childIndicesValid && childIndex < tree.nodes.length;
      }
    }
  }

  const everyParticleStoredOnce =
    tree.insertedCount === particleCount && insertionCounts.every((count) => count === 1);
  const statisticsMatch =
    leafCount === tree.leafCount &&
    internalNodeCount === tree.internalNodeCount &&
    leafCount + internalNodeCount === tree.nodes.length;
  return {
    everyParticleStoredOnce,
    internalNodesEmpty,
    childIndicesValid,
    capacityHonored,
    statisticsMatch,
  };
}

export function createBruteSelectionWorkspace(): BruteSelectionWorkspace {
  return { hitIndices: [], scanned: 0 };
}

function queryNode(
  tree: Quadtree,
  particles: readonly ParticlePoint[],
  selection: SelectionBox,
  nodeIndex: number,
  workspace: QuadtreeQueryWorkspace,
) {
  const node = tree.nodes[nodeIndex];
  workspace.visitedNodeIndices.push(nodeIndex);
  workspace.visitedNodes += 1;
  if (!boxesOverlap(node.bounds, selection)) {
    workspace.prunedNodeIndices.push(nodeIndex);
    workspace.prunedNodes += 1;
    return;
  }

  if (node.children !== null) {
    for (const childIndex of node.children) {
      queryNode(tree, particles, selection, childIndex, workspace);
    }
    return;
  }

  workspace.visitedLeaves += 1;
  workspace.overlappingLeafIndices.push(nodeIndex);
  for (const particleIndex of node.particleIndices) {
    workspace.candidatesChecked += 1;
    if (pointInsideBox(particles[particleIndex], selection)) {
      workspace.hitIndices.push(particleIndex);
    }
  }
}

export function queryQuadtree(
  tree: Quadtree,
  particles: readonly ParticlePoint[],
  selection: SelectionBox,
  workspace: QuadtreeQueryWorkspace,
) {
  workspace.hitIndices.length = 0;
  workspace.visitedNodeIndices.length = 0;
  workspace.prunedNodeIndices.length = 0;
  workspace.overlappingLeafIndices.length = 0;
  workspace.visitedNodes = 0;
  workspace.prunedNodes = 0;
  workspace.visitedLeaves = 0;
  workspace.candidatesChecked = 0;
  if (tree.nodes.length === 0 || !validSelectionBox(selection)) return workspace;
  queryNode(tree, particles, selection, 0, workspace);
  return workspace;
}

export function querySelectionBruteForce(
  particles: readonly ParticlePoint[],
  selection: SelectionBox,
  workspace: BruteSelectionWorkspace,
) {
  workspace.hitIndices.length = 0;
  workspace.scanned = 0;
  if (!validSelectionBox(selection)) return workspace;
  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    workspace.scanned += 1;
    if (pointInsideBox(particles[particleIndex], selection)) {
      workspace.hitIndices.push(particleIndex);
    }
  }
  return workspace;
}

export function canonicalSelectionHits(indices: readonly number[]) {
  return [...indices].sort((a, b) => a - b);
}

export function quadtreeMatchesBruteForce(
  treeResult: QuadtreeQueryWorkspace,
  bruteResult: BruteSelectionWorkspace,
) {
  const treeHits = canonicalSelectionHits(treeResult.hitIndices);
  const bruteHits = canonicalSelectionHits(bruteResult.hitIndices);
  if (treeHits.length !== bruteHits.length) return false;
  return treeHits.every((value, index) => value === bruteHits[index]);
}

function updateChecksum(checksum: number, hitIndices: readonly number[]) {
  let queryHash = hitIndices.length >>> 0;
  for (const particleIndex of hitIndices) {
    queryHash = (queryHash + Math.imul(particleIndex + 1, 0x9e3779b1)) >>> 0;
  }
  let next = checksum ^ queryHash;
  next = Math.imul(next, 0x01000193) >>> 0;
  return next;
}

export function runQuadtreeSelectionBatch(
  tree: Quadtree,
  particles: readonly ParticlePoint[],
  selections: readonly SelectionBox[],
  repetitions: number,
): QuadtreeBatchMetrics {
  const workspace = createQuadtreeQueryWorkspace();
  const metrics: QuadtreeBatchMetrics = {
    queryCount: 0,
    totalVisitedNodes: 0,
    totalCandidates: 0,
    checksum: 0x811c9dc5,
  };
  for (let repetition = 0; repetition < Math.max(0, repetitions); repetition += 1) {
    for (const selection of selections) {
      queryQuadtree(tree, particles, selection, workspace);
      metrics.queryCount += 1;
      metrics.totalVisitedNodes += workspace.visitedNodes;
      metrics.totalCandidates += workspace.candidatesChecked;
      metrics.checksum = updateChecksum(metrics.checksum, workspace.hitIndices);
    }
  }
  return metrics;
}

export function runBruteSelectionBatch(
  particles: readonly ParticlePoint[],
  selections: readonly SelectionBox[],
  repetitions: number,
): BruteSelectionBatchMetrics {
  const workspace = createBruteSelectionWorkspace();
  const metrics: BruteSelectionBatchMetrics = {
    queryCount: 0,
    totalScanned: 0,
    checksum: 0x811c9dc5,
  };
  for (let repetition = 0; repetition < Math.max(0, repetitions); repetition += 1) {
    for (const selection of selections) {
      querySelectionBruteForce(particles, selection, workspace);
      metrics.queryCount += 1;
      metrics.totalScanned += workspace.scanned;
      metrics.checksum = updateChecksum(metrics.checksum, workspace.hitIndices);
    }
  }
  return metrics;
}

export function makeQuadtreeParticleCloud(
  count: number,
  bounds: ParticleBounds,
  seed: number,
  clustered: boolean,
) {
  const particles = makeParticleCloud(count, bounds, seed);
  if (!clustered) return particles;
  const width = bounds.maximum.x - bounds.minimum.x;
  const height = bounds.maximum.y - bounds.minimum.y;
  const anchors = [
    { x: 0.24, y: 0.27 },
    { x: 0.72, y: 0.66 },
    { x: 0.32, y: 0.79 },
  ];
  return particles.map((point, index) => {
    if (index % 5 === 0) return point;
    const anchor = anchors[index % anchors.length];
    const normalizedX = (point.x - bounds.minimum.x) / width;
    const normalizedY = (point.y - bounds.minimum.y) / height;
    return {
      x: bounds.minimum.x + (anchor.x + (normalizedX - 0.5) * 0.2) * width,
      y: bounds.minimum.y + (anchor.y + (normalizedY - 0.5) * 0.2) * height,
    };
  });
}

export function makeSelectionQueries(
  count: number,
  bounds: ParticleBounds,
  width: number,
  height: number,
  seed: number,
) {
  const centers = makeParticleCloud(count, bounds, seed);
  return centers.map((center) =>
    normalizeSelectionBox(
      { x: center.x - width * 0.5, y: center.y - height * 0.5 },
      { x: center.x + width * 0.5, y: center.y + height * 0.5 },
    ),
  );
}

export function makeQuadtreeCapacityStudy(
  particles: readonly ParticlePoint[],
  bounds: ParticleBounds,
  selections: readonly SelectionBox[],
  capacities: readonly number[],
  repetitions: number,
) {
  return capacities.map<QuadtreeCapacityStudyRow>((leafCapacity) => {
    const tree = buildQuadtree(particles, {
      bounds,
      leafCapacity,
      maximumDepth: 12,
      minimumNodeSize: 1 / 4096,
    });
    return {
      leafCapacity,
      nodeCount: tree.nodes.length,
      leafCount: tree.leafCount,
      maximumObservedDepth: tree.maximumObservedDepth,
      maximumLeafOccupancy: tree.maximumLeafOccupancy,
      rebuildMilliseconds: tree.rebuildMilliseconds,
      ...runQuadtreeSelectionBatch(tree, particles, selections, repetitions),
    };
  });
}
