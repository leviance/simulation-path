import assert from "node:assert/strict";
import test from "node:test";
import {
  createMapScene,
  initialMapCamera,
  beginMapGesture,
  moveMapGesture,
  endMapGesture,
  cancelMapWork,
  refreshMapScene,
  zoomMapScene,
  mapPreviewValid,
} from "../lib/labs/map-scene.ts";
import {
  worldToMapScreen,
  viewportBox,
  intersects,
  translatedBox,
} from "../lib/labs/map-geometry.ts";
import {
  createMapValidation,
  tickMapValidation,
  inspectMapTopology,
} from "../lib/labs/map-validation.ts";
import { createMapBenchmark, tickMapBenchmark } from "../lib/labs/map-benchmark.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const object = (id, x, y, width = 40, height = 40) => ({
  id,
  kind: "house",
  box: { x, y, width, height },
});

test("Map actual keyboard separates camera and edits and preserves browser shortcuts", async () => {
  const model = { current: fixture() };
  model.current.document.selection.add(9);
  let stopped = 0,
    removed = 0,
    zoomed = 0,
    prevented = 0;
  const key = await componentCallback("quadtree-map-editor-lab.tsx", "key", {
    stage: 11,
    model,
    initialMapCamera,
    refreshMapScene,
    stop: () => {
      stopped++;
      cancelMapWork(model.current);
    },
    remove: () => {
      removed++;
      model.current.document.deleteSelection();
    },
    zoom: () => zoomed++,
    publish() {},
  });
  const event = { key: "ArrowRight", shiftKey: false, preventDefault: () => prevented++ };
  const oldX = model.current.document.tree.objects.get(9).box.x;
  const revision = model.current.document.tree.revision;
  key(event);
  assert.equal(model.current.camera.x, 64);
  assert.equal(model.current.document.tree.revision, revision);
  key({ ...event, shiftKey: true });
  assert.equal(model.current.document.tree.objects.get(9).box.x, oldX + 8);
  assert.equal(model.current.camera.x, 64);
  const count = prevented;
  for (const modifiers of [
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { repeat: true },
  ])
    key({ ...event, ...modifiers });
  key({ ...event, key: "Tab" });
  assert.equal(prevented, count);
  key({ ...event, key: "+" });
  assert.equal(zoomed, 1);
  const beforeHome = model.current.document.tree.revision;
  key({ ...event, key: "Home", shiftKey: true });
  assert.equal(model.current.document.tree.revision, beforeHome);
  key({ ...event, key: "Delete" });
  assert.equal(removed, 1);
  assert.equal(model.current.document.tree.objects.has(9), false);
  key({ ...event, key: "Escape" });
  assert.ok(stopped >= 4);
});

test("Map lifecycle and RAF jobs cancel on hidden, unmount and cleanup", async () => {
  const model = { current: fixture() };
  const listeners = new Map();
  const window = {
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: (key) => listeners.delete(key),
  };
  const document = { hidden: true, ...window };
  let stopped = 0,
    released = 0;
  const effect = await componentEffect(
    "quadtree-map-editor-lab.tsx",
    'window.addEventListener("blur"',
    {
      model,
      window,
      document,
      cancelMapWork,
      stop: () => stopped++,
      release: () => released++,
    },
  );
  const cleanup = effect();
  listeners.get("visibilitychange")();
  assert.equal(stopped, 1);
  cleanup();
  assert.equal(listeners.size, 0);
  assert.equal(released, 1);
  model.current.validation = createMapValidation(model.current.document.tree);
  let callback,
    cancelled = 0;
  const raf = await componentEffect("map-editor-diagnostics.tsx", "const tick =", {
    busy: true,
    model,
    getScene: () => model.current,
    tickMapValidation,
    tickMapBenchmark,
    publish() {},
    requestAnimationFrame: (fn) => {
      callback = fn;
      return 17;
    },
    cancelAnimationFrame: (id) => {
      assert.equal(id, 17);
      cancelled++;
    },
  });
  const cancel = raf();
  assert.equal(typeof callback, "function");
  model.current.validation.active = false;
  callback();
  assert.equal(model.current.validation.checked, 0);
  cancel();
  assert.equal(cancelled, 1);
});
function fixture() {
  const scene = createMapScene(11, 0);
  scene.camera = { x: 0, y: 0, zoom: 1 };
  scene.size = { width: 960, height: 600 };
  scene.document.tree.insert(object(8, -600, -10));
  scene.document.tree.insert(object(9, 0, 0));
  scene.document.nextId = 10;
  scene.document.selection.add(8);
  scene.document.selection.add(9);
  refreshMapScene(scene);
  return scene;
}

