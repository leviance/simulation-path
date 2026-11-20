export type Point = [number, number, number];
export type View = { eye: Point; yaw: number; pitch: number };
export type BankPreset = "bank" | "stone" | "solid" | "empty";
export const tileNames = ["Không khí", "Cỏ", "Đất", "Đá", "Cát", "Gỗ", "Lá", "Nước"] as const;

export function localIndex(x: number, y: number, z: number) {
  if (![x, y, z].every((n) => Number.isInteger(n) && n >= 0 && n < 16))
    throw new RangeError("localIndex");
  return x + 16 * (z + 16 * y);
}
export function bankHeight(x: number, z: number) {
  const creek = 6.3 + 2.3 * Math.sin(z * 0.29);
  const bank = Math.max(0, Math.abs(x - creek) - 1.35);
  return Math.min(9, 2 + Math.floor(bank * 0.82));
}
export function bankData(preset: BankPreset): Uint8Array {
  const cells = new Uint8Array(4096);
  if (preset === "stone") cells[localIndex(7, 7, 7)] = 3;
  if (preset === "solid") cells.fill(3);
  if (preset !== "bank") return cells;
  for (let z = 0; z < 16; z++)
    for (let x = 0; x < 16; x++) {
      const height = bankHeight(x, z);
      for (let y = 0; y <= height; y++)
        cells[localIndex(x, y, z)] = y === height ? (height <= 4 ? 4 : 1) : y >= height - 2 ? 2 : 3;
      for (let y = height + 1; y <= 3; y++) cells[localIndex(x, y, z)] = 7;
    }
  for (const [rx, rz] of [
    [2, 11],
    [13, 12],
  ]) {
    const ground = bankHeight(rx, rz) + 1;
    for (let z = Math.max(0, rz - 3); z <= Math.min(15, rz + 3); z++)
      for (let x = Math.max(0, rx - 3); x <= Math.min(15, rx + 3); x++) {
        for (let h = 0; h <= 6 && ground + h < 16; h++) {
          const i = localIndex(x, ground + h, z);
          const dx = Math.abs(x - rx),
            dz = Math.abs(z - rz);
          if (dx === 0 && dz === 0 && h < 5) {
            cells[i] = 5;
            continue;
          }
          const crown = h >= 5 ? 1 : h >= 2 ? 2 : -1;
          if (Math.max(dx, dz) <= crown && dx + dz <= crown + 1 && cells[i] === 0) cells[i] = 6;
        }
      }
  }
  return cells;
}
export function spawn(preset: BankPreset): View {
  if (preset === "bank") return { eye: [7, 5.75, 0.8], yaw: 0.12, pitch: 0.015 };
  if (preset === "solid") return { eye: [23, 21, -9], yaw: -0.71, pitch: -0.5 };
  return { eye: [11.4, 10.3, 3.2], yaw: -0.61, pitch: -0.49 };
}
export function travel(view: View, forward: number, right: number, up = 0): View {
  const dx = Math.sin(view.yaw) * forward + Math.cos(view.yaw) * right;
  const dz = Math.cos(view.yaw) * forward - Math.sin(view.yaw) * right;
  const clamp = (n: number) => Math.max(-32, Math.min(48, n));
  return {
    ...view,
    eye: [clamp(view.eye[0] + dx), clamp(view.eye[1] + up), clamp(view.eye[2] + dz)],
  };
}
// Read-only display probe. The downloadable C++ draws an actual triangle mesh.
export function trace(cells: Uint8Array, eye: Point, d: Point) {
  let enter = 0.01,
    end = 70,
    crossing = 1;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-10) {
      if (eye[a] < 0 || eye[a] >= 16) return;
      continue;
    }
    const t0 = -eye[a] / d[a],
      t1 = (16 - eye[a]) / d[a];
    const near = Math.min(t0, t1);
    if (near > enter) {
      enter = near;
      crossing = a;
    }
    end = Math.min(end, Math.max(t0, t1));
  }
  if (enter >= end) return;
  const cell = eye.map((v, i) =>
    Math.max(0, Math.min(15, Math.floor(v + d[i] * (enter + 1e-6)))),
  ) as Point;
  const steps = d.map((v) => Math.sign(v));
  const delta = d.map((v) => (v === 0 ? Infinity : 1 / Math.abs(v)));
  const next = cell.map((v, i) =>
    steps[i] === 0 ? Infinity : (v + (steps[i] > 0 ? 1 : 0) - eye[i]) / d[i],
  );
  for (let i = 0; i < 50 && enter < end; i++) {
    const [x, y, z] = cell;
    if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) return;
    const block = cells[x + 16 * (z + 16 * y)];
    if (block) return { block, t: enter, face: crossing * 2 + (d[crossing] > 0 ? 1 : 0), x, y, z };
    const at = Math.min(...next);
    crossing = next.indexOf(at);
    for (let j = 0; j < 3; j++)
      if (next[j] <= at + 1e-9) {
        cell[j] += steps[j];
        next[j] += delta[j];
      }
    enter = at;
  }
}
