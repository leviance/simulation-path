import {
  vectorWorldToScreen,
  vectorArrowHead,
  vectorBoard,
  vectorResults,
  type VectorScene,
  type vectorLayers,
} from "@/lib/labs/vector-playground";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
import type { Point } from "@/lib/labs/geometry";

export function vectorPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
): Point | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const view = vectorBoard(size);
  if (view.scale <= 0) return null;
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

export function drawVectorLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: VectorScene,
  layers: ReturnType<typeof vectorLayers>,
) {
  setupCanvas(ctx, size);
  const board = vectorBoard(size);
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 760);
  ctx.clip();
  ctx.font = "17px ui-monospace";
  for (let x = 10; x < 1100; x += 45) drawLine(ctx, { x, y: 0 }, { x, y: 760 }, "#28334d");
  for (let y = 15; y < 760; y += 45) drawLine(ctx, { x: 0, y }, { x: 1100, y }, "#28334d");
  drawLine(ctx, { x: 0, y: 420 }, { x: 1100, y: 420 }, "#74839f", 2);
  drawLine(ctx, { x: 550, y: 0 }, { x: 550, y: 760 }, "#74839f", 2);
  const colors = {
    a: "#53f0ae",
    b: "#84a9ff",
    sum: "#ffb454",
    difference: "#ff6b6b",
    guide: "#74839f",
    scalar: "#c678ff",
    white: "#ffffff",
    lerp: "#ffe26c",
  };
  const arrow = (
    startWorld: Point,
    endWorld: Point,
    color: string,
    label: string,
    dashed = false,
  ) => {
    const start = vectorWorldToScreen(startWorld),
      end = vectorWorldToScreen(endWorld);
    ctx.save();
    if (dashed) ctx.setLineDash([8, 6]);
    drawLine(ctx, start, end, color, 2);
    const head = layers.heads ? vectorArrowHead(start, end) : null;
    if (head) {
      drawLine(ctx, end, head.leftWing, color, 2);
      drawLine(ctx, end, head.rightWing, color, 2);
    }
    ctx.restore();
    ctx.fillStyle = color;
    ctx.fillText(label, end.x + 12, end.y - 14);
  };
  const origin = { x: 0, y: 0 },
    r = vectorResults(scene);
  if (layers.addition) {
    arrow(scene.vectorA, r.vectorSum, colors.guide, "", true);
    arrow(scene.vectorB, r.vectorSum, colors.guide, "", true);
    arrow(origin, r.vectorSum, colors.sum, "A+B");
  }
  if (layers.subtraction) {
    arrow(origin, { x: -scene.vectorB.x, y: -scene.vectorB.y }, colors.guide, "-B", true);
    arrow(origin, r.vectorDifference, colors.difference, "A−B");
    arrow(scene.vectorB, scene.vectorA, colors.difference, "B→A", true);
  }
  if (layers.scalar) {
    arrow(origin, r.scaledA, colors.scalar, "sA");
    drawLine(
      ctx,
      vectorWorldToScreen(scene.vectorA),
      vectorWorldToScreen(scene.vectorB),
      colors.guide,
      2,
    );
  }
  if (layers.unit) {
    ctx.beginPath();
    ctx.arc(550, 420, 45, 0, Math.PI * 2);
    ctx.strokeStyle = colors.white;
    ctx.lineWidth = 1;
    ctx.stroke();
    arrow(origin, r.unitA, colors.white, "normalize(A)");
  }
  if (layers.interpolation) {
    drawLine(
      ctx,
      vectorWorldToScreen(scene.vectorA),
      vectorWorldToScreen(scene.vectorB),
      colors.guide,
      2,
    );
  }
  arrow(origin, scene.vectorA, colors.a, "A");
  arrow(origin, scene.vectorB, colors.b, "B");
  [scene.vectorA, scene.vectorB].forEach((point, index) => {
    const screen = vectorWorldToScreen(point);
    if (layers.dragDetails) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = colors.white;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (layers.canDrag && scene.selected === index) {
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = colors.white;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? colors.a : colors.b;
    ctx.fill();
  });
  if (layers.interpolation) {
    const point = vectorWorldToScreen(r.point);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = colors.lerp;
    ctx.fill();
    ctx.fillText("P(t)", point.x + 10, point.y + 16);
  }
  ctx.fillStyle = "#9aa6c1";
  ctx.fillText("X →", 1040, 445);
  ctx.fillText("Y ↑", 565, 145);
  ctx.restore();
}
