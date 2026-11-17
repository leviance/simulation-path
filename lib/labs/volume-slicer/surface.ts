import { Volume, worldCoordinate, lower, type Point } from "./model.ts";
import { sampleLinear } from "./sampling.ts";
import { add, sub, mul, dot, cross, normal, type Vertex, type Surface } from "./geometry.ts";

export const surfaceIso = 0.18;
export const surfaceStride = 3;
export const maxSurfaceTriangles = 180000;
interface Node {
  index: number;
  world: number;
}

function nodes(volume: Volume, axis: number, step: number): Node[] {
  const grid = volume.grid,
    count = grid.count[axis];
  // Zero padding closes presentation surfaces at the boundary. Stored samples stay unchanged.
  const result: Node[] = [{ index: -1, world: lower(grid, axis) }];
  for (let i = 0; i < count; i += step)
    result.push({ index: i, world: worldCoordinate(grid, axis, i) });
  if (result[result.length - 1].index !== count - 1)
    result.push({ index: count - 1, world: worldCoordinate(grid, axis, count - 1) });
  result.push({ index: count, world: -lower(grid, axis) });
  return result;
}

// Coarse context mesh only; all slice pixels still sample the full-resolution Volume.
export function extractSurface(volume: Volume, iso = surfaceIso, step = surfaceStride): Surface {
  if (
    !Number.isFinite(iso) ||
    iso <= 0 ||
    iso >= 1 ||
    !Number.isInteger(step) ||
    step < 1 ||
    step > 8
  )
    throw new RangeError("Bounded isovalue and mesh stride required");
  const g = volume.grid;
  if (
    g.count.some(
      (n, a) =>
        !Number.isInteger(n) ||
        n < 1 ||
        n > 128 ||
        !Number.isFinite(g.spacing[a]) ||
        g.spacing[a] <= 0,
    ) ||
    volume.values.length !== g.count[0] * g.count[1] * g.count[2]
  )
    throw new RangeError("Valid volume storage required");
  const axes = [0, 1, 2].map((axis) => nodes(volume, axis, step));
  const [nx, ny, nz] = axes.map((axis) => axis.length);
  const values = new Float64Array(nx * ny * nz);
  for (let z = 1; z < nz - 1; z++)
    for (let y = 1; y < ny - 1; y++)
      for (let x = 1; x < nx - 1; x++)
        values[x + nx * (y + ny * z)] = volume.voxel(
          axes[0][x].index,
          axes[1][y].index,
          axes[2][z].index,
        );
  const offsets = [
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
    [0, 5, 1, 6],
    [0, 1, 2, 6],
    [0, 2, 3, 6],
    [0, 3, 7, 6],
    [0, 7, 4, 6],
    [0, 4, 5, 6],
  ];
  const vertices = new Map<string, Vertex>(),
    result: Surface = [];
  const h = g.spacing.map((s) => 2 * s) as Point;
  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        const ids = offsets.map((o) => x + o[0] + nx * (y + o[1] + ny * (z + o[2])));
        const f = ids.map((id) => values[id]);
        if (Math.min(...f) > iso || Math.max(...f) < iso) continue;
        const p = offsets.map(
          (o) =>
            [axes[0][x + o[0]].world, axes[1][y + o[1]].world, axes[2][z + o[2]].world] as Point,
        );
        for (const tet of tetrahedra) {
          const inside = tet.filter((i) => f[i] >= iso),
            outside = tet.filter((i) => f[i] < iso);
          if (!inside.length || !outside.length) continue;
          const e1 = sub(p[tet[1]], p[tet[0]]),
            e2 = sub(p[tet[2]], p[tet[0]]),
            e3 = sub(p[tet[3]], p[tet[0]]);
          const determinant = dot(e1, cross(e2, e3));
          const gradient = mul(
            add(
              add(
                mul(cross(e2, e3), f[tet[1]] - f[tet[0]]),
                mul(cross(e3, e1), f[tet[2]] - f[tet[0]]),
              ),
              mul(cross(e1, e2), f[tet[3]] - f[tet[0]]),
            ),
            1 / determinant,
          );
          const edge = (i: number, j: number): Vertex => {
            const key = Math.min(ids[i], ids[j]) + ":" + Math.max(ids[i], ids[j]);
            const cached = vertices.get(key);
            if (cached) return cached;
            const t = (iso - f[i]) / (f[j] - f[i]),
              point = add(p[i], mul(sub(p[j], p[i]), t));
            const grad: Point = [0, 0, 0];
            for (let a = 0; a < 3; a++) {
              const lo: Point = [...point],
                hi: Point = [...point];
              lo[a] -= h[a];
              hi[a] += h[a];
              grad[a] =
                ((sampleLinear(volume, hi) ?? 0) - (sampleLinear(volume, lo) ?? 0)) / (2 * h[a]);
            }
            let n = normal(mul(grad, -1));
            if (Math.hypot(...grad) < 1e-8) n = normal(mul(gradient, -1));
            const vertex = { p: point, n };
            if (vertices.size >= 250000)
              throw new RangeError("Presentation vertex budget exceeded");
            vertices.set(key, vertex);
            return vertex;
          };
          if (inside.length === 1) result.push(outside.map((j) => edge(inside[0], j)));
          else if (outside.length === 1) result.push(inside.map((i) => edge(i, outside[0])));
          else {
            const a = edge(inside[0], outside[0]),
              b = edge(inside[0], outside[1]);
            const c = edge(inside[1], outside[0]),
              d = edge(inside[1], outside[1]);
            result.push([a, b, c], [b, d, c]);
          }
          if (result.length > maxSurfaceTriangles)
            throw new RangeError("Presentation triangle budget exceeded");
        }
      }
  return result;
}
