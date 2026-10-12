export const Cell = { Empty: 0, Wall: 1, Sand: 2, Water: 3 } as const;
export type Material = (typeof Cell)[keyof typeof Cell];
export type SandGrid = {
  width: number;
  height: number;
  cells: Uint8Array;
  moved: Uint8Array;
  tick: number;
};
export const TICK_SECONDS = 1 / 30;

export function createGrid(width = 96, height = 64): SandGrid {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 256 ||
    height > 256
  ) {
    throw new Error("Grid dimensions must be integers in [1, 256]");
  }
  return {
    width,
    height,
    cells: new Uint8Array(width * height),
    moved: new Uint8Array(width * height),
    tick: 0,
  };
}

export function contains(grid: SandGrid, x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < grid.width &&
    y < grid.height
  );
}

export function cellAt(grid: SandGrid, x: number, y: number): Material {
  if (!contains(grid, x, y)) return Cell.Wall;
  return grid.cells[y * grid.width + x] as Material;
}

export function setCell(grid: SandGrid, x: number, y: number, material: Material) {
  if (contains(grid, x, y)) grid.cells[y * grid.width + x] = material;
}

export function paintDisk(
  grid: SandGrid,
  centerX: number,
  centerY: number,
  radius: number,
  material: Material,
) {
  if (!contains(grid, centerX, centerY) || !Number.isFinite(radius)) return;
  radius = Math.max(0, Math.min(8, Math.floor(radius)));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= radius * radius) setCell(grid, centerX + dx, centerY + dy, material);
    }
  }
}

export function paintStroke(
  grid: SandGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  material: Material,
) {
  if (!contains(grid, x0, y0) || !contains(grid, x1, y1)) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    paintDisk(grid, x0, y0, radius, material);
    return;
  }
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    // Endpoints are inside the grid, so interpolated coordinates are non-negative.
    paintDisk(grid, Math.round(x0 + t * dx), Math.round(y0 + t * dy), radius, material);
  }
}

export function makeScene(stage = 7, preset = 0) {
  const grid = createGrid();
  if (preset === 2) return grid;
  if (preset === 1) {
    for (let i = 0; i < 34; i += 1) {
      setCell(grid, 12 + i, 18 + i, Cell.Wall);
      setCell(grid, 83 - i, 18 + i, Cell.Wall);
    }
    for (let y = 3; y < 15; y += 1) {
      for (let x = 35; x < 61; x += 1) setCell(grid, x, y, Cell.Sand);
    }
    return grid;
  }
  for (let x = 8; x < 88; x += 1) setCell(grid, x, 50, Cell.Wall);
  for (let y = 8; y < 17; y += 1) {
    for (let x = 40; x < 55; x += 1) setCell(grid, x, y, Cell.Sand);
  }
  if (stage >= 5) {
    for (let y = 38; y < 50; y += 1) {
      for (let x = 20; x < 76; x += 1) setCell(grid, x, y, Cell.Water);
    }
  }
  return grid;
}

function tryMove(
  grid: SandGrid,
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  stage: number,
) {
  if (!contains(grid, targetX, targetY)) return false;
  const source = y * grid.width + x;
  const destination = targetY * grid.width + targetX;
  if (grid.moved[source] !== 0 || grid.moved[destination] !== 0) return false;
  let allowed = grid.cells[destination] === Cell.Empty;
  if (stage >= 5 && grid.cells[source] === Cell.Sand && grid.cells[destination] === Cell.Water)
    allowed = true;
  if (!allowed) return false;
  const material = grid.cells[source];
  grid.cells[source] = grid.cells[destination];
  grid.cells[destination] = material;
  grid.moved[source] = 1;
  grid.moved[destination] = 1;
  return true;
}

/** Ordered, in-place cellular rules; not a synchronous double-buffer CA. */
export function stepGrid(grid: SandGrid, stage = 7) {
  if (stage < 3) return;
  grid.moved.fill(0);
  for (let y = grid.height - 1; y >= 0; y -= 1) {
    for (let column = 0; column < grid.width; column += 1) {
      let x = column;
      if (stage >= 4 && grid.tick % 2 !== 0) x = grid.width - 1 - column;
      const material = cellAt(grid, x, y);
      const movable = material === Cell.Sand || (stage >= 5 && material === Cell.Water);
      if (!movable || grid.moved[y * grid.width + x] !== 0) continue;
      if (tryMove(grid, x, y, x, y + 1, stage)) continue;
      let direction = -1;
      if ((x + y + grid.tick) % 2 !== 0) direction = 1;
      if (stage >= 4) {
        if (tryMove(grid, x, y, x + direction, y + 1, stage)) continue;
        if (tryMove(grid, x, y, x - direction, y + 1, stage)) continue;
      }
      if (stage >= 5 && material === Cell.Water) {
        if (tryMove(grid, x, y, x + direction, y, stage)) continue;
        tryMove(grid, x, y, x - direction, y, stage);
      }
    }
  }
  grid.tick = (grid.tick + 1) >>> 0;
}

export function countMaterials(grid: SandGrid) {
  const counts = [0, 0, 0, 0];
  for (const material of grid.cells) counts[material] += 1;
  return counts;
}

export function checksum(grid: SandGrid) {
  let hash = 2166136261;
  for (const material of grid.cells) hash = Math.imul(hash ^ material, 16777619) >>> 0;
  return hash;
}

export function planSteps(accumulator: number, elapsed: number) {
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= TICK_SECONDS)
    accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  const accepted = Math.min(elapsed, 0.25);
  const total = accumulator + accepted;
  const due = Math.floor((total + 1e-9) / TICK_SECONDS);
  const steps = Math.min(due, 4);
  return {
    steps,
    remainder: Math.max(0, total - due * TICK_SECONDS),
    dropped: elapsed - accepted + (due - steps) * TICK_SECONDS,
  };
}

export function validateScene() {
  const first = makeScene();
  const second = makeScene();
  const initial = first.cells.slice();
  const counts = countMaterials(first);
  let conserved = true;
  let deterministic = true;
  let wallsFixed = true;
  for (let tick = 0; tick < 120; tick += 1) {
    stepGrid(first);
    stepGrid(second);
    const after = countMaterials(first);
    conserved = conserved && after.every((count, i) => count === counts[i]);
    for (let i = 0; i < first.cells.length; i += 1) {
      if (first.cells[i] !== second.cells[i]) deterministic = false;
      if (initial[i] === Cell.Wall && first.cells[i] !== Cell.Wall) wallsFixed = false;
    }
  }
  return { conserved, deterministic, wallsFixed };
}

export function gridViewport(width: number, height: number, columns = 96, rows = 64) {
  const scale = Math.min(width / columns, height / rows);
  return { scale, x: (width - columns * scale) / 2, y: (height - rows * scale) / 2 };
}

export function pointerCell(width: number, height: number, px: number, py: number) {
  const view = gridViewport(width, height);
  const x = Math.floor((px - view.x) / view.scale);
  const y = Math.floor((py - view.y) / view.scale);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= 96 || y >= 64)
    return null;
  return { x, y };
}
