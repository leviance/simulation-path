export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export type Shape = "sphere" | "torus" | "knot";
export type Sampling = "area" | "triangle";
export type Matching = "random" | "spatial";
export type Easing = "linear" | "smooth";
export type Path = "straight" | "arc" | "flow";
export const tau = 2 * Math.PI;
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
export const finite = (a: Vec3) => [a.x, a.y, a.z].every(Number.isFinite);
export const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
export function unit(a: Vec3): Vec3 {
  const size = length(a);
  if (!Number.isFinite(size) || size < 1e-12) throw new Error("Hướng không có độ dài hữu hạn.");
  return scale(a, 1 / size);
}
export class Random {
  private state: number;
  constructor(state: number) {
    this.state = state >>> 0;
  }
  next() {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state;
  }
  uniform() {
    return this.next() / 4294967296;
  }
  index(count: number) {
    if (!Number.isInteger(count) || count <= 0 || count > 0xffffffff)
      throw new Error("Tập chỉ số phải khác rỗng.");
    const threshold = (-count >>> 0) % count;
    let value = this.next();
    while (value < threshold) value = this.next();
    return value % count;
  }
}
export function barycentric(u: number, v: number): readonly [number, number, number] {
  if (![u, v].every(Number.isFinite) || u < 0 || u > 1 || v < 0 || v > 1)
    throw new Error("u/v phải thuộc [0,1].");
  const root = Math.sqrt(u);
  return [1 - root, root * (1 - v), root * v];
}
export function curveOffset(source: Vec3): Vec3 {
  return { x: -0.28 * source.z, y: 0.35 + 0.08 * Math.sin(1.5 * source.x), z: 0.28 * source.x };
}
export function eased(t: number, mode: Easing) {
  t = clamp(t, 0, 1);
  if (mode === "smooth") return t * t * (3 - 2 * t);
  return t;
}
export function flowRandom(id: number, salt: number) {
  let value = (id ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return (value >>> 8) / 16777216;
}
export function flowPhase(t: number, id: number) {
  const skew = 2 * flowRandom(id, 0x68bc21eb) - 1;
  return t + (0.48 * skew * Math.sin(Math.PI * t)) / Math.PI;
}
export function flowJitter(id: number): Vec3 {
  const z = 2 * flowRandom(id, 0x9e3779b9) - 1;
  const phi = tau * flowRandom(id, 0x243f6a88);
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  const radius = Math.cbrt(flowRandom(id, 0xb7e15162));
  return scale({ x: radial * Math.cos(phi), y: z, z: radial * Math.sin(phi) }, radius);
}
export function flowOffset(offset: Vec3, s: number, id: number): Vec3 {
  const drift = add(scale(offset, 0.7), scale(flowJitter(id), 0.65));
  const angle = tau * s;
  const swirl = {
    x: drift.x * Math.cos(angle) - drift.z * Math.sin(angle),
    y: drift.y,
    z: drift.x * Math.sin(angle) + drift.z * Math.cos(angle),
  };
  return scale(swirl, Math.sin(Math.PI * s) ** 2);
}
export function morphPosition(
  a: Vec3,
  b: Vec3,
  offset: Vec3,
  t: number,
  easing: Easing,
  path: Path,
  id = 0,
): Vec3 {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (path === "flow") t = flowPhase(t, id);
  const s = eased(t, easing);
  let point = add(scale(a, 1 - s), scale(b, s));
  if (path === "arc") point = add(point, scale(offset, Math.sin(Math.PI * s)));
  if (path === "flow") point = add(point, flowOffset(offset, s, id));
  return point;
}
export function advanceTime(
  time: number,
  dt: number,
  duration: number,
  reverse: boolean,
  loop: boolean,
) {
  if (
    ![time, dt, duration].every(Number.isFinite) ||
    dt < 0 ||
    dt > 60 ||
    duration < 0.25 ||
    duration > 60
  )
    throw new Error("Thời gian hoặc duration không hợp lệ.");
  const direction = reverse ? -1 : 1;
  const next = time + direction * dt;
  if (!loop) return clamp(next, 0, duration);
  if (next >= 0 && next <= duration) return next;
  return next - Math.floor(next / duration) * duration;
}
export function nativeMemory(count: number, active = 0) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 5_000_000 ||
    !Number.isInteger(active) ||
    active < 0 ||
    active > 5_000_000
  )
    throw new Error("N không hợp lệ.");
  const bytes = {
    source: 16 * count,
    target: 16 * count,
    current: 16 * (count + 1),
    path: 16 * count,
    mapping: 8 * count,
  };
  const payload = Object.values(bytes).reduce((sum, value) => sum + value, 0);
  return {
    ...bytes,
    payload,
    gpuPeak: payload + 72 * active + 16 + 32 * 1024 ** 2,
    cpuPeak: 64 * count + 56 * active + 8 * 1024 ** 2,
  };
}
