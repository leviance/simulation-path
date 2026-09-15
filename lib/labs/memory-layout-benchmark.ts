import {
  cloneParticlesAoS,
  cloneParticlesSoA,
  maximumLayoutDifference,
  runAoSWorkload,
  runSoAWorkload,
  type MemoryWorkload,
  type ParticlesAoS,
  type ParticlesSoA,
} from "./memory-layout.ts";

export interface MemoryLayoutBenchmarkResult {
  particleCount: number;
  workload: MemoryWorkload;
  aosMilliseconds: number;
  soaMilliseconds: number;
  aosChecksum: number;
  soaChecksum: number;
  maximumDifference: number;
}

function median(samples: number[]) {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) * 0.5;
}

export function measureMemoryWorkload(
  sourceAoS: ParticlesAoS,
  sourceSoA: ParticlesSoA,
  workload: MemoryWorkload,
): MemoryLayoutBenchmarkResult {
  const repetitions = sourceAoS.count >= 1_000_000 ? 3 : 5;
  const warmAoS = cloneParticlesAoS(sourceAoS);
  const warmSoA = cloneParticlesSoA(sourceSoA);
  runAoSWorkload(warmAoS, workload);
  runSoAWorkload(warmSoA, workload);

  const aosSamples: number[] = [];
  const soaSamples: number[] = [];
  let aosChecksum = 0;
  let soaChecksum = 0;
  let maximumDifference = 0;

  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    const aos = cloneParticlesAoS(sourceAoS);
    const soa = cloneParticlesSoA(sourceSoA);

    const measureAoS = () => {
      const started = performance.now();
      aosChecksum += runAoSWorkload(aos, workload);
      aosSamples.push(performance.now() - started);
    };
    const measureSoA = () => {
      const started = performance.now();
      soaChecksum += runSoAWorkload(soa, workload);
      soaSamples.push(performance.now() - started);
    };

    // Đổi thứ tự qua từng sample để giảm lợi thế do cache/JIT cho layout luôn chạy sau.
    if (repetition % 2 === 0) {
      measureAoS();
      measureSoA();
    } else {
      measureSoA();
      measureAoS();
    }
    maximumDifference = Math.max(maximumDifference, maximumLayoutDifference(aos, soa));
  }

  return {
    particleCount: sourceAoS.count,
    workload,
    aosMilliseconds: median(aosSamples),
    soaMilliseconds: median(soaSamples),
    aosChecksum,
    soaChecksum,
    maximumDifference,
  };
}
