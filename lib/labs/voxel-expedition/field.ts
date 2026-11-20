import { bankData, type BankPreset, type Point } from "./bank.ts";

export const marks = ["Bãi cát", "Thung lũng", "Hẻm đá", "Rừng thông tuyết", "Bếp lửa"] as const;
export const markZ = [4, 39, 96, 170, 147] as const;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function smooth(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
export function windAt(x: number, z: number, seconds: number, angle: number, speed: number) {
  const a = x * Math.cos(angle) + z * Math.sin(angle);
  return (
    speed *
    (0.62 + 0.26 * Math.sin(1.8 * seconds - 0.31 * a) + 0.12 * Math.sin(3 * seconds - 0.52 * a))
  );
}
export function swayOffset(height: number, flex: number, wind: number) {
  const u = clamp(height, 0, 1);
  return u * u * flex * wind;
}
export function oceanAt(x: number, z: number, time: number) {
  const a = 0.53 * x + 0.23 * z - 1.6 * time,
    b = -0.21 * x + 0.78 * z - 2.1 * time;
  const dx = 0.32 * 0.53 * Math.cos(a) - 0.13 * 0.21 * Math.cos(b),
    dz = 0.32 * 0.23 * Math.cos(a) + 0.13 * 0.78 * Math.cos(b);
  const length = Math.hypot(dx, 1, dz);
  return {
    height: 0.32 * Math.sin(a) + 0.13 * Math.sin(b),
    normal: [-dx / length, 1 / length, -dz / length] as Point,
  };
}
export function flowPhase(s: number, t: number, speed = 0.72, period = 4) {
  const k = (s - speed * t) / period;
  return k - Math.floor(k);
}
export function sunAt(hour: number) {
  const p = (Math.PI * (hour - 6)) / 12,
    x = Math.cos(p),
    y = 0.84 * Math.sin(p),
    z = 0.54 * Math.sin(p);
  const l = Math.hypot(x, y, z);
  return { x: x / l, y: y / l, z: z / l, day: smooth(-0.12, 0.3, y / l) };
}
function hash(x: number, z: number, seed: number) {
  let b =
    (Math.imul(x, 0x8da6b343) ^ (Math.imul(z, 0xd8163841) + Math.imul(seed, 0xcb1ab31f))) >>> 0;
  b = Math.imul((b ^ (b >>> 16)) >>> 0, 0x7feb352d) >>> 0;
  return (b ^ (b >>> 15)) >>> 0;
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function noise(x: number, z: number, seed: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = smooth(0, 1, x - ix),
    v = smooth(0, 1, z - iz);
  const q = (i: number, j: number) => (hash(i, j, seed) & 65535) / 65535;
  return mix(mix(q(ix, iz), q(ix + 1, iz), u), mix(q(ix, iz + 1), q(ix + 1, iz + 1), u), v);
}
export function cloudAt(x: number, z: number, t: number, angle: number, seed = 73) {
  const a = x - 0.74 * Math.cos(angle) * t,
    b = z - 0.74 * Math.sin(angle) * t;
  return smooth(
    0.51,
    0.67,
    0.72 * noise(a / 43, b / 34, seed) + 0.28 * noise(a / 17, b / 14, seed + 7),
  );
}

const normals = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;
export type Rect = { u: number; v: number; w: number; h: number; block: number };
export function meshCounts(preset: BankPreset, planeRects?: Rect[]) {
  const cells = bankData(preset);
  const get = (x: number, y: number, z: number) =>
    x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16 ? 0 : cells[x + 16 * (z + 16 * y)];
  let chosenPlane = 15;
  if (preset === "stone") chosenPlane = 7;
  if (preset === "bank") chosenPlane = 3;
  const solid = cells.reduce((sum, b) => sum + Number(b !== 0), 0);
  let visible = 0,
    greedy = 0;
  for (let f = 0; f < 6; f++)
    for (let plane = 0; plane < 16; plane++) {
      const mask = new Uint8Array(256),
        [dx, dy, dz] = normals[f];
      for (let v = 0; v < 16; v++)
        for (let u = 0; u < 16; u++) {
          const x = f < 2 ? plane : u,
            y = f < 2 ? v : f < 4 ? plane : v,
            z = f < 2 ? u : f < 4 ? v : plane;
          const a = get(x, y, z),
            b = get(x + dx, y + dy, z + dz);
          if (a && (b === 0 || (a !== 7 && b === 7))) {
            mask[u + 16 * v] = a;
            visible++;
          }
        }
      for (let v = 0; v < 16; v++)
        for (let u = 0; u < 16; u++) {
          const b = mask[u + 16 * v];
          if (!b) continue;
          let w = 1,
            h = 1;
          if (b !== 6 && b !== 7) {
            while (u + w < 16 && mask[u + w + 16 * v] === b) w++;
            while (
              v + h < 16 &&
              mask.subarray(u + 16 * (v + h), u + 16 * (v + h) + w).every((a) => a === b)
            )
              h++;
          }
          for (let j = 0; j < h; j++) mask.fill(0, u + 16 * (v + j), u + w + 16 * (v + j));
          if (planeRects && f === 2 && plane === chosenPlane)
            planeRects.push({ u, v, w, h, block: b });
          greedy++;
        }
    }
  return { solid, naive: solid * 6, visible, greedy };
}
export type StreamState = {
  x: number;
  z: number;
  resident: Set<string>;
  wanted: string[];
  unloaded: number;
};
export const key = (x: number, z: number) => x + "," + z;
export function planStream(prev: StreamState | undefined, x: number, z: number): StreamState {
  if (prev && prev.x === x && prev.z === z) return prev;
  const resident = new Set(prev?.resident ?? []);
  let unloaded = prev?.unloaded ?? 0;
  const wanted: string[] = [];
  for (const k of resident) {
    const [a, b] = k.split(",").map(Number);
    if (Math.max(Math.abs(a - x), Math.abs(b - z)) > 3) {
      resident.delete(k);
      unloaded++;
    }
  }
  for (let r = 0; r <= 2; r++)
    for (let b = -r; b <= r; b++)
      for (let a = -r; a <= r; a++) {
        const k = key(x + a, z + b);
        if (Math.max(Math.abs(a), Math.abs(b)) === r && !resident.has(k)) wanted.push(k);
      }
  return { x, z, resident, wanted, unloaded };
}
export function pump(s: StreamState, budget = 1): StreamState {
  if (!s.wanted.length) return s;
  const resident = new Set(s.resident);
  for (const k of s.wanted.slice(0, budget)) resident.add(k);
  return { ...s, resident, wanted: s.wanted.slice(budget) };
}
