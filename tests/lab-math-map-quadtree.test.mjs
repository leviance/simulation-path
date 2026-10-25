import assert from "node:assert/strict";
import test from "node:test";
import {
  mapRoot,
  normalizedBox,
  worldToMapScreen,
  mapScreenToWorld,
  zoomMapAt,
  viewportBox,
  intersects,
  containsBox,
} from "../lib/labs/map-geometry.ts";
import { makeMapObjects } from "../lib/labs/map-data.ts";
import { MapQuadtree, queryMapBrute, defaultMapTreeConfig } from "../lib/labs/map-quadtree.ts";
import { MapDocument } from "../lib/labs/map-document.ts";
const object = (id, x, y, width, height) => ({ id, kind: "house", box: { x, y, width, height } });
const ordered = (ids) => [...ids].sort((a, b) => a - b);
// Oracle không dùng intersects production: tìm trục bị tách rời bằng gap.
const oracle = (objects, query) =>
  ordered(
    [...objects]
      .filter((item) => {
        const b = item.box;
        const gapX = Math.max(b.x, query.x) - Math.min(b.x + b.width, query.x + query.width);
        const gapY = Math.max(b.y, query.y) - Math.min(b.y + b.height, query.y + query.height);
        return gapX <= 0 && gapY <= 0;
      })
      .map((item) => item.id),
  );
function checkTree(tree) {
  const stored = new Map();
  for (const [index, node] of tree.nodes.entries()) {
    if (node.children) assert.equal(node.children.length, 4);
    for (const id of node.ids) {
      stored.set(id, (stored.get(id) ?? 0) + 1);
      assert.equal(tree.location.get(id), index);
      assert.ok(containsBox(node.box, tree.objects.get(id).box));
      if (node.children)
        assert.equal(
          tree.childSlot(tree.objects.get(id).box, node),
          -1,
          "internal items must cross a split",
        );
    }
  }
  assert.equal(stored.size, tree.objects.size);
  assert.equal(tree.location.size, tree.objects.size);
  for (const id of tree.objects.keys()) assert.equal(stored.get(id), 1);
}

test("Map AABB selection includes area intersection, split contact and root edges", () => {
  const items = [
    object(50, -10, -10, 20, 20),
    object(3, -80, -80, 20, 20),
    object(9, 0, -60, 10, 20),
    object(7, -30, -50, 30, 10),
    object(99, 90, 90, 10, 10),
    object(51, -10, -10, 20, 20),
  ];
  const config = {
    ...defaultMapTreeConfig,
    root: { x: -100, y: -100, width: 200, height: 200 },
    capacity: 1,
    minimumSize: 1,
  };
  const tree = new MapQuadtree(items, config);
  checkTree(tree);
  assert.ok(tree.nodes[0].ids.has(50));
  assert.ok(tree.nodes[0].ids.has(51));
  assert.deepEqual(ordered(tree.query({ x: 0, y: -50, width: 0, height: 0 }).ids), [7, 9]);
  assert.deepEqual(tree.query({ x: 100, y: 100, width: 0, height: 0 }).ids, [99]);
  assert.deepEqual(tree.query({ x: 101, y: 101, width: 0, height: 0 }).ids, []);
  for (const query of [
    config.root,
    { x: -11, y: -11, width: 1, height: 1 },
    { x: -1000, y: -1000, width: 2000, height: 2000 },
    { x: 0, y: 0, width: 0, height: 0 },
  ]) {
    assert.deepEqual(ordered(tree.query(query).ids), oracle(items, query));
  }
  const before = tree.objects.size;
  assert.throws(() => tree.insert(object(102, 99, 99, 2, 2)));
  assert.throws(() => tree.insert(items[0]));
  assert.equal(tree.objects.size, before);
  assert.ok(
    intersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10, width: 2, height: 2 }),
  );
});

test("Map seed produces real bounded houses, trees and parks in all three layouts", () => {
  for (const layout of ["districts", "clustered", "large"]) {
    const a = makeMapObjects(1000, 42, layout);
    assert.deepEqual(a, makeMapObjects(1000, 42, layout));
    assert.equal(new Set(a.map((item) => item.kind)).size, 3);
    assert.ok(
      a.every(
        (item) => item.box.width > 0 && item.box.height > 0 && containsBox(mapRoot, item.box),
      ),
    );
    if (layout === "large") assert.ok(a.some((item) => item.box.width > 1000));
  }
});

