export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, value: number): Vec3 => ({
  x: a.x * value,
  y: a.y * value,
  z: a.z * value,
});
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
export const finite = (a: Vec3) => [a.x, a.y, a.z].every(Number.isFinite);
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export function unit(a: Vec3): Vec3 {
  const magnitude = length(a);
  if (!finite(a) || magnitude < 1e-12) throw new Error("Hướng phải hữu hạn và khác vector 0.");
  return scale(a, 1 / magnitude);
}
export interface Settings {
  power: number;
  iterations: number;
  bailout: number;
  raySteps: number;
  epsilon: number;
  normalStep: number;
  safety: number;
  farBound: number;
  palette: number;
  samples: 1 | 4;
  slice: boolean;
  sliceY: number;
  useDe: boolean;
  lighting: boolean;
  occlusion: boolean;
}
export const defaultSettings: Settings = {
  power: 8,
  iterations: 12,
  bailout: 8,
  raySteps: 96,
  epsilon: 0.0015,
  normalStep: 0.003,
  safety: 0.55,
  farBound: 32,
  palette: 0,
  samples: 1,
  slice: false,
  sliceY: 0,
  useDe: true,
  lighting: true,
  occlusion: false,
};
export function validate(settings: Settings) {
  const s = settings;
  if (
    !Number.isInteger(s.power) ||
    s.power < 2 ||
    s.power > 12 ||
    !Number.isInteger(s.iterations) ||
    s.iterations < 4 ||
    s.iterations > 12 ||
    !Number.isInteger(s.raySteps) ||
    s.raySteps < 32 ||
    s.raySteps > 96
  )
    throw new Error("Canvas: power 2–12, iterations 4–12, ray steps 32–96.");
  if (
    !Number.isFinite(s.bailout) ||
    s.bailout < 2 ||
    s.bailout > 16 ||
    !Number.isFinite(s.epsilon) ||
    s.epsilon < 0.0015 ||
    s.epsilon > 0.01 ||
    !Number.isFinite(s.normalStep) ||
    s.normalStep < 0.003 ||
    s.normalStep > 0.02
  )
    throw new Error("Bailout, epsilon hoặc bước normal vượt giới hạn Canvas.");
  if (
    !Number.isFinite(s.safety) ||
    s.safety < 0.2 ||
    s.safety > 1 ||
    !Number.isFinite(s.farBound) ||
    s.farBound < 4 ||
    s.farBound > 40 ||
    !Number.isFinite(s.sliceY) ||
    Math.abs(s.sliceY) > 2
  )
    throw new Error("Safety, far bound hoặc mặt cắt không hợp lệ.");
  if (![1, 4].includes(s.samples) || !Number.isInteger(s.palette) || s.palette < 0 || s.palette > 2)
    throw new Error("Chọn 1/4 mẫu và palette 0–2.");
}
export function previewSettings(settings: Settings): Settings {
  return {
    ...settings,
    iterations: Math.min(settings.iterations, 8),
    raySteps: 32,
    epsilon: Math.max(settings.epsilon, 0.004),
    normalStep: Math.max(settings.normalStep, 0.006),
    samples: 1,
    occlusion: false,
  };
}
export const imageWidth = 96,
  imageHeight = 54,
  previewWidth = 32,
  previewHeight = 18;
// Per Canvas tick: at most 48 pixels, one sample per pixel, finite orbit/step caps.
export function batchBound(s: Settings, pixels = 48) {
  validate(s);
  if (!Number.isInteger(pixels) || pixels < 1 || pixels > 48)
    throw new Error("Mỗi batch Canvas có 1–48 pixel.");
  return pixels * (s.raySteps + 1 + 8 + 6 + 4) * s.iterations;
}
