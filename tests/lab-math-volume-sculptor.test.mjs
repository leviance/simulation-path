import assert from "node:assert/strict";
import test from "node:test";
import { cross3, dot3, magnitude3, normalize3, subtract3 } from "../lib/labs/normal.ts";
import {
  applyBrush,
  brushFalloff,
  chunksPerAxis,
  dirtyChunks,
  emptyBox,
  includeSample,
  StrokeSampler,
} from "../lib/labs/volume-sculptor/brush.ts";
import {
  GridSpec,
  initialField,
  planeField,
  ScalarGrid,
} from "../lib/labs/volume-sculptor/grid.ts";
import { cellsOfChunk, MeshJob } from "../lib/labs/volume-sculptor/mesh-job.ts";
import { SculptSession } from "../lib/labs/volume-sculptor/session.ts";
import {
  edgePoint,
  polygonizeCell,
  polygonizeTetra,
  teachingTetra,
} from "../lib/labs/volume-sculptor/topology.ts";
import {
  initialView,
  moveProbe,
  slicePoint,
  volumeMode,
  volumeModes,
} from "../lib/labs/volume-sculptor/view.ts";

function near(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}
function nearPoint(actual, expected, tolerance = 1e-7) {
  near(magnitude3(subtract3(actual, expected)), 0, tolerance);
}
function gridOf(samples = 12, shape = "sphere") {
  const grid = new ScalarGrid(new GridSpec(samples));
  grid.fill(shape);
  return grid;
}
function finishJob(job, budget = 256) {
  let batches = 0;
  while (job.phase === "count" || job.phase === "emit") {
    job.advance(budget);
    assert.ok(++batches < 4096, "bounded CPU extraction must terminate");
  }
  assert.equal(job.phase, "ready", job.error);
  return job.takeMesh();
}
function settle(session) {
  let batches = 0;
  while (session.needsWork) {
    assert.ok(session.advance(true));
    assert.ok(++batches < 4096, "bounded session must terminate");
  }
  assert.ok(session.current, session.notice);
  return session.lastGood;
}
const pointKey = (point) =>
  [point.x, point.y, point.z].map((value) => Math.round(value * 1e7)).join(",");

function topology(mesh) {
  const vertices = new Set(),
    edges = new Map(),
    adjacency = new Map();
  for (let index = 0; index < mesh.vertices.length; index += 3) {
    const keys = mesh.vertices.slice(index, index + 3).map((vertex) => pointKey(vertex.position));
    assert.equal(new Set(keys).size, 3);
    for (let edge = 0; edge < 3; ++edge) {
      const a = keys[edge],
        b = keys[(edge + 1) % 3];
      vertices.add(a);
      const key = [a, b].sort().join("/");
      const record = edges.get(key) ?? { count: 0, balance: 0 };
      ++record.count;
      record.balance += a < b ? 1 : -1;
      edges.set(key, record);
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      adjacency.get(a).add(b);
    }
  }
  for (const record of edges.values()) {
    assert.equal(record.count, 2, "closed mesh edge");
    assert.equal(record.balance, 0, "oriented edge");
  }
  let components = 0;
  const visited = new Set();
  for (const start of vertices) {
    if (visited.has(start)) continue;
    ++components;
    const pending = [start];
    while (pending.length) {
      const next = pending.pop();
      if (visited.has(next)) continue;
      visited.add(next);
      pending.push(...adjacency.get(next));
    }
  }
  return { euler: vertices.size - edges.size + mesh.vertices.length / 3, components };
}

