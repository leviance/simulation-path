import { clamp, imageHeight, imageWidth, type Settings } from "@/lib/labs/mandelbulb-explorer/math";
import type { BulbSession } from "@/lib/labs/mandelbulb-explorer/session";
import type { RaySample } from "@/lib/labs/mandelbulb-explorer/trace";
import type { ViewMode } from "@/lib/labs/mandelbulb-explorer/view";
import type { CanvasSize } from "../lab-shared";
const cache = new WeakMap<
  CanvasRenderingContext2D,
  { canvas: HTMLCanvasElement; data: ImageData }
>();
export function viewport(width: number, height: number) {
  const available = Math.max(160, height - 94);
  const w = Math.min(width, (available * 16) / 9),
    h = (w * 9) / 16;
  return { x: (width - w) / 2, y: (available - h) / 2 + 26, width: w, height: h };
}
function heat(value: number) {
  const t = clamp(value, 0, 1);
  return [clamp(t * 2, 0, 1), clamp(1 - Math.abs(t - 0.5) * 2, 0, 1), clamp(2 - t * 2, 0, 1)];
}
function colors(session: BulbSession, x: number, y: number, view: ViewMode, s: Settings) {
  const pixel = session.pixelAt(x, y);
  if (!pixel) return [0.015, 0.025, 0.045];
  if (view === "steps") return heat(pixel.steps / pixel.samples / s.raySteps);
  if (view === "iterations")
    return heat(
      Math.log2(pixel.iterations / pixel.samples + 1) /
        Math.log2((s.raySteps + 19) * s.iterations + 1),
    );
  if (view === "states") {
    if (pixel.state & 16) return [1, 0.05, 0.4];
    if (pixel.state & 8) return [1, 0.6, 0.1];
    if (pixel.state & 4) return [0.65, 0.2, 0.8];
    if (pixel.state & 1) return [0.2, 0.85, 0.7];
    return [0.06, 0.12, 0.22];
  }
  if (view === "normals")
    return [(pixel.normal.x + 1) * 0.5, (pixel.normal.y + 1) * 0.5, (pixel.normal.z + 1) * 0.5];
  const c = session.colorAt(x, y);
  return [c.x, c.y, c.z].map(
    (value) => (Math.max(0, value) / (1 + Math.max(0, value))) ** (1 / 2.2),
  );
}
export function paintBulb(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  session: BulbSession,
  view: ViewMode,
  probe: { x: number; y: number },
  ray: RaySample | null,
) {
  const { width, height, dpr } = size;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#080e1a";
  context.fillRect(0, 0, width, height);
  let buffer = cache.get(context);
  if (!buffer) {
    const canvas = document.createElement("canvas");
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    buffer = { canvas, data: new ImageData(imageWidth, imageHeight) };
    cache.set(context, buffer);
  }
  const settings = session.active?.settings;
  if (settings) {
    for (let y = 0; y < imageHeight; y++)
      for (let x = 0; x < imageWidth; x++) {
        const c = colors(session, (x + 0.5) / imageWidth, (y + 0.5) / imageHeight, view, settings),
          offset = (y * imageWidth + x) * 4;
        for (let channel = 0; channel < 3; channel++)
          buffer.data.data[offset + channel] = Math.round(clamp(c[channel], 0, 1) * 255);
        buffer.data.data[offset + 3] = 255;
      }
    buffer.canvas.getContext("2d")?.putImageData(buffer.data, 0, 0);
    const rect = viewport(width, height);
    context.imageSmoothingEnabled = false;
    context.drawImage(buffer.canvas, rect.x, rect.y, rect.width, rect.height);
    context.strokeStyle = "#d9fcff";
    context.lineWidth = 1.3;
    context.strokeRect(rect.x + probe.x * rect.width - 4, rect.y + probe.y * rect.height - 4, 8, 8);
  }
  context.font = "12px system-ui";
  context.fillStyle = "#a8d9ed";
  context.fillText(
    "CANVAS CPU · preview 32×18 → 96×54 · không phải renderer GPU",
    12,
    18,
    Math.max(200, width - 24),
  );
  const chartY = height - 60;
  context.fillStyle = "#0f1c2b";
  context.fillRect(8, chartY - 12, width - 16, 62);
  context.fillStyle = "#c1dde6";
  if (settings?.slice) {
    context.fillText(
      "Mặt cắt c=(x, sliceY, z). Kéo để chọn c và đọc quỹ đạo ở dưới.",
      18,
      chartY + 8,
      width - 36,
    );
    context.fillText(
      "Đây là lát cắt của một field 3D, không phải ảnh Mandelbrot.",
      18,
      chartY + 30,
      width - 36,
    );
  } else if (ray?.path.length) {
    context.fillText(
      "Một ray: vị trí từng bước dọc t (vạch sát nhau = bước ngắn)",
      18,
      chartY + 4,
      width - 36,
    );
    const first = ray.path[0].t,
      last = ray.path[ray.path.length - 1].t,
      range = Math.max(0.01, last - first);
    context.strokeStyle = "#3ad6d0";
    for (const point of ray.path) {
      const x = 20 + ((point.t - first) / range) * (width - 40);
      context.beginPath();
      context.moveTo(x, chartY + 14);
      context.lineTo(x, chartY + 34);
      context.stroke();
    }
    context.fillStyle = "#bfd9e8";
    context.fillText("t=" + first.toFixed(3), 18, chartY + 48);
    context.fillText(last.toFixed(3), Math.max(90, width - 72), chartY + 48);
  } else
    context.fillText(
      "Chọn một ray trong viewport. Miss ngoài bounding sphere có thể cần 0 field call.",
      18,
      chartY + 18,
      width - 36,
    );
}
