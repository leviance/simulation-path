import { faces, type Vec3 } from "./voxel-chunk/model.ts";

const expected: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export function inspectQuad(face: number, reverseSecond = false) {
  if (!Number.isInteger(face) || face < 0 || face > 5) throw new RangeError("face 0..5");
  // Sao chép: thí nghiệm đảo winding không được sửa bảng geometry dùng chung.
  const vertices = faces[face].map((p) => [...p] as Vec3);
  const corners = [[0, 1, 2], reverseSecond ? [0, 3, 2] : [0, 2, 3]];
  const triangles = corners.map((indices) => {
    const [a, b, c] = indices.map((i) => vertices[i]);
    const u = b.map((v, i) => v - a[i]),
      w = c.map((v, i) => v - a[i]);
    const rawNormal: Vec3 = [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0],
    ];
    const normal = rawNormal.map((v) => (v === 0 ? 0 : v)) as Vec3;
    const centre = a.map((v, i) => (v + b[i] + c[i]) / 3) as Vec3;
    return { indices, normal, centre };
  });
  return { vertices, triangles, expected: [...expected[face]] as Vec3 };
}
