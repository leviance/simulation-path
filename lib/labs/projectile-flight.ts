import {
  analyticProjectilePosition,
  compareProjectileState,
  explicitEulerProjectileStepToGround,
  launchProjectileState,
  planProjectileFixedSteps,
  projectileVelocityFromPolar,
  type ProjectileLaunch,
  type ProjectileState,
  type ProjectileImpactResult,
  type ProjectileVec2,
} from "./projectile.ts";

export interface ProjectileSettings {
  speed: number;
  angleDegrees: number;
  gravity: number;
  fixedDt: number;
}
export interface ProjectileSample {
  elapsed: number;
  position: ProjectileVec2;
  error: number;
}
export interface ProjectileFlight {
  launch: ProjectileLaunch;
  projectile: ProjectileState;
  fixedDt: number;
  samples: ProjectileSample[];
  errors: { count: number; sum: number; maximum: number };
  accumulator: number;
  substeps: number;
  droppedTime: number;
  impact: ProjectileImpactResult | null;
  exists: boolean;
  logLimitReached: boolean;
}
export const projectileDefaults = (): ProjectileSettings => ({
  speed: 28,
  angleDegrees: 50,
  gravity: 9.81,
  fixedDt: 1 / 30,
});
export function projectileLaunch(settings: ProjectileSettings): ProjectileLaunch {
  return {
    position: { x: 0, y: 1.2 },
    velocity: projectileVelocityFromPolar(settings.speed, (settings.angleDegrees * Math.PI) / 180),
    acceleration: { x: 0, y: -settings.gravity },
  };
}
export function createProjectileFlight(
  settings: ProjectileSettings,
  exists = true,
): ProjectileFlight {
  const launch = projectileLaunch(settings);
  const projectile = { ...launchProjectileState(launch), active: exists };
  return {
    launch,
    projectile,
    fixedDt: settings.fixedDt,
    samples: exists ? [{ elapsed: 0, position: { ...projectile.position }, error: 0 }] : [],
    errors: { count: exists ? 1 : 0, sum: 0, maximum: 0 },
    accumulator: 0,
    substeps: 0,
    droppedTime: 0,
    impact: null,
    exists,
    logLimitReached: false,
  };
}
export function stepProjectileFlight(current: ProjectileFlight): ProjectileFlight {
  if (!current.projectile.active) return current;
  const impact = explicitEulerProjectileStepToGround(
    current.projectile,
    current.launch.acceleration,
    current.fixedDt,
    0,
  );
  const error = compareProjectileState(current.launch, impact.state).error;
  const samples = [
    ...current.samples,
    { elapsed: impact.state.elapsed, position: { ...impact.state.position }, error },
  ];
  const logLimitReached = samples.length >= 8192;
  return {
    ...current,
    projectile: { ...impact.state, active: impact.state.active && !logLimitReached },
    samples,
    errors: {
      count: samples.length,
      sum: current.errors.sum + error,
      maximum: Math.max(current.errors.maximum, error),
    },
    substeps: 1,
    impact,
    logLimitReached,
  };
}
export function advanceProjectileFlight(
  current: ProjectileFlight,
  frameSeconds: number,
): ProjectileFlight {
  if (!current.projectile.active || !Number.isFinite(frameSeconds) || frameSeconds <= 0)
    return current;
  const plan = planProjectileFixedSteps(
    current.accumulator,
    frameSeconds,
    current.fixedDt,
    32,
    0.1,
  );
  let next = current;
  let substeps = 0;
  for (let index = 0; index < plan.steps && next.projectile.active; index++) {
    next = stepProjectileFlight(next);
    substeps++;
  }
  return {
    ...next,
    substeps,
    accumulator: plan.remainder,
    droppedTime: current.droppedTime + plan.droppedTime,
  };
}
export function projectileMeanError(flight: ProjectileFlight) {
  return flight.errors.count ? flight.errors.sum / flight.errors.count : 0;
}
export function projectileView(width: number, height: number, launches: ProjectileLaunch[]) {
  let range = 20,
    altitude = 12;
  for (const launch of launches) {
    const g = -launch.acceleration.y;
    const duration =
      (launch.velocity.y + Math.sqrt(launch.velocity.y ** 2 + 2 * g * launch.position.y)) / g;
    range = Math.max(range, analyticProjectilePosition(launch, duration).x + 12);
    altitude = Math.max(altitude, analyticProjectilePosition(launch, launch.velocity.y / g).y + 8);
  }
  return {
    screenOrigin: { x: 48, y: height - 46 },
    pixelsPerMeter: Math.min((width - 76) / range, (height - 80) / altitude),
  };
}
