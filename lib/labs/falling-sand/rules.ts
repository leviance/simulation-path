import { Cell, ScanOrder, contains, cellAt, type Grid } from "./model.ts";

export type StepStats = { visited: number; movable: number; swaps: number };

export function tryMove(
  grid: Grid,
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  stage = 9,
) {
  if (!contains(grid, x, y) || !contains(grid, targetX, targetY)) return false;
  const source = y * grid.width + x;
  const destination = targetY * grid.width + targetX;
  const material = grid.cells[source];
  const target = grid.cells[destination];
  const movable = material === Cell.Sand || (stage >= 5 && material === Cell.Water);
  if (!movable || grid.moved[source] !== 0) return false;
  // A vacancy is reusable; an occupied destination must not move twice.
  if (target !== Cell.Empty && grid.moved[destination] !== 0) return false;
  const exchange = stage >= 5 && material === Cell.Sand && target === Cell.Water;
  if (target !== Cell.Empty && !exchange) return false;
  grid.cells[source] = target;
  grid.cells[destination] = material;
  grid.moved[source] = 1;
  grid.moved[destination] = 1;
  return true;
}

export function stepGrid(grid: Grid, stage = 9): StepStats {
  const stats = { visited: 0, movable: 0, swaps: 0 };
  if (stage < 3) return stats;
  grid.moved.fill(0);
  let reverseColumns = stage >= 4 && grid.tick % 2 !== 0;
  let topDown = false;
  if (stage >= 8) {
    if (grid.order === ScanOrder.LeftToRight) reverseColumns = false;
    if (grid.order === ScanOrder.RightToLeft) reverseColumns = true;
    topDown = grid.order === ScanOrder.TopDown;
  }
  for (let row = 0; row < grid.height; row += 1) {
    let y = grid.height - 1 - row;
    if (topDown) y = row;
    for (let column = 0; column < grid.width; column += 1) {
      let x = column;
      if (reverseColumns) x = grid.width - 1 - column;
      stats.visited += 1;
      const material = cellAt(grid, x, y);
      const movable = material === Cell.Sand || (stage >= 5 && material === Cell.Water);
      if (!movable || grid.moved[y * grid.width + x] !== 0) continue;
      stats.movable += 1;
      let moved = tryMove(grid, x, y, x, y + 1, stage);
      let direction = -1;
      if ((x + y + grid.tick) % 2 !== 0) direction = 1;
      if (stage >= 4) {
        if (!moved) moved = tryMove(grid, x, y, x + direction, y + 1, stage);
        if (!moved) moved = tryMove(grid, x, y, x - direction, y + 1, stage);
      }
      if (stage >= 5 && !moved && material === Cell.Water) {
        moved = tryMove(grid, x, y, x + direction, y, stage);
        if (!moved) moved = tryMove(grid, x, y, x - direction, y, stage);
      }
      if (moved) stats.swaps += 1;
    }
  }
  grid.tick = (grid.tick + 1) >>> 0;
  return stats;
}