test("volume grid distinguishes samples/cells, indexes row-major and rejects invalid domains", () => {
  const spec = new GridSpec(24);
  assert.equal(spec.sampleCount(), 13824);
  assert.equal(spec.cellCount(), 12167);
  assert.equal(spec.sampleIndex(2, 3, 4), (4 * 24 + 3) * 24 + 2);
  assert.equal(spec.sampleIndex(23, 23, 23), 13823);
  for (const samples of [2, 33, NaN, 12.5, Infinity])
    assert.throws(() => new GridSpec(samples), RangeError);
  for (const coordinate of [
    [-1, 0, 0],
    [24, 0, 0],
    [0, 2.5, 0],
  ])
    assert.throws(() => spec.sampleIndex(...coordinate));
  assert.throws(() => new GridSpec(12, { x: NaN, y: 0, z: 0 }));
  assert.throws(() => new GridSpec(12, { x: 0, y: 0, z: 0 }, 0));
  const grid = new ScalarGrid(spec);
  grid.set(1, 2, 3, 0.1);
  assert.equal(grid.at(1, 2, 3), Math.fround(0.1));
  assert.throws(() => grid.set(1, 2, 3, NaN));
  assert.throws(() => grid.replaceValues([0]));
});

test("world/grid and trilinear plane probes agree with an independent affine reference", () => {
  const spec = new GridSpec(12, { x: -2, y: 0.4, z: -1 }, 3.2),
    grid = new ScalarGrid(spec);
  const normal = normalize3({ x: 1, y: 2, z: -3 });
  const evaluate = (point) => dot3(normal, point) - 0.15;
  grid.fillFunction(evaluate);
  for (const coordinate of [
    { x: 0, y: 0, z: 0 },
    { x: 11, y: 11, z: 11 },
    { x: 4.25, y: 7.1, z: 2.34 },
  ]) {
    const world = spec.worldFromGrid(coordinate);
    nearPoint(spec.gridFromWorld(world), coordinate);
    near(grid.sample(world), evaluate(world), 2e-7);
    nearPoint(grid.gradient(world), normal, 3e-6);
  }
  assert.throws(() => grid.sample({ x: NaN, y: 0, z: 0 }));
  assert.throws(() => grid.gradient({ x: 100, y: 100, z: 100 }));
  assert.throws(() => planeField({ x: 0, y: 0, z: 0 }));
});

test("all sixteen tetra masks use the expected triangle count and outward winding", () => {
  const expectedCounts = [0, 1, 2, 1, 0];
  for (let mask = 0; mask < 16; ++mask) {
    const tetra = teachingTetra([0, 1, 2, 3].map((index) => (mask & (1 << index) ? -1 : 1)));
    const inside = tetra.filter((corner) => corner.value < 0),
      outside = tetra.filter((corner) => corner.value >= 0);
    const surface = polygonizeTetra(tetra, 0);
    assert.equal(surface.triangles.length, expectedCounts[inside.length]);
    for (const triangle of surface.triangles) {
      const [a, b, c] = triangle.map((vertex) => vertex.point);
      const outward = subtract3(outside[0].point, inside[0].point);
      assert.ok(dot3(cross3(subtract3(b, a), subtract3(c, a)), outward) > 0);
      for (const edge of triangle) {
        near(edge.t, 0.5);
        assert.ok(edge.key[0] < edge.key[1]);
      }
    }
  }
});

test("canonical edge ordering is exact, equality is outside, and degenerate triangles are dropped", () => {
  const tetra = teachingTetra([-0.37, 1.27, 2, 3]);
  assert.deepEqual(edgePoint(tetra[0], tetra[1], 0.1), edgePoint(tetra[1], tetra[0], 0.1));
  assert.throws(() => edgePoint(tetra[1], tetra[2], 0));
  assert.throws(() => edgePoint(tetra[0], tetra[0], 0));
  assert.equal(polygonizeTetra(teachingTetra([0, 0, 0, 0]), 0).triangles.length, 0);
  const collapsed = polygonizeTetra(teachingTetra([-1, 0, -1, -1]), 0);
  assert.equal(collapsed.triangles.length, 0);
  assert.equal(collapsed.degenerate, 1);
  assert.throws(() => polygonizeTetra([tetra[0], tetra[0], tetra[2], tetra[3]], 0));
});

