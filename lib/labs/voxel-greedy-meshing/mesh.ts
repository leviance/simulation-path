import { faceColor, type Rectangle, type Triangle, type Vec3, type Work } from "./model.ts";
import { makeMask, rectangles } from "./mask.ts";
import { buildBaseline } from "./baseline.ts";
export function appendQuad(mesh: Triangle[], r: Rectangle) {
  const axis = Math.floor(r.face / 2),
    uAxis = (axis + 1) % 3,
    vAxis = (axis + 2) % 3;
  const p: Vec3 = [0, 0, 0];
  p[axis] = r.plane;
  p[uAxis] = r.u;
  p[vAxis] = r.v;
  const corners: Vec3[] = [p, [...p], [...p], [...p]];
  corners[1][uAxis] += r.width;
  corners[2][uAxis] += r.width;
  corners[2][vAxis] += r.height;
  corners[3][vAxis] += r.height;
  const indices = r.face % 2 === 0 ? [0, 1, 2, 0, 2, 3] : [0, 3, 2, 0, 2, 1];
  for (let t = 0; t < 2; t++)
    mesh.push({
      points: indices.slice(t * 3, t * 3 + 3).map((i) => corners[i]) as [Vec3, Vec3, Vec3],
      color: faceColor(r.material, r.face),
    });
}
export function buildMesh(chunk: Uint8Array, slice = 15, merge = true, mergeFace = -1) {
  if (!Number.isInteger(mergeFace) || mergeFace < -1 || mergeFace > 5)
    throw new RangeError("mergeFace -1..5");
  if (!merge) return buildBaseline(chunk, slice);
  const mesh: Triangle[] = [],
    quads: Rectangle[] = [],
    work: Work = { samples: 0, comparisons: 0 };
  let unitFaces = 0;
  for (let face = 0; face < 6; face++)
    for (let plane = 0; plane <= 16; plane++) {
      const mask = makeMask(chunk, face, plane, slice);
      work.samples += 256;
      unitFaces += mask.reduce((sum, m) => sum + Number(m !== 0), 0);
      for (const r of rectangles(
        mask,
        face,
        plane,
        merge && (mergeFace === -1 || mergeFace === face),
        work,
      )) {
        quads.push(r);
        appendQuad(mesh, r);
      }
    }
  return { mesh, quads, unitFaces, work };
}
