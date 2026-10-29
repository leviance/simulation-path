import assert from "node:assert/strict";
import test from "node:test";
import * as vectors from "../lib/labs/million-vector-gpu.ts";
import {
  VectorLabController,
  workgroupGrid,
  probeData,
} from "../lib/labs/million-vector-gpu/controller.ts";
import {
  includedSteps,
  PIPELINE_STEPS,
  scopeDescription,
} from "../lib/labs/million-vector-gpu/scopes.ts";

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

test("timing scopes do not manufacture GPU measurements", () => {
  assert.equal(PIPELINE_STEPS.length, 7);
  assert.deepEqual(includedSteps("cpu"), []);
  assert.deepEqual(includedSteps("kernel"), [1]);
  assert.deepEqual(includedSteps("end-to-end"), [0, 1, 2, 3, 4]);
  assert.match(scopeDescription("end-to-end"), /fence wait/);
  assert.match(scopeDescription("end-to-end"), /N\+256/);
  assert.match(scopeDescription("kernel"), /pending/);
  assert.equal(vectors.median([9, 1, 5]), 5);
  assert.throws(() => vectors.median([1, NaN]), RangeError);
  assert.equal(vectors.median([Number.MAX_VALUE, Number.MAX_VALUE]), Number.MAX_VALUE);
});

test("float32 deterministic inputs match an independent BigInt/Float32Array reference", () => {
  const f32 = (number) => new Float32Array([number])[0];
  const mask = 0xffffffffn;
  function reference(index, channel, seed) {
    let value = BigInt(index) ^ ((BigInt(channel) * 0x9e3779b9n) & mask) ^ BigInt(seed);
    value = ((value ^ (value >> 16n)) * 0x7feb352dn) & mask;
    value = ((value ^ (value >> 15n)) * 0x846ca68bn) & mask;
    value ^= value >> 16n;
    return f32(f32(f32(Number(value & 0xffffffn) / 16777215) * 2) - 1);
  }
  for (const index of [0, 1, 255, 256, 777, 65_536, 1_000_002]) {
    for (const channel of [0, 1, 2, 3, 4, 5, 6, 7]) {
      assert.equal(
        vectors.deterministicComponent(index, channel, 0x37c0ffee),
        reference(index, channel, 0x37c0ffee),
      );
    }
  }
  assert.ok(
    Object.values(vectors.vectorAt(777, "a")).every((value) => Math.fround(value) === value),
  );
});

test("dispatch and vector APIs reject invalid values before allocation or indexing", () => {
  for (const count of [-1, 0.5, Infinity, NaN, vectors.MAXIMUM_ELEMENT_COUNT + 1]) {
    assert.throws(() => vectors.makeDispatchPlan(count, 256), RangeError);
  }
  for (const local of [0, -1, NaN, 256.5, Infinity])
    assert.throws(() => vectors.makeDispatchPlan(257, local), RangeError);
  assert.equal(vectors.makeDispatchPlan(0, 256).workgroupCount, 0);
  assert.throws(() => vectors.vectorAt(-1, "a"), RangeError);
  assert.throws(() => vectors.vectorAt(0, "b", -1), RangeError);
  assert.throws(() => vectors.invocationAddress(0, 256, 256), RangeError);
  assert.throws(() => vectors.std430ByteOffset(NaN), RangeError);
});

test("capability storage includes canary padding and three block/binding slots", () => {
  const plan = vectors.makeDispatchPlan(256, 256);
  const exactWithoutPadding = {
    ...vectors.DESKTOP_LIMITS,
    maximumShaderStorageBlockBytes: 256 * 16,
  };
  assert.equal(
    vectors.validateCapabilities(exactWithoutPadding, plan).storageBlockLargeEnough,
    false,
  );
  assert.equal(
    vectors.validateCapabilities({ ...vectors.DESKTOP_LIMITS, maximumStorageBindings: 2 }, plan)
      .bindingsSupported,
    false,
  );
  assert.equal(
    vectors.validateCapabilities(
      { ...vectors.DESKTOP_LIMITS, maximumComputeStorageBlocks: 2 },
      plan,
    ).bindingsSupported,
    false,
  );
});

test("validator uses channel names, checks all channels and rejects invalid tolerances", () => {
  const expected = [{ x: 0, y: -2, z: 3, w: -4 }];
  assert.equal(
    vectors.validationPassed(vectors.validateOutput(expected, [{ w: -4, z: 3, y: -2, x: 0 }])),
    true,
  );
  for (const [component, key] of ["x", "y", "z", "w"].entries()) {
    const actual = [{ ...expected[0], [key]: expected[0][key] + 0.1 }];
    const report = vectors.validateOutput(expected, actual);
    assert.equal(vectors.validationPassed(report), false);
    assert.equal(report.firstMismatchComponent, component);
  }
  for (const value of [NaN, Infinity, -1])
    assert.equal(
      vectors.validationPassed(vectors.validateOutput(expected, expected, value)),
      false,
    );
  const nonFinite = vectors.validateOutput(expected, [{ ...expected[0], z: Infinity }]);
  assert.equal(nonFinite.firstNonFinite, 0);
  assert.equal(nonFinite.firstMismatchComponent, 2);
  assert.equal(vectors.validationPassed(vectors.validateOutput(expected, [])), false);
});

