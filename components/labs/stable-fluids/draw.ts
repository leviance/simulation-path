import {
  signedColor,
  toScreen,
  velocity,
  type FluidGrid,
  type Layer,
} from "@/lib/labs/stable-fluids";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function drawFluid(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  grid: FluidGrid,
  layer: Layer,
  arrows: boolean,
  cursor: { x: number; y: number },
  stage: number,
) {
  setupCanvas(ctx, size);
  const n = grid.n,
    screen = (x: number, y: number) => toScreen(size.width, size.height, { x, y });
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (layer === "smoke") {
        const value = Math.round(12 + 235 * Math.max(0, Math.min(1, grid.density[i])));
        ctx.fillStyle = "rgb(" + value + "," + value + "," + value + ")";
      } else
        ctx.fillStyle =
          "rgb(" +
          signedColor(
            layer === "pressure" ? grid.pressure[i] : grid.div[i],
            layer === "pressure" ? 4 : 2,
          ).join(",") +
          ")";
      const a = screen(x * grid.h, (y + 1) * grid.h),
        b = screen((x + 1) * grid.h, y * grid.h);
      ctx.fillRect(a.x, a.y, b.x - a.x + 0.25, b.y - a.y + 0.25);
    }
  if (stage >= 4 && arrows) {
    ctx.strokeStyle = "#6ebeff";
    ctx.lineWidth = 1.5;
    const stride = Math.max(2, Math.floor(n / 8));
    for (let y = 0; y < n; y += stride)
      for (let x = 0; x < n; x += stride) {
        const p = { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h },
          flow = velocity(grid, p),
          speed = Math.hypot(flow.x, flow.y);
        if (speed < 1e-12) continue;
        const length = Math.min(0.06, 0.12 * speed),
          a = screen(p.x, p.y),
          b = screen(p.x + (length * flow.x) / speed, p.y + (length * flow.y) / speed);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        const dx = b.x - a.x,
          dy = b.y - a.y;
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 0.35 * dx - 0.18 * dy, b.y - 0.35 * dy + 0.18 * dx);
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 0.35 * dx + 0.18 * dy, b.y - 0.35 * dy - 0.18 * dx);
        ctx.stroke();
      }
  }
  if (stage >= 2) {
    const a = screen(cursor.x * grid.h, (cursor.y + 1) * grid.h),
      b = screen((cursor.x + 1) * grid.h, cursor.y * grid.h);
    ctx.strokeStyle = "#78ffb4";
    ctx.lineWidth = 2;
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    if (stage >= 4) {
      for (const [x, y, color] of [
        [cursor.x * grid.h, (cursor.y + 0.5) * grid.h, "#6ebeff"],
        [(cursor.x + 1) * grid.h, (cursor.y + 0.5) * grid.h, "#6ebeff"],
        [(cursor.x + 0.5) * grid.h, cursor.y * grid.h, "#fbbf24"],
        [(cursor.x + 0.5) * grid.h, (cursor.y + 1) * grid.h, "#fbbf24"],
      ] as const) {
        const p = screen(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}
