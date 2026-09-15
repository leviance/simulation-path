import {
  evaluate,
  kineticEnergy,
  minimumImage,
  shiftedPair,
  wrapPosition,
  type System,
  type Vec2,
} from "./periodic-molecular-box.ts";

export { kineticEnergy, momentum } from "./periodic-molecular-box.ts";

export const CELL_CAPACITY = 16;
export const CUTOFF = 2.5;
export const SKIN = 0.4;
export const DT = 0.001;

export function memoryPlan(count: number) {
  if (!Number.isInteger(count) || count < 2 || count > 5_000_000)
    throw new Error("Số hạt phải nằm trong 2–5.000.000.");
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const width = Math.max(12, columns * 1.6);
  const height = Math.max(12, rows * 1.6);
  const cellsX = Math.floor(width / (CUTOFF + SKIN));
  const cellsY = Math.floor(height / (CUTOFF + SKIN));
  const cells = cellsX * cellsY;
  const particleBytes = count * 16;
  const indexBytes = cells * CELL_CAPACITY * 4;
  const reductionBytes = Math.ceil(count / 256) * 16;
  const residentBytes = 7 * particleBytes + indexBytes + cells * 4 + 2 * reductionBytes + 16;
  return {
    count,
    columns,
    rows,
    width,
    height,
    cellsX,
    cellsY,
    cells,
    particleBytes,
    indexBytes,
    reductionBytes,
    residentBytes,
    largestBlock: Math.max(particleBytes, indexBytes),
  };
}

function mixBits(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function initialSystem(count = 64): System {
  if (count > 144)
    throw new Error("Canvas chỉ mô phỏng tối đa 144 hạt, không cấp phát preset GPU.");
  const plan = memoryPlan(count);
  return {
    box: { width: plan.width, height: plan.height },
    parameters: { epsilon: 1, sigma: 1, cutoff: CUTOFF },
    elapsed: 0,
    particles: Array.from({ length: count }, (_, i) => {
      const bits = mixBits(Math.floor(i / 2) + 45);
      let vx = ((bits & 65535) / 65535 - 0.5) * 0.2;
      let vy = ((bits >>> 16) / 65535 - 0.5) * 0.2;
      if (i % 2 !== 0) {
        vx = -vx;
        vy = -vy;
      }
      if (count % 2 !== 0 && i + 1 === count) {
        vx = 0;
        vy = 0;
      }
      const position = {
        x: ((i % plan.columns) + 0.5) * 1.6,
        y: (Math.floor(i / plan.columns) + 0.5) * 1.6,
      };
      return { position, velocity: { x: vx, y: vy }, unwrapped: { ...position }, mass: 1 };
    }),
  };
}

export interface GridCache {
  cellsX: number;
  cellsY: number;
  buckets: number[][];
  reference: Vec2[];
  unwrapped: Vec2[];
  valid: boolean;
  maximumOccupancy: number;
}

export function buildGrid(system: System): GridCache {
  const cellsX = Math.floor(system.box.width / (CUTOFF + SKIN));
  const cellsY = Math.floor(system.box.height / (CUTOFF + SKIN));
  const buckets = Array.from({ length: cellsX * cellsY }, () => [] as number[]);
  for (const [i, particle] of system.particles.entries()) {
    const x = Math.min(cellsX - 1, Math.floor((particle.position.x / system.box.width) * cellsX));
    const y = Math.min(cellsY - 1, Math.floor((particle.position.y / system.box.height) * cellsY));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0)
      throw new Error("Vị trí không hợp lệ.");
    buckets[y * cellsX + x].push(i);
  }
  const maximumOccupancy = Math.max(...buckets.map((bucket) => bucket.length));
  return {
    cellsX,
    cellsY,
    buckets,
    reference: system.particles.map((p) => ({ ...p.position })),
    unwrapped: system.particles.map((p) => ({ ...p.unwrapped })),
    valid: maximumOccupancy <= CELL_CAPACITY,
    maximumOccupancy,
  };
}

export function neighborCellIds(grid: GridCache, box: System["box"], point: Vec2) {
  const x = Math.min(grid.cellsX - 1, Math.floor((point.x / box.width) * grid.cellsX));
  const y = Math.min(grid.cellsY - 1, Math.floor((point.y / box.height) * grid.cellsY));
  const result = new Set<number>();
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cellX = (x + dx + grid.cellsX) % grid.cellsX;
      const cellY = (y + dy + grid.cellsY) % grid.cellsY;
      result.add(cellY * grid.cellsX + cellX);
    }
  }
  return [...result];
}

export function maxDisplacement(system: System, grid: GridCache) {
  if (!grid.valid || grid.unwrapped.length !== system.particles.length) return Infinity;
  return Math.max(
    ...system.particles.map((p, i) =>
      Math.hypot(p.unwrapped.x - grid.unwrapped[i].x, p.unwrapped.y - grid.unwrapped[i].y),
    ),
  );
}

