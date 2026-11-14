import { Cell, cellAt, type Grid } from "./model.ts";

const palette = [
  [11, 17, 28],
  [119, 132, 157],
  [229, 192, 123],
  [65, 157, 220],
] as const;

export function encodeRgba(grid: Grid, pixels: Uint8ClampedArray, plain = false) {
  if (pixels.length !== grid.cells.length * 4) throw new Error("RGBA buffer không khớp lưới.");
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const index = y * grid.width + x;
      const material = grid.cells[index];
      const base = palette[material];
      let change = 0;
      if (!plain && material !== Cell.Empty) {
        change = ((x * 17 + y * 31) % 13) - 6;
        if (material === Cell.Water) {
          change = -Math.trunc((24 * y) / grid.height);
          if (cellAt(grid, x, y - 1) === Cell.Empty) change = 38;
        } else if (material === Cell.Wall) {
          change = -16;
          if (cellAt(grid, x, y - 1) !== Cell.Wall) change = 26;
        }
      }
      pixels[index * 4] = base[0] + change;
      pixels[index * 4 + 1] = base[1] + change;
      pixels[index * 4 + 2] = base[2] + change;
      pixels[index * 4 + 3] = 255;
    }
  }
}

export function overlayMoved(grid: Grid, pixels: Uint8ClampedArray) {
  if (pixels.length !== grid.cells.length * 4) throw new Error("Moved overlay không khớp lưới.");
  for (let index = 0; index < grid.moved.length; index += 1) {
    if (grid.moved[index] === 0) continue;
    pixels[index * 4] = pixels[index * 4] * 0.72 + 240 * 0.28;
    pixels[index * 4 + 1] = pixels[index * 4 + 1] * 0.72 + 112 * 0.28;
    pixels[index * 4 + 2] = pixels[index * 4 + 2] * 0.72 + 142 * 0.28;
  }
}
