import {
  normalizeTriangleWinding,
  triangleSignedDoubleArea,
  rasterizeTriangleCoverage,
  type BarycentricWeights,
  type RasterTriangle,
} from "./triangle-raster.ts";

export interface ZVec3 {
  x: number;
  y: number;
  z: number;
}

export interface ZColor {
  red: number;
  green: number;
  blue: number;
}

export interface ZScreenVertex {
  x: number;
  y: number;
  ndcDepth: number;
}

export interface ZTriangle {
  a: ZScreenVertex;
  b: ZScreenVertex;
  c: ZScreenVertex;
  color: ZColor;
  face: string;
}

export interface ZFragmentTrace {
  triangleIndex: number;
  face: string;
  newDepth: number;
  storedDepth: number;
  passed: boolean;
  weights?: BarycentricWeights;
}

export interface ZFrame {
  width: number;
  height: number;
  colors: ZColor[];
  depths: number[];
  passedCount: number;
  rejectedCount: number;
  traces: ZFragmentTrace[];
  submittedCount: number;
  culledCount: number;
}

const clearColor: ZColor = { red: 9, green: 15, blue: 29 };

export function zBufferIndex(width: number, x: number, y: number) {
  return y * width + x;
}

export function createZFrame(width: number, height: number, clearDepth = 1) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width * height > 4000000 ||
    !Number.isFinite(clearDepth) ||
    clearDepth < 0 ||
    clearDepth > 1
  )
    throw new RangeError("Invalid depth frame");
  const count = width * height;
  const frame: ZFrame = {
    width,
    height,
    colors: Array.from({ length: count }, () => ({ ...clearColor })),
    depths: Array.from({ length: count }, () => clearDepth),
    passedCount: 0,
    rejectedCount: 0,
    traces: [],
    submittedCount: 0,
    culledCount: 0,
  };
  return frame;
}

export function interpolateNdcDepth(a: number, b: number, c: number, weights: BarycentricWeights) {
  return weights.a * a + weights.b * b + weights.c * c;
}

export function testAndWriteZFragment(
  frame: ZFrame,
  x: number,
  y: number,
  newDepth: number,
  color: ZColor,
  depthEnabled = true,
  writeWhenDisabled = true,
) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    x >= frame.width ||
    y < 0 ||
    y >= frame.height ||
    !Number.isFinite(newDepth) ||
    newDepth < 0 ||
    newDepth >= 1
  )
    return false;
  const index = zBufferIndex(frame.width, x, y);
  const passed = !depthEnabled || newDepth < frame.depths[index];
  if (!passed) {
    frame.rejectedCount += 1;
    return false;
  }
  if (depthEnabled || writeWhenDisabled) frame.depths[index] = newDepth;
  frame.colors[index] = color;
  frame.passedCount += 1;
  return true;
}

function normalizedTriangle(triangle: ZTriangle) {
  const raster: RasterTriangle = {
    a: triangle.a,
    b: triangle.b,
    c: triangle.c,
  };
  const normalized = normalizeTriangleWinding(raster);
  if (normalized.b === raster.c) {
    return { ...triangle, b: triangle.c, c: triangle.b };
  }
  return triangle;
}

export function renderZTriangles(
  triangles: ZTriangle[],
  width: number,
  height: number,
  options: {
    depthEnabled?: boolean;
    reverseOrder?: boolean;
    inspect?: { x: number; y: number };
    cullEnabled?: boolean;
    writeWhenDisabled?: boolean;
  } = {},
) {
  const frame = createZFrame(width, height);
  const ordered = options.reverseOrder ? [...triangles].reverse() : triangles;
  ordered.forEach((source, triangleIndex) => {
    if (options.cullEnabled && triangleSignedDoubleArea(source) <= 1e-9) {
      frame.culledCount++;
      return;
    }
    frame.submittedCount++;
    const triangle = normalizedTriangle(source);
    const raster: RasterTriangle = { a: triangle.a, b: triangle.b, c: triangle.c };
    const coverage = rasterizeTriangleCoverage(raster, width, height, "top-left");
    for (const fragment of coverage.fragments) {
      const depth = interpolateNdcDepth(
        triangle.a.ndcDepth,
        triangle.b.ndcDepth,
        triangle.c.ndcDepth,
        fragment.sample.barycentric,
      );
      const index = zBufferIndex(width, fragment.x, fragment.y);
      const storedDepth = frame.depths[index];
      const passed = testAndWriteZFragment(
        frame,
        fragment.x,
        fragment.y,
        depth,
        triangle.color,
        options.depthEnabled ?? true,
        options.writeWhenDisabled ?? true,
      );
      if (options.inspect?.x === fragment.x && options.inspect.y === fragment.y) {
        frame.traces.push({
          triangleIndex: options.reverseOrder
            ? triangles.length - 1 - triangleIndex
            : triangleIndex,
          face: triangle.face,
          newDepth: depth,
          storedDepth,
          passed,
          weights: fragment.sample.barycentric,
        });
      }
    }
  });
  return frame;
}

