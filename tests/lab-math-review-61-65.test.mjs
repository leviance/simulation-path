import assert from "node:assert/strict";
import test from "node:test";
import { componentCallback, componentEffect, canvasCallback } from "./lab-handler-support.mjs";
import * as greedy from "../lib/labs/voxel-greedy-meshing.ts";
import * as stream from "../lib/labs/voxel-chunk-streaming.ts";
import * as terrain from "../lib/labs/voxel-procedural-terrain.ts";
import * as sandbox from "../lib/labs/voxel-sandbox.ts";
import * as controls from "../lib/labs/simulator-controls.ts";
import { verifyTriangles } from "../lib/labs/voxel-chunk-streaming/mesh-audit.ts";
import * as field from "../lib/labs/voxel-expedition/field.ts";
const fieldLab = "voxel-expedition/field-lab.tsx";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("review63: a missing render buffer still fails the retained geometry audit", () => {
  const state = terrain.createTerrain();
  state.world.chunks.get("0,0").mesh.length = 0;
  assert.ok(stream.verifySurface(state.world) > 0);
  assert.throws(() => verifyTriangles(state.world), /triangle count/);
});

test("review64: every field frame passes its exact clock, position, overlays and wind to the renderer", async () => {
  let seen;
  const view = { yaw: 0.7, pitch: -0.4 },
    streamState = { x: 40, z: -32 };
  const ctx = {},
    rects = [],
    bank = {};
  const effect = await componentEffect(fieldLab, "drawField(", {
    canvas: { current: { getContext: () => ctx } },
    geometry: { rects },
    bank,
    id: 64,
    stage: 4,
    clock: 3.5,
    wind: 2,
    angle: 0.7,
    sceneHour: 17,
    mark: 4,
    clouds: false,
    snow: true,
    wire: false,
    probe: true,
    view,
    stream: streamState,
    drawField(...args) {
      seen = args;
    },
  });
  effect();
  assert.deepEqual(seen, [
    ctx,
    {
      id: 64,
      stage: 4,
      rects,
      time: 3.5,
      wind: 2,
      angle: 0.7,
      hour: 17,
      mark: 4,
      clouds: false,
      snow: true,
      wire: false,
      probe: true,
      view,
      stream: streamState,
    },
    bank,
  ]);
});

test("review65: actual Canvas down callback does not enable scene clicks before lesson 06", async () => {
  for (let stage = 1; stage <= 7; stage++) {
    const model = { current: controls.createModel() },
      ui = { current: controls.createUi() };
    const down = await componentCallback("simulator-controls-lab.tsx", "down", {
      stage,
      model,
      ui,
      pointer: { current: null },
      point: () => ({ x: 320, y: 250 }),
      pointerDown: controls.pointerDown,
      scenePointerDown: controls.scenePointerDown,
      publish() {},
    });
    down({ button: 0, pointerId: 11, preventDefault() {}, currentTarget: { focus() {} } });
    assert.equal(model.current.scenePresses, stage >= 6 ? 1 : 0);
  }
});

test("review61: the Canvas preset produces exactly the worked 4x4 mask", () => {
  const mask = greedy.makeMask(greedy.makeChunk(8), 2, 16, 15);
  const expected = new Uint8Array(256);
  [
    [3, 3, 1, 0],
    [3, 3, 1, 0],
    [3, 0, 1, 1],
    [0, 0, 0, 1],
  ].forEach((row, v) =>
    row.forEach((value, u) => {
      expected[v * 16 + u] = value;
    }),
  );
  assert.deepEqual(mask, expected);
  assert.equal(greedy.rectangles(mask, 2, 16).length, 4);
});

