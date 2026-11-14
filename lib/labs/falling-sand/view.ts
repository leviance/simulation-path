import type { Grid } from "./model.ts";

export function sandStage(mode?: string) {
  const match = /^sand-([1-9])$/.exec(mode ?? "");
  if (!match) return 9;
  return Number(match[1]);
}

export function gridViewport(width: number, height: number, columns: number, rows: number) {
  if (
    ![width, height, columns, rows].every(Number.isFinite) ||
    width <= 32 ||
    height <= 32 ||
    columns < 1 ||
    rows < 1
  ) {
    return { x: 0, y: 0, width: 0, height: 0, scale: 0 };
  }
  const scale = Math.min((width - 32) / columns, (height - 32) / rows);
  return {
    scale,
    x: (width - columns * scale) / 2,
    y: (height - rows * scale) / 2,
    width: columns * scale,
    height: rows * scale,
  };
}

export function pointerCell(
  width: number,
  height: number,
  pointX: number,
  pointY: number,
  grid: Pick<Grid, "width" | "height">,
) {
  if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) return null;
  const view = gridViewport(width, height, grid.width, grid.height);
  if (
    view.scale <= 0 ||
    pointX < view.x ||
    pointY < view.y ||
    pointX >= view.x + view.width ||
    pointY >= view.y + view.height
  )
    return null;
  const x = Math.floor((pointX - view.x) / view.scale);
  const y = Math.floor((pointY - view.y) / view.scale);
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  return { x, y };
}
