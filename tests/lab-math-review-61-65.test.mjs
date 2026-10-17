import assert from "node:assert/strict";
import test from "node:test";
import { componentCallback, componentEffect, canvasCallback } from "./lab-handler-support.mjs";
import * as greedy from "../lib/labs/voxel-greedy-meshing.ts";
import * as stream from "../lib/labs/voxel-chunk-streaming.ts";
import * as terrain from "../lib/labs/voxel-procedural-terrain.ts";
import * as sandbox from "../lib/labs/voxel-sandbox.ts";
import * as controls from "../lib/labs/simulator-controls.ts";
import { verifyTriangles } from "../lib/labs/voxel-chunk-streaming/mesh-audit.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("review63: the actual Canvas audit rejects a missing render buffer even when quads still pass", async () => {
  const state = terrain.createTerrain();
  state.world.chunks.get("0,0").mesh.length = 0;
  let message = "";
  const audit = await componentCallback("voxel-procedural-terrain-lab.tsx", "audit", {
    state,
    stop() {},
    verifySchedule: stream.verifySchedule,
    verifySurface: stream.verifySurface,
    verifyColumns: terrain.verifyColumns,
    verifyTriangles,
    setMessage(value) {
      message = value;
    },
  });
  audit();
  assert.match(message, /FAIL.*triangle count/);
});

