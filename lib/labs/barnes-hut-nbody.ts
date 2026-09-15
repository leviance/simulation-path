export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Body3D {
  position: Vec3;
  velocity: Vec3;
  mass: number;
}

export interface Bounds3D {
  minimum: Vec3;
  maximum: Vec3;
}

export interface BarnesHutConfig {
  leafCapacity: number;
  maximumDepth: number;
  minimumNodeSize: number;
}

export type BarnesHutChildren = [number, number, number, number, number, number, number, number];

export interface BarnesHutNode {
  bounds: Bounds3D;
  depth: number;
  bodyIndices: number[];
  children: BarnesHutChildren | null;
  totalMass: number;
  centerOfMass: Vec3;
}

export interface BarnesHutTree {
  nodes: BarnesHutNode[];
  bodyCount: number;
  leafCount: number;
  internalNodeCount: number;
  maximumObservedDepth: number;
  maximumLeafOccupancy: number;
}

export interface ForceMetrics {
  visitedNodes: number;
  approximatedNodes: number;
  exactInteractions: number;
}

export interface AccelerationResult extends ForceMetrics {
  acceleration: Vec3;
}

export interface BarnesHutTopologyReport {
  everyBodyStoredOnce: boolean;
  internalNodesEmpty: boolean;
  childIndicesValid: boolean;
  childBoundsValid: boolean;
  aggregateMassValid: boolean;
  centerOfMassValid: boolean;
  statisticsMatch: boolean;
}

export interface AccuracyRow {
  theta: number;
  meanRelativeError: number;
  maximumRelativeError: number;
  visitedNodes: number;
  approximatedNodes: number;
  exactInteractions: number;
}

export interface SystemDiagnostics {
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentum: Vec3;
  centerOfMass: Vec3;
}

const ZERO: Vec3 = { x: 0, y: 0, z: 0 };
const MAXIMUM_NODE_COUNT = 1_000_000;

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function lengthSquared(vector: Vec3) {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

function length(vector: Vec3) {
  return Math.sqrt(lengthSquared(vector));
}

function finiteVector(vector: Vec3) {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

class XorShift32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  unit() {
    return this.next() / 0xffffffff;
  }
}

export function makeGalaxyBodies(count: number, seed: number): Body3D[] {
  const safeCount = Math.max(1, Math.floor(count));
  const random = new XorShift32(seed);
  const bodies: Body3D[] = [
    {
      position: { ...ZERO },
      velocity: { ...ZERO },
      mass: 120,
    },
  ];

  for (let index = 1; index < safeCount; index += 1) {
    const radius = 0.08 + Math.sqrt(random.unit()) * 0.9;
    const angle = random.unit() * Math.PI * 2;
    const thickness = (random.unit() - 0.5) * 0.08 * (1.1 - radius);
    const mass = 0.35 + random.unit() * 1.3;
    const orbitalSpeed = Math.sqrt((120 + index * 0.45) / Math.max(radius, 0.04)) * 0.055;
    const speedJitter = 0.92 + random.unit() * 0.16;
    bodies.push({
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: thickness,
      },
      velocity: {
        x: -Math.sin(angle) * orbitalSpeed * speedJitter,
        y: Math.cos(angle) * orbitalSpeed * speedJitter,
        z: (random.unit() - 0.5) * 0.01,
      },
      mass,
    });
  }

  let momentum = { ...ZERO };
  for (const body of bodies) momentum = add(momentum, scale(body.velocity, body.mass));
  bodies[0].velocity = scale(momentum, -1 / bodies[0].mass);
  return bodies;
}

