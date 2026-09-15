import assert from "node:assert/strict";
import test from "node:test";
import * as zbuffer from "../lib/labs/z-buffer.ts";

test("Z-buffer Canvas math keeps visibility independent of triangle order", () => {
  const triangles = zbuffer.buildCubeTriangles(80, 56, -0.42, 0.68);
  assert.equal(triangles.length, 12);

  const normal = zbuffer.renderZTriangles(triangles, 80, 56, {
    depthEnabled: true,
    reverseOrder: false,
  });
  const reversed = zbuffer.renderZTriangles(triangles, 80, 56, {
    depthEnabled: true,
    reverseOrder: true,
  });
  assert.deepEqual(zbuffer.zFrameDifference(normal, reversed), {
    colorPixels: 0,
    depthPixels: 0,
  });
  assert.ok(normal.passedCount > 0);
  assert.ok(normal.rejectedCount > 0);
  assert.ok(normal.depths.every((depth) => Number.isFinite(depth) && depth >= 0 && depth <= 1));

  const painter = zbuffer.renderZTriangles(triangles, 80, 56, {
    depthEnabled: false,
    reverseOrder: false,
  });
  const painterReversed = zbuffer.renderZTriangles(triangles, 80, 56, {
    depthEnabled: false,
    reverseOrder: true,
  });
  assert.ok(zbuffer.zFrameDifference(painter, painterReversed).colorPixels > 0);

  const onePixel = zbuffer.createZFrame(1, 1);
  assert.equal(
    zbuffer.testAndWriteZFragment(onePixel, 0, 0, 0.25, { red: 255, green: 0, blue: 0 }),
    true,
  );
  assert.equal(
    zbuffer.testAndWriteZFragment(onePixel, 0, 0, 0.75, { red: 0, green: 0, blue: 255 }),
    false,
  );
  assert.equal(onePixel.depths[0], 0.25);
});
