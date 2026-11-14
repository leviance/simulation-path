import assert from "node:assert/strict";
import test from "node:test";
import {
  Cell,
  ScanOrder,
  createGrid,
  contains,
  cellAt,
  setCell,
  paintDisk,
  paintStroke,
  countMaterials,
  checksum,
} from "../lib/labs/falling-sand/model.ts";
import { makeSmallScene, makeWorkshopScene, nextRandom } from "../lib/labs/falling-sand/presets.ts";
import { tryMove, stepGrid } from "../lib/labs/falling-sand/rules.ts";
import { TICK_SECONDS, planSteps } from "../lib/labs/falling-sand/timing.ts";
import { gridViewport, pointerCell, sandStage } from "../lib/labs/falling-sand/view.ts";
import { encodeRgba, overlayMoved } from "../lib/labs/falling-sand/pixels.ts";
import { SandSession } from "../lib/labs/falling-sand/session.ts";
import { validateSmallScene, validationPassed } from "../lib/labs/falling-sand/validation.ts";

function mixedFixture() {
  const grid = createGrid(8, 8);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const value = (x * 17 + y * 31) % 11;
      if (value === 0) setCell(grid, x, y, Cell.Sand);
      else if (value === 1) setCell(grid, x, y, Cell.Water);
      else if (value === 2) setCell(grid, x, y, Cell.Wall);
    }
  }
  return grid;
}

test("workshop grid validates dimensions and prevents row aliasing", () => {
  for (const [width, height] of [
    [0, 8],
    [-1, 8],
    [1.5, 8],
    [1025, 8],
    [8, 769],
    [Infinity, 8],
  ])
    assert.throws(() => createGrid(width, height));
  const grid = createGrid(8, 6);
  assert.equal(contains(grid, 8, 0), false);
  setCell(grid, 8, 0, Cell.Sand);
  assert.equal(cellAt(grid, 0, 1), Cell.Empty);
  assert.equal(cellAt(grid, -1, 0), Cell.Wall);
  setCell(grid, 1, 1, 8);
  assert.equal(cellAt(grid, 1, 1), Cell.Empty);
});

test("workshop radius-zero and clipped brushes do not leave gaps or bridge invalid endpoints", () => {
  const grid = createGrid(8, 8);
  paintDisk(grid, 0, 0, 1, Cell.Sand);
  assert.equal(countMaterials(grid)[Cell.Sand], 3);
  paintStroke(grid, { x: 0, y: 3 }, { x: 7, y: 3 }, 0, Cell.Wall);
  assert.equal(countMaterials(grid)[Cell.Wall], 8);
  paintStroke(grid, { x: 7, y: 3 }, { x: 0, y: 3 }, 0, Cell.Empty);
  assert.equal(countMaterials(grid)[Cell.Wall], 0);
  const before = grid.cells.slice();
  paintStroke(grid, { x: -1, y: 0 }, { x: 7, y: 0 }, 1, Cell.Sand);
  paintDisk(grid, 1, 1, NaN, Cell.Sand);
  assert.deepEqual(grid.cells, before);
});

test("workshop checkpoint gates match the native down, diagonal and water sequence", () => {
  const grid = createGrid(8, 8);
  setCell(grid, 4, 0, Cell.Sand);
  assert.equal(stepGrid(grid, 2).visited, 0);
  assert.equal(grid.tick, 0);
  stepGrid(grid, 3);
  assert.equal(cellAt(grid, 4, 1), Cell.Sand);
  setCell(grid, 4, 2, Cell.Wall);
  stepGrid(grid, 3);
  assert.equal(cellAt(grid, 4, 1), Cell.Sand);
  stepGrid(grid, 4);
  assert.equal(cellAt(grid, 5, 2), Cell.Sand);
  assert.equal(cellAt(grid, 4, 2), Cell.Wall);
  assert.equal(tryMove(grid, 4, 2, 4, 3), false);
  assert.equal(tryMove(grid, -1, 0, 0, 0), false);
  assert.equal(tryMove(grid, 0, 0, 0, 1), false);
});

