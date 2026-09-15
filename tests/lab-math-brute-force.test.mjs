import assert from "node:assert/strict";
import test from "node:test";
import {
  createParticleQueryWorkspace,
  makeParticleCloud,
  makeParticleProbeQueries,
  particleQueryResultsMatch,
  makeParticleScalingStudy,
  particleInsideCircleWithDistance,
  queryParticlesSquared,
  queryParticlesWithDistance,
  runParticleQueryBatch,
} from "../lib/labs/brute-force-particle-query.ts";

const bounds = { minimum: { x: 0, y: 0 }, maximum: { x: 1, y: 1 } };

test("Particle cloud generation is deterministic and remains inside its bounds", () => {
  const first = makeParticleCloud(1000, bounds, 0xc0ffee);
  const second = makeParticleCloud(1000, bounds, 0xc0ffee);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, makeParticleCloud(1000, bounds, 0xc0ffef));
  assert.equal(first.length, 1000);
  assert.ok(
    first.every(
      (particle) =>
        particle.x >= bounds.minimum.x &&
        particle.x <= bounds.maximum.x &&
        particle.y >= bounds.minimum.y &&
        particle.y <= bounds.maximum.y,
    ),
  );
});

test("Circle query includes its boundary and chooses the nearest stable index", () => {
  const particles = [
    { x: 0.5, y: 0.5 },
    { x: 0.6, y: 0.5 },
    { x: 0.4, y: 0.5 },
    { x: 0.9, y: 0.9 },
  ];
  const query = { center: { x: 0.5, y: 0.5 }, radius: 0.1 };
  assert.equal(particleInsideCircleWithDistance(particles[1], query), true);
  const result = queryParticlesSquared(particles, query, createParticleQueryWorkspace());
  assert.deepEqual(result.hitIndices, [0, 1, 2]);
  assert.equal(result.nearestIndex, 0);
  assert.equal(result.scanned, particles.length);
});

test("Squared-distance query matches the readable sqrt reference", () => {
  const particles = makeParticleCloud(10_000, bounds, 0x12345678);
  const queries = makeParticleProbeQueries(24, bounds, 0.075, 0x87654321);
  const workspace = createParticleQueryWorkspace();
  for (const query of queries) {
    const reference = queryParticlesWithDistance(particles, query);
    const optimized = queryParticlesSquared(particles, query, workspace);
    assert.deepEqual(optimized.hitIndices, reference.hitIndices);
    assert.equal(optimized.nearestIndex, reference.nearestIndex);
    assert.ok(
      Math.abs(optimized.nearestDistanceSquared - reference.nearestDistanceSquared) < 1e-15,
    );
  }
});

test("Result agreement compares the complete hit list instead of hit count alone", () => {
  const first = createParticleQueryWorkspace();
  first.nearestIndex = 2;
  first.hitIndices.push(1, 2, 4);
  const second = createParticleQueryWorkspace();
  second.nearestIndex = 2;
  second.hitIndices.push(1, 3, 4);
  assert.equal(particleQueryResultsMatch(first, second), false);
  second.hitIndices[1] = 2;
  assert.equal(particleQueryResultsMatch(first, second), true);
});

test("Reusable workspace keeps its hit array while every radius still scans all particles", () => {
  const particles = makeParticleCloud(5000, bounds, 0xabcdef01);
  const workspace = createParticleQueryWorkspace();
  const hitArray = workspace.hitIndices;
  const small = queryParticlesSquared(
    particles,
    { center: { x: 0.5, y: 0.5 }, radius: 0.01 },
    workspace,
  );
  const smallHitCount = small.hitIndices.length;
  const large = queryParticlesSquared(
    particles,
    { center: { x: 0.5, y: 0.5 }, radius: 0.35 },
    workspace,
  );
  assert.equal(large.hitIndices, hitArray);
  assert.ok(large.hitIndices.length > smallHitCount);
  assert.equal(large.scanned, 5000);
});

test("Batch checksum is deterministic and scaling work grows exactly with particle count", () => {
  const particles = makeParticleCloud(100_000, bounds, 0x31415926);
  const queries = makeParticleProbeQueries(8, bounds, 0.05, 0x27182818);
  const first = runParticleQueryBatch(particles, queries, 2, createParticleQueryWorkspace());
  const second = runParticleQueryBatch(particles, queries, 2, createParticleQueryWorkspace());
  assert.deepEqual(first, second);
  assert.equal(first.queryCount, 16);
  assert.equal(first.totalScanned, 100_000 * 16);

  const rows = makeParticleScalingStudy(particles, queries, [1000, 10_000, 100_000], 1);
  assert.deepEqual(
    rows.map((row) => row.totalScanned),
    [1000 * 8, 10_000 * 8, 100_000 * 8],
  );
});
