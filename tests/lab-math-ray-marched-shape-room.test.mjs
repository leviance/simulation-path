import assert from "node:assert/strict";
import test from "node:test";
import * as room from "../lib/labs/ray-marched-shape-room.ts";

const near = (actual, expected, epsilon = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
};

test("camera center ray is finite, normalized and points at the target", () => {
  const ray = room.makeCameraRay(room.DEFAULT_CAMERA, 479.5, 319.5, 960, 640);
  const expected = room.normalize(
    room.subtract(room.DEFAULT_CAMERA.target, room.cameraPosition(room.DEFAULT_CAMERA)),
  );
  near(room.length(ray.direction), 1);
  assert.ok(room.dot(ray.direction, expected) > 0.999999);

  for (const [x, y] of [
    [0, 0],
    [959, 0],
    [0, 639],
    [959, 639],
  ]) {
    const corner = room.makeCameraRay(room.DEFAULT_CAMERA, x, y, 960, 640);
    near(room.length(corner.direction), 1);
    assert.ok(Object.values(corner.direction).every(Number.isFinite));
  }
});

test("sphere SDF retains negative, zero and positive regions", () => {
  const center = { x: -1, y: -0.18, z: 0.15 };
  assert.ok(room.sdSphere(center, center, 0.82) < 0);
  near(room.sdSphere({ x: -0.18, y: -0.18, z: 0.15 }, center, 0.82), 0);
  assert.ok(room.sdSphere({ x: 1, y: -0.18, z: 0.15 }, center, 0.82) > 0);
});

test("sphere tracing detects a hit and guards an open-room miss", () => {
  const hit = room.marchRay({
    origin: { x: -1, y: -0.18, z: 4 },
    direction: { x: 0, y: 0, z: -1 },
  });
  assert.equal(hit.hit, true);
  assert.equal(hit.materialId, 1);
  assert.ok(hit.steps <= room.DEFAULT_MARCH_SETTINGS.maximumSteps);

  const settings = { maximumSteps: 7, hitEpsilon: 0.0015, maximumDistance: 6 };
  const miss = room.marchRay(
    {
      origin: { x: 0, y: 0, z: 4 },
      direction: { x: 0, y: 0, z: 1 },
    },
    settings,
  );
  assert.equal(miss.hit, false);
  assert.ok(miss.steps <= settings.maximumSteps);
  assert.ok(miss.traveled <= settings.maximumDistance);
});

test("box and torus probes land on their zero surfaces", () => {
  near(
    room.sdBox(
      { x: 1.62, y: -0.32, z: 0.1 },
      { x: 1, y: -0.32, z: 0.1 },
      { x: 0.62, y: 0.68, z: 0.62 },
    ),
    0,
  );
  near(room.sdTorus({ x: 0.99, y: 0.32, z: -1.25 }, { x: 0.05, y: 0.32, z: -1.25 }, 0.72, 0.22), 0);
});

test("scene composition keeps distance and material identity together", () => {
  assert.equal(room.sampleScene({ x: -1, y: -0.18, z: 0.15 }).materialId, 1);
  assert.equal(room.sampleScene({ x: 1, y: -0.32, z: 0.1 }).materialId, 2);
  assert.equal(room.sampleScene({ x: 0.77, y: 0.32, z: -1.25 }).materialId, 3);
  assert.equal(room.sampleScene({ x: 0, y: -1, z: 1 }).materialId, 4);
});

test("primitive switches remove sphere, box and torus independently", () => {
  const emptyScene = {
    includeSphere: false,
    includeBox: false,
    includeTorus: false,
    includeRoom: false,
  };
  assert.equal(room.sampleScene({ x: -1, y: -0.18, z: 0.15 }, emptyScene).materialId, 0);
  assert.equal(
    room.sampleScene({ x: 1, y: -0.32, z: 0.1 }, { ...emptyScene, includeBox: true }).materialId,
    2,
  );
});

test("numerical normal points outward and shadow stays bounded", () => {
  const normal = room.estimateNormal({ x: -0.18, y: -0.18, z: 0.15 });
  near(room.length(normal), 1, 1e-6);
  assert.ok(room.dot(normal, { x: 1, y: 0, z: 0 }) > 0.99);

  const visibility = room.softShadow(
    { x: 0, y: 0, z: 1.5 },
    room.normalize({ x: -0.5, y: 0.8, z: 0.3 }),
    8,
  );
  assert.ok(Number.isFinite(visibility));
  assert.ok(visibility >= 0 && visibility <= 1);
});

test("named validation reports every Project 36 invariant", () => {
  const report = room.validateRayMarchRoom();
  assert.equal(Object.keys(report).length, 8);
  assert.ok(Object.entries(report).every(([, passed]) => passed));
});
