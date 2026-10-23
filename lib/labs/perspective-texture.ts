export interface TextureVec2 {
  x: number;
  y: number;
}
export interface TextureVec3 extends TextureVec2 {
  z: number;
}
export interface TextureVertex {
  position: TextureVec3;
  uv: TextureVec2;
}
export type TextureTriangle = readonly [TextureVertex, TextureVertex, TextureVertex];
export interface TextureBarycentric {
  a: number;
  b: number;
  c: number;
}
export type TextureAddressMode = "clamp" | "repeat";
export type TextureInterpolationMode = "affine" | "perspective";
export interface TextureQuad {
  vertices: TextureVertex[];
  faces: [number, number, number][];
}
export const textureLight = [236, 240, 248] as const;
export const textureDark = [38, 48, 72] as const;

export function textureRotateX(p: TextureVec3, angle: number): TextureVec3 {
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  return { x: p.x, y: cosine * p.y - sine * p.z, z: sine * p.y + cosine * p.z };
}
export function textureRotateY(p: TextureVec3, angle: number): TextureVec3 {
  const cosine = Math.cos(angle),
    sine = Math.sin(angle);
  return { x: cosine * p.x + sine * p.z, y: p.y, z: -sine * p.x + cosine * p.z };
}
export function makeTextureQuad(yaw: number, pitch: number, distance: number): TextureQuad {
  const vertices: TextureVertex[] = [
    { position: { x: -1.6, y: -1, z: 0 }, uv: { x: 0, y: 1 } },
    { position: { x: 1.6, y: -1, z: 0 }, uv: { x: 1, y: 1 } },
    { position: { x: 1.6, y: 1, z: 0 }, uv: { x: 1, y: 0 } },
    { position: { x: -1.6, y: 1, z: 0 }, uv: { x: 0, y: 0 } },
  ];
  for (const vertex of vertices) {
    vertex.position = textureRotateY(textureRotateX(vertex.position, pitch), yaw);
    vertex.position.z += distance;
  }
  return {
    vertices,
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
  const p = vertex.position;
  if (
    ![p.x, p.y, p.z, vertex.uv.x, vertex.uv.y, nearPlane].every(Number.isFinite) ||
    p.z < nearPlane ||
    nearPlane <= 0 ||
    width <= 0 ||
    height <= 0
  )
    return;
  const focalPixels = (height * 0.5) / Math.tan(Math.PI / 6);
  return {
    x: width * 0.5 + (focalPixels * p.x) / p.z,
    y: height * 0.5 - (focalPixels * p.y) / p.z,
  };
}
export function textureEdge(a: TextureVec2, b: TextureVec2, p: TextureVec2) {
  return (a.y - b.y) * p.x + (b.x - a.x) * p.y + (a.x * b.y - a.y * b.x);
}
export function textureTopLeft(a: TextureVec2, b: TextureVec2) {
  return b.y < a.y || (b.y === a.y && b.x > a.x);
}
export function interpolateTextureAffineUv(
  vertices: TextureTriangle,
  w: TextureBarycentric,
): TextureVec2 {
  return {
    x: w.a * vertices[0].uv.x + w.b * vertices[1].uv.x + w.c * vertices[2].uv.x,
    y: w.a * vertices[0].uv.y + w.b * vertices[1].uv.y + w.c * vertices[2].uv.y,
  };
}
export function reciprocalTextureDenominator(vertices: TextureTriangle, w: TextureBarycentric) {
  return w.a / vertices[0].position.z + w.b / vertices[1].position.z + w.c / vertices[2].position.z;
}
export function interpolateTexturePerspectiveUv(
  vertices: TextureTriangle,
  w: TextureBarycentric,
): TextureVec2 | undefined {
  const a = w.a / vertices[0].position.z,
    b = w.b / vertices[1].position.z,
    c = w.c / vertices[2].position.z;
  const denominator = a + b + c;
  if (!Number.isFinite(denominator) || denominator <= 0) return;
  const uv = {
    x: (a * vertices[0].uv.x + b * vertices[1].uv.x + c * vertices[2].uv.x) / denominator,
    y: (a * vertices[0].uv.y + b * vertices[1].uv.y + c * vertices[2].uv.y) / denominator,
  };
  if (Number.isFinite(uv.x) && Number.isFinite(uv.y)) return uv;
}
export function addressTextureCoordinate(value: number, mode: TextureAddressMode) {
  if (!Number.isFinite(value)) return 0;
  return mode === "clamp" ? Math.max(0, Math.min(1, value)) : value - Math.floor(value);
}
export function nearestTextureTexel(
  uv: TextureVec2,
  width: number,
  height: number,
  mode: TextureAddressMode,
) {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.min(width - 1, Math.floor(addressTextureCoordinate(uv.x, mode) * width)),
    y: Math.min(height - 1, Math.floor(addressTextureCoordinate(uv.y, mode) * height)),
  };
}
export function checkerTextureColor(uv: TextureVec2, mode: TextureAddressMode) {
  if (!Number.isFinite(uv.x) || !Number.isFinite(uv.y)) return [255, 0, 255] as const;
  const texel = nearestTextureTexel(uv, 64, 64, mode);
  return (Math.floor(texel.x / 8) + Math.floor(texel.y / 8)) % 2 === 0 ? textureLight : textureDark;
}
export function textureUvDistance(a: TextureVec2, b: TextureVec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function intersectTextureNearPlane(
  start: TextureVertex,
  end: TextureVertex,
  nearPlane: number,
) {
  // Canonical edge direction avoids different intersection rounding on shared edges.
  let a = start,
    b = end;
  if (a.position.z > b.position.z) [a, b] = [b, a];
  const t = (nearPlane - a.position.z) / (b.position.z - a.position.z);
  return {
    t: start === a ? t : 1 - t,
    vertex: {
      position: {
        x: a.position.x + (b.position.x - a.position.x) * t,
        y: a.position.y + (b.position.y - a.position.y) * t,
        z: nearPlane,
      },
      uv: { x: a.uv.x + (b.uv.x - a.uv.x) * t, y: a.uv.y + (b.uv.y - a.uv.y) * t },
    },
  };
}
export function clipTextureTriangleNearPlane(vertices: TextureTriangle, nearPlane = 1) {
  const output: TextureVertex[] = [];
  if (
    !Number.isFinite(nearPlane) ||
    nearPlane <= 0 ||
    vertices.some(
      (v) => ![v.position.x, v.position.y, v.position.z, v.uv.x, v.uv.y].every(Number.isFinite),
    )
  )
    return output;
  let previous = vertices[2],
    previousInside = previous.position.z >= nearPlane;
  for (const current of vertices) {
    const inside = current.position.z >= nearPlane;
    if (inside !== previousInside)
      output.push(intersectTextureNearPlane(previous, current, nearPlane).vertex);
    if (inside) output.push(current);
    previous = current;
    previousInside = inside;
  }
  return output;
}
