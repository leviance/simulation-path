import {
  add,
  scale,
  subtract,
  normalize,
  finite,
  validRay,
  clamp,
  type Ray,
  type Vec3,
} from "./geometry.ts";
import { sampleScene, validScene, FULL_SCENE, type SceneOptions } from "./scene.ts";
export interface MarchSettings {
  maximumSteps: number;
  hitEpsilon: number;
  maximumDistance: number;
  normalEpsilon: number;
}
export type MarchStatus =
  | "hit"
  | "distanceLimit"
  | "stepLimit"
  | "invalidInput"
  | "invalidSample"
  | "stalled"
  | "emptyScene";
export interface MarchResult {
  hit: boolean;
  traveled: number;
  steps: number;
  materialId: number;
  position: Vec3;
  status: MarchStatus;
}
export interface MarchTraceStep {
  position: Vec3;
  distance: number;
  traveled: number;
  step: number;
}
export const DEFAULT_MARCH_SETTINGS: MarchSettings = {
  maximumSteps: 128,
  hitEpsilon: 0.0015,
  maximumDistance: 30,
  normalEpsilon: 0.001,
};
export function validSettings(s: MarchSettings) {
  return (
    Number.isInteger(s.maximumSteps) &&
    s.maximumSteps >= 1 &&
    s.maximumSteps <= 256 &&
    Number.isFinite(s.hitEpsilon) &&
    s.hitEpsilon >= 1e-5 &&
    s.hitEpsilon <= 0.02 &&
    Number.isFinite(s.maximumDistance) &&
    s.maximumDistance >= 0.1 &&
    s.maximumDistance <= 80 &&
    Number.isFinite(s.normalEpsilon) &&
    s.normalEpsilon >= 1e-5 &&
    s.normalEpsilon <= 0.02
  );
}
function walkRay(
  ray: Ray,
  settings: MarchSettings,
  scene: SceneOptions,
  trace?: MarchTraceStep[],
): MarchResult {
  const result: MarchResult = {
    hit: false,
    traveled: 0,
    steps: 0,
    materialId: 0,
    position: { ...ray.origin },
    status: "invalidInput",
  };
  const finish = (status: MarchStatus) => {
    result.status = status;
    result.position = add(ray.origin, scale(ray.direction, result.traveled));
    return result;
  };
  if (!validRay(ray) || !validSettings(settings) || !validScene(scene)) return result;
  for (let step = 0; step < settings.maximumSteps; step++) {
    result.position = add(ray.origin, scale(ray.direction, result.traveled));
    const sample = sampleScene(result.position, scene);
    result.steps = step + 1;
    trace?.push({
      position: result.position,
      distance: sample.distance,
      traveled: result.traveled,
      step: step + 1,
    });
    if (!finite(result.position) || !Number.isFinite(sample.distance))
      return finish("invalidSample");
    if (sample.materialId === 0) return finish("emptyScene");
    const distanceToSurface = Math.abs(sample.distance);
    if (distanceToSurface <= settings.hitEpsilon) {
      result.hit = true;
      result.materialId = sample.materialId;
      return finish("hit");
    }
    const next = result.traveled + distanceToSurface;
    if (!Number.isFinite(next) || next <= result.traveled) return finish("stalled");
    if (next > settings.maximumDistance || result.traveled === settings.maximumDistance) {
      result.traveled = settings.maximumDistance;
      return finish("distanceLimit");
    }
    result.traveled = next;
  }
  return finish("stepLimit");
}
export const marchRay = (ray: Ray, settings = DEFAULT_MARCH_SETTINGS, scene = FULL_SCENE) =>
  walkRay(ray, settings, scene);
export function traceRay(ray: Ray, settings = DEFAULT_MARCH_SETTINGS, scene = FULL_SCENE) {
  const trace: MarchTraceStep[] = [];
  return { result: walkRay(ray, settings, scene, trace), trace };
}
export function estimateNormal(
  point: Vec3,
  scene: SceneOptions = FULL_SCENE,
  epsilon = 0.001,
): Vec3 {
  if (!finite(point) || !Number.isFinite(epsilon) || epsilon < 1e-5 || epsilon > 0.02)
    return { x: 0, y: 0, z: 0 };
  const component = (offset: Vec3) =>
    sampleScene(add(point, offset), scene).distance -
    sampleScene(subtract(point, offset), scene).distance;
  return normalize({
    x: component({ x: epsilon, y: 0, z: 0 }),
    y: component({ x: 0, y: epsilon, z: 0 }),
    z: component({ x: 0, y: 0, z: epsilon }),
  });
}
export function traceShadow(
  origin: Vec3,
  direction: Vec3,
  lightDistance: number,
  scene: SceneOptions = FULL_SCENE,
  maximumSteps = 64,
) {
  const result = { visibility: 0, steps: 0, reachedLight: false };
  if (
    !validRay({ origin, direction }) ||
    !validScene(scene) ||
    !Number.isFinite(lightDistance) ||
    lightDistance <= 0 ||
    lightDistance > 80 ||
    !Number.isInteger(maximumSteps) ||
    maximumSteps < 1 ||
    maximumSteps > 128
  )
    return result;
  let traveled = 0.004,
    visibility = 1;
  for (let step = 0; step < maximumSteps; step++) {
    if (traveled >= lightDistance)
      return { visibility: clamp(visibility, 0, 1), steps: result.steps, reachedLight: true };
    const sample = sampleScene(add(origin, scale(direction, traveled)), scene);
    result.steps = step + 1;
    if (!Number.isFinite(sample.distance) || sample.distance <= 0.001) return result;
    visibility = Math.min(visibility, (14 * sample.distance) / traveled);
    traveled += clamp(sample.distance, 0.004, 0.4);
  }
  return result;
}
