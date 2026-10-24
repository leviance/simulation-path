import {
  makeTankCamera,
  tankToCamera,
  projectTankCamera,
  tankSphereDepth,
  tankSphereScreenBounds,
} from "@/lib/labs/collision-camera";
import {
  tankUnit3,
  tankDot3,
  tankMul3,
  tankSub3,
  tankAdd3,
  type TankSphere,
  type TankVec3,
} from "@/lib/labs/collision-spheres";
import type { TankScene } from "@/lib/labs/collision-scene";

export interface TankRaster {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
  depth: Float64Array;
}
export function createTankRaster(): TankRaster | null {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 820;
  const context = canvas.getContext("2d");
  if (!context) return null;
  return {
    canvas,
    context,
    image: context.createImageData(1100, 820),
    depth: new Float64Array(1100 * 820),
  };
}
export function tankColor(color: string): [number, number, number] {
  const value = /^#[0-9a-f]{6}$/i.test(color) ? Number.parseInt(color.slice(1), 16) : 0x61afef;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
export function rasterTankSphere(
  raster: TankRaster,
  body: TankSphere,
  camera: ReturnType<typeof makeTankCamera>,
) {
  const center = tankToCamera(body.position, camera),
    bounds = tankSphereScreenBounds(center, body.radius);
  if (!bounds) return;
  const light = tankUnit3({ x: -0.4, y: 0.6, z: -0.7 }),
    rgb = tankColor(body.color),
    bytes = raster.image.data;
  for (let y = bounds.top; y <= bounds.bottom; y++)
    for (let x = bounds.left; x <= bounds.right; x++) {
      const rx = (x + 0.5 - 550) / 620,
        ry = (370 - y - 0.5) / 620,
        z = tankSphereDepth(rx, ry, center, body.radius),
        index = y * 1100 + x;
      if (z < raster.depth[index]) {
        const n = tankMul3(tankSub3({ x: rx * z, y: ry * z, z }, center), 1 / body.radius);
        const intensity = 0.25 + 0.75 * Math.max(0, tankDot3(n, light)),
          offset = index * 4;
        bytes[offset] = rgb[0] * intensity;
        bytes[offset + 1] = rgb[1] * intensity;
        bytes[offset + 2] = rgb[2] * intensity;
        bytes[offset + 3] = 255;
        raster.depth[index] = z;
      }
    }
}
export function rasterTankLine(
  raster: TankRaster,
  worldA: TankVec3,
  worldB: TankVec3,
  camera: ReturnType<typeof makeTankCamera>,
  color: string,
) {
  const a = tankToCamera(worldA, camera),
    b = tankToCamera(worldB, camera);
  if (a.z <= 0.2 || b.z <= 0.2) return;
  const pa = projectTankCamera(a),
    pb = projectTankCamera(b),
    span = Math.max(Math.abs(pb.x - pa.x), Math.abs(pb.y - pa.y));
  if (!Number.isFinite(span)) return;
  const steps = Math.max(1, Math.min(2200, Math.ceil(span))),
    rgb = tankColor(color),
    bytes = raster.image.data;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps,
      sx = pa.x + (pb.x - pa.x) * t,
      sy = pa.y + (pb.y - pa.y) * t;
    if (sx < 0 || sx > 1099 || sy < 85 || sy > 650) continue;
    const x = Math.round(sx),
      y = Math.round(sy),
      z = 1 / ((1 - t) / a.z + t / b.z),
      index = y * 1100 + x;
    if (z <= raster.depth[index] + 0.02) {
      const offset = index * 4;
      bytes[offset] = rgb[0];
      bytes[offset + 1] = rgb[1];
      bytes[offset + 2] = rgb[2];
      bytes[offset + 3] = 255;
    }
  }
}
export function renderTank3D(raster: TankRaster, s: TankScene) {
  const bytes = raster.image.data;
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = 11;
    bytes[i + 1] = 16;
    bytes[i + 2] = 32;
    bytes[i + 3] = 255;
  }
  raster.depth.fill(Infinity);
  const camera = makeTankCamera(s.camera);
  for (const b of s.spheres) rasterTankSphere(raster, b, camera);
  const corners: TankVec3[] = [
    { x: -8, y: -5, z: -6 },
    { x: 8, y: -5, z: -6 },
    { x: 8, y: 5, z: -6 },
    { x: -8, y: 5, z: -6 },
    { x: -8, y: -5, z: 6 },
    { x: 8, y: -5, z: 6 },
    { x: 8, y: 5, z: 6 },
    { x: -8, y: 5, z: 6 },
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  for (const [a, b] of edges) rasterTankLine(raster, corners[a], corners[b], camera, "#7187b4");
  for (let x = -6; x <= 6; x += 2)
    rasterTankLine(raster, { x, y: -5, z: -6 }, { x, y: -5, z: 6 }, camera, "#273d5f");
  for (let z = -4; z <= 4; z += 2)
    rasterTankLine(raster, { x: -8, y: -5, z }, { x: 8, y: -5, z }, camera, "#273d5f");
  if (s.debug)
    for (const c of s.sphereStats.debugContacts) {
      rasterTankLine(
        raster,
        c.point,
        tankAdd3(c.point, tankMul3(c.normal, 0.7)),
        camera,
        "#ffe26c",
      );
      if (c.impulse > 0)
        rasterTankLine(
          raster,
          c.point,
          tankAdd3(c.point, tankMul3(c.normal, Math.min(2, c.impulse * 0.2))),
          camera,
          "#ff7b72",
        );
    }
  raster.context.putImageData(raster.image, 0, 0);
}
