export interface NearVec3 {
  x: number;
  y: number;
  z: number;
}

export interface NearColor {
  red: number;
  green: number;
  blue: number;
}

export interface NearVertex {
  position: NearVec3;
  color: NearColor;
}

export interface NearTriangle {
  a: NearVertex;
  b: NearVertex;
  c: NearVertex;
}

export interface NearPlaneCounts {
  inside: number;
  outside: number;
  onPlane: number;
}

export interface NearClipStep {
  edge: [NearVertex, NearVertex];
  transition: "in→in" | "in→out" | "out→in" | "out→out";
  appended: NearVertex[];
  output: NearVertex[];
}

export interface NearProjectedVertex {
  x: number;
  y: number;
  color: NearColor;
}

export type NearProjectedTriangle = [NearProjectedVertex, NearProjectedVertex, NearProjectedVertex];

export function nearTriangleVertices(triangle: NearTriangle) {
  return [triangle.a, triangle.b, triangle.c] as const;
}

export function nearSignedDistance(vertex: NearVertex, nearPlane: number) {
  return vertex.position.z - nearPlane;
}

export function nearVertexIsInside(vertex: NearVertex, nearPlane: number, epsilon = 1e-9) {
  return nearSignedDistance(vertex, nearPlane) >= -epsilon;
}

export function classifyNearTriangle(
  triangle: NearTriangle,
  nearPlane: number,
  epsilon = 1e-9,
): NearPlaneCounts {
  const counts: NearPlaneCounts = { inside: 0, outside: 0, onPlane: 0 };
  for (const vertex of nearTriangleVertices(triangle)) {
    const distance = nearSignedDistance(vertex, nearPlane);
    if (Math.abs(distance) <= epsilon) {
      counts.onPlane += 1;
      counts.inside += 1;
    } else if (distance > 0) {
      counts.inside += 1;
    } else {
      counts.outside += 1;
    }
  }
  return counts;
}

function mix(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export function interpolateNearVertex(start: NearVertex, end: NearVertex, t: number): NearVertex {
  return {
    position: {
      x: mix(start.position.x, end.position.x, t),
      y: mix(start.position.y, end.position.y, t),
      z: mix(start.position.z, end.position.z, t),
    },
    color: {
      red: mix(start.color.red, end.color.red, t),
      green: mix(start.color.green, end.color.green, t),
      blue: mix(start.color.blue, end.color.blue, t),
    },
  };
}

export function intersectNearPlane(start: NearVertex, end: NearVertex, nearPlane: number) {
  const depthChange = end.position.z - start.position.z;
  if (Math.abs(depthChange) <= 1e-12) {
    return { t: 0, vertex: { ...start, position: { ...start.position, z: nearPlane } } };
  }
  const t = Math.max(0, Math.min(1, (nearPlane - start.position.z) / depthChange));
  const vertex = interpolateNearVertex(start, end, t);
  vertex.position.z = nearPlane;
  return { t, vertex };
}

export function traceNearPlaneClip(
  triangle: NearTriangle,
  nearPlane: number,
  epsilon = 1e-9,
): NearClipStep[] {
  const input = [...nearTriangleVertices(triangle)];
  const output: NearVertex[] = [];
  const steps: NearClipStep[] = [];
  let previous = input.at(-1)!;
  let previousInside = nearVertexIsInside(previous, nearPlane, epsilon);

  for (const current of input) {
    const currentInside = nearVertexIsInside(current, nearPlane, epsilon);
    const appended: NearVertex[] = [];
    if (currentInside && !previousInside) {
      appended.push(intersectNearPlane(previous, current, nearPlane).vertex);
    }
    if (currentInside) appended.push(current);
    if (!currentInside && previousInside) {
      appended.push(intersectNearPlane(previous, current, nearPlane).vertex);
    }
    output.push(...appended);
    const transition = `${previousInside ? "in" : "out"}→${currentInside ? "in" : "out"}` as
      "in→in" | "in→out" | "out→in" | "out→out";
    steps.push({ edge: [previous, current], transition, appended, output: [...output] });
    previous = current;
    previousInside = currentInside;
  }
  return steps;
}

export function clipNearTriangle(triangle: NearTriangle, nearPlane: number, epsilon = 1e-9) {
  return traceNearPlaneClip(triangle, nearPlane, epsilon).at(-1)?.output ?? [];
}

export function triangulateNearPolygon(polygon: readonly NearVertex[]): NearTriangle[] {
  const triangles: NearTriangle[] = [];
  for (let index = 1; index + 1 < polygon.length; index += 1) {
    triangles.push({ a: polygon[0], b: polygon[index], c: polygon[index + 1] });
  }
  return triangles;
}

export function projectNearVertex(
  vertex: NearVertex,
  verticalFovRadians: number,
  aspectRatio: number,
  nearPlane: number,
): NearProjectedVertex | undefined {
  if (vertex.position.z < nearPlane || aspectRatio <= 0) return undefined;
  const focalScale = 1 / Math.tan(verticalFovRadians * 0.5);
  return {
    x: (vertex.position.x * focalScale) / (aspectRatio * vertex.position.z),
    y: (vertex.position.y * focalScale) / vertex.position.z,
    color: vertex.color,
  };
}

export function projectNearTriangle(
  triangle: NearTriangle,
  verticalFovRadians: number,
  aspectRatio: number,
  nearPlane: number,
): NearProjectedTriangle | undefined {
  const projected = nearTriangleVertices(triangle).map((vertex) =>
    projectNearVertex(vertex, verticalFovRadians, aspectRatio, nearPlane),
  );
  if (!projected[0] || !projected[1] || !projected[2]) return undefined;
  return [projected[0], projected[1], projected[2]];
}

export function maximumNearViolation(polygon: readonly NearVertex[], nearPlane: number) {
  return polygon.reduce(
    (violation, vertex) => Math.max(violation, nearPlane - vertex.position.z),
    0,
  );
}
