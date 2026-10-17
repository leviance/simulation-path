import { blend, latticeValue, smooth } from "./noise.ts";

// A single lattice cell with closed [0,1] weights also exposes its four corners.
export function interpolationCell(
  x0: number,
  z0: number,
  tx: number,
  tz: number,
  seed: number,
  smoothWeights = true,
) {
  if (![x0, z0].every((v) => Number.isInteger(v) && Math.abs(v) <= 2))
    throw new RangeError("lattice cell -2..2");
  if (![tx, tz].every((v) => Number.isFinite(v) && v >= 0 && v <= 1))
    throw new RangeError("weights 0..1");
  const v00 = latticeValue(x0, z0, seed);
  const v10 = latticeValue(x0 + 1, z0, seed);
  const v01 = latticeValue(x0, z0 + 1, seed);
  const v11 = latticeValue(x0 + 1, z0 + 1, seed);
  let sx = tx,
    sz = tz;
  if (smoothWeights) {
    sx = smooth(tx);
    sz = smooth(tz);
  }
  const a = blend(v00, v10, sx);
  const b = blend(v01, v11, sx);
  const n = blend(a, b, sz);
  return { x0, z0, tx, tz, sx, sz, v00, v10, v01, v11, a, b, n, x: x0 + tx, z: z0 + tz };
}
