import { defaultSettings, h, mass, type Settings } from "./model.ts";
import { artificialViscosity, gradient } from "./kernel.ts";
import { pressure } from "./forces.ts";
export type PairParameters = { densityA: number; densityB: number; approaching: boolean };
export const defaultPair: PairParameters = { densityA: 1100, densityB: 1200, approaching: true };
export function inspectPair(
  parameters: PairParameters = defaultPair,
  settings: Settings = defaultSettings,
) {
  const dx = -h,
    grad = gradient(dx, 0),
    pressureA = pressure(parameters.densityA, settings.soundSpeed),
    pressureB = pressure(parameters.densityB, settings.soundSpeed);
  let dvx = -2;
  if (parameters.approaching) dvx = 2;
  const pi = artificialViscosity(dx, 0, dvx, 0, parameters.densityA, parameters.densityB, settings);
  const pressureForce =
    -mass *
    mass *
    (pressureA / parameters.densityA ** 2 + pressureB / parameters.densityB ** 2) *
    grad.x;
  const viscosityForce = -mass * mass * pi * grad.x;
  return {
    pressureA,
    pressureB,
    pressureForce,
    viscosityForce,
    pi,
    power: viscosityForce * dvx,
    netForce: 0,
  };
}