test("a freed vacancy can propagate upward while each sand grain descends only once", () => {
  const grid = createGrid(3, 4);
  for (let y = 0; y < 4; y += 1) {
    setCell(grid, 0, y, Cell.Wall);
    setCell(grid, 2, y, Cell.Wall);
  }
  setCell(grid, 1, 0, Cell.Sand);
  setCell(grid, 1, 1, Cell.Sand);
  const stats = stepGrid(grid);
  assert.deepEqual(
    [0, 1, 2, 3].map((y) => cellAt(grid, 1, y)),
    [Cell.Empty, Cell.Sand, Cell.Sand, Cell.Empty],
  );
  assert.equal(stats.swaps, 2);
  assert.equal(stats.visited, 12);
});

test("water moves one horizontal cell and sand-water exchange preserves both participants", () => {
  let grid = createGrid(8, 8);
  for (let x = 0; x < 8; x += 1) setCell(grid, x, 4, Cell.Wall);
  setCell(grid, 2, 3, Cell.Water);
  stepGrid(grid);
  assert.equal(cellAt(grid, 3, 3), Cell.Water);
  assert.equal(countMaterials(grid)[Cell.Water], 1);
  assert.equal(grid.moved[3 * 8 + 2], 1);
  assert.equal(grid.moved[3 * 8 + 3], 1);
  grid = createGrid(3, 3);
  for (let x = 0; x < 3; x += 1) setCell(grid, x, 2, Cell.Wall);
  setCell(grid, 0, 1, Cell.Wall);
  setCell(grid, 2, 1, Cell.Wall);
  setCell(grid, 1, 0, Cell.Sand);
  setCell(grid, 1, 1, Cell.Water);
  const counts = countMaterials(grid);
  stepGrid(grid);
  assert.equal(cellAt(grid, 1, 0), Cell.Water);
  assert.equal(cellAt(grid, 1, 1), Cell.Sand);
  assert.deepEqual(countMaterials(grid), counts);
});

test("two water cells competing for one vacancy expose scan-order dependence", () => {
  const result = [];
  for (const order of [ScanOrder.LeftToRight, ScanOrder.RightToLeft]) {
    const grid = createGrid(3, 3);
    grid.order = order;
    for (let x = 0; x < 3; x += 1) setCell(grid, x, 2, Cell.Wall);
    setCell(grid, 0, 1, Cell.Water);
    setCell(grid, 2, 1, Cell.Water);
    stepGrid(grid);
    result.push([cellAt(grid, 0, 1), cellAt(grid, 1, 1), cellAt(grid, 2, 1)]);
    assert.equal(countMaterials(grid)[Cell.Water], 2);
  }
  assert.deepEqual(result, [
    [Cell.Empty, Cell.Water, Cell.Water],
    [Cell.Water, Cell.Water, Cell.Empty],
  ]);
});

test("all four 50-tick fixtures match the native independently ID-checked results", () => {
  const expected = [3694149450, 380760090, 1912800860, 3694149450];
  for (let order = 0; order < 4; order += 1) {
    const grid = mixedFixture();
    grid.order = order;
    const counts = countMaterials(grid);
    const initial = grid.cells.slice();
    for (let tick = 0; tick < 50; tick += 1) {
      stepGrid(grid);
      assert.deepEqual(countMaterials(grid), counts);
    }
    initial.forEach((cell, index) => {
      if (cell === Cell.Wall) assert.equal(grid.cells[index], Cell.Wall);
    });
    assert.equal(checksum(grid), expected[order]);
  }
});