test("review62: batch trace is bounded, preserves priority at execution and records cancelled keys", () => {
  const w = stream.createWorld();
  const first = structuredClone(w.pending.slice(0, 2));
  stream.pump(w);
  assert.deepEqual(w.batches[0], { tick: 1, jobs: first });
  assert.notEqual(w.batches[0].jobs[0].key, first[0].key);
  const old = structuredClone(w.pending);
  stream.movePlayer(w, 200, -200);
  assert.deepEqual(w.cancelledJobs, old);
  const before = structuredClone(w.batches[0]);
  stream.pump(w);
  assert.deepEqual(w.batches[0], before);
  for (let i = 0; i < 20; i++) stream.pump(w);
  assert.equal(w.batches.length, 8);
  assert.ok(w.batches.every((b) => b.jobs.length <= 2));
  assert.ok(w.cancelledJobs.length <= 74);
});

test("review63: hash-only and interpolated stages use the same lattice scale", () => {
  const config = { ...terrain.defaultConfig, stage: 3 };
  for (const x of [-33, -32, -1, 0, 31, 32])
    near(
      terrain.terrainSignal(x, 0, config),
      terrain.latticeValue(Math.floor(x / config.scale), 0, config.seed),
    );
});

test("review63/64: triangle audit catches missing, duplicate, moved, reversed and recolored geometry", () => {
  for (const create of [terrain.createTerrain, sandbox.createSandbox]) {
    const s = create();
    const entry = s.world.chunks.get("0,0");
    assert.equal(verifyTriangles(s.world), entry.mesh.length);
    const original = structuredClone(entry.mesh);
    for (const mutate of [
      (m) => m.splice(0, 1),
      (m) => {
        m[0] = structuredClone(m[1]);
      },
      (m) => {
        m[0].points[0][0] += 1;
      },
      (m) => {
        m[0].points.reverse();
      },
      (m) => {
        m[0].color[0] += 1;
      },
      (m) => {
        m[0].points[0][0] = NaN;
      },
    ]) {
      entry.mesh = structuredClone(original);
      mutate(entry.mesh);
      assert.equal(stream.verifySurface(s.world), 874);
      assert.throws(() => verifyTriangles(s.world), /triangle/);
    }
    entry.mesh = original;
  }
});

test("review64: rendered foreground and edited block agree at the formerly failing camera angle", () => {
  const s = sandbox.createSandbox();
  stream.drain(s.world);
  stream.movePlayer(s.world, 24, 8);
  stream.drain(s.world);
  sandbox.writeCell(s, [-10, 15, -5], 3);
  sandbox.flushEdits(s);
  const camera = { ...stream.streamingCamera, scale: 2, yaw: -2.1, pitch: 0.65, zoom: 1 };
  const volume = sandbox.cameraVolume(s.world, camera);
  const image = stream.raster(stream.sceneMesh(s.world), camera, true, volume);
  const ray = sandbox.cameraRay(camera, s.world.player, 171, 149, volume.near);
  const hit = sandbox.traceWorld(s.world, ray).hit;
  assert.deepEqual(hit.cell, [-10, 15, -5]);
  assert.ok(Math.abs(hit.distance - (volume.near - image.depth[149 * 320 + 171])) < 1e-9);
  assert.equal(sandbox.editRay(s, ray, false), true);
  assert.equal(sandbox.residentBlock(s.world, [-10, 15, -5]), 0);
  assert.notEqual(sandbox.residentBlock(s.world, [4, 3, 3]), 0);
  for (const depth of image.depth)
    assert.ok(depth === -Infinity || (depth > volume.far && depth <= volume.near));
});

