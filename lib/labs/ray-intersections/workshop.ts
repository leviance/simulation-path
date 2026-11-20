import {
  add,
  subtract,
  multiply,
  cameraBasis,
  presetCamera,
  inRange,
  type Camera,
  type Ray,
  type Scene,
  type Vec3,
} from "./model.ts";
import { boxInterval, sphereInterval } from "./intersections.ts";

// The solid's geometric roots remain untouched in the inspector. Clip only
// the portion painted on the bench/ruler, and never invent a slab for a sheet.
export function measuredChord(ray: Ray, geometry: Scene, selected: number, stage: number) {
  let roots = null;
  if (selected === 1 && stage >= 4) roots = sphereInterval(ray, geometry.sphere);
  if (selected === 2 && stage >= 5) roots = boxInterval(ray, geometry.box);
  if (!roots) return null;
  const from = Math.max(roots.entry, ray.tMin);
  const until = Math.min(roots.exit, ray.tMax);
  if (from > until) return null;
  return {
    from,
    until,
    entry: inRange(ray, roots.entry) ? roots.entry : null,
    exit: inRange(ray, roots.exit) ? roots.exit : null,
  };
}

export const aimAspect = 280 / 190;
export interface Orbit {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
}
export const initialOrbit = (): Orbit => ({
  target: { x: 0.12, y: 0.42, z: -1.82 },
  yaw: -0.24,
  pitch: 0.35,
  distance: 8.55,
});
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export function orbitCamera(orbit: Orbit): Camera {
  const horizontal = orbit.distance * Math.cos(orbit.pitch);
  const offset = {
    x: horizontal * Math.sin(orbit.yaw),
    y: orbit.distance * Math.sin(orbit.pitch),
    z: -horizontal * Math.cos(orbit.yaw),
  };
  return {
    origin: add(orbit.target, offset),
    target: orbit.target,
    tanHalfFov: presetCamera().tanHalfFov,
  };
}
export function rotateOrbit(orbit: Orbit, dx: number, dy: number): Orbit {
  return {
    ...orbit,
    yaw: (orbit.yaw + dx * 0.008) % (2 * Math.PI),
    pitch: clamp(orbit.pitch + dy * 0.008, -1.35, 1.35),
  };
}
export function zoomOrbit(orbit: Orbit, steps: number): Orbit {
  return { ...orbit, distance: clamp(orbit.distance * Math.exp(-steps * 0.12), 2, 28) };
}
export function panOrbit(orbit: Orbit, dx: number, dy: number): Orbit {
  const basis = cameraBasis(orbitCamera(orbit));
  const offset = add(
    multiply(basis.right, -dx * orbit.distance * 0.0015),
    multiply(basis.up, dy * orbit.distance * 0.0015),
  );
  const target = add(orbit.target, offset);
  return {
    ...orbit,
    target: {
      x: clamp(target.x, -10, 10),
      y: clamp(target.y, -10, 10),
      z: clamp(target.z, -10, 10),
    },
  };
}
export function objectCenter(geometry: Scene, id: number): Vec3 {
  if (id === 0) return geometry.plane.point;
  if (id === 1) return geometry.sphere.center;
  if (id === 2) return multiply(add(geometry.box.minimum, geometry.box.maximum), 0.5);
  return multiply(add(add(geometry.triangle.a, geometry.triangle.b), geometry.triangle.c), 1 / 3);
}
export function translateObject(geometry: Scene, id: number, movement: Vec3): Scene {
  const center = objectCenter(geometry, id);
  const desired = add(center, movement);
  const bounded = {
    x: clamp(desired.x, -5, 5),
    y: clamp(desired.y, -3, 4),
    z: clamp(desired.z, -4, 6),
  };
  const delta = subtract(bounded, center);
  if (id === 0)
    return { ...geometry, plane: { ...geometry.plane, point: add(geometry.plane.point, delta) } };
  if (id === 1)
    return {
      ...geometry,
      sphere: { ...geometry.sphere, center: add(geometry.sphere.center, delta) },
    };
  if (id === 2)
    return {
      ...geometry,
      box: { minimum: add(geometry.box.minimum, delta), maximum: add(geometry.box.maximum, delta) },
    };
  return {
    ...geometry,
    triangle: {
      a: add(geometry.triangle.a, delta),
      b: add(geometry.triangle.b, delta),
      c: add(geometry.triangle.c, delta),
    },
  };
}
export function moveSource(emitter: Camera, movement: Vec3): Camera {
  const desired = add(emitter.origin, movement);
  const origin = {
    x: clamp(desired.x, -8, 8),
    y: clamp(desired.y, -3, 8),
    z: clamp(desired.z, -9, 9),
  };
  return { ...emitter, origin, target: add(emitter.target, subtract(origin, emitter.origin)) };
}