test("preset generation and uint32 RNG match the native default and high-bit seed arithmetic", () => {
  assert.deepEqual(countMaterials(makeSmallScene(1)), [5929, 80, 135, 0]);
  assert.deepEqual(countMaterials(makeSmallScene(5)), [5257, 80, 135, 672]);
  assert.deepEqual(countMaterials(makeWorkshopScene()), [136743, 2649, 9472, 14976]);
  const same = makeWorkshopScene(3, 46);
  assert.deepEqual(makeWorkshopScene(3, 46).cells, same.cells);
  assert.notDeepEqual(makeWorkshopScene(3, 47).cells, same.cells);
  for (const seed of [0, 1, 46, 0xffffffff]) {
    let state = seed;
    let reference = BigInt(seed);
    for (let index = 0; index < 12; index += 1) {
      state = nextRandom(state);
      reference = (reference * 1664525n + 1013904223n) & 0xffffffffn;
      assert.equal(state, Number(reference));
    }
  }
  assert.throws(() => makeWorkshopScene(3, 0x100000000));
  assert.throws(() => makeWorkshopScene(8));
});

test("real 512x320 mixture after 120 ticks matches the native benchmark state", () => {
  const grid = makeWorkshopScene(3, 46);
  const counts = countMaterials(grid);
  const initial = grid.cells.slice();
  for (let tick = 0; tick < 120; tick += 1) {
    const stats = stepGrid(grid);
    assert.equal(stats.visited, 163840);
    assert.deepEqual(countMaterials(grid), counts);
  }
  initial.forEach((cell, index) => {
    if (cell === Cell.Wall) assert.equal(grid.cells[index], cell);
  });
  assert.equal(checksum(grid), 524100528);
  assert.equal(grid.cells.byteLength + grid.moved.byteLength, 327680);
});

test("RGBA byte order, surface shading and moved overlays leave model data untouched", () => {
  const grid = createGrid(3, 2);
  setCell(grid, 1, 0, Cell.Sand);
  setCell(grid, 2, 1, Cell.Water);
  const before = grid.cells.slice();
  const pixels = new Uint8ClampedArray(24);
  encodeRgba(grid, pixels, true);
  assert.deepEqual([...pixels.slice(4, 8)], [229, 192, 123, 255]);
  encodeRgba(grid, pixels, false);
  assert.deepEqual([...pixels.slice(20, 24)], [103, 195, 255, 255]);
  grid.moved[1] = 1;
  const plain = pixels.slice();
  overlayMoved(grid, pixels);
  assert.notDeepEqual(pixels.slice(4, 8), plain.slice(4, 8));
  assert.deepEqual(grid.cells, before);
  assert.throws(() => encodeRgba(grid, new Uint8ClampedArray(4)));
});

test("pointer mapping uses CSS dimensions with letterbox and exclusive edges", () => {
  const grid = createGrid(96, 64);
  const view = gridViewport(960, 640, 96, 64);
  for (const [x, y] of [
    [0, 0],
    [95, 0],
    [0, 63],
    [95, 63],
    [5, 2],
  ]) {
    assert.deepEqual(
      pointerCell(960, 640, view.x + (x + 0.5) * view.scale, view.y + (y + 0.5) * view.scale, grid),
      { x, y },
    );
  }
  assert.equal(pointerCell(960, 640, view.x - 0.1, view.y, grid), null);
  assert.equal(pointerCell(960, 640, view.x + view.width, view.y, grid), null);
  assert.equal(pointerCell(960, 640, view.x, view.y + view.height, grid), null);
  assert.equal(pointerCell(960, 640, NaN, 0, grid), null);
  assert.equal(pointerCell(0, 0, 0, 0, grid), null);
  assert.equal(sandStage("sand-9"), 9);
  assert.equal(sandStage("sand-0"), 9);
});

