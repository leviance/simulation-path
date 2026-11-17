export type Vec3 = [number, number, number];
export type FluidPreset = "dam" | "pool" | "obstacle";
export const tank: Vec3 = [1.65, 0.825, 1.1];
export const rho0 = 1000;
export const blockWidth = 0.55;
export const browserLimit = 8000;
export interface FluidParameters {
  soundSpeed: number;
  alpha: number;
  gravity: number;
}
export const initialParameters: FluidParameters = { soundSpeed: 18, alpha: 0.25, gravity: 9.81 };
export interface Paddle {
  enabled: boolean;
  position: Vec3;
  target: Vec3;
  velocity: Vec3;
  radius: number;
}
export interface FluidState {
  count: number;
  spacing: number;
  h: number;
  mass: number;
  position: Float64Array;
  velocity: Float64Array;
  acceleration: Float64Array;
  density: Float64Array;
  pressure: Float64Array;
  paddle: Paddle;
  time: number;
  ticks: number;
  dt: number;
  maxSpeed: number;
  maxAcceleration: number;
  compression: number;
  leakage: number;
  updated: number;
}

// The domain and total fluid volume do not change when resolution changes.
export function makeFluid(side = 16, preset: FluidPreset = "dam"): FluidState {
  if (!["dam", "pool", "obstacle"].includes(preset)) throw new RangeError("Unknown fluid preset");
  if (![4, 8, 12, 16, 20].includes(side) || side ** 3 > browserLimit)
    throw new RangeError("Canvas supports 4³, 8³, 12³, 16³ or 20³ real CPU particles");
  const count = side ** 3,
    spacing = blockWidth / side;
  const position = new Float64Array(count * 3);
  const nx = preset === "pool" ? 2 * side : side;
  const ny = preset === "pool" ? side / 4 : side;
  const nz = preset === "pool" ? 2 * side : side;
  const origin: Vec3 = preset === "pool" ? [blockWidth / 2, 0, 0] : [0, 0, blockWidth / 2];
  let index = 0;
  for (let z = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++) {
        position[3 * index] = origin[0] + (x + 0.5) * spacing;
        position[3 * index + 1] = origin[1] + (y + 0.5) * spacing;
        position[3 * index + 2] = origin[2] + (z + 0.5) * spacing;
        index++;
      }
  return {
    count,
    spacing,
    h: 1.3 * spacing,
    mass: rho0 * spacing ** 3,
    position,
    velocity: new Float64Array(3 * count),
    acceleration: new Float64Array(3 * count),
    density: new Float64Array(count),
    pressure: new Float64Array(count),
    paddle: {
      enabled: preset === "obstacle",
      position: [0.92, 0.22, 0.55],
      target: [0.92, 0.22, 0.55],
      velocity: [0, 0, 0],
      radius: 0.14,
    },
    time: 0,
    ticks: 0,
    dt: 0,
    maxSpeed: 0,
    maxAcceleration: 0,
    compression: 0,
    leakage: 0,
    updated: 0,
  };
}

export function validateParameters(p: FluidParameters) {
  if (
    !Number.isFinite(p.soundSpeed) ||
    p.soundSpeed < 10 ||
    p.soundSpeed > 40 ||
    !Number.isFinite(p.alpha) ||
    p.alpha < 0 ||
    p.alpha > 1 ||
    !Number.isFinite(p.gravity) ||
    p.gravity < 0 ||
    p.gravity > 20
  )
    throw new RangeError("Sound speed 10..40 m/s, alpha 0..1, gravity 0..20 m/s²");
}
