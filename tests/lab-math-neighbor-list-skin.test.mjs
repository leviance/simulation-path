import assert from "node:assert/strict";
import test from "node:test";
import * as lab from "../lib/labs/neighbor-list-skin.ts";
import { verletStep } from "../lib/labs/periodic-molecular-box.ts";

function move(system, index, delta) {
  const p = system.particles[index];
  p.position = lab.wrapPosition(lab.add(p.position, delta), system.box);
  p.unwrapped = lab.add(p.unwrapped, delta);
}
function compareBuilders(system, skin) {
  const naive = lab.emptyList();
  const grid = lab.emptyList();
  assert.ok(lab.rebuildNaive(system, skin, 0, naive));
  assert.ok(lab.rebuildGrid(system, skin, 0, grid));
  assert.deepEqual(grid.pairs, naive.pairs);
  assert.equal(new Set(grid.pairs.map((p) => `${p.i}:${p.j}`)).size, grid.pairs.length);
  return grid;
}
test("P44: candidate pairs in the skin do not exert force", () => {
  const system = lab.makeApproach();
  move(system, 0, { x: 0.4, y: 0 });
  const list = compareBuilders(system, 0.4);
  assert.deepEqual(list.pairs, [{ i: 0, j: 1 }]);
  const result = lab.evaluateListed(system, list);
  assert.equal(result.activePairs, 0);
  assert.equal(result.potential, 0);
  assert.ok(lab.auditForces(system, list).passed);
});
test("P44: grid equals naive for two-cell axes, rectangular boxes and seams", () => {
  for (const box of [
    { width: 6, height: 6 },
    { width: 6, height: 10 },
    { width: 12, height: 8 },
  ]) {
    const system = lab.makeGas(36, 44);
    system.box = box;
    // Deterministic non-lattice cloud exercises both wrapped and diagonal bins.
    for (let i = 0; i < system.particles.length; i += 1) {
      system.particles[i].position = {
        x: ((i * 0.61803398875) % 1) * box.width,
        y: ((i * 0.41421356237 + 0.13) % 1) * box.height,
      };
      system.particles[i].unwrapped = { ...system.particles[i].position };
    }
    compareBuilders(system, 0.4);
  }
  const pair = lab.makeApproach();
  pair.particles[0].position = { x: 0.2, y: 0.2 };
  pair.particles[1].position = { x: 11.3, y: 11.3 };
  for (const p of pair.particles) p.unwrapped = { ...p.position };
  assert.equal(compareBuilders(pair, 0.4).pairs.length, 1);
});
test("P44: exact half-skin and multi-wrap displacement rebuild", () => {
  const system = lab.makeApproach();
  const list = lab.emptyList();
  assert.ok(lab.ensureList(system, 0.5, 0, list));
  move(system, 0, { x: 0.125, y: 0 });
  assert.equal(lab.needsRebuild(system, 0.5, 0, list), false);
  move(system, 0, { x: 0.125, y: 0 });
  assert.equal(lab.needsRebuild(system, 0.5, 0, list), true);
  assert.ok(lab.ensureList(system, 0.5, 0, list));
  assert.equal(list.rebuilds, 2);
  move(system, 0, { x: -24, y: 0 });
  assert.ok(lab.needsRebuild(system, 0.5, 0, list));
  assert.equal(lab.maximumDisplacement(system, list), 24);
});
test("P44: count, box, cutoff, skin and generation invalidate cache", () => {
  for (const mutate of [
    (s) => {
      s.box.width += 1;
    },
    (s) => {
      s.parameters.cutoff = 2.4;
    },
    (s) => {
      s.particles.pop();
    },
  ]) {
    const system = lab.makeGas(4, 44);
    const list = lab.emptyList();
    lab.ensureList(system, 0.4, 0, list);
    mutate(system);
    assert.ok(lab.needsRebuild(system, 0.4, 0, list));
  }
  const system = lab.makeGas(4, 44);
  const list = lab.emptyList();
  lab.ensureList(system, 0.4, 0, list);
  assert.ok(lab.needsRebuild(system, 0.8, 0, list));
  assert.ok(lab.needsRebuild(system, 0.4, 1, list));
  for (const skin of [0, -1, NaN, Infinity, 4])
    assert.equal(lab.ensureList(system, skin, 0, list), false);
  system.particles[0].mass = 0;
  assert.equal(lab.ensureList(system, 0.4, 0, list), false);
});
test("P44: stale lists miss a force even when the numeric result is finite", () => {
  const system = lab.makeApproach();
  const list = lab.emptyList();
  lab.ensureList(system, 0.4, 0, list);
  move(system, 0, { x: 0.8, y: 0 });
  assert.ok(lab.evaluateListed(system, list).valid);
  const audit = lab.auditForces(system, list);
  assert.equal(audit.missingPairs, 1);
  assert.equal(audit.passed, false);
  assert.ok(audit.forceError > 0);
  assert.ok(lab.ensureList(system, 0.4, 0, list));
  assert.ok(lab.auditForces(system, list).passed);
});
test("P44: drift triggers refresh before the second force", () => {
  const system = lab.makeApproach();
  system.particles[0].velocity.x = 400;
  const reference = structuredClone(system);
  const list = lab.emptyList();
  lab.ensureList(system, 0.4, 0, list);
  assert.ok(lab.cachedVerletStep(system, list, 0.4, 0, 0.002));
  assert.ok(verletStep(reference, 0.002));
  assert.equal(list.rebuilds, 2);
  assert.deepEqual(system, reference);
  assert.ok(lab.auditForces(system, list).passed);
});
test("P44: failed drift rolls back model and list together", () => {
  const system = lab.makeApproach();
  system.particles[0].velocity.x = 1600;
  const list = lab.emptyList();
  lab.ensureList(system, 0.4, 0, list);
  const saved = structuredClone({ system, list });
  assert.equal(lab.cachedVerletStep(system, list, 0.4, 0, 0.002), false);
  assert.deepEqual({ system, list }, saved);
  list.pairs = [{ i: 1, j: 0 }];
  assert.equal(lab.evaluateListed(system, list).valid, false);
});
test("P44: standard trajectory agrees with all-pairs and conserved quantities", () => {
  assert.ok(lab.validateNeighborList());
});
test("P44: work experiment is deterministic, bounded and counts both costs", () => {
  const report = lab.measureWork(64, 0.4);
  assert.ok(report.passed);
  assert.deepEqual(report, lab.measureWork(64, 0.4));
  assert.equal(report.allPairsChecks, 200 * 64 * 63);
  assert.ok(report.buildChecks > 0 && report.forceChecks > 0);
  assert.ok(report.buildChecks + report.forceChecks < report.allPairsChecks);
  for (const [count, steps] of [
    [1000, 200],
    [64, 10000],
    [0, 1],
    [4.5, 1],
  ])
    assert.equal(lab.measureWork(count, 0.4, steps).passed, false);
});