// Giống force.comp: invocation i chỉ ghi F[i], duyệt cặp hai lần và giữ U/2.
export function ownForces(system: System, grid?: GridCache) {
  if (grid && !grid.valid) throw new Error("Ô chứa hơn 16 hạt: không được dùng lực đã cắt bớt.");
  let potential = 0;
  let checks = 0;
  const forces = system.particles.map((particle, i) => {
    const force = { x: 0, y: 0 };
    const ids = grid
      ? neighborCellIds(grid, system.box, grid.reference[i]).flatMap((cell) => grid.buckets[cell])
      : system.particles.map((_, j) => j);
    for (const j of ids) {
      if (i === j) continue;
      checks += 1;
      const other = system.particles[j];
      const delta = minimumImage(
        { x: other.position.x - particle.position.x, y: other.position.y - particle.position.y },
        system.box,
      );
      const radius = Math.hypot(delta.x, delta.y);
      if (!Number.isFinite(radius) || radius < 0.5)
        throw new Error("Hai hạt quá gần hoặc dữ liệu không hữu hạn.");
      const value = shiftedPair(radius, system.parameters);
      force.x += (value.slope * delta.x) / radius;
      force.y += (value.slope * delta.y) / radius;
      potential += 0.5 * value.potential;
    }
    return force;
  });
  return { forces, potential, checks };
}

export const phases = ["Drift", "Kiểm skin / dựng grid", "Force", "Kick", "Reduction / commit"];
export interface Pipeline {
  system: System;
  candidate: System | null;
  grid: GridCache;
  force: ReturnType<typeof ownForces>;
  candidateForce: ReturnType<typeof ownForces> | null;
  phase: number;
  bank: number;
  steps: number;
  rebuilds: number;
  error: string;
  rebuilt: boolean;
  displacement: number;
}

export function createPipeline(count = 64): Pipeline {
  const system = initialSystem(count);
  const grid = buildGrid(system);
  return {
    system,
    candidate: null,
    grid,
    force: ownForces(system, grid),
    candidateForce: null,
    phase: 0,
    bank: 0,
    steps: 0,
    rebuilds: 1,
    error: "",
    rebuilt: false,
    displacement: 0,
  };
}

export function cancelPipeline(model: Pipeline) {
  model.candidate = null;
  model.candidateForce = null;
  model.phase = 0;
  model.grid = buildGrid(model.system);
  model.rebuilds += 1;
}

export function advancePipeline(model: Pipeline, reuse = true) {
  if (model.error) return;
  try {
    if (model.phase === 0) {
      const candidate = structuredClone(model.system);
      candidate.particles.forEach((p, i) => {
        p.velocity.x += 0.5 * DT * model.force.forces[i].x;
        p.velocity.y += 0.5 * DT * model.force.forces[i].y;
        const displacement = { x: DT * p.velocity.x, y: DT * p.velocity.y };
        if (Math.hypot(displacement.x, displacement.y) > 0.1)
          throw new Error("Drift vượt giới hạn; không nhận bước mới.");
        p.unwrapped.x += displacement.x;
        p.unwrapped.y += displacement.y;
        p.position = wrapPosition(
          { x: p.position.x + displacement.x, y: p.position.y + displacement.y },
          candidate.box,
        );
      });
      model.candidate = candidate;
      model.rebuilt = false;
    } else if (model.phase === 1 && model.candidate) {
      model.displacement = maxDisplacement(model.candidate, model.grid);
      if (!reuse || model.displacement >= SKIN / 2) {
        model.grid = buildGrid(model.candidate);
        model.rebuilt = true;
        model.rebuilds += 1;
      }
      if (!model.grid.valid) throw new Error("Overflow: hơn 16 hạt trong một ô.");
    } else if (model.phase === 2 && model.candidate) {
      model.candidateForce = ownForces(model.candidate, model.grid);
    } else if (model.phase === 3 && model.candidate && model.candidateForce) {
      model.candidate.particles.forEach((p, i) => {
        p.velocity.x += 0.5 * DT * model.candidateForce!.forces[i].x;
        p.velocity.y += 0.5 * DT * model.candidateForce!.forces[i].y;
      });
    } else if (model.phase === 4 && model.candidate && model.candidateForce) {
      const energy = kineticEnergy(model.candidate) + model.candidateForce.potential;
      if (!Number.isFinite(energy)) throw new Error("Reduction không hữu hạn.");
      model.candidate.elapsed += DT;
      model.system = model.candidate;
      model.force = model.candidateForce;
      model.candidate = null;
      model.candidateForce = null;
      model.bank = 1 - model.bank;
      model.steps += 1;
    }
    model.phase = (model.phase + 1) % phases.length;
  } catch (error) {
    model.error = error instanceof Error ? error.message : "Bước không hợp lệ.";
    cancelPipeline(model);
  }
}

export function auditPipeline(model: Pipeline) {
  const expected = evaluate(model.system);
  const actual = ownForces(model.system, buildGrid(model.system));
  const forceError = Math.max(
    ...expected.forces.map((force, i) =>
      Math.hypot(force.x - actual.forces[i].x, force.y - actual.forces[i].y),
    ),
  );
  return {
    forceError,
    potentialError: Math.abs(expected.potential - actual.potential),
    bruteChecks: model.system.particles.length * (model.system.particles.length - 1),
    gridChecks: actual.checks,
  };
}