export function cubicBoundsForBodies(bodies: readonly Body3D[]): Bounds3D {
  if (bodies.length === 0) {
    return { minimum: { x: -1, y: -1, z: -1 }, maximum: { x: 1, y: 1, z: 1 } };
  }
  let minimum = { ...bodies[0].position };
  let maximum = { ...bodies[0].position };
  for (const body of bodies.slice(1)) {
    minimum = {
      x: Math.min(minimum.x, body.position.x),
      y: Math.min(minimum.y, body.position.y),
      z: Math.min(minimum.z, body.position.z),
    };
    maximum = {
      x: Math.max(maximum.x, body.position.x),
      y: Math.max(maximum.y, body.position.y),
      z: Math.max(maximum.z, body.position.z),
    };
  }
  const center = scale(add(minimum, maximum), 0.5);
  const halfExtent =
    Math.max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z) * 0.505 + 1e-6;
  return {
    minimum: { x: center.x - halfExtent, y: center.y - halfExtent, z: center.z - halfExtent },
    maximum: { x: center.x + halfExtent, y: center.y + halfExtent, z: center.z + halfExtent },
  };
}

export function pointInsideBounds(point: Vec3, bounds: Bounds3D) {
  return (
    point.x >= bounds.minimum.x &&
    point.x <= bounds.maximum.x &&
    point.y >= bounds.minimum.y &&
    point.y <= bounds.maximum.y &&
    point.z >= bounds.minimum.z &&
    point.z <= bounds.maximum.z
  );
}

export function barnesHutOctant(point: Vec3, bounds: Bounds3D) {
  const middle = scale(add(bounds.minimum, bounds.maximum), 0.5);
  let octant = 0;
  if (point.x >= middle.x) octant |= 1;
  if (point.y >= middle.y) octant |= 2;
  if (point.z >= middle.z) octant |= 4;
  return octant;
}

export function barnesHutChildBounds(bounds: Bounds3D, octant: number): Bounds3D {
  const middle = scale(add(bounds.minimum, bounds.maximum), 0.5);
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

function nodeCanSplit(node: BarnesHutNode, config: BarnesHutConfig) {
  const side = node.bounds.maximum.x - node.bounds.minimum.x;
  return node.depth < config.maximumDepth && side * 0.5 >= config.minimumNodeSize;
}

function emptyNode(bounds: Bounds3D, depth: number): BarnesHutNode {
  return {
    bounds,
    depth,
    bodyIndices: [],
    children: null,
    totalMass: 0,
    centerOfMass: { ...ZERO },
  };
}

function insertBody(
  nodes: BarnesHutNode[],
  bodies: readonly Body3D[],
  bodyIndex: number,
  nodeIndex: number,
  config: BarnesHutConfig,
) {
  const existingChildren = nodes[nodeIndex].children;
  if (existingChildren !== null) {
    const octant = barnesHutOctant(bodies[bodyIndex].position, nodes[nodeIndex].bounds);
    insertBody(nodes, bodies, bodyIndex, existingChildren[octant], config);
    return;
  }

  const node = nodes[nodeIndex];
  if (
    node.bodyIndices.length < config.leafCapacity ||
    !nodeCanSplit(node, config) ||
    nodes.length + 8 > MAXIMUM_NODE_COUNT
  ) {
    node.bodyIndices.push(bodyIndex);
    return;
  }

  const oldIndices = [...node.bodyIndices, bodyIndex];
  node.bodyIndices = [];
  const firstChildIndex = nodes.length;
  const childIndices = Array.from({ length: 8 }, (_, octant) => {
    nodes.push(emptyNode(barnesHutChildBounds(node.bounds, octant), node.depth + 1));
    return firstChildIndex + octant;
  }) as BarnesHutChildren;
  nodes[nodeIndex].children = childIndices;

  for (const oldIndex of oldIndices) {
    const octant = barnesHutOctant(bodies[oldIndex].position, nodes[nodeIndex].bounds);
    insertBody(nodes, bodies, oldIndex, childIndices[octant], config);
  }
}

function accumulateNode(nodes: BarnesHutNode[], bodies: readonly Body3D[], nodeIndex: number) {
  const node = nodes[nodeIndex];
  let totalMass = 0;
  let weightedPosition = { ...ZERO };
  if (node.children === null) {
    for (const bodyIndex of node.bodyIndices) {
      const body = bodies[bodyIndex];
      totalMass += body.mass;
      weightedPosition = add(weightedPosition, scale(body.position, body.mass));
    }
  } else {
    for (const childIndex of node.children) {
      accumulateNode(nodes, bodies, childIndex);
      const child = nodes[childIndex];
      totalMass += child.totalMass;
      weightedPosition = add(weightedPosition, scale(child.centerOfMass, child.totalMass));
    }
  }
  node.totalMass = totalMass;
  node.centerOfMass = totalMass > 0 ? scale(weightedPosition, 1 / totalMass) : { ...ZERO };
}

export function buildMassOctree(
  bodies: readonly Body3D[],
  config: BarnesHutConfig = { leafCapacity: 1, maximumDepth: 16, minimumNodeSize: 1e-6 },
): BarnesHutTree {
  const nodes = [emptyNode(cubicBoundsForBodies(bodies), 0)];
  for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
    insertBody(nodes, bodies, bodyIndex, 0, config);
  }
  accumulateNode(nodes, bodies, 0);

  let leafCount = 0;
  let internalNodeCount = 0;
  let maximumObservedDepth = 0;
  let maximumLeafOccupancy = 0;
  for (const node of nodes) {
    maximumObservedDepth = Math.max(maximumObservedDepth, node.depth);
    if (node.children === null) {
      leafCount += 1;
      maximumLeafOccupancy = Math.max(maximumLeafOccupancy, node.bodyIndices.length);
    } else {
      internalNodeCount += 1;
    }
  }
  return {
    nodes,
    bodyCount: bodies.length,
    leafCount,
    internalNodeCount,
    maximumObservedDepth,
    maximumLeafOccupancy,
  };
}

