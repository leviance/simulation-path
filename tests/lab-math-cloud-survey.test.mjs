import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { readCsv, writeCsv } from "../lib/labs/cloud-survey/csv.ts";
import { makeRoom } from "../lib/labs/cloud-survey/data.ts";
import { region, contains, dot, sub } from "../lib/labs/cloud-survey/geometry.ts";
import { CloudOctree, brute, sameIndices } from "../lib/labs/cloud-survey/octree.ts";
import {
  camera,
  cameraBasis,
  switchCameraMode,
  cameraFrustum,
} from "../lib/labs/cloud-survey/camera.ts";
import {
  createCloudScene,
  refreshCloud,
  statistics,
  exportCloud,
} from "../lib/labs/cloud-survey/scene.ts";
import { CloudRaster, renderCloud } from "../lib/labs/cloud-survey/render.ts";
import {
  startJob,
  tickJob,
  topologyErrors,
  validationRegions,
} from "../lib/labs/cloud-survey/jobs.ts";

const ids = (points, result) => result.indices.map((i) => points[i].id).sort((a, b) => a - b);
// Independent test predicate: component distances, not production accepts/mayOverlap.
const oracle = (points, r) =>
  points
    .filter(({ position: p }) => {
      const dx = Math.abs(p.x - r.center.x),
        dy = Math.abs(p.y - r.center.y),
        dz = Math.abs(p.z - r.center.z);
      const hit =
        r.shape === "sphere"
          ? Math.hypot(dx, dy, dz) <= r.radius
          : dx <= r.half.x && dy <= r.half.y && dz <= r.half.z;
      return hit && p.y >= r.minimumHeight && p.y <= r.maximumHeight;
    })
    .map((p) => p.id)
    .sort((a, b) => a - b);

test("Survey CSV preserves stable IDs, rejects malformed input and round trips independently supplied fixture", async () => {
  const text = await readFile(
    new URL("../examples/project-30-point-cloud-octree/assets/room-fixture.csv", import.meta.url),
    "utf8",
  );
  const points = readCsv(text);
  assert.equal(points.length, 14);
  assert.equal(points[0].id, 41);
  assert.deepEqual(readCsv(writeCsv(points)), points);
  for (const row of [
    "1,0,0",
    "1,0,0,0,0",
    "-1,0,0,0",
    "4294967296,0,0,0",
    "1,nan,0,0",
    "1,Infinity,0,0",
    "1,10001,0,0",
    "1,1x,0,0",
    "1,0,0,0\n1,1,1,1",
    "1".repeat(513),
  ])
    assert.throws(() => readCsv("id,x,y,z\n" + row + "\n"));
  assert.throws(() => readCsv("x,y,z\n1,2,3\n"));
  assert.deepEqual(readCsv("id,x,y,z\n"), []);
});

test("Survey 100k room has known surfaces, seed reproducibility and full-volume comparison preset", () => {
  const points = makeRoom();
  assert.equal(points.length, 100000);
  assert.equal(points.filter((p) => p.position.y === 0).length, 20000);
  assert.equal(new Set(points.map((p) => p.id)).size, 100000);
  assert.deepEqual(makeRoom(100, 30), points.slice(0, 100));
  const tree = new CloudOctree(points);
  assert.equal(topologyErrors(tree), 0);
  assert.ok(points.every((p) => contains(tree.nodes[0].bounds, p.position)));
  const uniform = new CloudOctree(makeRoom(100000, 30, true));
  assert.equal(uniform.points.length, 100000);
  assert.equal(topologyErrors(uniform), 0);
  assert.throws(() => makeRoom(200001));
});

test("Survey box/sphere/filter match independent IDs at split, duplicate positions, boundaries and empty queries", () => {
  const points = [
    { id: 40, position: { x: -1, y: 0, z: 0 } },
    { id: 8, position: { x: 1, y: 0, z: 0 } },
    { id: 91, position: { x: 0, y: 1, z: 0 } },
    { id: 92, position: { x: 0, y: 0, z: 1 } },
    { id: 1001, position: { x: 0, y: 0, z: 0 } },
    { id: 7, position: { x: 0, y: 0, z: 0 } },
    { id: 99, position: { x: 2, y: 2, z: 2 } },
  ];
  const tree = new CloudOctree(points, 4);
  assert.ok(tree.nodes.length > 1);
  assert.equal(topologyErrors(tree), 0);
  for (const r of validationRegions(tree))
    assert.deepEqual(ids(points, tree.query(r)), oracle(points, r));
  const r = { ...region(), shape: "sphere", center: { x: 0, y: 0, z: 0 }, radius: 1 };
  assert.deepEqual(ids(points, tree.query(r)), [7, 8, 40, 91, 92, 1001]);
  r.minimumHeight = 0;
  r.maximumHeight = 0;
  assert.deepEqual(ids(points, tree.query(r)), [7, 8, 40, 92, 1001]);
  const summary = statistics(points, tree.query(r).indices);
  assert.equal(summary.count, 5);
  assert.deepEqual(summary.centroid, { x: 0, y: 0, z: 0.2 });
  assert.deepEqual(statistics(points, []), { count: 0, bounds: null, centroid: null });
});

