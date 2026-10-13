import {
  defaultSettings,
  finite,
  length,
  maxDt,
  restDensity,
  subtract,
  validateSettings,
  type Particle,
  type Plan,
  type Settings,
  type Vec3,
} from "./model.ts";
import { gradient, kernel, viscosity } from "./kernel.ts";
import { neighbors } from "./grid.ts";
export function evaluate(
  plan: Plan,
  particles: Particle[],
  settings: Settings = defaultSettings,
  stage = 12,
) {
  validateSettings(settings);
  if (particles.some((p) => !finite(p.position) || !finite(p.velocity)))
    throw new RangeError("Nonfinite SPH state");
  const neighborhood = neighbors(plan, particles, stage >= 8 && settings.grid);
  const density = particles.map((p, i) =>
    stage >= 5
      ? neighborhood.lists[i].reduce(
          (rho, j) =>
            rho + plan.mass * kernel(length(subtract(p.position, particles[j].position)), plan.h),
          0,
        )
      : restDensity,
  );
  const pressure = density.map((rho) =>
    stage >= 6 ? Math.max(0, settings.soundSpeed ** 2 * (rho - restDensity)) : 0,
  );
  const acceleration = particles.map((p, i) => {
    const a: Vec3 = { x: 0, y: 0, z: 0 };
    if (stage >= 7) a.y = -settings.gravity;
    if (stage >= 6)
      for (const j of neighborhood.lists[i]) {
        if (i === j) continue;
        const other = particles[j],
          d = subtract(p.position, other.position),
          grad = gradient(d, plan.h);
        const coefficient =
          pressure[i] / density[i] ** 2 +
          pressure[j] / density[j] ** 2 +
          viscosity(
            d,
            subtract(p.velocity, other.velocity),
            density[i],
            density[j],
            plan.h,
            settings.soundSpeed,
            settings.alpha,
          );
        a.x -= plan.mass * coefficient * grad.x;
        a.y -= plan.mass * coefficient * grad.y;
        a.z -= plan.mass * coefficient * grad.z;
      }
    if (!finite(a)) throw new RangeError("Nonfinite force");
    return a;
  });
  return { ...neighborhood, density, pressure, acceleration };
}
export function chooseDt(plan: Plan, particles: Particle[], acceleration: Vec3[], c: number) {
  if (
    !Number.isFinite(c) ||
    c < 8 ||
    c > 20 ||
    acceleration.length !== particles.length ||
    particles.some((p) => !finite(p.velocity)) ||
    acceleration.some((a) => !finite(a))
  )
    throw new RangeError("Invalid timestep input");
  const speed = Math.max(0, ...particles.map((p) => length(p.velocity))),
    force = Math.max(0, ...acceleration.map(length));
  const dt = Math.min(
    maxDt,
    (0.25 * plan.h) / (c + speed),
    0.25 * Math.sqrt(plan.h / Math.max(force, 1e-12)),
  );
  if (!Number.isFinite(dt) || dt < 1e-6)
    throw new RangeError("Timestep below 1e-6; reset the state");
  return dt;
}
export function integrate(plan: Plan, particles: Particle[], acceleration: Vec3[], dt: number) {
  return particles.map((p, i) => {
    const velocity = {
      x: p.velocity.x + dt * acceleration[i].x,
      y: p.velocity.y + dt * acceleration[i].y,
      z: p.velocity.z + dt * acceleration[i].z,
    };
    const position = {
      x: p.position.x + dt * velocity.x,
      y: p.position.y + dt * velocity.y,
      z: p.position.z + dt * velocity.z,
    };
    for (const axis of ["x", "y", "z"] as const) {
      if (position[axis] < plan.spacing / 2) {
        position[axis] = plan.spacing / 2;
        if (velocity[axis] < 0) velocity[axis] *= -0.1;
      }
      if (position[axis] > 1 - plan.spacing / 2) {
        position[axis] = 1 - plan.spacing / 2;
        if (velocity[axis] > 0) velocity[axis] *= -0.1;
      }
    }
    if (!finite(position) || !finite(velocity)) throw new RangeError("Nonfinite integration");
    return { position, velocity };
  });
}
export function step(plan: Plan, particles: Particle[], settings: Settings, stage: number) {
  const report = evaluate(plan, particles, settings, stage);
  const dt =
    stage >= 9 ? chooseDt(plan, particles, report.acceleration, settings.soundSpeed) : maxDt;
  return {
    particles: stage >= 7 ? integrate(plan, particles, report.acceleration, dt) : particles,
    report,
    dt,
  };
}