test("review64: retained chunks after teleport remain behind the near plane and ray bounds stay finite", () => {
  const s = sandbox.createSandbox();
  stream.drain(s.world);
  stream.movePlayer(s.world, 512, -512);
  for (const yaw of [-Math.PI, -2.1, 0, 0.7, Math.PI])
    for (const pitch of [-1.2, 0, 1.2]) {
      const camera = { ...stream.streamingCamera, scale: 2, yaw, pitch, zoom: 0.5 };
      const volume = sandbox.cameraVolume(s.world, camera);
      assert.ok(volume.near >= 64 && volume.near <= 3072);
      assert.equal(volume.near - volume.far, 96);
      for (const e of s.world.chunks.values())
        for (const x of [0, 16])
          for (const y of [0, 16])
            for (const z of [0, 16])
              assert.ok(
                stream.project(
                  [
                    e.key.x * 16 - s.world.player.x + 8 + x,
                    y,
                    e.key.z * 16 - s.world.player.z + 8 + z,
                  ],
                  camera,
                ).depth < volume.near,
              );
      for (const [x, y] of [
        [0, 0],
        [319, 239],
      ])
        assert.ok(
          sandbox
            .cameraRay(camera, s.world.player, x, y, volume.near)
            .origin.every(Number.isFinite),
        );
    }
  assert.throws(() =>
    sandbox.cameraRay({ ...stream.streamingCamera, scale: 2 }, s.world.player, 0, 0, NaN),
  );
});

test("review65: each lesson enables only its checkpoint's input and final remains the default pure API", () => {
  for (let stage = 1; stage <= 7; stage++) {
    const m = controls.createModel(),
      u = controls.createUi();
    const button = { x: 800, y: 100 },
      slider = { x: 912 - 1, y: 252 };
    controls.pointerDown(m, u, button, stage);
    controls.pointerUp(m, u, button, stage);
    assert.equal(m.paused, stage < 3);
    controls.pointerDown(m, u, slider, stage);
    controls.pointerUp(m, u, slider, stage);
    assert.equal(m.gravity === 480, stage < 4);
    controls.cancelPointer(u);
    u.focus = "None";
    assert.equal(controls.keyDown(m, u, "Tab", false, false, stage), stage >= 5);
    assert.equal(u.focus, stage >= 5 ? "Pause" : "None");
  }
});

test("review61: field playback never catches up an entire stall, stops at its deadline and respects reduced motion", async () => {
  let now = 1000,
    timer = null,
    stopped = false,
    releases = 0;
  const samples = [],
    listeners = new Map();
  const target = {
    addEventListener: (k, v) => listeners.set(k, v),
    removeEventListener: (k) => listeners.delete(k),
  };
  const env = {
    running: true,
    reduced: false,
    performance: { now: () => now },
    window: target,
    document: { ...target, hidden: false },
    setRunning(value) {
      stopped = !value;
    },
    setInterval(fn) {
      timer = fn;
      return 7;
    },
    clearInterval(id) {
      assert.equal(id, 7);
      releases++;
    },
    tick(dt) {
      samples.push(dt);
    },
  };
  const effect = await componentEffect(fieldLab, "const end = last", env);
  const dispose = effect();
  now += 100;
  timer();
  now += 4000;
  timer();
  assert.deepEqual(samples, [0.1, 0.16]);
  now = 21000;
  timer();
  assert.equal(stopped, true);
  assert.equal(samples.length, 2);
  dispose();
  assert.equal(releases, 1);
  assert.equal(listeners.size, 0);
  timer = null;
  (await componentEffect(fieldLab, "const end = last", { ...env, reduced: true }))();
  assert.equal(timer, null);
});

