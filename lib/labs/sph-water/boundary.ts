import { spacing, width, height, type State, type Particle } from "./model.ts";
export function collide(state: State, p: Particle, stage = 12) {
  const radius = spacing / 2;
  if (p.x < radius) {
    p.x = radius;
    if (p.vx < 0) p.vx *= -0.05;
    state.contacts++;
  }
  if (p.x > width - radius) {
    p.x = width - radius;
    if (p.vx > 0) p.vx *= -0.05;
    state.contacts++;
  }
  if (p.y < radius) {
    p.y = radius;
    if (p.vy < 0) p.vy *= -0.05;
    state.contacts++;
  }
  if (p.y > height - radius) {
    p.y = height - radius;
    if (p.vy > 0) p.vy *= -0.05;
    state.contacts++;
  }
  if (stage >= 11 && state.paddle.enabled) {
    let dx = p.x - state.paddle.x,
      dy = p.y - state.paddle.y,
      distance = Math.hypot(dx, dy);
    const minimum = state.paddle.radius + radius;
    if (distance < minimum) {
      if (distance < 1e-12) {
        dx = 0;
        dy = 1;
        distance = 1;
      }
      const nx = dx / distance,
        ny = dy / distance;
      p.x = state.paddle.x + minimum * nx;
      p.y = state.paddle.y + minimum * ny;
      const normal = (p.vx - state.paddle.vx) * nx + (p.vy - state.paddle.vy) * ny;
      if (normal < 0) {
        p.vx -= 1.05 * normal * nx;
        p.vy -= 1.05 * normal * ny;
      }
      state.contacts++;
    }
  }
}
export function integrate(state: State, dt: number, stage = 12) {
  for (const p of state.particles) {
    p.vx += p.ax * dt;
    p.vy += p.ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    collide(state, p, stage);
  }
  state.time += dt;
  state.dt = dt;
  state.tick++;
  state.updated = state.particles.length;
}
export function targetPaddle(state: State, x: number, y: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Invalid paddle target");
  const margin = state.paddle.radius + 2 * spacing;
  state.paddle.targetX = Math.max(margin, Math.min(width - margin, x));
  state.paddle.targetY = Math.max(margin, Math.min(height - margin, y));
}
export function movePaddle(state: State, dt: number) {
  const p = state.paddle;
  if (!p.enabled) return;
  const dx = p.targetX - p.x,
    dy = p.targetY - p.y,
    distance = Math.hypot(dx, dy);
  let fraction = 0;
  if (distance > 1e-12) fraction = Math.min(1, (3 * dt) / distance);
  p.vx = (dx * fraction) / dt;
  p.vy = (dy * fraction) / dt;
  p.x += dx * fraction;
  p.y += dy * fraction;
}
