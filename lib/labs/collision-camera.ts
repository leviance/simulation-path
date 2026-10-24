import {
  tankSub3,
  tankDot3,
  tankCross3,
  tankUnit3,
  tankFinite3,
  type TankVec3,
} from "./collision-spheres.ts";
import type { TankCamera } from "./collision-scene.ts";
export function makeTankCamera(settings: TankCamera) {
  const pitch = Math.max(-1.2, Math.min(1.2, settings.pitch)),
    distance = Math.max(22, Math.min(38, settings.distance));
  const eye = {
    x: distance * Math.cos(pitch) * Math.sin(settings.yaw),
    y: distance * Math.sin(pitch),
    z: distance * Math.cos(pitch) * Math.cos(settings.yaw),
  };
  const forward = tankUnit3({ x: -eye.x, y: -eye.y, z: -eye.z }),
    right = tankUnit3(tankCross3(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: tankCross3(right, forward) };
}
export function tankToCamera(world: TankVec3, camera: ReturnType<typeof makeTankCamera>) {
  const v = tankSub3(world, camera.eye);
  return {
    x: tankDot3(v, camera.right),
    y: tankDot3(v, camera.up),
    z: tankDot3(v, camera.forward),
  };
}
export function projectTankCamera(p: TankVec3) {
  return { x: 550 + (620 * p.x) / p.z, y: 370 - (620 * p.y) / p.z };
}
export function tankSphereDepth(rx: number, ry: number, c: TankVec3, radius: number) {
  if (
    !Number.isFinite(rx) ||
    !Number.isFinite(ry) ||
    !tankFinite3(c) ||
    !Number.isFinite(radius) ||
    radius <= 0
  )
    return Infinity;
  const a = rx * rx + ry * ry + 1,
    halfB = -(rx * c.x + ry * c.y + c.z),
    constant = tankDot3(c, c) - radius * radius;
  const discriminant = halfB * halfB - a * constant;
  if (!Number.isFinite(discriminant) || discriminant < 0) return Infinity;
  const z = (-halfB - Math.sqrt(discriminant)) / a;
  return z >= 0.2 && z <= 80 ? z : Infinity;
}
export function tankSphereScreenBounds(c: TankVec3, r: number) {
  const denominator = c.z * c.z - r * r;
  if (!tankFinite3(c) || !Number.isFinite(r) || r <= 0 || c.z <= r + 0.2) return null;
  const axis = (v: number) => {
    const spread = r * Math.sqrt(v * v + c.z * c.z - r * r);
    return [(620 * (v * c.z - spread)) / denominator, (620 * (v * c.z + spread)) / denominator];
  };
  const x = axis(c.x),
    y = axis(c.y);
  return {
    left: Math.floor(Math.max(0, Math.min(1099, 550 + x[0]))),
    right: Math.ceil(Math.max(0, Math.min(1099, 550 + x[1]))),
    top: Math.floor(Math.max(85, Math.min(650, 370 - y[1]))),
    bottom: Math.ceil(Math.max(85, Math.min(650, 370 - y[0]))),
  };
}
