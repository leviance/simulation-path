import { tank, type FluidState } from "./state.ts";

// Dense count/prefix/scatter. There is no fixed capacity per cell.
export class FluidGrid {
  readonly size: number;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly count: Int32Array;
  readonly offset: Int32Array;
  readonly cursor: Int32Array;
  readonly ids: Int32Array;
  readonly neighbors: Int32Array;
  constructor(state: FluidState) {
    this.size = 2 * state.h;
    this.nx = Math.ceil(tank[0] / this.size);
    this.ny = Math.ceil(tank[1] / this.size);
    this.nz = Math.ceil(tank[2] / this.size);
    const cells = this.nx * this.ny * this.nz;
    this.count = new Int32Array(cells);
    this.offset = new Int32Array(cells + 1);
    this.cursor = new Int32Array(cells);
    this.ids = new Int32Array(state.count);
    this.neighbors = new Int32Array(state.count);
  }
  cell(x: number, y: number, z: number) {
    const ix = Math.max(0, Math.min(this.nx - 1, Math.floor(x / this.size)));
    const iy = Math.max(0, Math.min(this.ny - 1, Math.floor(y / this.size)));
    const iz = Math.max(0, Math.min(this.nz - 1, Math.floor(z / this.size)));
    return ix + this.nx * (iy + this.ny * iz);
  }
  build(state: FluidState) {
    this.count.fill(0);
    const p = state.position;
    for (let i = 0; i < state.count; i++)
      this.count[this.cell(p[3 * i], p[3 * i + 1], p[3 * i + 2])]++;
    this.offset[0] = 0;
    for (let c = 0; c < this.count.length; c++) this.offset[c + 1] = this.offset[c] + this.count[c];
    this.cursor.set(this.offset.subarray(0, this.count.length));
    for (let i = 0; i < state.count; i++) {
      const cell = this.cell(p[3 * i], p[3 * i + 1], p[3 * i + 2]);
      this.ids[this.cursor[cell]++] = i;
    }
  }
  collect(state: FluidState, i: number): number {
    const p = state.position,
      radius2 = this.size * this.size;
    const x = p[3 * i],
      y = p[3 * i + 1],
      z = p[3 * i + 2];
    const cx = Math.floor(x / this.size),
      cy = Math.floor(y / this.size),
      cz = Math.floor(z / this.size);
    let count = 0;
    for (let zz = Math.max(0, cz - 1); zz <= Math.min(this.nz - 1, cz + 1); zz++)
      for (let yy = Math.max(0, cy - 1); yy <= Math.min(this.ny - 1, cy + 1); yy++)
        for (let xx = Math.max(0, cx - 1); xx <= Math.min(this.nx - 1, cx + 1); xx++) {
          const cell = xx + this.nx * (yy + this.ny * zz);
          for (let k = this.offset[cell]; k < this.offset[cell + 1]; k++) {
            const j = this.ids[k],
              dx = x - p[3 * j],
              dy = y - p[3 * j + 1],
              dz = z - p[3 * j + 2];
            if (dx * dx + dy * dy + dz * dz < radius2) this.neighbors[count++] = j;
          }
        }
    return count;
  }
}