test("all shared-face sign masks agree on intersection segments in three axes", () => {
  for (const axis of ["x", "y", "z"])
    for (let mask = 0; mask < 16; ++mask) {
      const grid = new ScalarGrid(new GridSpec(3));
      grid.values.fill(1);
      const otherAxes = ["x", "y", "z"].filter((value) => value !== axis);
      for (let vertex = 0; vertex < 4; ++vertex) {
        const coordinate = { x: 0, y: 0, z: 0 };
        coordinate[axis] = 1;
        coordinate[otherAxes[0]] = vertex & 1;
        coordinate[otherAxes[1]] = (vertex >> 1) & 1;
        grid.set(coordinate.x, coordinate.y, coordinate.z, mask & (1 << vertex) ? -1 : 1);
      }
      const right = { x: 0, y: 0, z: 0 };
      right[axis] = 1;
      const plane = grid.spec.origin[axis] + grid.spec.spacing();
      function segments(surface) {
        const found = new Set();
        for (const triangle of surface.triangles)
          for (let index = 0; index < 3; ++index) {
            const a = triangle[index].point,
              b = triangle[(index + 1) % 3].point;
            if (Math.abs(a[axis] - plane) < 1e-10 && Math.abs(b[axis] - plane) < 1e-10)
              found.add([pointKey(a), pointKey(b)].sort().join("/"));
          }
        return [...found].sort();
      }
      assert.deepEqual(
        segments(polygonizeCell(grid, 0, 0, 0, 0)),
        segments(polygonizeCell(grid, right.x, right.y, right.z, 0)),
        `${axis} mask ${mask}`,
      );
    }
});

test("sphere extraction is closed, outward, bounded and improves under refinement", () => {
  const errors = [];
  for (const samples of [12, 24, 32]) {
    const grid = gridOf(samples),
      mesh = finishJob(new MeshJob(grid, 0, true, 1, 1));
    assert.ok(mesh.vertices.length > 0 && mesh.vertices.length % 3 === 0);
    assert.equal(mesh.indices.length, mesh.vertices.length);
    assert.ok(mesh.activeCells < grid.spec.cellCount());
    assert.equal(mesh.normalFallbacks, 0);
    let sum = 0;
    for (const vertex of mesh.vertices) {
      const radius = magnitude3(vertex.position);
      sum += (radius - 0.82) ** 2;
      near(magnitude3(vertex.normal), 1, 1e-10);
      assert.ok(dot3(normalize3(vertex.position), vertex.normal) > 0.96);
      assert.ok(Object.values(vertex.position).every((value) => Math.abs(value) <= 1.5));
    }
    errors.push(Math.sqrt(sum / mesh.vertices.length));
    assert.deepEqual(topology(mesh), { euler: 2, components: 1 });
  }
  assert.ok(errors[1] < errors[0] * 0.5);
  assert.ok(errors[2] < errors[1]);
});

test("CPU count-prefix-emit respects every cell range and refuses capacity before emit", () => {
  const grid = gridOf(),
    job = new MeshJob(grid, 0, true, 1, 1);
  job.advance(1);
  assert.equal(job.countedCells, 1);
  assert.equal(job.emittedCells, 0);
  const mesh = finishJob(job, 127);
  for (const chunk of mesh.chunks) {
    assert.equal(chunk.offsets[0], 0);
    for (let index = 0; index < chunk.counts.length; ++index) {
      assert.equal(chunk.counts[index] % 3, 0);
      assert.equal(chunk.offsets[index + 1], chunk.offsets[index] + chunk.counts[index]);
    }
    assert.equal(chunk.vertices.length, chunk.offsets[chunk.counts.length]);
  }
  const small = new MeshJob(grid, 0, true, 1, 2, null, null, mesh.vertices.length - 1);
  while (small.phase === "count") small.advance();
  assert.equal(small.phase, "failed");
  assert.equal(small.emittedCells, 0);
  assert.equal(
    small.chunks.reduce((sum, chunk) => sum + chunk.vertices.length, 0),
    0,
  );
  assert.throws(() => small.takeMesh());
});

