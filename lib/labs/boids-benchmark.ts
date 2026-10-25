import {
  boidsCounts,
  defaultBoidsParams,
  fixedBoidsDt,
  makeFlock,
  stepBoids,
  type Boid,
  type BoidsMetrics,
  type BoidsParams,
} from "./boids.ts";

export interface BoidsBenchmarkRow {
  count: number;
  samples: number;
  comparisons: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  queryMs: number;
  updateMs: number;
  checksum: number;
}

export interface BoidsBenchmarkJob {
  active: boolean;
  row: number;
  warmup: number;
  samples: BoidsMetrics[];
  source: Boid[];
  params: BoidsParams;
  rows: BoidsBenchmarkRow[];
  checksum: number;
}

export function createBoidsBenchmark(seed: number, params = defaultBoidsParams): BoidsBenchmarkJob {
  return {
    active: true,
    row: 0,
    warmup: 0,
    samples: [],
    source: makeFlock(1024, seed, params),
    params: { ...params },
    rows: [],
    checksum: 0,
  };
}

export function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// Một bước đầy đủ mỗi tick: 2 warm-up + 7 samples × 3 N = 27 tick hữu hạn.
export function tickBoidsBenchmark(
  job: BoidsBenchmarkJob,
  now: () => number = () => performance.now(),
) {
  if (!job.active) return;
  const count = boidsCounts[job.row];
  const result = stepBoids(job.source.slice(0, count), job.params, fixedBoidsDt, 9, now);
  if (job.warmup < 2) {
    job.warmup++;
    return;
  }
  job.samples.push(result.metrics);
  let checksum = job.checksum;
  for (const boid of result.boids) {
    checksum =
      (checksum +
        Math.round(boid.position.x * 1000) +
        Math.round(boid.position.y * 1000) +
        boid.id) >>>
      0;
  }
  job.checksum = checksum;
  if (job.samples.length < 7) return;
  const timings = job.samples.map((sample) => sample.totalMs);
  job.rows.push({
    count,
    samples: job.samples.length,
    comparisons: result.metrics.comparisons,
    medianMs: median(timings),
    minMs: Math.min(...timings),
    maxMs: Math.max(...timings),
    queryMs: median(job.samples.map((sample) => sample.queryMs)),
    updateMs: median(job.samples.map((sample) => sample.updateMs)),
    checksum,
  });
  job.row++;
  job.samples = [];
  job.warmup = 0;
  if (job.row === boidsCounts.length) job.active = false;
}
