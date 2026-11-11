import {
  add,
  scale,
  subtract,
  cross,
  dot,
  unit,
  length,
  clamp,
  tau,
  type Shape,
  type Vec3,
} from "./math.ts";

export interface Mesh {
  vertices: Vec3[];
  triangles: [number, number, number][];
}
export function knotCenter(u: number): Vec3 {
  const ring = 1.35 + 0.48 * Math.cos(3 * u);
  return { x: ring * Math.cos(2 * u), y: 0.48 * Math.sin(3 * u), z: ring * Math.sin(2 * u) };
}
function transport(normal: Vec3, oldTangent: Vec3, tangent: Vec3) {
  const axis = cross(oldTangent, tangent);
  const sine = length(axis);
  const cosine = clamp(dot(oldTangent, tangent), -1, 1);
  if (sine > 1e-10) {
    const k = scale(axis, 1 / sine);
    normal = add(
      add(scale(normal, cosine), scale(cross(k, normal), sine)),
      scale(k, dot(k, normal) * (1 - cosine)),
    );
  }
  return unit(subtract(normal, scale(tangent, dot(normal, tangent))));
}
export function makeMesh(shape: Shape, uSegments = 64, vSegments = 32): Mesh {
  if (
    !["sphere", "torus", "knot"].includes(shape) ||
    !Number.isInteger(uSegments) ||
    !Number.isInteger(vSegments) ||
    uSegments < 8 ||
    uSegments > 128 ||
    vSegments < 8 ||
    vSegments > 64
  )
    throw new Error("Cấu hình mesh mẫu không hợp lệ.");
  const vertices: Vec3[] = [];
  const triangles: Mesh["triangles"] = [];
  const tangents: Vec3[] = [];
  const normals: Vec3[] = [];
  if (shape === "knot") {
    for (let row = 0; row <= uSegments; row++) {
      const u = (tau * row) / uSegments;
      tangents.push(unit(subtract(knotCenter(u + 1e-5), knotCenter(u - 1e-5))));
    }
    normals.push(unit(cross(tangents[0], { x: 0, y: 1, z: 0 })));
    for (let row = 1; row <= uSegments; row++)
      normals.push(transport(normals[row - 1], tangents[row - 1], tangents[row]));
    const residual = Math.atan2(
      dot(tangents[0], cross(normals[uSegments], normals[0])),
      dot(normals[uSegments], normals[0]),
    );
    for (let row = 1; row <= uSegments; row++) {
      const angle = (residual * row) / uSegments;
      normals[row] = add(
        scale(normals[row], Math.cos(angle)),
        scale(cross(tangents[row], normals[row]), Math.sin(angle)),
      );
    }
  }
  const columns = vSegments + 1;
  for (let row = 0; row <= uSegments; row++) {
    const u = (tau * row) / uSegments;
    for (let column = 0; column <= vSegments; column++) {
      const v = (tau * column) / vSegments;
      let point: Vec3;
      if (shape === "sphere") {
        const latitude = (Math.PI * column) / vSegments;
        point = {
          x: 1.65 * Math.sin(latitude) * Math.cos(u),
          y: 1.65 * Math.cos(latitude),
          z: 1.65 * Math.sin(latitude) * Math.sin(u),
        };
      } else if (shape === "torus") {
        const radius = 1.35 + 0.48 * Math.cos(v);
        point = { x: radius * Math.cos(u), y: 0.48 * Math.sin(v), z: radius * Math.sin(u) };
      } else {
        point = add(
          add(knotCenter(u), scale(normals[row], 0.2 * Math.cos(v))),
          scale(cross(tangents[row], normals[row]), 0.2 * Math.sin(v)),
        );
      }
      if (row === uSegments) point = vertices[column];
      if (shape !== "sphere" && column === vSegments) point = vertices[row * columns];
      vertices.push(point);
    }
  }
  for (let row = 0; row < uSegments; row++) {
    for (let column = 0; column < vSegments; column++) {
      const a = row * columns + column;
      const b = a + columns;
      triangles.push([a, b, a + 1], [a + 1, b, b + 1]);
    }
  }
  return { vertices, triangles };
}
