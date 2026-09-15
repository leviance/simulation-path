export interface RasterPoint {
  x: number;
  y: number;
}

export interface RasterTriangle {
  a: RasterPoint;
  b: RasterPoint;
  c: RasterPoint;
}

export interface RasterBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface BarycentricWeights {
  a: number;
  b: number;
  c: number;
}

export interface TriangleCoverageSample {
  position: RasterPoint;
  edgeAB: number;
  edgeBC: number;
  edgeCA: number;
  barycentric: BarycentricWeights;
  inside: boolean;
}

export interface RasterFragment {
  x: number;
  y: number;
  sample: TriangleCoverageSample;
}

export type TriangleFillRule = "inclusive" | "top-left";
export type TriangleWinding = "positive" | "negative" | "degenerate";

export function triangleOrient2d(a: RasterPoint, b: RasterPoint, point: RasterPoint) {
  const edgeX = b.x - a.x;
  const edgeY = b.y - a.y;
  const offsetX = point.x - a.x;
  const offsetY = point.y - a.y;
  return edgeX * offsetY - edgeY * offsetX;
}

export function triangleSignedDoubleArea(triangle: RasterTriangle) {
  return triangleOrient2d(triangle.a, triangle.b, triangle.c);
}

export function triangleWinding(triangle: RasterTriangle, epsilon = 1e-9): TriangleWinding {
  const area = triangleSignedDoubleArea(triangle);
  if (area > epsilon) return "positive";
  if (area < -epsilon) return "negative";
  return "degenerate";
}

export function normalizeTriangleWinding(triangle: RasterTriangle): RasterTriangle {
  if (triangleWinding(triangle) !== "negative") return triangle;
  return { a: triangle.a, b: triangle.c, c: triangle.b };
}

export function triangleBounds(
  triangle: RasterTriangle,
  width: number,
  height: number,
): RasterBounds {
  if (width <= 0 || height <= 0) return { minX: 0, minY: 0, maxX: -1, maxY: -1 };
  const minX = Math.max(
    0,
    Math.min(width - 1, Math.floor(Math.min(triangle.a.x, triangle.b.x, triangle.c.x))),
  );
  const minY = Math.max(
    0,
    Math.min(height - 1, Math.floor(Math.min(triangle.a.y, triangle.b.y, triangle.c.y))),
  );
  const maxX = Math.max(
    0,
    Math.min(width - 1, Math.ceil(Math.max(triangle.a.x, triangle.b.x, triangle.c.x)) - 1),
  );
  const maxY = Math.max(
    0,
    Math.min(height - 1, Math.ceil(Math.max(triangle.a.y, triangle.b.y, triangle.c.y)) - 1),
  );
  return { minX, minY, maxX, maxY };
}

export function triangleCandidateCount(bounds: RasterBounds) {
  if (bounds.maxX < bounds.minX || bounds.maxY < bounds.minY) return 0;
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}

export function rasterPixelCenter(x: number, y: number): RasterPoint {
  return { x: x + 0.5, y: y + 0.5 };
}

export function triangleIsTopLeftEdge(a: RasterPoint, b: RasterPoint, epsilon = 1e-9) {
  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;
  return deltaY < -epsilon || (Math.abs(deltaY) <= epsilon && deltaX > epsilon);
}

function acceptsTriangleEdge(
  value: number,
  topLeft: boolean,
  rule: TriangleFillRule,
  epsilon = 1e-9,
) {
  if (value > epsilon) return true;
  if (value < -epsilon) return false;
  return rule === "inclusive" || topLeft;
}

export function sampleRasterTriangle(
  source: RasterTriangle,
  position: RasterPoint,
  rule: TriangleFillRule = "top-left",
): TriangleCoverageSample {
  const triangle = normalizeTriangleWinding(source);
  const area = triangleSignedDoubleArea(triangle);
  const empty: TriangleCoverageSample = {
    position,
    edgeAB: 0,
    edgeBC: 0,
    edgeCA: 0,
    barycentric: { a: 0, b: 0, c: 0 },
    inside: false,
  };
  if (Math.abs(area) <= 1e-9) return empty;

  const edgeAB = triangleOrient2d(triangle.a, triangle.b, position);
  const edgeBC = triangleOrient2d(triangle.b, triangle.c, position);
  const edgeCA = triangleOrient2d(triangle.c, triangle.a, position);
  const inside =
    acceptsTriangleEdge(edgeAB, triangleIsTopLeftEdge(triangle.a, triangle.b), rule) &&
    acceptsTriangleEdge(edgeBC, triangleIsTopLeftEdge(triangle.b, triangle.c), rule) &&
    acceptsTriangleEdge(edgeCA, triangleIsTopLeftEdge(triangle.c, triangle.a), rule);
  return {
    position,
    edgeAB,
    edgeBC,
    edgeCA,
    barycentric: { a: edgeBC / area, b: edgeCA / area, c: edgeAB / area },
    inside,
  };
}

export function rasterizeTriangleCoverage(
  triangle: RasterTriangle,
  width: number,
  height: number,
  rule: TriangleFillRule = "top-left",
  candidateLimit = Number.POSITIVE_INFINITY,
) {
  const bounds = triangleBounds(triangle, width, height);
  const candidateCount = triangleCandidateCount(bounds);
  const fragments: RasterFragment[] = [];
  let testedCount = 0;
  const safeLimit = Math.max(0, Math.min(candidateLimit, candidateCount));
  const degenerate = triangleWinding(triangle) === "degenerate";
  if (!degenerate) {
    for (let y = bounds.minY; y <= bounds.maxY && testedCount < safeLimit; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX && testedCount < safeLimit; x += 1) {
        const sample = sampleRasterTriangle(triangle, rasterPixelCenter(x, y), rule);
        testedCount += 1;
        if (sample.inside) fragments.push({ x, y, sample });
      }
    }
  }
  return {
    bounds,
    candidateCount,
    testedCount,
    coveredCount: fragments.length,
    degenerate,
    fragments,
  };
}

export function barycentricSumError(weights: BarycentricWeights) {
  return Math.abs(weights.a + weights.b + weights.c - 1);
}

export function interpolateBarycentricRgb(weights: BarycentricWeights) {
  const byte = (value: number) => Math.round(Math.max(0, Math.min(255, value)));
  return {
    red: byte(weights.a * 255),
    green: byte(weights.b * 255),
    blue: byte(weights.c * 255),
  };
}

export function sharedTriangleEdgeOwnership(
  first: RasterTriangle,
  second: RasterTriangle,
  position: RasterPoint,
  rule: TriangleFillRule,
) {
  let owners = 0;
  if (sampleRasterTriangle(first, position, rule).inside) owners += 1;
  if (sampleRasterTriangle(second, position, rule).inside) owners += 1;
  return owners;
}
