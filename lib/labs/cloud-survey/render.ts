import { cameraBasis, cameraFrustum, type Camera } from "./camera.ts";
import { sub, dot, accepts, type Vec3 } from "./geometry.ts";
import type { CloudScene } from "./scene.ts";

export class CloudRaster {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint32Array;
  readonly depths: Float64Array;
  readonly owners: Uint32Array;
  constructor(width: number, height: number) {
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 2000000
    )
      throw Error("Raster vượt 2 triệu pixel");
    this.width = width;
    this.height = height;
    const count = width * height;
    this.pixels = new Uint32Array(count);
    this.depths = new Float64Array(count);
    this.owners = new Uint32Array(count);
  }
  plot(x: number, y: number, depth: number, id: number, color: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = y * this.width + x;
    if (depth < this.depths[index] || (depth === this.depths[index] && id < this.owners[index])) {
      this.depths[index] = depth;
      this.owners[index] = id;
      this.pixels[index] = color;
    }
  }
}
export function lens(camera: Camera, width: number, height: number, aspect = width / height) {
  return {
    basis: cameraBasis(camera),
    frustum: cameraFrustum(camera, aspect),
    width,
    height,
    scaleX: width / (2 * Math.tan(camera.fov / 2) * aspect),
    scaleY: height / (2 * Math.tan(camera.fov / 2)),
  };
}
export function project(p: Vec3, view: ReturnType<typeof lens>) {
  const delta = sub(p, view.basis.eye),
    depth = dot(delta, view.basis.forward);
  if (depth <= 0 || !accepts(view.frustum, p)) return null;
  return {
    x: view.width / 2 + (dot(delta, view.basis.right) * view.scaleX) / depth,
    y: view.height / 2 - (dot(delta, view.basis.up) * view.scaleY) / depth,
    depth,
  };
}
export function renderCloud(scene: CloudScene, raster: CloudRaster) {
  const started = performance.now();
  raster.pixels.fill(0x101923ff);
  raster.depths.fill(Infinity);
  raster.owners.fill(0xffffffff);
  const view = lens(scene.camera, raster.width, raster.height, scene.width / scene.height),
    selected = new Set(scene.selected.indices);
  let drawn = 0;
  for (const index of scene.visible.indices) {
    const point = scene.points[index],
      p = project(point.position, view);
    if (!p) continue;
    drawn++;
    let color = 0xf3c763ff;
    if (!selected.has(index)) {
      const height = Math.max(0, Math.min(1, point.position.y / 8)),
        cue = Math.max(0.3, Math.min(1, 1 - p.depth / 150));
      color =
        (((65 + 170 * height) * cue) << 24) |
        (((185 - 65 * height) * cue) << 16) |
        (((210 - 100 * height) * cue) << 8) |
        255;
    }
    const x = Math.max(0, Math.min(raster.width - 1, Math.trunc(p.x))),
      y = Math.max(0, Math.min(raster.height - 1, Math.trunc(p.y)));
    raster.plot(x, y, p.depth, point.id, color >>> 0);
    if (selected.has(index)) {
      raster.plot(x + 1, y, p.depth, point.id, color >>> 0);
      raster.plot(x, y + 1, p.depth, point.id, color >>> 0);
    }
  }
  scene.drawn = drawn;
  scene.renderMilliseconds = performance.now() - started;
  return raster;
}
