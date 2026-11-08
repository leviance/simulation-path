import assert from "node:assert/strict";
import test from "node:test";
import * as m from "../lib/labs/million-object-city/math.ts";
import { CityController } from "../lib/labs/million-object-city/controller.ts";
import { buildingFaces, clipDepth } from "../lib/labs/million-object-city/render.ts";

const boxPlanes = [
  { x: 1, y: 0, z: 0, w: 1 },
  { x: -1, y: 0, z: 0, w: 1 },
  { x: 0, y: 1, z: 0, w: 1 },
  { x: 0, y: -1, z: 0, w: 1 },
  { x: 0, y: 0, z: 1, w: 1 },
  { x: 0, y: 0, z: -1, w: 1 },
];
const object = (id, center = { x: 0, y: 0, z: 0 }, mesh = 0) => ({
  id,
  center,
  mesh,
  half: { x: 0.1, y: 0.1, z: 0.1 },
  radius: 0.25,
  color: [100, 150, 200],
});

test("city sphere reference covers inside, outside and crossing each plane", () => {
  assert.equal(m.rejectedPlane(object(0), boxPlanes), -1);
  for (let i = 0; i < 6; ++i) {
    const normal = boxPlanes[i];
    const outside = m.mul(normal, -1.5),
      crossing = m.mul(normal, -1.1);
    assert.equal(m.rejectedPlane(object(i, outside), boxPlanes), i);
    assert.equal(m.rejectedPlane(object(i, crossing), boxPlanes), -1);
  }
});

test("seeded city records are stable, varied and bounded without a hidden million claim", () => {
  const first = m.makeCity(2049, 39),
    same = m.makeCity(2049, 39),
    other = m.makeCity(2049, 40);
  assert.deepEqual(first, same);
  assert.notDeepEqual(first, other);
  assert.equal(new Set(first.map((o) => o.id)).size, 2049);
  assert.equal(new Set(first.map((o) => o.mesh)).size, 3);
  assert.ok(
    first.every((o) => Math.abs(o.radius - Math.hypot(o.half.x, o.half.y, o.half.z)) < 1e-10),
  );
  assert.throws(() => m.makeCity(1_000_000, 39), /Canvas/);
});

test("exclusive uint scan matches an independent sequential oracle over multiple levels", () => {
  for (const n of [0, 1, 3, 257, 513, 2049]) {
    const input = Array.from({ length: n }, (_, i) => [i % 3, i % 2, i % 5, 1]);
    const expected = [],
      sums = [0, 0, 0, 0];
    for (const row of input) {
      expected.push([...sums]);
      row.forEach((v, c) => {
        sums[c] += v;
      });
    }
    assert.deepEqual(m.exclusiveScan(input, 8), expected);
    assert.deepEqual(m.exclusiveScan(input), expected);
  }
  assert.throws(
    () =>
      m.exclusiveScan([
        [0xffffffff, 0, 0, 0],
        [1, 0, 0, 0],
      ]),
    /overflow/,
  );
  assert.throws(() => m.exclusiveScan([[-1, 0, 0, 0]]), /uint32/);
  assert.throws(() => m.exclusiveScan([[0.5, 0, 0, 0]]), /uint32/);
});

test("stable compaction handles sparse IDs and builds three exact indirect commands", () => {
  const objects = [
    object(99, undefined, 2),
    object(12, undefined, 0),
    object(81, { x: 5, y: 0, z: 0 }, 1),
    object(47, undefined, 2),
    object(7, undefined, 1),
  ];
  const result = m.pipeline(objects, boxPlanes, { x: 0, y: 0, z: 0 }, true);
  assert.deepEqual(result.counts, [1, 1, 2, 4]);
  assert.deepEqual(result.visibleIds, [12, 7, 99, 47]);
  assert.equal(new Set(result.visibleIds).size, 4);
  assert.deepEqual(result.offsets, [0, 1, 2]);
  assert.deepEqual(result.commands, [
    { count: 36, instanceCount: 1, firstIndex: 0, baseVertex: 0, baseInstance: 0 },
    { count: 36, instanceCount: 1, firstIndex: 36, baseVertex: 0, baseInstance: 1 },
    { count: 18, instanceCount: 2, firstIndex: 72, baseVertex: 0, baseInstance: 2 },
  ]);
  assert.equal(result.minId, 7);
  assert.equal(result.maxId, 99);
});

test("empty and all-visible masks clear commands and define empty distance semantics", () => {
  for (const objects of [[], [object(15, { x: 5, y: 0, z: 0 })]]) {
    const result = m.pipeline(objects, boxPlanes, { x: 0, y: 0, z: 0 }, true);
    assert.deepEqual(result.visibleIds, []);
    assert.ok(result.commands.every((command) => command.instanceCount === 0));
    assert.equal(result.minDistance, null);
    assert.equal(result.maxDistance, null);
  }
  const all = m.pipeline(
    [object(15, { x: 5, y: 0, z: 0 })],
    boxPlanes,
    { x: 0, y: 0, z: 0 },
    false,
  );
  assert.deepEqual(all.counts, [1, 0, 0, 1]);
  assert.equal(all.minDistance, 5);
  assert.equal(all.maxDistance, 5);
});

