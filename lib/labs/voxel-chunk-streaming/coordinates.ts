export type Key = { x: number; z: number };
export type Player = { x: number; z: number };
export const side = 16,
  maxResident = 49,
  playerLimit = 512;
export function validateKey(key: Key) {
  if (![key.x, key.z].every((v) => Number.isInteger(v) && Math.abs(v) <= 64))
    throw new RangeError("chunk key -64..64");
}
export const keyOf = (key: Key) => `${key.x},${key.z}`;
export function splitAxis(position: number) {
  if (!Number.isFinite(position) || Math.abs(position) > playerLimit)
    throw new RangeError("world position -512..512");
  const chunk = Math.floor(position / side),
    local = position - chunk * side;
  return { chunk, local, block: Math.floor(local) };
}
export const centerOf = (p: Player): Key => ({ x: splitAxis(p.x).chunk, z: splitAxis(p.z).chunk });
export const distance = (a: Key, b: Key) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
export function square(center: Key, radius: number) {
  validateKey(center);
  if (!Number.isInteger(radius) || radius < 0 || radius > 3) throw new RangeError("radius 0..3");
  const keys: Key[] = [];
  for (let z = center.z - radius; z <= center.z + radius; z++)
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      const key = { x, z };
      validateKey(key);
      keys.push(key);
    }
  return keys;
}
