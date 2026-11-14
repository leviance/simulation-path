export const Cell = { Empty: 0, Wall: 1, Sand: 2, Water: 3 } as const;
export type Material = (typeof Cell)[keyof typeof Cell];
export const ScanOrder = { Alternating: 0, LeftToRight: 1, RightToLeft: 2, TopDown: 3 } as const;
export type Order = (typeof ScanOrder)[keyof typeof ScanOrder];
export type Grid = {
  width: number;
  height: number;
  cells: Uint8Array;
  moved: Uint8Array;
  tick: number;
  order: Order;
};
export type Point = { x: number; y: number };
export const materialNames = ["Trống", "Tường", "Cát", "Nước"] as const;
export const orderNames = [
  "Từ dưới lên, đảo chiều ngang",
  "Từ dưới lên, trái sang phải",
  "Từ dưới lên, phải sang trái",
  "Từ trên xuống, đảo chiều ngang",
] as const;

export function isMaterial(value: number): value is Material {
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

export function createGrid(width = 96, height = 64): Grid {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 1024 ||
    height > 768
  ) {
    throw new Error("Kích thước lưới phải là số nguyên trong [1,1024] × [1,768].");
  }
  return {
    width,
    height,
    cells: new Uint8Array(width * height),
    moved: new Uint8Array(width * height),
    tick: 0,
    order: ScanOrder.Alternating,
  };
}

export function contains(grid: Grid, x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < grid.width &&
    y < grid.height
  );
}

export function cellAt(grid: Grid, x: number, y: number): Material {
  if (!contains(grid, x, y)) return Cell.Wall;
  return grid.cells[y * grid.width + x] as Material;
}

export function setCell(grid: Grid, x: number, y: number, material: Material) {
  if (contains(grid, x, y) && isMaterial(material)) grid.cells[y * grid.width + x] = material;
}

export function paintDisk(
  grid: Grid,
  centerX: number,
  centerY: number,
  radius: number,
  material: Material,
) {
  if (!contains(grid, centerX, centerY) || !Number.isFinite(radius) || !isMaterial(material))
    return;
  radius = Math.max(0, Math.min(24, Math.floor(radius)));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= radius * radius) setCell(grid, centerX + dx, centerY + dy, material);
    }
  }
}

export function paintStroke(
  grid: Grid,
  from: Point,
  to: Point,
  radius: number,
  material: Material,
) {
  if (!contains(grid, from.x, from.y) || !contains(grid, to.x, to.y)) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    paintDisk(grid, to.x, to.y, radius, material);
    return;
  }
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    // Both endpoints are nonnegative; Math.round agrees with C++ lround here.
    paintDisk(grid, Math.round(from.x + t * dx), Math.round(from.y + t * dy), radius, material);
  }
}

export function countMaterials(grid: Grid): [number, number, number, number] {
  const counts: [number, number, number, number] = [0, 0, 0, 0];
  for (const material of grid.cells) counts[material] += 1;
  return counts;
}

export function checksum(grid: Grid) {
  let hash = 2166136261;
  for (const material of grid.cells) hash = Math.imul(hash ^ material, 16777619) >>> 0;
  return hash;
}