test("fixed-clock speed and frame splits match native time budgets", () => {
  for (const fps of [15, 30, 120]) {
    for (const speed of [0.5, 1, 2]) {
      let ticks = 0;
      let accumulator = 0;
      for (let frame = 0; frame < fps * 2; frame += 1) {
        const plan = planSteps(accumulator, 1 / fps, speed);
        accumulator = plan.remainder;
        ticks += plan.steps;
        assert.ok(plan.dropped < 1e-10);
      }
      assert.equal(ticks, 60 * speed);
    }
  }
  const hitch = planSteps(0, 10, 4);
  assert.equal(hitch.steps, 4);
  assert.ok(hitch.dropped > 39);
  assert.ok(hitch.remainder >= 0 && hitch.remainder < TICK_SECONDS);
  assert.equal(planSteps(-1, NaN, Infinity).steps, 0);
});

test("session commands pause, reset, clear and preserve selected seed/order", () => {
  const session = new SandSession(9, () => 0);
  session.reset(3, 46);
  const initial = session.grid.cells.slice();
  session.toggleRun();
  session.advance(1 / 30);
  assert.equal(session.grid.tick, 1);
  session.singleStep();
  assert.equal(session.paused, true);
  assert.equal(session.grid.tick, 2);
  session.advance(10);
  assert.equal(session.grid.tick, 2);
  session.setOrder(ScanOrder.RightToLeft);
  session.reset();
  assert.deepEqual(session.grid.cells, initial);
  assert.equal(session.grid.order, ScanOrder.RightToLeft);
  assert.equal(session.grid.tick, 0);
  session.reset(3, 46, true);
  assert.equal(session.preset, 3);
  assert.equal(countMaterials(session.grid)[Cell.Empty], 163840);
  session.reset();
  assert.deepEqual(session.grid.cells, initial);
});

test("invalid session changes keep the last valid scene and stage gates are real", () => {
  const session = new SandSession(9);
  const previous = session.grid;
  for (const seed of [-1, 1.5, NaN, 0x100000000]) assert.throws(() => session.reset(3, seed));
  assert.equal(session.grid, previous);
  const early = new SandSession(3);
  early.setMaterial(Cell.Water);
  assert.equal(early.material, Cell.Sand);
  assert.throws(() => early.setOrder(1));
  assert.throws(() => early.reset(1));
  early.toggleRun();
  assert.equal(early.paused, true);
  early.setRadius(Infinity);
  assert.equal(early.radius, 2);
  const summary = session.summary();
  assert.ok(JSON.stringify(summary).length < 2048);
  assert.equal("cells" in summary, false);
  assert.equal("grid" in summary, false);
});

test("pointer exit splits strokes and held pouring advances by ticks, not render calls", () => {
  const session = new SandSession(9, () => 0);
  session.reset(4);
  session.setRadius(0);
  session.pointerBegin({ x: 0, y: 5 }, false);
  session.pointerMove(null);
  session.pointerMove({ x: 10, y: 5 });
  assert.equal(countMaterials(session.grid)[Cell.Sand], 2);
  assert.equal(cellAt(session.grid, 5, 5), Cell.Empty);
  session.endStroke();
  session.reset(4);
  session.pointerBegin({ x: 20, y: 20 }, false);
  session.toggleRun();
  session.advance(1 / 30);
  session.advance(1 / 30);
  assert.equal(countMaterials(session.grid)[Cell.Sand], 2);
  session.pause();
  assert.equal(session.drawing, false);
  session.reset(4);
  session.pointerBegin({ x: 20, y: 20 }, true);
  assert.equal(countMaterials(session.grid)[Cell.Sand], 0);
});

test("small-fixture validation and disposal never silently mutate or resume the sandbox", () => {
  assert.equal(validationPassed(validateSmallScene()), true);
  const session = new SandSession(9, () => 0);
  const cells = session.grid.cells.slice();
  session.validate();
  assert.deepEqual(session.grid.cells, cells);
  assert.equal(session.grid.tick, 0);
  assert.equal(validationPassed(session.report), true);
  session.dispose();
  session.advance(1);
  session.pointerBegin({ x: 0, y: 0 }, false);
  assert.deepEqual(session.grid.cells, cells);
  session.mount();
  assert.equal(session.disposed, false);
  assert.equal(session.paused, true);
  assert.deepEqual(session.grid.cells, cells);
});
