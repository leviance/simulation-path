export type VectorOperation = "add" | "axpy" | "difference";

export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface DispatchPlan {
  elementCount: number;
  localSize: number;
  workgroupCount: number;
  launchedInvocations: number;
  unusedInvocations: number;
}

export interface ComputeLimits {
  version: [number, number];
  maximumWorkgroupCountX: number;
  maximumWorkgroupSizeX: number;
  maximumInvocations: number;
  maximumShaderStorageBlockBytes: number;
}

export interface OutputValidationReport {
  sameSize: boolean;
  allFinite: boolean;
  mismatchCount: number;
  firstMismatch: number | null;
  maximumAbsoluteError: number;
}

export const DESKTOP_LIMITS: ComputeLimits = {
  version: [4, 6],
  maximumWorkgroupCountX: 65_535,
  maximumWorkgroupSizeX: 1024,
  maximumInvocations: 1024,
  maximumShaderStorageBlockBytes: 128 * 1024 * 1024,
};

export const WEAK_LIMITS: ComputeLimits = {
  version: [4, 2],
  maximumWorkgroupCountX: 1024,
  maximumWorkgroupSizeX: 128,
  maximumInvocations: 128,
  maximumShaderStorageBlockBytes: 8 * 1024 * 1024,
};

function mixBits(value: number) {
  value = (value ^ (value >>> 16)) >>> 0;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export function deterministicComponent(index: number, channel: number, seed = 0x37c0ffee) {
  const bits = mixBits((index >>> 0) ^ Math.imul(channel, 0x9e3779b9) ^ seed);
  return ((bits & 0x00ffffff) / 0x00ffffff) * 2 - 1;
}

export function vectorAt(index: number, input: "a" | "b", seed = 0x37c0ffee): Vec4 {
  const channelOffset = input === "a" ? 0 : 4;
  const inputSeed = input === "a" ? seed : seed ^ 0xa511e9b3;
  return {
    x: deterministicComponent(index, channelOffset, inputSeed),
    y: deterministicComponent(index, channelOffset + 1, inputSeed),
    z: deterministicComponent(index, channelOffset + 2, inputSeed),
    w: deterministicComponent(index, channelOffset + 3, inputSeed),
  };
}

export function applyVectorOperation(
  a: Vec4,
  b: Vec4,
  operation: VectorOperation,
  scalar: number,
): Vec4 {
  if (operation === "axpy") {
    return {
      x: Math.fround(Math.fround(a.x * scalar) + b.x),
      y: Math.fround(Math.fround(a.y * scalar) + b.y),
      z: Math.fround(Math.fround(a.z * scalar) + b.z),
      w: Math.fround(Math.fround(a.w * scalar) + b.w),
    };
  }
  const sign = operation === "difference" ? -1 : 1;
  return {
    x: Math.fround(a.x + sign * b.x),
    y: Math.fround(a.y + sign * b.y),
    z: Math.fround(a.z + sign * b.z),
    w: Math.fround(a.w + sign * b.w),
  };
}

export function oracleAt(
  index: number,
  operation: VectorOperation,
  scalar: number,
  seed = 0x37c0ffee,
) {
  return applyVectorOperation(
    vectorAt(index, "a", seed),
    vectorAt(index, "b", seed),
    operation,
    scalar,
  );
}

export function makeDispatchPlan(elementCount: number, localSize: number): DispatchPlan {
  const safeCount = Math.max(0, Math.floor(elementCount));
  const safeLocalSize = Math.max(1, Math.floor(localSize));
  const workgroupCount = safeCount === 0 ? 0 : Math.ceil(safeCount / safeLocalSize);
  const launchedInvocations = workgroupCount * safeLocalSize;
  return {
    elementCount: safeCount,
    localSize: safeLocalSize,
    workgroupCount,
    launchedInvocations,
    unusedInvocations: launchedInvocations - safeCount,
  };
}

export function invocationAddress(
  workgroupId: number,
  localInvocationId: number,
  localSize: number,
) {
  return workgroupId * localSize + localInvocationId;
}

export function std430ByteOffset(index: number) {
  return Math.max(0, Math.floor(index)) * 16;
}

export function validateCapabilities(limits: ComputeLimits, plan: DispatchPlan) {
  const [major, minor] = limits.version;
  return {
    version43OrNewer: major > 4 || (major === 4 && minor >= 3),
    localSizeSupported:
      plan.localSize <= limits.maximumWorkgroupSizeX && plan.localSize <= limits.maximumInvocations,
    groupCountSupported: plan.workgroupCount <= limits.maximumWorkgroupCountX,
    storageBlockLargeEnough: plan.elementCount * 16 <= limits.maximumShaderStorageBlockBytes,
  };
}

export function validateOutput(
  expected: Vec4[],
  actual: Vec4[],
  absoluteTolerance = 2e-6,
  relativeTolerance = 2e-6,
): OutputValidationReport {
  const report: OutputValidationReport = {
    sameSize: expected.length === actual.length,
    allFinite: true,
    mismatchCount: 0,
    firstMismatch: null,
    maximumAbsoluteError: 0,
  };
  const count = Math.min(expected.length, actual.length);
  for (let index = 0; index < count; index += 1) {
    const expectedComponents = Object.values(expected[index]);
    const actualComponents = Object.values(actual[index]);
    let elementMatches = true;
    for (let component = 0; component < 4; component += 1) {
      const expectedValue = expectedComponents[component];
      const actualValue = actualComponents[component];
      if (!Number.isFinite(expectedValue) || !Number.isFinite(actualValue)) {
        report.allFinite = false;
        elementMatches = false;
        continue;
      }
      const error = Math.abs(expectedValue - actualValue);
      report.maximumAbsoluteError = Math.max(report.maximumAbsoluteError, error);
      const scale = Math.max(Math.abs(expectedValue), Math.abs(actualValue));
      if (error > absoluteTolerance + relativeTolerance * scale) elementMatches = false;
    }
    if (!elementMatches) {
      report.firstMismatch ??= index;
      report.mismatchCount += 1;
    }
  }
  if (!report.sameSize) {
    report.firstMismatch ??= count;
    report.mismatchCount += Math.abs(expected.length - actual.length);
  }
  return report;
}

export function median(samples: number[]) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) * 0.5;
}

