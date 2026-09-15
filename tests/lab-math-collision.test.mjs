import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCollisionPairImpulse,
  collisionAdd,
  collisionLength,
  collisionLengthSquared,
  correctCollisionPenetration,
  findCollisionCircleContact,
  makeCollisionLattice,
  measureCollisionWorld,
  planCollisionFixedSteps,
  resolveCollisionWall,
  stepCollisionTank,
} from "../lib/labs/collision-tank.ts";

const bounds = { minimumX: 0, minimumY: 0, maximumX: 16, maximumY: 10 };

test("Collision scene is deterministic, finite and starts without overlap", () => {
  const first = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  const second = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  assert.equal(first.length, 144);
  assert.deepEqual(first, second);
  const metrics = measureCollisionWorld(first);
  assert.equal(metrics.finite, true);
  assert.equal(metrics.overlapCount, 0);
  for (const ball of first) {
    assert.ok(ball.position.x - ball.radius >= bounds.minimumX);
    assert.ok(ball.position.x + ball.radius <= bounds.maximumX);
    assert.ok(ball.position.y - ball.radius >= bounds.minimumY);
    assert.ok(ball.position.y + ball.radius <= bounds.maximumY);
  }
});

test("Collision wall, contact, impulse and correction mirror the C++ formulas", () => {
  const wallBall = {
    position: { x: -0.1, y: 9.9 },
    velocity: { x: -3, y: 2 },
    radius: 0.25,
    inverseMass: 1,
    color: "white",
  };
  const wall = resolveCollisionWall(wallBall, bounds, 0.5);
  assert.equal(wall.hitCount, 2);
  assert.deepEqual(wallBall.position, { x: 0.25, y: 9.75 });
  assert.deepEqual(wallBall.velocity, { x: 1.5, y: -1 });

  const first = {
    position: { x: 2, y: 3 },
    velocity: { x: 1, y: 0 },
    radius: 0.5,
    inverseMass: 1,
    color: "red",
  };
  const second = {
    position: { x: 2.8, y: 3 },
    velocity: { x: -1, y: 0 },
    radius: 0.5,
    inverseMass: 1,
    color: "blue",
  };
  const contact = findCollisionCircleContact(first, second);
  assert.equal(contact.colliding, true);
  assert.ok(Math.abs(contact.normal.x - 1) < 1e-12);
  assert.ok(Math.abs(contact.penetration - 0.2) < 1e-12);
  const momentumBefore = collisionAdd(first.velocity, second.velocity);
  const energyBefore =
    0.5 * collisionLengthSquared(first.velocity) + 0.5 * collisionLengthSquared(second.velocity);
  assert.ok(Math.abs(applyCollisionPairImpulse(first, second, contact, 1) - 2) < 1e-12);
  assert.deepEqual(first.velocity, { x: -1, y: 0 });
  assert.deepEqual(second.velocity, { x: 1, y: 0 });
  assert.deepEqual(collisionAdd(first.velocity, second.velocity), momentumBefore);
  const energyAfter =
    0.5 * collisionLengthSquared(first.velocity) + 0.5 * collisionLengthSquared(second.velocity);
  assert.ok(Math.abs(energyAfter - energyBefore) < 1e-12);
  assert.equal(applyCollisionPairImpulse(first, second, contact, 1), 0);

  const velocityBeforeCorrection = { ...first.velocity };
  assert.ok(correctCollisionPenetration(first, second, contact, 1, 0) > 0);
  assert.deepEqual(first.velocity, velocityBeforeCorrection);
  const after = findCollisionCircleContact(first, second);
  assert.ok(!after.colliding || after.penetration < 1e-12);
  const coincident = findCollisionCircleContact(first, {
    ...second,
    position: { ...first.position },
  });
  assert.equal(coincident.colliding, true);
  assert.ok(Math.abs(collisionLength(coincident.normal) - 1) < 1e-12);
});

test("Collision fixed steps and brute-force pair count stay explicit", () => {
  const countSteps = (frames) => {
    let remainder = 0;
    let steps = 0;
    for (const frame of frames) {
      const plan = planCollisionFixedSteps(remainder, frame, 1 / 60, 16, 0.25);
      remainder = plan.remainder;
      steps += plan.steps;
    }
    return steps;
  };
  assert.equal(countSteps(Array(120).fill(1 / 120)), 60);
  assert.equal(countSteps(Array(30).fill(1 / 30)), 60);

  const four = makeCollisionLattice(
    2,
    2,
    { minimumX: 0, minimumY: 0, maximumX: 4, maximumY: 4 },
    0.25,
    0,
    7,
  );
  const result = stepCollisionTank(
    four,
    { minimumX: 0, minimumY: 0, maximumX: 4, maximumY: 4 },
    {
      deltaSeconds: 1 / 120,
      restitution: 1,
      solverIterations: 3,
      correctionPercent: 0.8,
      penetrationSlop: 0.001,
    },
  );
  assert.equal(result.stats.pairChecks, 18);

  let stress = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  for (let step = 0; step < 30; step += 1) {
    const next = stepCollisionTank(stress, bounds, {
      deltaSeconds: 1 / 120,
      restitution: 1,
      solverIterations: 3,
      correctionPercent: 0.8,
      penetrationSlop: 0.001,
    });
    assert.equal(next.stats.pairChecks, (3 * 144 * 143) / 2);
    stress = next.balls;
  }
  assert.equal(measureCollisionWorld(stress).finite, true);
});
