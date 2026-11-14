import {
  add3,
  cross3,
  dot3,
  magnitude3,
  normalize3,
  scale3,
  subtract3,
  type Vec3,
} from "../normal.ts";
import { clamp, finitePoint, type ScalarGrid } from "./grid.ts";

export interface Corner {
  id: number;
  point: Vec3;
  value: number;
}
export interface EdgePoint {
  point: Vec3;
  key: readonly [number, number];
  t: number;
}
export type SurfaceTriangle = readonly [EdgePoint, EdgePoint, EdgePoint];
export interface CellTriangles {
  triangles: SurfaceTriangle[];
  degenerate: number;
}
export interface SurfaceVertex {
  position: Vec3;
  normal: Vec3;
}

export const cubeCorners: readonly Vec3[] = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 1, y: 1, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: 0, y: 1, z: 1 },
];
export const cubeTetrahedra = [
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
  [0, 5, 1, 6],
] as const;

export function teachingTetra(values: readonly number[] = [-1, 1, 1, 1]): Corner[] {
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)))
    throw new RangeError("Tetra cần bốn scalar hữu hạn.");
  const points = [
    { x: -0.85, y: -0.65, z: -0.55 },
    { x: 0.85, y: -0.65, z: -0.55 },
    { x: 0, y: 0.85, z: -0.55 },
    { x: 0, y: 0, z: 0.9 },
  ];
  return points.map((point, id) => ({ id, point, value: values[id] }));
}

export function edgePoint(first: Corner, second: Corner, isovalue: number): EdgePoint {
  let a = first,
    b = second;
  if (b.id < a.id) {
    a = second;
    b = first;
  }
  if (
    !Number.isSafeInteger(a.id) ||
    !Number.isSafeInteger(b.id) ||
    a.id < 0 ||
    a.id === b.id ||
    !finitePoint(a.point) ||
    !finitePoint(b.point) ||
    ![a.value, b.value, isovalue].every(Number.isFinite)
  )
    throw new RangeError("Edge cần hai sample ID khác nhau và dữ liệu hữu hạn.");
  if (a.value < isovalue === b.value < isovalue) throw new RangeError("Edge không cắt isovalue.");
  const difference = b.value - a.value;
  if (!Number.isFinite(difference) || difference === 0)
    throw new RangeError("Hiệu scalar không hợp lệ.");
  const t = clamp((isovalue - a.value) / difference, 0, 1);
  const point = add3(a.point, scale3(subtract3(b.point, a.point), t));
  if (!finitePoint(point)) throw new RangeError("Giao điểm không hữu hạn.");
  return { point, key: [a.id, b.id], t };
}

function appendTriangle(
  output: CellTriangles,
  a: EdgePoint,
  b: EdgePoint,
  c: EdgePoint,
  towardOutside: Vec3,
  spacing: number,
) {
  const area = cross3(subtract3(b.point, a.point), subtract3(c.point, a.point));
  if (dot3(area, area) <= Math.max(1e-24, spacing ** 4 * 1e-16)) {
    ++output.degenerate;
    return;
  }
  if (dot3(area, towardOutside) < 0) output.triangles.push([a, c, b]);
  else output.triangles.push([a, b, c]);
}

// Equality belongs outside. All cubes use the same six tetra and edge-ID order,
// including on shared faces; normals never hide an inconsistent face diagonal.
export function polygonizeTetra(
  tetra: readonly Corner[],
  isovalue: number,
  spacing = 1,
): CellTriangles {
  if (
    tetra.length !== 4 ||
    !Number.isFinite(isovalue) ||
    !Number.isFinite(spacing) ||
    spacing <= 0 ||
    new Set(tetra.map((corner) => corner.id)).size !== 4
  )
    throw new RangeError("Tetra/isovalue/spacing không hợp lệ.");
  const inside: Corner[] = [],
    outside: Corner[] = [];
  let insideSum = { x: 0, y: 0, z: 0 },
    outsideSum = { x: 0, y: 0, z: 0 };
  for (const corner of tetra) {
    if (
      !Number.isSafeInteger(corner.id) ||
      corner.id < 0 ||
      !finitePoint(corner.point) ||
      !Number.isFinite(corner.value)
    )
      throw new RangeError("Sample tetra không hợp lệ.");
    if (corner.value < isovalue) {
      inside.push(corner);
      insideSum = add3(insideSum, corner.point);
    } else {
      outside.push(corner);
      outsideSum = add3(outsideSum, corner.point);
    }
  }
  const output: CellTriangles = { triangles: [], degenerate: 0 };
  if (inside.length === 0 || outside.length === 0) return output;
  const towardOutside = subtract3(
    scale3(outsideSum, 1 / outside.length),
    scale3(insideSum, 1 / inside.length),
  );
  if (inside.length === 1 || outside.length === 1) {
    let center = inside[0],
      others = outside;
    if (outside.length === 1) {
      center = outside[0];
      others = inside;
    }
    appendTriangle(
      output,
      edgePoint(center, others[0], isovalue),
      edgePoint(center, others[1], isovalue),
      edgePoint(center, others[2], isovalue),
      towardOutside,
      spacing,
    );
  } else {
    const ac = edgePoint(inside[0], outside[0], isovalue),
      ad = edgePoint(inside[0], outside[1], isovalue);
    const bc = edgePoint(inside[1], outside[0], isovalue),
      bd = edgePoint(inside[1], outside[1], isovalue);
    appendTriangle(output, ac, ad, bd, towardOutside, spacing);
    appendTriangle(output, ac, bd, bc, towardOutside, spacing);
  }
  return output;
}

export function polygonizeCell(
  grid: ScalarGrid,
  x: number,
  y: number,
  z: number,
  isovalue: number,
): CellTriangles {
  const cells = grid.spec.samples - 1;
  if (
    ![x, y, z].every((value) => Number.isInteger(value) && value >= 0 && value < cells) ||
    !Number.isFinite(isovalue) ||
    Math.abs(isovalue) > 1
  )
    throw new RangeError("Cell/isovalue nằm ngoài grid.");
  const corners: Corner[] = cubeCorners.map((offset) => {
    const sx = x + offset.x,
      sy = y + offset.y,
      sz = z + offset.z;
    return {
      id: grid.spec.sampleIndex(sx, sy, sz),
      point: grid.spec.worldFromGrid({ x: sx, y: sy, z: sz }),
      value: grid.at(sx, sy, sz),
    };
  });
  const result: CellTriangles = { triangles: [], degenerate: 0 };
  for (const indices of cubeTetrahedra) {
    const tetra = polygonizeTetra(
      indices.map((index) => corners[index]),
      isovalue,
      grid.spec.spacing(),
    );
    result.triangles.push(...tetra.triangles);
    result.degenerate += tetra.degenerate;
  }
  return result;
}

export function surfaceVertices(
  grid: ScalarGrid | null,
  triangles: readonly SurfaceTriangle[],
  gradientNormals = true,
) {
  const vertices: SurfaceVertex[] = [];
  let fallbacks = 0;
  for (const triangle of triangles) {
    const faceNormal = normalize3(
      cross3(
        subtract3(triangle[1].point, triangle[0].point),
        subtract3(triangle[2].point, triangle[0].point),
      ),
    );
    for (const edge of triangle) {
      let normal = faceNormal;
      if (grid && gradientNormals) {
        normal = grid.gradient(edge.point);
        if (magnitude3(normal) <= 1e-10) {
          normal = faceNormal;
          ++fallbacks;
        } else normal = normalize3(normal);
      }
      vertices.push({ position: edge.point, normal });
    }
  }
  return { vertices, fallbacks };
}
