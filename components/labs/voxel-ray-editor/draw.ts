import {
  faces,
  project,
  pointAt,
  placementCell,
  type Editor,
  type Cell,
} from "@/lib/labs/voxel-ray-editor";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function layout(size: CanvasSize) {
  return {
    left: 12,
    top: 10,
    scale: Math.max(0.25, Math.min((size.width - 24) / 320, (size.height - 306) / 240)),
    gridX: Math.max(12, (size.width - 256) / 2),
    gridY: size.height - 276,
  };
}
export function draw(ctx: CanvasRenderingContext2D, size: CanvasSize, e: Editor, stage: number) {
  setupCanvas(ctx, size);
  const b = layout(size);
  if (e.frame) {
    const buffer = document.createElement("canvas");
    buffer.width = 320;
    buffer.height = 240;
    buffer
      .getContext("2d")
      ?.putImageData(new ImageData(new Uint8ClampedArray(e.frame.pixels), 320, 240), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, b.left, b.top, 320 * b.scale, 240 * b.scale);
  }
  const outline = (cell: Cell, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (const f of faces) {
      ctx.beginPath();
      f.forEach((v, i) => {
        const p = project(v.map((a, j) => a + cell[j]) as Cell, e.camera),
          x = b.left + p.x * b.scale,
          y = b.top + p.y * b.scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
  };
  const shown = Math.min(e.shown, e.trace.visits.length);
  if (stage >= 4 && shown > 0) outline(e.trace.visits[shown - 1].cell, "#50a0ff");
  if (stage >= 5 && e.trace.hit) outline(e.trace.hit.cell, "#ffdc46");
  if (stage >= 7) {
    const target = placementCell(e.chunk, e.trace.hit);
    if (target) outline(target, "#50f08c");
  }
  ctx.strokeStyle = "#f0f0fa";
  ctx.lineWidth = 1;
  const sx = b.left + (e.pixelX + 0.5) * b.scale,
    sy = b.top + (e.pixelY + 0.5) * b.scale;
  ctx.beginPath();
  ctx.moveTo(sx - 6, sy);
  ctx.lineTo(sx + 6, sy);
  ctx.moveTo(sx, sy - 6);
  ctx.lineTo(sx, sy + 6);
  ctx.stroke();
  if (stage >= 2 && e.ray) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.gridX, b.gridY, 256, 256);
    ctx.clip();
    ctx.strokeStyle = "#293750";
    ctx.lineWidth = 1;
    for (let n = 0; n <= 16; n++) {
      ctx.beginPath();
      ctx.moveTo(b.gridX + n * 16, b.gridY);
      ctx.lineTo(b.gridX + n * 16, b.gridY + 256);
      ctx.moveTo(b.gridX, b.gridY + n * 16);
      ctx.lineTo(b.gridX + 256, b.gridY + n * 16);
      ctx.stroke();
    }
    for (const v of e.trace.visits.slice(0, shown)) {
      ctx.fillStyle = "#3567a0";
      ctx.fillRect(b.gridX + v.cell[0] * 16 + 1, b.gridY + v.cell[2] * 16 + 1, 14, 14);
    }
    const start = e.ray.origin,
      end = pointAt(e.ray, e.reach);
    ctx.strokeStyle = "#ffb85b";
    ctx.beginPath();
    ctx.moveTo(b.gridX + start[0] * 16, b.gridY + start[2] * 16);
    ctx.lineTo(b.gridX + end[0] * 16, b.gridY + end[2] * 16);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#ccd6e8";
    ctx.font = "12px monospace";
    ctx.fillText("XZ: tia và các ô đã đi qua; Y đọc ở bảng số", 12, b.gridY - 10);
  }
}
