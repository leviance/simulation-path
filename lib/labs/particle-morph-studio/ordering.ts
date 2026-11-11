import { clamp, finite, type Vec3 } from "./math.ts";

export const spatialCellCount = 32768;
function spread5(value: number) {
  let result = 0;
  for (let bit = 0; bit < 5; bit++) result |= ((value >>> bit) & 1) << (3 * bit);
  return result;
}
export function spatialKey(point: Vec3) {
  if (!finite(point)) throw new Error("Không thể xếp điểm không hữu hạn.");
  const cell = (value: number) => Math.min(31, Math.floor(clamp((value + 3.5) / 7, 0, 1) * 32));
  return spread5(cell(point.x)) | (spread5(cell(point.y)) << 1) | (spread5(cell(point.z)) << 2);
}
export class SpatialOrder {
  private counts = new Uint32Array(spatialCellCount);
  private offsets = new Uint32Array(spatialCellCount);
  readonly order: Uint32Array;
  private cursor = 0;
  private phase = 0;
  constructor(count: number) {
    this.order = new Uint32Array(count);
  }
  advance(points: readonly Vec3[], batch = 512) {
    batch = clamp(Math.floor(batch), 1, 32768);
    if (this.phase === 0) {
      const end = Math.min(points.length, this.cursor + batch);
      while (this.cursor < end) this.counts[spatialKey(points[this.cursor++])]++;
      if (this.cursor === points.length) {
        this.cursor = 0;
        this.phase = 1;
      }
    } else if (this.phase === 1) {
      // Fixed 32^3 table, independent of N; the variable-size passes remain batched.
      let total = 0;
      for (let cell = 0; cell < spatialCellCount; cell++) {
        this.offsets[cell] = total;
        total += this.counts[cell];
      }
      this.phase = 2;
    } else if (this.phase === 2) {
      const end = Math.min(points.length, this.cursor + batch);
      while (this.cursor < end) {
        const id = this.cursor++;
        this.order[this.offsets[spatialKey(points[id])]++] = id;
      }
      if (this.cursor === points.length) this.phase = 3;
    }
    return this.phase === 3;
  }
}
