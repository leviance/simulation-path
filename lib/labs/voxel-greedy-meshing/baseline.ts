import { buildMesh as buildCulled } from "../voxel-hidden-faces/mesh.ts";
import { index, type Rectangle } from "./model.ts";

// Reuse the cell-neighbor baseline from Project 59, including its work counter.
export function buildBaseline(chunk: Uint8Array, slice: number) {
  const baseline = buildCulled(chunk, true, slice);
  const quads: Rectangle[] = baseline.keys.map(([x, y, z, face]) => {
    const p = [x, y, z],
      axis = Math.floor(face / 2);
    return {
      face,
      plane: p[axis] + Number(face % 2 === 0),
      u: p[(axis + 1) % 3],
      v: p[(axis + 2) % 3],
      width: 1,
      height: 1,
      material: chunk[index(x, y, z)],
    };
  });
  return {
    mesh: baseline.mesh,
    quads,
    unitFaces: quads.length,
    work: { samples: baseline.neighborChecks, comparisons: 0 },
  };
}