test("controller resets complete state and clamps index/lane when presets shrink", () => {
  const controller = new VectorLabController();
  controller.configure({
    selectedIndex: 1_000_002,
    selectedLane: 255,
    operation: "axpy",
    scalar: -4,
    component: 3,
    injectedError: "nan",
  });
  controller.configure({ elementCount: 256, localSize: 32 });
  assert.equal(controller.getSnapshot().selectedIndex, 255);
  assert.equal(controller.getSnapshot().selectedLane, 31);
  controller.beginPointer(7, true, 0);
  controller.reset();
  assert.equal(controller.getSnapshot().pointer, null);
  assert.equal(controller.getSnapshot().operation, "add");
  assert.equal(controller.getSnapshot().injectedError, "none");
  assert.equal(controller.getSnapshot().paused, true);
  const one = new VectorLabController("one-workgroup");
  one.configure({ elementCount: 1_000_003, localSize: 32 });
  assert.equal(one.getSnapshot().elementCount, 256);
  assert.equal(one.getSnapshot().localSize, 256);
  assert.throws(() => controller.configure({ selectedIndex: NaN }), RangeError);
  assert.throws(() => controller.configure({ elementCount: 0 }), RangeError);
});

test("only the primary pointer owns the drag and workgroup hit testing uses both axes", () => {
  const controller = new VectorLabController("dispatch-tail");
  controller.resize(760, 340);
  assert.equal(controller.beginPointer(1, false, 0), false);
  assert.equal(controller.beginPointer(1, true, 2), false);
  assert.equal(controller.beginPointer(2, true, 0), true);
  assert.equal(controller.beginPointer(3, true, 0), false);
  const grid = workgroupGrid(controller.getSnapshot());
  const point = (lane) => [
    grid.left + ((lane % grid.columns) + 0.5) * grid.cell,
    grid.top + (Math.floor(lane / grid.columns) + 0.5) * grid.cell,
  ];
  controller.selectPoint(2, ...point(66));
  assert.equal(controller.getSnapshot().selectedLane, 66);
  assert.equal(vectors.invocationAddress(3906, 66, 256), 1_000_002);
  controller.selectPoint(3, ...point(67));
  assert.equal(controller.getSnapshot().selectedLane, 66);
  assert.equal(controller.endPointer(3), false);
  controller.selectPoint(2, ...point(67));
  assert.equal(controller.getSnapshot().selectedLane, 67);
  assert.equal(controller.endPointer(2), true);
  controller.selectPoint(2, ...point(4));
  assert.equal(controller.getSnapshot().selectedLane, 67);
});

test("autoplay is finite, pause persists, delayed frames do not cause unbounded catch-up", () => {
  const controller = new VectorLabController("barrier-readback");
  controller.resume();
  controller.tick(100_000);
  assert.equal(controller.getSnapshot().tourStep, 1);
  controller.pause();
  const paused = controller.getSnapshot();
  controller.tick(1000);
  assert.equal(controller.getSnapshot(), paused);
  controller.resume();
  for (let frame = 0; frame < 100; frame += 1) controller.tick(500);
  assert.equal(controller.getSnapshot().tourStep, 6);
  assert.equal(controller.getSnapshot().paused, true);
});

test("dispose cancels ownership and animation; remount and subscription cleanup are safe", () => {
  const controller = new VectorLabController();
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => {
    notifications += 1;
  });
  controller.beginPointer(2, true, 0);
  controller.resume();
  controller.dispose();
  assert.equal(controller.getSnapshot().pointer, null);
  assert.equal(controller.getSnapshot().paused, true);
  const disposed = controller.getSnapshot();
  controller.tick(500);
  controller.step();
  assert.equal(controller.getSnapshot(), disposed);
  unsubscribe();
  const count = notifications;
  controller.mount();
  controller.step();
  assert.equal(notifications, count);
  assert.equal(controller.getSnapshot().tourStep, 1);
});

test("injected errors are explicit JS probes and never called GPU output", () => {
  const controller = new VectorLabController("gpu-validation");
  for (const injectedError of ["large", "nan", "infinity", "missing", "nan-tolerance"]) {
    controller.configure({ component: 3, injectedError });
    assert.equal(vectors.validationPassed(probeData(controller.getSnapshot()).report), false);
  }
});