test("review61: the 4x4 teaching mask has four rectangles and explains both rejection cells", () => {
  const mask = new Uint8Array(256),
    rows = [
      [3, 3, 1, 0],
      [3, 3, 1, 0],
      [3, 0, 1, 1],
      [0, 0, 0, 1],
    ];
  rows.forEach((row, v) => row.forEach((m, u) => (mask[v * 16 + u] = m)));
  const before = mask.slice(),
    rects = greedy.rectangles(mask, 2, 16);
  assert.deepEqual(
    rects.map((r) => [r.u, r.v, r.width, r.height, r.material]),
    [
      [0, 0, 2, 2, 3],
      [2, 0, 1, 3, 1],
      [0, 2, 1, 1, 3],
      [3, 2, 1, 2, 1],
    ],
  );
  const why = greedy.explainRectangle(mask, rects, 0);
  assert.deepEqual(why.width.cell, { u: 2, v: 0 });
  assert.deepEqual(why.height.cell, { u: 1, v: 2 });
  assert.match(why.width.reason, /material=1/);
  assert.match(why.height.reason, /không có mặt/);
  assert.deepEqual(mask, before);
  assert.equal(greedy.explainRectangle(mask, rects, -1), null);
  const full = greedy.explainRectangle(
    new Uint8Array(256).fill(3),
    greedy.rectangles(new Uint8Array(256).fill(3), 2, 16),
    0,
  );
  assert.equal(full.width.cell, null);
  assert.equal(full.height.cell, null);
});

test("review62: moving the actual field queue keeps nearby loaded chunks and cancels work that is no longer wanted", async () => {
  let current = field.pump(field.planStream(undefined, 0, 0), 3);
  const initial = [...current.resident],
    previous = current.wanted.slice();
  const move = await componentCallback(fieldLab, "move", {
    id: 62,
    planStream: field.planStream,
    clamp: field.clamp,
    setStream(next) {
      current = next(current);
    },
  });
  move(1, 0);
  assert.ok(initial.every((key) => current.resident.has(key)));
  assert.notDeepEqual(current.wanted, previous);
  const before = current.resident.size;
  current = field.pump(current, 2);
  assert.equal(current.resident.size, before + 2);
  move(20, -20);
  assert.equal(current.resident.size, 0);
  assert.equal(current.unloaded, before + 2);
  assert.equal(current.wanted[0], "21,-20");
  assert.ok(previous.every((key) => !current.wanted.includes(key)));
});

for (const attribute of ["onPointerUp", "onPointerCancel", "onLostPointerCapture"]) {
  test("field diagrams: " + attribute + " can end only the owner's gesture", async () => {
    const pointer = { current: null },
      calls = [];
    let captured;
    const target = {
      focus() {
        calls.push("focus");
      },
      setPointerCapture(id) {
        captured = id;
      },
      hasPointerCapture(id) {
        return captured === id;
      },
      releasePointerCapture(id) {
        calls.push(id);
        captured = null;
      },
    };
    const down = await canvasCallback(fieldLab, "onPointerDown", { pointer });
    const input = (id) => ({
      button: 0,
      pointerId: id,
      clientX: 2,
      clientY: 3,
      currentTarget: target,
    });
    down({ ...input(30), button: 2 });
    assert.equal(pointer.current, null);
    down(input(11));
    down(input(22));
    assert.equal(pointer.current.id, 11);
    const finishDrag = await componentCallback(fieldLab, "finishDrag", { pointer });
    const stop = await canvasCallback(fieldLab, attribute, { finishDrag });
    stop(input(22));
    assert.equal(pointer.current.id, 11);
    stop(input(11));
    stop(input(11));
    assert.equal(pointer.current, null);
    assert.deepEqual(calls, ["focus", 11]);
  });
}

test("review63: interpolation corners, negative coordinate fixture and linear/smooth weights match the lesson", () => {
  const probe = terrain.interpolationCell(-1, 0, 0.75, 0.5, 42);
  near(probe.n, -0.27946993972686357);
  near(probe.n, terrain.valueNoise(-0.25, 0.5, 42));
  for (const [tx, tz, corner] of [
    [0, 0, "v00"],
    [1, 0, "v10"],
    [0, 1, "v01"],
    [1, 1, "v11"],
  ]) {
    const p = terrain.interpolationCell(-1, 0, tx, tz, 42);
    near(p.n, p[corner]);
  }
  const linear = terrain.interpolationCell(-1, 0, 0.25, 0.5, 42, false),
    smooth = terrain.interpolationCell(-1, 0, 0.25, 0.5, 42, true);
  near(linear.sx, 0.25);
  near(smooth.sx, 0.15625);
  assert.notEqual(linear.n, smooth.n);
  assert.throws(() => terrain.interpolationCell(-1, 0, NaN, 0.5, 42));
  assert.throws(() => terrain.interpolationCell(3, 0, 0.5, 0.5, 42));
});

