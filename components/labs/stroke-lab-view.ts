import type { Point } from "@/lib/labs/geometry";
import { paintHeight, paintWidth } from "@/lib/labs/paint";
import { setupCanvas, type CanvasSize } from "./lab-shared";

export function strokeBoard(size: { width: number; height: number }) {
  const scale = Math.min((size.width - 40) / paintWidth, (size.height - 40) / paintHeight);
  return {
    scale,
    ox: (size.width - paintWidth * scale) / 2,
    oy: (size.height - paintHeight * scale) / 2,
  };
}

export function drawStrokeLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  image: HTMLCanvasElement,
  input: Point[][],
  showSamples: boolean,
  cursor: Point,
  zoomRadius?: number,
) {
  setupCanvas(ctx, size);
  ctx.imageSmoothingEnabled = false;
  if (zoomRadius !== undefined) {
    const side = zoomRadius * 2 + 5;
    const cell = Math.min((size.width - 40) / side, (size.height - 40) / side);
    const ox = (size.width - side * cell) / 2;
    const oy = (size.height - side * cell) / 2;
    ctx.drawImage(
      image,
      160 - zoomRadius - 2,
      90 - zoomRadius - 2,
      side,
      side,
      ox,
      oy,
      side * cell,
      side * cell,
    );
    ctx.strokeStyle = "#46536e";
    ctx.lineWidth = 1;
    for (let index = 0; index <= side; index += 1) {
      ctx.beginPath();
      ctx.moveTo(ox + index * cell, oy);
      ctx.lineTo(ox + index * cell, oy + side * cell);
      ctx.moveTo(ox, oy + index * cell);
      ctx.lineTo(ox + side * cell, oy + index * cell);
      ctx.stroke();
    }
    return;
  }
  const board = strokeBoard(size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, board.ox, board.oy, paintWidth * board.scale, paintHeight * board.scale);
  ctx.strokeStyle = "#64748b";
  ctx.strokeRect(board.ox, board.oy, paintWidth * board.scale, paintHeight * board.scale);
  if (showSamples) {
    ctx.fillStyle = "#ffffff";
    for (const path of input) {
      for (const point of path) {
        ctx.beginPath();
        ctx.arc(
          board.ox + point.x * board.scale,
          board.oy + point.y * board.scale,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  const x = board.ox + cursor.x * board.scale;
  const y = board.oy + cursor.y * board.scale;
  ctx.strokeStyle = "#ffb454";
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.stroke();
}
