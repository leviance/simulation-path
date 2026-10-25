import {
  computeSteering,
  findNeighbors,
  fixedBoidsDt,
  integrateBoid,
  makeFlock,
  validateBoids,
  type Boid,
  type BoidsParams,
} from "./boids.ts";
import { buildBoidsGrid, gridGeometry, queryBoidsGrid, type BoidsGrid } from "./boids-grid.ts";

export type GridMethod = "brute" | "grid";
export type FlockLayout = "uniform" | "clustered" | "dense";
export const largeFlockCounts = [256, 1024, 10000] as const;

export function makeLargeFlock(
  count: number,
  seed: number,
  params: BoidsParams,
  layout: FlockLayout = "uniform",
) {
  if (!["uniform", "clustered", "dense"].includes(layout)) throw new RangeError("Invalid layout");
  const flock = makeFlock(count, seed, params, 10000);
  for (const boid of flock) {
    if (layout === "clustered") {
      const side = boid.id % 2;
      boid.position = {
        x: params.width * (0.15 + side * 0.5) + boid.position.x * 0.2,
        y: params.height * 0.35 + boid.position.y * 0.2,
      };
    } else if (layout === "dense") {
      boid.position = {
        x: params.width * 0.507 + boid.position.x * 0.0001,
        y: params.height * 0.506 + boid.position.y * 0.0001,
      };
    }
  }
  return flock;
}

export interface GridStepMetrics {
  buildMs: number;
  queryMs: number;
  updateMs: number;
  totalMs: number;
  wallMs: number;
  candidates: number;
  neighbors: number;
  visitedCells: number;
  occupiedCells: number;
  maximumOccupancy: number;
}

export interface GridStepJob {
  snapshot: Boid[];
  params: BoidsParams;
  method: GridMethod;
  grid: BoidsGrid | null;
  output: Boid[];
  nextIndex: number;
  startedAt: number;
  cancelled: boolean;
  metrics: GridStepMetrics;
}

export function createGridStep(
  flock: readonly Boid[],
  params: BoidsParams,
  cellSize: number,
  method: GridMethod,
  now = () => performance.now(),
): GridStepJob {
  const start = now();
  if (method !== "brute" && method !== "grid") throw new RangeError("Invalid method");
  validateBoids(flock, params, 10000);
  gridGeometry(params, cellSize);
  if (method === "brute" && flock.length > 1024)
    throw new RangeError("Brute force is limited to 1024 boids");
  const snapshot = flock.map((boid) => ({
    id: boid.id,
    position: { ...boid.position },
    velocity: { ...boid.velocity },
  }));
  const frozenParams = { ...params };
  const buildStart = now();
  const grid = method === "grid" ? buildBoidsGrid(snapshot, frozenParams, cellSize) : null;
  const end = now();
  return {
    snapshot,
    params: frozenParams,
    method,
    grid,
    output: [],
    nextIndex: 0,
    startedAt: start,
    cancelled: false,
    metrics: {
      buildMs: grid ? end - buildStart : 0,
      queryMs: 0,
      updateMs: 0,
      totalMs: end - start,
      wallMs: 0,
      candidates: 0,
      neighbors: 0,
      visitedCells: 0,
      occupiedCells: grid?.occupiedCells ?? 0,
      maximumOccupancy: grid?.maximumOccupancy ?? 0,
    },
  };
}

// Kết quả chỉ được caller commit khi nextIndex === snapshot.length.
// Ngân sách chia thời gian CPU, không cắt bớt hàng xóm hay bỏ cá thể.
export function advanceGridStep(
  job: GridStepJob,
  maximumAgents = 10000,
  budgetMs = 6,
  now = () => performance.now(),
): boolean {
  if (
    !Number.isInteger(maximumAgents) ||
    maximumAgents < 1 ||
    maximumAgents > 10000 ||
    !Number.isFinite(budgetMs) ||
    budgetMs <= 0 ||
    budgetMs > 1000
  )
    throw new RangeError("Invalid batch budget");
  if (job.cancelled) return false;
  const start = now();
  const stopIndex = Math.min(job.snapshot.length, job.nextIndex + maximumAgents);
  while (job.nextIndex < stopIndex) {
    const index = job.nextIndex;
    const queryStart = now();
    const query = job.grid ? queryBoidsGrid(job.snapshot, index, job.params, job.grid) : null;
    const neighbors = query?.neighbors ?? findNeighbors(job.snapshot, index, job.params);
    const queryEnd = now();
    job.metrics.queryMs += queryEnd - queryStart;
    job.metrics.candidates += query?.candidates.length ?? job.snapshot.length - 1;
    job.metrics.neighbors += neighbors.length;
    job.metrics.visitedCells += query?.cells.length ?? 0;
    const steering = computeSteering(job.snapshot, index, neighbors, job.params);
    job.output.push(
      integrateBoid(job.snapshot[index], steering.acceleration, job.params, fixedBoidsDt),
    );
    job.metrics.updateMs += now() - queryEnd;
    job.nextIndex++;
    if (now() - start >= budgetMs) break;
  }
  job.metrics.totalMs += now() - start;
  job.metrics.wallMs = now() - job.startedAt;
  return job.nextIndex === job.snapshot.length;
}

export function cancelGridStep(job: GridStepJob) {
  job.cancelled = true;
  job.output = [];
}

export function completedGridStep(job: GridStepJob): Boid[] {
  if (job.cancelled || job.nextIndex !== job.snapshot.length)
    throw new Error("Step is not complete");
  return job.output;
}
