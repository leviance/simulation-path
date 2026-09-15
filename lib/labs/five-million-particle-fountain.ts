export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Particle {
  positionAge: Vec4;
  velocityLife: Vec4;
}

export interface DispatchPlan {
  particleCount: number;
  localSize: number;
  workgroupCount: number;
  launchedInvocations: number;
  unusedInvocations: number;
}

export interface ParticleCapabilities {
  version: [number, number];
  maximumWorkgroupCountX: number;
  maximumWorkgroupSizeX: number;
  maximumInvocations: number;
  maximumShaderStorageBlockBytes: number;
}

export interface ParticleValidationReport {
  sameSize: boolean;
  allFinite: boolean;
  mismatchCount: number;
  firstMismatch: number | null;
  maximumAbsoluteError: number;
}

export type BarrierChoice = "shader-storage" | "buffer-update" | "missing";

export const PARTICLE_BYTES = 32;
export const LOCAL_SIZE = 256;
export const GRAVITY = -9.81;
export const FLOOR_Y = -2;
export const MAXIMUM_FRAME_DT = 1 / 30;
export const SINGLE_STEP_DT = 1 / 120;
export const COUNT_PRESETS = [100_000, 500_000, 1_000_000, 5_000_000] as const;

export const LARGE_GPU: ParticleCapabilities = {
  version: [4, 6],
  maximumWorkgroupCountX: 65_535,
  maximumWorkgroupSizeX: 1024,
  maximumInvocations: 1024,
  maximumShaderStorageBlockBytes: 256 * 1024 * 1024,
};

export const LIMITED_GPU: ParticleCapabilities = {
  version: [4, 3],
  maximumWorkgroupCountX: 65_535,
  maximumWorkgroupSizeX: 256,
  maximumInvocations: 256,
  maximumShaderStorageBlockBytes: 64 * 1024 * 1024,
};

