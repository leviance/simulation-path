import type { WindSession } from "@/lib/labs/wind-map/session";
import { world, type Vec2 } from "@/lib/labs/wind-map/model";
import { derivativeX, derivativeY, divergence, curl } from "@/lib/labs/wind-map/operators";
import { toScreen, scalarColor, viewport } from "@/lib/labs/wind-map/view";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export class WindPainter {
  private background: HTMLCanvasElement | null = null;
  private key = "";
  dispose() {
    this.background = null;
    this.key = "";
  }
  draw(canvas: HTMLCanvasElement, size: CanvasSize, app: WindSession) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const key = `${size.width}:${size.height}:${size.dpr}:${app.revision}:${app.layer}`;
    if (key !== this.key) {
      this.background ??= document.createElement("canvas");
      this.background.width = Math.round(size.width * size.dpr);
      this.background.height = Math.round(size.height * size.dpr);
      const cache = this.background.getContext("2d");
      if (!cache) return false;
      setupCanvas(cache, size);
      this.field(cache, size, app);
      this.key = key;
    }
    setupCanvas(ctx, size);
    if (this.background) ctx.drawImage(this.background, 0, 0, size.width, size.height);
    const screen = (p: Vec2) => toScreen(size.width, size.height, p);
    if (app.stage >= 7 && app.tracers) {
      for (const particle of app.particles) {
        ctx.beginPath();
        for (let age = 0; age < particle.trailSize; age++) {
          const index = (particle.trailHead - particle.trailSize + age + 24) % 24;
          const p = screen(particle.trail[index]);
          if (age === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        const p = screen(particle.position);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = "#eacb7877";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#ffe6a4";
        ctx.fillRect(p.x - 1.6, p.y - 1.6, 3.2, 3.2);
      }
    }
    if (!app.clean) {
      const p = screen(app.cursor);
      ctx.strokeStyle = "#78ffb4";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
      if (app.scene.vortex && app.stage >= 8) {
        const c = screen(app.scene.center);
        ctx.strokeStyle = "#dab7ff";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    return true;
  }
  private field(ctx: CanvasRenderingContext2D, size: CanvasSize, app: WindSession) {
    const field = app.field;
    const screen = (p: Vec2) => toScreen(size.width, size.height, p);
    const view = viewport(size.width, size.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, 4 * view.scale, 3 * view.scale);
    ctx.clip();
    if (app.layer !== "arrows")
      for (let y = 0; y < field.height; y++)
        for (let x = 0; x < field.width; x++) {
          let value = field.scalar[y * field.width + x];
          if (app.layer === "gradient")
            value = Math.hypot(
              derivativeX(field, field.scalar, x, y),
              derivativeY(field, field.scalar, x, y),
            );
          if (app.layer === "divergence") value = divergence(field, x, y);
          if (app.layer === "curl") value = curl(field, x, y);
          const p = world(field, x, y);
          const a = screen({
            x: Math.max(-2, p.x - field.dx / 2),
            y: Math.min(1.5, p.y + field.dy / 2),
          });
          const b = screen({
            x: Math.min(2, p.x + field.dx / 2),
            y: Math.max(-1.5, p.y - field.dy / 2),
          });
          ctx.fillStyle = `rgb(${scalarColor(value).join(",")})`;
          // Shared edges land on the same physical pixel, so a uniform field
          // cannot acquire a false checkerboard from fractional fill coverage.
          const left = Math.round(a.x * size.dpr) / size.dpr;
          const top = Math.round(a.y * size.dpr) / size.dpr;
          const right = Math.round(b.x * size.dpr) / size.dpr;
          const bottom = Math.round(b.y * size.dpr) / size.dpr;
          ctx.fillRect(left, top, right - left, bottom - top);
        }
    const line = (a: Vec2, b: Vec2) => {
      const p = screen(a),
        q = screen(b);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    };
    ctx.strokeStyle = "#58708a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    line({ x: -2, y: 0 }, { x: 2, y: 0 });
    line({ x: 0, y: -1.5 }, { x: 0, y: 1.5 });
    ctx.stroke();
    ctx.strokeStyle = "#c7ddee";
    ctx.beginPath();
    const stride = Math.max(1, (field.width - 1) / 16);
    for (let y = 0; y < field.height; y += stride)
      for (let x = 0; x < field.width; x += stride) {
        const p = world(field, x, y),
          i = y * field.width + x;
        let vx = field.vx[i],
          vy = field.vy[i];
        if (app.layer === "gradient") {
          vx = derivativeX(field, field.scalar, x, y);
          vy = derivativeY(field, field.scalar, x, y);
        }
        const speed = Math.hypot(vx, vy);
        if (speed < 1e-12) {
          const s = screen(p);
          ctx.fillStyle = "#c7ddee";
          ctx.fillRect(s.x, s.y, 1, 1);
          continue;
        }
        const length = Math.min(0.16, 0.09 * speed),
          dx = vx / speed,
          dy = vy / speed,
          head = Math.min(0.035, length * 0.35);
        const tip = { x: p.x + length * dx, y: p.y + length * dy };
        line(p, tip);
        line(tip, {
          x: tip.x - head * dx - head * 0.5 * dy,
          y: tip.y - head * dy + head * 0.5 * dx,
        });
        line(tip, {
          x: tip.x - head * dx + head * 0.5 * dy,
          y: tip.y - head * dy - head * 0.5 * dx,
        });
      }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#bdcee5";
    ctx.font = "12px monospace";
    ctx.fillText("y ↑", view.x + 7, view.y + 17);
    ctx.fillText("x →", view.x + 4 * view.scale - 34, view.y + 3 * view.scale - 10);
  }
}
