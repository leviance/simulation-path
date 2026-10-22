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
  valid: boolean;
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

export function finiteNearVertex(vertex: NearVertex) {
  return [...Object.values(vertex.position), ...Object.values(vertex.color)].every(Number.isFinite);
}

export function cloneNearVertex(vertex: NearVertex): NearVertex {
  return { position: { ...vertex.position }, color: { ...vertex.color } };
}

function validNear(nearPlane: number) {
  return Number.isFinite(nearPlane) && nearPlane > 0;
}

export function nearSignedDistance(vertex: NearVertex, nearPlane: number) {
  return finiteNearVertex(vertex) && Number.isFinite(nearPlane)
    ? vertex.position.z - nearPlane
    : NaN;
}

// Epsilon is diagnostic only. The kept half-space and projection both use z >= near.
export function nearVertexIsInside(vertex: NearVertex, nearPlane: number) {
  const d = nearSignedDistance(vertex, nearPlane);
  return validNear(nearPlane) && Number.isFinite(d) && d >= 0;
}

export function classifyNearTriangle(
  triangle: NearTriangle,
  nearPlane: number,
  epsilon = 1e-9,
): NearPlaneCounts {
  const counts = { inside: 0, outside: 0, onPlane: 0, valid: true };
  if (!validNear(nearPlane) || !Number.isFinite(epsilon) || epsilon < 0) {
    return { ...counts, valid: false };
  }
  for (const vertex of nearTriangleVertices(triangle)) {
    const distance = nearSignedDistance(vertex, nearPlane);
    if (!Number.isFinite(distance)) return { inside: 0, outside: 0, onPlane: 0, valid: false };
    if (Math.abs(distance) <= epsilon) counts.onPlane++;
    if (distance >= 0) counts.inside++;
    else counts.outside++;
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

export function intersectNearPlane(
  start: NearVertex,
  end: NearVertex,
  nearPlane: number,
): { t: number; vertex: NearVertex } | undefined {
  if (!validNear(nearPlane) || !finiteNearVertex(start) || !finiteNearVertex(end)) return;
  if (start.position.z === nearPlane) return { t: 0, vertex: cloneNearVertex(start) };
  if (end.position.z === nearPlane) return { t: 1, vertex: cloneNearVertex(end) };
  const change = end.position.z - start.position.z;
  if (!Number.isFinite(change) || change === 0) return;
  const t = (nearPlane - start.position.z) / change;
  // An intersection with the infinite line is not necessarily on this segment.
  if (!Number.isFinite(t) || t < 0 || t > 1) return;
  const vertex = interpolateNearVertex(start, end, t);
  if (!finiteNearVertex(vertex)) return;
  vertex.position.z = nearPlane;
  return { t, vertex };
}

export function sameNearPosition(a: NearVertex, b: NearVertex) {
  return (
    a.position.x === b.position.x && a.position.y === b.position.y && a.position.z === b.position.z
  );
}

export function traceNearPlaneClip(
  triangle: NearTriangle,
  nearPlane: number,
  epsilon = 1e-9,
): NearClipStep[] {
  if (!classifyNearTriangle(triangle, nearPlane, epsilon).valid) return [];
  const input = nearTriangleVertices(triangle);
  const output: NearVertex[] = [];
  const steps: NearClipStep[] = [];
  let previous = input[2];
  let previousInside = nearVertexIsInside(previous, nearPlane);
  for (const [index, current] of input.entries()) {
    const currentInside = nearVertexIsInside(current, nearPlane);
    const appended: NearVertex[] = [];
    const append = (vertex: NearVertex) => {
      if (output.length && sameNearPosition(output[output.length - 1], vertex)) return;
      output.push(cloneNearVertex(vertex));
      appended.push(cloneNearVertex(vertex));
    };
    if (currentInside !== previousInside) {
      const hit = intersectNearPlane(previous, current, nearPlane);
      if (!hit) return [];
      append(hit.vertex);
    }
    if (currentInside) append(current);
    if (output.length > 4) return [];
    if (
      index === 2 &&
      output.length > 1 &&
      sameNearPosition(output[0], output[output.length - 1])
    ) {
      output.pop();
    }
    const transition =
      `${previousInside ? "in" : "out"}→${currentInside ? "in" : "out"}` as NearClipStep["transition"];
    steps.push({
      edge: [cloneNearVertex(previous), cloneNearVertex(current)],
      transition,
      appended,
      output: output.map(cloneNearVertex),
    });
    previous = current;
    previousInside = currentInside;
  }
  return steps;
}

export function clipNearTriangle(triangle: NearTriangle, nearPlane: number, epsilon = 1e-9) {
  return traceNearPlaneClip(triangle, nearPlane, epsilon).at(-1)?.output ?? [];
}

export function nearTriangleAreaSquared(triangle: NearTriangle) {
  const a = triangle.a.position,
    b = triangle.b.position,
    c = triangle.c.position;
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const n = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  return n.x * n.x + n.y * n.y + n.z * n.z;
}

export function triangulateNearPolygon(polygon: readonly NearVertex[]): NearTriangle[] {
  if (polygon.length > 4 || !polygon.every(finiteNearVertex)) return [];
  const triangles: NearTriangle[] = [];
  for (let index = 1; index + 1 < polygon.length; index++) {
    const triangle = { a: polygon[0], b: polygon[index], c: polygon[index + 1] };
    const area = nearTriangleAreaSquared(triangle);
    if (!Number.isFinite(area)) return [];
    if (area > 0) triangles.push(triangle);
  }
  return triangles;
}

export function projectNearVertex(
  vertex: NearVertex,
  verticalFovRadians: number,
  aspectRatio: number,
  nearPlane: number,
): NearProjectedVertex | undefined {
  if (
    !nearVertexIsInside(vertex, nearPlane) ||
    !Number.isFinite(verticalFovRadians) ||
    verticalFovRadians <= 0 ||
    verticalFovRadians >= Math.PI ||
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0
  )
    return;
  const focalScale = 1 / Math.tan(verticalFovRadians * 0.5);
  const x = (vertex.position.x * focalScale) / (aspectRatio * vertex.position.z);
  const y = (vertex.position.y * focalScale) / vertex.position.z;
  if (![x, y].every(Number.isFinite)) return;
  return { x, y, color: { ...vertex.color } };
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
  if (!projected[0] || !projected[1] || !projected[2]) return;
  return [projected[0], projected[1], projected[2]];
}

export function maximumNearViolation(polygon: readonly NearVertex[], nearPlane: number) {
  if (!validNear(nearPlane) || polygon.length > 4 || !polygon.every(finiteNearVertex))
    return Infinity;
  return polygon.reduce(
    (violation, vertex) => Math.max(violation, nearPlane - vertex.position.z),
    0,
  );
}
