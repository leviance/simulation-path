import assert from "node:assert/strict";
import test from "node:test";
import {
  bresenhamSteps,
  ddaSteps,
  filledCircle,
  midpointCircle,
  midpointCircleSteps,
  rectanglePixels,
  roundLikeCpp,
} from "../lib/labs/raster.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const key = ({ x, y }) => x + "," + y;
const set = (points) => new Set(points.map(key));

test("Raster DDA and Bresenham cover thousands of directions with independent geometry checks", () => {
  for (let y = -20; y <= 20; y++)
    for (let x = -20; x <= 20; x++) {
      const start = { x: -3, y: 5 };
      const end = { x: start.x + x, y: start.y + y };
      for (const algorithm of [ddaSteps, bresenhamSteps])
        for (const [a, b] of [
          [start, end],
          [end, start],
        ]) {
          const steps = algorithm(a, b);
          assert.equal(steps.length, Math.max(Math.abs(x), Math.abs(y)) + 1);
          assert.deepEqual(steps[0].point, a);
          assert.deepEqual(steps.at(-1).point, b);
          for (let index = 0; index < steps.length; index++) {
            const p = steps[index].point;
            if (x || y)
              assert.ok(
                Math.abs(y * (p.x - start.x) - x * (p.y - start.y)) / Math.hypot(x, y) <= 0.500001,
              );
            if (index)
              assert.equal(
                Math.max(
                  Math.abs(p.x - steps[index - 1].point.x),
                  Math.abs(p.y - steps[index - 1].point.y),
                ),
                1,
              );
          }
        }
    }
});

test("Raster keeps exact error fixtures and explicit tie differences", () => {
  const steps = bresenhamSteps({ x: 0, y: 0 }, { x: 7, y: 3 });
  assert.deepEqual(
    steps
      .slice(0, 3)
      .map(({ point, error, e2, movesX, movesY }) => [point, error, e2, movesX, movesY]),
    [
      [{ x: 0, y: 0 }, 4, 8, true, false],
      [{ x: 1, y: 0 }, 1, 2, true, true],
      [{ x: 2, y: 1 }, 5, 10, true, false],
    ],
  );
  assert.equal(steps.at(-1).movesX, false);
  assert.equal(steps.at(-1).movesY, false);
  assert.deepEqual(bresenhamSteps({ x: 0, y: 0 }, { x: 2, y: 1 })[1].point, { x: 1, y: 1 });
  assert.deepEqual(bresenhamSteps({ x: 2, y: 1 }, { x: 0, y: 0 })[1].point, { x: 1, y: 0 });
  assert.deepEqual(ddaSteps({ x: 0, y: -1 }, { x: 2, y: 0 })[1].point, { x: 1, y: -1 });
  assert.equal(roundLikeCpp(-0.5), -1);
  assert.ok(Object.is(roundLikeCpp(-0), 0));
});

test("Raster normalizes finite coordinates before DDA and rejects unbounded work", () => {
  assert.deepEqual(ddaSteps({ x: 0.2, y: 0.2 }, { x: 2.2, y: 1.2 }).at(-1).point, { x: 2, y: 1 });
  for (const invalid of [NaN, Infinity, -Infinity, 1e300, 4097]) {
    assert.deepEqual(ddaSteps({ x: invalid, y: 0 }, { x: 1, y: 1 }), []);
    assert.deepEqual(bresenhamSteps({ x: 0, y: 0 }, { x: invalid, y: 1 }), []);
  }
  assert.equal(ddaSteps({ x: -4096, y: 0 }, { x: 4096, y: 0 }).length, 8193);
  assert.deepEqual(rectanglePixels({ x: 0, y: 0 }, { x: 1024, y: 1 }, true), []);
  for (const radius of [-1, 257, Infinity, NaN]) {
    assert.deepEqual(midpointCircleSteps({ x: 0, y: 0 }, radius), []);
    assert.deepEqual(filledCircle({ x: 0, y: 0 }, radius), []);
  }
});

