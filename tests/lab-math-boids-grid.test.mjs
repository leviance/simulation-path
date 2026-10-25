import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultBoidsParams as defaults,
  makeFlock,
  findNeighbors,
  computeSteering,
  integrateBoid,
  fixedBoidsDt,
} from "../lib/labs/boids.ts";
import {
  axisCells,
  buildBoidsGrid,
  gridAddress,
  gridGeometry,
  queryBoidsGrid,
} from "../lib/labs/boids-grid.ts";
import {
  makeLargeFlock,
  createGridStep,
  advanceGridStep,
  cancelGridStep,
  completedGridStep,
} from "../lib/labs/boids-grid-step.ts";

const boid = (id, x, y) => ({ id, position: { x, y }, velocity: { x: id % 3, y: id % 5 } });
const ids = (flock, indices) => indices.map((index) => flock[index].id).sort((a, b) => a - b);
function nearState(actual, expected) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index++) {
    assert.equal(actual[index].id, expected[index].id);
    for (const field of ["position", "velocity"]) {
      for (const axis of ["x", "y"])
        assert.ok(Math.abs(actual[index][field][axis] - expected[index][field][axis]) < 1e-9);
    }
  }
}
// Oracle xét chín ảnh tuần hoàn, không dùng cell lookup hoặc minimumImage.
function oracle(flock, target, params) {
  return flock
    .filter((other) => {
      if (other.id === target.id) return false;
      let distance = Infinity;
      for (const dx of [-params.width, 0, params.width]) {
        for (const dy of [-params.height, 0, params.height]) {
          distance = Math.min(
            distance,
            Math.hypot(
              other.position.x + dx - target.position.x,
              other.position.y + dy - target.position.y,
            ),
          );
        }
      }
      return distance <= params.radius;
    })
    .map((other) => other.id)
    .sort((a, b) => a - b);
}
function finish(job, batch = 10000) {
  let ticks = 0;
  while (!advanceGridStep(job, batch, 1000, () => 0)) {
    assert.ok(++ticks < 10001, "finite batch loop");
  }
  return completedGridStep(job);
}

test("Grid geometry wraps negative coordinates and bounds its allocation", () => {
  const grid = buildBoidsGrid([], defaults, 100);
  assert.equal(grid.columns, 10);
  assert.equal(grid.rows, 6);
  assert.deepEqual(gridAddress(-1, -1, grid), { column: 9, row: 5, index: 59 });
  assert.deepEqual(gridAddress(960, 600, grid), { column: 0, row: 0, index: 0 });
  for (const size of [0, -1, NaN, Infinity, 3]) assert.throws(() => gridGeometry(defaults, size));
  assert.throws(() => gridGeometry({ ...defaults, width: 1e6, height: 1e6 }, 4));
  assert.throws(() => gridAddress(NaN, 0, grid));
  const tiny = { ...defaults, width: 1e-320, height: 1e-320, radius: 0 };
  assert.deepEqual(gridGeometry(tiny, 1e6), { columns: 1, rows: 1 });
  assert.deepEqual(axisCells(0, 0, 1e-320, 1e6), [0]);
});

test("Periodic intervals cover a partial final cell, exact seam and deduplicate", () => {
  assert.deepEqual(
    axisCells(0, 64, 960, 100).sort((a, b) => a - b),
    [0, 8, 9],
  );
  assert.deepEqual(
    axisCells(896, 64, 960, 100).sort((a, b) => a - b),
    [0, 8, 9],
  );
  assert.deepEqual(
    axisCells(1, 299, 600, 240).sort((a, b) => a - b),
    [0, 1, 2],
  );
  assert.deepEqual(axisCells(-1, 0, 960, 64), [14]);
  assert.throws(() => axisCells(0, 300, 600, 64));
});

test("Every agent has exactly one bucket for all layouts and cell sizes", () => {
  for (const layout of ["uniform", "clustered", "dense"]) {
    const flock = makeLargeFlock(1024, 1, defaults, layout);
    for (const size of [16, 64, 100, 240]) {
      const grid = buildBoidsGrid(flock, defaults, size);
      const stored = grid.buckets.flat();
      assert.equal(stored.length, 1024);
      assert.equal(new Set(stored).size, 1024);
      grid.buckets.forEach((bucket, address) =>
        bucket.forEach((index) => {
          assert.equal(
            gridAddress(flock[index].position.x, flock[index].position.y, grid).index,
            address,
          );
        }),
      );
      assert.equal(grid.maximumOccupancy, Math.max(...grid.buckets.map((bucket) => bucket.length)));
    }
  }
});

