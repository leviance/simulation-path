export interface Vec2 {
  x: number;
  y: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface TriangleVertex {
  position: Vec2;
  color: Rgb;
}

export interface TriangleTransform {
  angleRadians: number;
  scale: number;
  translation: Vec2;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BarycentricSample {
  inside: boolean;
  weights: [number, number, number];
  color: Rgb;
}

export interface PipelineVertexTrace {
  input: Vec2;
  ndc: Vec2;
  cpuScreen: Vec2;
  gpuWindow: Vec2;
}

export interface ProbeAgreement {
  ndc: Vec2;
  cpuRoundTripError: number;
  gpuRoundTripError: number;
  coordinateDifference: number;
  expectedColor: Rgb;
  quantizedColor: Rgb;
  quantizationError: number;
}

export const defaultTriangle: readonly TriangleVertex[] = [
  { position: { x: 0, y: 0.66 }, color: { r: 0.97, g: 0.42, b: 0.35 } },
  { position: { x: -0.7, y: -0.58 }, color: { r: 0.35, g: 0.78, b: 0.48 } },
  { position: { x: 0.7, y: -0.58 }, color: { r: 0.38, g: 0.68, b: 0.94 } },
] as const;

export const identityTriangleTransform: TriangleTransform = {
  angleRadians: 0,
  scale: 1,
  translation: { x: 0, y: 0 },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function distance(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function edge(a: Vec2, b: Vec2, point: Vec2) {
  return (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
}

export function transformPosition(position: Vec2, transform: TriangleTransform): Vec2 {
  const cosine = Math.cos(transform.angleRadians);
  const sine = Math.sin(transform.angleRadians);
  const rotatedX = position.x * cosine - position.y * sine;
  const rotatedY = position.x * sine + position.y * cosine;
  return {
    x: rotatedX * transform.scale + transform.translation.x,
    y: rotatedY * transform.scale + transform.translation.y,
  };
}

export function transformTriangle(
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
): TriangleVertex[] {
  return triangle.map((vertex) => ({
    position: transformPosition(vertex.position, transform),
    color: { ...vertex.color },
  }));
}

export function ndcToCpuScreen(position: Vec2, width: number, height: number): Vec2 {
  return {
    x: (position.x * 0.5 + 0.5) * width,
    y: (1 - (position.y * 0.5 + 0.5)) * height,
  };
}

export function cpuScreenToNdc(position: Vec2, width: number, height: number): Vec2 {
  return {
    x: (position.x / width) * 2 - 1,
    y: 1 - (position.y / height) * 2,
  };
}

export function ndcToGpuWindow(position: Vec2, viewport: Viewport): Vec2 {
  return {
    x: viewport.x + (position.x * 0.5 + 0.5) * viewport.width,
    y: viewport.y + (position.y * 0.5 + 0.5) * viewport.height,
  };
}

export function gpuWindowToNdc(position: Vec2, viewport: Viewport): Vec2 {
  return {
    x: ((position.x - viewport.x) / viewport.width) * 2 - 1,
    y: ((position.y - viewport.y) / viewport.height) * 2 - 1,
  };
}

export function barycentricAtPoint(
  triangle: readonly TriangleVertex[],
  point: Vec2,
): BarycentricSample {
  if (triangle.length !== 3) {
    throw new Error("A triangle must contain exactly three vertices");
  }
  const [a, b, c] = triangle;
  const signedArea = edge(a.position, b.position, c.position);
  if (Math.abs(signedArea) <= 1e-12) {
    return {
      inside: false,
      weights: [0, 0, 0],
      color: { r: 0, g: 0, b: 0 },
    };
  }

  const weightA = edge(b.position, c.position, point) / signedArea;
  const weightB = edge(c.position, a.position, point) / signedArea;
  const weightC = edge(a.position, b.position, point) / signedArea;
  const epsilon = 1e-7;
  const inside = weightA >= -epsilon && weightB >= -epsilon && weightC >= -epsilon;
  const color = {
    r: a.color.r * weightA + b.color.r * weightB + c.color.r * weightC,
    g: a.color.g * weightA + b.color.g * weightB + c.color.g * weightC,
    b: a.color.b * weightA + b.color.b * weightB + c.color.b * weightC,
  };
  return { inside, weights: [weightA, weightB, weightC], color };
}

export function sampleTriangle(
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
  pointNdc: Vec2,
  smoothColor: boolean,
): BarycentricSample {
  const transformed = transformTriangle(triangle, transform);
  const sample = barycentricAtPoint(transformed, pointNdc);
  if (!sample.inside || smoothColor) return sample;
  return { ...sample, color: { r: 0.38, g: 0.68, b: 0.94 } };
}

export function quantizeColor8(color: Rgb): Rgb {
  return {
    r: Math.round(clamp(color.r, 0, 1) * 255) / 255,
    g: Math.round(clamp(color.g, 0, 1) * 255) / 255,
    b: Math.round(clamp(color.b, 0, 1) * 255) / 255,
  };
}

export function maximumColorDifference(a: Rgb, b: Rgb) {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));
}

export function makePipelineTrace(
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
  cpuWidth: number,
  cpuHeight: number,
  gpuViewport: Viewport,
): PipelineVertexTrace[] {
  return triangle.map((vertex) => {
    const ndc = transformPosition(vertex.position, transform);
    return {
      input: { ...vertex.position },
      ndc,
      cpuScreen: ndcToCpuScreen(ndc, cpuWidth, cpuHeight),
      gpuWindow: ndcToGpuWindow(ndc, gpuViewport),
    };
  });
}

export function compareProbe(
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
  pointNdc: Vec2,
  cpuWidth: number,
  cpuHeight: number,
  gpuViewport: Viewport,
): ProbeAgreement {
  const cpuScreen = ndcToCpuScreen(pointNdc, cpuWidth, cpuHeight);
  const gpuWindow = ndcToGpuWindow(pointNdc, gpuViewport);
  const cpuRecovered = cpuScreenToNdc(cpuScreen, cpuWidth, cpuHeight);
  const gpuRecovered = gpuWindowToNdc(gpuWindow, gpuViewport);
  const expectedColor = sampleTriangle(triangle, transform, pointNdc, true).color;
  const quantizedColor = quantizeColor8(expectedColor);
  return {
    ndc: { ...pointNdc },
    cpuRoundTripError: distance(pointNdc, cpuRecovered),
    gpuRoundTripError: distance(pointNdc, gpuRecovered),
    coordinateDifference: distance(cpuRecovered, gpuRecovered),
    expectedColor,
    quantizedColor,
    quantizationError: maximumColorDifference(expectedColor, quantizedColor),
  };
}

export function triangleCentroid(
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
): Vec2 {
  const transformed = transformTriangle(triangle, transform);
  return {
    x: (transformed[0].position.x + transformed[1].position.x + transformed[2].position.x) / 3,
    y: (transformed[0].position.y + transformed[1].position.y + transformed[2].position.y) / 3,
  };
}