test("Raster rectangle agrees with a separate inclusive-area oracle including degeneracy", () => {
  for (let width = 1; width <= 12; width++)
    for (let height = 1; height <= 9; height++) {
      const a = { x: -3, y: 4 };
      const b = { x: a.x + width - 1, y: a.y + height - 1 };
      const expected = [new Set(), new Set()];
      for (let y = a.y; y <= b.y; y++)
        for (let x = a.x; x <= b.x; x++) {
          expected[1].add(key({ x, y }));
          if (x === a.x || x === b.x || y === a.y || y === b.y) expected[0].add(key({ x, y }));
        }
      for (const filled of [false, true]) {
        const pixels = rectanglePixels(a, b, filled);
        assert.deepEqual(set(pixels), expected[Number(filled)]);
        assert.equal(pixels.length, expected[Number(filled)].size);
        assert.deepEqual(pixels, rectanglePixels(b, a, filled));
      }
    }
});

test("Raster circle uses the inward zero-decision branch and fills its actual midpoint outline", () => {
  assert.equal(midpointCircle({ x: 0, y: 0 }, 1).length, 4);
  assert.equal(midpointCircle({ x: 0, y: 0 }, 2).length, 12);
  assert.equal(filledCircle({ x: 0, y: 0 }, 2).length, 21);
  assert.deepEqual(filledCircle({ x: -4, y: 8 }, 0), [{ x: -4, y: 8 }]);
  for (let radius = 0; radius <= 64; radius++) {
    const center = { x: -7, y: 9 };
    const outline = midpointCircle(center, radius);
    const solid = filledCircle(center, radius);
    const boundary = set(outline);
    const interior = set(solid);
    assert.equal(boundary.size, outline.length);
    assert.equal(interior.size, solid.length);
    for (const point of outline) {
      const x = point.x - center.x,
        y = point.y - center.y;
      assert.ok(Math.abs(Math.hypot(x, y) - radius) <= 0.55);
      assert.ok(boundary.has(key({ x: center.x - x, y: center.y + y })));
      assert.ok(boundary.has(key({ x: center.x + y, y: center.y + x })));
      assert.ok(interior.has(key(point)));
    }
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      const row = solid.filter((point) => point.y === y);
      assert.ok(row.length > 0);
      assert.equal(
        Math.max(...row.map((point) => point.x)) - Math.min(...row.map((point) => point.x)) + 1,
        row.length,
      );
    }
  }
});

test("Raster input mapping compensates CSS scale exactly once and rejects letterbox/outside", async () => {
  const metrics = await componentCallback("raster-grid.ts", "rasterGridMetrics", {});
  const point = await componentCallback("raster-grid.ts", "rasterPointFromEvent", {});
  const size = { width: 760, height: 340 };
  const grid = metrics(size, 20, 13);
  const rect = { left: 30, top: 40, width: 380, height: 170 };
  const eventAt = (x, y) => ({
    clientX: rect.left + x / 2,
    clientY: rect.top + y / 2,
    currentTarget: { getBoundingClientRect: () => rect },
  });
  assert.deepEqual(
    point(
      eventAt(grid.ox + 7.5 * grid.cell, grid.oy + 3.5 * grid.cell),
      grid,
      { maxX: 19, maxY: 12 },
      size,
    ),
    { x: 7, y: 3 },
  );
  assert.equal(point(eventAt(grid.ox - 1, grid.oy), grid, { maxX: 19, maxY: 12 }, size), null);
  assert.equal(
    point(eventAt(grid.ox + 20 * grid.cell, grid.oy), grid, { maxX: 19, maxY: 12 }, size),
    null,
  );
  const mobile = metrics({ width: 280, height: 260 }, 21, 15);
  assert.ok(mobile.ox >= 0 && mobile.oy >= 0 && mobile.oy + 15 * mobile.cell <= 260);
});

