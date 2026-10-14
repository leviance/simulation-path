import test from "node:test";
import assert from "node:assert/strict";
import * as r from "../lib/labs/ray-intersections.ts";

test("Ray record validator catches forged geometry but does not certify empty miss", () => {
  const value = r.cameraRay(r.presetCamera(), 0.5, 0.5, 1.5);
  const hits = r.candidates(value, r.scene);
  assert.equal(r.validateHits(value, r.scene, hits).failures, 0);
  hits[1] = r.makeHit(value, 3, { x: 1, y: 0, z: 0 }, 1);
  assert.ok(r.validateHits(value, r.scene, hits).failures > 0);
  assert.deepEqual(r.validateHits(value, r.scene, []), { checks: 1, failures: 0 });
});
const vec = (x = 0, y = 0, z = 0) => ({ x, y, z });
const ray = (origin = vec(0, 0, -3), direction = vec(0, 0, 1), tMin = 1e-6, tMax = 30) => ({
  origin,
  direction,
  tMin,
  tMax,
});
const near = (a, b, tolerance = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const hitAt = (hit, t) => {
  assert.ok(hit);
  near(hit.t, t);
  near(r.length(hit.normal), 1);
  assert.ok(r.finite(hit.point));
  return hit;
};
test("Ray camera projection round trips at corners and four aspect ratios", () => {
  const camera = r.presetCamera();
  for (const aspect of [0.6, 1, 1.5, 2.5])
    for (const u of [0, 0.25, 0.5, 1])
      for (const v of [0, 0.5, 1]) {
        const value = r.cameraRay(camera, u, v, aspect),
          pixel = r.project(r.at(value, 5), camera, 600 * aspect, 600);
        near(r.length(value.direction), 1);
        assert.ok(pixel);
        near(pixel.x, 600 * aspect * u);
        near(pixel.y, 600 * v);
      }
  assert.equal(r.project(vec(0, 0, -9), camera, 800, 600), null);
});
test("Ray plane parallel, coplanar, angular threshold, behind and range cases", () => {
  const plane = { point: vec(), normal: vec(0, 2, 0) };
  assert.equal(hitAt(r.intersectPlane(ray(vec(0, 2), vec(0, -1)), plane), 2).frontFace, true);
  for (const value of [
    ray(vec(0, 2), vec(1)),
    ray(vec(), vec(1)),
    ray(vec(0, 2), vec(1, -1e-12)),
    ray(vec(0, 2), vec(0, 1)),
    ray(vec(0, 2), vec(0, -1), 0, 1),
  ])
    assert.equal(r.intersectPlane(value, plane), null);
});
test("Ray sphere entry, exit, nonunit, tangent and q-zero retain geometric normals", () => {
  const sphere = { center: vec(), radius: 1 };
  hitAt(r.intersectSphere(ray(), sphere), 2);
  hitAt(r.intersectSphere(ray(vec(0, 0, -3), vec(0, 0, 2)), sphere), 1);
  assert.equal(hitAt(r.intersectSphere(ray(vec()), sphere), 1).frontFace, false);
  hitAt(r.intersectSphere(ray(vec(1, 0, -3)), sphere), 3);
  hitAt(r.intersectSphere(ray(vec(1), vec(0, 0, 1), 0, 2), sphere), 0);
  assert.equal(r.intersectSphere(ray(vec(1)), sphere), null);
  assert.equal(r.intersectSphere(ray(vec(1.001, 0, -3)), sphere), null);
  assert.equal(r.intersectSphere(ray(vec(0, 0, -3), vec(0, 0, -1)), sphere), null);
  hitAt(r.intersectSphere(ray(vec(0, 0, -3), vec(0, 0, 1), 2.5, 4), sphere), 4);
});
test("Ray AABB slab interval is not confused with the first surface hit", () => {
  const box = { minimum: vec(-1, -1, -1), maximum: vec(1, 1, 1) };
  const interval = r.boxInterval(ray(), box);
  near(interval.entry, 2);
  near(interval.exit, 4);
  hitAt(r.intersectBox(ray(), box), 2);
  const inside = hitAt(r.intersectBox(ray(vec()), box), 1);
  assert.equal(inside.frontFace, false);
  assert.deepEqual(inside.normal, vec(0, 0, 1));
  assert.equal(r.intersectBox(ray(vec(), vec(0, 0, 1), 0.1, 0.5), box), null);
  hitAt(r.intersectBox(ray(vec(1, 0, -3)), box), 2);
  assert.equal(r.intersectBox(ray(vec(1.01, 0, -3)), box), null);
  assert.deepEqual(
    hitAt(r.intersectBox(ray(vec(0, 0, 3), vec(0, 0, -1)), box), 2).normal,
    vec(0, 0, 1),
  );
  const tiny = ray(vec(1.01, 0, 0), vec(-1e-4, 0, 0), 0, 30000);
  hitAt(r.intersectBox(tiny, box), 100);
});
test("Ray triangle is two-sided, closed at edges and rejects degeneracy", () => {
  const triangle = { a: vec(-1, -1), b: vec(1, -1), c: vec(0, 1) };
  const hit = hitAt(r.intersectTriangle(ray(), triangle), 3);
  near(hit.u, 0.25);
  near(hit.v, 0.5);
  assert.equal(hit.frontFace, false);
  assert.equal(
    hitAt(r.intersectTriangle(ray(vec(0, 0, 3), vec(0, 0, -1)), triangle), 3).frontFace,
    true,
  );
  for (const origin of [vec(-1, -1, -3), vec(0, -1, -3), vec(0, 1, -3)])
    hitAt(r.intersectTriangle(ray(origin), triangle), 3);
  assert.equal(r.intersectTriangle(ray(vec(2, 0, -3)), triangle), null);
  assert.equal(r.intersectTriangle(ray(vec(0, 0, -3), vec(1)), triangle), null);
  assert.equal(r.intersectTriangle(ray(), { a: vec(), b: vec(1), c: vec(2) }), null);
});
test("Ray nearest is independent of candidate order with stable exact ties", () => {
  const hits = [
    r.makeHit(ray(), 4, vec(0, 0, -1), 0),
    r.makeHit(ray(), 2, vec(0, 0, -1), 1),
    r.makeHit(ray(), 2, vec(0, 0, -1), 2),
    null,
  ];
  assert.equal(r.nearestHit(hits).objectId, 1);
  assert.equal(r.nearestHit(hits.reverse()).objectId, 1);
  assert.equal(r.nearestHit([]), null);
  assert.equal(
    r.nearestHit(r.candidates(r.cameraRay(r.presetCamera(3), 0.5, 0.5, 1.5), r.scene)),
    null,
  );
  for (const [preset, id] of [
    [1, 1],
    [2, 2],
  ])
    assert.equal(
      r.nearestHit(r.candidates(r.cameraRay(r.presetCamera(preset), 0.5, 0.5, 1.5), r.scene))
        .objectId,
      id,
    );
  for (const stage of [1, 2])
    assert.ok(r.candidates(ray(), r.scene, stage).every((hit) => hit === null));
});
test("Ray scene hits satisfy independent surface equations and normals", () => {
  const geometry = r.scene,
    counts = [0, 0, 0, 0];
  for (let yi = 0; yi <= 32; yi++)
    for (let xi = 0; xi <= 48; xi++) {
      const value = r.cameraRay(r.presetCamera(), xi / 48, yi / 32, 1.5);
      for (const hit of r.candidates(value, geometry)) {
        if (!hit) continue;
        counts[hit.objectId]++;
        near(r.length(hit.normal), 1);
        assert.equal(hit.frontFace, r.dot(value.direction, hit.normal) < 0);
        if (hit.objectId === 0)
          near(r.dot(r.subtract(hit.point, geometry.plane.point), geometry.plane.normal), 0);
        if (hit.objectId === 1)
          near(r.length(r.subtract(hit.point, geometry.sphere.center)), geometry.sphere.radius);
        if (hit.objectId === 2) {
          const distances = [];
          for (const axis of ["x", "y", "z"]) {
            assert.ok(
              hit.point[axis] >= geometry.box.minimum[axis] - 1e-9 &&
                hit.point[axis] <= geometry.box.maximum[axis] + 1e-9,
            );
            distances.push(
              Math.abs(hit.point[axis] - geometry.box.minimum[axis]),
              Math.abs(hit.point[axis] - geometry.box.maximum[axis]),
            );
          }
          near(Math.min(...distances), 0);
        }
        if (hit.objectId === 3) {
          const point = r.add(
            r.add(
              r.multiply(geometry.triangle.a, 1 - hit.u - hit.v),
              r.multiply(geometry.triangle.b, hit.u),
            ),
            r.multiply(geometry.triangle.c, hit.v),
          );
          near(r.length(r.subtract(point, hit.point)), 0);
        }
      }
    }
  assert.ok(counts.every((n) => n > 0));
});
test("Ray invalid inputs and geometry never create a Hit with NaN", () => {
  const invalids = [
    ray(vec(NaN)),
    ray(vec(), vec()),
    ray(vec(), vec(0, 0, Infinity)),
    ray(vec(), vec(0, 0, 1), 2, 1),
    ray(vec(), vec(0, 0, 1), 0, NaN),
  ];
  for (const value of invalids)
    assert.deepEqual(r.candidates(value, r.scene), [null, null, null, null]);
  assert.equal(r.intersectSphere(ray(), { center: vec(), radius: -1 }), null);
  assert.equal(r.intersectPlane(ray(), { point: vec(), normal: vec() }), null);
  assert.equal(r.intersectBox(ray(), { minimum: vec(1, 1, 1), maximum: vec(-1, -1, -1) }), null);
});