test("jobs snapshot field values and never publish a partial cancelled candidate", () => {
  const grid = gridOf(),
    job = new MeshJob(grid, 0, true, 1, 1);
  grid.values.fill(4);
  assert.ok(finishJob(job).vertices.length > 0);
  const candidate = new MeshJob(gridOf(), 0, true, 1, 2);
  while (candidate.phase === "count") candidate.advance();
  candidate.advance(100);
  assert.ok(candidate.emittedCells > 0);
  candidate.cancel();
  assert.equal(candidate.phase, "cancelled");
  assert.throws(() => candidate.takeMesh());
  assert.equal(candidate.advance(), false);
});

test("brush uses smooth falloff, protected boundaries, binary32 changed writes and bounded inputs", () => {
  near(brushFalloff(0), 1);
  near(brushFalloff(0.5), 0.5625);
  near(brushFalloff(1), 0);
  near(brushFalloff(2), 0);
  const grid = gridOf(13),
    before = grid.values.slice();
  const edit = applyBrush(grid, {
    center: { x: 0, y: 0, z: 0 },
    radius: 0.5,
    strength: 0.3,
    mode: "add",
  });
  assert.ok(edit.writes > 0);
  near(grid.at(6, 6, 6), Math.fround(before[grid.spec.sampleIndex(6, 6, 6)] - 0.3));
  for (let z = 0; z < 13; ++z)
    for (let y = 0; y < 13; ++y)
      for (let x = 0; x < 13; ++x)
        if ([x, y, z].some((value) => value === 0 || value === 12))
          assert.equal(grid.at(x, y, z), before[grid.spec.sampleIndex(x, y, z)]);
  const noop = applyBrush(grid, {
    center: { x: 8, y: 8, z: 8 },
    radius: 0.3,
    strength: 0.3,
    mode: "add",
  });
  assert.equal(noop.writes, 0);
  assert.equal(noop.changed.empty, true);
  assert.throws(() =>
    applyBrush(grid, { center: { x: 0, y: 0, z: 0 }, radius: NaN, strength: 0.3, mode: "add" }),
  );
});

test("distance sampled strokes are independent of event rate, with finite segment budgets", () => {
  const start = { x: 0, y: 0, z: 0 },
    slow = new StrokeSampler(start, 0.4),
    fast = new StrokeSampler(start, 0.4);
  const a = slow.advance({ x: 1, y: 0, z: 0 });
  const b = [];
  for (let index = 1; index <= 20; ++index) b.push(...fast.advance({ x: index / 20, y: 0, z: 0 }));
  assert.equal(a.length, b.length);
  for (let index = 0; index < a.length; ++index) nearPoint(a[index], b[index], 1e-10);
  assert.throws(() => fast.advance({ x: 100, y: 0, z: 0 }));
  assert.throws(() => fast.advance({ x: NaN, y: 0, z: 0 }));
});

test("dirty dependency halo, tail chunks and reused mesh agree with full remeshing", () => {
  const grid = gridOf(24),
    previous = finishJob(new MeshJob(grid, 0, true, 1, 1));
  const edit = applyBrush(grid, {
    center: { x: 0.72, y: 0, z: 0 },
    radius: 0.3,
    strength: 0.3,
    mode: "add",
  });
  const dirty = dirtyChunks(grid.spec, edit.changed);
  const partial = finishJob(new MeshJob(grid, 0, true, 2, 2, previous, dirty));
  const full = finishJob(new MeshJob(grid, 0, true, 2, 3));
  assert.deepEqual(partial.vertices, full.vertices);
  assert.equal(partial.activeCells, full.activeCells);
  assert.ok(partial.processedChunks < previous.chunks.length);
  assert.ok(partial.reusedChunks > 0);
  for (const chunk of partial.chunks)
    if (!dirty.includes(chunk.id)) assert.equal(chunk, previous.chunks[chunk.id]);
  const ids = new Set();
  for (let id = 0; id < chunksPerAxis(grid.spec) ** 3; ++id)
    for (const cell of cellsOfChunk(grid.spec, id)) {
      assert.ok(!ids.has(cell.id));
      ids.add(cell.id);
    }
  assert.equal(ids.size, grid.spec.cellCount());
  const edge = emptyBox();
  includeSample(edge, 23, 23, 23);
  assert.deepEqual(dirtyChunks(grid.spec, edge), [215]);
  assert.throws(() => dirtyChunks(grid.spec, { low: [-1, 0, 0], high: [0, 0, 0], empty: false }));
});

