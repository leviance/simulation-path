import { measureMemoryWorkload } from "../../../lib/labs/memory-layout-benchmark";
import {
  makeParticlesAoS,
  makeParticlesSoA,
  type MemoryWorkload,
} from "../../../lib/labs/memory-layout";

interface BenchmarkRequest {
  kind: "benchmark" | "scaling";
  particleCount: number;
  seed: number;
  workload: MemoryWorkload;
}

self.onmessage = (event: MessageEvent<BenchmarkRequest>) => {
  const request = event.data;
  const counts =
    request.kind === "scaling" ? [10_000, 100_000, 1_000_000] : [request.particleCount];
  const rows = counts.map((count) => {
    const sourceAoS = makeParticlesAoS(count, request.seed);
    return measureMemoryWorkload(sourceAoS, makeParticlesSoA(sourceAoS), request.workload);
  });
  self.postMessage({ kind: request.kind, rows });
};
