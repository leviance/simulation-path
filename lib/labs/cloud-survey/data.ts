import { around, type Box, type CloudPoint } from "./geometry.ts";
export const maximumPoints = 200000;
export function makeRoom(count = 100000, seed = 30, uniform = false): CloudPoint[] {
  if (!Number.isInteger(count) || count < 0 || count > maximumPoints)
    throw Error("Tối đa 200.000 điểm");
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const points: CloudPoint[] = [];
  for (let index = 0; index < count; index++) {
    const a = next(),
      b = next(),
      c = next();
    let p = { x: -12 + 24 * a, y: 8 * b, z: -9 + 18 * c };
    if (!uniform) {
      const surface = index % 10;
      if (surface <= 1) p.y = 0;
      else if (surface === 2) p.y = 8;
      else if (surface === 3) p.x = -12;
      else if (surface === 4) p.x = 12;
      else if (surface === 5) p.z = -9;
      else if (surface === 6) p.z = 9;
      else if (surface === 7 || surface === 8)
        p = { x: -7 + 14 * a, y: 1.5 + (index % 4) * 1.3, z: -4 + (index % 2) * 8 };
      else {
        const angle = a * 2 * Math.PI;
        p = { x: 3 + Math.cos(angle), y: 4 * b, z: 2 + Math.sin(angle) };
      }
    }
    points.push({ id: index, position: p });
  }
  return points;
}
export function rootFor(points: readonly CloudPoint[]): Box {
  if (!points.length) return around({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
  const minimum = { ...points[0].position },
    maximum = { ...minimum };
  for (const { position: p } of points)
    for (const axis of ["x", "y", "z"] as const) {
      minimum[axis] = Math.min(minimum[axis], p[axis]);
      maximum[axis] = Math.max(maximum[axis], p[axis]);
    }
  const center = {
    x: (minimum.x + maximum.x) / 2,
    y: (minimum.y + maximum.y) / 2,
    z: (minimum.z + maximum.z) / 2,
  };
  const half =
    Math.max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z, 1) / 2 + 1e-6;
  return around(center, { x: half, y: half, z: half });
}
