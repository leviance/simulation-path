import { add3, subtract3, scale3, cross3, magnitude3, normalize3, type Vec3 } from "./normal.ts";
import {
  DEFAULT_WORLD_TRIANGLE,
  toLocalTriangle3,
  translateTriangle3,
  rotateTriangle3,
  rotateEuler3,
  rotationTriangleCentroid,
  maximumEdgeLengthError3,
  rotationRoundTripError3,
  type EulerAngles,
  type RotationOrder,
} from "./rotation3d.ts";
import {
  finitePoint,
  projectPerspective,
  type PointLens,
  type PointViewport,
} from "./projection-point.ts";
export interface RotationScene {
  camera: { position: Vec3 };
  lens: PointLens;
  position: Vec3;
  angles: EulerAngles;
  order: RotationOrder;
  sensitivity: number;
  paused: boolean;
  debug: boolean;
}
export const rotationViewport = (): PointViewport => ({ x: 30, y: 100, width: 1040, height: 600 });
export const initialRotationScene = (): RotationScene => ({
  camera: { position: { x: 0, y: 0, z: 0 } },
  lens: { verticalFovRadians: Math.PI / 3, nearPlane: 0.5, farPlane: 16 },
  position: { x: 0, y: 0, z: 6 },
  angles: { pitch: 0, yaw: 0, roll: 0 },
  order: "xyz",
  sensitivity: 0.008,
  paused: true,
  debug: true,
});
export const rotationStage = (mode?: string): number =>
  ({
    "rotation-triangle": 1,
    "rotation-pivot": 2,
    "rotation-x": 3,
    "rotation-euler": 4,
    "rotation-normal": 5,
    "rotation-mouse": 6,
    "rotation-motion": 7,
    "rotation-full": 8,
  })[mode ?? "rotation-full"] ?? 8;
export function rotationPreset(index: number): RotationScene {
  const s = initialRotationScene();
  if (index === 1) s.angles = { pitch: Math.PI / 2, yaw: Math.PI / 2, roll: 0 };
  if (index === 2) s.angles = { pitch: 0.4, yaw: 0.7, roll: -0.3 };
  if (index === 3) s.position.z = 0.7;
  if (index === 4) {
    s.position.x = 4;
    s.position.z = 2;
  }
  return s;
}
export function wrapRotationAngle(angle: number) {
  let wrapped = angle % (2 * Math.PI);
  if (wrapped > Math.PI) wrapped -= 2 * Math.PI;
  if (wrapped < -Math.PI) wrapped += 2 * Math.PI;
  return wrapped;
}
export function changeRotationAngle(
  scene: RotationScene,
  key: keyof EulerAngles,
  value: number,
): RotationScene {
  if (!Number.isFinite(value)) return scene;
  return { ...scene, paused: true, angles: { ...scene.angles, [key]: wrapRotationAngle(value) } };
}
export function moveRotationModel(scene: RotationScene, delta: Vec3): RotationScene {
  if (!finitePoint(delta)) return scene;
  return {
    ...scene,
    paused: true,
    position: {
      x: Math.max(-4, Math.min(4, scene.position.x + delta.x)),
      y: Math.max(-4, Math.min(4, scene.position.y + delta.y)),
      z: Math.max(0.1, Math.min(15, scene.position.z + delta.z)),
    },
  };
}
export function setRotationPosition(
  scene: RotationScene,
  axis: keyof Vec3,
  value: number,
): RotationScene {
  if (!Number.isFinite(value)) return scene;
  return moveRotationModel(scene, {
    x: axis === "x" ? value - scene.position.x : 0,
    y: axis === "y" ? value - scene.position.y : 0,
    z: axis === "z" ? value - scene.position.z : 0,
  });
}
export function applyMouseDrag(
  angles: EulerAngles,
  dx: number,
  dy: number,
  sensitivity: number,
): EulerAngles {
  if (
    ![angles.pitch, angles.yaw, angles.roll, dx, dy, sensitivity].every(Number.isFinite) ||
    sensitivity < 0.002 ||
    sensitivity > 0.02
  )
    return angles;
  return {
    ...angles,
    yaw: wrapRotationAngle(angles.yaw + dx * sensitivity),
    pitch: wrapRotationAngle(angles.pitch - dy * sensitivity),
  };
}
export function advanceRotation(scene: RotationScene, dt: number): RotationScene {
  if (
    !Number.isFinite(dt) ||
    dt <= 0 ||
    ![scene.angles.pitch, scene.angles.yaw, scene.angles.roll].every(Number.isFinite)
  )
    return scene;
  const step = Math.min(dt, 0.1),
    a = scene.angles;
  return {
    ...scene,
    angles: {
      pitch: wrapRotationAngle(a.pitch + 0.35 * step),
      yaw: wrapRotationAngle(a.yaw + 0.55 * step),
      roll: wrapRotationAngle(a.roll + 0.2 * step),
    },
  };
}
export function triangleUnitNormal(triangle: { a: Vec3; b: Vec3; c: Vec3 }) {
  return normalize3(cross3(subtract3(triangle.b, triangle.a), subtract3(triangle.c, triangle.a)));
}
export function rotationResults(scene: RotationScene, stage: number) {
  const local = toLocalTriangle3(DEFAULT_WORLD_TRIANGLE);
  const angles = {
    pitch: stage >= 3 ? scene.angles.pitch : 0,
    yaw: stage >= 4 ? scene.angles.yaw : 0,
    roll: stage >= 4 ? scene.angles.roll : 0,
  };
  const order = stage >= 4 ? scene.order : "xyz",
    rotated = rotateTriangle3(local, angles, order);
  const world =
    stage >= 2
      ? translateTriangle3(rotated, scene.position)
      : translateTriangle3(DEFAULT_WORLD_TRIANGLE, subtract3(scene.position, { x: 0, y: 0, z: 6 }));
  const vertices = [world.a, world.b, world.c].map((p) =>
    projectPerspective(p, scene.camera, scene.lens, rotationViewport()),
  );
  const normal = triangleUnitNormal(world),
    center = rotationTriangleCentroid(world);
  const expectedNormal = rotateEuler3(triangleUnitNormal(local), angles, order);
  const otherOrder: RotationOrder = order === "xyz" ? "zyx" : "xyz";
  return {
    local,
    rotated,
    world,
    angles,
    vertices,
    allVisible: vertices.every((p) => p.status === "visible"),
    normal,
    center,
    normalTip: add3(center, scale3(normal, 1.2)),
    normalError: magnitude3(subtract3(normal, expectedNormal)),
    edgeError: maximumEdgeLengthError3(local, rotated),
    roundTrip: rotationRoundTripError3(local.a, angles, order),
    orderDifference: magnitude3(subtract3(rotated.a, rotateEuler3(local.a, angles, otherOrder))),
  };
}
