import assert from "node:assert/strict";
import "./galaxy-render.test.mjs";
import test from "node:test";
import {
  createGalaxy,
  beginPhysics,
  tickPhysics,
  cancelPhysics,
  selectedForce,
  validateGalaxy,
  gravity,
} from "../lib/labs/galaxy/scene.ts";
import { startGalaxyJob, tickGalaxyJob, timestepRow } from "../lib/labs/galaxy/jobs.ts";
import {
  buildMassOctree,
  directAcceleration,
  barnesHutAcceleration,
  systemDiagnostics,
  inspectMassOctree,
  makeGalaxyBodies,
} from "../lib/labs/barnes-hut-nbody.ts";
import { projectGalaxy } from "../components/labs/galaxy-view.ts";

test("P31 perspective uses aspect exactly once and keeps camera separate from body state", () => {
  const camera = { yaw: 0, pitch: 0, distance: 2, x: 0, y: 0 },
    point = { x: 1, y: 0, z: 0 };
  const first = projectGalaxy(point, camera, 400, 400),
    wide = projectGalaxy(point, camera, 800, 400);
  const expected = 200 / Math.tan(Math.PI / 6) / 2;
  assert.ok(Math.abs(first.x - 200 - expected) < 1e-10);
  assert.ok(Math.abs(wide.x - 400 - expected) < 1e-10);
  assert.equal(first.y, 188);
  assert.deepEqual(point, { x: 1, y: 0, z: 0 });
});

