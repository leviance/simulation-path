import {
  add3,
  subtract3,
  scale3,
  triangleEdges,
  triangleRawNormal,
  triangleUnitNormal,
  triangleCentroid,
  triangleArea,
  magnitude3,
  facingAmount,
  isDegenerateTriangle,
  orthogonalityError,
  reverseWinding,
  type Triangle3,
  type Vec3,
} from "./normal.ts";
import {
  initialCompassCamera,
  compassEye,
  orbitCompass,
  type CompassCamera,
} from "./normal-camera.ts";
export const compassVertices = ["a", "b", "c"] as const;
export type CompassVertex = (typeof compassVertices)[number];
export interface CompassScene {
  triangle: Triangle3;
  camera: CompassCamera;
  selected: CompassVertex;
  paused: boolean;
}
export function initialCompassScene(): CompassScene {
  return {
    triangle: { a: { x: -1, y: -1, z: 0 }, b: { x: 1, y: -1, z: 0 }, c: { x: 0, y: 1, z: 1 } },
    camera: initialCompassCamera(),
    selected: "c",
    paused: true,
  };
}
export function compassStage(mode?: string): number {
  return (
    (
      {
        "normal-axes": 1,
        "normal-edges": 2,
        "normal-cross": 3,
        "normal-unit-area": 4,
        "normal-winding": 5,
        "normal-camera": 6,
        "normal-full": 7,
      } as Record<string, number>
    )[mode ?? ""] ?? 7
  );
}
export function compassResults(scene: CompassScene) {
  const triangle = scene.triangle,
    edges = triangleEdges(triangle),
    raw = triangleRawNormal(triangle),
    valid = !isDegenerateTriangle(triangle),
    unit = triangleUnitNormal(triangle),
    centroid = triangleCentroid(triangle);
  const facing = valid
    ? facingAmount(triangle, subtract3(compassEye(scene.camera), centroid))
    : null;
  return {
    edges,
    raw,
    unit,
    centroid,
    valid,
    area: triangleArea(triangle),
    error: orthogonalityError(triangle),
    rawLength: magnitude3(raw),
    facing,
    status:
      facing === null
        ? "Không xác định"
        : Math.abs(facing) <= 1e-6
          ? "edge-on"
          : facing > 0
            ? "front"
            : "back",
    rawTip: add3(triangle.a, scale3(unit, Math.min(2.2, 0.2 * magnitude3(raw)))),
    unitTip: add3(centroid, scale3(unit, 1.4)),
  };
}
export function changeCompassVertex(
  scene: CompassScene,
  axis: keyof Vec3,
  value: number,
): CompassScene {
  if (!Number.isFinite(value)) return scene;
  const vertex = { ...scene.triangle[scene.selected], [axis]: Math.max(-2, Math.min(2, value)) };
  return { ...scene, triangle: { ...scene.triangle, [scene.selected]: vertex } };
}
export function moveCompassVertex(scene: CompassScene, delta: Vec3): CompassScene {
  if (![delta.x, delta.y, delta.z].every(Number.isFinite)) return scene;
  let next = scene;
  for (const axis of ["x", "y", "z"] as const)
    next = changeCompassVertex(next, axis, scene.triangle[scene.selected][axis] + delta[axis]);
  return next;
}
export function flipCompass(scene: CompassScene): CompassScene {
  return { ...scene, triangle: reverseWinding(scene.triangle) };
}
export function compassPreset(index: number): CompassScene {
  const scene = initialCompassScene();
  if (index === 1)
    scene.triangle = {
      a: { x: -1.5, y: -2, z: 0 },
      b: { x: 1.5, y: -2, z: 0 },
      c: { x: -1.5, y: 2, z: 0 },
    };
  if (index === 2)
    scene.triangle = { a: { x: -1, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 }, c: { x: 1, y: 0, z: 0 } };
  if (index === 3)
    scene.triangle = { a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 }, c: { x: 1, y: 1, z: 1 } };
  if (index === 4)
    scene.triangle = {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 1, y: 0, z: 0 },
      c: { x: 2, y: 1e-7, z: 0 },
    };
  return scene;
}
export function advanceCompass(scene: CompassScene, dt: number): CompassScene {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return scene;
  return { ...scene, camera: orbitCompass(scene.camera, (0.35 * dt) / 0.008, 0) };
}
