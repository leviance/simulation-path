import {
  add,
  evaluate,
  finite,
  kineticEnergy,
  length,
  makeGas,
  minimumImage,
  momentum,
  scale,
  shiftedPair,
  subtract,
  validParameters,
  verletStep,
  wrapPosition,
  type Evaluation,
  type System,
  type Vec2,
} from "./periodic-molecular-box.ts";
export type { System, Vec2 } from "./periodic-molecular-box.ts";
export {
  makeGas,
  evaluate,
  kineticEnergy,
  momentum,
  length,
  add,
  subtract,
  minimumImage,
  wrapPosition,
} from "./periodic-molecular-box.ts";

export interface PairIndex {
  i: number;
  j: number;
}
export interface NeighborList {
  pairs: PairIndex[];
  reference: Vec2[];
  box: { width: number; height: number };
  cutoff: number;
  skin: number;
  generation: number;
  rebuilds: number;
  buildChecks: number;
  forceChecks: number;
  ready: boolean;
}
export function emptyList(): NeighborList {
  return {
    pairs: [],
    reference: [],
    box: { width: 0, height: 0 },
    cutoff: 0,
    skin: 0,
    generation: 0,
    rebuilds: 0,
    buildChecks: 0,
    forceChecks: 0,
    ready: false,
  };
}
export function validListParameters(system: System, skin: number) {
  return (
    validParameters(system.parameters, system.box) &&
    Number.isFinite(skin) &&
    skin > 0 &&
    system.parameters.cutoff + skin < 0.5 * Math.min(system.box.width, system.box.height)
  );
}
function validState(system: System) {
  return (
    system.particles.length > 0 &&
    system.particles.length <= 1000 &&
    system.particles.every(
      (p) =>
        finite(p.position) &&
        finite(p.unwrapped) &&
        finite(p.velocity) &&
        Number.isFinite(p.mass) &&
        p.mass > 0 &&
        p.position.x >= 0 &&
        p.position.x < system.box.width &&
        p.position.y >= 0 &&
        p.position.y < system.box.height,
    )
  );
}
function saveReference(system: System, skin: number, generation: number, list: NeighborList) {
  list.reference = system.particles.map((p) => ({ ...p.unwrapped }));
  list.box = { ...system.box };
  list.cutoff = system.parameters.cutoff;
  list.skin = skin;
  list.generation = generation;
  list.ready = true;
  list.rebuilds += 1;
}
export function rebuildNaive(system: System, skin: number, generation: number, list: NeighborList) {
  if (!validListParameters(system, skin) || !validState(system)) return false;
  list.pairs = [];
  const listRadius = system.parameters.cutoff + skin;
  for (let i = 0; i < system.particles.length; i += 1)
    for (let j = i + 1; j < system.particles.length; j += 1) {
      list.buildChecks += 1;
      const delta = minimumImage(
        subtract(system.particles[j].position, system.particles[i].position),
        system.box,
      );
      if (length(delta) < listRadius) list.pairs.push({ i, j });
    }
  saveReference(system, skin, generation, list);
  return true;
}
export function evaluateListed(system: System, list: NeighborList): Evaluation {
  const result: Evaluation = {
    valid: false,
    forces: system.particles.map(() => ({ x: 0, y: 0 })),
    potential: 0,
    evaluatedPairs: 0,
    activePairs: 0,
  };
  if (!validParameters(system.parameters, system.box) || !validState(system) || !list.ready)
    return result;
  for (const { i, j } of list.pairs) {
    if (
      !Number.isInteger(i) ||
      !Number.isInteger(j) ||
      i < 0 ||
      i >= j ||
      j >= system.particles.length
    )
      return result;
    result.evaluatedPairs += 1;
    const delta = minimumImage(
      subtract(system.particles[j].position, system.particles[i].position),
      system.box,
    );
    const distance = length(delta);
    if (!Number.isFinite(distance) || distance < 1e-6) return result;
    if (distance >= system.parameters.cutoff) continue;
    const sample = shiftedPair(distance, system.parameters);
    const force = scale(delta, sample.slope / distance);
    if (!finite(force) || !Number.isFinite(sample.potential)) return result;
    result.activePairs += 1;
    result.forces[i] = add(result.forces[i], force);
    result.forces[j] = subtract(result.forces[j], force);
    result.potential += sample.potential;
  }
  result.valid = Number.isFinite(result.potential) && result.forces.every(finite);
  return result;
}
export function maximumDisplacement(system: System, list: NeighborList) {
  if (list.reference.length !== system.particles.length) return Infinity;
  let maximum = 0;
  for (let i = 0; i < system.particles.length; i += 1) {
    const displacement = length(subtract(system.particles[i].unwrapped, list.reference[i]));
    if (!Number.isFinite(displacement)) return Infinity;
    maximum = Math.max(maximum, displacement);
  }
  return maximum;
}
export function needsRebuild(system: System, skin: number, generation: number, list: NeighborList) {
  if (
    !list.ready ||
    list.reference.length !== system.particles.length ||
    list.generation !== generation
  )
    return true;
  if (
    list.box.width !== system.box.width ||
    list.box.height !== system.box.height ||
    list.cutoff !== system.parameters.cutoff ||
    list.skin !== skin
  )
    return true;
  return maximumDisplacement(system, list) >= 0.5 * skin;
}
export function wrapCell(coordinate: number, count: number) {
  return ((coordinate % count) + count) % count;
}
export function rebuildGrid(system: System, skin: number, generation: number, list: NeighborList) {
  if (!validListParameters(system, skin) || !validState(system)) return false;
  const listRadius = system.parameters.cutoff + skin;
  const columns = Math.min(128, Math.floor(system.box.width / listRadius));
  const rows = Math.min(128, Math.floor(system.box.height / listRadius));
  const cellWidth = system.box.width / columns;
  const cellHeight = system.box.height / rows;
  const cells: number[][] = Array.from({ length: columns * rows }, () => []);
  const cellOf = (position: Vec2) => ({
    x: Math.min(columns - 1, Math.floor(position.x / cellWidth)),
    y: Math.min(rows - 1, Math.floor(position.y / cellHeight)),
  });
  for (let i = 0; i < system.particles.length; i += 1) {
    const cell = cellOf(system.particles[i].position);
    cells[cell.y * columns + cell.x].push(i);
  }
  list.pairs = [];
  for (let i = 0; i < system.particles.length; i += 1) {
    const position = system.particles[i].position;
    const center = cellOf(position);
    const visited: number[] = [];
    for (let offsetY = -1; offsetY <= 1; offsetY += 1)
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const cellId =
          wrapCell(center.y + offsetY, rows) * columns + wrapCell(center.x + offsetX, columns);
        if (visited.includes(cellId)) continue;
        visited.push(cellId);
        for (const j of cells[cellId]) {
          if (j <= i) continue;
          list.buildChecks += 1;
          const delta = minimumImage(subtract(system.particles[j].position, position), system.box);
          if (length(delta) < listRadius) list.pairs.push({ i, j });
        }
      }
  }
  list.pairs.sort((a, b) => a.i - b.i || a.j - b.j);
  saveReference(system, skin, generation, list);
  return true;
}
export function ensureList(
  system: System,
  skin: number,
  generation: number,
  list: NeighborList,
  grid = true,
) {
  if (!validListParameters(system, skin) || !validState(system)) return false;
  if (!needsRebuild(system, skin, generation, list)) return true;
  return grid
    ? rebuildGrid(system, skin, generation, list)
    : rebuildNaive(system, skin, generation, list);
}
export function cachedVerletStep(
  system: System,
  list: NeighborList,
  skin: number,
  generation: number,
  dt: number,
) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.01) return false;
  const candidate = structuredClone(system);
  const candidateList = structuredClone(list);
  if (!ensureList(candidate, skin, generation, candidateList)) return false;
  const before = evaluateListed(candidate, candidateList);
  candidateList.forceChecks += before.evaluatedPairs;
  if (!before.valid) return false;
  for (let i = 0; i < candidate.particles.length; i += 1) {
    const particle = candidate.particles[i];
    particle.velocity = add(particle.velocity, scale(before.forces[i], (0.5 * dt) / particle.mass));
    const displacement = scale(particle.velocity, dt);
    particle.unwrapped = add(particle.unwrapped, displacement);
    particle.position = wrapPosition(add(particle.position, displacement), candidate.box);
  }
  if (!ensureList(candidate, skin, generation, candidateList)) return false;
  const after = evaluateListed(candidate, candidateList);
  candidateList.forceChecks += after.evaluatedPairs;
  if (!after.valid) return false;
  for (let i = 0; i < candidate.particles.length; i += 1) {
    const particle = candidate.particles[i];
    particle.velocity = add(particle.velocity, scale(after.forces[i], (0.5 * dt) / particle.mass));
    if (!finite(particle.velocity)) return false;
  }
  candidate.elapsed += dt;
  if (!Number.isFinite(candidate.elapsed)) return false;
  Object.assign(system, candidate);
  Object.assign(list, candidateList);
  return true;
}
export function auditForces(system: System, list: NeighborList) {
  const reference = evaluate(system);
  const listed = evaluateListed(system, list);
  let missingPairs = 0;
  let forceError = 0;
  if (!reference.valid || !listed.valid)
    return { passed: false, missingPairs, forceError: Infinity, potentialError: Infinity };
  const keys = new Set(list.pairs.map((p) => `${p.i}:${p.j}`));
  for (let i = 0; i < system.particles.length; i += 1) {
    forceError = Math.max(forceError, length(subtract(reference.forces[i], listed.forces[i])));
    for (let j = i + 1; j < system.particles.length; j += 1) {
      if (
        length(
          minimumImage(
            subtract(system.particles[j].position, system.particles[i].position),
            system.box,
          ),
        ) < system.parameters.cutoff &&
        !keys.has(`${i}:${j}`)
      )
        missingPairs += 1;
    }
  }
  const potentialError = Math.abs(reference.potential - listed.potential);
  return {
    passed: missingPairs === 0 && forceError < 1e-8 && potentialError < 1e-8,
    missingPairs,
    forceError,
    potentialError,
  };
}
export function measureWork(count: number, skin: number, steps = 200) {
  const report = { passed: false, rebuilds: 0, buildChecks: 0, forceChecks: 0, allPairsChecks: 0 };
  if (
    !Number.isInteger(count) ||
    count < 4 ||
    count > 144 ||
    !Number.isInteger(steps) ||
    steps < 1 ||
    steps > 400
  )
    return report;
  const system = makeGas(count, 44);
  const list = emptyList();
  for (let step = 0; step < steps; step += 1)
    if (!cachedVerletStep(system, list, skin, 0, 0.002)) return report;
  return {
    passed: auditForces(system, list).passed,
    rebuilds: list.rebuilds,
    buildChecks: list.buildChecks,
    forceChecks: list.forceChecks,
    allPairsChecks: steps * count * (count - 1),
  };
}
export function validateNeighborList() {
  const fast = makeGas(36, 44);
  const reference = structuredClone(fast);
  const list = emptyList();
  const initialEnergy = kineticEnergy(fast) + evaluate(fast).potential;
  const initialMomentum = momentum(fast);
  let maximumEnergyError = 0;
  for (let step = 0; step < 200; step += 1) {
    if (
      !cachedVerletStep(fast, list, 0.4, 0, 0.002) ||
      !verletStep(reference, 0.002) ||
      !auditForces(fast, list).passed
    )
      return false;
    for (let i = 0; i < fast.particles.length; i += 1)
      if (
        length(subtract(fast.particles[i].unwrapped, reference.particles[i].unwrapped)) > 1e-8 ||
        length(subtract(fast.particles[i].velocity, reference.particles[i].velocity)) > 1e-8
      )
        return false;
    const energy = kineticEnergy(fast) + evaluate(fast).potential;
    maximumEnergyError = Math.max(
      maximumEnergyError,
      Math.abs(energy - initialEnergy) / Math.max(1, Math.abs(initialEnergy)),
    );
  }
  return maximumEnergyError < 0.01 && length(subtract(momentum(fast), initialMomentum)) < 1e-9;
}

// Ca nhỏ để kéo hai hạt từ ngoài listRadius vào force cutoff mà không dùng tích phân.
export function makeApproach(): System {
  const system = makeGas(4, 44);
  system.particles.length = 2;
  for (let i = 0; i < 2; i += 1) {
    system.particles[i].position = { x: 3 + 3.2 * i, y: 6 };
    system.particles[i].unwrapped = { ...system.particles[i].position };
    system.particles[i].velocity = { x: 0, y: 0 };
  }
  return system;
}
