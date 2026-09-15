import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneParticlesAoS,
  cloneParticlesSoA,
  dampVelocitiesAoS,
  dampVelocitiesSoA,
  estimateMemoryTraffic,
  integrateAoS,
  integrateSoA,
  makeParticlesAoS,
  makeParticlesSoA,
  maximumLayoutDifference,
  runAoSWorkload,
  runSoAWorkload,
  sumPositionXAoS,
  sumPositionXSoA,
} from "../lib/labs/memory-layout.ts";
import { measureMemoryWorkload } from "../lib/labs/memory-layout-benchmark.ts";

test("AoS generation is deterministic and stores six floats per particle", () => {
  const first = makeParticlesAoS(4096, 0x32c0ffee);
  const second = makeParticlesAoS(4096, 0x32c0ffee);
  assert.equal(first.data.length, 4096 * 6);
  assert.deepEqual(first.data, second.data);
  assert.notDeepEqual(first.data, makeParticlesAoS(4096, 0x32c0ffef).data);
});

test("AoS to SoA conversion preserves every field at every index", () => {
  const aos = makeParticlesAoS(1024, 0x32c0ffee);
  const soa = makeParticlesSoA(aos);
  assert.equal(maximumLayoutDifference(aos, soa), 0);
  assert.equal(soa.px.length, aos.count);
  assert.equal(soa.vz.length, aos.count);
});

test("AoS and SoA integration remain bit-identical through wrapping", () => {
  const aos = makeParticlesAoS(2048, 0x32c0ffee);
  const soa = makeParticlesSoA(aos);
  for (let step = 0; step < 300; step += 1) {
    integrateAoS(aos, 1 / 120);
    integrateSoA(soa, 1 / 120);
  }
  assert.equal(maximumLayoutDifference(aos, soa), 0);
});

test("field-specific kernels preserve equivalent output across layouts", () => {
  const aos = makeParticlesAoS(1500, 0x32c0ffee);
  const soa = makeParticlesSoA(aos);
  dampVelocitiesAoS(aos, 0.975);
  dampVelocitiesSoA(soa, 0.975);
  assert.equal(maximumLayoutDifference(aos, soa), 0);
  assert.equal(sumPositionXAoS(aos), sumPositionXSoA(soa));
});

test("cache-line model exposes wasted AoS traffic for a single field", () => {
  const aos = estimateMemoryTraffic("aos", "position-x", 1_000_000);
  const soa = estimateMemoryTraffic("soa", "position-x", 1_000_000);
  assert.equal(aos.usefulBytes, 4_000_000);
  assert.equal(soa.usefulBytes, aos.usefulBytes);
  assert.ok(soa.cacheLines < aos.cacheLines);
  assert.ok(soa.efficiency > aos.efficiency);
});

test("full integration touches comparable bytes for AoS and SoA", () => {
  const aos = estimateMemoryTraffic("aos", "integrate", 16_384);
  const soa = estimateMemoryTraffic("soa", "integrate", 16_384);
  assert.equal(aos.usefulBytes, 16_384 * 24);
  assert.equal(aos.cacheLines, soa.cacheLines);
  assert.equal(aos.efficiency, 1);
  assert.equal(soa.efficiency, 1);
});

test("constant-time AoS traffic estimate matches an explicit cache-line set", () => {
  const offsets = {
    "position-x": [0],
    "velocity-only": [3, 4, 5],
    integrate: [0, 1, 2, 3, 4, 5],
  };
  for (const count of [1, 2, 17, 4096]) {
    for (const workload of Object.keys(offsets)) {
      const lines = new Set();
      for (let index = 0; index < count; index += 1) {
        for (const field of offsets[workload]) {
          lines.add(Math.floor(((index * 6 + field) * 4) / 64));
        }
      }
      assert.equal(estimateMemoryTraffic("aos", workload, count).cacheLines, lines.size);
    }
  }
});

test("browser benchmark returns finite medians without changing either output", () => {
  const sourceAoS = makeParticlesAoS(4096, 0x32c0ffee);
  const sourceSoA = makeParticlesSoA(sourceAoS);
  const result = measureMemoryWorkload(sourceAoS, sourceSoA, "integrate");
  assert.ok(Number.isFinite(result.aosMilliseconds));
  assert.ok(Number.isFinite(result.soaMilliseconds));
  assert.equal(result.aosChecksum, result.soaChecksum);
  assert.equal(result.maximumDifference, 0);
});

test("bounded workload runner keeps clones equivalent without timing assertions", () => {
  const source = makeParticlesAoS(8192, 0x32c0ffee);
  const aos = cloneParticlesAoS(source);
  const soa = cloneParticlesSoA(makeParticlesSoA(source));
  for (const workload of ["position-x", "velocity-only", "integrate"]) {
    const aosChecksum = runAoSWorkload(aos, workload);
    const soaChecksum = runSoAWorkload(soa, workload);
    assert.equal(aosChecksum, soaChecksum);
    assert.equal(maximumLayoutDifference(aos, soa), 0);
  }
});
