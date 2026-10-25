import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { componentCallback, canvasCallback, componentEffect } from "./lab-handler-support.mjs";
import { createCloudScene, refreshCloud, cloudModes } from "../lib/labs/cloud-survey/scene.ts";
import {
  cameraBasis,
  resetCamera,
  switchCameraMode,
  translateCamera,
} from "../lib/labs/cloud-survey/camera.ts";
import { add, scale } from "../lib/labs/cloud-survey/geometry.ts";

const file = "point-cloud-octree-lab.tsx";
test("Survey readout has identical server/initial-client markup despite different timings", async () => {
  const source = await readFile(
    new URL("../components/labs/cloud-survey-readout.tsx", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const fixtureModule = { exports: {} },
    require = createRequire(import.meta.url);
  new Function("require", "module", "exports", compiled)(
    (name) => (name === "@/lib/labs/cloud-survey/camera" ? { cameraBasis } : require(name)),
    fixtureModule,
    fixtureModule.exports,
  );
  const Readout = fixtureModule.exports.CloudSurveyReadout,
    server = createCloudScene(11, 32),
    client = createCloudScene(11, 32);
  server.tree.buildMilliseconds = 12345.6;
  client.tree.buildMilliseconds = 23456.7;
  server.selected.milliseconds = 101;
  client.selected.milliseconds = 202;
  const html = (scene, ready) =>
    renderToStaticMarkup(
      Readout({
        scene,
        ready,
        renderInfo: { drawn: scene.count, milliseconds: scene.tree.buildMilliseconds },
      }),
    );
  assert.equal(html(server, false), html(client, false));
  assert.match(html(client, true), /23456\.700/);
  const values = [];
  for (const mode of [undefined, ...cloudModes])
    values.push(await componentCallback(file, "helpId", { mode }));
  assert.equal(new Set(values).size, 12);
});

test("Survey actual keyboard keeps browser shortcuts and separates camera movement from world selection", async () => {
  const model = { current: createCloudScene(11, 100) },
    before = structuredClone(model.current.points),
    initialCamera = structuredClone(model.current.camera);
  model.current.selectionEnabled = true;
  refreshCloud(model.current);
  const selection = [...model.current.selected.indices];
  let prevented = 0;
  const key = await componentCallback(file, "key", {
    stage: 11,
    model,
    stop: () => {},
    refreshCloud,
    publish: () => {},
    setPaused: () => {},
    change: (action) => {
      action(model.current);
      refreshCloud(model.current);
    },
    cameraBasis,
    translateCamera,
    scale,
    add,
    switchCameraMode,
    resetCamera,
  });
  const event = (key, extra = {}) => ({
    key,
    preventDefault() {
      prevented++;
    },
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...extra,
  });
  key(event("w", { ctrlKey: true }));
  assert.equal(prevented, 0);
  assert.deepEqual(model.current.camera, initialCamera);
  key(event("ArrowLeft"));
  assert.notEqual(model.current.camera.yaw, initialCamera.yaw);
  assert.deepEqual(model.current.selected.indices, selection);
  key(event("j"));
  assert.equal(model.current.region.center.x, -0.5);
  assert.deepEqual(model.current.points, before);
  key(event("Delete"));
  assert.equal(model.current.selectionEnabled, false);
  assert.equal(model.current.points.length, 100);
  model.current.region.center.x = -10000;
  key(event("j"));
  assert.equal(model.current.region.center.x, -10000);
});

test("Survey actual pointer handlers preserve owner, apply final-up and restore camera on cancel", async () => {
  const model = { current: createCloudScene(2, 100) },
    gesture = { current: null },
    captures = new Set(),
    canvas = {
      setPointerCapture: (id) => captures.add(id),
      hasPointerCapture: (id) => captures.has(id),
      releasePointerCapture: (id) => captures.delete(id),
      focus() {},
    };
  const publish = () => {};
  const release = await componentCallback(file, "release", {
    gesture,
    model,
    canvasRef: { current: canvas },
  });
  const applyGesture = await componentCallback(file, "applyGesture", {
    gesture,
    model,
    refreshCloud,
    publish,
    cameraBasis,
    translateCamera,
    add,
    scale,
  });
  const point = (event) => ({ x: event.clientX, y: event.clientY });
  const down = await componentCallback(file, "down", {
    stage: 2,
    gesture,
    stop: () => {},
    point,
    model,
    tool: "orbit",
  });
  const move = await componentCallback(file, "move", {
    gesture,
    release,
    refreshCloud,
    model,
    publish,
    applyGesture,
    point,
  });
  const up = await componentCallback(file, "up", { gesture, applyGesture, point, release });
  const event = (id, x, y, extra = {}) => ({
    pointerId: id,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    isPrimary: true,
    currentTarget: canvas,
    ...extra,
  });
  const start = structuredClone(model.current.camera);
  down(event(1, 0, 0));
  assert.ok(captures.has(1));
  move(event(2, 100, 100));
  assert.deepEqual(model.current.camera, start);
  up(event(1, 50, 20));
  assert.equal(captures.size, 0);
  assert.ok(Math.abs(model.current.camera.yaw - (start.yaw - 0.3)) < 1e-12);
  const committed = structuredClone(model.current.camera);
  down(event(3, 0, 0));
  move(event(3, 100, 20));
  const cancel = await canvasCallback(file, "onPointerCancel", {
    gesture,
    release,
    refreshCloud,
    model,
    publish,
  });
  cancel(event(3, 100, 20));
  assert.deepEqual(model.current.camera, committed);
  assert.equal(captures.size, 0);
  up(event(3, 1000, 1000));
  assert.deepEqual(model.current.camera, committed);
});

test("Survey lifecycle unregisters handlers, cancels work and releases resources on unmount", async () => {
  const handlers = new Map(),
    jobRef = { current: { active: true } },
    mounted = { current: false },
    fileEpoch = { current: 0 },
    downloadUrl = { current: "blob:fixture" },
    cache = { current: {} };
  let released = 0,
    revoked = 0,
    stopped = 0;
  const window = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  };
  const document = {
    hidden: false,
    addEventListener: window.addEventListener,
    removeEventListener: window.removeEventListener,
  };
  const effect = await componentEffect(file, "mounted.current = true", {
    mounted,
    fileEpoch,
    invalidateFile: () => fileEpoch.current++,
    downloadUrl,
    cache,
    window,
    document,
    jobRef,
    release: () => released++,
    stop: () => stopped++,
    URL: { revokeObjectURL: () => revoked++ },
  });
  const cleanup = effect();
  assert.equal(mounted.current, true);
  document.hidden = true;
  handlers.get("visibilitychange")();
  assert.equal(stopped, 1);
  cleanup();
  assert.equal(mounted.current, false);
  assert.equal(jobRef.current.active, false);
  assert.equal(handlers.size, 0);
  assert.equal(released, 1);
  assert.equal(revoked, 1);
  assert.equal(cache.current, null);
});