export function softenedAcceleration(
  targetPosition: Vec3,
  sourcePosition: Vec3,
  sourceMass: number,
  gravitationalConstant: number,
  softening: number,
) {
  const displacement = subtract(sourcePosition, targetPosition);
  const softenedDistanceSquared = lengthSquared(displacement) + softening * softening;
  if (softenedDistanceSquared <= 0 || sourceMass <= 0) return { ...ZERO };
  const inverseDistanceCubed = 1 / Math.pow(softenedDistanceSquared, 1.5);
  return scale(displacement, gravitationalConstant * sourceMass * inverseDistanceCubed);
}

export function directAcceleration(
  bodies: readonly Body3D[],
  targetIndex: number,
  gravitationalConstant: number,
  softening: number,
): AccelerationResult {
  let acceleration = { ...ZERO };
  let exactInteractions = 0;
  for (let sourceIndex = 0; sourceIndex < bodies.length; sourceIndex += 1) {
    if (sourceIndex === targetIndex) continue;
    acceleration = add(
      acceleration,
      softenedAcceleration(
        bodies[targetIndex].position,
        bodies[sourceIndex].position,
        bodies[sourceIndex].mass,
        gravitationalConstant,
        softening,
      ),
    );
    exactInteractions += 1;
  }
  return { acceleration, visitedNodes: 0, approximatedNodes: 0, exactInteractions };
}