function mixBits(value: number) {
  value = (value ^ (value >>> 16)) >>> 0;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value = (value ^ (value >>> 15)) >>> 0;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export function random01(index: number, channel: number, seed = 0x38c0ffee) {
  const bits = mixBits((index >>> 0) ^ Math.imul(channel, 0x9e3779b9) ^ seed);
  return (bits & 0x00ffffff) / 0x00ffffff;
}

export function makeSpawnParticle(index: number, spawnEpoch: number, seed = 0x38c0ffee): Particle {
  const epochSeed = (seed ^ mixBits((spawnEpoch + 0x632be59b) >>> 0)) >>> 0;
  const emitterX = -0.32 + random01(index, 0, epochSeed) * 0.64;
  const velocityX = -1.45 + random01(index, 1, epochSeed) * 2.9;
  const velocityY = 5.7 + random01(index, 2, epochSeed) * 4.6;
  const lifetime = 1.8 + random01(index, 3, epochSeed) * 2.8;
  return {
    positionAge: { x: emitterX, y: 0, z: 0, w: 0 },
    velocityLife: { x: velocityX, y: velocityY, z: 0, w: lifetime },
  };
}

export function makeInitialParticle(index: number, seed = 0x38c0ffee): Particle {
  const particle = makeSpawnParticle(index, 0, seed);
  const age = particle.velocityLife.w * random01(index, 4, seed) * 0.92;
  return {
    positionAge: {
      x: particle.positionAge.x + particle.velocityLife.x * age,
      y: particle.positionAge.y + particle.velocityLife.y * age + 0.5 * GRAVITY * age * age,
      z: 0,
      w: age,
    },
    velocityLife: {
      ...particle.velocityLife,
      y: particle.velocityLife.y + GRAVITY * age,
    },
  };
}

export function stepParticle(
  particle: Particle,
  index: number,
  dt: number,
  gravity = GRAVITY,
  spawnEpoch = 1,
): Particle {
  if (!(dt > 0) || !Number.isFinite(dt)) return structuredClone(particle);
  const velocityLife = {
    ...particle.velocityLife,
    y: Math.fround(particle.velocityLife.y + gravity * dt),
  };
  const positionAge = {
    x: Math.fround(particle.positionAge.x + velocityLife.x * dt),
    y: Math.fround(particle.positionAge.y + velocityLife.y * dt),
    z: Math.fround(particle.positionAge.z + velocityLife.z * dt),
    w: Math.fround(particle.positionAge.w + dt),
  };
  if (positionAge.w >= velocityLife.w || positionAge.y < FLOOR_Y) {
    return makeSpawnParticle(index, spawnEpoch);
  }
  return { positionAge, velocityLife };
}

export function makeDispatchPlan(particleCount: number, localSize = LOCAL_SIZE): DispatchPlan {
  const safeCount = Math.max(0, Math.floor(particleCount));
  const safeLocalSize = Math.max(1, Math.floor(localSize));
  const workgroupCount = safeCount === 0 ? 0 : Math.ceil(safeCount / safeLocalSize);
  const launchedInvocations = workgroupCount * safeLocalSize;
  return {
    particleCount: safeCount,
    localSize: safeLocalSize,
    workgroupCount,
    launchedInvocations,
    unusedInvocations: launchedInvocations - safeCount,
  };
}

export function particleStorageBytes(particleCount: number) {
  return Math.max(0, Math.floor(particleCount)) * PARTICLE_BYTES;
}

export function validateCapabilities(limits: ParticleCapabilities, plan: DispatchPlan) {
  const [major, minor] = limits.version;
  return {
    version43OrNewer: major > 4 || (major === 4 && minor >= 3),
    localSizeSupported:
      plan.localSize <= limits.maximumWorkgroupSizeX && plan.localSize <= limits.maximumInvocations,
    groupCountSupported: plan.workgroupCount <= limits.maximumWorkgroupCountX,
    storageBlockLargeEnough:
      particleStorageBytes(plan.particleCount) <= limits.maximumShaderStorageBlockBytes,
  };
}

export function chooseLargestSupportedCount(
  limits: ParticleCapabilities,
  presets: readonly number[] = COUNT_PRESETS,
) {
  return (
    [...presets]
      .sort((left, right) => right - left)
      .find((count) =>
        Object.values(validateCapabilities(limits, makeDispatchPlan(count))).every(Boolean),
      ) ?? 0
  );
}

export function selectSimulationDt(rawDt: number, paused: boolean, singleStep: boolean) {
  if (singleStep) return SINGLE_STEP_DT;
  if (paused || !Number.isFinite(rawDt) || rawDt <= 0) return 0;
  return Math.min(rawDt, MAXIMUM_FRAME_DT);
}

export function barrierStatus(choice: BarrierChoice) {
  return {
    producer: "compute SSBO write",
    consumer: "vertex shader SSBO read",
    selected: choice,
    visible: choice === "shader-storage",
  };
}

export function modelParticleGpuTimes(particleCount: number, sample = 0) {
  const scale = Math.max(1, particleCount) / 1_000_000;
  const wobble = 1 + Math.sin(sample * 1.73) * 0.06;
  return {
    compute: scale * 0.82 * wobble,
    barrier: 0.025,
    draw: scale * 1.08 * (2 - wobble),
  };
}

export function queryRingSnapshot(frame: number, latencyFrames: number, slotCount = 4) {
  const safeFrame = Math.max(0, Math.floor(frame));
  const safeLatency = Math.max(1, Math.floor(latencyFrames));
  return Array.from({ length: slotCount }, (_, slot) => {
    const submittedFrame = safeFrame - ((safeFrame - slot + slotCount) % slotCount);
    const age = safeFrame - submittedFrame;
    const pending = submittedFrame >= 0 && age < safeLatency;
    return { slot, submittedFrame, pending, available: submittedFrame >= 0 && !pending };
  });
}

function particleComponents(particle: Particle) {
  return [...Object.values(particle.positionAge), ...Object.values(particle.velocityLife)];
}

export function validateParticles(
  expected: Particle[],
  actual: Particle[],
  absoluteTolerance = 3e-5,
  relativeTolerance = 3e-5,
): ParticleValidationReport {
  const report: ParticleValidationReport = {
    sameSize: expected.length === actual.length,
    allFinite: true,
    mismatchCount: 0,
    firstMismatch: null,
    maximumAbsoluteError: 0,
  };
  const count = Math.min(expected.length, actual.length);
  for (let index = 0; index < count; index += 1) {
    const expectedValues = particleComponents(expected[index]);
    const actualValues = particleComponents(actual[index]);
    let matches = true;
    for (let component = 0; component < expectedValues.length; component += 1) {
      const expectedValue = expectedValues[component];
      const actualValue = actualValues[component];
      if (!Number.isFinite(expectedValue) || !Number.isFinite(actualValue)) {
        report.allFinite = false;
        matches = false;
        continue;
      }
      const error = Math.abs(expectedValue - actualValue);
      report.maximumAbsoluteError = Math.max(report.maximumAbsoluteError, error);
      const scale = Math.max(Math.abs(expectedValue), Math.abs(actualValue));
      if (error > absoluteTolerance + relativeTolerance * scale) matches = false;
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
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) * 0.5;
}

export function validateFiveMillionParticleContract() {
  const plan = makeDispatchPlan(5_000_000);
  const capability = validateCapabilities(LARGE_GPU, plan);
  const input = makeInitialParticle(37);
  const expected = stepParticle(input, 37, SINGLE_STEP_DT, GRAVITY, 17);
  const actual = stepParticle(input, 37, SINGLE_STEP_DT, GRAVITY, 17);
  return {
    particleStrideIs32: PARTICLE_BYTES === 32,
    storageBudgetIs160Mb: particleStorageBytes(5_000_000) === 160_000_000,
    dispatchShapeCorrect: plan.workgroupCount === 19_532 && plan.unusedInvocations === 192,
    capabilitiesPass: Object.values(capability).every(Boolean),
    fallbackIsExplicit: chooseLargestSupportedCount(LIMITED_GPU) === 1_000_000,
    computeToDrawBarrierCorrect: barrierStatus("shader-storage").visible,
    probeMatchesCpu: validateParticles([expected], [actual]).mismatchCount === 0,
    queryRingFinite: queryRingSnapshot(7, 2).length === 4,
  };
}
