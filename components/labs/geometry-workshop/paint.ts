import { makeProjector } from "@/lib/labs/geometry-workshop/camera";
import type { Mesh } from "@/lib/labs/geometry-workshop/mesh";
import {
  createRasterBuffer,
  rasterize,
  type RasterBuffer,
} from "@/lib/labs/geometry-workshop/raster";
import { rasterOptions, type GeometryMode, type View } from "@/lib/labs/geometry-workshop/view";
import { setupCanvas, type CanvasSize } from "../lab-shared";
import { drawAnnotations, strokePath, type Projector } from "./annotations";

export interface RasterLayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  target: RasterBuffer;
  image: ImageData;
}

function rasterLayer(size: CanvasSize, layer: RasterLayer | null): RasterLayer | null {
  const scale = Math.min(size.dpr, 640 / size.width, 420 / size.height);
  const width = Math.max(1, Math.floor(size.width * scale));
  const height = Math.max(1, Math.floor(size.height * scale));
  if (layer?.target.width === width && layer.target.height === height) return layer;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const target = createRasterBuffer(width, height);
  return { canvas, context, target, image: new ImageData(target.pixels, width, height) };
}

function drawGrid(ctx: CanvasRenderingContext2D, project: Projector, minimumY: number) {
  const y = minimumY - 0.28;
  for (let index = -6; index <= 6; ++index) {
    const xLine = [project({ x: index, y, z: -6 }), project({ x: index, y, z: 6 })];
    const zLine = [project({ x: -6, y, z: index }), project({ x: 6, y, z: index })];
    strokePath(ctx, xLine, index === 0 ? "#5b87ab85" : "#47739831", 1);
    strokePath(ctx, zLine, index === 0 ? "#6cb7a579" : "#47739831", 1);
  }

  const center = project({ x: 0, y, z: 0 });
  const edge = project({ x: 1.55, y, z: 1.55 });
  const radius = Math.max(10, Math.hypot(edge.x - center.x, edge.y - center.y));
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.scale(1, 0.36);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  shadow.addColorStop(0, "#040811b5");
  shadow.addColorStop(1, "#04081100");
  ctx.fillStyle = shadow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

export function paintGeometry(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  mesh: Mesh,
  mode: GeometryMode,
  view: View,
  oldLayer: RasterLayer | null,
) {
  const layer = rasterLayer(size, oldLayer);
  setupCanvas(ctx, size);
  const background = ctx.createLinearGradient(0, 0, 0, size.height);
  background.addColorStop(0, "#0b1324");
  background.addColorStop(0.52, "#101d2e");
  background.addColorStop(1, "#1a2d40");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size.width, size.height);
  const project = makeProjector(view.camera, size.width, size.height);
  drawGrid(ctx, project, mesh.minimumY);
  if (layer) {
    rasterize(layer.target, mesh, view.camera, rasterOptions(mesh, view, mode));
    layer.context.putImageData(layer.image, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(layer.canvas, 0, 0, size.width, size.height);
    drawAnnotations(ctx, mesh, mode, view, project);
  }
  return layer;
}