test("session owner, pause, cancel and reset cannot mutate a replaced grid", () => {
  const session = new SculptSession(12);
  settle(session);
  const brush = { center: { x: 0.65, y: 0, z: 0 }, radius: 0.4, strength: 0.5, mode: "add" };
  const before = session.grid.values.slice();
  assert.ok(session.beginStroke(7, brush));
  assert.equal(session.beginStroke(8, brush), false);
  assert.equal(session.continueStroke(8, { x: 1, y: 0, z: 0 }), false);
  assert.equal(session.finishStroke(8), false);
  session.paused = true;
  assert.equal(session.advance(), false);
  assert.deepEqual(session.grid.values, before);
  session.advance(true);
  assert.notDeepEqual(session.grid.values, before);
  assert.equal(session.cancelStroke(8), false);
  assert.ok(session.cancelStroke(7));
  assert.deepEqual(session.grid.values, before);
  session.paused = false;
  settle(session);
  assert.ok(session.beginStroke(9, brush));
  session.advance();
  session.reset();
  const resetValues = session.grid.values.slice();
  assert.equal(session.continueStroke(9, { x: 1, y: 0, z: 0 }), false);
  settle(session);
  assert.deepEqual(session.grid.values, resetValues);
  assert.equal(session.undoCount, 0);
});

test("stroke commit/undo/redo are byte-exact, bounded to four snapshots and no-op safe", () => {
  const session = new SculptSession(12);
  settle(session);
  const before = session.grid.values.slice();
  const brush = { center: { x: 0.65, y: 0, z: 0 }, radius: 0.4, strength: 0.3, mode: "add" };
  session.beginStroke(1, brush);
  session.finishStroke(1);
  settle(session);
  const after = session.grid.values.slice();
  assert.notDeepEqual(after, before);
  assert.equal(session.undoCount, 1);
  assert.ok(session.undo());
  settle(session);
  assert.deepEqual(session.grid.values, before);
  assert.ok(session.redo());
  settle(session);
  assert.deepEqual(session.grid.values, after);
  const generation = session.requestedGeneration;
  session.beginStroke(2, { ...brush, center: { x: 8, y: 8, z: 8 } });
  session.finishStroke(2);
  settle(session);
  assert.equal(session.requestedGeneration, generation);
  assert.equal(session.undoCount, 1);
  for (let index = 0; index < 6; ++index) {
    session.beginStroke(index + 3, { ...brush, strength: 0.05 });
    session.finishStroke(index + 3);
    settle(session);
  }
  assert.equal(session.undoCount, 4);
});

test("failed/cancelled generations retain last-good; latest isovalue publishes without field writes", () => {
  const session = new SculptSession(12),
    lastGood = settle(session),
    values = session.grid.values.slice();
  session.setCapacity(0);
  while (session.needsWork) session.advance();
  assert.equal(session.job.phase, "failed");
  assert.equal(session.lastGood, lastGood);
  assert.equal(session.current, false);
  session.setCapacity(98304);
  session.setIsovalue(0.1);
  session.advance();
  session.setIsovalue(0.2);
  const wanted = session.requestedGeneration;
  session.cancelRemesh();
  assert.equal(session.lastGood, lastGood);
  assert.equal(session.job.phase, "cancelled");
  session.requestRemesh(true);
  settle(session);
  assert.ok(session.lastGood.generation > wanted);
  assert.equal(session.lastGood.isovalue, 0.2);
  assert.deepEqual(session.grid.values, values);
  const generation = session.requestedGeneration;
  assert.equal(session.setIsovalue(0.2), false);
  assert.equal(session.requestedGeneration, generation);
});

