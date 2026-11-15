import { inside, dt, type Vec2, type WindField } from "./model.ts";
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
  const result = { x: blend(field.vx), y: blend(field.vy) };
  if (!Number.isFinite(result.x) || !Number.isFinite(result.y)) return null;
  return result;
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
  trail: Vec2[];
  trailHead: number;
  trailSize: number;
}
export function makeParticles(): Particle[] {
  return Array.from({ length: 128 }, (_, i) => ({
    position: seedParticle(i),
    age: 0,
    trail: Array.from({ length: 24 }, () => ({ x: 0, y: 0 })),
    trailHead: 0,
    trailSize: 0,
  }));
}
export function advanceParticles(field: WindField, particles: Particle[], step = dt) {
  particles.forEach((particle, index) => {
    const next = midpointStep(field, particle.position, step);
    particle.age += step;
    if (!next || particle.age >= 8) {
      particle.position = seedParticle(index);
      particle.age = 0;
      particle.trailHead = 0;
      particle.trailSize = 0;
    } else {
      particle.trail[particle.trailHead] = particle.position;
      particle.trailHead = (particle.trailHead + 1) % 24;
      particle.trailSize = Math.min(24, particle.trailSize + 1);
      particle.position = next;
    }
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
