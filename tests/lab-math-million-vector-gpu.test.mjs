import assert from "node:assert/strict";
import test from "node:test";
import * as vectors from "../lib/labs/million-vector-gpu.ts";

test("deterministic vector probes reproduce every component", () => {
  const first = vectors.vectorAt(777, "a", 123);
  const second = vectors.vectorAt(777, "a", 123);
  const other = vectors.vectorAt(777, "a", 124);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, other);
  assert.ok(Object.values(first).every((value) => value >= -1 && value <= 1));
});

test("Add, AXPY and Difference stay component-wise", () => {
  const a = { x: 1, y: -2, z: 3, w: -4 };
  const b = { x: 0.5, y: 1.5, z: -2, w: 4 };
  assert.deepEqual(vectors.applyVectorOperation(a, b, "add", 2), {
    x: 1.5,
    y: -0.5,
    z: 1,
    w: 0,
  });
  assert.deepEqual(vectors.applyVectorOperation(a, b, "axpy", 2), {
    x: 2.5,
    y: -2.5,
    z: 4,
    w: -4,
  });
  assert.deepEqual(vectors.applyVectorOperation(a, b, "difference", 2), {
    x: 0.5,
    y: -3.5,
    z: 5,
    w: -8,
  });
});

test("one million and three elements expose a guarded dispatch tail", () => {
  const plan = vectors.makeDispatchPlan(1_000_003, 256);
  assert.deepEqual(plan, {
    elementCount: 1_000_003,
    localSize: 256,
    workgroupCount: 3907,
    launchedInvocations: 1_000_192,
    unusedInvocations: 189,
  });
  assert.equal(vectors.invocationAddress(3906, 66, 256), 1_000_002);
  assert.ok(vectors.invocationAddress(3906, 67, 256) >= plan.elementCount);
});

test("std430 vec4 stride maps index to sixteen-byte offsets", () => {
  assert.equal(vectors.std430ByteOffset(0), 0);
  assert.equal(vectors.std430ByteOffset(1), 16);
  assert.equal(vectors.std430ByteOffset(1_000_002), 16_000_032);
});

test("capability report names the limit that rejects a workload", () => {
  const plan = vectors.makeDispatchPlan(1_000_003, 256);
  assert.ok(
    Object.values(vectors.validateCapabilities(vectors.DESKTOP_LIMITS, plan)).every(Boolean),
  );
  const weak = vectors.validateCapabilities(vectors.WEAK_LIMITS, plan);
  assert.equal(weak.version43OrNewer, false);
  assert.equal(weak.localSizeSupported, false);
  assert.equal(weak.storageBlockLargeEnough, false);
});

test("mixed tolerance accepts roundoff but rejects material error and NaN", () => {
  const expected = [{ x: 1, y: 2, z: 3, w: 4 }];
  const roundoff = [{ x: 1 + 1e-7, y: 2, z: 3, w: 4 }];
  assert.equal(vectors.validateOutput(expected, roundoff).mismatchCount, 0);

  const wrong = vectors.validateOutput(expected, [{ x: 1.01, y: 2, z: 3, w: 4 }]);
  assert.equal(wrong.firstMismatch, 0);
  assert.equal(wrong.mismatchCount, 1);
  assert.ok(wrong.maximumAbsoluteError > 0.009);

  const nonFinite = vectors.validateOutput(expected, [{ x: Number.NaN, y: 2, z: 3, w: 4 }]);
  assert.equal(nonFinite.allFinite, false);
  assert.equal(nonFinite.mismatchCount, 1);
});

test("timing model stays labeled, finite and bounded", () => {
  const rows = Array.from({ length: 9 }, (_, index) =>
    vectors.modelPipelineMilliseconds(1_000_003, index),
  );
  assert.ok(rows.every((row) => Object.values(row).every(Number.isFinite)));
  assert.ok(vectors.median(rows.map((row) => row.compute)) > 0);
  assert.equal(vectors.median([9, 1, 5]), 5);
});

test("named Project 37 validation covers every CPU-to-GPU contract", () => {
  const report = vectors.validateMillionVectorContract();
  assert.equal(Object.keys(report).length, 7);
  assert.ok(Object.values(report).every(Boolean));
});
