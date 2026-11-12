import { evaluate, type Field } from "./field.ts";
import {
  add,
  clamp,
  dot,
  finite,
  length,
  scale,
  subtract,
  unit,
  type Settings,
  type Vec3,
} from "./math.ts";
export const hitFlag = 1,
  missFlag = 2,
  budgetFlag = 4,
  insideFlag = 8,
  invalidFlag = 16;
export interface RayPoint {
  t: number;
  distance: number;
  state: Field["state"];
}
export interface RaySample {
  t: number;
  trap: number;
  state: number;
  raySteps: number;
  orbitIterations: number;
  path: RayPoint[];
}
export function march(origin: Vec3, direction: Vec3, s: Settings, recordPath = false): RaySample {
  const result: RaySample = {
    t: 0,
    trap: 0,
    state: missFlag,
    raySteps: 0,
    orbitIterations: 0,
    path: [],
  };
  if (!finite(origin) || !finite(direction) || Math.abs(length(direction) - 1) > 1e-6)
    return { ...result, state: invalidFlag };
  const b = dot(origin, direction),
    discriminant = b * b - dot(origin, origin) + 4;
  if (discriminant < 0) return result;
  const root = Math.sqrt(discriminant),
    farT = Math.min(s.farBound, -b + root),
    start = Math.max(0.001, -b - root);
  if (farT < start) return result;
  const fieldAt = (t: number) => {
    const field = evaluate(add(origin, scale(direction, t)), s);
    result.orbitIterations += field.iterations;
    return field;
  };
  if (length(origin) < 2) {
    const eye = fieldAt(0);
    if (eye.state === "invalid") return { ...result, state: invalidFlag };
    if (eye.state === "bounded") return { ...result, state: insideFlag };
  }
  let previous = start,
    t = start;
  for (let step = 0; step < s.raySteps; step++) {
    const field = fieldAt(t);
    result.raySteps++;
    result.t = t;
    result.trap = field.trap;
    if (recordPath) result.path.push({ t, distance: field.distance, state: field.state });
    if (field.state === "invalid") return { ...result, state: invalidFlag };
    if (field.state === "bounded") {
      if (s.useDe) {
        let low = previous,
          high = t;
        for (let refinement = 0; refinement < 8; refinement++) {
          const middle = (low + high) * 0.5,
            candidate = fieldAt(middle);
          if (candidate.state === "invalid") return { ...result, state: invalidFlag };
          if (candidate.state === "escaped") low = middle;
          else high = middle;
        }
        result.t = low;
      }
      return { ...result, state: hitFlag };
    }
    if (s.useDe && field.distance < s.epsilon) return { ...result, state: hitFlag };
    let advance = (farT - start) / s.raySteps;
    if (s.useDe) advance = clamp(s.safety * field.distance, s.epsilon * 0.1, 0.12);
    previous = t;
    t += advance;
    if (t > farT) return { ...result, t, state: missFlag };
  }
  return { ...result, t, trap: 0, state: budgetFlag };
}
export interface Shaded {
  color: Vec3;
  normal: Vec3;
  state: number;
  iterations: number;
}
export function shade(origin: Vec3, direction: Vec3, hit: RaySample, s: Settings): Shaded {
  let state = hit.state,
    iterations = 0;
  let color = { x: 0.018, y: 0.035, z: 0.06 },
    normal = { x: 0, y: 0, z: 0 };
  const fieldAt = (p: Vec3) => {
    const f = evaluate(p, s);
    iterations += f.iterations;
    if (f.state === "invalid") state = invalidFlag;
    return f;
  };
  if (state === hitFlag) {
    color = { x: 0.25, y: 0.68, z: 0.78 };
    if (s.lighting) {
      const point = add(origin, scale(direction, hit.t)),
        h = s.normalStep;
      const difference = (delta: Vec3) =>
        fieldAt(add(point, delta)).distance - fieldAt(subtract(point, delta)).distance;
      const gradient = {
        x: difference({ x: h, y: 0, z: 0 }),
        y: difference({ x: 0, y: h, z: 0 }),
        z: difference({ x: 0, y: 0, z: h }),
      };
      normal = scale(direction, -1);
      if (finite(gradient) && length(gradient) >= 1e-12) normal = unit(gradient);
      const light = unit({ x: -0.6, y: 0.9, z: 0.5 });
      const band = clamp(0.5 + 0.2 * Math.log(Math.max(hit.trap, 1e-5)) + normal.z * 0.1, 0, 1);
      const palettes = [
        [
          { x: 0.06, y: 0.18, z: 0.26 },
          { x: 0.94, y: 0.69, z: 0.32 },
        ],
        [
          { x: 0.1, y: 0.04, z: 0.18 },
          { x: 0.35, y: 0.78, z: 0.95 },
        ],
        [
          { x: 0.22, y: 0.11, z: 0.07 },
          { x: 0.94, y: 0.84, z: 0.69 },
        ],
      ];
      const [low, high] = palettes[s.palette];
      const base = add(scale(low, 1 - band), scale(high, band));
      let ao = 1;
      if (s.occlusion) {
        let occlusion = 0;
        for (let i = 1; i <= 4; i++) {
          const distance = i * 0.025;
          occlusion +=
            Math.max(0, distance - fieldAt(add(point, scale(normal, distance))).distance) /
            distance;
        }
        ao = clamp(1 - occlusion * 0.2, 0.15, 1);
      }
      const diffuse = Math.max(dot(normal, light), 0),
        sky = 0.5 + 0.5 * normal.y,
        rim = (1 - Math.max(dot(normal, scale(direction, -1)), 0)) ** 3;
      color = {
        x: base.x * (0.13 * ao + diffuse * 1.1 + sky * 0.15) + rim * 0.12 * ao,
        y: base.y * (0.17 * ao + diffuse * 0.94 + sky * 0.15) + rim * 0.26 * ao,
        z: base.z * (0.22 * ao + diffuse * 0.72 + sky * 0.15) + rim * 0.36 * ao,
      };
    }
  }
  if (state === budgetFlag) color = { x: 0.12, y: 0.05, z: 0.16 };
  if (state === insideFlag) color = { x: 0.12, y: 0.08, z: 0.025 };
  if (state === invalidFlag || !finite(color)) {
    state = invalidFlag;
    color = { x: 0.8, y: 0.04, z: 0.35 };
  }
  return { color, normal, state, iterations };
}
