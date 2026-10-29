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
  version: readonly [number, number];
  maximumWorkgroupCountX: number;
  maximumWorkgroupSizeX: number;
  maximumInvocations: number;
  maximumShaderStorageBlockBytes: number;
  maximumStorageBindings: number;
  maximumComputeStorageBlocks: number;
}
export interface OutputValidationReport {
  tolerancesValid: boolean;
  sameSize: boolean;
  allFinite: boolean;
  mismatchCount: number;
  firstMismatch: number | null;
  firstMismatchComponent: number | null;
  firstNonFinite: number | null;
  maximumAbsoluteError: number;
}

export const MAXIMUM_ELEMENT_COUNT = 2_000_003;
export const DESKTOP_LIMITS: ComputeLimits = Object.freeze({
  version: [4, 6] as const,
  maximumWorkgroupCountX: 65_535,
  maximumWorkgroupSizeX: 1024,
  maximumInvocations: 1024,
  maximumShaderStorageBlockBytes: 128 * 1024 * 1024,
  maximumStorageBindings: 8,
  maximumComputeStorageBlocks: 8,
});
export const WEAK_LIMITS: ComputeLimits = Object.freeze({
  version: [4, 2] as const,
  maximumWorkgroupCountX: 1024,
  maximumWorkgroupSizeX: 128,
  maximumInvocations: 128,
  maximumShaderStorageBlockBytes: 8 * 1024 * 1024,
  maximumStorageBindings: 2,
  maximumComputeStorageBlocks: 2,
});

