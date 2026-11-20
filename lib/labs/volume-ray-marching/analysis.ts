import { defaultSettings, type Ray, type Settings } from "./model.ts";
import { histogram, makeVolume, type Volume } from "./volume.ts";
import { march, rawOutput } from "./march.ts";
export function audit(volume: Volume) {
  let checks = 0,
    maximumError = 0;
  const check = (actual: number, expected: number, tolerance = 1e-10) => {
    checks++;
    const error = Math.abs(actual - expected);
    if (!Number.isFinite(actual) || error > tolerance)
      throw new Error("Fixture failed: " + actual + " != " + expected);
    maximumError = Math.max(maximumError, error);
  };
  check(volume.values.length, volume.side ** 3, 0);
  check(
    histogram(volume).reduce((sum, value) => sum + value, 0),
    volume.side ** 3,
    0,
  );
  const ray: Ray = { origin: [0, 0, 3], direction: [0, 0, -1] };
  const constant = makeVolume("constant", 8),
    slab = makeVolume("slab", 128);
  for (const mode of ["mip", "average", "alpha"] as const) {
    for (const stepLength of [0.02, 0.13]) {
      const settings: Settings = {
        ...defaultSettings,
        mode,
        stepLength,
        palette: 2,
        lighting: false,
        sigma: 2,
        cutoff: 0,
        early: false,
      };
      const result = rawOutput(march(ray, constant, settings), mode);
      const expected =
        mode === "alpha"
          ? [1 - Math.exp(-1), 1 - Math.exp(-1), 1 - Math.exp(-1), Math.exp(-1)]
          : [0.25, 0.25, 0.25, 1];
      result.forEach((value, i) => check(value, expected[i]));
    }
    const rho = Math.fround(0.65),
      settings: Settings = {
        ...defaultSettings,
        mode,
        stepLength: 1 / 64,
        palette: 2,
        lighting: false,
        sigma: 2,
        cutoff: 0,
        early: false,
      };
    const result = rawOutput(march(ray, slab, settings), mode),
      t = Math.exp(-2 * rho * 0.75);
    let expected = [rho, rho, rho, 1];
    if (mode === "average") expected = [rho * 0.375, rho * 0.375, rho * 0.375, 1];
    if (mode === "alpha") expected = [1 - t, 1 - t, 1 - t, t];
    result.forEach((value, i) => check(value, expected[i]));
  }
  return { checks, maximumError };
}
