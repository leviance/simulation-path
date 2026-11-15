import { spacing, width, height, capacity, particle, type State, type Vec2 } from "./model.ts";
export function emitBurst(state: State, nozzle: Vec2) {
  if (!Number.isFinite(nozzle.x) || !Number.isFinite(nozzle.y))
    throw new RangeError("Invalid nozzle");
  let added = 0;
  for (let k = -3; k <= 3; k++) {
    const x = nozzle.x + k * spacing,
      y = nozzle.y;
    let allowed =
      state.particles.length < capacity &&
      x >= spacing &&
      x <= width - spacing &&
      y >= spacing &&
      y <= height - spacing;
    if (
      state.paddle.enabled &&
      Math.hypot(x - state.paddle.x, y - state.paddle.y) < state.paddle.radius + spacing
    )
      allowed = false;
    for (const p of state.particles) {
      const dx = p.x - x,
        dy = p.y - y;
      if (dx * dx + dy * dy < 0.81 * spacing * spacing) {
        allowed = false;
        break;
      }
    }
    if (allowed) {
      state.particles.push(particle(x, y, 0, -1.2));
      state.emitted++;
      added++;
    } else state.rejected++;
  }
  return added;
}
