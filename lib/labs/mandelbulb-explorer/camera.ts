import { add, clamp, cross, finite, scale, subtract, unit, type Vec3 } from "./math.ts";
export interface Camera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
  tanHalfFov: number;
}
export const defaultCamera = (): Camera => ({
  target: { x: 0, y: 0, z: 0 },
  yaw: 0.85,
  pitch: 0.25,
  distance: 3.4,
  tanHalfFov: Math.tan(0.42),
});
export function validateCamera(c: Camera) {
  if (
    !finite(c.target) ||
    Object.values(c.target).some((value) => Math.abs(value) > 2.5) ||
    !Number.isFinite(c.yaw) ||
    !Number.isFinite(c.pitch) ||
    Math.abs(c.pitch) > 1.48 ||
    !Number.isFinite(c.distance) ||
    c.distance < 0.04 ||
    c.distance > 18 ||
    !Number.isFinite(c.tanHalfFov) ||
    c.tanHalfFov < 0.2 ||
    c.tanHalfFov > 1
  )
    throw new Error("Camera vượt giới hạn pan/pitch/dolly hữu hạn.");
}
export function basis(c: Camera) {
  const horizontal = c.distance * Math.cos(c.pitch);
  const eye = add(c.target, {
    x: horizontal * Math.cos(c.yaw),
    y: c.distance * Math.sin(c.pitch),
    z: horizontal * Math.sin(c.yaw),
  });
  const forward = unit(subtract(c.target, eye));
  const right = unit(cross(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: cross(right, forward) };
}
export function cameraRay(c: Camera, x: number, y: number, width: number, height: number) {
  const b = basis(c);
  const u = ((2 * x) / width - 1) * (960 / 540) * c.tanHalfFov;
  const v = (1 - (2 * y) / height) * c.tanHalfFov;
  return { origin: b.eye, direction: unit(add(add(b.forward, scale(b.right, u)), scale(b.up, v))) };
}
export function orbit(c: Camera, dx: number, dy: number): Camera {
  return {
    ...c,
    yaw: (c.yaw - dx * 0.006) % (2 * Math.PI),
    pitch: clamp(c.pitch + dy * 0.006, -1.48, 1.48),
  };
}
export function dolly(c: Camera, wheel: number): Camera {
  return { ...c, distance: clamp(c.distance * Math.exp(-wheel * 0.12), 0.04, 18) };
}
export function pan(c: Camera, dx: number, dy: number): Camera {
  const b = basis(c);
  const target = add(
    add(c.target, scale(b.right, -dx * c.distance * 0.0012)),
    scale(b.up, dy * c.distance * 0.0012),
  );
  return {
    ...c,
    target: {
      x: clamp(target.x, -2.5, 2.5),
      y: clamp(target.y, -2.5, 2.5),
      z: clamp(target.z, -2.5, 2.5),
    },
  };
}
