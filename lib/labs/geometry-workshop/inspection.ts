import { dot3, magnitude3, subtract3 } from "../normal.ts";
import { gridCell, vertexId, type Mesh } from "./mesh.ts";

function sampleIndex(fraction: number, segments: number): number {
  return Math.round(Math.max(0, Math.min(1, fraction)) * segments);
}

export function inspectVertex(mesh: Mesh, u: number, v: number) {
  const { uSegments, vSegments } = mesh.settings;
  const row = sampleIndex(u, uSegments);
  const column = sampleIndex(v, vSegments);
  const id = vertexId(row, column, vSegments);
  return { id, row, column, vertex: mesh.vertices[id] };
}

export function inspectCell(mesh: Mesh, u: number, v: number) {
  const { uSegments, vSegments } = mesh.settings;
  const row = Math.min(uSegments - 1, sampleIndex(u, uSegments));
  const column = Math.min(vSegments - 1, sampleIndex(v, vSegments));
  return {
    row,
    column,
    corners: gridCell(row, column, vSegments),
    face: 2 * (row * vSegments + column),
  };
}

export function inspectSeam(mesh: Mesh, v: number) {
  const { kind, uSegments, vSegments } = mesh.settings;
  const endColumn = sampleIndex(v, vSegments);
  const startColumn = kind === "mobius" ? vSegments - endColumn : endColumn;
  const startId = vertexId(0, startColumn, vSegments);
  const endId = vertexId(uSegments, endColumn, vSegments);
  const start = mesh.vertices[startId];
  const end = mesh.vertices[endId];
  return {
    startColumn,
    endColumn,
    startId,
    endId,
    start,
    end,
    gap: magnitude3(subtract3(end.position, start.position)),
    normalDot: dot3(end.normal, start.normal),
  };
}

export function objFaceRecord(mesh: Mesh, face: number, oneBased = true): string {
  const start = face * 3;
  const ids = mesh.indices.slice(start, start + 3);
  if (!Number.isInteger(face) || face < 0 || ids.length !== 3)
    throw new RangeError("Không có mặt này.");
  const corners = ids.map((id) => {
    const index = oneBased ? id + 1 : id;
    return index + "/" + index + "/" + index;
  });
  return "f " + corners.join(" ");
}

// Check a single line in the workshop subset; the native parser also validates the attribute arrays.
export function readObjFaceRecord(record: string, vertexCount: number): number[] | null {
  const [tag, ...corners] = record.trim().split(/\s+/);
  if (tag !== "f" || corners.length !== 3) return null;
  const indices: number[] = [];
  for (const corner of corners) {
    const match = /^(\d+)\/(\d+)\/(\d+)$/.exec(corner);
    if (!match) return null;
    const position = Number(match[1]);
    const uv = Number(match[2]);
    const normal = Number(match[3]);
    if (
      !Number.isSafeInteger(position) ||
      position <= 0 ||
      position > vertexCount ||
      position !== uv ||
      position !== normal
    )
      return null;
    indices.push(position - 1);
  }
  if (new Set(indices).size !== 3) return null;
  return indices;
}
