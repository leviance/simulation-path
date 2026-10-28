import type { ViewerFrame } from "@/lib/labs/dual-renderer-cube";
import { setupCanvas, type CanvasSize } from "../lab-shared";

const buffers = new WeakMap<CanvasRenderingContext2D, HTMLCanvasElement>();
export function drawViewer(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  frame: ViewerFrame,
  depth: boolean,
) {
  setupCanvas(context, size);
  let buffer = buffers.get(context);
  if (!buffer) {
    buffer = document.createElement("canvas");
    buffers.set(context, buffer);
  }
  if (buffer.width !== frame.width || buffer.height !== frame.height) {
    buffer.width = frame.width;
    buffer.height = frame.height;
  }
  const bitmap = buffer.getContext("2d");
  if (!bitmap) return;
  const pixels = bitmap.createImageData(frame.width, frame.height);
  pixels.data.set(frame.rgba);
  if (depth)
    for (let i = 0; i < frame.depth.length; i++) {
      const t = Math.max(0, Math.min(1, (1 - frame.depth[i]) * 8));
      pixels.data.set(
        frame.depth[i] >= 1
          ? [13, 21, 38, 255]
          : [Math.round(t * 255), Math.round(t * 180 + 30), Math.round((1 - t) * 210), 255],
        i * 4,
      );
    }
  bitmap.putImageData(pixels, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, 0, 0, size.width, size.height);
}