function rotateCubePoint(point: ZVec3, angleX: number, angleY: number): ZVec3 {
  const cosineY = Math.cos(angleY);
  const sineY = Math.sin(angleY);
  const afterY = {
    x: point.x * cosineY + point.z * sineY,
    y: point.y,
    z: -point.x * sineY + point.z * cosineY,
  };
  const cosineX = Math.cos(angleX);
  const sineX = Math.sin(angleX);
  return {
    x: afterY.x,
    y: afterY.y * cosineX - afterY.z * sineX,
    z: afterY.y * sineX + afterY.z * cosineX,
  };
}

export function projectZVertex(
  point: ZVec3,
  width: number,
  height: number,
  nearPlane = 1,
  farPlane = 10,
): ZScreenVertex {
  if (
    ![point.x, point.y, point.z, width, height, nearPlane, farPlane].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    nearPlane <= 0 ||
    farPlane <= nearPlane ||
    point.z < nearPlane ||
    point.z > farPlane
  )
    return { x: NaN, y: NaN, ndcDepth: NaN };
  const focalScale = 1 / Math.tan(Math.PI / 6);
  const aspect = width / height;
  const ndcX = (point.x * focalScale) / (aspect * point.z);
  const ndcY = (point.y * focalScale) / point.z;
  const ndcDepth =
    farPlane / (farPlane - nearPlane) - (nearPlane * farPlane) / ((farPlane - nearPlane) * point.z);
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (0.5 - ndcY * 0.5) * height,
    ndcDepth,
  };
}

export function buildCubeTriangles(
  width: number,
  height: number,
  angleX: number,
  angleY: number,
  camera = { x: 0, z: 0 },
) {
  const local: ZVec3[] = [
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: 1, y: 1, z: 1 },
    { x: -1, y: 1, z: 1 },
  ];
  const projected = local.map((point) => {
    const rotated = rotateCubePoint(point, angleX, angleY);
    return projectZVertex(
      { ...rotated, x: rotated.x - camera.x, z: rotated.z + 4.2 - camera.z },
      width,
      height,
    );
  });
  const faces: Array<{ name: string; indices: [number, number, number, number]; color: ZColor }> = [
    { name: "front", indices: [0, 3, 2, 1], color: { red: 239, green: 90, blue: 102 } },
    { name: "back", indices: [5, 6, 7, 4], color: { red: 92, green: 140, blue: 246 } },
    { name: "left", indices: [4, 7, 3, 0], color: { red: 169, green: 112, blue: 232 } },
    { name: "right", indices: [1, 2, 6, 5], color: { red: 74, green: 214, blue: 166 } },
    { name: "top", indices: [3, 7, 6, 2], color: { red: 246, green: 184, blue: 72 } },
    { name: "bottom", indices: [4, 0, 1, 5], color: { red: 55, green: 190, blue: 220 } },
  ];
  return faces.flatMap(
    ({ name, indices: [a, b, c, d], color }) =>
      [
        { a: projected[a], b: projected[b], c: projected[c], color, face: name },
        { a: projected[a], b: projected[c], c: projected[d], color, face: name },
      ] satisfies ZTriangle[],
  );
}

export function zFrameDifference(first: ZFrame, second: ZFrame, epsilon = 1e-9) {
  if (first.width !== second.width || first.height !== second.height)
    throw new RangeError("Frame shape mismatch");
  let colorPixels = 0;
  let depthPixels = 0;
  for (let index = 0; index < first.depths.length; index += 1) {
    const a = first.colors[index];
    const b = second.colors[index];
    if (a.red !== b.red || a.green !== b.green || a.blue !== b.blue) colorPixels += 1;
    if (
      !Number.isFinite(first.depths[index]) ||
      !Number.isFinite(second.depths[index]) ||
      Math.abs(first.depths[index] - second.depths[index]) > epsilon
    )
      depthPixels += 1;
  }
  return { colorPixels, depthPixels };
}
