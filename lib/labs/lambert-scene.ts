import {
  lambertCube,
  lambertSubtract as sub,
  lambertRotateX as rx,
  lambertRotateY as ry,
  lambertNormalize as unit,
  lambertFaceVertices,
  lambertFaceNormal,
  lambertFaceCentroid,
  lambertIsFrontFacing,
  lambertLightingSample,
  shadeLambertColor,
  transformLambertMesh,
  projectLambertVertex,
  type LambertVec3,
  type LambertColor,
} from "./lambert.ts";
import { clipNearTriangle, triangulateNearPolygon } from "./near-plane.ts";

export interface LambertScene {
  pitch: number;
  yaw: number;
  cameraYaw: number;
  cameraPitch: number;
  distance: number;
  lightAzimuth: number;
  lightElevation: number;
  ambient: number;
  diffuseStrength: number;
  selectedFace: number;
  target: "model" | "camera";
  paused: boolean;
  lighting: boolean;
  normals: boolean;
  debug: boolean;
  palette: boolean;
  culling: boolean;
}
export function lambertStage(mode?: string) {
  return (
    [
      "lambert-mesh",
      "lambert-normal",
      "lambert-light",
      "lambert-dot",
      "lambert-material",
      "lambert-culling",
      "lambert-validation",
    ].indexOf(mode ?? "lambert-validation") + 1 || 7
  );
}
export function initialLambertScene(stage = 7): LambertScene {
  return {
    pitch: -0.3,
    yaw: 0.6,
    cameraYaw: 0,
    cameraPitch: 0,
    distance: 5.5,
    lightAzimuth: 0.6,
    lightElevation: 0.5,
    ambient: 0.16,
    diffuseStrength: 0.84,
    selectedFace: 0,
    target: "model",
    paused: true,
    lighting: stage >= 4,
    normals: false,
    debug: stage < 7,
    palette: stage === 1,
    culling: stage >= 6,
  };
}
export function cameraPosition(s: LambertScene) {
  return ry(rx({ x: 0, y: 0, z: -s.distance }, s.cameraPitch), s.cameraYaw);
}
export function worldToView(p: LambertVec3, s: LambertScene) {
  return rx(ry(sub(p, cameraPosition(s)), -s.cameraYaw), -s.cameraPitch);
}
export function directionToView(p: LambertVec3, s: LambertScene) {
  return rx(ry(p, -s.cameraYaw), -s.cameraPitch);
}
export function orbitLight(azimuth: number, elevation: number) {
  const radius = Math.cos(elevation);
  return unit({
    x: radius * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: -radius * Math.cos(azimuth),
  });
}
export function presetLambert(s: LambertScene, preset: number): LambertScene {
  const azimuth = [0, 0, Math.PI / 2, Math.PI][preset - 1];
  if (azimuth === undefined) return s;
  return { ...s, lightAzimuth: azimuth, lightElevation: preset === 2 ? 1.4 : 0, paused: true };
}
export function advanceLambert(s: LambertScene, dt: number, stage: number): LambertScene {
  if (stage < 3 || s.paused || !Number.isFinite(dt) || dt <= 0) return s;
  let azimuth = (s.lightAzimuth + Math.min(dt, 0.05) * 0.65) % (Math.PI * 2);
  if (azimuth > Math.PI) azimuth -= Math.PI * 2;
  if (azimuth < -Math.PI) azimuth += Math.PI * 2;
  return { ...s, lightAzimuth: azimuth };
}
export function dragLambert(s: LambertScene, dx: number, dy: number, stage: number): LambertScene {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return s;
  const clamp = (v: number) => Math.max(-1.4, Math.min(1.4, v));
  if (stage >= 6 && s.target === "camera")
    return {
      ...s,
      cameraYaw: s.cameraYaw + dx * 0.008,
      cameraPitch: clamp(s.cameraPitch + dy * 0.008),
      paused: true,
    };
  return { ...s, yaw: s.yaw + dx * 0.008, pitch: clamp(s.pitch + dy * 0.008), paused: true };
}
export function editLambert(
  s: LambertScene,
  key: "lightAzimuth" | "lightElevation" | "ambient" | "diffuseStrength" | "distance",
  value: number,
) {
  if (!Number.isFinite(value)) return s;
  const bounds = {
    lightAzimuth: [-Math.PI, Math.PI],
    lightElevation: [-1.4, 1.4],
    ambient: [0, 1],
    diffuseStrength: [0, 1],
    distance: [3, 9],
  }[key];
  return { ...s, [key]: Math.max(bounds[0], Math.min(bounds[1], value)), paused: true };
}
export const faceNames = ["Trước", "Sau", "Trái", "Phải", "Trên", "Dưới"];
export const palette: LambertColor[] = [
  { red: 239, green: 90, blue: 102 },
  { red: 92, green: 140, blue: 246 },
  { red: 169, green: 112, blue: 232 },
  { red: 74, green: 214, blue: 166 },
  { red: 246, green: 184, blue: 72 },
  { red: 55, green: 190, blue: 220 },
];
export function lambertFaces(s: LambertScene, stage: number) {
  const world = transformLambertMesh(lambertCube, s.pitch, s.yaw, { x: 0, y: 0, z: 0 });
  const light = orbitLight(s.lightAzimuth, s.lightElevation);
  return world.faces.map((face, index) => {
    const vertices = lambertFaceVertices(world, face);
    const normal = lambertFaceNormal(vertices);
    const sample = lambertLightingSample(
      normal,
      light,
      stage >= 5 ? s.ambient : 0,
      stage >= 5 ? s.diffuseStrength : 1,
    );
    const base = s.palette ? palette[face.side] : face.baseColor;
    let color = base;
    if (stage >= 4 && s.lighting)
      color = shadeLambertColor(
        stage >= 5 ? base : { red: 220, green: 220, blue: 220 },
        sample.intensity,
      );
    return {
      index,
      side: face.side,
      vertices,
      normal,
      centroid: lambertFaceCentroid(vertices),
      sample,
      color,
      front: lambertIsFrontFacing(vertices, cameraPosition(s)),
    };
  });
}
export function lambertFrame(
  s: LambertScene,
  stage = 7,
  width = 480,
  height = 320,
  reverse = false,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > 1024 ||
    height > 1024
  )
    throw RangeError("Canvas frame dimensions");
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 17;
    pixels[i + 1] = 24;
    pixels[i + 2] = 43;
    pixels[i + 3] = 255;
  }
  const depth = new Float64Array(width * height),
    owner = new Int16Array(width * height).fill(-1);
  const faces = lambertFaces(s, stage);
  const order = reverse ? [...faces].reverse() : faces;
  let covered = 0,
    passed = 0,
    culled = 0;
  for (const face of order) {
    if (stage >= 6 && s.culling && !face.front) {
      culled++;
      continue;
    }
    const vertices = face.vertices.map((p) => ({ position: worldToView(p, s), color: face.color }));
    const polygon = clipNearTriangle({ a: vertices[0], b: vertices[1], c: vertices[2] }, 0.5);
    for (const triangle of triangulateNearPolygon(polygon)) {
      const points = [triangle.a, triangle.b, triangle.c].map((v) => ({
        ...projectLambertVertex(v.position, width, height)!,
        inverseZ: 1 / v.position.z,
      }));
      const a = points[0];
      let b = points[1];
      let c = points[2];
      const edge = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        x: number,
        y: number,
      ) => (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
      let area = edge(a, b, c.x, c.y);
      if (!Number.isFinite(area) || Math.abs(area) < 1e-10) continue;
      if (area < 0) {
        [b, c] = [c, b];
        area = -area;
      }
      const lowX = Math.max(0, Math.min(width - 1, Math.floor(Math.min(a.x, b.x, c.x))));
      const highX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)) - 1);
      const lowY = Math.max(0, Math.min(height - 1, Math.floor(Math.min(a.y, b.y, c.y))));
      const highY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)) - 1);
      const top = (p: { x: number; y: number }, q: { x: number; y: number }) =>
        q.y < p.y || (q.y === p.y && q.x > p.x);
      const accepts = (e: number, t: boolean) => e > 0 || (e === 0 && t);
      for (let y = lowY; y <= highY; y++)
        for (let x = lowX; x <= highX; x++) {
          const wa = edge(b, c, x + 0.5, y + 0.5),
            wb = edge(c, a, x + 0.5, y + 0.5),
            wc = edge(a, b, x + 0.5, y + 0.5);
          if (!accepts(wa, top(b, c)) || !accepts(wb, top(c, a)) || !accepts(wc, top(a, b)))
            continue;
          covered++;
          const z = (wa * a.inverseZ + wb * b.inverseZ + wc * c.inverseZ) / area,
            pixel = y * width + x;
          if (z <= depth[pixel]) continue;
          depth[pixel] = z;
          owner[pixel] = face.index;
          passed++;
          pixels[pixel * 4] = Math.round(face.color.red);
          pixels[pixel * 4 + 1] = Math.round(face.color.green);
          pixels[pixel * 4 + 2] = Math.round(face.color.blue);
        }
    }
  }
  return { width, height, pixels, depth, owner, faces, covered, passed, culled };
}