test("Map insert/remove/group update keep stable IDs and roll back the whole invalid move", () => {
  const items = makeMapObjects(300, 7);
  const tree = new MapQuadtree(items);
  const original = structuredClone([...tree.objects.values()]);
  const revision = tree.revision;
  assert.equal(tree.translate([0, 1, 2], 1e9, 0), false);
  assert.equal(tree.revision, revision);
  assert.deepEqual([...tree.objects.values()], original);
  assert.equal(tree.translate([0, 1, 2], 128, 64), true);
  tree.remove(1);
  tree.insert(object(500, -12800, -12000, 100, 100));
  assert.equal(tree.remove(999999), false);
  checkTree(tree);
  for (const query of [
    mapRoot,
    { x: -12800, y: -12000, width: 1000, height: 1000 },
    { x: -100, y: -100, width: 300, height: 300 },
  ]) {
    const result = tree.query(query);
    assert.equal(new Set(result.ids).size, result.ids.length);
    assert.deepEqual(ordered(result.ids), oracle(tree.objects.values(), query));
    assert.ok(!result.ids.includes(1));
  }
});

test("Map depth/minimum size/node budget bound coincident and split-spanning objects", () => {
  const items = Array.from({ length: 1000 }, (_, id) => object(id, 100, 100, 1, 1));
  for (const maximumNodes of [1, 5, 262145]) {
    const tree = new MapQuadtree(items, {
      ...defaultMapTreeConfig,
      capacity: 1,
      maximumDepth: 8,
      maximumNodes,
    });
    assert.ok(tree.nodes.length <= maximumNodes);
    assert.ok(tree.nodes.every((node) => node.depth <= 8));
    assert.equal(tree.query({ x: 100, y: 100, width: 0, height: 0 }).ids.length, 1000);
    checkTree(tree);
  }
});

test("Map camera round trip, reverse drag and cursor zoom are independent of DPR", () => {
  const camera = { x: -500, y: 1200, zoom: 0.3 };
  const size = { width: 960, height: 600 };
  const anchor = { x: 250, y: 170 };
  const point = { x: -700, y: 1500 };
  const screen = worldToMapScreen(point, camera, size);
  const restored = mapScreenToWorld(screen, camera, size);
  assert.ok(Math.hypot(restored.x - point.x, restored.y - point.y) < 1e-9);
  const before = mapScreenToWorld(anchor, camera, size);
  const after = mapScreenToWorld(anchor, zoomMapAt(camera, anchor, size, 1.5), size);
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 1e-9);
  assert.deepEqual(normalizedBox(anchor, screen), normalizedBox(screen, anchor));
  assert.ok(containsBox(viewportBox(camera, size), { ...point, width: 0, height: 0 }));
});

test("Map document pick uses topmost ID, group selection persists and deleted IDs never return", () => {
  const document = new MapDocument(0);
  document.tree.insert(object(8, 0, 0, 100, 100));
  document.tree.insert(object(2, 0, 0, 100, 100));
  assert.equal(document.pick({ x: 50, y: 50 }), 8);
  document.selectRegion({ x: 150, y: 150 }, { x: -10, y: -10 });
  assert.deepEqual(ordered(document.selection), [2, 8]);
  assert.equal(document.moveSelection({ x: 100, y: 0 }), true);
  assert.deepEqual(ordered(document.selection), [2, 8]);
  assert.equal(document.moveSelection({ x: 1e8, y: 0 }), false);
  document.deleteSelection();
  assert.equal(document.tree.objects.size, 0);
  assert.equal(document.selection.size, 0);
  const first = document.add({ x: 0, y: 0 }, "tree");
  document.deleteSelection();
  const second = document.add({ x: 0, y: 0 }, "park");
  assert.ok(second > first);
  assert.deepEqual(document.query({ x: -100, y: -100, width: 300, height: 300 }).ids, [second]);
});

test("Mandatory 100000-object workflow selects, moves, adds, deletes and culls exact AABBs", () => {
  const document = new MapDocument(100000, 1);
  assert.equal(document.tree.objects.size, 100000);
  const query = { x: -12000, y: -12000, width: 1200, height: 1000 };
  let result = document.tree.query(query);
  assert.ok(result.ids.length > 0);
  assert.ok(result.candidates < 100000);
  assert.deepEqual(ordered(result.ids), oracle(document.tree.objects.values(), query));
  document.selectRegion(
    { x: query.x, y: query.y },
    { x: query.x + query.width, y: query.y + query.height },
  );
  const selected = [...document.selection];
  assert.equal(document.moveSelection({ x: 128, y: 64 }), true);
  assert.deepEqual(ordered(document.selection), ordered(selected));
  const newId = document.add({ x: -11500, y: -11500 }, "house");
  assert.equal(newId, 100000);
  document.deleteSelection();
  assert.equal(document.tree.objects.size, 100000);
  result = document.tree.query(query);
  assert.deepEqual(ordered(result.ids), oracle(document.tree.objects.values(), query));
  assert.ok(!result.ids.includes(newId));
  const camera = { x: -11500, y: -11500, zoom: 0.5 };
  const view = viewportBox(camera, { width: 960, height: 600 });
  assert.deepEqual(
    ordered(document.tree.query(view).ids),
    ordered(queryMapBrute(document.tree.objects.values(), view).ids),
  );
  checkTree(document.tree);
});