test("Grid neighbor IDs match independent oracle at seams, cell edges and R/S relations", () => {
  const fixture = [
    boid(0, 0, 0),
    boid(1, 959, 599),
    boid(2, 896, 0),
    boid(3, 64, 0),
    boid(4, 0, 0),
    boid(5, 100, 100),
  ];
  for (const radius of [0, 16, 64, 100, 240, 299]) {
    const params = { ...defaults, radius };
    const flock = [...fixture, ...makeFlock(64, 19).map((item) => ({ ...item, id: item.id + 6 }))];
    for (const size of [16, 64, 100, 240, 1000]) {
      const grid = buildBoidsGrid(flock, params, size);
      flock.forEach((target, index) => {
        const query = queryBoidsGrid(flock, index, params, grid);
        assert.equal(new Set(query.cells).size, query.cells.length);
        assert.equal(new Set(query.candidates).size, query.candidates.length);
        assert.deepEqual(ids(flock, query.neighbors), oracle(flock, target, params));
      });
    }
  }
});

test("All layouts preserve Project 27 steering and one full step within 1e-9", () => {
  for (const layout of ["uniform", "clustered", "dense"]) {
    const flock = makeLargeFlock(256, 123, defaults, layout);
    const before = structuredClone(flock);
    const expected = flock.map((item, index) =>
      integrateBoid(
        item,
        computeSteering(flock, index, findNeighbors(flock, index, defaults), defaults).acceleration,
        defaults,
        fixedBoidsDt,
      ),
    );
    for (const size of [16, 64, 100, 240]) {
      const grid = buildBoidsGrid(flock, defaults, size);
      flock.forEach((_, index) => {
        const gridSteering = computeSteering(
          flock,
          index,
          queryBoidsGrid(flock, index, defaults, grid).neighbors,
          defaults,
        );
        const bruteSteering = computeSteering(
          flock,
          index,
          findNeighbors(flock, index, defaults),
          defaults,
        );
        for (const field of ["separation", "alignment", "cohesion", "acceleration"]) {
          for (const axis of ["x", "y"])
            assert.ok(Math.abs(gridSteering[field][axis] - bruteSteering[field][axis]) < 1e-9);
        }
      });
      nearState(finish(createGridStep(flock, defaults, size, "grid")), expected);
    }
    assert.deepEqual(flock, before);
  }
});

test("Batch boundaries do not change a synchronous step and cancellation cannot commit", () => {
  const flock = makeLargeFlock(256, 9, defaults);
  const reference = finish(createGridStep(flock, defaults, 100, "grid"));
  nearState(finish(createGridStep(flock, defaults, 100, "grid"), 7), reference);
  nearState(finish(createGridStep(flock, defaults, 100, "brute"), 13), reference);
  const job = createGridStep(flock, defaults, 100, "grid");
  flock[0].position.x = 800;
  advanceGridStep(job, 7, 1000, () => 0);
  assert.equal(job.nextIndex, 7);
  assert.notEqual(job.snapshot[0].position.x, 800);
  assert.throws(() => completedGridStep(job));
  cancelGridStep(job);
  assert.equal(advanceGridStep(job), false);
  assert.throws(() => completedGridStep(job));
  assert.equal(job.output.length, 0);
});

test("Mandatory 10000 agents all move, no dropped agents or capped neighbors", () => {
  const flock = makeLargeFlock(10000, 1, defaults);
  const job = createGridStep(flock, defaults, 64, "grid");
  const output = finish(job, 128);
  assert.equal(job.nextIndex, 10000);
  assert.equal(output.length, 10000);
  output.forEach((item, index) => {
    assert.equal(item.id, flock[index].id);
    assert.ok(
      item.position.x !== flock[index].position.x || item.position.y !== flock[index].position.y,
    );
  });
  assert.ok(job.metrics.neighbors > 0);
  assert.ok(job.metrics.candidates < 10000 * 9999);
  assert.throws(() => createGridStep(flock, defaults, 64, "brute"));
  const dense = makeLargeFlock(1024, 1, defaults, "dense");
  const denseJob = createGridStep(dense, defaults, 64, "grid");
  finish(denseJob);
  assert.equal(denseJob.metrics.neighbors, 1024 * 1023);
});
