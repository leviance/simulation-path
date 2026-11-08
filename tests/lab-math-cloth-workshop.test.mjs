import assert from "node:assert/strict";
import test from "node:test";
import * as m from "../lib/labs/cloth-workshop/math.ts";
import { ClothController } from "../lib/labs/cloth-workshop/controller.ts";
import { projectPoint } from "../lib/labs/cloth-workshop/camera.ts";
const close = (actual, expected, tolerance = 1e-11) =>
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
const vertex = (x, w = 1) => ({
  p: { x, y: 0, z: 0 },
  previous: { x, y: 0, z: 0 },
  rest: { x, y: 0, z: 0 },
  v: { x: 0, y: 0, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  w,
});
const edge = (a = 0, b = 1, rest = 1) => ({ a, b, rest, lambda: 0, kind: "stretch", color: 0 });

test("XPBD independent closed form: unequal masses, compliance, pin and lambda iteration scope", () => {
  const a = vertex(0, 1),
    b = vertex(2, 2),
    c = edge();
  assert.equal(m.solveDistance(a, b, c, 0.1, 1), true);
  close(a.p.x, 1 / 3.1);
  close(b.p.x, 2 - 2 / 3.1);
  close(c.lambda, -1 / 3.1);
  const before = [a.p.x, b.p.x, c.lambda];
  m.solveDistance(a, b, c, 0.1, 1);
  [a.p.x, b.p.x, c.lambda].forEach((value, i) => close(value, before[i]));
  const fixed = vertex(0, 0),
    free = vertex(2),
    pinEdge = edge();
  m.solveDistance(fixed, free, pinEdge, 0, 1 / 120);
  close(fixed.p.x, 0);
  close(free.p.x, 1);
  const rigid = vertex(0),
    rigidB = vertex(2);
  m.solveDistance(rigid, rigidB, edge(), 0, 1 / 120);
  close(rigid.p.x, 0.5);
  close(rigidB.p.x, 1.5);
});
test("XPBD two-edge fixture matches independently written scalar Gauss-Seidel", () => {
  const vertices = [vertex(0, 0), vertex(2, 1), vertex(4, 2)],
    edges = [edge(0, 1), edge(1, 2)],
    p = [0, 2, 4],
    w = [0, 1, 2],
    lambdas = [0, 0],
    alpha = 0.2;
  for (let iteration = 0; iteration < 4; iteration++)
    for (let i = 0; i < 2; i++) {
      const delta = -(p[i + 1] - p[i] - 1 + alpha * lambdas[i]) / (w[i] + w[i + 1] + alpha);
      p[i] -= w[i] * delta;
      p[i + 1] += w[i + 1] * delta;
      lambdas[i] += delta;
      m.solveDistance(vertices[i], vertices[i + 1], edges[i], 0.2, 1);
    }
  vertices.forEach((v, i) => close(v.p.x, p[i]));
  edges.forEach((e, i) => close(e.lambda, lambdas[i]));
});
test("zero separation is finite and bad XPBD input is rejected before mutation", () => {
  const a = vertex(0),
    b = vertex(0),
    c = edge();
  m.solveDistance(a, b, c, 0, 1 / 120);
  close(m.length(m.sub(a.p, b.p)), 1);
  for (const h of [0, -1, NaN, Infinity]) {
    const x = vertex(0),
      y = vertex(2),
      constraint = edge();
    assert.equal(m.solveDistance(x, y, constraint, 0, h), false);
    close(x.p.x, 0);
    close(y.p.x, 2);
    close(constraint.lambda, 0);
  }
  assert.equal(m.solveDistance(vertex(0, -1), vertex(2), edge(), 0, 1), false);
  assert.equal(m.solveDistance(vertex(0), vertex(2), edge(), NaN, 1), false);
});
test("compliance scales with h² and finite iteration count leaves a measurable residual", () => {
  const soft = vertex(0),
    softB = vertex(2);
  m.solveDistance(soft, softB, edge(), 0.1, 0.5);
  // alpha=0.1/0.25=0.4, correction=1/(2+0.4), no numerical integrator involved.
  close(soft.p.x, 1 / 2.4);
  close(softB.p.x, 2 - 1 / 2.4);
  const chain = (iterations) => {
    const vertices = [vertex(0, 0), vertex(2), vertex(4)],
      constraints = [edge(0, 1), edge(1, 2)];
    for (let i = 0; i < iterations; i++)
      for (const c of constraints) m.solveDistance(vertices[c.a], vertices[c.b], c, 0, 1 / 120);
    return Math.max(Math.abs(vertices[1].p.x - 1), Math.abs(vertices[2].p.x - vertices[1].p.x - 1));
  };
  close(chain(1), 1);
  assert.ok(chain(8) < chain(1) / 100);
});
test("topology has full triangles, stretch/shear/bend-distance and disjoint edge colors", () => {
  for (const side of [3, 17, 25]) {
    const mesh = m.makeMesh(side);
    assert.equal(mesh.vertices.length, side * side);
    assert.equal(mesh.triangles.length, 2 * (side - 1) ** 2);
    assert.equal(
      mesh.constraints.filter((c) => c.kind === "stretch").length,
      2 * side * (side - 1),
    );
    assert.equal(mesh.constraints.filter((c) => c.kind === "shear").length, 2 * (side - 1) ** 2);
    assert.equal(mesh.constraints.filter((c) => c.kind === "bend").length, 2 * side * (side - 2));
    const all = new Set();
    for (const color of mesh.colors) {
      const used = new Set();
      for (const id of color) {
        const c = mesh.constraints[id];
        assert.ok(!used.has(c.a) && !used.has(c.b));
        used.add(c.a);
        used.add(c.b);
        all.add(id);
      }
    }
    assert.equal(all.size, mesh.constraints.length);
    assert.equal(mesh.vertices.filter((v) => v.w === 0).length, 2);
  }
  assert.throws(() => m.makeMesh(100));
});
test("analytic sphere/capsule/plane contact agrees with independent geometric fixtures", () => {
  const center = { x: 1, y: 2, z: 3 };
  const sphere = m.sphereContact({ x: 1.3, y: 2.4, z: 3 }, center, 1, 0.1);
  close(sphere.penetration, 0.6);
  close(sphere.normal.x, 0.6);
  close(sphere.normal.y, 0.8);
  const cap = m.capsuleContact(
    { x: 0, y: 0.3, z: 0.4 },
    { x: -1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    0.75,
    0.05,
  );
  close(cap.penetration, 0.3);
  close(cap.normal.y, 0.6);
  close(cap.normal.z, 0.8);
  const endpoint = m.capsuleContact(
    { x: 2, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    0.75,
    0.05,
  );
  close(endpoint.penetration, 0);
  const plane = m.obstacleContacts({ x: 0, y: -0.3, z: 0 }, m.defaultSettings(), "hanging")[0];
  close(plane.penetration, 0.325);
  assert.deepEqual(plane.normal, { x: 0, y: 1, z: 0 });
  assert.ok(m.finite(m.sphereContact(center, center, 1, 0.1).normal));
});
test("3D CSR partitions every ID, including negative, empty, dense and coincident cells", () => {
  const positions = [
    { x: -0.1, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0.999999, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 100, y: -100, z: 5 },
  ];
  const grid = m.buildGrid(positions, 1);
  assert.deepEqual(grid.coordinates, [
    [-1, 0, 0],
    [0, 0, 0],
    [1, 0, 0],
    [100, -100, 5],
  ]);
  assert.deepEqual(grid.counts, [1, 2, 2, 1]);
  assert.deepEqual(grid.offsets, [0, 1, 3, 5, 6]);
  assert.deepEqual(
    [...grid.ids].sort((a, b) => a - b),
    [0, 1, 2, 3, 4, 5],
  );
  grid.ids.forEach((id, slot) => {
    const cell = grid.vertexCells[id];
    assert.ok(slot >= grid.offsets[cell] && slot < grid.offsets[cell + 1]);
  });
  assert.equal(m.buildGrid([], 1).offsets[0], 0);
  assert.throws(() => m.buildGrid([{ x: NaN, y: 0, z: 0 }], 1));
  assert.throws(() => m.buildGrid([], 0));
});
test("27-cell candidate predicate matches independent all-pairs oracle and excludes topology", () => {
  const side = 7,
    thickness = 0.15,
    positions = Array.from({ length: side * side }, (_, i) => ({
      x: (((i * 17) % 19) - 9) * 0.1,
      y: (((i * 13) % 11) - 5) * 0.1,
      z: (((i * 7) % 13) - 6) * 0.1,
    }));
  positions[48] = { ...positions[0] };
  positions[47] = { x: positions[0].x + 0.3, y: positions[0].y, z: positions[0].z };
  const grid = m.buildGrid(positions, 2 * thickness),
    candidates = m.candidatePairs(grid, side),
    actual = m
      .contactPairs(positions, candidates, thickness)
      .map(([a, b]) => `${a}:${b}`)
      .sort(),
    expected = [];
  for (let a = 0; a < positions.length; a++)
    for (let b = a + 1; b < positions.length; b++) {
      const topological =
        Math.abs((a % side) - (b % side)) <= 2 &&
        Math.abs(Math.floor(a / side) - Math.floor(b / side)) <= 2;
      const dx = positions[a].x - positions[b].x,
        dy = positions[a].y - positions[b].y,
        dz = positions[a].z - positions[b].z;
      if (!topological && dx * dx + dy * dy + dz * dz < 0.3 ** 2) expected.push(`${a}:${b}`);
    }
  assert.deepEqual(actual, expected.sort());
  assert.equal(new Set(candidates.map(([a, b]) => `${a}:${b}`)).size, candidates.length);
  assert.ok(actual.includes("0:48"));
});
test("finite cloth stepping keeps pins exact, bounds and obstacle penetration, recomputes unit normals", () => {
  for (const preset of ["hanging", "drape", "drop"]) {
    const mesh = m.makeMesh(9, preset),
      settings = { ...m.defaultSettings(), iterations: 4 },
      pinned = mesh.vertices.filter((v) => v.w === 0).map((v) => [v, { ...v.p }]);
    for (let i = 0; i < 80; i++) {
      const diagnostics = m.stepMesh(mesh, settings, preset);
      assert.ok(diagnostics.penetration <= 1e-9);
      assert.ok(Number.isFinite(diagnostics.residual));
    }
    pinned.forEach(([v, p]) => assert.deepEqual(v.p, p));
    mesh.vertices.forEach((v) => {
      assert.ok(m.finite(v.p) && m.finite(v.v));
      close(m.length(v.normal), 1, 1e-9);
      assert.ok(v.p.x >= -5 && v.p.x <= 5 && v.p.y >= 0 && v.p.y <= 8 && Math.abs(v.p.z) <= 5);
    });
    assert.throws(() => m.stepMesh(mesh, { ...settings, iterations: Infinity }, preset));
  }
});
test("plane triangle normal agrees with independent cross product, including a degenerate triangle", () => {
  const mesh = m.makeMesh(3, "drape");
  mesh.vertices.forEach((v) => {
    v.p.y = 2;
  });
  m.updateNormals(mesh);
  mesh.vertices.forEach((v) => {
    close(v.normal.x, 0);
    close(v.normal.y, 1);
    close(v.normal.z, 0);
  });
  mesh.vertices.forEach((v) => {
    v.p = { x: 0, y: 0, z: 0 };
  });
  m.updateNormals(mesh);
  mesh.vertices.forEach((v) => assert.deepEqual(v.normal, { x: 0, y: 1, z: 0 }));
});
test("controller lifecycle, stable snapshot, pointer ownership, drag/reset and paused input semantics", () => {
  const c = new ClothController("interaction");
  assert.equal(c.getSnapshot(), c.getSnapshot());
  assert.equal(c.beginPointer(1, true, 0, 20, 20, 760, 620), false);
  c.mount();
  const initial = c.getSnapshot().mesh.vertices[144].p.y;
  c.tick(1, 0);
  close(c.getSnapshot().seconds, 0);
  c.togglePin(144);
  assert.equal(c.getSnapshot().mesh.vertices[144].w, 0);
  c.step();
  close(c.getSnapshot().mesh.vertices[144].p.y, initial);
  c.togglePin(144);
  c.setTool("drag");
  const state = c.getSnapshot(),
    p = projectPoint(state.mesh.vertices[144].p, state.camera, 760, 620);
  assert.equal(c.beginPointer(3, true, 0, p.x, p.y, 760, 620), true);
  assert.equal(c.beginPointer(4, true, 0, p.x, p.y, 760, 620), false);
  c.endPointer(999);
  assert.equal(c.getSnapshot().pointer, 3);
  const before = { ...c.getSnapshot().mesh.vertices[144].p };
  c.movePointer(3, p.x + 80, p.y - 40);
  assert.deepEqual(c.getSnapshot().mesh.vertices[144].p, before);
  assert.ok(c.getSnapshot().drag);
  c.startValidation(100);
  assert.equal(c.getSnapshot().pointer, null);
  c.reset("drape", 25);
  assert.equal(c.getSnapshot().mesh.vertices.length, 625);
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  assert.equal(c.getSnapshot().drag, null);
  c.dispose();
  assert.equal(c.getSnapshot().ready, false);
  assert.equal(c.getSnapshot().paused, true);
});
test("controller finite validation is cancellable/deadlined and never asserts GPU scale", () => {
  const c = new ClothController("validation");
  c.mount();
  c.startValidation(100);
  for (let i = 0; i < 12; i++) c.tick(0, 116 + i * 16);
  assert.equal(c.getSnapshot().validation.status, "passed");
  assert.match(c.getSnapshot().validation.message, /Không đo\/kiểm GPU/);
  c.startValidation(0);
  c.tick(0, 5001);
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  c.startValidation(0);
  c.cancelValidation();
  assert.equal(c.getSnapshot().validation.status, "cancelled");
  c.setSetting("obstacleX", 1);
  close(c.getSnapshot().settings.obstacleX, 0);
  c.step();
  assert.ok(c.getSnapshot().settings.obstacleX <= 0.5 / 60 + 1e-12);
  c.dispose();
});
