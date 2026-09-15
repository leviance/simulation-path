import assert from "node:assert/strict";
import test from "node:test";
import {
  allFiniteBodies,
  barnesHutAcceleration,
  buildMassOctree,
  directAcceleration,
  inspectMassOctree,
  makeGalaxyBodies,
  measureThetaAccuracy,
  softenedAcceleration,
  stepBodiesSymplecticEuler,
  systemDiagnostics,
} from "../lib/labs/barnes-hut-nbody.ts";

const gravitationalConstant = 0.001;
const softening = 0.02;

function magnitude(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

test("galaxy generation is deterministic and starts with balanced momentum", () => {
  const first = makeGalaxyBodies(256, 0x31c0ffee);
  const second = makeGalaxyBodies(256, 0x31c0ffee);
  assert.deepEqual(first, second);
  assert.equal(first.length, 256);
  assert.equal(first[0].mass, 120);
  const diagnostics = systemDiagnostics(first, gravitationalConstant, softening);
  assert.ok(magnitude(diagnostics.momentum) < 1e-10);
});

test("softened gravity stays finite at zero distance and follows source mass", () => {
  const position = { x: 1, y: 2, z: 3 };
  assert.deepEqual(softenedAcceleration(position, position, 4, 1, 0.1), { x: 0, y: 0, z: 0 });
  const light = softenedAcceleration(position, { x: 2, y: 2, z: 3 }, 2, 1, 0.1);
  const heavy = softenedAcceleration(position, { x: 2, y: 2, z: 3 }, 6, 1, 0.1);
  assert.ok(Number.isFinite(heavy.x));
  assert.ok(Math.abs(heavy.x / light.x - 3) < 1e-12);
});

test("mass Octree stores every body once and aggregates mass and center of mass", () => {
  const bodies = makeGalaxyBodies(512, 0x31c0ffee);
  const tree = buildMassOctree(bodies);
  const report = inspectMassOctree(tree, bodies);
  assert.ok(Object.values(report).every(Boolean));
  const expectedMass = bodies.reduce((sum, body) => sum + body.mass, 0);
  assert.ok(Math.abs(tree.nodes[0].totalMass - expectedMass) < 1e-9);
  assert.ok(tree.nodes.length > 1);
  assert.equal(tree.leafCount + tree.internalNodeCount, tree.nodes.length);
});

test("a one-body tree never applies self force", () => {
  const bodies = makeGalaxyBodies(1, 0x31c0ffee);
  const tree = buildMassOctree(bodies);
  const exact = directAcceleration(bodies, 0, gravitationalConstant, softening);
  const approximate = barnesHutAcceleration(tree, bodies, 0, 1.2, gravitationalConstant, softening);
  assert.equal(magnitude(exact.acceleration), 0);
  assert.equal(magnitude(approximate.acceleration), 0);
  assert.equal(approximate.approximatedNodes, 0);
  assert.equal(approximate.exactInteractions, 0);
});

test("a near-zero opening angle agrees with direct N-body acceleration", () => {
  const bodies = makeGalaxyBodies(192, 0x31c0ffee);
  const tree = buildMassOctree(bodies);
  for (const targetIndex of [0, 1, 17, 63, 127, 191]) {
    const exact = directAcceleration(bodies, targetIndex, gravitationalConstant, softening);
    const approximate = barnesHutAcceleration(
      tree,
      bodies,
      targetIndex,
      1e-9,
      gravitationalConstant,
      softening,
    );
    const difference = magnitude({
      x: exact.acceleration.x - approximate.acceleration.x,
      y: exact.acceleration.y - approximate.acceleration.y,
      z: exact.acceleration.z - approximate.acceleration.z,
    });
    assert.ok(difference < 1e-10);
  }
});

test("theta sweep exposes the accuracy versus work trade-off", () => {
  const bodies = makeGalaxyBodies(384, 0x31c0ffee);
  const rows = measureThetaAccuracy(
    bodies,
    [0.25, 0.5, 0.8, 1.1],
    24,
    gravitationalConstant,
    softening,
  );
  assert.equal(rows.length, 4);
  assert.ok(rows[0].meanRelativeError <= rows[3].meanRelativeError + 1e-12);
  assert.ok(rows[0].exactInteractions >= rows[3].exactInteractions);
  assert.ok(rows[3].approximatedNodes > 0);
  assert.ok(rows[1].meanRelativeError < 0.08);
});

test("fixed symplectic steps remain finite and keep center-of-mass drift small", () => {
  let bodies = makeGalaxyBodies(128, 0x31c0ffee);
  const initial = systemDiagnostics(bodies, gravitationalConstant, softening);
  for (let step = 0; step < 120; step += 1) {
    bodies = stepBodiesSymplecticEuler(
      bodies,
      1 / 240,
      0.5,
      gravitationalConstant,
      softening,
      true,
    );
  }
  const final = systemDiagnostics(bodies, gravitationalConstant, softening);
  assert.ok(allFiniteBodies(bodies));
  assert.ok(
    Math.hypot(
      final.centerOfMass.x - initial.centerOfMass.x,
      final.centerOfMass.y - initial.centerOfMass.y,
      final.centerOfMass.z - initial.centerOfMass.z,
    ) < 0.002,
  );
});
