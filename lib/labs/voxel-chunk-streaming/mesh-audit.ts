import { faceColor, type Vec3 } from "../voxel-greedy-meshing/model.ts";
import type { World } from "./types.ts";

// Check the actual triangle buffer against the quad contract. Do not call
// appendQuad: a broken emitter must not generate its own expected result.
export function verifyTriangles(world: World) {
  let triangles = 0;
  for (const entry of world.chunks.values()) {
    if (entry.mesh.length !== entry.quads.length * 2) throw Error("triangle count mismatch");
    entry.quads.forEach((q, index) => {
      const point = (u: number, v: number): Vec3 => {
        if (q.face < 2) return [q.plane, u, v];
        if (q.face < 4) return [v, q.plane, u];
        return [u, v, q.plane];
      };
      const corners = [
        point(q.u, q.v),
        point(q.u + q.width, q.v),
        point(q.u + q.width, q.v + q.height),
        point(q.u, q.v + q.height),
      ];
      const order = q.face % 2 === 0 ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1];
      const color = faceColor(q.material, q.face);
      for (let t = 0; t < 2; t++) {
        const actual = entry.mesh[index * 2 + t];
        if (
          !actual ||
          actual.color.length !== 4 ||
          actual.color.some((c, i) => c !== color[i]) ||
          actual.points.length !== 3 ||
          actual.points.some(
            (p, i) =>
              p.length !== 3 ||
              p.some((v, axis) => !Number.isFinite(v) || v !== corners[order[t * 3 + i]][axis]),
          )
        )
          throw Error("triangle geometry, winding or color mismatch");
      }
    });
    triangles += entry.mesh.length;
  }
  return triangles;
}
