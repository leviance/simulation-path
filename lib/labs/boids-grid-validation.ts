import {
  computeSteering,
  findNeighbors,
  fixedBoidsDt,
  integrateBoid,
  type Boid,
  type BoidsParams,
} from "./boids.ts";
import { buildBoidsGrid, queryBoidsGrid, type BoidsGrid } from "./boids-grid.ts";

export interface GridValidationJob {
  snapshot: Boid[];
  params: BoidsParams;
  grid: BoidsGrid;
  checked: number;
  failures: number;
  active: boolean;
}

export function createGridValidation(
  flock: readonly Boid[],
  params: BoidsParams,
  cellSize: number,
): GridValidationJob {
  if (flock.length > 1024) throw new RangeError("Validate at most 1024 agents");
  const snapshot = flock.map((boid) => ({
    id: boid.id,
    position: { ...boid.position },
    velocity: { ...boid.velocity },
  }));
  return {
    snapshot,
    params: { ...params },
    grid: buildBoidsGrid(snapshot, params, cellSize),
    checked: 0,
    failures: 0,
    active: true,
  };
}

export function tickGridValidation(
  job: GridValidationJob,
  budgetMs = 6,
  now = () => performance.now(),
) {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0 || budgetMs > 1000)
    throw new RangeError("Invalid validation budget");
  if (!job.active) return;
  const start = now();
  while (job.checked < job.snapshot.length) {
    const index = job.checked;
    const gridNeighbors = queryBoidsGrid(job.snapshot, index, job.params, job.grid).neighbors;
    const bruteNeighbors = findNeighbors(job.snapshot, index, job.params);
    const ids = (indices: readonly number[]) =>
      indices.map((other) => job.snapshot[other].id).sort((a, b) => a - b);
    const gridIds = ids(gridNeighbors);
    const bruteIds = ids(bruteNeighbors);
    let equal =
      gridIds.length === bruteIds.length &&
      gridIds.every((id, position) => id === bruteIds[position]);
    const gridSteering = computeSteering(job.snapshot, index, gridNeighbors, job.params);
    const bruteSteering = computeSteering(job.snapshot, index, bruteNeighbors, job.params);
    for (const name of ["separation", "alignment", "cohesion", "acceleration"] as const) {
      for (const axis of ["x", "y"] as const)
        equal &&= Math.abs(gridSteering[name][axis] - bruteSteering[name][axis]) <= 1e-9;
    }
    const gridState = integrateBoid(
      job.snapshot[index],
      gridSteering.acceleration,
      job.params,
      fixedBoidsDt,
    );
    const bruteState = integrateBoid(
      job.snapshot[index],
      bruteSteering.acceleration,
      job.params,
      fixedBoidsDt,
    );
    for (const name of ["position", "velocity"] as const) {
      for (const axis of ["x", "y"] as const)
        equal &&= Math.abs(gridState[name][axis] - bruteState[name][axis]) <= 1e-9;
    }
    if (!equal) job.failures++;
    job.checked++;
    if (now() - start >= budgetMs) break;
  }
  if (job.checked === job.snapshot.length) job.active = false;
}