test("Survey frustum has independent near/far and side-plane boundary expectations", () => {
  const c = {
    ...camera(),
    freeFly: true,
    eye: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    nearPlane: 1,
    farPlane: 10,
    fov: Math.PI / 2,
  };
  const positions = [
    [0, 0, -1],
    [-1, 0, -1],
    [1, 0, -1],
    [0, 1, -1],
    [0, -1, -1],
    [0, 0, -10],
    [0, 0, -0.999],
    [1.001, 0, -1],
    [0, 0, -10.001],
    [0, 0, 1],
  ];
  const points = positions.map(([x, y, z], id) => ({ id, position: { x, y, z } })),
    tree = new CloudOctree(points, 4);
  assert.deepEqual(ids(points, tree.query(cameraFrustum(c, 1))), [0, 1, 2, 3, 4, 5]);
  const before = cameraBasis(c);
  switchCameraMode(c);
  const delta = sub(before.eye, cameraBasis(c).eye);
  assert.ok(dot(delta, delta) < 1e-20);
  const large = createCloudScene(11, 0, false, "id,x,y,z\n1,-10000,0,-10000\n2,10000,0,10000\n");
  assert.equal(
    large.visible.indices.length,
    2,
    "reset camera scales far plane to the opened dataset",
  );
});

test("Survey actual CPU raster matches with culling on/off at 100k and odd DPR resolutions", () => {
  const scene = createCloudScene();
  scene.width = 531;
  scene.height = 317;
  scene.selectionEnabled = true;
  const indexed = new CloudRaster(663, 396),
    reference = new CloudRaster(663, 396);
  for (let pose = 0; pose < 3; pose++) {
    if (pose === 1) {
      scene.camera.freeFly = true;
      scene.camera.eye = { x: 0, y: 3, z: 0 };
    }
    if (pose === 2) {
      scene.camera.yaw += 1.1;
      scene.camera.pitch = -0.3;
    }
    scene.culling = true;
    refreshCloud(scene);
    const result = scene.visible;
    renderCloud(scene, indexed);
    assert.equal(scene.drawn, result.indices.length);
    scene.culling = false;
    refreshCloud(scene);
    renderCloud(scene, reference);
    assert.ok(sameIndices(result, scene.visible));
    assert.deepEqual(indexed.pixels, reference.pixels);
  }
  assert.throws(() => new CloudRaster(2000, 2000));
});

test("Survey full 100k workflow filters floor, computes statistics, exports and reads the same coordinates", () => {
  const scene = createCloudScene();
  const oldCamera = structuredClone(scene.camera);
  scene.selectionEnabled = true;
  scene.region = {
    ...region(),
    center: { x: 0, y: 0, z: 0 },
    half: { x: 12, y: 0.1, z: 9 },
    minimumHeight: 0,
    maximumHeight: 0,
  };
  refreshCloud(scene);
  assert.equal(scene.summary.count, 20000);
  assert.deepEqual(scene.camera, oldCamera);
  assert.deepEqual(ids(scene.points, scene.selected), oracle(scene.points, scene.region));
  const result = exportCloud(scene);
  assert.equal(result.count, 20000);
  assert.ok(result.matches);
  assert.deepEqual(
    readCsv(result.csv).map((p) => p.id),
    ids(scene.points, scene.selected),
  );
});

test("Survey jobs are finite, pausable, reject stale dataset and detect corrupted topology", () => {
  const scene = createCloudScene(),
    job = startJob(scene);
  job.paused = true;
  tickJob(job, scene);
  assert.equal(job.queryIndex, 0);
  job.paused = false;
  for (let ticks = 0; job.active && ticks < 10000; ticks++) tickJob(job, scene);
  assert.equal(job.active, false);
  assert.equal(job.errors, 0);
  const timing = startJob(scene, true);
  for (let ticks = 0; timing.active && ticks < 10000; ticks++) tickJob(timing, scene);
  assert.equal(timing.active, false);
  const sums = [...timing.report.matchAll(/checksum (\d+)/g)].map((m) => m[1]);
  assert.equal(sums.length, 2);
  assert.equal(sums[0], sums[1]);
  const stale = startJob(scene);
  scene.tree = new CloudOctree(makeRoom(10));
  tickJob(stale, scene);
  assert.equal(stale.active, false);
  assert.match(stale.report, /Dataset đã đổi/);
  scene.tree.nodes[0].children = [0, 0, 0, 0, 0, 0, 0, 0];
  assert.ok(topologyErrors(scene.tree) > 0);
  assert.equal(startJob(scene).active, false);
  assert.equal(startJob(scene, true).active, false);
  assert.ok(brute([], region()).indices.length === 0);
});

test("Survey checksums remain exact beyond Number safe integers with valid uint32 IDs", () => {
  const points = makeRoom(30000).map((point) => ({ ...point, id: 0xffffffff - point.id }));
  const scene = createCloudScene(11, 0, false, writeCsv(points));
  const job = startJob(scene, true);
  const root = scene.tree.nodes[0].bounds;
  const whole = {
    ...region(),
    center: {
      x: (root.minimum.x + root.maximum.x) / 2,
      y: (root.minimum.y + root.maximum.y) / 2,
      z: (root.minimum.z + root.maximum.z) / 2,
    },
    half: {
      x: (root.maximum.x - root.minimum.x) / 2,
      y: (root.maximum.y - root.minimum.y) / 2,
      z: (root.maximum.z - root.minimum.z) / 2,
    },
  };
  job.regions = Array.from({ length: 16 }, () => whole);
  for (let ticks = 0; job.active && ticks < 10000; ticks++) tickJob(job, scene);
  const expected =
    points.reduce((sum, point) => sum + BigInt(point.id) + BigInt(1), BigInt(0)) * BigInt(16 * 7);
  assert.ok(expected > BigInt(Number.MAX_SAFE_INTEGER));
  const sums = [...job.report.matchAll(/checksum (\d+)/g)].map((match) => match[1]);
  assert.deepEqual(sums, [String(expected), String(expected)]);
});
