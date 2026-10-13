import { artificialViscosity, gradient, kernel } from "./kernel.ts";
import { buildNeighbors, type Neighborhood } from "./neighbors.ts";
import {
  capacity,
  defaultSettings,
  finiteState,
  length,
  mass,
  maxDt,
  restDensity,
  spacing,
  h,
  subtract,
  validateSettings,
  type Settings,
  type State,
  type Vec2,
} from "./model.ts";

export function computeDensity(state: State, neighbors: Neighborhood) {
  state.particles.forEach((p, i) => {
    let density = 0;
    for (const j of neighbors.lists[i])
      density += mass * kernel(length(subtract(p.position, neighbors.positions[j])));
    p.density = density;
  });
}
export function computePressure(state: State, soundSpeed: number) {
  for (const p of state.particles)
    p.pressure = Math.max(0, soundSpeed * soundSpeed * (p.density - restDensity));
}
export function accelerations(
  state: State,
  neighbors: Neighborhood,
  settings: Settings,
  stage: number,
): Vec2[] {
  return state.particles.map((p, i) => {
    const result = { x: 0, y: -settings.gravity };
    if (stage < 5) return result;
    for (const j of neighbors.lists[i]) {
      if (j === i) continue;
      const other = state.particles[j];
      const displacement = subtract(p.position, neighbors.positions[j]);
      const grad = gradient(displacement);
      // Static wall approximation: rho_wall=rho0 and p_wall=p_i.
      const densityB = other?.density ?? restDensity;
      const pressureB = other?.pressure ?? p.pressure;
      const velocityB = other?.velocity ?? { x: 0, y: 0 };
      let coefficient = p.pressure / (p.density * p.density) + pressureB / (densityB * densityB);
      if (stage >= 6)
        coefficient += artificialViscosity(
          displacement,
          subtract(p.velocity, velocityB),
          p.density,
          densityB,
          settings.soundSpeed,
          settings.alpha,
        );
      result.x -= mass * coefficient * grad.x;
      result.y -= mass * coefficient * grad.y;
    }
    return result;
  });
}
export function collide(position: Vec2, velocity: Vec2) {
  const radius = spacing / 2;
  if (position.x < radius) {
    position.x = radius;
    if (velocity.x < 0) velocity.x *= -0.1;
  }
  if (position.x > 1 - radius) {
    position.x = 1 - radius;
    if (velocity.x > 0) velocity.x *= -0.1;
  }
  if (position.y < radius) {
    position.y = radius;
    if (velocity.y < 0) velocity.y *= -0.1;
  }
  // Open top visually, but a safety ceiling keeps the finite CPU demo bounded.
  if (position.y > 0.8 - radius) {
    position.y = 0.8 - radius;
    if (velocity.y > 0) velocity.y *= -0.1;
  }
}
export function chooseDt(state: State, acceleration: Vec2[], settings: Settings) {
  validateSettings(settings);
  if (
    acceleration.length !== state.particles.length ||
    !finiteState(state) ||
    acceleration.some((a) => !Number.isFinite(a.x) || !Number.isFinite(a.y))
  )
    throw new RangeError("Non-finite or incomplete timestep input");
  let speed = 0,
    force = 0;
  state.particles.forEach((p, i) => {
    speed = Math.max(speed, length(p.velocity));
    force = Math.max(force, length(acceleration[i]));
  });
  const acoustic = (0.25 * h) / (settings.soundSpeed + speed);
  const forceBound = 0.25 * Math.sqrt(h / Math.max(force, 1e-12));
  const dt = Math.min(maxDt, acoustic, forceBound);
  if (!Number.isFinite(dt) || dt < 1e-6)
    throw new RangeError("SPH step too small: reset or reduce the forcing");
  return dt;
}
export function prepare(state: State, settings: Settings = defaultSettings, stage = 10) {
  validateSettings(settings);
  if (!finiteState(state)) throw new RangeError("Non-finite SPH state");
  const neighbors = buildNeighbors(state, stage >= 7 && settings.useGrid);
  if (stage >= 4) computeDensity(state, neighbors);
  if (stage >= 5) computePressure(state, settings.soundSpeed);
  const acceleration = accelerations(state, neighbors, settings, stage);
  return {
    neighbors,
    acceleration,
    dt: stage >= 9 ? chooseDt(state, acceleration, settings) : maxDt,
  };
}
export function integrate(state: State, acceleration: Vec2[], dt: number) {
  state.particles.forEach((p, i) => {
    p.velocity.x += acceleration[i].x * dt;
    p.velocity.y += acceleration[i].y * dt;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    collide(p.position, p.velocity);
  });
  state.time += dt;
  if (!finiteState(state)) throw new RangeError("Non-finite result; simulation stopped");
}
export function step(state: State, settings = defaultSettings, stage = 10) {
  const prepared = prepare(state, settings, stage);
  if (stage >= 2) integrate(state, prepared.acceleration, prepared.dt);
  return prepared;
}
export function pour(state: State, nozzle: Vec2) {
  if (!Number.isFinite(nozzle.x) || !Number.isFinite(nozzle.y)) return false;
  const position = {
    x: Math.max(spacing / 2, Math.min(1 - spacing / 2, nozzle.x)),
    y: Math.max(spacing / 2, Math.min(0.8 - spacing / 2, nozzle.y)),
  };
  if (
    state.particles.length >= capacity ||
    state.particles.some((p) => length(subtract(p.position, position)) < spacing * 0.8)
  ) {
    state.rejected++;
    return false;
  }
  state.particles.push({
    position,
    velocity: { x: 0, y: -0.4 },
    density: restDensity,
    pressure: 0,
  });
  state.emitted++;
  return true;
}
export function advanceFrame(
  state: State,
  settings: Settings,
  accumulator: number,
  elapsed: number,
  pouring: boolean,
  nozzle: Vec2,
) {
  if (!Number.isFinite(elapsed) || elapsed < 0 || !Number.isFinite(accumulator) || accumulator < 0)
    throw new RangeError("Invalid frame time");
  let remaining = accumulator + Math.min(elapsed, 0.05),
    steps = 0,
    dropped = Math.max(0, elapsed - 0.05);
  while (steps < 64) {
    const prepared = prepare(state, settings);
    if (remaining + 1e-12 < prepared.dt) break;
    integrate(state, prepared.acceleration, prepared.dt);
    // Emit after a completed tick; the following tick rebuilds its neighbors.
    if (pouring) pour(state, nozzle);
    remaining = Math.max(0, remaining - prepared.dt);
    steps++;
  }
  if (steps === 64) {
    dropped += remaining;
    remaining = 0;
  }
  return { remainder: remaining, steps, dropped };
}
