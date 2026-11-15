import { cellColor, viewport, velocityAt, type FluidSession } from "@/lib/labs/stable-fluids";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export class FluidPainter {
  private readonly canvas = document.createElement("canvas");
  private readonly context = this.canvas.getContext("2d");
  private pixels: ImageData | null = null;
  draw(ctx: CanvasRenderingContext2D, size: CanvasSize, session: FluidSession) {
    setupCanvas(ctx, size);
    if (!this.context) return;
    ctx.fillStyle = "#070c15";
    ctx.fillRect(0, 0, size.width, size.height);
    const grid = session.grid,
      n = grid.n;
    if (!this.pixels || this.pixels.width !== n) {
      this.canvas.width = n;
      this.canvas.height = n;
      this.pixels = this.context.createImageData(n, n);
    }
    const data = this.pixels.data;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const color = cellColor(grid, x, y, session.layer, session.colored, session.stage),
          i = ((n - 1 - y) * n + x) * 4;
        data[i] = color[0];
        data[i + 1] = color[1];
        data[i + 2] = color[2];
        data[i + 3] = 255;
      }
    this.context.putImageData(this.pixels, 0, 0);
    const view = viewport(size.width, size.height);
    const screen = (x: number, y: number) => ({
      x: view.x + view.size * x,
      y: view.y + view.size * (1 - y),
    });
    ctx.imageSmoothingEnabled = n >= 64;
    ctx.drawImage(this.canvas, view.x, view.y, view.size, view.size);
    if (
      session.stage >= 4 &&
      (session.layer === "velocity" || (session.vectors && !session.clean))
    ) {
      ctx.strokeStyle = "#8ccbeb";
      ctx.lineWidth = 1.25;
      const stride = Math.max(2, Math.floor(n / 12));
      for (let y = 0; y < n; y += stride)
        for (let x = 0; x < n; x += stride) {
          const p = { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h },
            flow = velocityAt(grid, p),
            speed = Math.hypot(flow.x, flow.y);
          if (speed < 1e-10) continue;
          const length = Math.min(0.05, 0.15 * speed),
            a = screen(p.x, p.y),
            b = screen(p.x + (length * flow.x) / speed, p.y + (length * flow.y) / speed),
            dx = b.x - a.x,
            dy = b.y - a.y;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(b.x - 0.3 * dx - 0.2 * dy, b.y - 0.3 * dy + 0.2 * dx);
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - 0.3 * dx + 0.2 * dy, b.y - 0.3 * dy - 0.2 * dx);
          ctx.stroke();
        }
    }
    if (session.stage >= 2 && !session.clean) {
      const a = screen(session.selectedX * grid.h, (session.selectedY + 1) * grid.h);
      ctx.strokeStyle = "#7affd0";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(a.x, a.y, view.size * grid.h, view.size * grid.h);
    }
    ctx.strokeStyle = "#2b3c4f";
    ctx.lineWidth = 1;
    ctx.strokeRect(view.x - 0.5, view.y - 0.5, view.size + 1, view.size + 1);
  }
  dispose() {
    this.pixels = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
