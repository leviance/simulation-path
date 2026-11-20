import { centre, clampPoint, Volume, type Vec3 } from "./model.ts";
import { sampleLinear } from "./sampling.ts";
import { add, sub, mul, cross, dot, unit, mix } from "./camera.ts";
export const contextIso = 0.12;
export const maxContextTriangles = 240000;
export interface Vertex {
  point: Vec3;
  normal: Vec3;
  material?: number;
}
export type Triangle = [Vertex, Vertex, Vertex];
export interface Mesh {
  vertices: Float32Array;
  triangles: number;
  materials?: Float32Array;
}
const edges = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
const corners = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const tetrahedra = [
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
  [0, 5, 1, 6],
];
function normalAt(volume: Volume, p: Vec3): Vec3 {
  const gradient: Vec3 = [0, 0, 0];
  for (let a = 0; a < 3; a++) {
    const h = 2 * volume.grid.spacing[a],
      before: Vec3 = [...p],
      after: Vec3 = [...p];
    before[a] -= h;
    after[a] += h;
    gradient[a] =
      ((sampleLinear(volume, before) ?? 0) - (sampleLinear(volume, after) ?? 0)) / (2 * h);
  }
  return unit(gradient);
}
function tetrahedron(
  ids: number[],
  s: number[],
  intersection: (a: number, b: number) => Vertex,
): Triangle[] {
  const polygon: Vertex[] = [];
  for (const [a, b] of edges) {
    const i = ids[a],
      j = ids[b];
    if (s[i] < contextIso === s[j] < contextIso) continue;
    polygon.push(intersection(i, j));
  }
  if (polygon.length < 3) return [];
  let midpoint: Vec3 = [0, 0, 0],
    normal: Vec3 = [0, 0, 0];
  for (const v of polygon) {
    midpoint = add(midpoint, v.point);
    normal = add(normal, v.normal);
  }
  midpoint = mul(midpoint, 1 / polygon.length);
  normal = unit(normal);
  const u = unit(sub(polygon[0].point, midpoint)),
    v = cross(normal, u);
  polygon.sort((a, b) => {
    const pa = sub(a.point, midpoint),
      pb = sub(b.point, midpoint);
    return Math.atan2(dot(pa, v), dot(pa, u)) - Math.atan2(dot(pb, v), dot(pb, u));
  });
  const result: Triangle[] = [];
  for (let i = 1; i + 1 < polygon.length; i++)
    if (
      Math.hypot(
        ...cross(
          sub(polygon[i].point, polygon[0].point),
          sub(polygon[i + 1].point, polygon[0].point),
        ),
      ) > 1e-9
    )
      result.push([polygon[0], polygon[i], polygon[i + 1]]);
  return result;
}
export function* meshSlabs(
  volume: Volume,
  showMinerals = false,
): Generator<{ progress: number }, Mesh> {
  const coordinates = volume.grid.size.map((n) => {
    const c = [-1];
    for (let i = 0; i < n; i += 2) c.push(i);
    if (c[c.length - 1] !== n - 1) c.push(n - 1);
    c.push(n);
    return c;
  });
  let vertices = new Float32Array(8192 * 18),
    used = 0;
  let materials = showMinerals ? new Float32Array(vertices.length / 6) : undefined;
  // Lattice edges are shared by neighbouring tetrahedra. Sample the gradient only once per edge.
  const edgesFound = new Map<number, Vertex>();
  for (let z = 0; z + 1 < coordinates[2].length; z++) {
    for (let y = 0; y + 1 < coordinates[1].length; y++)
      for (let x = 0; x + 1 < coordinates[0].length; x++) {
        const positions: Vec3[] = [],
          values: number[] = [],
          addresses: number[] = [];
        for (const corner of corners) {
          const index = [
            coordinates[0][x + corner[0]],
            coordinates[1][y + corner[1]],
            coordinates[2][z + corner[2]],
          ] as Vec3;
          positions.push(centre(volume.grid, ...index));
          // 130 = 128 voxel centres plus two padded halo coordinates.
          addresses.push(index[0] + 1 + 130 * (index[1] + 1 + 130 * (index[2] + 1)));
          let value = 0;
          if (index.every((q, a) => q >= 0 && q < volume.grid.size[a])) value = volume.at(...index);
          values.push(value);
        }
        if (Math.max(...values) < contextIso || Math.min(...values) >= contextIso) continue;
        function intersection(i: number, j: number): Vertex {
          const key =
            Math.min(addresses[i], addresses[j]) * 130 ** 3 + Math.max(addresses[i], addresses[j]);
          const cached = edgesFound.get(key);
          if (cached) return cached;
          const t = (contextIso - values[i]) / (values[j] - values[i]);
          const point = clampPoint(volume.grid, mix(positions[i], positions[j], t));
          const normal = normalAt(volume, point);
          const vertex: Vertex = { point, normal };
          if (showMinerals) vertex.material = Math.max(values[i], values[j]);
          edgesFound.set(key, vertex);
          return vertex;
        }
        for (const tet of tetrahedra)
          for (const triangle of tetrahedron(tet, values, intersection)) {
            if (used / 18 >= maxContextTriangles)
              throw new RangeError("Context triangle budget exceeded");
            if (used + 18 > vertices.length) {
              const bigger = new Float32Array(
                Math.min(maxContextTriangles * 18, vertices.length * 2),
              );
              bigger.set(vertices);
              vertices = bigger;
              if (materials) {
                const next = new Float32Array(vertices.length / 6);
                next.set(materials);
                materials = next;
              }
            }
            for (const vertex of triangle) {
              vertices.set(vertex.point, used);
              vertices.set(vertex.normal, used + 3);
              if (materials) materials[used / 6] = vertex.material ?? 0;
              used += 6;
            }
          }
      }
    yield { progress: (z + 1) / (coordinates[2].length - 1) };
  }
  return {
    vertices: vertices.slice(0, used),
    triangles: used / 18,
    materials: materials?.slice(0, used / 6),
  };
}
export function clipPolygon(input: Vertex[], axis: number, plane: number, keepLower: boolean) {
  const output: Vertex[] = [];
  if (!input.length) return output;
  let before = input[input.length - 1],
    dBefore = before.point[axis] - plane;
  if (!keepLower) dBefore = -dBefore;
  for (const after of input) {
    let dAfter = after.point[axis] - plane;
    if (!keepLower) dAfter = -dAfter;
    if (dBefore <= 0 !== dAfter <= 0) {
      const t = dBefore / (dBefore - dAfter);
      const intersection: Vertex = {
        point: mix(before.point, after.point, t),
        normal: unit(mix(before.normal, after.normal, t)),
      };
      if (before.material !== undefined && after.material !== undefined)
        intersection.material = before.material + t * (after.material - before.material);
      output.push(intersection);
    }
    if (dAfter <= 0) output.push(after);
    before = after;
    dBefore = dAfter;
  }
  return output;
}