export function barnesHutAcceleration(
  tree: BarnesHutTree,
  bodies: readonly Body3D[],
  targetIndex: number,
  theta: number,
  gravitationalConstant: number,
  softening: number,
): AccelerationResult {
  const metrics: AccelerationResult = {
    acceleration: { ...ZERO },
    visitedNodes: 0,
    approximatedNodes: 0,
    exactInteractions: 0,
  };
  const target = bodies[targetIndex];
  if (!target || tree.nodes.length === 0) return metrics;

  const visit = (nodeIndex: number) => {
    const node = tree.nodes[nodeIndex];
    metrics.visitedNodes += 1;
    if (node.totalMass <= 0) return;

    if (node.children === null) {
      for (const sourceIndex of node.bodyIndices) {
        if (sourceIndex === targetIndex) continue;
        metrics.acceleration = add(
          metrics.acceleration,
          softenedAcceleration(
            target.position,
            bodies[sourceIndex].position,
            bodies[sourceIndex].mass,
            gravitationalConstant,
            softening,
          ),
        );
        metrics.exactInteractions += 1;
      }
      return;
    }

    const displacement = subtract(node.centerOfMass, target.position);
    const distanceToCenter = length(displacement);
    const nodeSize = node.bounds.maximum.x - node.bounds.minimum.x;
    const containsTarget = pointInsideBounds(target.position, node.bounds);
    if (!containsTarget && distanceToCenter > 0 && nodeSize / distanceToCenter < theta) {
      metrics.acceleration = add(
        metrics.acceleration,
        softenedAcceleration(
          target.position,
          node.centerOfMass,
          node.totalMass,
          gravitationalConstant,
          softening,
        ),
      );
      metrics.approximatedNodes += 1;
      return;
    }

    for (const childIndex of node.children) visit(childIndex);
  };

  visit(0);
  return metrics;
}

export function inspectMassOctree(
  tree: BarnesHutTree,
  bodies: readonly Body3D[],
): BarnesHutTopologyReport {
  const insertionCounts = Array.from({ length: bodies.length }, () => 0);
  let internalNodesEmpty = true;
  let childIndicesValid = true;
  let childBoundsValid = true;
  let aggregateMassValid = true;
  let centerOfMassValid = true;
  let countedLeaves = 0;
  let countedInternalNodes = 0;
  const tolerance = 1e-9;

  for (let nodeIndex = 0; nodeIndex < tree.nodes.length; nodeIndex += 1) {
    const node = tree.nodes[nodeIndex];
    if (node.children === null) {
      countedLeaves += 1;
      for (const bodyIndex of node.bodyIndices) {
        if (bodyIndex >= bodies.length) childIndicesValid = false;
        else insertionCounts[bodyIndex] += 1;
      }
      continue;
    }

    countedInternalNodes += 1;
    internalNodesEmpty = internalNodesEmpty && node.bodyIndices.length === 0;
    let childMass = 0;
    let weightedCenter = { ...ZERO };
    for (let octant = 0; octant < 8; octant += 1) {
      const childIndex = node.children[octant];
      if (childIndex >= tree.nodes.length) {
        childIndicesValid = false;
        continue;
      }
      const child = tree.nodes[childIndex];
      const expected = barnesHutChildBounds(node.bounds, octant);
      childBoundsValid =
        childBoundsValid &&
        Math.abs(child.bounds.minimum.x - expected.minimum.x) <= tolerance &&
        Math.abs(child.bounds.minimum.y - expected.minimum.y) <= tolerance &&
        Math.abs(child.bounds.minimum.z - expected.minimum.z) <= tolerance &&
        Math.abs(child.bounds.maximum.x - expected.maximum.x) <= tolerance &&
        Math.abs(child.bounds.maximum.y - expected.maximum.y) <= tolerance &&
        Math.abs(child.bounds.maximum.z - expected.maximum.z) <= tolerance;
      childMass += child.totalMass;
      weightedCenter = add(weightedCenter, scale(child.centerOfMass, child.totalMass));
    }
    aggregateMassValid = aggregateMassValid && Math.abs(childMass - node.totalMass) <= tolerance;
    if (childMass > 0) {
      const expectedCenter = scale(weightedCenter, 1 / childMass);
      centerOfMassValid =
        centerOfMassValid && length(subtract(expectedCenter, node.centerOfMass)) <= tolerance;
    }
  }

  return {
    everyBodyStoredOnce: insertionCounts.every((count) => count === 1),
    internalNodesEmpty,
    childIndicesValid,
    childBoundsValid,
    aggregateMassValid,
    centerOfMassValid,
    statisticsMatch:
      countedLeaves === tree.leafCount &&
      countedInternalNodes === tree.internalNodeCount &&
      countedLeaves + countedInternalNodes === tree.nodes.length,
  };
}