async function dragHarness() {
  const owner = { current: null };
  const samples = [];
  const capture = new Set();
  const canvas = {
    setPointerCapture: (id) => capture.add(id),
    releasePointerCapture: (id) => capture.delete(id),
    hasPointerCapture: (id) => capture.has(id),
    focus: () => {},
  };
  const release = await componentCallback("use-raster-drag.ts", "release", {
    owner,
    canvasRef: { current: canvas },
  });
  const env = {
    paused: false,
    owner,
    eventPoint: (event) => event.point,
    begin: (p) => samples.push(["begin", p]),
    move: (p) => samples.push(["move", p]),
    release,
  };
  const start = await componentCallback("use-raster-drag.ts", "startDrag", env);
  const move = await componentCallback("use-raster-drag.ts", "moveDrag", env);
  const end = await componentCallback("use-raster-drag.ts", "endDrag", env);
  const event = (id, point, rest = {}) => ({
    pointerId: id,
    isPrimary: true,
    button: 0,
    buttons: 1,
    point,
    currentTarget: canvas,
    ...rest,
  });
  return { owner, samples, capture, start, move, end, event, release };
}

test("Raster actual drag callbacks reject secondary buttons/pointers and retain mouse-up position", async () => {
  const h = await dragHarness();
  h.start(h.event(1, { x: 1, y: 1 }, { button: 2 }));
  assert.equal(h.owner.current, null);
  h.start(h.event(1, { x: 1, y: 1 }));
  h.start(h.event(2, { x: 8, y: 8 }));
  h.move(h.event(2, { x: 9, y: 9 }));
  assert.equal(h.samples.length, 1);
  h.end(h.event(1, { x: 8, y: 8 }, { button: 2 }));
  assert.equal(h.owner.current, 1);
  h.end(h.event(1, { x: 4, y: 5 }));
  assert.deepEqual(h.samples, [
    ["begin", { x: 1, y: 1 }],
    ["move", { x: 4, y: 5 }],
  ]);
  assert.equal(h.owner.current, null);
  assert.equal(h.capture.size, 0);
  h.move(h.event(1, { x: 9, y: 9 }));
  assert.equal(h.samples.length, 2);
});

test("Raster actual drag cancellation, outside samples and lost buttons release ownership", async () => {
  for (const cause of ["cancel", "outside", "buttons"]) {
    const h = await dragHarness();
    h.start(h.event(3, { x: 1, y: 1 }));
    if (cause === "cancel") h.end(h.event(3, { x: 9, y: 9 }), true);
    else
      h.move(
        h.event(3, cause === "outside" ? null : { x: 9, y: 9 }, {
          buttons: cause === "buttons" ? 0 : 1,
        }),
      );
    assert.equal(h.owner.current, null);
    assert.equal(h.capture.size, 0);
    assert.equal(h.samples.length, 1);
  }
});

test("Raster actual lifecycle cleanup removes listeners and releases capture", async () => {
  const events = new Map();
  let releases = 0;
  const target = (prefix) => ({
    addEventListener: (name, fn) => events.set(prefix + name, fn),
    removeEventListener: (name) => events.delete(prefix + name),
  });
  const document = { ...target("d:"), hidden: true };
  const effect = await componentEffect("use-raster-drag.ts", "visibilitychange", {
    window: target("w:"),
    document,
    release: () => releases++,
  });
  const cleanup = effect();
  events.get("w:blur")();
  events.get("d:visibilitychange")();
  assert.equal(releases, 2);
  cleanup();
  assert.equal(events.size, 0);
  assert.equal(releases, 3);
});

test("Raster actual keyboard handlers prevent scrolling while paused and never repeat Space toggles", async () => {
  for (const file of ["raster-line-lab.tsx", "raster-rectangle-lab.tsx", "raster-circle-lab.tsx"]) {
    let toggles = 0;
    const handler = await componentCallback(file, "onKeyDown", {
      paused: true,
      drag: { release() {} },
      togglePause: () => toggles++,
    });
    const keys = [" ", "ArrowDown"];
    if (file !== "raster-rectangle-lab.tsx") keys.push("PageDown", "Home", "End");
    for (const key of keys) {
      let prevented = false;
      handler({
        key,
        repeat: true,
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true, file + " allows scrolling for " + JSON.stringify(key));
    }
    assert.equal(toggles, 0);
    handler({ key: " ", repeat: false, preventDefault() {} });
    assert.equal(toggles, 1);
    let trappedTab = false;
    handler({
      key: "Tab",
      preventDefault() {
        trappedTab = true;
      },
    });
    assert.equal(trappedTab, false);
  }
});
