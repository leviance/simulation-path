import {
  collisionLengthSquared,
  collisionSubtract,
  collisionAdd,
  collisionScale,
  finiteCollisionBall,
} from "@/lib/labs/collision-tank";
import { TANK_STEPS, type TankScene } from "@/lib/labs/collision-scene";
import { renderTank3D, type TankRaster } from "./collision-raster";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

export const tankWorldToScreen = (p: { x: number; y: number }) => ({
  x: 550 + 45 * p.x,
  y: 365 - 45 * p.y,
});
export const tankScreenToWorld = (p: { x: number; y: number }) => ({
  x: (p.x - 550) / 45,
  y: (365 - p.y) / 45,
});
export function tankLayout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 820);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 820 * scale) / 2 };
}
export function tankEventPoint(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    board = tankLayout(size);
  if (rect.width <= 0 || rect.height <= 0 || board.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - board.x) / board.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - board.y) / board.scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
export function hitTankBall(s: TankScene, point: { x: number; y: number }) {
  const world = tankScreenToWorld(point);
  return s.balls.findIndex(
    (b) => collisionLengthSquared(collisionSubtract(world, b.position)) <= b.radius * b.radius,
  );
}
function arrow(
  ctx: CanvasRenderingContext2D,
  point: { x: number; y: number },
  normal: { x: number; y: number },
  amount: number,
  color: string,
) {
  const start = tankWorldToScreen(point),
    end = tankWorldToScreen(collisionAdd(point, collisionScale(normal, amount)));
  drawLine(ctx, start, end, color, 2);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  for (const side of [-1, 1])
    drawLine(
      ctx,
      end,
      {
        x: end.x - 8 * Math.cos(angle + side * 0.45),
        y: end.y - 8 * Math.sin(angle + side * 0.45),
      },
      color,
      2,
    );
}
export function drawTankHistory(ctx: CanvasRenderingContext2D, s: TankScene) {
  let energyScale = Math.max(1e-6, s.initialEnergy),
    penScale = 1e-6;
  for (const h of s.history) {
    energyScale = Math.max(energyScale, h.energy);
    penScale = Math.max(penScale, h.penetration);
  }
  const first = s.history[0]?.time ?? 0,
    span = Math.max(TANK_STEPS[s.dtIndex], (s.history.at(-1)?.time ?? 0) - first);
  ctx.strokeStyle = "#24324d";
  ctx.strokeRect(50, 720, 480, 60);
  ctx.strokeRect(580, 720, 480, 60);
  for (let i = 1; i < s.history.length; i++) {
    const a = s.history[i - 1],
      b = s.history[i],
      x0 = (480 * (a.time - first)) / span,
      x1 = (480 * (b.time - first)) / span;
    drawLine(
      ctx,
      { x: 50 + x0, y: 780 - (60 * a.energy) / energyScale },
      { x: 50 + x1, y: 780 - (60 * b.energy) / energyScale },
      "#53f0ae",
      2,
    );
    drawLine(
      ctx,
      { x: 580 + x0, y: 780 - (60 * a.penetration) / penScale },
      { x: 580 + x1, y: 780 - (60 * b.penetration) / penScale },
      "#ffe26c",
      2,
    );
  }
  ctx.fillStyle = "#f5f7ff";
  ctx.font = "13px ui-monospace,monospace";
  ctx.fillText("Động năng K, J · scale " + energyScale.toExponential(2), 50, 705);
  ctx.fillText("Độ xuyên còn lại, m · scale " + penScale.toExponential(2), 580, 705);
  ctx.fillText(
    first.toFixed(2) +
      " → " +
      (s.history.at(-1)?.time ?? 0).toFixed(2) +
      " s · " +
      s.history.length +
      " mẫu physics gần nhất (tối đa 601)",
    50,
    805,
  );
}
export function drawTankCanvas(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  s: TankScene,
  raster: TankRaster | null,
  kick?: { start: { x: number; y: number }; current: { x: number; y: number } } | null,
) {
  setupCanvas(ctx, size);
  const board = tankLayout(size);
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 820);
  ctx.clip();
  if (s.spatial && raster) {
    renderTank3D(raster, s);
    ctx.drawImage(raster.canvas, 0, 0);
  } else {
    ctx.strokeStyle = "#7187b4";
    ctx.strokeRect(100, 95, 900, 540);
    if (s.debug)
      for (let x = -8; x <= 8; x += 2)
        drawLine(ctx, tankWorldToScreen({ x, y: -6 }), tankWorldToScreen({ x, y: 6 }), "#24324d");
    ctx.save();
    ctx.beginPath();
    ctx.rect(100, 95, 900, 540);
    ctx.clip();
    for (const b of s.balls) {
      if (!finiteCollisionBall(b)) continue;
      const p = tankWorldToScreen(b.position),
        r = 45 * b.radius;
      const gradient = ctx.createRadialGradient(
        p.x - r * 0.3,
        p.y - r * 0.35,
        r * 0.05,
        p.x,
        p.y,
        r,
      );
      gradient.addColorStop(0, "#edf5ff");
      gradient.addColorStop(0.28, b.color);
      gradient.addColorStop(1, "#16233e");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    if (s.debug) {
      for (const c of s.stats.debugContacts) {
        arrow(ctx, c.point, c.normal, 0.5, "#ffe26c");
        if (c.impulse > 0) arrow(ctx, c.point, c.normal, Math.min(2, c.impulse * 0.2), "#ff7b72");
      }
      if (s.trace?.contact.colliding && s.balls.length === 2)
        arrow(ctx, s.balls[0].position, s.trace.contact.normal, 1.5, "#ffe26c");
    }
  }
  ctx.fillStyle = "#f5f7ff";
  ctx.font = "17px ui-monospace,monospace";
  ctx.fillText(
    "BỂ VA CHẠM " +
      (s.spatial ? "3D" : "2D") +
      " · " +
      (s.spatial ? s.spheres.length : s.balls.length) +
      " vật thể · t=" +
      s.elapsed.toFixed(3) +
      " s",
    30,
    30,
  );
  ctx.font = "14px ui-monospace,monospace";
  ctx.fillText(
    s.spatial
      ? "X/Y/Z thật; kéo để đổi góc nhìn, không xoay state của các quả cầu."
      : "Màu, kích thước và khối lượng khác nhau. Vị trí/radius lưu bằng mét, không bằng pixel.",
    30,
    58,
  );
  if (s.stage >= 8) drawTankHistory(ctx, s);
  else {
    ctx.fillStyle = "#aebbd2";
    ctx.fillText(
      s.stage < 3
        ? "Bài này chưa giải va chạm tường. Ra ngoài khung không có nghĩa state đã bị xóa."
        : "Vàng: contact normal từ A sang B. Impulse chỉ xuất hiện sau khi học bài 5.",
      40,
      700,
    );
  }
  if (kick && !s.spatial) drawLine(ctx, kick.start, kick.current, "#ffe26c", 3);
  ctx.restore();
}
