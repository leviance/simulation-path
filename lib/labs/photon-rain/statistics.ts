import { maximumPhotons, right, left, validate, type Settings, type Trace } from "./model.ts";
import { tracePhoton } from "./transport.ts";
export interface Counts {
  completed: number;
  absorbed: number;
  escaped: number;
  censored: number;
  ballistic: number;
  scatteredPhotons: number;
  scatterEvents: number;
}
export interface Experiment {
  settings: Readonly<Settings>;
  counts: Counts;
  recent: { id: number; trace: Trace }[];
  convergence: { count: number; ballistic: number; low: number; high: number }[];
}
export function makeExperiment(settings: Settings): Experiment {
  validate(settings);
  return {
    settings: { ...settings },
    counts: {
      completed: 0,
      absorbed: 0,
      escaped: 0,
      censored: 0,
      ballistic: 0,
      scatteredPhotons: 0,
      scatterEvents: 0,
    },
    recent: [],
    convergence: [],
  };
}
export function tally(counts: Counts, trace: Trace) {
  if (trace.status === "alive") throw new RangeError("Cannot tally an unfinished preview");
  counts.completed++;
  if (trace.status === "absorbed") counts.absorbed++;
  if (trace.status === "escaped") {
    counts.escaped++;
    if (trace.scatters === 0) counts.ballistic++;
  }
  if (trace.status === "censored") counts.censored++;
  if (trace.scatters > 0) counts.scatteredPhotons++;
  counts.scatterEvents += trace.scatters;
}
export function advance(experiment: Experiment, budget: number) {
  if (!Number.isInteger(budget) || budget < 0 || budget > 32)
    throw new RangeError("At most 32 photons per batch");
  let completed = 0;
  while (completed < budget && experiment.counts.completed < experiment.settings.count) {
    const id = experiment.counts.completed,
      trace = tracePhoton(experiment.settings, id);
    tally(experiment.counts, trace);
    // Mốc 1,2,4,...,8192 và N cuối: tối đa 15 điểm, không lấy thêm mẫu RNG.
    const n = experiment.counts.completed;
    if ((n & (n - 1)) === 0 || n === experiment.settings.count) {
      const [low, high] = wilson(experiment.counts.ballistic, n);
      experiment.convergence.push({ count: n, ballistic: experiment.counts.ballistic, low, high });
    }
    experiment.recent.push({ id, trace });
    if (experiment.recent.length > 24) experiment.recent.shift();
    completed++;
  }
  return completed;
}
export function wilson(successes: number, count: number): readonly [number, number] {
  if (
    !Number.isInteger(count) ||
    !Number.isInteger(successes) ||
    count < 1 ||
    count > maximumPhotons ||
    successes < 0 ||
    successes > count
  )
    throw new RangeError("Wilson interval needs valid nonempty counts");
  const z = 1.959963984540054,
    p = successes / count,
    denominator = 1 + (z * z) / count;
  const centre = (p + (z * z) / (2 * count)) / denominator;
  const halfWidth =
    (z * Math.sqrt((p * (1 - p)) / count + (z * z) / (4 * count * count))) / denominator;
  return [Math.max(0, centre - halfWidth), Math.min(1, centre + halfWidth)];
}
export function expectedBallistic(settings: Settings) {
  validate(settings);
  return Math.exp(-(settings.muA + settings.muS) * (right - left));
}
export function audit() {
  const settings: Settings = { muA: 0.4, muS: 0, seed: 42, count: 4096, eventLimit: 64 };
  const experiment = makeExperiment(settings);
  for (let batch = 0; batch < 128; batch++) advance(experiment, 32);
  const counts = experiment.counts,
    expected = expectedBallistic(settings),
    observed = counts.ballistic / counts.completed;
  const tolerance =
    5 * Math.sqrt((expected * (1 - expected)) / counts.completed) + 1 / counts.completed;
  if (
    counts.completed !== 4096 ||
    counts.censored !== 0 ||
    counts.escaped !== counts.ballistic ||
    Math.abs(observed - expected) > tolerance
  )
    throw new Error("Pure absorption fixture failed");
  return Math.abs(observed - expected);
}
