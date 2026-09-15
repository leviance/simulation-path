import assert from "node:assert/strict";
import test from "node:test";
import {
  barycentricAtPoint,
  compareProbe,
  cpuScreenToNdc,
  defaultTriangle,
  gpuWindowToNdc,
  identityTriangleTransform,
  makePipelineTrace,
  maximumColorDifference,
  ndcToCpuScreen,
  ndcToGpuWindow,
  quantizeColor8,
  sampleTriangle,
  transformPosition,
  triangleCentroid,
} from "../lib/labs/cpu-gpu-triangle.ts";

const viewport = { x: 640, y: 0, width: 640, height: 720 };

test("CPU and GLSL-style transforms use the same operation order", () => {
  const transform = {
    angleRadians: Math.PI / 2,
    scale: 0.5,
    translation: { x: 0.2, y: -0.1 },
  };
  const transformed = transformPosition({ x: 1, y: 0 }, transform);
  assert.ok(Math.abs(transformed.x - 0.2) < 1e-12);
  assert.ok(Math.abs(transformed.y - 0.4) < 1e-12);
});

test("CPU top-left and GPU bottom-left viewport mappings round-trip", () => {
  const samples = [
    { x: -1, y: -1 },
    { x: 0, y: 0 },
    { x: 0.73, y: -0.42 },
    { x: 1, y: 1 },
  ];
  for (const ndc of samples) {
    const cpu = cpuScreenToNdc(ndcToCpuScreen(ndc, 640, 720), 640, 720);
    const gpu = gpuWindowToNdc(ndcToGpuWindow(ndc, viewport), viewport);
    assert.ok(Math.hypot(cpu.x - ndc.x, cpu.y - ndc.y) < 1e-12);
    assert.ok(Math.hypot(gpu.x - ndc.x, gpu.y - ndc.y) < 1e-12);
  }
});

test("barycentric weights identify vertices, centroid and outside probes", () => {
  for (let index = 0; index < 3; index += 1) {
    const sample = barycentricAtPoint(defaultTriangle, defaultTriangle[index].position);
    assert.equal(sample.inside, true);
    assert.ok(Math.abs(sample.weights[index] - 1) < 1e-12);
  }
  const center = triangleCentroid(defaultTriangle, identityTriangleTransform);
  const centroid = barycentricAtPoint(defaultTriangle, center);
  assert.equal(centroid.inside, true);
  for (const weight of centroid.weights) assert.ok(Math.abs(weight - 1 / 3) < 1e-12);
  assert.equal(barycentricAtPoint(defaultTriangle, { x: 0.95, y: 0.95 }).inside, false);
});

test("smooth interpolation and solid mode stay explicit", () => {
  const center = triangleCentroid(defaultTriangle, identityTriangleTransform);
  const smooth = sampleTriangle(defaultTriangle, identityTriangleTransform, center, true);
  const solid = sampleTriangle(defaultTriangle, identityTriangleTransform, center, false);
  assert.equal(smooth.inside, true);
  assert.ok(maximumColorDifference(smooth.color, solid.color) > 0.05);
  assert.deepEqual(solid.color, { r: 0.38, g: 0.68, b: 0.94 });
});

test("RGBA8 quantization is bounded by half a color step", () => {
  const color = { r: 0.123, g: 0.456, b: 0.789 };
  const quantized = quantizeColor8(color);
  assert.ok(maximumColorDifference(color, quantized) <= 0.5 / 255 + 1e-12);
});

test("pipeline trace keeps input, NDC and both viewport conventions connected", () => {
  const trace = makePipelineTrace(defaultTriangle, identityTriangleTransform, 640, 720, viewport);
  assert.equal(trace.length, 3);
  assert.deepEqual(trace[0].input, defaultTriangle[0].position);
  assert.ok(Math.abs(trace[0].cpuScreen.y - 122.4) < 1e-12);
  assert.ok(Math.abs(trace[0].gpuWindow.y - 597.6) < 1e-12);
});

test("interior probe agreement separates coordinate error from color quantization", () => {
  const center = triangleCentroid(defaultTriangle, identityTriangleTransform);
  const agreement = compareProbe(
    defaultTriangle,
    identityTriangleTransform,
    center,
    640,
    720,
    viewport,
  );
  assert.ok(agreement.cpuRoundTripError < 1e-12);
  assert.ok(agreement.gpuRoundTripError < 1e-12);
  assert.ok(agreement.coordinateDifference < 1e-12);
  assert.ok(agreement.quantizationError <= 0.5 / 255 + 1e-12);
});