function integer(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} phải là số nguyên trong ${minimum}…${maximum}.`);
  }
  return value;
}

function mixBits(value: number) {
  value = (value ^ (value >>> 16)) >>> 0;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

// Mỗi phép làm tròn tương ứng một phép float trong C++, không dùng input double.
export function deterministicComponent(index: number, channel: number, seed = 0x37c0ffee) {
  integer(index, 0, MAXIMUM_ELEMENT_COUNT - 1, "index");
  integer(channel, 0, 7, "channel");
  integer(seed, 0, 0xffffffff, "seed");
  const bits = mixBits(index ^ Math.imul(channel, 0x9e3779b9) ^ seed);
  const unit = Math.fround((bits & 0x00ffffff) / 0x00ffffff);
  return Math.fround(Math.fround(unit * 2) - 1);
}

export function vectorAt(index: number, input: "a" | "b", seed = 0x37c0ffee): Vec4 {
  integer(seed, 0, 0xffffffff, "seed");
  const offset = input === "a" ? 0 : 4;
  const inputSeed = input === "a" ? seed : (seed ^ 0xa511e9b3) >>> 0;
  return {
    x: deterministicComponent(index, offset, inputSeed),
    y: deterministicComponent(index, offset + 1, inputSeed),
    z: deterministicComponent(index, offset + 2, inputSeed),
    w: deterministicComponent(index, offset + 3, inputSeed),
  };
}

export function applyVectorOperation(
  a: Vec4,
  b: Vec4,
  operation: VectorOperation,
  scalar: number,
): Vec4 {
  const s = Math.fround(scalar);
  if (!Number.isFinite(s)) throw new RangeError("Scalar phải là float hữu hạn.");
  const component = (left: number, right: number) => {
    left = Math.fround(left);
    right = Math.fround(right);
    if (operation === "axpy") return Math.fround(Math.fround(left * s) + right);
    if (operation === "difference") return Math.fround(left - right);
    if (operation === "add") return Math.fround(left + right);
    throw new RangeError("Operation không hợp lệ.");
  };
  return {
    x: component(a.x, b.x),
    y: component(a.y, b.y),
    z: component(a.z, b.z),
    w: component(a.w, b.w),
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
  integer(elementCount, 0, MAXIMUM_ELEMENT_COUNT, "N");
  integer(localSize, 1, 1024, "local size");
  const workgroupCount = Math.ceil(elementCount / localSize);
  const launchedInvocations = workgroupCount * localSize;
  return {
    elementCount,
    localSize,
    workgroupCount,
    launchedInvocations,
    unusedInvocations: launchedInvocations - elementCount,
  };
}

export function invocationAddress(
  workgroupId: number,
  localInvocationId: number,
  localSize: number,
) {
  integer(workgroupId, 0, 0xffffffff, "group");
  integer(localSize, 1, 1024, "local size");
  integer(localInvocationId, 0, localSize - 1, "local ID");
  return workgroupId * localSize + localInvocationId;
}

export function std430ByteOffset(index: number) {
  return integer(index, 0, MAXIMUM_ELEMENT_COUNT + 255, "index") * 16;
}

export function validateCapabilities(limits: ComputeLimits, plan: DispatchPlan) {
  const [major, minor] = limits.version;
  const withinBudget =
    Number.isSafeInteger(plan.elementCount) &&
    plan.elementCount >= 0 &&
    plan.elementCount <= MAXIMUM_ELEMENT_COUNT;
  return {
    version43OrNewer: major > 4 || (major === 4 && minor >= 3),
    localSizeSupported:
      plan.localSize > 0 &&
      plan.localSize <= limits.maximumWorkgroupSizeX &&
      plan.localSize <= limits.maximumInvocations,
    groupCountSupported:
      plan.workgroupCount >= 0 && plan.workgroupCount <= limits.maximumWorkgroupCountX,
    storageBlockLargeEnough:
      withinBudget && (plan.elementCount + 256) * 16 <= limits.maximumShaderStorageBlockBytes,
    bindingsSupported:
      limits.maximumStorageBindings >= 3 && limits.maximumComputeStorageBlocks >= 3,
    applicationBudgetSupported: withinBudget,
  };
}

export function validationPassed(report: OutputValidationReport) {
  return (
    report.tolerancesValid && report.sameSize && report.allFinite && report.mismatchCount === 0
  );
}

export function validateOutput(
  expected: Vec4[],
  actual: Vec4[],
  absoluteTolerance = 2e-6,
  relativeTolerance = 2e-6,
): OutputValidationReport {
  const absTol = Math.fround(absoluteTolerance);
  const relTol = Math.fround(relativeTolerance);
  const report: OutputValidationReport = {
    tolerancesValid:
      Number.isFinite(absTol) && absTol >= 0 && Number.isFinite(relTol) && relTol >= 0,
    sameSize: expected.length === actual.length,
    allFinite: true,
    mismatchCount: 0,
    firstMismatch: null,
    firstMismatchComponent: null,
    firstNonFinite: null,
    maximumAbsoluteError: 0,
  };
  if (!report.tolerancesValid) return report;
  const count = Math.min(expected.length, actual.length);
  const channels = ["x", "y", "z", "w"] as const;
  for (let index = 0; index < count; index += 1) {
    let matches = true;
    for (let component = 0; component < channels.length; component += 1) {
      const e = Math.fround(expected[index][channels[component]]);
      const a = Math.fround(actual[index][channels[component]]);
      let componentMatches = Number.isFinite(e) && Number.isFinite(a);
      if (!componentMatches) {
        report.allFinite = false;
        report.firstNonFinite ??= index;
      } else {
        const error = Math.fround(Math.abs(Math.fround(e - a)));
        report.maximumAbsoluteError = Math.max(report.maximumAbsoluteError, error);
        const threshold = Math.fround(
          absTol + Math.fround(relTol * Math.max(Math.abs(e), Math.abs(a))),
        );
        componentMatches = error <= threshold;
      }
      if (!componentMatches) {
        if (matches && report.firstMismatch === null) report.firstMismatchComponent = component;
        matches = false;
      }
    }
    if (!matches) {
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
  if (samples.some((value) => !Number.isFinite(value) || value < 0))
    throw new RangeError("Sample không hợp lệ.");
  if (!samples.length) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return sorted[middle - 1] + (sorted[middle] - sorted[middle - 1]) * 0.5;
}
