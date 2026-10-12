export type Vec2 = { x: number; y: number };
export type Preset = "uniform" | "source" | "sink" | "rotation" | "shear" | "gradient";
export type Potential = "bowl" | "hill";
export type Layer = "arrows" | "potential" | "divergence" | "curl";
export interface Scene {
  preset: Preset;
  potential: Potential;
  vortex: boolean;
  center: Vec2;
  strength: number;
}
export interface WindField {
  width: number;
  height: number;
  dx: number;
  dy: number;
  scalar: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
}
export const presets: Preset[] = ["uniform", "source", "sink", "rotation", "shear", "gradient"];
export const dt = 1 / 60;
export function initialScene(stage = 9): Scene {
  let preset: Preset = "uniform";
  if (stage === 2 || stage === 4) preset = "source";
  if (stage === 3 || stage === 6) preset = "gradient";
  if (stage === 5 || stage >= 7) preset = "rotation";
  return {
    preset,
    potential: stage === 6 ? "hill" : "bowl",
    vortex: false,
    center: { x: 0, y: 0 },
    strength: 2,
  };
}
export function makeField(width = 33, height = 25): WindField {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 3 ||
    height < 3 ||
    width > 129 ||
    height > 129
  )
    throw new RangeError("Wind grid dimensions must be integers in [3, 129]");
  return {
    width,
    height,
    dx: 4 / (width - 1),
    dy: 3 / (height - 1),
    scalar: new Float64Array(width * height),
    vx: new Float64Array(width * height),
    vy: new Float64Array(width * height),
  };
}
export function world(field: WindField, x: number, y: number): Vec2 {
  return { x: -2 + x * field.dx, y: -1.5 + y * field.dy };
}
export function inside(p: Vec2) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= -2 &&
    p.x <= 2 &&
    p.y >= -1.5 &&
    p.y <= 1.5
  );
}
export function potentialAt(p: Vec2, potential: Potential) {
  const r2 = p.x * p.x + p.y * p.y;
  if (potential === "hill") return Math.exp(-r2);
  return 0.5 * r2;
}
export function exactGradient(p: Vec2, potential: Potential): Vec2 {
  if (potential === "hill") {
    const value = Math.exp(-p.x * p.x - p.y * p.y);
    return { x: -2 * p.x * value, y: -2 * p.y * value };
  }
  return { ...p };
}
export function derivativeX(field: WindField, values: Float64Array, x: number, y: number) {
  const i = y * field.width + x;
  if (x === 0) return (-3 * values[i] + 4 * values[i + 1] - values[i + 2]) / (2 * field.dx);
  if (x === field.width - 1)
    return (3 * values[i] - 4 * values[i - 1] + values[i - 2]) / (2 * field.dx);
  return (values[i + 1] - values[i - 1]) / (2 * field.dx);
}
export function derivativeY(field: WindField, values: Float64Array, x: number, y: number) {
  const i = y * field.width + x,
    w = field.width;
  if (y === 0) return (-3 * values[i] + 4 * values[i + w] - values[i + 2 * w]) / (2 * field.dy);
  if (y === field.height - 1)
    return (3 * values[i] - 4 * values[i - w] + values[i - 2 * w]) / (2 * field.dy);
  return (values[i + w] - values[i - w]) / (2 * field.dy);
}
export function gradient(field: WindField) {
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x;
      field.vx[i] = derivativeX(field, field.scalar, x, y);
      field.vy[i] = derivativeY(field, field.scalar, x, y);
    }
}
export function divergence(field: WindField, x: number, y: number) {
  return derivativeX(field, field.vx, x, y) + derivativeY(field, field.vy, x, y);
}
export function curl(field: WindField, x: number, y: number) {
  return derivativeX(field, field.vy, x, y) - derivativeY(field, field.vx, x, y);
}
export function populate(field: WindField, scene: Scene, stage = 9) {
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        p = world(field, x, y);
      field.scalar[i] = potentialAt(p, scene.potential);
      let v = { x: 1, y: 0.25 };
      if (stage >= 2) {
        if (scene.preset === "source") v = { ...p };
        if (scene.preset === "sink") v = { x: -p.x, y: -p.y };
        if (scene.preset === "rotation") v = { x: -p.y, y: p.x };
        if (scene.preset === "shear") v = { x: p.y, y: 0 };
      }
      field.vx[i] = v.x;
      field.vy[i] = v.y;
    }
  if (stage >= 3 && scene.preset === "gradient") gradient(field);
  if (stage >= 8 && scene.vortex) addVortex(field, scene.center, scene.strength);
}
export function addVortex(field: WindField, center: Vec2, strength: number) {
  if (!inside(center) || !Number.isFinite(strength) || Math.abs(strength) > 2)
    throw new RangeError("Invalid vortex");
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        p = world(field, x, y),
        qx = p.x - center.x,
        qy = p.y - center.y;
      const weight = strength * Math.exp(-(qx * qx + qy * qy) / (0.55 * 0.55));
      field.vx[i] += -qy * weight;
      field.vy[i] += qx * weight;
    }
}
export function gradientError(field: WindField, potential: Potential) {
  let interior = 0,
    boundary = 0;
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        exact = exactGradient(world(field, x, y), potential);
      const error = Math.hypot(field.vx[i] - exact.x, field.vy[i] - exact.y);
      if (x === 0 || y === 0 || x === field.width - 1 || y === field.height - 1)
        boundary = Math.max(boundary, error);
      else interior = Math.max(interior, error);
    }
  return { interior, boundary };
}
export function sampleVelocity(field: WindField, p: Vec2): Vec2 | null {
  if (!inside(p)) return null;
  const gx = (p.x + 2) / field.dx,
    gy = (p.y + 1.5) / field.dy;
  const x = Math.min(field.width - 2, Math.floor(gx)),
    y = Math.min(field.height - 2, Math.floor(gy));
  const tx = gx - x,
    ty = gy - y,
    i = y * field.width + x;
  const blend = (values: Float64Array) => {
    const bottom = (1 - tx) * values[i] + tx * values[i + 1];
    const top = (1 - tx) * values[i + field.width] + tx * values[i + field.width + 1];
    return (1 - ty) * bottom + ty * top;
  };
  return { x: blend(field.vx), y: blend(field.vy) };
}
export function midpointStep(field: WindField, p: Vec2, step: number): Vec2 | null {
  if (!Number.isFinite(step) || step <= 0 || step > 0.05) return null;
  const first = sampleVelocity(field, p);
  if (!first) return null;
  const middle = { x: p.x + 0.5 * step * first.x, y: p.y + 0.5 * step * first.y };
  const second = sampleVelocity(field, middle);
  if (!second) return null;
  const next = { x: p.x + step * second.x, y: p.y + step * second.y };
  return inside(next) ? next : null;
}
export function seedParticle(index: number): Vec2 {
  return {
    x: -1.8 + 3.6 * (((index * 37) % 131) / 130),
    y: -1.3 + 2.6 * (((index * 53) % 131) / 130),
  };
}
export interface Particle {
  position: Vec2;
  age: number;
}
export function makeParticles(): Particle[] {
  return Array.from({ length: 128 }, (_, i) => ({ position: seedParticle(i), age: 0 }));
}
export function advanceParticles(field: WindField, particles: Particle[], step = dt) {
  particles.forEach((particle, index) => {
    const next = midpointStep(field, particle.position, step);
    particle.age += step;
    if (!next || particle.age >= 8) {
      particle.position = seedParticle(index);
      particle.age = 0;
    } else particle.position = next;
  });
}
export function planSteps(accumulator: number, elapsed: number) {
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= dt) accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  const accepted = Math.min(elapsed, 0.25),
    total = accumulator + accepted;
  const due = Math.floor((total + 1e-10) / dt),
    steps = Math.min(8, due);
  return {
    steps,
    remainder: Math.max(0, total - due * dt),
    dropped: elapsed - accepted + (due - steps) * dt,
  };
}
export function viewport(width: number, height: number) {
  const scale = Math.max(1, Math.min((width - 32) / 4, (height - 32) / 3));
  return { x: (width - 4 * scale) / 2, y: (height - 3 * scale) / 2, scale };
}
export function toScreen(width: number, height: number, p: Vec2): Vec2 {
  const view = viewport(width, height);
  return { x: view.x + (p.x + 2) * view.scale, y: view.y + (1.5 - p.y) * view.scale };
}
export function fromScreen(width: number, height: number, p: Vec2): Vec2 | null {
  const view = viewport(width, height),
    result = { x: (p.x - view.x) / view.scale - 2, y: 1.5 - (p.y - view.y) / view.scale };
  // Chỉ hấp thụ sai số làm tròn tại đúng cạnh, không kéo input ngoài miền vào mép.
  if (
    !Number.isFinite(result.x) ||
    !Number.isFinite(result.y) ||
    result.x < -2 - 1e-10 ||
    result.x > 2 + 1e-10 ||
    result.y < -1.5 - 1e-10 ||
    result.y > 1.5 + 1e-10
  )
    return null;
  return { x: Math.max(-2, Math.min(2, result.x)), y: Math.max(-1.5, Math.min(1.5, result.y)) };
}
export function scalarColor(value: number, range = 2): number[] {
  if (!Number.isFinite(value)) return [255, 0, 255];
  const t = Math.min(1, Math.abs(value) / range);
  if (value >= 0)
    return [Math.round(35 + 205 * t), Math.round(45 + 55 * t), Math.round(60 - 20 * t)];
  return [Math.round(35 - 15 * t), Math.round(45 + 95 * t), Math.round(60 + 180 * t)];
}
export function validateMap() {
  const field = makeField();
  let derivativeError = 0,
    gradientCurl = 0;
  const cases: Array<[Preset, number, number]> = [
    ["uniform", 0, 0],
    ["source", 2, 0],
    ["sink", -2, 0],
    ["rotation", 0, 2],
    ["shear", 0, -1],
  ];
  for (const [preset, div, spin] of cases) {
    populate(field, { ...initialScene(), preset });
    for (let y = 0; y < field.height; y++)
      for (let x = 0; x < field.width; x++)
        derivativeError = Math.max(
          derivativeError,
          Math.abs(divergence(field, x, y) - div),
          Math.abs(curl(field, x, y) - spin),
        );
  }
  populate(field, { ...initialScene(), preset: "gradient", potential: "hill" });
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++)
      gradientCurl = Math.max(gradientCurl, Math.abs(curl(field, x, y)));
  const coarse = gradientError(field, "hill");
  const fine = makeField(65, 49);
  populate(fine, { ...initialScene(), preset: "gradient", potential: "hill" });
  const refined = gradientError(fine, "hill");
  return {
    derivativeError,
    gradientCurl,
    coarse,
    refined,
    passed:
      derivativeError < 1e-10 &&
      gradientCurl < 1e-10 &&
      refined.interior < coarse.interior / 3 &&
      refined.boundary < coarse.boundary / 3,
  };
}
