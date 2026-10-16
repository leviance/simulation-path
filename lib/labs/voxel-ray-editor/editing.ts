import { inside, index, type Ray, type Cell } from "./ray.ts";
import { traverse, type Hit } from "./traversal.ts";
export type EditResult = { changed: boolean; message: string };
export function breakBlock(chunk: Uint8Array, ray: Ray, reach: number): EditResult {
  const trace = traverse(chunk, ray, reach);
  if (!trace.hit) return { changed: false, message: "Không có block đặc trong tầm với" };
  chunk[index(...trace.hit.cell)] = 0;
  return { changed: true, message: "Đã phá đúng một block" };
}
export function placementCell(chunk: Uint8Array, hit: Hit | null): Cell | null {
  if (
    !hit ||
    !inside(...hit.cell) ||
    chunk[index(...hit.cell)] === 0 ||
    !hit.normal.every(Number.isInteger) ||
    hit.normal.reduce((n, v) => n + Math.abs(v), 0) !== 1
  )
    return null;
  const target = hit.cell.map((v, i) => v + hit.normal[i]) as Cell;
  return inside(...target) && chunk[index(...target)] === 0 ? target : null;
}
export function placeBlock(
  chunk: Uint8Array,
  ray: Ray,
  reach: number,
  material: number,
): EditResult {
  if (![1, 2, 3].includes(material)) throw new RangeError("opaque ID 1..3");
  const target = placementCell(chunk, traverse(chunk, ray, reach).hit);
  if (!target)
    return { changed: false, message: "Không thể đặt: cần ô Air kề mặt, nằm trong chunk" };
  chunk[index(...target)] = material;
  return { changed: true, message: "Đã đặt đúng một block" };
}
