import {
  createParticleQueryWorkspace,
  makeParticleCloud,
  makeParticleProbeQueries,
  queryParticlesSquared,
  queryParticlesWithDistance,
  particleQueryResultsMatch,
  runParticleQueryBatch,
  type ParticlePoint,
  type ParticleQueryCircle,
  type ParticleQueryWorkspace,
  type ParticleBatchMetrics,
} from "./brute-force-particle-query.ts";

export const bruteCounts = [1000, 10_000, 100_000] as const;
export const bruteSeeds = [0x00c0ffee, 0x12345678, 0x31415926] as const;
export const bruteBounds = { minimum: { x: 0, y: 0 }, maximum: { x: 1, y: 1 } };
export const bruteModes = [
  "brute-scene",
  "brute-circle",
  "brute-scan",
  "brute-squared",
  "brute-benchmark",
  "brute-scaling",
  "brute-validation",
];
export function bruteStage(mode?: string) {
  const index = bruteModes.indexOf(mode ?? "");
  return index < 0 ? 7 : index + 1;
}
export interface BruteTiming extends ParticleBatchMetrics {
  elapsedMilliseconds: number;
}
export interface BruteRow extends BruteTiming {
  particleCount: number;
}
export interface BruteJob {
  active: boolean;
  scaling: boolean;
  row: number;
  warmup: number;
  cursor: number;
  probes: ParticleQueryCircle[];
  workspace: ParticleQueryWorkspace;
  metrics: BruteTiming;
}
export interface BruteScene {
  stage: number;
  count: number;
  seed: number;
  particles: ParticlePoint[];
  query: ParticleQueryCircle;
  result: ParticleQueryWorkspace;
  scanLimit: number;
  queryMilliseconds: number;
  referenceMatches: boolean;
  paused: boolean;
  phase: number;
  debug: boolean;
  benchmark: BruteTiming | null;
  rows: BruteRow[];
  job: BruteJob;
}
const metrics = (): BruteTiming => ({
  queryCount: 0,
  totalScanned: 0,
  totalHits: 0,
  checksum: 2166136261,
  elapsedMilliseconds: 0,
});
const job = (): BruteJob => ({
  active: false,
  scaling: false,
  row: 0,
  warmup: 0,
  cursor: 0,
  probes: [],
  workspace: createParticleQueryWorkspace(),
  metrics: metrics(),
});

