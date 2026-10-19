import {
  circleBoard,
  circleTimeToX,
  circleWorldToScreen,
  type CircleScene,
  type circleLayers,
} from "@/lib/labs/unit-circle";
import { pointOnUnitCircle, TAU } from "@/lib/labs/angle";
import type { Point } from "@/lib/labs/geometry";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

function boardLayout(size: CanvasSize) {
  const scale = Math.min(size.width / circleBoard.width, size.height / circleBoard.height);
  return {
    scale,
    x: (size.width - circleBoard.width * scale) / 2,
    y: (size.height - circleBoard.height * scale) / 2,
  };
}

export function circlePointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
): Point | null {
  const rect = event.currentTarget.getBoundingClientRect();
  const view = boardLayout(size);
  if (!rect.width || !rect.height || view.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - view.x) / view.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - view.y) / view.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < 0 || x >= 1100 || y < 0 || y >= 760))
  )
    return null;
  return { x, y };
}

export function drawAngleLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: CircleScene,
  layers: ReturnType<typeof circleLayers>,
) {
  setupCanvas(ctx, size);
  const view = boardLayout(size);
  const { center, radius } = circleBoard;
  const direction = pointOnUnitCircle(scene.angle);
  const endpoint = circleWorldToScreen(direction);
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 760);
  ctx.clip();
  ctx.font = "18px ui-monospace";
  drawLine(ctx, { x: 55, y: 390 }, { x: 495, y: 390 }, "#74839f");
  drawLine(ctx, { x: 275, y: 170 }, { x: 275, y: 610 }, "#74839f");
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, TAU);
  ctx.strokeStyle = "#74839f";
  ctx.stroke();
  ctx.fillStyle = "#e1e8fa";
  for (const [label, x, y] of [
    ["X", 498, 410],
    ["Y", 285, 170],
    ["+1", 452, 414],
    ["-1", 76, 414],
    ["+1", 284, 208],
    ["-1", 284, 574],
  ] as const)
    ctx.fillText(label, x, y);

  // Góc nhập có thể vượt một vòng; vị trí đầu kim luôn dùng góc đã normalize.
  const arc = Math.min(TAU, Math.max(-TAU, scene.requestedAngle));
  if (arc !== 0) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, 55, 0, -arc, arc > 0);
    ctx.strokeStyle = "#ffb454";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (layers.projections) {
    const cosinePoint = circleWorldToScreen({ x: direction.x, y: 0 });
    const sinePoint = circleWorldToScreen({ x: 0, y: direction.y });
    drawLine(ctx, endpoint, cosinePoint, "#46536e", 1);
    drawLine(ctx, endpoint, sinePoint, "#46536e", 1);
    drawLine(ctx, center, cosinePoint, "#84a9ff", 3);
    drawLine(ctx, center, sinePoint, "#53f0ae", 3);
    ctx.fillStyle = "#84a9ff";
    ctx.fillText("X = cos θ", 110, 650);
    ctx.fillStyle = "#53f0ae";
    ctx.fillText("Y = sin θ", 305, 650);
  }
  if (layers.needle) {
    drawLine(ctx, center, endpoint, "#ffe26c", 3);
    ctx.beginPath();
    ctx.arc(endpoint.x, endpoint.y, 7, 0, TAU);
    ctx.fillStyle = "#ffe26c";
    ctx.fill();
  }
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText("θ = " + scene.angle.toFixed(3) + " rad", 110, 140);
  if (layers.graphs) {
    for (const y of [270, 400, 530]) drawLine(ctx, { x: 570, y }, { x: 1050, y }, "#28334d");
    drawLine(ctx, { x: 570, y: 240 }, { x: 570, y: 560 }, "#74839f");
    drawLine(ctx, { x: 1050, y: 240 }, { x: 1050, y: 560 }, "#ffe26c");
    for (const [key, color] of [
      ["sine", "#53f0ae"],
      ["cosine", "#84a9ff"],
    ] as const) {
      ctx.beginPath();
      let started = false;
      for (const sample of scene.samples) {
        if (sample.time < scene.elapsedTime - 6 - 1e-10) continue;
        const x = circleTimeToX(sample.time, scene.elapsedTime);
        const y = 400 - sample[key] * 130;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(key === "sine" ? "sin θ" : "cos θ", key === "sine" ? 590 : 750, 220);
    }
    ctx.fillStyle = "#e1e8fa";
    ctx.fillText("−6 s", 570, 590);
    ctx.fillText("bây giờ", 977, 590);
    ctx.fillText("+1", 538, 275);
    ctx.fillText("−1", 538, 535);
  }
  ctx.restore();
}