test("review64: an audit result is valid only for the terrain revision it checked", () => {
  const state = sandbox.createSandbox();
  const stamp = (revision) => ({ revision, message: "PASS " + stream.verifySurface(state.world) });
  const before = stamp(0);
  assert.match(sandbox.auditLabel(before, 0), /PASS.*874/);
  stream.pump(state.world);
  assert.match(sandbox.auditLabel(before, 1), /Cần kiểm lại/);
  assert.match(sandbox.auditLabel(stamp(1), 1), /PASS.*2494/);
});

test("review65: pointerup commits the final slider position, while cancel never invents a final sample", () => {
  const model = controls.createModel(),
    ui = controls.createUi();
  controls.pointerDown(model, ui, { x: 800, y: 252 });
  controls.pointerUp(model, ui, { x: 1200, y: 252 });
  assert.equal(model.gravity, 1200);
  assert.equal(ui.active, "None");
  controls.pointerDown(model, ui, { x: 800, y: 252 });
  controls.pointerUp(model, ui, { x: -100, y: 252 });
  assert.equal(model.gravity, 0);
  controls.pointerDown(model, ui, { x: 800, y: 252 });
  controls.cancelPointer(ui);
  controls.pointerUp(model, ui, { x: 1200, y: 252 });
  assert.equal(model.gravity, 600);
});

test("review62: lesson tables reflect actual job order, resident and rebuilt meshes at each checkpoint", () => {
  for (const [stage, expected] of [
    [
      5,
      [
        [9, 6, 0, 0],
        [7, 4, 2, 7],
        [7, 2, 2, 7],
        [9, 0, 2, 9],
      ],
    ],
    [
      6,
      [
        [9, 3, 0, 0],
        [11, 1, 2, 11],
        [12, 0, 1, 12],
      ],
    ],
  ]) {
    const w = stream.createWorld(stage);
    stream.drain(w);
    stream.movePlayer(w, 24, 8);
    const actual = [[w.chunks.size, w.pending.length, 0, 0]];
    for (let tick = 1; tick < expected.length; tick++) {
      stream.pump(w);
      actual.push([w.chunks.size, w.pending.length, w.lastJobs, w.lastMeshes]);
    }
    assert.deepEqual(actual, expected);
    stream.movePlayer(w, 8, 8);
    assert.equal(w.pending.length, stage === 6 ? 0 : 6);
    assert.equal(w.loads, 12);
  }
});

test("review64: worked DDA crosses negative-to-zero chunk boundary, Unknown stops without generation", () => {
  const state = sandbox.createSandbox();
  stream.drain(state.world);
  for (const e of state.world.chunks.values()) e.blocks.fill(0);
  state.world.chunks.get("0,0").blocks[16 * 16 * 2] = 3;
  const ray = sandbox.makeRay([-1.5, 2.5, 0.5], [1, 0, 0]);
  const trace = sandbox.traceWorld(state.world, ray);
  assert.deepEqual(trace.path, [
    [-2, 2, 0],
    [-1, 2, 0],
    [0, 2, 0],
  ]);
  assert.deepEqual(trace.hit, { cell: [0, 2, 0], normal: [-1, 0, 0], distance: 1.5 });
  state.world.chunks.delete("0,0");
  const before = state.world.chunks.size;
  const unknown = sandbox.traceWorld(state.world, ray);
  assert.equal(unknown.blocked, true);
  assert.equal(unknown.hit, null);
  assert.deepEqual(unknown.path, trace.path);
  assert.equal(state.world.chunks.size, before);
});
