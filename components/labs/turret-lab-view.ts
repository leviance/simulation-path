import {
  turretBoard,
  turretResults,
  turretWorldToScreen,
  type TurretScene,
  type turretLayers,
} from "@/lib/labs/turret-scene";
import { turretNormalize } from "@/lib/labs/turret";
import { pointOnUnitCircle, TAU } from "@/lib/labs/angle";
import { add, subtract, scale, type Point } from "@/lib/labs/geometry";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

function boardLayout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 760);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 760 * scale) / 2 };
}

export function turretPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
): Point | null {
  const rect = event.currentTarget.getBoundingClientRect(),
    view = boardLayout(size);
  if (!rect.width || !rect.height || view.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - view.x) / view.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - view.y) / view.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < 0 || y < 0 || x >= 1100 || y >= 760))
  )
    return null;
  return { x, y };
}

export function drawTurretLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: TurretScene,
  layers: ReturnType<typeof turretLayers>,
) {
  setupCanvas(ctx, size);
  const view = boardLayout(size),
    result = turretResults(scene),
    origin = turretBoard.origin;
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 760);
  ctx.clip();
  ctx.font = "18px ui-monospace";
  for (let x = 30; x < 1100; x += 40) drawLine(ctx, { x, y: 130 }, { x, y: 690 }, "#28334d");
  for (let y = 130; y <= 690; y += 40) drawLine(ctx, { x: 30, y }, { x: 1070, y }, "#28334d");
  drawLine(ctx, { x: 30, y: 410 }, { x: 1070, y: 410 }, "#74839f");
  drawLine(ctx, { x: 550, y: 130 }, { x: 550, y: 690 }, "#74839f");
  ctx.beginPath();
  ctx.arc(550, 410, 260, 0, TAU);
  ctx.strokeStyle = "#74839f";
  ctx.stroke();
  const arrow = (start: Point, end: Point, color: string, label: string) => {
    const a = turretWorldToScreen(start),
      b = turretWorldToScreen(end),
      delta = subtract(b, a);
    const distance = Math.hypot(delta.x, delta.y);
    if (distance < 1e-9) return;
    const unit = turretNormalize(delta),
      side = { x: -unit.y, y: unit.x };
    const head = Math.min(12, distance * 0.6),
      base = subtract(b, scale(unit, head));
    drawLine(ctx, a, b, color, 2);
    drawLine(ctx, b, add(base, scale(side, head * 0.45)), color, 2);
    drawLine(ctx, b, subtract(base, scale(side, head * 0.45)), color, 2);
    ctx.fillStyle = color;
    ctx.fillText(label, b.x + 10, label === "forward" ? b.y + 26 : b.y - 12);
  };
  const targetScreen = turretWorldToScreen(scene.targetOffset);
  drawLine(ctx, origin, targetScreen, "#46536e");
  if (layers.cone) {
    for (const sign of [-1, 1]) {
      const end = scale(pointOnUnitCircle(scene.turretAngle + sign * scene.halfViewAngle), 6.5);
      drawLine(ctx, origin, turretWorldToScreen(end), "#74839f", 1.5);
    }
  }
  if (layers.projection) {
    arrow({ x: 0, y: 0 }, result.parallel, "#84a9ff", "projection");
    drawLine(ctx, turretWorldToScreen(result.parallel), targetScreen, "#ff6b6b", 3);
  }
  if (result.valid) {
    arrow({ x: 0, y: 0 }, scale(result.targetDirection, 3.5), "#53f0ae", "target direction");
    if (layers.rotation) {
      ctx.beginPath();
      ctx.arc(
        origin.x,
        origin.y,
        44,
        -scene.turretAngle,
        -(scene.turretAngle + result.signedError),
        result.signedError > 0,
      );
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.arc(550, 410, 24, 0, TAU);
  ctx.fillStyle = "#28334d";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  const side = { x: -result.forward.y * 0.15, y: result.forward.x * 0.15 },
    muzzle = scale(result.forward, 2.4);
  for (const sign of [-1, 1])
    drawLine(
      ctx,
      turretWorldToScreen(scale(side, sign)),
      turretWorldToScreen(add(muzzle, scale(side, sign))),
      "#ffffff",
      2,
    );
  drawLine(
    ctx,
    turretWorldToScreen(add(muzzle, side)),
    turretWorldToScreen(subtract(muzzle, side)),
    "#ffffff",
    2,
  );
  arrow({ x: 0, y: 0 }, scale(result.forward, 3.0), "#ffe26c", "forward");
  ctx.beginPath();
  ctx.arc(targetScreen.x, targetScreen.y, 8, 0, TAU);
  ctx.fillStyle = layers.cone && result.locked ? "#53f0ae" : "#ff6b6b";
  ctx.fill();
  drawLine(
    ctx,
    { x: targetScreen.x - 13, y: targetScreen.y },
    { x: targetScreen.x + 13, y: targetScreen.y },
    "#ffffff",
  );
  drawLine(
    ctx,
    { x: targetScreen.x, y: targetScreen.y - 13 },
    { x: targetScreen.x, y: targetScreen.y + 13 },
    "#ffffff",
  );
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText("1 world unit = 40 logical px · miền target: r ≤ 6.5", 120, 100);
  if (layers.projection) ctx.fillText("Xanh dương: projection · Đỏ: rejection", 120, 720);
  if (!result.valid) ctx.fillText("Vùng tâm: không có hướng để ngắm", 120, 750);
  ctx.restore();
}
