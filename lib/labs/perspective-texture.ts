export interface TextureVec2 {
  x: number;
  y: number;
}

export interface TextureVec3 {
  x: number;
  y: number;
  z: number;
}

export interface TextureVertex {
  position: TextureVec3;
  uv: TextureVec2;
}

export interface TextureQuad {
  vertices: TextureVertex[];
  faces: Array<readonly [number, number, number]>;
}

export type TextureTriangle = readonly [TextureVertex, TextureVertex, TextureVertex];

export interface TextureBarycentric {
  a: number;
  b: number;
  c: number;
}

export type TextureAddressMode = "clamp" | "repeat";
export type TextureInterpolationMode = "affine" | "perspective";

export const textureDepthPresets = {
  front: { near: 4, far: 4 },
  medium: { near: 2.5, far: 5 },
  steep: { near: 1.5, far: 7 },
  near: { near: 0.65, far: 4.5 },
} as const;

export function makeTextureQuad(nearDepth: number, farDepth: number): TextureQuad {
  return {
    vertices: [
      { position: { x: -1.6, y: -1, z: nearDepth }, uv: { x: 0, y: 1 } },
      { position: { x: 1.6, y: -1, z: farDepth }, uv: { x: 1, y: 1 } },
      { position: { x: 1.6, y: 1, z: farDepth }, uv: { x: 1, y: 0 } },
      { position: { x: -1.6, y: 1, z: nearDepth }, uv: { x: 0, y: 0 } },
    ],
    faces: [
      [0, 2, 1],
      [0, 3, 2],
    ],
  };
}

export function projectTextureVertex(
  vertex: TextureVertex,
  width: number,
  height: number,
  nearPlane = 1,
): TextureVec2 | undefined {
  if (vertex.position.z < nearPlane || width <= 0 || height <= 0) return undefined;
  const focalScale = 1 / Math.tan(Math.PI / 6);
  const aspect = width / height;
  const ndcX = (vertex.position.x * focalScale) / (aspect * vertex.position.z);
  const ndcY = (vertex.position.y * focalScale) / vertex.position.z;
  return { x: (ndcX * 0.5 + 0.5) * width, y: (0.5 - ndcY * 0.5) * height };
}

export function textureBarycentricAtPoint(
  triangle: readonly [TextureVec2, TextureVec2, TextureVec2],
  point: TextureVec2,
): TextureBarycentric | undefined {
  const [a, b, c] = triangle;
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denominator) <= 1e-12) return undefined;
  const weightA = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
  const weightB = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
  return { a: weightA, b: weightB, c: 1 - weightA - weightB };
}

export function textureBarycentricIsInside(weights: TextureBarycentric, epsilon = 1e-9) {
  return weights.a >= -epsilon && weights.b >= -epsilon && weights.c >= -epsilon;
}

function weightedUv(
  vertices: readonly [TextureVertex, TextureVertex, TextureVertex],
  weights: TextureBarycentric,
): TextureVec2 {
  return {
    x: weights.a * vertices[0].uv.x + weights.b * vertices[1].uv.x + weights.c * vertices[2].uv.x,
    y: weights.a * vertices[0].uv.y + weights.b * vertices[1].uv.y + weights.c * vertices[2].uv.y,
  };
}

export function interpolateTextureAffineUv(
  vertices: readonly [TextureVertex, TextureVertex, TextureVertex],
  weights: TextureBarycentric,
) {
  return weightedUv(vertices, weights);
}

export function reciprocalTextureDenominator(
  vertices: readonly [TextureVertex, TextureVertex, TextureVertex],
  weights: TextureBarycentric,
) {
  return (
    weights.a / vertices[0].position.z +
    weights.b / vertices[1].position.z +
    weights.c / vertices[2].position.z
  );
}