export function measureThetaAccuracy(
  bodies: readonly Body3D[],
  thetaValues: readonly number[],
  sampleCount: number,
  gravitationalConstant: number,
  softening: number,
): AccuracyRow[] {
  const tree = buildMassOctree(bodies);
  const count = Math.min(Math.max(1, Math.floor(sampleCount)), bodies.length);
  const targets = Array.from({ length: count }, (_, index) =>
    Math.min(bodies.length - 1, Math.floor((index * bodies.length) / count)),
  );
  const exact = targets.map((targetIndex) =>
    directAcceleration(bodies, targetIndex, gravitationalConstant, softening),
  );

  return thetaValues.map((theta) => {
    let totalRelativeError = 0;
    let maximumRelativeError = 0;
    let visitedNodes = 0;
    let approximatedNodes = 0;
    let exactInteractions = 0;
    targets.forEach((targetIndex, sampleIndex) => {
      const approximate = barnesHutAcceleration(
        tree,
        bodies,
        targetIndex,
        theta,
        gravitationalConstant,
        softening,
      );
      const difference = length(
        subtract(approximate.acceleration, exact[sampleIndex].acceleration),
      );
      const relativeError = difference / Math.max(length(exact[sampleIndex].acceleration), 1e-12);
      totalRelativeError += relativeError;
      maximumRelativeError = Math.max(maximumRelativeError, relativeError);
      visitedNodes += approximate.visitedNodes;
      approximatedNodes += approximate.approximatedNodes;
      exactInteractions += approximate.exactInteractions;
    });
    return {
      theta,
      meanRelativeError: totalRelativeError / count,
      maximumRelativeError,
      visitedNodes,
      approximatedNodes,
      exactInteractions,
    };
  });
}

export function stepBodiesSymplecticEuler(
  bodies: readonly Body3D[],
  deltaSeconds: number,
  theta: number,
  gravitationalConstant: number,
  softening: number,
  useBarnesHut: boolean,
): Body3D[] {
  const tree = useBarnesHut ? buildMassOctree(bodies) : null;
  const accelerations = bodies.map((_, targetIndex) => {
    if (tree) {
      return barnesHutAcceleration(
        tree,
        bodies,
        targetIndex,
        theta,
        gravitationalConstant,
        softening,
      ).acceleration;
    }
    return directAcceleration(bodies, targetIndex, gravitationalConstant, softening).acceleration;
  });
  return bodies.map((body, index) => {
    const velocity = add(body.velocity, scale(accelerations[index], deltaSeconds));
    return {
      position: add(body.position, scale(velocity, deltaSeconds)),
      velocity,
      mass: body.mass,
    };
  });
}

export function systemDiagnostics(
  bodies: readonly Body3D[],
  gravitationalConstant: number,
  softening: number,
): SystemDiagnostics {
  let totalMass = 0;
  let weightedPosition = { ...ZERO };
  let momentum = { ...ZERO };
  let kineticEnergy = 0;
  let potentialEnergy = 0;
  for (const body of bodies) {
    totalMass += body.mass;
    weightedPosition = add(weightedPosition, scale(body.position, body.mass));
    momentum = add(momentum, scale(body.velocity, body.mass));
    kineticEnergy += 0.5 * body.mass * lengthSquared(body.velocity);
  }
  for (let first = 0; first < bodies.length; first += 1) {
    for (let second = first + 1; second < bodies.length; second += 1) {
      const distance = Math.sqrt(
        lengthSquared(subtract(bodies[second].position, bodies[first].position)) +
          softening * softening,
      );
      potentialEnergy -=
        (gravitationalConstant * bodies[first].mass * bodies[second].mass) /
        Math.max(distance, 1e-12);
    }
  }
  return {
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
    momentum,
    centerOfMass: totalMass > 0 ? scale(weightedPosition, 1 / totalMass) : { ...ZERO },
  };
}

export function allFiniteBodies(bodies: readonly Body3D[]) {
  return bodies.every(
    (body) => finiteVector(body.position) && finiteVector(body.velocity) && body.mass > 0,
  );
}
