export const WORKGROUP_SIZE = 256;
export const BLOCK_SPAN = WORKGROUP_SIZE * 2;
export const COUNT_PRESETS = [8, 257, 65_537, 1_000_003] as const;

export type ReductionScanOperation = "reduction" | "exclusive-scan" | "inclusive-scan";
export type BarrierChoice = "shader-storage" | "buffer-update" | "none";

export interface HierarchyLevel {
  level: number;
  inputCount: number;
  blockCount: number;
  launchedValues: number;
  zeroPadding: number;
}

export interface ValidationReport {
  sameSize: boolean;
  allFinite: boolean;
  startsAtZero: boolean;
  adjacentDeltasMatch: boolean;
  totalMatches: boolean;
  mismatchCount: number;
  firstMismatch: number | null;
  maximumAbsoluteError: number;
  passed: boolean;
}

export interface ReductionStage {
  stride: number;
  values: number[];
  activeLanes: number;
}

export interface BlellochStage {
  phase: "load" | "upsweep" | "root-zero" | "downsweep" | "output";
  offset: number;
  values: number[];
}

export function ceilDiv(value: number, divisor: number) {
  if (value <= 0 || divisor <= 0) return 0;
  return Math.floor((value - 1) / divisor) + 1;
}

export function mixBits(value: number) {
  let result = value >>> 0;
  result ^= result >>> 16;
  result = Math.imul(result, 0x7feb352d) >>> 0;
  result ^= result >>> 15;
  result = Math.imul(result, 0x846ca68b) >>> 0;
  result ^= result >>> 16;
  return result >>> 0;
}

export function deterministicValue(index: number, seed: number) {
  const bits = mixBits((index >>> 0) ^ (seed >>> 0) ^ 0x9e3779b9);
  const unit = (bits & 0x00ffffff) / 0x00ffffff;
  return 0.0005 + unit * 0.0015;
}

export function makeDeterministicInput(count: number, seed = 0x39c0ffee) {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) =>
    deterministicValue(index, seed),
  );
}

