import assert from "node:assert/strict";
import test from "node:test";
import * as texture from "../lib/labs/perspective-texture.ts";

test("Perspective Texture Lab preserves sampling, reciprocal UV and near clipping", () => {
  assert.deepEqual(texture.nearestTextureTexel({ x: 1, y: 1 }, 8, 8, "clamp"), {
    x: 7,
    y: 7,
  });
  assert.deepEqual(texture.nearestTextureTexel({ x: 1, y: 1 }, 8, 8, "repeat"), {
    x: 0,
    y: 0,
  });
  assert.deepEqual(texture.nearestTextureTexel({ x: -0.1, y: 1.1 }, 8, 8, "repeat"), {
    x: 7,
    y: 0,
  });

  const weights = { a: 0.2, b: 0.3, c: 0.5 };
  const flat = texture.makeTextureQuad(4, 4);
  const flatVertices = flat.faces[0].map((index) => flat.vertices[index]);
  const flatAffine = texture.interpolateTextureAffineUv(flatVertices, weights);
  const flatCorrected = texture.interpolateTexturePerspectiveUv(flatVertices, weights);
  assert.ok(flatCorrected);
  assert.ok(texture.textureUvDistance(flatAffine, flatCorrected) < 1e-12);

  const tilted = texture.makeTextureQuad(1.5, 7);
  const tiltedVertices = tilted.faces[0].map((index) => tilted.vertices[index]);
  const tiltedAffine = texture.interpolateTextureAffineUv(tiltedVertices, weights);
  const tiltedCorrected = texture.interpolateTexturePerspectiveUv(tiltedVertices, weights);
  assert.ok(tiltedCorrected);
  assert.ok(texture.textureUvDistance(tiltedAffine, tiltedCorrected) > 0.05);
  assert.ok(texture.reciprocalTextureDenominator(tiltedVertices, weights) > 0);

  const start = { position: { x: -1, y: -0.8, z: 0.5 }, uv: { x: 0, y: 1 } };
  const end = { position: { x: 1, y: -0.8, z: 3 }, uv: { x: 1, y: 1 } };
  const intersection = texture.intersectTextureNearPlane(start, end, 1);
  assert.equal(intersection.t, 0.2);
  assert.equal(intersection.vertex.position.z, 1);
  assert.equal(intersection.vertex.position.x, -0.6);
  assert.equal(intersection.vertex.uv.x, 0.2);

  const crossing = [start, end, { position: { x: 0, y: 0.9, z: 2 }, uv: { x: 0.5, y: 0 } }];
  const polygon = texture.clipTextureTriangleNearPlane(crossing, 1);
  assert.equal(polygon.length, 4);
  assert.ok(polygon.every((vertex) => vertex.position.z >= 1 - 1e-9));

  const nearQuad = texture.makeTextureQuad(0.65, 4.5);
  const clippedTriangles = [];
  for (const face of nearQuad.faces) {
    const vertices = face.map((index) => nearQuad.vertices[index]);
    const clipped = texture.clipTextureTriangleNearPlane(vertices, 1);
    for (let index = 1; index + 1 < clipped.length; index += 1) {
      clippedTriangles.push([clipped[0], clipped[index], clipped[index + 1]]);
    }
  }
  const inspection = texture.inspectTextureTriangles(
    clippedTriangles,
    { x: 110, y: 83.2 },
    220,
    160,
  );
  assert.ok(
    inspection,
    "near preset inspector must read the same clipped triangles as the renderer",
  );
  assert.ok(Number.isFinite(inspection.denominator));
  assert.ok(Number.isFinite(inspection.correctedUv.x));
});
