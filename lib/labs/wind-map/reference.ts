import {
  makeField,
  exactGradient,
  world,
  initialScene,
  type WindField,
  type Potential,
  type Preset,
} from "./model.ts";
import { curl, divergence } from "./operators.ts";
import { populate } from "./scenes.ts";
export function maximumError(current: number, candidate: number) {
  if (!Number.isFinite(current) || !Number.isFinite(candidate)) return Infinity;
  return Math.max(current, candidate);
}
export function gradientError(field: WindField, potential: Potential) {
  let interior = 0,
    boundary = 0;
  let finite = true;
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x,
        exact = exactGradient(world(field, x, y), potential);
      const error = Math.hypot(field.vx[i] - exact.x, field.vy[i] - exact.y);
      if (!Number.isFinite(error)) finite = false;
      if (x === 0 || y === 0 || x === field.width - 1 || y === field.height - 1)
        boundary = maximumError(boundary, error);
      else interior = maximumError(interior, error);
    }
  return { interior, boundary, finite };
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
        derivativeError = maximumError(
          derivativeError,
          maximumError(Math.abs(divergence(field, x, y) - div), Math.abs(curl(field, x, y) - spin)),
        );
  }
  populate(field, { ...initialScene(), preset: "gradient", potential: "hill" });
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++)
      gradientCurl = maximumError(gradientCurl, Math.abs(curl(field, x, y)));
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
      coarse.finite &&
      refined.finite &&
      derivativeError < 1e-10 &&
      gradientCurl < 1e-10 &&
      refined.interior < coarse.interior / 3 &&
      refined.boundary < coarse.boundary / 3,
  };
}