export function cpuReduction(values: readonly number[]) {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function cpuExclusiveScan(values: readonly number[]) {
  const output = new Array<number>(values.length);
  let running = 0;
  for (let index = 0; index < values.length; index += 1) {
    output[index] = running;
    running += values[index];
  }
  return output;
}

export function cpuInclusiveScan(values: readonly number[]) {
  const output = new Array<number>(values.length);
  let running = 0;
  for (let index = 0; index < values.length; index += 1) {
    running += values[index];
    output[index] = running;
  }
  return output;
}

export function makeHierarchy(inputCount: number, blockSpan = BLOCK_SPAN) {
  const levels: HierarchyLevel[] = [];
  let currentCount = Math.max(0, Math.floor(inputCount));
  let level = 0;
  while (currentCount > 0) {
    const blockCount = ceilDiv(currentCount, blockSpan);
    const launchedValues = blockCount * blockSpan;
    levels.push({
      level,
      inputCount: currentCount,
      blockCount,
      launchedValues,
      zeroPadding: launchedValues - currentCount,
    });
    if (blockCount === 1) break;
    currentCount = blockCount;
    level += 1;
  }
  return levels;
}

export function reductionDispatchCount(inputCount: number, blockSpan = BLOCK_SPAN) {
  return makeHierarchy(inputCount, blockSpan).length;
}

export function scanDispatchCount(inputCount: number, blockSpan = BLOCK_SPAN) {
  const levels = makeHierarchy(inputCount, blockSpan).length;
  if (levels === 0) return 0;
  return levels + Math.max(0, levels - 1);
}

export function makePassLabels(
  operation: ReductionScanOperation,
  inputCount: number,
  blockSpan = BLOCK_SPAN,
) {
  const hierarchy = makeHierarchy(inputCount, blockSpan);
  if (operation === "reduction") {
    return hierarchy.map(
      (level) => `reduce L${level.level}: ${level.inputCount} → ${level.blockCount}`,
    );
  }
  const scanPasses = hierarchy.map(
    (level) => `scan blocks L${level.level}: ${level.inputCount} → ${level.blockCount} sums`,
  );
  const addPasses = hierarchy
    .slice(0, -1)
    .reverse()
    .map((level) => `uniform add L${level.level}: ${level.blockCount} offsets`);
  return [...scanPasses, ...addPasses];
}

function nextPowerOfTwo(value: number) {
  let power = 1;
  while (power < Math.max(1, value)) power *= 2;
  return power;
}

export function workgroupReductionStages(values: readonly number[], barriersEnabled = true) {
  const span = nextPowerOfTwo(Math.min(Math.max(1, values.length), BLOCK_SPAN));
  const shared = Array.from({ length: span }, (_, index) => values[index] ?? 0);
  const valuesVisibleWithoutBarrier = [...shared];
  const stages: ReductionStage[] = [{ stride: span, values: [...shared], activeLanes: span }];
  for (let stride = span / 2; stride >= 1; stride /= 2) {
    const readableValues = barriersEnabled ? [...shared] : valuesVisibleWithoutBarrier;
    for (let lane = 0; lane < stride; lane += 1) {
      shared[lane] = readableValues[lane] + readableValues[lane + stride];
    }
    stages.push({ stride, values: [...shared], activeLanes: stride });
  }
  return stages;
}

export function blellochStages(values: readonly number[]) {
  const span = nextPowerOfTwo(values.length);
  const shared = Array.from({ length: span }, (_, index) => values[index] ?? 0);
  const stages: BlellochStage[] = [{ phase: "load", offset: 0, values: [...shared] }];

  for (let offset = 1; offset < span; offset *= 2) {
    for (let lane = 0; lane < span / (offset * 2); lane += 1) {
      const right = (lane + 1) * offset * 2 - 1;
      const left = right - offset;
      shared[right] += shared[left];
    }
    stages.push({ phase: "upsweep", offset, values: [...shared] });
  }

  shared[span - 1] = 0;
  stages.push({ phase: "root-zero", offset: span / 2, values: [...shared] });

  for (let offset = span / 2; offset >= 1; offset /= 2) {
    for (let lane = 0; lane < span / (offset * 2); lane += 1) {
      const right = (lane + 1) * offset * 2 - 1;
      const left = right - offset;
      const savedLeft = shared[left];
      shared[left] = shared[right];
      shared[right] += savedLeft;
    }
    stages.push({ phase: "downsweep", offset, values: [...shared] });
  }
  stages.push({ phase: "output", offset: 0, values: shared.slice(0, values.length) });
  return stages;
}

function withinTolerance(actual: number, expected: number, absolute: number, relative: number) {
  const scale = Math.max(Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= absolute + relative * scale;
}

export function validateReduction(
  input: readonly number[],
  actual: number,
  absoluteTolerance = 2e-4,
  relativeTolerance = 5e-5,
): ValidationReport {
  const expected = cpuReduction(input);
  const allFinite = Number.isFinite(actual);
  const error = allFinite ? Math.abs(actual - expected) : Number.POSITIVE_INFINITY;
  const totalMatches =
    allFinite && withinTolerance(actual, expected, absoluteTolerance, relativeTolerance);
  return {
    sameSize: true,
    allFinite,
    startsAtZero: true,
    adjacentDeltasMatch: true,
    totalMatches,
    mismatchCount: totalMatches ? 0 : 1,
    firstMismatch: totalMatches ? null : 0,
    maximumAbsoluteError: error,
    passed: allFinite && totalMatches,
  };
}

export function validateExclusiveScan(
  input: readonly number[],
  actual: readonly number[],
  absoluteTolerance = 3e-4,
  relativeTolerance = 8e-5,
): ValidationReport {
  const expected = cpuExclusiveScan(input);
  const sameSize = expected.length === actual.length;
  let allFinite = true;
  let mismatchCount = 0;
  let firstMismatch: number | null = null;
  let maximumAbsoluteError = 0;
  const count = Math.min(expected.length, actual.length);

  for (let index = 0; index < count; index += 1) {
    const value = actual[index];
    const finite = Number.isFinite(value);
    allFinite = allFinite && finite;
    const error = finite ? Math.abs(value - expected[index]) : Number.POSITIVE_INFINITY;
    maximumAbsoluteError = Math.max(maximumAbsoluteError, error);
    if (!finite || !withinTolerance(value, expected[index], absoluteTolerance, relativeTolerance)) {
      mismatchCount += 1;
      if (firstMismatch === null) firstMismatch = index;
    }
  }
  if (!sameSize) {
    mismatchCount += Math.abs(expected.length - actual.length);
    if (firstMismatch === null) firstMismatch = count;
  }

  const startsAtZero = actual.length === 0 || Math.abs(actual[0]) <= absoluteTolerance;
  let adjacentDeltasMatch = true;
  for (let index = 0; index + 1 < count; index += 1) {
    const delta = actual[index + 1] - actual[index];
    if (!withinTolerance(delta, input[index], absoluteTolerance * 2, relativeTolerance * 2)) {
      adjacentDeltasMatch = false;
      break;
    }
  }
  const actualTotal = count === 0 ? 0 : actual[count - 1] + input[count - 1];
  const expectedTotal = cpuReduction(input.slice(0, count));
  const totalMatches = withinTolerance(
    actualTotal,
    expectedTotal,
    absoluteTolerance * 2,
    relativeTolerance * 2,
  );
  const passed =
    sameSize &&
    allFinite &&
    startsAtZero &&
    adjacentDeltasMatch &&
    totalMatches &&
    mismatchCount === 0;
  return {
    sameSize,
    allFinite,
    startsAtZero,
    adjacentDeltasMatch,
    totalMatches,
    mismatchCount,
    firstMismatch,
    maximumAbsoluteError,
    passed,
  };
}

export function barrierMessage(
  producer: "compute-pass" | "final-compute",
  consumer: "compute-pass" | "readback",
  choice: BarrierChoice,
) {
  const expected: BarrierChoice = consumer === "compute-pass" ? "shader-storage" : "buffer-update";
  if (choice === expected) {
    return { passed: true, expected, message: `Đúng: ${choice} mô tả consumer ${consumer}.` };
  }
  const producerLabel = producer === "compute-pass" ? "compute producer" : "final compute producer";
  return {
    passed: false,
    expected,
    message: `Sai sau ${producerLabel}: consumer ${consumer} cần ${expected}, không phải ${choice}.`,
  };
}

export function modelGpuMilliseconds(
  operation: ReductionScanOperation,
  inputCount: number,
  blockSpan = BLOCK_SPAN,
) {
  const passes =
    operation === "reduction"
      ? reductionDispatchCount(inputCount, blockSpan)
      : scanDispatchCount(inputCount, blockSpan);
  const trafficFactor = operation === "reduction" ? 1 : 2.15;
  return 0.018 * passes + (inputCount / 1_000_000) * 0.24 * trafficFactor;
}
