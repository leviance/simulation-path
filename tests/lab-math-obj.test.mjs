import assert from "node:assert/strict";
import test from "node:test";
import {
  OBJ_PRESETS,
  buildObjScene,
  normalizeObjMesh,
  objBoundsCenter,
  objBoundsMaxExtent,
  objMeshBounds,
  parseObjSource,
  resolveObjPositionIndex,
} from "../lib/labs/obj-viewer.ts";
import { renderZTriangles, zFrameDifference } from "../lib/labs/z-buffer.ts";

test("OBJ Canvas math resolves face tokens, triangulates and normalizes like C++", () => {
  assert.equal(resolveObjPositionIndex("1", 5), 0);
  assert.equal(resolveObjPositionIndex("5/2/8", 5), 4);
  assert.equal(resolveObjPositionIndex("-1//3", 5), 4);
  assert.equal(resolveObjPositionIndex("-5", 5), 0);
  assert.equal(resolveObjPositionIndex("0", 5), null);
  assert.equal(resolveObjPositionIndex("-6", 5), null);
  assert.equal(resolveObjPositionIndex("/2/3", 5), null);

  const quad = parseObjSource(OBJ_PRESETS.slash);
  assert.equal(quad.diagnostics.length, 0);
  assert.equal(quad.mesh.positions.length, 4);
  assert.equal(quad.mesh.sourceFaceCount, 1);
  assert.deepEqual(
    quad.mesh.triangles.map((triangle) => triangle.indices),
    [
      [0, 1, 2],
      [0, 2, 3],
    ],
  );

  const normalized = normalizeObjMesh(quad.mesh);
  assert.ok(normalized);
  const bounds = objMeshBounds(normalized.mesh);
  assert.ok(bounds);
  assert.deepEqual(objBoundsCenter(bounds), { x: 0, y: 0, z: 0 });
  assert.equal(objBoundsMaxExtent(bounds), 2);
  assert.equal(normalized.uniformScale, 1);
});

test("OBJ Canvas renderer keeps Z-buffer output independent of face order", () => {
  const parsed = parseObjSource(OBJ_PRESETS.rocket);
  const normalized = normalizeObjMesh(parsed.mesh);
  assert.ok(normalized);
  const scene = buildObjScene(normalized.mesh, 72, 48, -0.35, 0.65, false);
  assert.ok(scene.triangles.length > 0);
  assert.ok(scene.triangles.every((triangle) => Number.isFinite(triangle.intensity)));

  const forward = renderZTriangles(scene.triangles, 72, 48);
  const reverse = renderZTriangles(scene.triangles, 72, 48, { reverseOrder: true });
  assert.deepEqual(zFrameDifference(forward, reverse), { colorPixels: 0, depthPixels: 0 });
  assert.ok(forward.passedCount > 0);
  assert.ok(forward.rejectedCount > 0);

  const malformed = parseObjSource(OBJ_PRESETS.malformed);
  assert.equal(malformed.mesh.triangles.length, 0);
  assert.equal(malformed.diagnostics.length, 3);
  assert.deepEqual(
    malformed.diagnostics.map((diagnostic) => diagnostic.line),
    [3, 4, 5],
  );
});