test("P31 independent two/three-body gravity fixtures, weighted aggregates and degenerate tree", () => {
  const scene = createGalaxy(10, 4),
    three = directAcceleration(scene.bodies, 2, 1, 0.1);
  assert.ok(Math.abs(three.acceleration.x) < 1e-12);
  assert.ok(Math.abs(three.acceleration.y + 2 / 2.01 ** 1.5) < 1e-12);
  const pair = [
    { position: { x: -1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 2 },
    { position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 3 },
  ];
  assert.ok(Math.abs(directAcceleration(pair, 0, 1, 0.1).acceleration.x - 6 / 4.01 ** 1.5) < 1e-12);
  const tree = buildMassOctree(pair);
  assert.equal(tree.nodes[0].totalMass, 5);
  assert.ok(Math.abs(tree.nodes[0].centerOfMass.x - 0.2) < 1e-12);
  const same = Array.from({ length: 256 }, () => ({
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    mass: 1,
  }));
  const bounded = buildMassOctree(same);
  assert.ok(bounded.maximumObservedDepth <= 16);
  assert.deepEqual(barnesHutAcceleration(bounded, same, 17, 1.2, 1, 0.1).acceleration, {
    x: 0,
    y: 0,
    z: 0,
  });
  bounded.nodes.at(-1).totalMass += 1;
  assert.equal(inspectMassOctree(bounded, same).aggregateMassValid, false);
  const corrupt = buildMassOctree(pair);
  corrupt.nodes[0].children[0] = 0;
  assert.equal(inspectMassOctree(corrupt, pair).childIndicesValid, false);
  assert.throws(() => makeGalaxyBodies(1000000, 31), /budget/);
});

test("P31 updates every one of 4096 bodies atomically, bounds trails, and can cancel partial physics", () => {
  const scene = createGalaxy(),
    before = structuredClone(scene.bodies);
  assert.equal(before.length, 4096);
  assert.ok(Object.values(validateGalaxy(scene)).every(Boolean));
  let clock = 0;
  beginPhysics(scene, 0);
  tickPhysics(scene, () => (clock += 0.2), 1);
  assert.ok(scene.physics.target > 0 && scene.physics.target < 4096);
  assert.deepEqual(scene.bodies, before);
  assert.equal(scene.steps, 0);
  cancelPhysics(scene);
  assert.deepEqual(scene.bodies, before);
  assert.equal(scene.physics, null);
  beginPhysics(scene, clock);
  let ticks = 0;
  while (!tickPhysics(scene, () => (clock += 0.001), 20)) {
    assert.ok(++ticks < 5000);
  }
  assert.equal(scene.steps, 1);
  assert.equal(scene.time, scene.dt);
  assert.equal(scene.trails.length, 1);
  assert.equal(scene.trails[0].length, 24);
  for (let i = 0; i < 4096; i++) assert.notDeepEqual(scene.bodies[i].position, before[i].position);
  const force = selectedForce(scene);
  for (const index of force.trace.accepted) {
    const node = scene.tree.nodes[index],
      p = scene.bodies[scene.selected].position;
    assert.ok(
      !(
        p.x >= node.bounds.minimum.x &&
        p.x <= node.bounds.maximum.x &&
        p.y >= node.bounds.minimum.y &&
        p.y <= node.bounds.maximum.y &&
        p.z >= node.bounds.minimum.z &&
        p.z <= node.bounds.maximum.z
      ),
    );
  }
});

test("P31 force sweep and full energy keep one 4096-body snapshot with independent RMS/energy checks", () => {
  const scene = createGalaxy(),
    original = structuredClone(scene.bodies),
    sweep = startGalaxyJob(scene, "sweep", 0);
  let now = 0,
    ticks = 0;
  sweep.paused = true;
  tickGalaxyJob(sweep, scene.revision, () => (now += 0.01));
  assert.equal(sweep.target, 0);
  sweep.paused = false;
  while (sweep.active) {
    tickGalaxyJob(sweep, scene.revision, () => (now += 0.01));
    assert.ok(++ticks < 10000);
  }
  assert.equal(sweep.sweeps.length, 4);
  assert.deepEqual(scene.bodies, original);
  for (const row of sweep.sweeps) {
    let errors = 0,
      reference = 0;
    for (const id of sweep.targets) {
      const d = directAcceleration(original, id, gravity, scene.epsilon).acceleration,
        a = barnesHutAcceleration(
          scene.tree,
          original,
          id,
          row.theta,
          gravity,
          scene.epsilon,
        ).acceleration;
      errors += (d.x - a.x) ** 2 + (d.y - a.y) ** 2 + (d.z - a.z) ** 2;
      reference += d.x * d.x + d.y * d.y + d.z * d.z;
    }
    assert.ok(Math.abs(row.absolute - Math.sqrt(errors / sweep.targets.length)) < 1e-12);
    assert.ok(
      Math.abs(
        row.normalized - Math.sqrt(errors / Math.max(reference, sweep.targets.length * 1e-24)),
      ) < 1e-12,
    );
  }
  const energy = startGalaxyJob(scene, "energy", now);
  ticks = 0;
  while (energy.active) {
    tickGalaxyJob(energy, scene.revision, () => (now += 0.01));
    assert.ok(++ticks < 10000);
  }
  const expected = systemDiagnostics(original, gravity, scene.epsilon);
  assert.equal(energy.energy.count, 4096);
  assert.ok(Math.abs(energy.energy.energy - expected.totalEnergy) < 1e-10);
  assert.deepEqual(energy.energy.momentum, expected.momentum);
  const stale = startGalaxyJob(scene, "sweep", now);
  tickGalaxyJob(stale, scene.revision + 1, () => now);
  assert.equal(stale.active, false);
  assert.match(stale.notice, /snapshot/);
  const timed = startGalaxyJob(scene, "energy", 0);
  tickGalaxyJob(timed, scene.revision, () => 40000);
  assert.equal(timed.active, false);
  assert.match(timed.notice, /30 giây/);
});

test("P31 dt study uses an independent softened circular orbit and runtime uses equal full-pass work", () => {
  const rows = [60, 120, 240].map(timestepRow);
  assert.ok(rows[2].error < rows[1].error && rows[1].error < rows[0].error);
  const scene = createGalaxy(10, 2),
    job = startGalaxyJob(scene, "runtime", 0);
  let now = 0,
    ticks = 0;
  while (job.active) {
    tickGalaxyJob(job, scene.revision, () => (now += 0.0001), 20);
    assert.ok(++ticks < 100000);
  }
  assert.equal(job.runtime.length, 3);
  for (const row of job.runtime) {
    assert.equal(row.directWork, row.count * (row.count - 1));
    assert.ok(row.treeWork < row.directWork);
    for (const value of [row.direct, row.tree, row.build, row.checksum])
      assert.ok(Number.isFinite(value));
  }
});
