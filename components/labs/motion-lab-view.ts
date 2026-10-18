import type { MotionState } from "@/lib/labs/motion";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

export function drawMotion(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  state: MotionState,
  sampleTime: number,
  showFrame: boolean,
) {
  setupCanvas(ctx, size);
  const right = size.width - 28;
  const laneLength = Math.max(1, right - 28 - 20);
  ctx.font = "11px ui-monospace";
  for (const [label, distance, y, color] of [
    ["+3 px / frame", state.frameDistance, 50, "#ffb454"],
    ["180 px/s × dt", state.timeDistance, 120, "#53f0ae"],
  ] as const) {
    if (y === 50 && !showFrame) continue;
    ctx.fillStyle = "#c6cede";
    ctx.fillText(label + " · " + distance.toFixed(1) + " px", 28, y - 13);
    drawLine(ctx, { x: 28, y: y + 12 }, { x: right, y: y + 12 }, "#46536e");
    // Hai làn cùng thang 1800px; không wrap để tránh nhầm điểm đầu/cuối.
    ctx.fillStyle = color;
    ctx.fillRect(28 + Math.min(1, distance / 1800) * laneLength, y, 20, 20);
  }
  const top = 194;
  const bottom = size.height - 32;
  drawLine(ctx, { x: 38, y: top }, { x: 38, y: bottom }, "#8794ae");
  drawLine(ctx, { x: 38, y: bottom }, { x: right, y: bottom }, "#8794ae");
  ctx.fillStyle = "#c6cede";
  ctx.fillText("Quãng đường (px) / thời gian (s)", 38, top - 15);
  ctx.fillText("0", 24, bottom + 16);
  ctx.fillText("5 s", right - 24, bottom + 16);
  const maximum = Math.max(900, state.frameDistance, state.timeDistance);
  ctx.fillText(maximum.toFixed(0), 2, top + 4);
  for (const [key, color] of [
    ["frameDistance", "#ffb454"],
    ["timeDistance", "#53f0ae"],
  ] as const) {
    if (key === "frameDistance" && !showFrame) continue;
    ctx.beginPath();
    state.history.forEach((item, index) => {
      const x = 38 + (item.elapsed / 5) * (right - 38);
      const y = bottom - (item[key] / maximum) * (bottom - top);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const cursor = 38 + (Math.min(sampleTime, state.elapsed) / 5) * (right - 38);
  drawLine(ctx, { x: cursor, y: top }, { x: cursor, y: bottom }, "#ffffff");
}
