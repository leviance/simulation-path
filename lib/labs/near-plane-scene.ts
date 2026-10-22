import {
  classifyNearTriangle,
  cloneNearVertex,
  intersectNearPlane,
  maximumNearViolation,
  nearTriangleVertices,
  nearVertexIsInside,
  projectNearTriangle,
  projectNearVertex,
  traceNearPlaneClip,
  triangulateNearPolygon,
  type NearColor,
  type NearTriangle,
  type NearVec3,
  type NearVertex,
} from "./near-plane.ts";
import { rasterizeTriangleCoverage, type RasterTriangle } from "./triangle-raster.ts";

export type NearPreset = "inside" | "one-out" | "two-out" | "outside" | "on-plane";
export type NearPolicy = "clip" | "discard";
export const nearPresets: NearPreset[] = ["inside", "one-out", "two-out", "outside", "on-plane"];
export interface NearScene {
  preset: NearPreset;
  nearPlane: number;
  depthOffset: number;
  camera: NearVec3;
  direction: number;
  paused: boolean;
  debug: boolean;
  policy: NearPolicy;
  edgeLimit: number;
}
const vertex = (x: number, y: number, z: number, index: number): NearVertex => ({
  position: { x, y, z },
  color: [
    { red: 255, green: 92, blue: 106 },
    { red: 78, green: 232, blue: 163 },
    { red: 93, green: 145, blue: 255 },
  ][index],
});
export function nearPresetTriangle(preset: NearPreset): NearTriangle {
  const coordinates = {
    inside: [
      [-1, -0.8, 2.1],
      [1.1, -0.7, 3.2],
      [0, 1, 2.6],
    ],
    "one-out": [
      [-1.15, -0.85, 0.45],
      [1.15, -0.7, 3.2],
      [0, 1.05, 2.25],
    ],
    "two-out": [
      [-1.1, -0.8, 0.35],
      [1.1, -0.7, 0.55],
      [0, 1, 2.8],
    ],
    outside: [
      [-1, -0.8, 0.25],
      [1, -0.7, 0.45],
      [0, 1, 0.65],
    ],
    "on-plane": [
      [-1, -0.8, 1],
      [1, -0.7, 2.8],
      [0, 1, 1],
    ],
  }[preset];
  return {
    a: vertex(coordinates[0][0], coordinates[0][1], coordinates[0][2], 0),
    b: vertex(coordinates[1][0], coordinates[1][1], coordinates[1][2], 1),
    c: vertex(coordinates[2][0], coordinates[2][1], coordinates[2][2], 2),
  };
}
export function nearStage(mode?: string): number {
  return (
    {
      "near-scene": 1,
      "near-classify": 2,
      "near-intersection": 3,
      "near-polygon": 4,
      "near-triangulate": 5,
      "near-raster": 6,
      "near-validation": 7,
      "near-showcase": 8,
    }[mode ?? "near-showcase"] ?? 8
  );
}
export function initialNearScene(stage = 8, preset?: NearPreset): NearScene {
  return {
    preset: preset ?? (stage >= 8 ? "one-out" : "inside"),
    nearPlane: 1,
    depthOffset: 0,
    camera: { x: 0, y: 0, z: 0 },
    direction: 1,
    paused: true,
    debug: true,
    policy: stage >= 6 ? "clip" : "discard",
    edgeLimit: 3,
  };
}
export function nearCameraTriangle(scene: NearScene): NearTriangle {
  const moved = nearTriangleVertices(nearPresetTriangle(scene.preset)).map((source) => {
    const v = cloneNearVertex(source);
    v.position.x -= scene.camera.x;
    v.position.y -= scene.camera.y;
    v.position.z += scene.depthOffset - scene.camera.z;
    return v;
  });
  return { a: moved[0], b: moved[1], c: moved[2] };
}
export function editNearDepth(scene: NearScene, value: number): NearScene {
  if (!Number.isFinite(value)) return scene;
  return { ...scene, paused: true, depthOffset: Math.max(-4, Math.min(3, value)) };
}
export function editNearPlane(scene: NearScene, value: number): NearScene {
  if (!Number.isFinite(value)) return scene;
  return { ...scene, paused: true, nearPlane: Math.max(0.25, Math.min(2, value)) };
}
export function editNearCamera(scene: NearScene, axis: "x" | "z", value: number): NearScene {
  if (!Number.isFinite(value)) return scene;
  const limit = axis === "x" ? 1 : 0.5;
  return {
    ...scene,
    paused: true,
    camera: { ...scene.camera, [axis]: Math.max(-limit, Math.min(limit, value)) },
  };
}
export function stepNearSweep(scene: NearScene, distance = 0.08): NearScene {
  if (!Number.isFinite(distance) || distance < 0) return scene;
  let offset = scene.depthOffset + scene.direction * distance;
  let direction = scene.direction;
  if (offset >= 3) {
    offset = 3;
    direction = -1;
  }
  if (offset <= -4) {
    offset = -4;
    direction = 1;
  }
  return { ...scene, depthOffset: offset, direction };
}
export function advanceNearScene(scene: NearScene, dt: number, heldAxis = 0): NearScene {
  if (!Number.isFinite(dt) || dt <= 0 || ![-1, 0, 1].includes(heldAxis)) return scene;
  const seconds = Math.min(dt, 0.05);
  if (heldAxis !== 0) return editNearDepth(scene, scene.depthOffset + heldAxis * seconds);
  return scene.paused ? scene : stepNearSweep(scene, 0.75 * seconds);
}
export function nearLogicalHeight(scene: NearScene) {
  return scene.debug ? 600 : 800;
}

