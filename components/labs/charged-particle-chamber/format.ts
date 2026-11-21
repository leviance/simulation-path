import type { Vec3 } from "@/lib/labs/charged-particle-chamber/math";

export const vector = (v: Vec3) => `[${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)}]`;
export const error = (value: number | null) =>
  value === null ? "chưa có" : value.toExponential(3);
