import { samples, support, type State, type Particle } from "./model.ts";
export type Search = { samples: Particle[]; lists: number[][]; candidates: number };
export class Grid {
  static columns = 74;
  static rows = 46;
  starts = new Int32Array(Grid.columns * Grid.rows + 1);
  ids = new Int32Array(0);
  cell(x: number, y: number) {
    const cx = Math.floor(x / support) + 3,
      cy = Math.floor(y / support) + 3;
    if (
      cx < 0 ||
      cx >= Grid.columns ||
      cy < 0 ||
      cy >= Grid.rows ||
      !Number.isFinite(cx) ||
      !Number.isFinite(cy)
    )
      throw new RangeError("Sample outside bounded grid");
    return cy * Grid.columns + cx;
  }
  build(points: Particle[]) {
    this.starts.fill(0);
    for (const p of points) this.starts[this.cell(p.x, p.y) + 1]++;
    for (let k = 1; k < this.starts.length; k++) this.starts[k] += this.starts[k - 1];
    const cursor = this.starts.slice();
    this.ids = new Int32Array(points.length);
    for (let j = 0; j < points.length; j++)
      this.ids[cursor[this.cell(points[j].x, points[j].y)]++] = j;
  }
}
export function buildNeighbors(state: State, useGrid = true): Search {
  if (!useGrid && state.particles.length > 1000)
    throw new RangeError("All-pairs chỉ dùng cho ca nhỏ, không chạy bể 5000 hạt");
  const result: Search = { samples: samples(state), lists: [], candidates: 0 },
    grid = new Grid();
  if (useGrid) grid.build(result.samples);
  for (const p of state.particles) {
    const list: number[] = [];
    const consider = (j: number) => {
      result.candidates++;
      const dx = p.x - result.samples[j].x,
        dy = p.y - result.samples[j].y;
      if (dx * dx + dy * dy < support * support) list.push(j);
    };
    if (useGrid) {
      const center = grid.cell(p.x, p.y),
        cx = center % Grid.columns,
        cy = Math.floor(center / Grid.columns);
      for (let y = Math.max(0, cy - 1); y <= Math.min(Grid.rows - 1, cy + 1); y++)
        for (let x = Math.max(0, cx - 1); x <= Math.min(Grid.columns - 1, cx + 1); x++) {
          const cell = y * Grid.columns + x;
          for (let k = grid.starts[cell]; k < grid.starts[cell + 1]; k++) consider(grid.ids[k]);
        }
    } else for (let j = 0; j < result.samples.length; j++) consider(j);
    list.sort((a, b) => a - b);
    result.lists.push(list);
  }
  return result;
}
