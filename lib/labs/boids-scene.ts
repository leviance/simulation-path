import {
  defaultBoidsParams,
  fixedBoidsDt,
  makeFlock,
  stepBoids,
  type Boid,
  type BoidsMetrics,
  type BoidsParams,
} from "./boids.ts";
import { tickBoidsBenchmark, type BoidsBenchmarkJob } from "./boids-benchmark.ts";

export const boidsModes = [
  "boids-motion",
  "boids-flock",
  "boids-neighbors",
  "boids-separation",
  "boids-alignment",
  "boids-cohesion",
  "boids-integration",
  "boids-benchmark",
  "boids-validation",
] as const;

export interface BoidsScene {
  stage: number;
  params: BoidsParams;
  count: number;
  seed: number;
  boids: Boid[];
  selected: number;
  paused: boolean;
  debug: boolean;
  time: number;
  accumulator: number;
  droppedSeconds: number;
  steps: number;
  metrics: BoidsMetrics;
  job: BoidsBenchmarkJob | null;
}

// React nhận một ảnh chụp riêng; vòng rAF không sửa sâu state đã được publish.
export function snapshotBoidsScene(scene: BoidsScene): BoidsScene {
  return {
    ...scene,
    params: { ...scene.params },
    boids: scene.boids.map((boid) => ({
      ...boid,
      position: { ...boid.position },
      velocity: { ...boid.velocity },
    })),
    metrics: { ...scene.metrics },
    job: scene.job
      ? {
          ...scene.job,
          params: { ...scene.job.params },
          rows: scene.job.rows.map((row) => ({ ...row })),
          samples: scene.job.samples.map((sample) => ({ ...sample })),
        }
      : null,
  };
}

export function createBoidsScene(
  stage = 9,
  count = 256,
  seed = 1,
  configuration = defaultBoidsParams,
): BoidsScene {
  const params = { ...configuration };
  const size = stage === 1 ? 1 : count;
  const boids =
    stage === 1
      ? [{ id: 0, position: { x: 240, y: 300 }, velocity: { x: params.maxSpeed * 0.6, y: 0 } }]
      : makeFlock(size, seed, params);
  return {
    stage,
    params,
    count: size,
    seed,
    boids,
    selected: 0,
    paused: true,
    debug: true,
    time: 0,
    accumulator: 0,
    droppedSeconds: 0,
    steps: 0,
    metrics: { comparisons: 0, neighbors: 0, queryMs: 0, updateMs: 0, totalMs: 0 },
    job: null,
  };
}

export function stepBoidsScene(scene: BoidsScene) {
  const result = stepBoids(scene.boids, scene.params, fixedBoidsDt, scene.stage);
  scene.boids = result.boids;
  scene.metrics = result.metrics;
  scene.time += fixedBoidsDt;
  scene.steps++;
}

export function stopBoidsScene(scene: BoidsScene) {
  scene.paused = true;
  scene.accumulator = 0;
  if (scene.job) scene.job.active = false;
}

export function advanceBoidsScene(scene: BoidsScene, elapsedSeconds: number) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return;
  if (scene.job?.active) {
    tickBoidsBenchmark(scene.job);
    return;
  }
  if (scene.paused) return;
  scene.accumulator += elapsedSeconds;
  const budget = 3 * fixedBoidsDt;
  if (scene.accumulator > budget) {
    scene.droppedSeconds += scene.accumulator - budget;
    scene.accumulator = budget;
  }
  for (let count = 0; count < 3 && scene.accumulator + 1e-12 >= fixedBoidsDt; count++) {
    stepBoidsScene(scene);
    scene.accumulator -= fixedBoidsDt;
  }
  scene.accumulator = Math.max(0, scene.accumulator);
}
