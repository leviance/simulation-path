import {
  add,
  scale,
  subtract,
  cross,
  length,
  finite,
  clamp,
  barycentric,
  Random,
  type Sampling,
  type Vec3,
} from "./math.ts";
import type { Mesh } from "./mesh.ts";

export const histogramBins = 16;
export const triangleArea = (a: Vec3, b: Vec3, c: Vec3) =>
  0.5 * length(cross(subtract(b, a), subtract(c, a)));
export class AreaDistribution {
  readonly mesh: Mesh;
  readonly expected = new Float64Array(histogramBins);
  readonly cumulative: number[] = [];
  readonly triangleIds: number[] = [];
  readonly triangleBins: number[] = [];
  total = 0;
  constructor(mesh: Mesh) {
    this.mesh = mesh;
    if (mesh.triangles.length === 0 || mesh.triangles.length > 20000)
      throw new Error("Mesh phải có từ 1 tới 20.000 tam giác.");
    for (const [index, triangle] of mesh.triangles.entries()) {
      if (
        triangle.some(
          (id) =>
            !Number.isInteger(id) ||
            id < 0 ||
            id >= mesh.vertices.length ||
            !finite(mesh.vertices[id]),
        )
      )
        throw new Error("Mesh có index hoặc vị trí không hợp lệ.");
      const [a, b, c] = triangle.map((id) => mesh.vertices[id]);
      const area = triangleArea(a, b, c);
      if (!Number.isFinite(area)) throw new Error("Diện tích không hữu hạn.");
      if (area <= 1e-12) continue;
      this.total += area;
      this.cumulative.push(this.total);
      this.triangleIds.push(index);
      const centroidY = (a.y + b.y + c.y) / 3;
      const bin = clamp(
        Math.floor(((centroidY + 2.2) / 4.4) * histogramBins),
        0,
        histogramBins - 1,
      );
      this.triangleBins[index] = bin;
      this.expected[bin] += area;
    }
    if (!Number.isFinite(this.total) || this.total <= 0)
      throw new Error("Mesh không có diện tích dương hữu hạn.");
    for (let bin = 0; bin < histogramBins; bin++) this.expected[bin] /= this.total;
  }
  choose(u: number, mode: Sampling) {
    if (!Number.isFinite(u) || u < 0 || u >= 1)
      throw new Error("Biến chọn tam giác phải thuộc [0,1).");
    if (mode === "triangle")
      return this.triangleIds[
        Math.min(this.triangleIds.length - 1, Math.floor(u * this.triangleIds.length))
      ];
    const threshold = u * this.total;
    let low = 0;
    let high = this.cumulative.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (this.cumulative[middle] <= threshold) low = middle + 1;
      else high = middle;
    }
    return this.triangleIds[Math.min(low, this.triangleIds.length - 1)];
  }
  sample(random: Random, mode: Sampling) {
    const triangle = this.choose(random.uniform(), mode);
    const u = random.uniform();
    const v = random.uniform();
    const weights = barycentric(u, v);
    const [a, b, c] = this.mesh.triangles[triangle].map((id) => this.mesh.vertices[id]);
    return {
      position: add(add(scale(a, weights[0]), scale(b, weights[1])), scale(c, weights[2])),
      triangle,
      bin: this.triangleBins[triangle],
    };
  }
}