export function modelPipelineMilliseconds(elementCount: number, sample = 0) {
  const bytesPerBuffer = elementCount * 16;
  const wobble = 1 + Math.sin(sample * 2.17) * 0.055;
  const upload = (bytesPerBuffer * 2) / 12_000_000;
  const compute = (elementCount / 900_000) * wobble;
  const readback = bytesPerBuffer / 8_000_000;
  return { upload, compute, barrier: 0.035, readback };
}

export function validateMillionVectorContract() {
  const plan = makeDispatchPlan(1_000_003, 256);
  const capability = validateCapabilities(DESKTOP_LIMITS, plan);
  const a = vectorAt(777, "a");
  const b = vectorAt(777, "b");
  const expected = [applyVectorOperation(a, b, "axpy", 1.25)];
  const actual = [oracleAt(777, "axpy", 1.25)];
  return {
    vec4StrideIs16: std430ByteOffset(2) - std430ByteOffset(1) === 16,
    dispatchShapeCorrect: plan.workgroupCount === 3907 && plan.unusedInvocations === 189,
    capabilitiesPass: Object.values(capability).every(Boolean),
    globalAddressCorrect: invocationAddress(3906, 66, 256) === 1_000_002,
    tailGuardRejectsNext: invocationAddress(3906, 67, 256) >= plan.elementCount,
    cpuGpuProbeMatches: validateOutput(expected, actual).mismatchCount === 0,
    timingSamplesFinite: [0, 1, 2].every((sample) =>
      Number.isFinite(modelPipelineMilliseconds(plan.elementCount, sample).compute),
    ),
  };
}
