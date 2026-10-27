import type { FountainScene } from "@/lib/labs/fountain/scene";
import { createFountainFrame, type FountainFrame } from "@/lib/labs/fountain/render-geometry";
import { renderFountainFrame } from "@/lib/labs/fountain/render";

export interface DrawStats {
  sampled: number;
  rendered: number;
  renderMs: number;
}
interface CanvasRaster {
  frame: FountainFrame;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
}
const rasters = new WeakMap<CanvasRenderingContext2D, CanvasRaster>();

export function drawFountain(
  context: CanvasRenderingContext2D,
  scene: FountainScene,
  width: number,
  height: number,
  debug: boolean,
): DrawStats {
  const started = performance.now(),
    pixelWidth = Math.max(1, Math.round(width)),
    pixelHeight = Math.max(1, Math.round(height));
  let raster = rasters.get(context);
  if (!raster || raster.frame.width !== pixelWidth || raster.frame.height !== pixelHeight) {
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const offscreen = canvas.getContext("2d");
    if (!offscreen) throw Error("Canvas 2D is unavailable");
    raster = {
      frame: createFountainFrame(pixelWidth, pixelHeight),
      canvas,
      context: offscreen,
      image: offscreen.createImageData(pixelWidth, pixelHeight),
    };
    rasters.set(context, raster);
  }
  const stats = renderFountainFrame(raster.frame, scene, debug);
  raster.image.data.set(new Uint8ClampedArray(raster.frame.pixels.buffer));
  raster.context.putImageData(raster.image, 0, 0);
  // The caller's DPR transform applies to this draw, including the whole CPU raster.
  context.drawImage(raster.canvas, 0, 0, width, height);
  return { ...stats, renderMs: performance.now() - started };
}
