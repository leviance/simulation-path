import {
  appendCube,
  buildMesh,
  makeChunk,
  type Preset,
  type Triangle,
  type Vec3,
} from "./model.ts";
export const imageWidth = 320,
  imageHeight = 240;
export type Camera = { yaw: number; pitch: number; zoom: number; scale: number; center: number };
export const defaultCamera: Camera = { yaw: 0.7, pitch: 0.5, zoom: 1, scale: 6, center: 8 };
export type ScreenPoint = { x: number; y: number; depth: number };
export function project(point: Vec3, camera: Camera): ScreenPoint {
  const [x, y, z] = point.map((v) => v - camera.center);
  const cx = Math.cos(camera.yaw) * x - Math.sin(camera.yaw) * z;
  const cz = Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  const cy = Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * cz;
  const depth = Math.sin(camera.pitch) * y + Math.cos(camera.pitch) * cz;
  const scale = camera.scale * camera.zoom;
  return { x: 160 + cx * scale, y: 120 - cy * scale, depth };
}
export function orbit(camera: Camera, dx: number, dy: number): Camera {
  let yaw = (camera.yaw + dx * 0.01) % (2 * Math.PI);
  if (yaw > Math.PI) yaw -= 2 * Math.PI;
  if (yaw < -Math.PI) yaw += 2 * Math.PI;
  return { ...camera, yaw, pitch: Math.max(-1.2, Math.min(1.2, camera.pitch + dy * 0.01)) };
}
export function zoom(camera: Camera, amount: number): Camera {
  return { ...camera, zoom: Math.max(0.5, Math.min(1.5, camera.zoom * Math.exp(amount * 0.1))) };
}
const edge = (a: ScreenPoint, b: ScreenPoint, x: number, y: number) =>
  (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
export function raster(mesh: Triangle[], camera: Camera, useDepth = true) {
  const pixels = new Uint8ClampedArray(imageWidth * imageHeight * 4);
  const depth = new Float64Array(imageWidth * imageHeight).fill(-Infinity);
  for (let i = 0; i < depth.length; i++) pixels.set([11, 16, 32, 255], i * 4);
  for (const triangle of mesh) {
    const [a, b, c] = triangle.points.map((p) => project(p, camera));
    const area = edge(a, b, c.x, c.y);
    if (Math.abs(area) < 1e-9) continue;
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))),
      maxX = Math.min(319, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))),
      maxY = Math.min(239, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const wa = edge(b, c, x + 0.5, y + 0.5) / area,
          wb = edge(c, a, x + 0.5, y + 0.5) / area,
          wc = 1 - wa - wb;
        if (wa < -1e-10 || wb < -1e-10 || wc < -1e-10) continue;
        const d = wa * a.depth + wb * b.depth + wc * c.depth,
          i = y * 320 + x;
        if (!useDepth || d > depth[i]) {
          depth[i] = d;
          pixels.set(triangle.color, i * 4);
        }
      }
  }
  return { pixels, depth };
}
export function scene(stage: number, preset: Preset, slice: number) {
  const chunk = makeChunk(preset);
  let mesh: Triangle[] = [];
  if (stage < 3) appendCube(mesh, [7, 7, 7], 3, stage);
  else mesh = buildMesh(chunk, slice, stage);
  return { chunk, mesh };
}
export function audit() {
  const full = makeChunk(1);
  if (
    buildMesh(full).length !== 49152 ||
    buildMesh(full, 0).length !== 3072 ||
    buildMesh(makeChunk(3)).length !== 0
  )
    throw new Error("voxel count audit failed");
  return "PASS: 4096 block, 49152 triangles; lớp đáy 3072 triangles; Air không sinh mặt.";
}
