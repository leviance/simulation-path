import {
  axesFor,
  fitSlice,
  lower,
  panelRect,
  type Grid,
  type Point,
} from "@/lib/labs/volume-slicer";
import { renderCutaway } from "@/lib/labs/volume-slicer/cutaway-render";
import { projectSlicePoint, type SliceCamera } from "@/lib/labs/volume-slicer/camera";
import type { Surface } from "@/lib/labs/volume-slicer/geometry";
import type { Volume } from "@/lib/labs/volume-slicer/model";
import { setupCanvas, type CanvasSize } from "../lab-shared";
import { sceneRect, slicePanelRect } from "./viewport";

const imageCache = new WeakMap<Uint8ClampedArray, HTMLCanvasElement>();
interface SceneCache {
  images: Uint8ClampedArray[];
  mesh: Surface;
  key: string;
  surface: HTMLCanvasElement;
}
const sceneCache = new WeakMap<CanvasRenderingContext2D, SceneCache>();
export function drawSlices(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  grid: Grid,
  cursor: Point,
  activeView: number,
  stage: number,
  images: Uint8ClampedArray[],
  raw: Float64Array[],
  volume: Volume | null,
  mesh: Surface | null,
  camera: SliceCamera,
  cutaway: boolean,
  interactive: boolean,
  dark: boolean,
) {
  setupCanvas(ctx, size);
  const canvas = ctx.canvas,
    style = getComputedStyle(canvas.closest("[data-volume53-ready]")!);
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const surface = color("--surface", "#f5f8fa"),
    panelColor = color("--panel", "#e9eff3");
  const ink = color("--ink", "#233e52"),
    muted = color("--muted", "#527083");
  ctx.fillStyle = surface;
  ctx.fillRect(0, 0, size.width, size.height);
  const three = stage >= 3;
  if (three && volume && mesh) {
    const area = sceneRect(size.width, size.height);
    const w = Math.max(220, Math.round(Math.min(interactive ? 430 : 650, area.width)));
    const h = Math.max(1, Math.min(700, Math.round((area.height * w) / area.width)));
    const key = [...cursor, camera.yaw, camera.pitch, camera.distance, cutaway, dark, w, h].join(
      ",",
    );
    let cached = sceneCache.get(ctx);
    if (!cached || cached.mesh !== mesh || cached.images !== images || cached.key !== key) {
      const pixels = renderCutaway(volume, mesh, cursor, camera, cutaway, w, h, raw, images, dark);
      const buffer = cached?.surface ?? document.createElement("canvas");
      buffer.width = w;
      buffer.height = h;
      buffer.getContext("2d")!.putImageData(new ImageData(pixels, w, h), 0, 0);
      cached = { images, mesh, key, surface: buffer };
      sceneCache.set(ctx, cached);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(cached.surface, area.x, area.y, area.width, area.height);
    ctx.font = "500 13px sans-serif";
    ctx.fillStyle = ink;
    ctx.fillText(cutaway ? "Khối đã cắt mở" : "Khối nguyên vẹn", 14, 25);
    if (cutaway) {
      const p = projectSlicePoint(camera, cursor, area);
      if (p) {
        ctx.strokeStyle = color("--probe", "#fff");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    if (size.width >= 680) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = muted;
      ctx.fillText("Kéo: xoay góc nhìn · cuộn: zoom · Ctrl+mũi tên: xoay", 14, size.height - 10);
    }
  }
  const views = three ? [0, 1, 2] : [0];
  for (const [index, view] of views.entries()) {
    const panel = three
      ? slicePanelRect(view, size.width, size.height)
      : panelRect(view, size.width, size.height, false);
    const rect = fitSlice(grid, view, panel),
      image = images[index];
    let buffer = imageCache.get(image);
    if (!buffer) {
      const side = Math.sqrt(image.length / 4);
      buffer = document.createElement("canvas");
      buffer.width = side;
      buffer.height = side;
      buffer
        .getContext("2d")!
        .putImageData(new ImageData(new Uint8ClampedArray(image), side, side), 0, 0);
      imageCache.set(image, buffer);
    }
    ctx.fillStyle = panelColor;
    ctx.fillRect(panel.x - 4, panel.y - 32, panel.width + 8, panel.height + 44);
    if (view === activeView) {
      ctx.strokeStyle = color("--crosshair", "#62cbd1");
      ctx.lineWidth = 2;
      ctx.strokeRect(panel.x - 4, panel.y - 32, panel.width + 8, panel.height + 44);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, rect.x, rect.y, rect.width, rect.height);
    const axes = axesFor(view);
    ctx.fillStyle = ink;
    ctx.font = "12px sans-serif";
    ctx.fillText(
      ["XY", "XZ", "YZ"][view] + " · " + "xyz"[axes.cut] + "=" + cursor[axes.cut].toFixed(2),
      panel.x + 1,
      panel.y - 12,
    );
    if (stage >= 6) {
      const u =
        (cursor[axes.horizontal] - lower(grid, axes.horizontal)) /
        (grid.count[axes.horizontal] * grid.spacing[axes.horizontal]);
      const v =
        1 -
        (cursor[axes.vertical] - lower(grid, axes.vertical)) /
          (grid.count[axes.vertical] * grid.spacing[axes.vertical]);
      ctx.strokeStyle = color("--crosshair", "#62cbd1");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rect.x + u * rect.width, rect.y);
      ctx.lineTo(rect.x + u * rect.width, rect.y + rect.height);
      ctx.moveTo(rect.x, rect.y + v * rect.height);
      ctx.lineTo(rect.x + rect.width, rect.y + v * rect.height);
      ctx.stroke();
    }
  }
}
