import { boxMinimum, boxMaximum, type Point } from "./model.ts";
export interface Volume {
  count: [number, number, number];
  density: Float32Array;
}
const index = (v: Volume, x: number, y: number, z: number) => x + v.count[0] * (y + v.count[1] * z);
const gaussian = (p: Point, c: Point, r: Point) =>
  Math.exp(-p.reduce((q, x, a) => q + ((x - c[a]) / r[a]) ** 2, 0));
export function makeVolume(preset = 0): Volume {
  const v: Volume = { count: [64, 48, 40], density: new Float32Array(64 * 48 * 40) };
  for (let z = 0; z < 40; z++)
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 64; x++) {
        const p: Point = [
          boxMinimum[0] + (x + 0.5) * 0.05,
          boxMinimum[1] + (y + 0.5) * 0.08,
          boxMinimum[2] + (z + 0.5) * 0.12,
        ];
        let rho = Math.max(
          0,
          Math.min(
            1,
            0.04 +
              0.6 * gaussian(p, [0, 0, 0], [0.85, 1.1, 1.3]) +
              0.75 * gaussian(p, [-0.55, -0.45, 0.35], [0.22, 0.3, 0.5]) +
              0.8 * gaussian(p, [0.9, 0.85, -0.6], [0.18, 0.25, 0.22]),
          ),
        );
        if (preset === 1) rho = (x + 2 * y + 4 * z) / (63 + 2 * 47 + 4 * 39);
        if (preset === 2) rho = 0.25;
        v.density[index(v, x, y, z)] = rho;
      }
  return v;
}
export function sampleDensity(v: Volume, p: Point) {
  const low: Point = [0, 0, 0],
    high: Point = [0, 0, 0],
    fraction: Point = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const uv = (p[a] - boxMinimum[a]) / (boxMaximum[a] - boxMinimum[a]),
      g = Math.max(0, Math.min(v.count[a] - 1, uv * v.count[a] - 0.5));
    low[a] = Math.floor(g);
    high[a] = Math.min(low[a] + 1, v.count[a] - 1);
    fraction[a] = g - low[a];
  }
  let result = 0;
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const corner = [x, y, z],
          i = [...low];
        let weight = 1;
        for (let a = 0; a < 3; a++) {
          let factor = 1 - fraction[a];
          if (corner[a] === 1) {
            i[a] = high[a];
            factor = fraction[a];
          }
          weight *= factor;
        }
        result += weight * v.density[index(v, i[0], i[1], i[2])];
      }
  return result;
}