test("camera ray/projection round trip and frustum agree in world space", () => {
  const camera = m.defaultCamera(),
    axes = m.basis(camera);
  const p = m.add(
    camera.eye,
    m.add(m.mul(axes.forward, 100), m.add(m.mul(axes.right, 12), m.mul(axes.up, 7))),
  );
  const projected = m.projectPoint(p, camera, 900, 500),
    ray = m.screenRay(projected.x, projected.y, camera, 900, 500);
  const expected = m.normalized(m.sub(p, camera.eye));
  assert.ok(m.length(m.sub(ray, expected)) < 1e-12);
  assert.equal(m.rejectedPlane(object(0, p), m.frustum(camera, 1.8)), -1);
  const moved = m.moveCamera(camera, 10, 0, 0);
  assert.ok(m.length(m.sub(moved.eye, camera.eye)) > 9.99);
});

test("picking uses a finite nearest AABB ray, not projected center distance", () => {
  const near = object(0, { x: 0, y: 0, z: 5 }),
    far = object(1, { x: 0, y: 0, z: 15 });
  const eye = { x: 0, y: 0, z: 0 },
    direction = { x: 0, y: 0, z: 1 };
  assert.ok(m.rayBox(eye, direction, near) < m.rayBox(eye, direction, far));
  assert.equal(m.rayBox(eye, { x: 1, y: 0, z: 0 }, near), null);
});

test("controller reset, pause, regeneration failure and pointer ownership preserve state", () => {
  const c = new CityController();
  c.mount();
  const initial = c.getSnapshot();
  c.resume();
  c.tick(0.02);
  assert.notDeepEqual(c.getSnapshot().camera, initial.camera);
  c.pause();
  const paused = c.getSnapshot().camera;
  c.tick(2);
  assert.deepEqual(c.getSnapshot().camera, paused);
  c.move(2, 0, 0);
  assert.notDeepEqual(c.getSnapshot().camera, paused);
  c.reset();
  assert.deepEqual(c.getSnapshot().camera, initial.camera);
  c.regenerate(1_000_000, 40);
  assert.equal(c.getSnapshot().seed, 39);
  assert.equal(c.getSnapshot().objects.length, 1024);
  assert.equal(c.beginPointer(1, true, 0, 10, 20), true);
  assert.equal(c.beginPointer(2, true, 0, 10, 20), false);
  c.endPointer(2);
  assert.equal(c.getSnapshot().pointer, 1);
  c.endPointer(1);
  assert.equal(c.getSnapshot().pointer, null);
  c.dispose();
});

test("CPU validation batches have a finite end, cancellation and reset snapshot", () => {
  const c = new CityController("scan");
  assert.equal(c.getSnapshot().mounted, false);
  c.mount();
  assert.equal(c.getSnapshot().mounted, true);
  c.validate();
  for (let i = 0; i < 9; ++i) c.tick(0);
  assert.equal(c.getSnapshot().validation.status, "complete");
  assert.equal(c.getSnapshot().validation.done, 9);
  c.validate();
  c.cancel();
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  c.validate();
  c.setFov(70);
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  c.dispose();
});

test("resize invalidates a running camera batch and reset restores view controls", () => {
  const c = new CityController("frustum");
  c.toggleCulling();
  c.toggleDebug();
  c.validate();
  c.resize(900, 500);
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  c.reset();
  assert.equal(c.getSnapshot().culling, true);
  assert.equal(c.getSnapshot().debug, true);
  assert.equal(c.getSnapshot().validation.status, "idle");
  c.validate();
  c.resume();
  assert.equal(c.getSnapshot().paused, true);
  c.cancel();
  assert.equal(c.beginPointer(3, true, 0, 10, 10), true);
  c.preset("street");
  assert.equal(c.getSnapshot().pointer, null);
  c.regenerate(64, 42);
  assert.equal(c.getSnapshot().time, 0);
  c.resume();
  c.tick(NaN);
  assert.ok(Object.values(c.getSnapshot().camera.eye).every(Number.isFinite));
  const valid = c.getSnapshot();
  c.regenerate(64, NaN);
  assert.equal(c.getSnapshot().seed, valid.seed);
  assert.equal(c.getSnapshot().objects, valid.objects);
  c.dispose();
});

test("Canvas mesh vertices stay inside declared bounds and near/far clipping stays finite", () => {
  const objects = m.makeCity(257, 39);
  const byId = new Map(objects.map((object) => [object.id, object]));
  for (const face of buildingFaces(objects)) {
    const object = byId.get(face.id);
    for (const vertex of face.vertices) {
      assert.ok(m.length(m.sub(vertex, object.center)) <= object.radius + 1e-9);
      for (const axis of ["x", "y", "z"])
        assert.ok(Math.abs(vertex[axis] - object.center[axis]) <= object.half[axis] + 1e-9);
    }
  }
  for (const object of objects.slice(0, 20)) {
    const indexCount = buildingFaces(objects)
      .filter((face) => face.id === object.id)
      .reduce((sum, face) => sum + (face.vertices.length - 2) * 3, 0);
    assert.equal(indexCount, [36, 36, 18][object.mesh]);
  }
  const clipped = clipDepth(
    [
      { x: -1, y: 0, z: -2 },
      { x: 1, y: 0, z: 4 },
      { x: 0, y: 3, z: 15 },
    ],
    0.5,
    10,
  );
  assert.ok(clipped.length >= 3);
  assert.ok(clipped.every((v) => v.z >= 0.5 - 1e-12 && v.z <= 10 + 1e-12));
  assert.ok(clipped.flatMap(Object.values).every(Number.isFinite));
  assert.deepEqual(
    clipDepth(
      [
        { x: 0, y: 0, z: -4 },
        { x: 1, y: 0, z: -2 },
      ],
      0.5,
      10,
    ),
    [],
  );
});