test("Every preset/layout opens on real map objects instead of an empty camera region", () => {
  for (const count of [10000, 100000]) {
    for (const layout of ["districts", "clustered", "large"]) {
      const scene = createMapScene(11, count, 1, layout);
      assert.ok(scene.visible.ids.length > 0, `${count}/${layout}`);
    }
  }
});

test("Map group preview includes objects entering the viewport and commits once on release", () => {
  const scene = fixture();
  scene.tool = "move";
  const revision = scene.document.tree.revision;
  beginMapGesture(scene, { x: 500, y: 320 });
  moveMapGesture(scene, { x: 1100, y: 320 });
  assert.deepEqual(scene.preview.ids, [8]);
  assert.equal(scene.document.tree.objects.get(8).box.x, -600);
  assert.equal(scene.document.tree.revision, revision);
  assert.equal(mapPreviewValid(scene), true);
  endMapGesture(scene, { x: 1100, y: 320 });
  assert.equal(scene.document.tree.objects.get(8).box.x, 0);
  assert.equal(scene.document.tree.objects.get(9).box.x, 600);
  assert.deepEqual([...scene.document.selection], [8, 9]);
  assert.equal(scene.document.tree.revision, revision + 4);
  assert.equal(scene.gesture, null);
});

test("Map invalid group drag rolls back all objects, and pointer cancel restores pre-drag selection", () => {
  const scene = fixture();
  scene.tool = "move";
  const revision = scene.document.tree.revision;
  beginMapGesture(scene, { x: 500, y: 320 });
  moveMapGesture(scene, { x: 50000, y: 320 });
  assert.equal(mapPreviewValid(scene), false);
  endMapGesture(scene, { x: 50000, y: 320 });
  assert.equal(scene.document.tree.revision, revision);
  assert.equal(scene.document.tree.objects.get(8).box.x, -600);
  assert.equal(scene.document.tree.objects.get(9).box.x, 0);
  scene.document.tree.insert(object(20, 100, 100));
  beginMapGesture(scene, { x: 600, y: 420 });
  assert.deepEqual([...scene.document.selection], [20]);
  cancelMapWork(scene);
  assert.deepEqual([...scene.document.selection], [8, 9]);
  assert.equal(scene.gesture, null);
});

test("Map camera pan and cursor zoom do not mutate objects; reverse drag selects full AABBs", () => {
  const scene = fixture();
  const revision = scene.document.tree.revision;
  scene.tool = "pan";
  beginMapGesture(scene, { x: 480, y: 300 });
  endMapGesture(scene, { x: 580, y: 350 });
  assert.deepEqual(scene.camera, { x: -100, y: -50, zoom: 1 });
  zoomMapScene(scene, { x: 200, y: 150 }, 2);
  assert.equal(scene.document.tree.revision, revision);
  scene.camera = { x: 0, y: 0, zoom: 1 };
  scene.tool = "select";
  beginMapGesture(scene, { x: 490, y: 310 });
  endMapGesture(scene, { x: 470, y: 290 });
  assert.deepEqual([...scene.document.selection], [9]);
  const before = scene.visible.ids;
  scene.document.useTree = false;
  refreshMapScene(scene);
  assert.deepEqual(scene.visible.ids, before);
});

