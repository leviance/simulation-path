import {
  add,
  subtract,
  multiply,
  at,
  inRange,
  sphereInterval,
  boxInterval,
  type Camera,
  type Scene,
  type Ray,
  type Hit,
} from "@/lib/labs/ray-intersections";
import { setupCanvas, type CanvasSize } from "../lab-shared";
import { drawScene } from "./mesh";
import { Raster, type Color } from "./raster";

interface DrawingCache {
  raster: Raster;
  aim: Raster;
  buffer: HTMLCanvasElement;
  bufferContext: CanvasRenderingContext2D;
  image: ImageData;
  aimBuffer: HTMLCanvasElement;
  aimContext: CanvasRenderingContext2D;
  aimImage: ImageData;
}
const cache = new WeakMap<CanvasRenderingContext2D, DrawingCache>();

export function aimRect(size: CanvasSize) {
  const width = Math.min(240, size.width * 0.36);
  const height = (width * 190) / 280;
  return { x: 12, y: size.height - height - 12, width, height };
}

function populate(
  raster: Raster,
  geometry: Scene,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  stage: number,
  selected: number,
  debug: boolean,
) {
  drawScene(raster, geometry, selected, debug);
  if (stage < 2) return;
  raster.line(at(ray, ray.tMin), at(ray, ray.tMax), [77, 113, 139], debug);
  raster.line(at(ray, ray.tMin), at(ray, best?.t ?? ray.tMax), [98, 245, 206], debug, 1);
  raster.marker(ray.origin, [245, 242, 214], 5);
  for (const hit of hits) {
    if (!hit) continue;
    const color: Color =
      hit.objectId === (best?.objectId ?? selected) ? [139, 255, 162] : [164, 182, 202];
    const end = add(hit.point, multiply(hit.normal, 0.65));
    raster.marker(hit.point, color, 4);
    raster.line(hit.point, end, color, true, 1);
    const base = subtract(end, multiply(hit.normal, 0.14));
    raster.line(end, add(base, multiply(raster.basis.right, 0.08)), color, true);
    raster.line(end, subtract(base, multiply(raster.basis.right, 0.08)), color, true);
  }
  let interval = null;
  if (selected === 1 && stage >= 4) interval = sphereInterval(ray, geometry.sphere);
  if (selected === 2 && stage >= 5) interval = boxInterval(ray, geometry.box);
  if (interval && inRange(ray, interval.exit))
    raster.marker(at(ray, interval.exit), [241, 179, 82], 3);
}

export function drawPicking(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  observer: Camera,
  emitter: Camera,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  stage: number,
  u: number,
  v: number,
  geometry: Scene,
  selected: number,
  debug: boolean,
) {
  setupCanvas(ctx, size);
  // Bound CPU work separately from DPR. Vector labels/crosshair still use DPR.
  const width = Math.min(1000, Math.round(size.width * size.dpr));
  const height = Math.round((width * size.height) / size.width);
  let drawing = cache.get(ctx);
  if (!drawing || drawing.raster.width !== width || drawing.raster.height !== height) {
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    const aimBuffer = document.createElement("canvas");
    aimBuffer.width = 280;
    aimBuffer.height = 190;
    const bufferContext = buffer.getContext("2d"),
      aimContext = aimBuffer.getContext("2d");
    if (!bufferContext || !aimContext) return;
    drawing = {
      raster: new Raster(width, height, observer),
      aim: new Raster(280, 190, emitter),
      buffer,
      bufferContext,
      image: bufferContext.createImageData(width, height),
      aimBuffer,
      aimContext,
      aimImage: aimContext.createImageData(280, 190),
    };
    cache.set(ctx, drawing);
  }
  const { raster, buffer, bufferContext, image, aim, aimBuffer, aimContext, aimImage } = drawing;
  raster.begin(observer);
  populate(raster, geometry, ray, hits, best, stage, selected, debug);
  image.data.set(raster.pixels);
  bufferContext.putImageData(image, 0, 0);
  ctx.drawImage(buffer, 0, 0, size.width, size.height);
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("Góc nhìn quan sát — kéo chuột phải để xoay", 12, 22);
  if (debug) ctx.fillText("X/Y/Z: đỏ/lục/lam · tia khuất: nét đứt tối", 12, 42);
  if (stage < 2) return;
  const rect = aimRect(size);
  aim.begin(emitter);
  populate(aim, geometry, ray, hits, best, stage, selected, debug);
  aimImage.data.set(aim.pixels);
  aimContext.putImageData(aimImage, 0, 0);
  ctx.drawImage(aimBuffer, rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = "#69c9db";
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  const x = rect.x + u * rect.width,
    y = rect.y + v * rect.height;
  ctx.beginPath();
  ctx.moveTo(x - 7, y);
  ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7);
  ctx.lineTo(x, y + 7);
  ctx.stroke();
  ctx.fillText("Cửa sổ ngắm — kéo để đổi tia", rect.x, rect.y - 8);
}
