import { finite, length, subtract, type Vec3 } from "./geometry.ts";
export interface SceneOptions {
  includeSphere: boolean;
  includeBox: boolean;
  includeTorus: boolean;
  includeRoom: boolean;
  sphereRadius: number;
  torusMinorRadius: number;
}
export interface SceneSample {
  distance: number;
  materialId: number;
}
export const SPHERE_CENTER: Vec3 = { x: -1, y: -0.18, z: 0.15 };
export const FULL_SCENE: SceneOptions = {
  includeSphere: true,
  includeBox: true,
  includeTorus: true,
  includeRoom: true,
  sphereRadius: 0.82,
  torusMinorRadius: 0.22,
};
export const SPHERE_ONLY: SceneOptions = {
  ...FULL_SCENE,
  includeBox: false,
  includeTorus: false,
  includeRoom: false,
};
export const validScene = (s: SceneOptions) =>
  Number.isFinite(s.sphereRadius) &&
  s.sphereRadius >= 0.4 &&
  s.sphereRadius <= 1.1 &&
  Number.isFinite(s.torusMinorRadius) &&
  s.torusMinorRadius >= 0.12 &&
  s.torusMinorRadius <= 0.32;
export const sdSphere = (p: Vec3, center: Vec3, radius: number) =>
  length(subtract(p, center)) - radius;
export function sdBox(p: Vec3, center: Vec3, halfSize: Vec3) {
  const local = subtract(p, center);
  const q = {
    x: Math.abs(local.x) - halfSize.x,
    y: Math.abs(local.y) - halfSize.y,
    z: Math.abs(local.z) - halfSize.z,
  };
  return (
    length({ x: Math.max(q.x, 0), y: Math.max(q.y, 0), z: Math.max(q.z, 0) }) +
    Math.min(Math.max(q.x, q.y, q.z), 0)
  );
}
export const sdTorus = (local: Vec3, majorRadius: number, minorRadius: number) =>
  Math.hypot(Math.hypot(local.x, local.z) - majorRadius, local.y) - minorRadius;
export function torusLocal(point: Vec3): Vec3 {
  const p = subtract(point, { x: 0.05, y: -0.16, z: -1.25 });
  const cosine = 0.5,
    sine = 0.8660254037844386;
  return { x: p.x, y: cosine * p.y + sine * p.z, z: -sine * p.y + cosine * p.z };
}
export function nearer(current: SceneSample, candidate: SceneSample): SceneSample {
  if (candidate.distance < current.distance) return candidate;
  return current;
}
const SLABS: ReadonlyArray<readonly [Vec3, Vec3]> = [
  [
    { x: 0, y: -1.12, z: 0 },
    { x: 3.6, y: 0.12, z: 3.2 },
  ],
  [
    { x: 0, y: 0.6, z: -3.2 },
    { x: 3.6, y: 1.6, z: 0.1 },
  ],
  [
    { x: -3.6, y: 0.6, z: 0 },
    { x: 0.1, y: 1.6, z: 3.2 },
  ],
  [
    { x: 3.6, y: 0.6, z: 0 },
    { x: 0.1, y: 1.6, z: 3.2 },
  ],
  [
    { x: 0, y: 2.3, z: 0 },
    { x: 3.6, y: 0.1, z: 3.2 },
  ],
];
export function sampleScene(point: Vec3, scene: SceneOptions = FULL_SCENE): SceneSample {
  if (!finite(point) || !validScene(scene)) return { distance: NaN, materialId: 0 };
  let sample: SceneSample = { distance: 1e6, materialId: 0 };
  if (scene.includeSphere)
    sample = nearer(sample, {
      distance: sdSphere(point, SPHERE_CENTER, scene.sphereRadius),
      materialId: 1,
    });
  if (scene.includeBox)
    sample = nearer(sample, {
      distance: sdBox(point, { x: 1, y: -0.32, z: 0.1 }, { x: 0.62, y: 0.68, z: 0.62 }),
      materialId: 2,
    });
  if (scene.includeTorus)
    sample = nearer(sample, {
      distance: sdTorus(torusLocal(point), 0.72, scene.torusMinorRadius),
      materialId: 3,
    });
  if (scene.includeRoom)
    for (const [center, halfSize] of SLABS)
      sample = nearer(sample, { distance: sdBox(point, center, halfSize), materialId: 4 });
  return sample;
}
