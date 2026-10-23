import {
  INTEGRATOR_KINDS,
  INTEGRATOR_EPSILON,
  runIntegratorSimulation,
  measureIntegratorState,
  validIntegratorStep,
  type IntegratorKind,
  type IntegratorOscillatorParameters,
  type IntegratorOscillatorState,
} from "./integrator-race.ts";

export interface IntegratorBenchmarkConfig {
  parameters: IntegratorOscillatorParameters;
  initial: IntegratorOscillatorState;
  dt: number;
  repetitions: number;
  samples: number;
}
export interface IntegratorBenchmarkWork {
  checksum: number;
  steps: number;
  forceEvaluations: number;
  valid: boolean;
}
export interface IntegratorBenchmarkRow {
  kind: IntegratorKind;
  microsecondsPerStep: number;
  phaseSpaceError: number;
  work: IntegratorBenchmarkWork;
}
export interface IntegratorBenchmarkJob {
  config: IntegratorBenchmarkConfig;
  rows: IntegratorBenchmarkRow[];
  timings: number[];
  running: boolean;
  warmed: boolean;
  failed: boolean;
  deadline: number;
}
export function validIntegratorBenchmark(config: IntegratorBenchmarkConfig) {
  return (
    validIntegratorStep(config.initial, config.parameters, config.dt) &&
    config.dt >= 1 / 240 &&
    config.dt <= 0.25 &&
    Number.isInteger(config.repetitions) &&
    config.repetitions >= 1 &&
    config.repetitions <= 32 &&
    Number.isInteger(config.samples) &&
    config.samples >= 3 &&
    config.samples <= 7
  );
}
export function integratorBenchmarkWork(
  kind: IntegratorKind,
  config: IntegratorBenchmarkConfig,
  repetitions: number,
): IntegratorBenchmarkWork {
  const empty = { checksum: 0, steps: 0, forceEvaluations: 0, valid: false };
  if (
    !validIntegratorBenchmark(config) ||
    !Number.isInteger(repetitions) ||
    repetitions < 1 ||
    repetitions > 32
  )
    return empty;
  const work = { ...empty };
  const expectedSteps = Math.floor((2 + INTEGRATOR_EPSILON) / config.dt);
  for (let repeat = 0; repeat < repetitions; repeat++) {
    const run = runIntegratorSimulation(kind, config.initial, config.parameters, 2, config.dt);
    if (run.steps !== expectedSteps) return empty;
    work.checksum += run.state.position + 0.125 * run.state.velocity;
    work.steps += run.steps;
    work.forceEvaluations += run.forceEvaluations;
  }
  work.valid = Number.isFinite(work.checksum) && work.steps > 0;
  return work;
}
export function integratorMedian(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value < 0)) return NaN;
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : 0.5 * sorted[middle - 1] + 0.5 * sorted[middle];
}
export function makeIntegratorBenchmark(
  config: IntegratorBenchmarkConfig,
  now: number,
): IntegratorBenchmarkJob {
  const valid = validIntegratorBenchmark(config) && Number.isFinite(now);
  return {
    config: { ...config, initial: { ...config.initial }, parameters: { ...config.parameters } },
    rows: [],
    timings: [],
    running: valid,
    warmed: false,
    failed: !valid,
    deadline: now + 5000,
  };
}

// Một batch trên mỗi requestAnimationFrame. Clock tính mili giây như performance.now().
export function advanceIntegratorBenchmark(
  job: IntegratorBenchmarkJob,
  clock: () => number,
): IntegratorBenchmarkJob {
  if (!job.running) return job;
  const now = clock();
  if (!Number.isFinite(now) || now > job.deadline || job.rows.length >= INTEGRATOR_KINDS.length)
    return { ...job, running: false, failed: true };
  const kind = INTEGRATOR_KINDS[job.rows.length];
  if (!job.warmed) {
    const warmup = integratorBenchmarkWork(kind, job.config, 3);
    return { ...job, warmed: warmup.valid, running: warmup.valid, failed: !warmup.valid };
  }
  const start = clock();
  const work = integratorBenchmarkWork(kind, job.config, job.config.repetitions);
  const end = clock();
  // Checksum nằm trong result được hiển thị, không thể bỏ kết quả tính đi.
  if (!work.valid || !Number.isFinite(end) || !Number.isFinite(start) || end < start)
    return { ...job, running: false, failed: true };
  const timings = [...job.timings, ((end - start) * 1000) / work.steps];
  if (timings.length < job.config.samples) return { ...job, timings };
  const run = runIntegratorSimulation(
    kind,
    job.config.initial,
    job.config.parameters,
    2,
    job.config.dt,
  );
  const row = {
    kind,
    microsecondsPerStep: integratorMedian(timings),
    phaseSpaceError: measureIntegratorState(run.state, job.config.initial, job.config.parameters)
      .phaseSpaceError,
    work,
  };
  const rows = [...job.rows, row];
  return {
    ...job,
    rows,
    timings: [],
    warmed: false,
    running: rows.length < INTEGRATOR_KINDS.length,
  };
}