export function interpolateTexturePerspectiveUv(
  vertices: readonly [TextureVertex, TextureVertex, TextureVertex],
  weights: TextureBarycentric,
): TextureVec2 | undefined {
  const weightedA = weights.a / vertices[0].position.z;
  const weightedB = weights.b / vertices[1].position.z;
  const weightedC = weights.c / vertices[2].position.z;
  const denominator = weightedA + weightedB + weightedC;
  if (Math.abs(denominator) <= 1e-12) return undefined;
  return {
    x:
      (weightedA * vertices[0].uv.x + weightedB * vertices[1].uv.x + weightedC * vertices[2].uv.x) /
      denominator,
    y:
      (weightedA * vertices[0].uv.y + weightedB * vertices[1].uv.y + weightedC * vertices[2].uv.y) /
      denominator,
  };
}

export function textureUvDistance(left: TextureVec2, right: TextureVec2) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export function addressTextureCoordinate(value: number, mode: TextureAddressMode) {
  if (mode === "clamp") return Math.max(0, Math.min(1, value));
  return value - Math.floor(value);
}

export function nearestTextureTexel(
  uv: TextureVec2,
  width: number,
  height: number,
  mode: TextureAddressMode,
) {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  const u = addressTextureCoordinate(uv.x, mode);
  const v = addressTextureCoordinate(uv.y, mode);
  return {
    x: Math.max(0, Math.min(width - 1, Math.floor(u * width))),
    y: Math.max(0, Math.min(height - 1, Math.floor(v * height))),
  };
}

export function checkerTextureIsLight(uv: TextureVec2, cells: number, mode: TextureAddressMode) {
  const texel = nearestTextureTexel(uv, cells, cells, mode);
  return (texel.x + texel.y) % 2 === 0;
}

function mix(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function intersectTextureNearPlane(
  start: TextureVertex,
  end: TextureVertex,
  nearPlane: number,
) {
  const depthChange = end.position.z - start.position.z;
  const t =
    Math.abs(depthChange) <= 1e-12
      ? 0
      : Math.max(0, Math.min(1, (nearPlane - start.position.z) / depthChange));
  return {
    t,
    vertex: {
      position: {
        x: mix(start.position.x, end.position.x, t),
        y: mix(start.position.y, end.position.y, t),
        z: nearPlane,
      },
      uv: { x: mix(start.uv.x, end.uv.x, t), y: mix(start.uv.y, end.uv.y, t) },
    },
  };
}

export function clipTextureTriangleNearPlane(
  vertices: readonly [TextureVertex, TextureVertex, TextureVertex],
  nearPlane: number,
  epsilon = 1e-9,
) {
  const output: TextureVertex[] = [];
  let previous = vertices[2];
  let previousInside = previous.position.z >= nearPlane - epsilon;
  for (const current of vertices) {
    const currentInside = current.position.z >= nearPlane - epsilon;
    if (currentInside && !previousInside) {
      output.push(intersectTextureNearPlane(previous, current, nearPlane).vertex);
    }
    if (currentInside) output.push(current);
    if (!currentInside && previousInside) {
      output.push(intersectTextureNearPlane(previous, current, nearPlane).vertex);
    }
    previous = current;
    previousInside = currentInside;
  }
  return output;
}

export function inspectTextureTriangles(
  triangles: readonly TextureTriangle[],
  point: TextureVec2,
  width: number,
  height: number,
) {
  for (const [triangleIndex, vertices] of triangles.entries()) {
    const projected = vertices.map((vertex) => projectTextureVertex(vertex, width, height));
    if (!projected[0] || !projected[1] || !projected[2]) continue;
    const weights = textureBarycentricAtPoint([projected[0], projected[1], projected[2]], point);
    if (!weights || !textureBarycentricIsInside(weights)) continue;
    const affineUv = interpolateTextureAffineUv(vertices, weights);
    const correctedUv = interpolateTexturePerspectiveUv(vertices, weights);
    if (!correctedUv) continue;
    return {
      triangleIndex,
      weights,
      affineUv,
      correctedUv,
      denominator: reciprocalTextureDenominator(vertices, weights),
      error: textureUvDistance(affineUv, correctedUv),
    };
  }
  return undefined;
}
