// Stateless integer hash: the same signed lattice address and seed give the same value.
export function latticeHash(x: number, z: number, seed: number) {
  if (
    ![x, z, seed].every(Number.isInteger) ||
    Math.abs(x) > 4096 ||
    Math.abs(z) > 4096 ||
    seed < 0 ||
    seed > 65535
  )
    throw new RangeError("lattice/seed outside teaching domain");
  let hash = (Math.imul(x, 0x8da6b343) ^ Math.imul(z, 0xd8163841) ^ seed) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b) >>> 0;
  return (hash ^ (hash >>> 16)) >>> 0;
}
export function latticeValue(x: number, z: number, seed: number) {
  return ((latticeHash(x, z, seed) & 65535) / 65535) * 2 - 1;
}
export const blend = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export function valueNoise(x: number, z: number, seed: number) {
  if (![x, z].every((v) => Number.isFinite(v) && Math.abs(v) <= 2048))
    throw new RangeError("noise coordinates -2048..2048");
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smooth(x - x0);
  const tz = smooth(z - z0);
  const a = blend(latticeValue(x0, z0, seed), latticeValue(x0 + 1, z0, seed), tx);
  const b = blend(latticeValue(x0, z0 + 1, seed), latticeValue(x0 + 1, z0 + 1, seed), tx);
  return blend(a, b, tz);
}
