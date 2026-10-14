import {
  at,
  rotateY,
  boxInterval,
  objectBeam,
  type Beam,
  type Material,
  type Settings,
  type Sample,
} from "@/lib/labs/xray-detector";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function imageRect(size: CanvasSize) {
  const width = Math.max(100, Math.min(size.width * 0.46 - 20, ((size.height - 65) * 4) / 3));
  return { x: 12, y: 40, width, height: (width * 3) / 4 };
}
export function pickPixel(x: number, y: number, size: CanvasSize) {
  const r = imageRect(size);
  if (x < r.x || x >= r.x + r.width || y < r.y || y >= r.y + r.height) return null;
  return { x: Math.floor(((x - r.x) / r.width) * 80), y: Math.floor(((y - r.y) / r.height) * 60) };
}
export function drawDetector(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  image: Uint8ClampedArray,
  rows: number,
  beam: Beam,
  scene: Material[],
  settings: Settings,
  pixel: { x: number; y: number },
  stage: number,
  samples: Sample[],
) {
  setupCanvas(ctx, size);
  const rect = imageRect(size),
    off = document.createElement("canvas");
  off.width = 40;
  off.height = 30;
  off.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(image), 40, 30), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, rect.x, rect.y, rect.width, rect.height);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("Detector CPU: " + rows + "/30 hàng", 12, 20);
  if (stage < 2) return;
  ctx.strokeStyle = "#64e1b4";
  const px = rect.x + ((pixel.x + 0.5) / 80) * rect.width,
    py = rect.y + ((pixel.y + 0.5) / 60) * rect.height;
  ctx.beginPath();
  ctx.moveTo(px - 5, py);
  ctx.lineTo(px + 5, py);
  ctx.moveTo(px, py - 5);
  ctx.lineTo(px, py + 5);
  ctx.stroke();
  const left = size.width * 0.5,
    right = size.width - 15,
    middle = size.height * 0.52,
    scale = (size.height - 85) / 6.5;
  const map = (p: [number, number, number]) => ({
    x: left + ((p[2] + 6) / 12) * (right - left),
    y: middle - p[0] * scale,
  });
  const line = (
    a: [number, number, number],
    b: [number, number, number],
    color: string,
    width = 1,
  ) => {
    const p = map(a),
      q = map(b);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  };
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("XZ: hình chiếu, không phải lát cắt", left, 20);
  line([0, 0, -6], at(beam, beam.maximum), "#64e1b4");
  line([-3, 0, 6], [3, 0, 6], "#92a1c8", 2);
  if (stage >= 3) {
    for (const m of scene) {
      const corners: [number, number, number][] = [
        [m.minimum[0], 0, m.minimum[2]],
        [m.maximum[0], 0, m.minimum[2]],
        [m.maximum[0], 0, m.maximum[2]],
        [m.minimum[0], 0, m.maximum[2]],
      ];
      for (let i = 0; i < 4; i++)
        line(
          rotateY(corners[i], settings.angle),
          rotateY(corners[(i + 1) % 4], settings.angle),
          "#e5b65c",
        );
      const interval = boxInterval(objectBeam(beam, settings.angle), m.minimum, m.maximum);
      if (interval) line(at(beam, interval.entry), at(beam, interval.exit), "#ee8c73", 4);
    }
  }
  ctx.fillStyle = "#92a1c8";
  for (const sample of samples) {
    const p = map(at(beam, sample.t));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#d4dfef";
  ctx.fillText("source", left, middle + 16);
  ctx.fillText("detector", right - 50, size.height - 12);
  ctx.lineWidth = 1;
}
