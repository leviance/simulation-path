import { pointOnUnitCircle } from "./angle.ts";
import { scale, type Point } from "./geometry.ts";
import {
  dot,
  cosineBetween,
  angleBetween,
  vectorProjection,
  rejection,
  scalarProjection,
  signedAngleBetween,
  rotateTowards,
  isWithinViewCone,
  turretNormalize,
} from "./turret.ts";

export const turretBoard = {
  width: 1100,
  height: 760,
  origin: { x: 550, y: 410 },
  pixelsPerUnit: 40,
  targetRadius: 6.5,
};
export type TurretScene = {
  targetOffset: Point;
  turretAngle: number;
  turnSpeed: number;
  halfViewAngle: number;
  followMouse: boolean;
  dragging: boolean;
};

export function turretScene(): TurretScene {
  return {
    targetOffset: { x: 4, y: 3 },
    turretAngle: 0,
    turnSpeed: Math.PI / 2,
    halfViewAngle: (35 * Math.PI) / 180,
    followMouse: true,
    dragging: false,
  };
}

export function turretLayers(mode?: string) {
  const order = [
    "turret-scene",
    "turret-dot",
    "turret-angle",
    "turret-projection",
    "turret-rotation",
    "turret-view-cone",
    "turret-full",
  ];
  let level = mode ? order.indexOf(mode) + 1 : 7;
  if (level < 1) level = 7;
  return {
    dot: level >= 2,
    angle: level >= 3,
    projection: level >= 4,
    rotation: level >= 5,
    cone: level >= 6,
  };
}

export function turretWorldToScreen(world: Point): Point {
  return { x: 550 + 40 * world.x, y: 410 - 40 * world.y };
}

export function turretScreenToWorld(screen: Point): Point {
  return { x: (screen.x - 550) / 40, y: (410 - screen.y) / 40 };
}

export function boundedTurretTarget(target: Point): Point {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return { x: 0, y: 0 };
  return Math.hypot(target.x, target.y) > 6.5 ? scale(turretNormalize(target), 6.5) : target;
}

export function setTurretTarget(scene: TurretScene, target: Point): TurretScene {
  return { ...scene, targetOffset: boundedTurretTarget(target) };
}

export function turretTargetHasDirection(scene: TurretScene) {
  return Math.hypot(scene.targetOffset.x, scene.targetOffset.y) >= 8 / 40;
}

export function applyTurretPreset(scene: TurretScene, index: number): TurretScene {
  let angle = scene.turretAngle,
    radius = index === 0 ? 2 : 5;
  if (index === 2) angle += Math.PI / 2;
  if (index === 3) angle -= Math.PI / 2;
  if (index === 4) angle += Math.PI;
  if (index === 5) radius = 0;
  if (index === 6) angle += scene.halfViewAngle;
  return {
    ...setTurretTarget(scene, scale(pointOnUnitCircle(angle), radius)),
    followMouse: false,
    dragging: false,
  };
}

export function advanceTurret(scene: TurretScene, deltaTime: number): TurretScene {
  if (
    !Number.isFinite(deltaTime) ||
    deltaTime <= 0 ||
    deltaTime > 0.1 ||
    !turretTargetHasDirection(scene)
  )
    return scene;
  return {
    ...scene,
    turretAngle: rotateTowards(scene.turretAngle, scene.targetOffset, scene.turnSpeed * deltaTime),
  };
}

export function turretResults(scene: TurretScene) {
  const forward = pointOnUnitCircle(scene.turretAngle);
  const target = scene.targetOffset;
  const valid = turretTargetHasDirection(scene);
  return {
    forward,
    valid,
    targetDirection: turretNormalize(target),
    rawDot: dot(forward, target),
    normalizedDot: cosineBetween(forward, target),
    angleError: angleBetween(forward, target),
    signedError: signedAngleBetween(forward, target),
    parallel: vectorProjection(target, forward),
    residual: rejection(target, forward),
    scalar: scalarProjection(target, forward),
    locked: valid && isWithinViewCone(forward, target, scene.halfViewAngle),
  };
}
