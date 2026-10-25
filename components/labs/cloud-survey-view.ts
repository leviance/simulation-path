import {
  add,
  scale,
  sub,
  distance,
  around,
  type Box,
  type Vec3,
} from "@/lib/labs/cloud-survey/geometry";
import { lens, project, CloudRaster, renderCloud } from "@/lib/labs/cloud-survey/render";
import type { CloudScene } from "@/lib/labs/cloud-survey/scene";

function line(
  context: CanvasRenderingContext2D,
  view: ReturnType<typeof lens>,
  start: Vec3,
  end: Vec3,
) {
  let a = start,
    b = end;
  for (const plane of view.frustum.planes) {
    const first = distance(plane, a),
      second = distance(plane, b);
    if (first < 0 && second < 0) return;
    if (first < 0 || second < 0) {
      const hit = add(a, scale(sub(b, a), first / (first - second)));
      if (first < 0) a = hit;
      else b = hit;
    }
  }
  const p = project(a, view),
    q = project(b, view);
  if (!p || !q) return;
  context.moveTo(p.x, p.y);
  context.lineTo(q.x, q.y);
}
function box(context: CanvasRenderingContext2D, view: ReturnType<typeof lens>, bounds: Box) {
  const corners: Vec3[] = [];
  for (let slot = 0; slot < 8; slot++)
    corners.push({
      x: slot & 1 ? bounds.maximum.x : bounds.minimum.x,
      y: slot & 2 ? bounds.maximum.y : bounds.minimum.y,
      z: slot & 4 ? bounds.maximum.z : bounds.minimum.z,
    });
  for (let slot = 0; slot < 8; slot++)
    for (const axis of [1, 2, 4])
      if (!(slot & axis)) line(context, view, corners[slot], corners[slot | axis]);
}
export interface CloudViewCache {
  raster: CloudRaster;
  bitmap: HTMLCanvasElement;
  image: ImageData;
}
export function drawCloud(
  context: CanvasRenderingContext2D,
  scene: CloudScene,
  size: { width: number; height: number; dpr: number },
  existing: CloudViewCache | null,
) {
  // Giới hạn độ phân giải raster, KHÔNG giảm số điểm được query hoặc project.
  const ratio = Math.min(size.dpr, Math.sqrt(2000000 / (size.width * size.height)));
  const width = Math.max(1, Math.floor(size.width * ratio)),
    height = Math.max(1, Math.floor(size.height * ratio));
  let cache = existing;
  if (!cache || cache.raster.width !== width || cache.raster.height !== height) {
    const bitmap = document.createElement("canvas");
    bitmap.width = width;
    bitmap.height = height;
    const bitmapContext = bitmap.getContext("2d");
    if (!bitmapContext) throw Error("Canvas 2D không khả dụng");
    cache = {
      raster: new CloudRaster(width, height),
      bitmap,
      image: bitmapContext.createImageData(width, height),
    };
  }
  renderCloud(scene, cache.raster);
  for (let i = 0; i < cache.raster.pixels.length; i++) {
    const color = cache.raster.pixels[i],
      offset = i * 4;
    cache.image.data[offset] = color >>> 24;
    cache.image.data[offset + 1] = (color >>> 16) & 255;
    cache.image.data[offset + 2] = (color >>> 8) & 255;
    cache.image.data[offset + 3] = 255;
  }
  cache.bitmap.getContext("2d")!.putImageData(cache.image, 0, 0);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(cache.bitmap, 0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  const view = lens(scene.camera, size.width, size.height);
  if (scene.selectionEnabled) {
    context.beginPath();
    context.strokeStyle = "#f3c763";
    context.lineWidth = 1.5;
    if (scene.region.shape === "box")
      box(context, view, around(scene.region.center, scene.region.half));
    else
      for (let axis = 0; axis < 3; axis++)
        for (let step = 0; step < 64; step++) {
          const circle = (i: number) => {
            const a = (i * Math.PI * 2) / 64;
            let p = { x: Math.cos(a), y: Math.sin(a), z: 0 };
            if (axis === 1) p = { x: p.x, y: 0, z: p.y };
            if (axis === 2) p = { x: 0, y: p.x, z: p.y };
            return add(scene.region.center, scale(p, scene.region.radius));
          };
          line(context, view, circle(step), circle(step + 1));
        }
    context.stroke();
  }
  if (scene.debug) {
    context.strokeStyle = "#46706d";
    context.lineWidth = 0.7;
    context.beginPath();
    for (const index of scene.visible.visited.slice(0, 2048))
      box(context, view, scene.tree.nodes[index].bounds);
    context.stroke();
  }
  return cache;
}
