import { Cell, createGrid, setCell, type Grid, type Material } from "./model.ts";

export const presetNames = ["Bậc thềm", "Đồng hồ cát", "Phá đập", "Hỗn hợp", "Lưới trống"] as const;

export function makeSmallScene(stage = 9, empty = false) {
  const grid = createGrid();
  if (empty || stage < 1) return grid;
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

export function nextRandom(state: number) {
  return (Math.imul(state, 1664525) + 1013904223) >>> 0;
}

export function makeWorkshopScene(preset = 0, seed = 46, width = 512, height = 320): Grid {
  if (!Number.isInteger(preset) || preset < 0 || preset > 4)
    throw new Error("Cảnh mẫu không hợp lệ.");
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("Seed phải là số nguyên uint32.");
  const grid = createGrid(width, height);
  if (preset === 4) return grid;
  const box = (left: number, top: number, right: number, bottom: number, material: Material) => {
    // Match positive integer divisions in the C++ preset builder.
    for (let y = Math.trunc(top); y < Math.trunc(bottom); y += 1) {
      for (let x = Math.trunc(left); x < Math.trunc(right); x += 1) setCell(grid, x, y, material);
    }
  };
  const w = width;
  const h = height;
  box(w / 16, h - 12, w - Math.trunc(w / 16), h - 9, Cell.Wall);
  if (preset === 1) {
    const center = Math.trunc(w / 2);
    const throat = Math.trunc((h * 3) / 5);
    for (let y = Math.trunc(h / 5); y < throat; y += 1) {
      const inset = throat - y;
      box(center - inset - 5, y, center - inset - 2, y + 1, Cell.Wall);
      box(center + inset + 2, y, center + inset + 5, y + 1, Cell.Wall);
      if (y < Math.trunc((h * 2) / 5))
        box(center - inset - 2, y, center + inset + 2, y + 1, Cell.Sand);
    }
  } else if (preset === 2) {
    box(w / 12, h / 4, Math.trunc(w / 2) - 3, h - 12, Cell.Water);
    box(Math.trunc(w / 12) - 3, h / 4, w / 12, h - 9, Cell.Wall);
    box(Math.trunc(w / 2) - 3, h / 5, w / 2, h - 9, Cell.Wall);
    box((w * 2) / 3, h / 5, (w * 5) / 6, h / 3, Cell.Sand);
  } else if (preset === 3) {
    let state = seed;
    for (let y = Math.trunc(h / 8); y < Math.trunc((h * 3) / 4); y += 1) {
      for (let x = Math.trunc(w / 4); x < Math.trunc((w * 3) / 4); x += 1) {
        state = nextRandom(state);
        const value = state >>> 24;
        if (value < 72) setCell(grid, x, y, Cell.Sand);
        else if (value < 216) setCell(grid, x, y, Cell.Water);
      }
    }
    box(Math.trunc(w / 4) - 3, h / 8, w / 4, h - 9, Cell.Wall);
    box((w * 3) / 4, h / 8, Math.trunc((w * 3) / 4) + 3, h - 9, Cell.Wall);
  } else {
    box(w / 8, h / 10, (w * 3) / 8, h / 3, Cell.Sand);
    box(w / 6, h / 2, (w * 5) / 16, Math.trunc(h / 2) + 3, Cell.Wall);
    box((w * 5) / 16, (h * 2) / 3, (w * 3) / 4, Math.trunc((h * 2) / 3) + 3, Cell.Wall);
    box((w * 5) / 8, h / 10, (w * 3) / 4, (h * 3) / 10, Cell.Water);
    box((w * 9) / 16, (h * 3) / 4, (w * 7) / 8, h - 12, Cell.Water);
    box(Math.trunc((w * 9) / 16) - 3, (h * 3) / 4, (w * 9) / 16, h - 9, Cell.Wall);
    box((w * 7) / 8, (h * 3) / 4, Math.trunc((w * 7) / 8) + 3, h - 9, Cell.Wall);
  }
  return grid;
}

export function makeScene(stage: number, preset = 0, seed = 46) {
  if (stage >= 7) return makeWorkshopScene(preset, seed);
  return makeSmallScene(stage, preset === 4);
}
