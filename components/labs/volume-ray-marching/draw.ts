import type { Point, Result } from "@/lib/labs/volume-ray-marching";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function drawFog(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  image: Uint8ClampedArray,
  rows: number,
  u: number,
  v: number,
  trace: Result,
  shown: number,
  stage: number,
  interval: { entry: number; exit: number } | null,
) {
  setupCanvas(ctx, size);
  const scale = Math.min((size.width * 0.55 - 20) / 48, (size.height - 50) / 36),
    width = 48 * scale,
    height = 36 * scale;
  const offscreen = document.createElement("canvas");
  offscreen.width = 48;
  offscreen.height = 36;
  offscreen
    .getContext("2d")
    ?.putImageData(new ImageData(new Uint8ClampedArray(image), 48, 36), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 12, 30, width, height);
  ctx.strokeStyle = "#64e1b4";
  ctx.strokeRect(12, 30, width, height);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#d4dfef";
  ctx.fillText(`CPU preview: ${rows}/36 hàng`, 12, 20);
  ctx.beginPath();
  ctx.moveTo(12 + u * width - 5, 30 + v * height);
  ctx.lineTo(12 + u * width + 5, 30 + v * height);
  ctx.moveTo(12 + u * width, 30 + v * height - 5);
  ctx.lineTo(12 + u * width, 30 + v * height + 5);
  ctx.stroke();
  const left = size.width * 0.59,
    right = size.width - 16,
    top = 55,
    bottom = size.height - 40;
  ctx.fillStyle = "#d4dfef";
  ctx.fillText(
    stage >= 6 ? "Density (xanh) / T (cam) dọc tia" : "Marching được mở từ Bài 06",
    left,
    25,
  );
  if (stage < 6 || trace.profile.length === 0 || !interval) return;
  ctx.strokeStyle = "#66718a";
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.fillText("t: " + interval.entry.toFixed(2), left, bottom + 22);
  ctx.fillText(interval.exit.toFixed(2), right - 36, bottom + 22);
  const draw = (value: (i: number) => number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < Math.min(shown, trace.profile.length); i++) {
      const x =
          left +
          ((trace.profile[i].t - interval.entry) / (interval.exit - interval.entry)) *
            (right - left),
        y = bottom - value(i) * (bottom - top);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (shown > 0) {
      const i = Math.min(shown, trace.profile.length) - 1;
      const x =
        left +
        ((trace.profile[i].t - interval.entry) / (interval.exit - interval.entry)) * (right - left);
      ctx.beginPath();
      ctx.arc(x, bottom - value(i) * (bottom - top), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  };
  draw((i) => trace.profile[i].density, "#64e1b4");
  draw((i) => trace.profile[i].transmittance, "#e5b65c");
}
export function encode(color: Point) {
  return color.map((x) => Math.round(Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2) * 255));
}
