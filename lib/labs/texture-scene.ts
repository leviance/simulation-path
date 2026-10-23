import {
  makeTextureQuad,
  projectTextureVertex,
  clipTextureTriangleNearPlane,
  textureEdge,
  textureTopLeft,
  interpolateTextureAffineUv,
  interpolateTexturePerspectiveUv,
  reciprocalTextureDenominator,
  textureRotateX,
  textureRotateY,
  checkerTextureColor,
  nearestTextureTexel,
  textureUvDistance,
  type TextureVec2,
  type TextureTriangle,
  type TextureBarycentric,
  type TextureAddressMode,
} from "./perspective-texture.ts";

export interface TextureScene {
  yaw: number;
  pitch: number;
  distance: number;
  preset: number;
  sample: TextureVec2;
  sampleUv: TextureVec2;
  view: "affine" | "perspective" | "compare";
  address: TextureAddressMode;
  debug: boolean;
  paused: boolean;
  phase: number;
}
export const textureModes = [
  "texture-quad",
  "texture-sampling",
  "texture-affine",
  "texture-error",
  "texture-reciprocal",
  "texture-correct",
  "texture-clip",
  "texture-validation",
];
export function textureStage(mode?: string) {
  return textureModes.indexOf(mode ?? "texture-validation") + 1 || 8;
}
export function initialTextureScene(stage = 8): TextureScene {
  return {
    yaw: -0.65,
    pitch: 0.12,
    distance: 3.8,
    preset: 2,
    sample: { x: 0.5, y: 0.5 },
    sampleUv: { x: 0.62, y: 0.38 },
    view: stage >= 6 ? "compare" : "affine",
    address: "clamp",
    debug: stage < 8,
    paused: true,
    phase: 0,
  };
}
export function presetTexture(scene: TextureScene, preset: number, stage = 8): TextureScene {
  let yaw = -0.65,
    pitch = 0.12,
    distance = 3.8;
  if (preset === 1) {
    yaw = 0;
    pitch = 0;
    distance = 4;
  }
  if (preset === 3) {
    yaw = -1.12;
    pitch = 0.22;
    distance = 3.2;
  }
  if (preset === 4 && stage >= 7) {
    yaw = -1.1;
    pitch = 0.12;
    distance = 1.6;
  }
  return { ...scene, yaw, pitch, distance, preset, phase: 0, paused: true };
}
export function tiltTexture(scene: TextureScene, dx: number, dy: number): TextureScene {
  return {
    ...scene,
    yaw: Math.max(-1.25, Math.min(1.25, scene.yaw + dx)),
    pitch: Math.max(-0.8, Math.min(0.8, scene.pitch + dy)),
    preset: 0,
    paused: true,
  };
}
export function advanceTexture(scene: TextureScene, dt: number, stage = 8): TextureScene {
  if (stage < 8 || scene.paused || !Number.isFinite(dt) || dt <= 0) return scene;
  const phase = (scene.phase + Math.min(dt, 0.05)) % (2 * Math.PI);
  return {
    ...scene,
    phase,
    yaw: Math.max(
      -1.25,
      Math.min(1.25, scene.yaw + 0.5 * (Math.sin(phase) - Math.sin(scene.phase))),
    ),
    preset: 0,
  };
}
// Analytic quad-plane intersection; no triangle, barycentric or UV interpolation.
export function referenceTextureUv(
  scene: TextureScene,
  pixel: TextureVec2,
  width: number,
  height: number,
): TextureVec2 | undefined {
  const focalPixels = (height * 0.5) / Math.tan(Math.PI / 6);
  const ray = {
    x: (pixel.x - width * 0.5) / focalPixels,
    y: (height * 0.5 - pixel.y) / focalPixels,
    z: 1,
  };
  const origin = textureRotateX(
    textureRotateY({ x: 0, y: 0, z: -scene.distance }, -scene.yaw),
    -scene.pitch,
  );
  const direction = textureRotateX(textureRotateY(ray, -scene.yaw), -scene.pitch);
  if (Math.abs(direction.z) < 1e-12) return;
  const t = -origin.z / direction.z;
  if (!Number.isFinite(t) || t < 1) return;
  const uv = {
    x: (origin.x + direction.x * t + 1.6) / 3.2,
    y: (1 - origin.y - direction.y * t) / 2,
  };
  if (uv.x >= -1e-9 && uv.x <= 1 + 1e-9 && uv.y >= -1e-9 && uv.y <= 1 + 1e-9) return uv;
}
export interface TextureInspection {
  pixel: TextureVec2;
  weights: TextureBarycentric;
  affineUv: TextureVec2;
  referenceUv?: TextureVec2;
  correctedUv?: TextureVec2;
  denominator?: number;
  texel: { x: number; y: number };
  error?: number;
}
export interface TextureFrame {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  owners: Uint8Array;
  uv: Float64Array;
  triangles: TextureVec2[][];
  corners: (TextureVec2 | undefined)[];
  inspection?: TextureInspection;
}
export function textureFrame(
  scene: TextureScene,
  stage: number,
  width: number,
  height: number,
  corrected = false,
): TextureFrame {
  const pixels = new Uint8ClampedArray(width * height * 4),
    owners = new Uint8Array(width * height),
    uv = new Float64Array(width * height * 2);
  const quad = makeTextureQuad(scene.yaw, scene.pitch, scene.distance);
  const frame: TextureFrame = {
    width,
    height,
    pixels,
    owners,
    uv,
    triangles: [],
    corners: quad.vertices.map((v) => projectTextureVertex(v, width, height)),
  };
  const selectedX = Math.floor(scene.sample.x * width),
    selectedY = Math.floor(scene.sample.y * height);
  for (const face of quad.faces) {
    const original = face.map((i) => quad.vertices[i]) as unknown as TextureTriangle;
    const polygon = stage >= 7 ? clipTextureTriangleNearPlane(original) : original;
    for (let i = 1; i + 1 < polygon.length; i++) {
      const vertices = [polygon[0], polygon[i], polygon[i + 1]] as [
        TextureTriangle[0],
        TextureTriangle[1],
        TextureTriangle[2],
      ];
      const projected = vertices.map((v) => projectTextureVertex(v, width, height));
      if (!projected[0] || !projected[1] || !projected[2]) continue;
      const p = projected as [TextureVec2, TextureVec2, TextureVec2];
      let area = textureEdge(p[0], p[1], p[2]);
      if (!Number.isFinite(area) || Math.abs(area) < 1e-10) continue;
      if (area < 0) {
        [p[1], p[2]] = [p[2], p[1]];
        [vertices[1], vertices[2]] = [vertices[2], vertices[1]];
        area = -area;
      }
      frame.triangles.push(p);
      if (stage < 3) continue;
      const x0 = Math.max(0, Math.floor(Math.min(...p.map((v) => v.x)))),
        x1 = Math.min(width - 1, Math.ceil(Math.max(...p.map((v) => v.x))) - 1);
      const y0 = Math.max(0, Math.floor(Math.min(...p.map((v) => v.y)))),
        y1 = Math.min(height - 1, Math.ceil(Math.max(...p.map((v) => v.y))) - 1);
      const edges = [
        textureTopLeft(p[1], p[2]),
        textureTopLeft(p[2], p[0]),
        textureTopLeft(p[0], p[1]),
      ];
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const point = { x: x + 0.5, y: y + 0.5 };
          const a = textureEdge(p[1], p[2], point),
            b = textureEdge(p[2], p[0], point),
            c = textureEdge(p[0], p[1], point);
          if (![a, b, c].every((e, j) => e > 0 || (e === 0 && edges[j]))) continue;
          const weights = { a: a / area, b: b / area, c: c / area };
          const affineUv = interpolateTextureAffineUv(vertices, weights);
          const correctedUv =
            stage >= 6 ? interpolateTexturePerspectiveUv(vertices, weights) : undefined;
          const selectedUv = corrected && correctedUv ? correctedUv : affineUv;
          const index = y * width + x,
            color = checkerTextureColor(selectedUv, scene.address);
          owners[index]++;
          uv[index * 2] = selectedUv.x;
          uv[index * 2 + 1] = selectedUv.y;
          pixels[index * 4] = color[0];
          pixels[index * 4 + 1] = color[1];
          pixels[index * 4 + 2] = color[2];
          pixels[index * 4 + 3] = 255;
          if (stage >= 4 && x === selectedX && y === selectedY) {
            const referenceUv = referenceTextureUv(scene, point, width, height);
            frame.inspection = {
              pixel: point,
              weights,
              affineUv,
              referenceUv,
              correctedUv,
              denominator: stage >= 5 ? reciprocalTextureDenominator(vertices, weights) : undefined,
              texel: nearestTextureTexel(selectedUv, 64, 64, scene.address),
              error: referenceUv ? textureUvDistance(affineUv, referenceUv) : undefined,
            };
          }
        }
    }
  }
  return frame;
}
