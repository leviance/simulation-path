import type { HeatField } from "./model.ts";
export function heatStage(mode?: string) {
  const match = /^heat-([1-9])$/.exec(mode ?? "");
  return match ? Number(match[1]) : 9;
}
export function viewport(
  width: number,
  height: number,
  field: Pick<HeatField, "width" | "height">,
) {
  if (
    ![width, height, field.width, field.height].every(Number.isFinite) ||
    width <= 32 ||
    height <= 32 ||
    field.width < 1 ||
    field.height < 1
  )
    return { x: 0, y: 0, width: 0, height: 0, scale: 0 };
  const scale = Math.min((width - 32) / field.width, (height - 32) / field.height);
  return {
    x: (width - field.width * scale) / 2,
    y: (height - field.height * scale) / 2,
    width: field.width * scale,
    height: field.height * scale,
    scale,
  };
}
export function pointerCell(
  width: number,
  height: number,
  px: number,
  py: number,
  field: Pick<HeatField, "width" | "height">,
) {
  if (![px, py].every(Number.isFinite)) return null;
  const view = viewport(width, height, field);
  if (
    view.scale <= 0 ||
    px < view.x ||
    py < view.y ||
    px >= view.x + view.width ||
    py >= view.y + view.height
  )
    return null;
  return { x: Math.floor((px - view.x) / view.scale), y: Math.floor((py - view.y) / view.scale) };
}