test("review64: actual frame/pick callbacks share the adaptive near/far rather than camera defaults", async () => {
  const state = sandbox.createSandbox();
  stream.drain(state.world);
  stream.movePlayer(state.world, 512, -512);
  const camera = { ...stream.streamingCamera, scale: 2, yaw: -0.7 };
  const volume = sandbox.cameraVolume(state.world, camera);
  assert.ok(volume.near > 64);
  const env = {
    state,
    camera,
    aim: { x: 171, y: 149 },
    stage: 3,
    cached: { current: null },
    pickDirty: { current: true },
    rasters: { current: 0 },
    queries: { current: 0 },
    cameraVolume: sandbox.cameraVolume,
    flushEdits: sandbox.flushEdits,
    sceneMesh: stream.sceneMesh,
    raster(mesh, cam, useDepth, range) {
      assert.deepEqual(range, volume);
      return stream.raster(mesh, cam, useDepth, range);
    },
    cameraRay(cam, player, x, y, nearDepth) {
      assert.equal(nearDepth, volume.near);
      return sandbox.cameraRay(cam, player, x, y, nearDepth);
    },
    traceWorld: sandbox.traceWorld,
    setView() {},
  };
  const effect = await componentEffect("voxel-sandbox-lab.tsx", "flushEdits(state)", env);
  effect();
  assert.equal(env.rasters.current, 1);
  assert.equal(env.queries.current, 1);
  const action = await componentCallback("voxel-sandbox-lab.tsx", "action", {
    ...env,
    material: 1,
    stop() {},
    setMessage() {},
    publish() {},
    editRay(s, ray) {
      assert.deepEqual(ray, sandbox.cameraRay(camera, state.world.player, 171, 149, volume.near));
      return false;
    },
  });
  action(false);
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

test("review61: actual playback waits 150ms, pause/resume starts a fresh clock and stalls do not catch up", async () => {
  const frames = [];
  let shown = 0;
  const effect = await componentEffect("voxel-greedy-meshing-lab.tsx", "playbackDue", {
    paused: false,
    reduced: false,
    stage: 7,
    rects: Array(4),
    createPlaybackClock: greedy.createPlaybackClock,
    playbackDue: greedy.playbackDue,
    requestAnimationFrame(fn) {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame() {},
    setShown(update) {
      shown = update(shown);
    },
  });
  effect();
  for (const now of [1000, 1100, 1149]) {
    frames.shift()(now);
    assert.equal(shown, 0);
  }
  frames.shift()(1150);
  assert.equal(shown, 1);
  const clock = greedy.createPlaybackClock();
  assert.equal(greedy.playbackDue(clock, 5000), false);
  assert.equal(greedy.playbackDue(clock, 50000), false);
  assert.equal(greedy.playbackDue(clock, 50050), true);
  assert.equal(greedy.playbackDue(clock, NaN), false);
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

test("review62: actual position preset retains radius, budget, resident buffers and cumulative counters", async () => {
  const world = stream.createWorld();
  stream.drain(world);
  stream.settings(world, 2, 1);
  stream.pump(world);
  const before = {
    loads: world.loads,
    chunks: world.chunks,
    count: world.chunks.size,
    ticks: world.ticks,
    cancelled: world.cancelled,
  };
  const choose = await componentCallback("voxel-chunk-streaming-lab.tsx", "choose", {
    world,
    presets: stream.presets,
    movePlayer: stream.movePlayer,
    centerOf: stream.centerOf,
    stop() {},
    setPreset() {},
    setSelected() {},
    publish() {},
    createWorld() {
      throw Error("Preset must not create a new World");
    },
  });
  choose(2);
  assert.equal(world.radius, 2);
  assert.equal(world.budget, 1);
  assert.equal(world.loads, before.loads);
  assert.equal(world.chunks, before.chunks);
  assert.equal(world.chunks.size, before.count);
  assert.equal(world.ticks, before.ticks);
  assert.equal(world.player.x, 200);
  assert.equal(world.player.z, -200);
  assert.ok(world.cancelled > before.cancelled);
  stream.pump(world);
  assert.equal(world.lastBudget, 1);
  assert.equal(world.lastJobs, 1);
});

for (const file of [
  "voxel-greedy-meshing-lab.tsx",
  "voxel-chunk-streaming-lab.tsx",
  "voxel-procedural-terrain-lab.tsx",
  "voxel-sandbox-lab.tsx",
]) {
  test(`review63/64: ${file} ignores a second pointer and unrelated up/cancel/lost-capture`, async () => {
    const pointer = { current: { id: 11 } },
      calls = [];
    const env = {
      pointer,
      release() {
        calls.push("release");
        pointer.current = null;
      },
      stop() {
        throw Error("Second down stole gesture");
      },
    };
    if (file === "voxel-greedy-meshing-lab.tsx" || file === "voxel-chunk-streaming-lab.tsx")
      env.down = await componentCallback(file, "down", env);
    const down = await canvasCallback(file, "onPointerDown", env);
    down({ button: 0, pointerId: 22 });
    for (const attribute of ["onPointerUp", "onPointerCancel", "onLostPointerCapture"]) {
      const handler = await canvasCallback(file, attribute, env);
      handler({ pointerId: 22 });
      assert.equal(pointer.current.id, 11);
    }
    const up = await canvasCallback(file, "onPointerUp", env);
    up({ pointerId: 11 });
    assert.equal(pointer.current, null);
    assert.deepEqual(calls, ["release"]);
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

test("review64: actual audit and tick callbacks cannot keep a PASS label after topology changes", async () => {
  const state = sandbox.createSandbox(),
    topologyRevision = { current: 0 },
    pickDirty = { current: false };
  let result = null;
  const env = {
    state,
    topologyRevision,
    pickDirty,
    setVersion() {},
    setPaused() {},
    stop() {},
    flushEdits: sandbox.flushEdits,
    verifySchedule: stream.verifySchedule,
    verifySurface: stream.verifySurface,
    verifyTriangles,
    pump: stream.pump,
    setAuditResult(value) {
      result = value;
    },
  };
  env.publish = await componentCallback("voxel-sandbox-lab.tsx", "publish", env);
  const audit = await componentCallback("voxel-sandbox-lab.tsx", "audit", env),
    tick = await componentCallback("voxel-sandbox-lab.tsx", "tickOnce", env);
  audit();
  assert.match(sandbox.auditLabel(result, topologyRevision.current), /PASS.*874/);
  tick();
  assert.equal(state.world.chunks.size, 3);
  assert.match(sandbox.auditLabel(result, topologyRevision.current), /Cần kiểm lại/);
  audit();
  assert.match(sandbox.auditLabel(result, topologyRevision.current), /PASS.*2494/);
  stream.drain(state.world);
  audit();
  tick();
  assert.match(sandbox.auditLabel(result, topologyRevision.current), /PASS/);
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
