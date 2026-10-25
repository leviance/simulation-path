import { type Boid, type BoidsParams } from "./boids.ts";
import {
  advanceGridStep,
  createGridStep,
  makeLargeFlock,
  type FlockLayout,
  type GridMethod,
  type GridStepJob,
  type GridStepMetrics,
} from "./boids-grid-step.ts";

export interface GridBenchmarkCase {
  count: number;
  cellSize: number;
  method: GridMethod;
  layout: FlockLayout;
}
export interface GridBenchmarkRow extends GridBenchmarkCase {
  samples: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  buildMs: number;
  queryMs: number;
  updateMs: number;
  candidates: number;
  neighbors: number;
  checksum: number;
}
export interface GridBenchmarkJob {
  cases: GridBenchmarkCase[];
  params: BoidsParams;
  seed: number;
  active: boolean;
  row: number;
  iteration: number;
  input: Boid[];
  step: GridStepJob | null;
  samples: GridStepMetrics[];
  rows: GridBenchmarkRow[];
  checksum: number;
}

export function createGridBenchmark(
  params: BoidsParams,
  seed: number,
  cellSize: number,
  layout: FlockLayout,
  plan: "scale" | "cells",
): GridBenchmarkJob {
  const cases: GridBenchmarkCase[] = [];
  if (plan === "scale") {
    for (const count of [256, 1024, 10000]) {
      if (count <= 1024) cases.push({ count, cellSize, layout: "uniform", method: "brute" });
      cases.push({ count, cellSize, layout: "uniform", method: "grid" });
    }
  } else if (plan === "cells") {
    cases.push({ count: 1024, cellSize, layout, method: "brute" });
    for (const size of [16, 32, 64, 100, 128, 240])
      cases.push({ count: 1024, cellSize: size, layout, method: "grid" });
  } else throw new RangeError("Invalid benchmark plan");
  return {
    cases,
    params: { ...params },
    seed,
    active: true,
    row: 0,
    iteration: 0,
    input: [],
    step: null,
    samples: [],
    rows: [],
    checksum: 0,
  };
}

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

// Mỗi tick chỉ làm tối đa một lát CPU, không ép hoàn tất một bước lớn.
export function tickGridBenchmark(job: GridBenchmarkJob, now = () => performance.now()) {
  if (!job.active) return;
  const current = job.cases[job.row];
  if (!job.step) {
    if (job.input.length === 0)
      job.input = makeLargeFlock(current.count, job.seed, job.params, current.layout);
    job.step = createGridStep(job.input, job.params, current.cellSize, current.method, now);
  }
  if (!advanceGridStep(job.step, 10000, 6, now)) return;
  // Tiêu thụ mọi output ngoài kernel; checksum không thay validator toàn state.
  for (const boid of job.step.output) {
    job.checksum =
      (job.checksum + Math.round(boid.position.x * 1024) + Math.round(boid.position.y * 1024)) >>>
      0;
  }
  if (job.iteration >= 2) job.samples.push({ ...job.step.metrics });
  job.iteration++;
  job.step = null;
  if (job.iteration === 7) {
    const samples = job.samples;
    const totals = samples.map((sample) => sample.totalMs);
    job.rows.push({
      ...current,
      samples: samples.length,
      medianMs: median(totals),
      minMs: Math.min(...totals),
      maxMs: Math.max(...totals),
      buildMs: median(samples.map((sample) => sample.buildMs)),
      queryMs: median(samples.map((sample) => sample.queryMs)),
      updateMs: median(samples.map((sample) => sample.updateMs)),
      candidates: samples[0].candidates,
      neighbors: samples[0].neighbors,
      checksum: job.checksum,
    });
    job.row++;
    job.iteration = 0;
    job.samples = [];
    job.input = [];
    job.checksum = 0;
    if (job.row === job.cases.length) job.active = false;
  }
}

export function cancelGridBenchmark(job: GridBenchmarkJob) {
  if (job.step) {
    job.step.cancelled = true;
    job.step.output = [];
  }
  job.step = null;
  job.input = [];
  job.active = false;
}
