import {
  defaultSettings,
  dot,
  finiteState,
  mass,
  makeState,
  subtract,
  validateSettings,
  type Settings,
  type Vec2,
} from "./model.ts";
import { artificialViscosity, gradient } from "./kernel.ts";
import { buildNeighbors } from "./neighbors.ts";
import { accelerations, computePressure } from "./solver.ts";

export type PairParameters = { densityA: number; densityB: number; approaching: boolean };
export const defaultPair: PairParameters = { densityA: 1100, densityB: 1200, approaching: true };
export function inspectPair(
  parameters: PairParameters = defaultPair,
  settings: Settings = defaultSettings,
  stage = 6,
) {
  validateSettings(settings);
  if (
    ![parameters.densityA, parameters.densityB].every(
      (rho) => Number.isFinite(rho) && rho >= 900 && rho <= 1200,
    )
  ) {
    throw new RangeError("Pair densities must be in [900, 1200]");
  }
  // Prescribed densities isolate the force formula; this is not a density-solved fluid.
  const state = makeState("pair", 1);
  state.walls = [];
  state.particles[0].density = parameters.densityA;
  state.particles[1].density = parameters.densityB;
  if (!parameters.approaching) {
    for (const p of state.particles) {
      p.velocity.x *= -1;
      p.velocity.y *= -1;
    }
  }
  computePressure(state, settings.soundSpeed);
  const neighbors = buildNeighbors(state, false);
  const pressureAcceleration = accelerations(
    state,
    neighbors,
    { ...settings, gravity: 0, alpha: 0 },
    5,
  );
  const totalAcceleration = accelerations(state, neighbors, { ...settings, gravity: 0 }, stage);
  const pressureForce = pressureAcceleration.map((a) => ({ x: mass * a.x, y: mass * a.y }));
  const viscosityForce = totalAcceleration.map((a, i) => ({
    x: mass * (a.x - pressureAcceleration[i].x),
    y: mass * (a.y - pressureAcceleration[i].y),
  }));
  let viscosityPower = 0;
  const netForce: Vec2 = { x: 0, y: 0 };
  state.particles.forEach((p, i) => {
    viscosityPower += dot(p.velocity, viscosityForce[i]);
    netForce.x += mass * totalAcceleration[i].x;
    netForce.y += mass * totalAcceleration[i].y;
  });
  const [a, b] = state.particles,
    displacement = subtract(a.position, b.position);
  const pi =
    stage >= 6
      ? artificialViscosity(
          displacement,
          subtract(a.velocity, b.velocity),
          a.density,
          b.density,
          settings.soundSpeed,
          settings.alpha,
        )
      : 0;
  return {
    state,
    pressureForce,
    viscosityForce,
    netForce,
    viscosityPower,
    pi,
    gradient: gradient(displacement),
    finite: finiteState(state),
  };
}
