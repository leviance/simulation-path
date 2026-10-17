import type { Rectangle } from "./model.ts";
export type StopCell = { u: number; v: number } | null;
export type RectangleDecision = {
  index: number;
  seed: { u: number; v: number };
  width: { cell: StopCell; reason: string };
  height: { cell: StopCell; reason: string };
};

// Explain a rectangle already emitted by the real extractor, not a second mesher.
export function explainRectangle(
  input: Uint8Array,
  rects: Rectangle[],
  index: number,
): RectangleDecision | null {
  if (input.length !== 256) throw new RangeError("mask 16x16");
  if (!Number.isInteger(index) || index < 0 || index >= rects.length) return null;
  const remaining = input.slice();
  for (const r of rects.slice(0, index)) {
    for (let v = r.v; v < r.v + r.height; v++) {
      for (let u = r.u; u < r.u + r.width; u++) remaining[v * 16 + u] = 0;
    }
  }
  const r = rects[index];
  const reason = (u: number, v: number) => {
    if (input[v * 16 + u] === 0) return `Ô (${u},${v}) không có mặt.`;
    if (remaining[v * 16 + u] === 0) return `Ô (${u},${v}) đã được rectangle trước sử dụng.`;
    return `Ô (${u},${v}) có material=${remaining[v * 16 + u]}, khác seed=${r.material}.`;
  };
  const width = { cell: null as StopCell, reason: "Đã tới cạnh phải của mask." };
  if (r.u + r.width < 16) {
    width.cell = { u: r.u + r.width, v: r.v };
    width.reason = reason(width.cell.u, width.cell.v);
  }
  const height = { cell: null as StopCell, reason: "Đã tới cạnh dưới của mask." };
  if (r.v + r.height < 16) {
    for (let u = r.u; u < r.u + r.width; u++) {
      if (remaining[(r.v + r.height) * 16 + u] !== r.material) {
        height.cell = { u, v: r.v + r.height };
        height.reason = reason(u, height.cell.v);
        break;
      }
    }
  }
  return { index, seed: { u: r.u, v: r.v }, width, height };
}