test("Map reference and benchmark jobs finish with matching IDs/checksum, and reject stale revisions", () => {
  const scene = createMapScene(11, 10000);
  const validation = createMapValidation(scene.document.tree);
  for (let tick = 0; tick < 1000 && validation.active; tick++)
    tickMapValidation(validation, () => 0);
  assert.equal(validation.checked, validation.boxes.length);
  assert.equal(validation.failures, 0);
  const job = createMapBenchmark(scene.document.tree, viewportBox(scene.camera, scene.size));
  for (let tick = 0; tick < 1000 && job.active; tick++) tickMapBenchmark(job, () => 0);
  assert.equal(job.active, false);
  assert.equal(job.rows.length, 2);
  assert.ok(job.rows.every((row) => row.samples === 5 && row.queries === 16));
  assert.equal(job.rows[0].checksum, job.rows[1].checksum);
  assert.equal(job.rows[1].candidates, 10000 * 16);
  const stale = createMapValidation(scene.document.tree);
  scene.document.add({ x: 0, y: 0 }, "tree");
  tickMapValidation(stale);
  assert.equal(stale.stale, true);
  assert.equal(stale.active, false);
  const cancelled = createMapBenchmark(scene.document.tree, viewportBox(scene.camera, scene.size));
  cancelled.active = false;
  tickMapBenchmark(cancelled);
  assert.equal(cancelled.rows.length, 0);
});

test("Map topology validator catches duplicate storage and does not traverse a corrupt tree", () => {
  const scene = fixture();
  const tree = scene.document.tree;
  tree.location.set(8, 99999);
  assert.ok(inspectMapTopology(tree).failures > 0);
  const job = createMapValidation(tree);
  assert.equal(job.active, false);
  assert.ok(job.failures > 0);
});

test("Actual map renderer draws every visible object in ID paint order, not a display sample", async () => {
  const scene = createMapScene(11, 100000);
  const drawn = [];
  const draw = await componentCallback("map-editor-view.ts", "drawMapEditor", {
    worldToMapScreen,
    viewportBox,
    intersects,
    translatedBox,
    mapPreviewValid,
    mapSelectionPreview: () => null,
    screenBox: (box, state, size) => ({
      ...worldToMapScreen(box, state.camera, size),
      width: box.width * state.camera.zoom,
      height: box.height * state.camera.zoom,
    }),
    drawMapObject: (_, item) => drawn.push(item.id),
  });
  const context = new Proxy(
    {},
    { get: (_, key) => (key === "fillStyle" || key === "strokeStyle" ? "" : () => {}) },
  );
  draw(context, scene, { ...scene.size, dpr: 2 });
  assert.deepEqual(drawn, scene.visible.ids);
  assert.ok(drawn.length > 0 && drawn.length < 100000);
  assert.equal(scene.document.tree.objects.size, 100000);
});

test("Map pointer handlers retain capture owner and apply the final pointer-up sample", async () => {
  const owner = { current: null };
  const model = { current: fixture() };
  model.current.tool = "select";
  let captured = 0,
    released = 0;
  const target = { setPointerCapture: () => captured++, focus() {} };
  const point = (x, y) => ({ x, y });
  const down = await componentCallback("quadtree-map-editor-lab.tsx", "down", {
    owner,
    model,
    point,
    beginMapGesture,
    publish() {},
  });
  const up = await componentCallback("quadtree-map-editor-lab.tsx", "up", {
    owner,
    model,
    point,
    endMapGesture,
    release: () => {
      owner.current = null;
      released++;
    },
    publish() {},
  });
  const event = {
    pointerId: 1,
    button: 0,
    isPrimary: true,
    clientX: 480,
    clientY: 300,
    currentTarget: target,
  };
  down(event);
  down({ ...event, pointerId: 2 });
  assert.equal(captured, 1);
  up({ ...event, pointerId: 2 });
  assert.equal(released, 0);
  up({ ...event, clientX: 490, clientY: 310 });
  assert.equal(released, 1);
  assert.deepEqual([...model.current.document.selection], [9]);
});