test("resampling preserves world domain and edits, clears incompatible history, but is lossy", () => {
  const session = new SculptSession(24);
  settle(session);
  session.beginStroke(1, {
    center: { x: 0.7, y: 0.05, z: 0 },
    radius: 0.3,
    strength: 0.3,
    mode: "add",
  });
  session.finishStroke(1);
  settle(session);
  const source = session.grid.clone();
  assert.ok(session.changeResolution(12));
  settle(session);
  assert.equal(session.undoCount, 0);
  for (let z = 0; z < 12; ++z)
    for (let y = 0; y < 12; ++y)
      for (let x = 0; x < 12; ++x) {
        const point = session.grid.spec.worldFromGrid({ x, y, z });
        assert.equal(session.grid.at(x, y, z), Math.fround(source.sample(point)));
      }
  assert.ok(session.changeResolution(24));
  settle(session);
  assert.notDeepEqual(session.grid.values, source.values);
  assert.deepEqual(session.grid.spec.origin, source.spec.origin);
  assert.equal(session.grid.spec.extent, source.spec.extent);
  const generation = session.requestedGeneration;
  assert.equal(session.changeResolution(24), false);
  assert.equal(session.requestedGeneration, generation);
  assert.throws(() => session.changeResolution(128));
});

test("RAM archive is immutable and clearly separate from native file IO", () => {
  const session = new SculptSession(12);
  settle(session);
  const values = session.grid.values.slice();
  assert.ok(session.saveSnapshot());
  session.beginStroke(1, {
    center: { x: 0.7, y: 0, z: 0 },
    radius: 0.4,
    strength: 0.3,
    mode: "add",
  });
  session.finishStroke(1);
  settle(session);
  assert.notDeepEqual(session.grid.values, values);
  assert.ok(session.restoreSnapshot());
  settle(session);
  assert.deepEqual(session.grid.values, values);
  assert.equal(session.undoCount, 0);
  session.dispose();
  assert.equal(session.lastGood, null);
  assert.equal(session.job, null);
  assert.equal(session.saved, false);
});

test("drill and bridge demonstrations actually edit stored fields and change topology", () => {
  const session = new SculptSession(24);
  settle(session);
  session.demonstrateProduct("drill");
  const drilled = settle(session);
  assert.ok(session.changedWrites > 0);
  assert.equal(session.undoCount, 1);
  assert.deepEqual(topology(drilled), { euler: 0, components: 1 });
  for (let index = 0; index <= 40; ++index)
    assert.ok(session.grid.sample({ x: 0, y: 0, z: -1 + index / 20 }) > 0);
  session.undo();
  assert.deepEqual(topology(settle(session)), { euler: 2, components: 1 });
  session.redo();
  assert.deepEqual(topology(settle(session)), { euler: 0, components: 1 });
  session.demonstrateProduct("bridge");
  const bridged = settle(session);
  assert.deepEqual(topology(bridged), { euler: 2, components: 1 });
  for (let index = 0; index <= 20; ++index)
    assert.ok(session.grid.sample({ x: -0.55 + index * 0.055, y: 0, z: 0 }) < 0);
  session.undo();
  assert.deepEqual(topology(settle(session)), { euler: 4, components: 2 });
});

test("all lesson modes and slice-axis mappings retain the native UV convention", () => {
  assert.equal(volumeModes.length, 12);
  assert.equal(volumeMode("unknown"), "validation");
  for (const mode of volumeModes) assert.equal(volumeMode(mode), mode);
  const spec = new GridSpec(24),
    state = { axis: "X", layer: 0.3, u: 0.2, v: 0.8 };
  nearPoint(slicePoint(spec, state), { x: -0.6, y: -0.9, z: 0.9 });
  nearPoint(slicePoint(spec, { ...state, axis: "Y" }), { x: 0.9, y: -0.6, z: -0.9 });
  nearPoint(slicePoint(spec, { ...state, axis: "Z" }), { x: -0.9, y: 0.9, z: -0.6 });
  assert.equal(moveProbe(state, -100, 100, 24).u, 0);
  assert.equal(moveProbe(state, -100, 100, 24).v, 1);
  assert.equal(initialView("dirty").chunkBoxes, true);
  near(initialField({ x: 0, y: 0, z: 0 }, "sphere"), -0.82);
});