export function refreshBrute(scene: BruteScene, now = () => performance.now()) {
  if (scene.stage < 3) {
    scene.result = createParticleQueryWorkspace();
    return;
  }
  const limit = Math.min(scene.count, scene.scanLimit);
  const started = now();
  if (scene.stage === 3)
    scene.result = queryParticlesWithDistance(scene.particles, scene.query, limit);
  else queryParticlesSquared(scene.particles, scene.query, scene.result, limit);
  scene.queryMilliseconds = Math.max(0, now() - started);
  if (scene.stage === 4)
    scene.referenceMatches = particleQueryResultsMatch(
      scene.result,
      queryParticlesWithDistance(scene.particles, scene.query, limit),
    );
}
export function makeBruteScene(stage = 7): BruteScene {
  const scene: BruteScene = {
    stage,
    count: 100_000,
    seed: bruteSeeds[0],
    particles: makeParticleCloud(100_000, bruteBounds, bruteSeeds[0]),
    query: { center: { x: 0.5, y: 0.5 }, radius: 0.08 },
    result: createParticleQueryWorkspace(),
    scanLimit: 100_000,
    queryMilliseconds: 0,
    referenceMatches: true,
    paused: true,
    phase: 0,
    debug: true,
    benchmark: null,
    rows: [],
    job: job(),
  };
  // Khởi tạo phải giống nhau trên server và client; chỉ đo đồng hồ sau khi mount.
  refreshBrute(scene, () => 0);
  return scene;
}
export function stopBrute(scene: BruteScene) {
  scene.paused = true;
  scene.job.active = false;
}
export function invalidateBrute(scene: BruteScene) {
  stopBrute(scene);
  scene.benchmark = null;
  scene.rows = [];
}
export function editBrute(
  scene: BruteScene,
  key: "count" | "seed" | "radius" | "scanLimit",
  value: number,
) {
  if (!Number.isFinite(value)) return;
  if (key === "count" && bruteCounts.includes(value as (typeof bruteCounts)[number])) {
    scene.count = value;
    scene.scanLimit = value;
    invalidateBrute(scene);
  }
  if (key === "seed" && bruteSeeds.includes(value as (typeof bruteSeeds)[number])) {
    scene.seed = value;
    scene.particles = makeParticleCloud(100_000, bruteBounds, value);
    invalidateBrute(scene);
  }
  if (key === "radius" && scene.stage >= 2) {
    scene.query = { ...scene.query, radius: Math.max(0, Math.min(0.35, value)) };
    invalidateBrute(scene);
  }
  if (key === "scanLimit" && scene.stage === 3)
    scene.scanLimit = Math.max(0, Math.min(scene.count, Math.trunc(value)));
  refreshBrute(scene);
}
export function moveBrute(scene: BruteScene, point: ParticlePoint) {
  if (scene.stage < 2 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
  scene.paused = true;
  scene.query = {
    ...scene.query,
    center: { x: Math.max(0, Math.min(1, point.x)), y: Math.max(0, Math.min(1, point.y)) },
  };
  refreshBrute(scene);
}
export function stepBrute(scene: BruteScene) {
  if (scene.stage === 3) {
    scene.scanLimit = Math.min(scene.count, scene.scanLimit + scene.count / 10);
  } else if (scene.stage >= 7) {
    scene.phase += 0.08;
    scene.query = {
      ...scene.query,
      center: {
        x: 0.5 + 0.33 * Math.cos(scene.phase),
        y: 0.5 + 0.28 * Math.sin(1.7 * scene.phase),
      },
    };
  }
  scene.paused = true;
  refreshBrute(scene);
}
export function requestBrute(scene: BruteScene, scaling: boolean) {
  if (scene.stage < (scaling ? 6 : 5)) return;
  invalidateBrute(scene);
  scene.job = job();
  scene.job.active = true;
  scene.job.scaling = scaling;
  scene.job.probes = makeParticleProbeQueries(
    24,
    bruteBounds,
    scene.query.radius,
    scene.seed ^ 0x9e3779b9,
  );
}
export function advanceBrute(scene: BruteScene, dt: number, now = () => performance.now()) {
  const task = scene.job;
  if (task.active) {
    const count = task.scaling ? bruteCounts[task.row] : scene.count;
    // Mỗi frame một query; tính checksum ngoài vùng đo thời gian.
    if (task.warmup < task.probes.length) {
      queryParticlesSquared(scene.particles, task.probes[task.warmup], task.workspace, count);
      task.warmup++;
    } else {
      const query = task.probes[task.cursor % task.probes.length];
      const started = now();
      queryParticlesSquared(scene.particles, query, task.workspace, count);
      task.metrics.elapsedMilliseconds += Math.max(0, now() - started);
      task.metrics.queryCount++;
      task.metrics.totalScanned += task.workspace.scanned;
      task.metrics.totalHits += task.workspace.hitIndices.length;
      let checksum =
        Math.imul(task.metrics.checksum ^ task.workspace.hitIndices.length, 16777619) >>> 0;
      checksum = Math.imul(checksum ^ (task.workspace.nearestIndex + 1), 16777619) >>> 0;
      for (const index of task.workspace.hitIndices)
        checksum = Math.imul(checksum ^ (index + 1), 16777619) >>> 0;
      task.metrics.checksum = checksum;
      task.cursor++;
      if (task.cursor === task.probes.length * 2) {
        if (task.scaling) scene.rows.push({ ...task.metrics, particleCount: count });
        else scene.benchmark = { ...task.metrics };
        task.row++;
        if (task.scaling && task.row < 3) {
          task.warmup = 0;
          task.cursor = 0;
          task.metrics = metrics();
        } else task.active = false;
      }
    }
  }
  if (scene.stage >= 7 && !scene.paused) {
    scene.phase += Math.max(0, Math.min(0.05, Number.isFinite(dt) ? dt : 0)) * 0.8;
    scene.query = {
      ...scene.query,
      center: {
        x: 0.5 + 0.33 * Math.cos(scene.phase),
        y: 0.5 + 0.28 * Math.sin(1.7 * scene.phase),
      },
    };
    refreshBrute(scene, now);
  }
}
export function bruteJobOracle(scene: BruteScene, count: number) {
  return runParticleQueryBatch(
    scene.particles,
    scene.job.probes,
    2,
    createParticleQueryWorkspace(),
    count,
  );
}
