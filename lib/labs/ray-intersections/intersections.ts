import {
  subtract,
  normalize,
  dot,
  length,
  finite,
  valid,
  inRange,
  makeHit,
  cross,
  at,
  multiply,
  type Hit,
  type Ray,
  type Scene,
  type Vec3,
} from "./model.ts";

export function intersectPlane(ray: Ray, plane: Scene["plane"]): Hit | null {
  if (!valid(ray) || !finite(plane.point) || !finite(plane.normal) || length(plane.normal) === 0)
    return null;
  const normal = normalize(plane.normal),
    denominator = dot(ray.direction, normal);
  if (Math.abs(denominator) <= 1e-10 * length(ray.direction)) return null;
  const t = dot(subtract(plane.point, ray.origin), normal) / denominator;
  if (!inRange(ray, t)) return null;
  return makeHit(ray, t, normal, 0);
}
export function intersectSphere(ray: Ray, sphere: Scene["sphere"]): Hit | null {
  if (
    !valid(ray) ||
    !finite(sphere.center) ||
    !Number.isFinite(sphere.radius) ||
    sphere.radius <= 0
  )
    return null;
  const offset = subtract(ray.origin, sphere.center),
    a = dot(ray.direction, ray.direction),
    halfB = dot(offset, ray.direction),
    c = dot(offset, offset) - sphere.radius * sphere.radius;
  const discriminant = halfB * halfB - a * c;
  if (!Number.isFinite(discriminant) || discriminant < 0 || !Number.isFinite(a) || a <= 0)
    return null;
  const root = Math.sqrt(discriminant);
  // Math.sign(0) is not copysign: treat +0 as positive, matching C++.
  const signedRoot = halfB < 0 || Object.is(halfB, -0) ? -root : root;
  const q = -halfB - signedRoot;
  let t0 = -halfB / a,
    t1 = t0;
  if (q !== 0) {
    t0 = q / a;
    t1 = c / q;
  }
  if (t0 > t1) [t0, t1] = [t1, t0];
  let t = t0;
  if (!inRange(ray, t)) t = t1;
  if (!inRange(ray, t)) return null;
  return makeHit(ray, t, normalize(subtract(at(ray, t), sphere.center)), 1);
}
export interface BoxInterval {
  entry: number;
  exit: number;
  entryNormal: Vec3;
  exitNormal: Vec3;
}
export function boxInterval(ray: Ray, box: Scene["box"]): BoxInterval | null {
  if (!valid(ray) || !finite(box.minimum) || !finite(box.maximum)) return null;
  const interval: BoxInterval = {
    entry: -Infinity,
    exit: Infinity,
    entryNormal: { x: 0, y: 0, z: 0 },
    exitNormal: { x: 0, y: 0, z: 0 },
  };
  const axes: Vec3[] = [
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: 0, z: 1 },
  ];
  for (const [index, axis] of (["x", "y", "z"] as const).entries()) {
    if (box.minimum[axis] >= box.maximum[axis]) return null;
    if (ray.direction[axis] === 0) {
      if (ray.origin[axis] < box.minimum[axis] || ray.origin[axis] > box.maximum[axis]) return null;
      continue;
    }
    let entry = (box.minimum[axis] - ray.origin[axis]) / ray.direction[axis],
      exit = (box.maximum[axis] - ray.origin[axis]) / ray.direction[axis];
    let entryNormal = multiply(axes[index], -1),
      exitNormal = axes[index];
    if (entry > exit) {
      [entry, exit] = [exit, entry];
      [entryNormal, exitNormal] = [exitNormal, entryNormal];
    }
    if (entry > interval.entry) {
      interval.entry = entry;
      interval.entryNormal = entryNormal;
    }
    if (exit < interval.exit) {
      interval.exit = exit;
      interval.exitNormal = exitNormal;
    }
    if (interval.entry > interval.exit) return null;
  }
  return interval;
}
export function intersectBox(ray: Ray, box: Scene["box"]): Hit | null {
  const interval = boxInterval(ray, box);
  if (!interval) return null;
  if (inRange(ray, interval.entry)) return makeHit(ray, interval.entry, interval.entryNormal, 2);
  if (inRange(ray, interval.exit)) return makeHit(ray, interval.exit, interval.exitNormal, 2);
  return null;
}
export function intersectTriangle(ray: Ray, triangle: Scene["triangle"]): Hit | null {
  if (!valid(ray) || !finite(triangle.a) || !finite(triangle.b) || !finite(triangle.c)) return null;
  const edge1 = subtract(triangle.b, triangle.a),
    edge2 = subtract(triangle.c, triangle.a),
    normal = cross(edge1, edge2),
    p = cross(ray.direction, edge2);
  const determinant = dot(edge1, p),
    scale = length(edge1) * length(edge2) * length(ray.direction);
  if (
    !Number.isFinite(scale) ||
    scale === 0 ||
    length(normal) <= 1e-10 * length(edge1) * length(edge2) ||
    Math.abs(determinant) <= 1e-10 * scale
  )
    return null;
  const offset = subtract(ray.origin, triangle.a),
    u = dot(offset, p) / determinant,
    q = cross(offset, edge1),
    v = dot(ray.direction, q) / determinant,
    t = dot(edge2, q) / determinant;
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || v < 0 || u + v > 1 || !inRange(ray, t))
    return null;
  return { ...makeHit(ray, t, normalize(normal), 3), u, v };
}
export function candidates(ray: Ray, scene: Scene, stage = 8): (Hit | null)[] {
  return [
    stage >= 3 ? intersectPlane(ray, scene.plane) : null,
    stage >= 4 ? intersectSphere(ray, scene.sphere) : null,
    stage >= 5 ? intersectBox(ray, scene.box) : null,
    stage >= 6 ? intersectTriangle(ray, scene.triangle) : null,
  ];
}
export function nearestHit(hits: (Hit | null)[]): Hit | null {
  let best: Hit | null = null;
  for (const hit of hits) {
    if (!hit) continue;
    if (!best || hit.t < best.t || (hit.t === best.t && hit.objectId < best.objectId)) best = hit;
  }
  return best;
}
