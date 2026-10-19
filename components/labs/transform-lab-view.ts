import {
  transformResults,
  transformSquare,
  transformWorldToScreen,
  type TransformScene,
} from "@/lib/labs/transform-scene";
import { transformPoint } from "@/lib/labs/transform";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 900, size.height / 800);
  return { scale, x: (size.width - 900 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function transformPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    view = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || view.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - view.x) / view.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - view.y) / view.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < 20 || x > 880 || y < 110 || y > 720))
  )
    return null;
  return { x, y };
}
export function drawTransformLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: TransformScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const view = layout(size),
    r = transformResults(scene),
    screen = transformWorldToScreen;
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  ctx.font = "17px ui-monospace";
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText("X sang phải · Y lên trên · 1 world = 50 pixel logic", 20, 36);
  ctx.fillText("Xám: gốc · Xanh lá: sau biến đổi · Đỏ: ex · Xanh lam: ey", 20, 64);
  ctx.save();
  ctx.beginPath();
  ctx.rect(20, 110, 860, 610);
  ctx.clip();
  const line = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    color: string,
    width = 1,
  ) => drawLine(ctx, screen(a), screen(b), color, width);
  for (let i = -8; i <= 8; i++) line({ x: i, y: -6 }, { x: i, y: 6 }, "#28334d");
  for (let i = -6; i <= 6; i++) line({ x: -8, y: i }, { x: 8, y: i }, "#28334d");
  line({ x: -8, y: 0 }, { x: 8, y: 0 }, "#74839f");
  line({ x: 0, y: -6 }, { x: 0, y: 6 }, "#74839f");
  const world = (p: { x: number; y: number }) => transformPoint(r.matrix, p);
  if (stage >= 6)
    for (let i = -2; i <= 2; i++) {
      line(world({ x: i, y: -2 }), world({ x: i, y: 2 }), "#335e59");
      line(world({ x: -2, y: i }), world({ x: 2, y: i }), "#335e59");
    }
  const polygon = (points: readonly { x: number; y: number }[], color: string, width: number) => {
    points.forEach((p, i) => line(p, points[(i + 1) % points.length], color, width));
  };
  polygon(transformSquare, "#74839f", 1.5);
  polygon(r.square, "#53f0ae", 3);
  const dot = (p: { x: number; y: number }, color: string, radius: number) => {
    const s = screen(p);
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };
  for (const [i, p] of r.square.entries()) {
    dot(p, "#53f0ae", 4);
    const s = screen(p);
    ctx.fillStyle = "#e1e8fa";
    ctx.fillText("P" + i, s.x + 7, s.y - 7);
  }
  const basis = (p: { x: number; y: number }, name: string, color: string, offset: number) => {
    line(r.origin, p, color, 3);
    dot(p, color, 5);
    const s = screen(p);
    ctx.fillStyle = color;
    ctx.fillText(name, s.x + 8, s.y + offset);
  };
  basis(world({ x: 1, y: 0 }), "ex", "#ff6b6b", -12);
  basis(world({ x: 0, y: 1 }), "ey", "#84a9ff", 22);
  dot(r.origin, "#ffe26c", 5);
  ctx.restore();
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText("Kéo để dịch chuyển từ bài Mat3; dùng slider để đổi tham số.", 20, 760);
  ctx.restore();
}
