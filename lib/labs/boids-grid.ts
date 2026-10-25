import {
  minimumImage,
  validateBoids,
  validateBoidsParams,
  wrap,
  type Boid,
  type BoidsParams,
} from "./boids.ts";

export interface BoidsGrid {
  width: number;
  height: number;
  cellSize: number;
  columns: number;
  rows: number;
  buckets: number[][];
  maximumOccupancy: number;
  occupiedCells: number;
}

// Giới hạn số bucket trước khi cấp phát, kể cả với domain do tests tạo.
export function gridGeometry(params: BoidsParams, cellSize: number) {
  validateBoidsParams(params);
  if (!Number.isFinite(cellSize) || cellSize < 4 || cellSize > 1e6)
    throw new RangeError("Cell size outside [4,1000000]");
  const columns = Math.max(1, Math.ceil(params.width / cellSize));
  const rows = Math.max(1, Math.ceil(params.height / cellSize));
  if (columns * rows > 4096) throw new RangeError("Grid exceeds 4096 cells");
  return { columns, rows };
}

export function gridAddress(
  x: number,
  y: number,
  grid: Pick<BoidsGrid, "width" | "height" | "cellSize" | "columns" | "rows">,
) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Invalid position");
  const column = Math.min(grid.columns - 1, Math.floor(wrap(x, grid.width) / grid.cellSize));
  const row = Math.min(grid.rows - 1, Math.floor(wrap(y, grid.height) / grid.cellSize));
  return { column, row, index: row * grid.columns + column };
}

export function buildBoidsGrid(
  snapshot: readonly Boid[],
  params: BoidsParams,
  cellSize: number,
): BoidsGrid {
  validateBoids(snapshot, params, 10000);
  const { columns, rows } = gridGeometry(params, cellSize);
  const grid: BoidsGrid = {
    width: params.width,
    height: params.height,
    cellSize,
    columns,
    rows,
    buckets: Array.from({ length: columns * rows }, () => []),
    maximumOccupancy: 0,
    occupiedCells: 0,
  };
  snapshot.forEach((boid, index) => {
    const bucket = grid.buckets[gridAddress(boid.position.x, boid.position.y, grid).index];
    if (bucket.length === 0) grid.occupiedCells++;
    bucket.push(index);
    grid.maximumOccupancy = Math.max(grid.maximumOccupancy, bucket.length);
  });
  return grid;
}

// Chia khoảng qua biên thành hai đoạn. Cell cuối có thể ngắn hơn cellSize:
// không thể thay đoạn này bằng ±ceil(radius/cellSize) quanh cell chứa tâm.
export function axisCells(
  center: number,
  radius: number,
  extent: number,
  cellSize: number,
): number[] {
  if (
    ![center, radius, extent, cellSize].every(Number.isFinite) ||
    extent <= 0 ||
    cellSize < 4 ||
    radius < 0 ||
    radius >= extent / 2
  )
    throw new RangeError("Invalid periodic query interval");
  const count = Math.max(1, Math.ceil(extent / cellSize));
  if (count > 4096) throw new RangeError("Too many axis cells");
  const normalized = wrap(center, extent);
  const low = normalized - radius;
  const high = normalized + radius;
  const intervals: [number, number][] = [];
  if (low < 0) intervals.push([0, high], [low + extent, extent]);
  else if (high >= extent) intervals.push([low, extent], [0, high - extent]);
  else intervals.push([low, high]);
  const cells: number[] = [];
  for (const [start, end] of intervals) {
    const first = Math.floor(start / cellSize);
    const last = Math.min(count - 1, Math.floor(end / cellSize));
    for (let cell = first; cell <= last; cell++) {
      if (!cells.includes(cell)) cells.push(cell);
    }
  }
  return cells;
}

export interface GridQuery {
  cells: number[];
  candidates: number[];
  neighbors: number[];
}

// Grid và snapshot phải thuộc cùng một bước; mỗi candidate được xét đúng một lần.
export function queryBoidsGrid(
  snapshot: readonly Boid[],
  targetIndex: number,
  params: BoidsParams,
  grid: BoidsGrid,
): GridQuery {
  const target = snapshot[targetIndex];
  if (!target || grid.width !== params.width || grid.height !== params.height)
    throw new RangeError("Query/grid mismatch");
  const columns = axisCells(target.position.x, params.radius, grid.width, grid.cellSize);
  const rows = axisCells(target.position.y, params.radius, grid.height, grid.cellSize);
  const result: GridQuery = { cells: [], candidates: [], neighbors: [] };
  const radiusSquared = params.radius * params.radius;
  for (const row of rows) {
    for (const column of columns) {
      const cell = row * grid.columns + column;
      result.cells.push(cell);
      for (const index of grid.buckets[cell]) {
        const other = snapshot[index];
        if (other.id === target.id) continue;
        result.candidates.push(index);
        const dx = minimumImage(other.position.x - target.position.x, params.width);
        const dy = minimumImage(other.position.y - target.position.y, params.height);
        if (dx * dx + dy * dy <= radiusSquared) result.neighbors.push(index);
      }
    }
  }
  return result;
}
