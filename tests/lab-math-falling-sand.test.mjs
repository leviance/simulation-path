import assert from "node:assert/strict";
import test from "node:test";
import {
  Cell,
  cellAt,
  checksum,
  contains,
  countMaterials,
  createGrid,
  makeScene,
  paintDisk,
  paintStroke,
  planSteps,
  pointerCell,
  setCell,
  stepGrid,
  TICK_SECONDS,
  validateScene,
} from "../lib/labs/falling-sand.ts";

test("sand grid rejects invalid sizes and never aliases out-of-bounds coordinates", () => {
  assert.throws(() => createGrid(0, 8));
  assert.throws(() => createGrid(257, 8));
  assert.throws(() => createGrid(2.5, 8));
  const grid = createGrid(8, 8);
  assert.equal(contains(grid, 8, 0), false);
  setCell(grid, 8, 0, Cell.Sand);
  assert.equal(cellAt(grid, 0, 1), Cell.Empty);
  assert.equal(cellAt(grid, -1, 0), Cell.Wall);
  assert.equal(cellAt(grid, 0, 8), Cell.Wall);
});

test("sand brush clips at corners and interpolates both directions without gaps", () => {
  const grid = createGrid(8, 8);
  paintDisk(grid, 0, 0, 1, Cell.Sand);
  assert.equal(countMaterials(grid)[Cell.Sand], 3);
  paintStroke(grid, 0, 2, 7, 2, 0, Cell.Wall);
  assert.equal(countMaterials(grid)[Cell.Wall], 8);
  paintStroke(grid, 7, 2, 0, 2, 0, Cell.Empty);
  assert.equal(countMaterials(grid)[Cell.Wall], 0);
  const previous = grid.cells.slice();
  paintStroke(grid, -1, 2, 7, 2, 0, Cell.Wall);
  assert.deepEqual(grid.cells, previous);
});

test("sand advances one row per tick and chapter gates keep earlier labs honest", () => {
  const grid = createGrid(8, 8);
  setCell(grid, 4, 0, Cell.Sand);
  stepGrid(grid, 2);
  assert.equal(grid.tick, 0);
  assert.equal(cellAt(grid, 4, 0), Cell.Sand);
  stepGrid(grid, 3);
  assert.equal(cellAt(grid, 4, 1), Cell.Sand);
  assert.equal(countMaterials(grid)[Cell.Sand], 1);
  setCell(grid, 4, 2, Cell.Wall);
  stepGrid(grid, 3);
  assert.equal(cellAt(grid, 4, 1), Cell.Sand);
  stepGrid(grid, 4);
  assert.equal(cellAt(grid, 5, 2), Cell.Sand);
  assert.equal(cellAt(grid, 4, 2), Cell.Wall);
  const floor = createGrid(1, 1);
  setCell(floor, 0, 0, Cell.Sand);
  for (let i = 0; i < 3; i += 1) stepGrid(floor);
  assert.equal(cellAt(floor, 0, 0), Cell.Sand);
});

test("water cannot traverse a row in one tick and swaps mark both endpoints", () => {
  const grid = createGrid(8, 8);
  for (let x = 0; x < 8; x += 1) setCell(grid, x, 4, Cell.Wall);
  setCell(grid, 2, 3, Cell.Water);
  stepGrid(grid);
  assert.equal(cellAt(grid, 3, 3), Cell.Water);
  assert.equal(countMaterials(grid)[Cell.Water], 1);
  assert.equal(grid.moved[3 * 8 + 2], 1);
  assert.equal(grid.moved[3 * 8 + 3], 1);
});

test("sand exchanges with trapped water without destroying either material", () => {
  const grid = createGrid(3, 3);
  for (let x = 0; x < 3; x += 1) setCell(grid, x, 2, Cell.Wall);
  setCell(grid, 0, 1, Cell.Wall);
  setCell(grid, 2, 1, Cell.Wall);
  setCell(grid, 1, 0, Cell.Sand);
  setCell(grid, 1, 1, Cell.Water);
  const before = countMaterials(grid);
  stepGrid(grid);
  assert.equal(cellAt(grid, 1, 0), Cell.Water);
  assert.equal(cellAt(grid, 1, 1), Cell.Sand);
  assert.deepEqual(countMaterials(grid), before);
});

test("closed sand scenes conserve each material, walls and deterministic results", () => {
  assert.deepEqual(validateScene(), { conserved: true, deterministic: true, wallsFixed: true });
  for (const preset of [0, 1, 2]) {
    const grid = makeScene(7, preset);
    const initial = grid.cells.slice();
    const counts = countMaterials(grid);
    for (let tick = 0; tick < 180; tick += 1) {
      stepGrid(grid);
      assert.deepEqual(countMaterials(grid), counts);
    }
    initial.forEach((material, index) => {
      if (material === Cell.Wall) assert.equal(grid.cells[index], Cell.Wall);
    });
  }
});

test("sand mixed fixture shares the native C++ 50-tick checksum", () => {
  const grid = createGrid(8, 8);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const value = (x * 17 + y * 31) % 11;
      if (value < 3) setCell(grid, x, y, [Cell.Sand, Cell.Water, Cell.Wall][value]);
    }
  }
  const before = countMaterials(grid);
  for (let tick = 0; tick < 50; tick += 1) {
    stepGrid(grid);
    assert.deepEqual(countMaterials(grid), before);
  }
  assert.equal(checksum(grid), 2882136376);
});

test("sand fixed ticks agree at 15/30/120 FPS and bound a stalled frame", () => {
  const reference = makeScene();
  for (let i = 0; i < 60; i += 1) stepGrid(reference);
  for (const fps of [15, 30, 120]) {
    const grid = makeScene();
    let accumulator = 0;
    for (let frame = 0; frame < 2 * fps; frame += 1) {
      const plan = planSteps(accumulator, 1 / fps);
      accumulator = plan.remainder;
      assert.equal(plan.dropped, 0);
      for (let step = 0; step < plan.steps; step += 1) stepGrid(grid);
    }
    assert.equal(grid.tick, 60);
    assert.deepEqual(grid.cells, reference.cells);
  }
  const hitch = planSteps(0, 10);
  assert.equal(hitch.steps, 4);
  assert.ok(hitch.dropped > 9.8);
  assert.ok(hitch.remainder >= 0 && hitch.remainder < TICK_SECONDS);
  assert.equal(planSteps(-1, NaN).steps, 0);
});

test("sand pointer mapping respects letterbox and exact edges", () => {
  assert.equal(pointerCell(960, 640, -1, 30), null);
  assert.equal(pointerCell(960, 640, 960, 30), null);
  assert.deepEqual(pointerCell(960, 640, 55, 25), { x: 5, y: 2 });
  assert.equal(pointerCell(1000, 400, 100, 200), null);
  assert.deepEqual(pointerCell(1000, 400, 203, 3), { x: 0, y: 0 });
});
