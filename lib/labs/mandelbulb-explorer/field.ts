import { add, clamp, finite, length, type Settings, type Vec3 } from "./math.ts";
export type OrbitState = "escaped" | "bounded" | "invalid";
export interface Field {
  distance: number;
  trap: number;
  iterations: number;
  state: OrbitState;
}
export function sphericalPower(z: Vec3, power: number): Vec3 {
  const r = length(z);
  if (r < 1e-15) return { x: 0, y: 0, z: 0 };
  const theta = Math.acos(clamp(z.z / r, -1, 1));
  let phi = 0;
  if (Math.hypot(z.x, z.y) > 1e-15) phi = Math.atan2(z.y, z.x);
  const rp = r ** power;
  return {
    x: rp * Math.sin(power * theta) * Math.cos(power * phi),
    y: rp * Math.sin(power * theta) * Math.sin(power * phi),
    z: rp * Math.cos(power * theta),
  };
}
export function evaluate(point: Vec3, s: Settings): Field {
  const result: Field = { distance: 0, trap: 2, iterations: 0, state: "bounded" };
  if (!finite(point)) return { ...result, state: "invalid" };
  let z = { x: 0, y: 0, z: 0 };
  let derivative = 1;
  for (let iteration = 0; iteration < s.iterations; iteration++) {
    result.iterations++;
    const r = length(z);
    if (!Number.isFinite(r) || !Number.isFinite(derivative) || derivative <= 0)
      return { ...result, state: "invalid" };
    if (r > s.bailout) {
      result.distance = (0.5 * Math.log(r) * r) / derivative;
      result.state = "escaped";
      if (!Number.isFinite(result.distance) || result.distance <= 0) result.state = "invalid";
      return result;
    }
    derivative = s.power * r ** (s.power - 1) * derivative + 1;
    z = add(sphericalPower(z, s.power), point);
    if (!finite(z) || !Number.isFinite(derivative) || derivative <= 0)
      return { ...result, state: "invalid" };
    result.trap = Math.min(result.trap, length(z));
  }
  return result;
}
export function orbitPath(point: Vec3, s: Settings): Vec3[] {
  const path = [{ x: 0, y: 0, z: 0 }];
  for (let iteration = 0; iteration < s.iterations; iteration++) {
    const previous = path[path.length - 1];
    if (!finite(previous) || length(previous) > s.bailout) break;
    path.push(add(sphericalPower(previous, s.power), point));
  }
  return path;
}
