import { defaultBoidsParams, fixedBoidsDt, type Boid, type BoidsParams } from "./boids.ts";
import { buildBoidsGrid, queryBoidsGrid } from "./boids-grid.ts";
import {
  cancelGridBenchmark,
  tickGridBenchmark,
  type GridBenchmarkJob,
} from "./boids-grid-benchmark.ts";
import {
  createGridValidation,
  tickGridValidation,
  type GridValidationJob,
} from "./boids-grid-validation.ts";
import {
  advanceGridStep,
  cancelGridStep,
  completedGridStep,
  createGridStep,
  makeLargeFlock,
  type FlockLayout,
  type GridMethod,
  type GridStepJob,
  type GridStepMetrics,
} from "./boids-grid-step.ts";

export const boidsGridModes = [
  "grid-address",
  "grid-build",
  "grid-wrap",
  "grid-exact",
  "grid-flock",
  "grid-validation",
  "grid-density",
  "grid-batches",
  "grid-benchmark",
  "grid-final",
] as const;
export interface GridScene {
  stage: number;
  count: number;
  seed: number;
  params: BoidsParams;
  cellSize: number;
  layout: FlockLayout;
  method: GridMethod;
  boids: Boid[];
  selected: number;
  debug: boolean;
  showCells: boolean;
  showOccupancy: boolean;
  paused: boolean;
  steps: number;
  time: number;
  droppedSeconds: number;
  accumulator: number;
  job: GridStepJob | null;
  benchmark: GridBenchmarkJob | null;
  validation: GridValidationJob | null;
  metrics: GridStepMetrics | null;
  notice: string;
}
export function createGridScene(
  stage = 10,
  count = 256,
  seed = 1,
  params = defaultBoidsParams,
  cellSize = 64,
  layout: FlockLayout = "uniform",
): GridScene {
  if (!Number.isInteger(stage) || stage < 1 || stage > 10)
    throw new RangeError("Invalid lesson stage");
  if (![256, 1024, 10000].includes(count) || (stage < 8 && count > 1024))
    throw new RangeError("Count unavailable at this stage");
  const boids = makeLargeFlock(count, seed, params, layout);
  buildBoidsGrid(boids, params, cellSize);
  return {
    stage,
    count,
    seed,
    params: { ...params },
    cellSize,
    layout,
    method: stage >= 5 ? "grid" : "brute",
    boids,
    selected: 0,
    debug: true,
    showCells: true,
    showOccupancy: false,
    paused: true,
    steps: 0,
    time: 0,
    droppedSeconds: 0,
    accumulator: 0,
    job: null,
    benchmark: null,
    validation: null,
    metrics: null,
    notice: "Chưa chạy bước nào. Đàn được tạo lại bằng seed.",
  };
}

export function stopGridScene(scene: GridScene) {
  scene.paused = true;
  scene.accumulator = 0;
  if (scene.job) cancelGridStep(scene.job);
  scene.job = null;
  if (scene.benchmark?.active) cancelGridBenchmark(scene.benchmark);
  if (scene.validation) scene.validation.active = false;
}

export function requestGridStep(scene: GridScene) {
  stopGridScene(scene);
  scene.job = createGridStep(scene.boids, scene.params, scene.cellSize, scene.method);
}

export function advanceGridScene(scene: GridScene, elapsedSeconds = 0) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
    throw new RangeError("Invalid elapsed time");
  if (scene.benchmark?.active) {
    tickGridBenchmark(scene.benchmark);
    return;
  }
  if (scene.validation?.active) {
    tickGridValidation(scene.validation);
    return;
  }
  if (!scene.paused) {
    scene.accumulator += elapsedSeconds;
    if (scene.accumulator > fixedBoidsDt) {
      scene.droppedSeconds += scene.accumulator - fixedBoidsDt;
      scene.accumulator = fixedBoidsDt;
    }
    if (!scene.job && scene.accumulator + 1e-12 >= fixedBoidsDt)
      scene.job = createGridStep(scene.boids, scene.params, scene.cellSize, scene.method);
  }
  if (!scene.job) return;
  if (advanceGridStep(scene.job, 10000, 6)) {
    scene.boids = completedGridStep(scene.job);
    scene.metrics = { ...scene.job.metrics };
    scene.job = null;
    scene.time += fixedBoidsDt;
    scene.steps++;
    if (!scene.paused) scene.accumulator = Math.max(0, scene.accumulator - fixedBoidsDt);
  }
}

export function validateGridScene(scene: GridScene) {
  stopGridScene(scene);
  if (scene.boids.length > 1024) {
    scene.notice =
      "Chọn 256 hoặc 1.024 cá thể để đối chiếu toàn đàn với brute force. Không tự giảm N.";
    return;
  }
  scene.validation = createGridValidation(scene.boids, scene.params, scene.cellSize);
}

export function inspectGridScene(scene: GridScene) {
  const grid = buildBoidsGrid(scene.boids, scene.params, scene.cellSize);
  return { grid, query: queryBoidsGrid(scene.boids, scene.selected, scene.params, grid) };
}