export interface NearFragment {
  x: number;
  y: number;
  color: NearColor;
}
export function nearFrame(
  scene: NearScene,
  stage: number,
  width = 220,
  height = scene.debug ? 120 : 160,
) {
  // Both dimensions are bounded before the rasterizer can allocate or loop.
  const validSize =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width > 0 &&
    height > 0 &&
    width <= 220 &&
    height <= 160;
  const source = nearCameraTriangle(scene);
  const counts = classifyNearTriangle(source, scene.nearPlane);
  const steps = stage >= 4 ? traceNearPlaneClip(source, scene.nearPlane) : [];
  const polygon = stage >= 4 ? (steps.at(-1)?.output ?? []) : [];
  const batch = stage >= 5 ? triangulateNearPolygon(polygon) : [];
  const clipped = stage >= 6 && scene.policy === "clip";
  const output = clipped ? batch : counts.valid && counts.outside === 0 ? [source] : [];
  const fragments: NearFragment[] = [];
  let candidates = 0;
  let rendered = 0;
  if (validSize) {
    for (const triangle of output) {
      const projected = projectNearTriangle(triangle, Math.PI / 3, width / height, scene.nearPlane);
      if (!projected) continue;
      rendered++;
      const points = projected.map((p) => ({
        x: ((p.x + 1) * width) / 2,
        y: ((1 - p.y) * height) / 2,
      }));
      const raster: RasterTriangle = { a: points[0], b: points[1], c: points[2] };
      // P16 returns weights in INPUT order, even for a reversed winding.
      const coverage = rasterizeTriangleCoverage(raster, width, height, "top-left");
      candidates += coverage.candidateCount;
      for (const fragment of coverage.fragments) {
        const w = fragment.sample.barycentric;
        const channel = (key: keyof NearColor) =>
          w.a * projected[0].color[key] +
          w.b * projected[1].color[key] +
          w.c * projected[2].color[key];
        fragments.push({
          x: fragment.x,
          y: fragment.y,
          color: { red: channel("red"), green: channel("green"), blue: channel("blue") },
        });
      }
    }
  }
  const visiblePolygon =
    stage === 4 && scene.edgeLimit < 3
      ? scene.edgeLimit === 0
        ? []
        : (steps[scene.edgeLimit - 1]?.output ?? [])
      : polygon;
  const intersections =
    stage < 3
      ? []
      : nearTriangleVertices(source).flatMap((start, i, input) => {
          const end = input[(i + 1) % 3];
          if (
            nearVertexIsInside(start, scene.nearPlane) === nearVertexIsInside(end, scene.nearPlane)
          )
            return [];
          const hit = intersectNearPlane(start, end, scene.nearPlane);
          return hit ? [hit] : [];
        });
  return {
    source,
    counts,
    steps,
    polygon,
    batch,
    visiblePolygon,
    intersections,
    fragments,
    covered: fragments.length,
    candidates,
    rendered,
    width,
    height,
    violation: maximumNearViolation(polygon, scene.nearPlane),
  };
}
export function nearGridLines(scene: NearScene) {
  const height = nearLogicalHeight(scene);
  const output: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
  const line = (a: NearVec3, b: NearVec3) => {
    const view = (v: NearVec3): NearVertex => ({
      position: { x: v.x - scene.camera.x, y: v.y - scene.camera.y, z: v.z - scene.camera.z },
      color: { red: 0, green: 0, blue: 0 },
    });
    let p = view(a),
      q = view(b);
    const insideP = nearVertexIsInside(p, scene.nearPlane),
      insideQ = nearVertexIsInside(q, scene.nearPlane);
    if (!insideP && !insideQ) return;
    if (insideP !== insideQ) {
      const hit = intersectNearPlane(p, q, scene.nearPlane);
      if (!hit) return;
      if (!insideP) p = hit.vertex;
      else q = hit.vertex;
    }
    const first = projectNearVertex(p, Math.PI / 3, 1100 / height, scene.nearPlane);
    const last = projectNearVertex(q, Math.PI / 3, 1100 / height, scene.nearPlane);
    const screen = (v: { x: number; y: number }) => ({
      x: (v.x + 1) * 550,
      y: ((1 - v.y) * height) / 2,
    });
    if (first && last) output.push({ a: screen(first), b: screen(last) });
  };
  for (let x = -6; x <= 6; x++) line({ x, y: -1.8, z: 2 }, { x, y: -1.8, z: 9 });
  for (let z = 2; z <= 9; z++) line({ x: -6, y: -1.8, z }, { x: 6, y: -1.8, z });
  return output;
}
