import {
  width,
  height,
  support,
  WaterSurface,
  kernel,
  type WaterSession,
} from "@/lib/labs/sph-water";
import type { CanvasSize } from "../lab-shared";
export function tankRect(w: number, hh: number) {
  const scale = Math.min((w - 32) / width, (hh - 74) / height);
  return { x: (w - width * scale) / 2, y: 44, w: width * scale, h: height * scale, scale };
}
export function fromScreen(w: number, hh: number, p: { x: number; y: number }) {
  const r = tankRect(w, hh);
  if (p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return null;
  return { x: (p.x - r.x) / r.scale, y: height - (p.y - r.y) / r.scale };
}
export class WaterPainter {
  readonly surface = new WaterSurface();
  private buffer: HTMLCanvasElement | null = null;
  draw(ctx: CanvasRenderingContext2D, size: CanvasSize, session: WaterSession) {
    const previousDrawn = session.drawn;
    const r = tankRect(size.width, size.height),
      s = session.state;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = "#070c15";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.fillStyle = "#78d7ff";
    ctx.font = "12px monospace";
    ctx.fillText(
      `${s.particles.length.toLocaleString("vi-VN")} HẠT SPH · ${session.paused ? "TẠM DỪNG" : "ĐANG CHẠY"}`,
      16,
      24,
    );
    ctx.fillStyle = "#09121f";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (session.view === "surface" && session.stage >= 9) {
      this.surface.reconstruct(s);
      this.surface.shade();
      this.buffer ??= document.createElement("canvas");
      this.buffer.width = this.surface.w;
      this.buffer.height = this.surface.hh;
      this.buffer
        .getContext("2d")
        ?.putImageData(new ImageData(this.surface.rgba, this.surface.w, this.surface.hh), 0, 0);
      ctx.drawImage(this.buffer, r.x, r.y, r.w, r.h);
      session.drawn = this.surface.drawn;
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      for (const p of s.particles) {
        let value = 0;
        if (session.view === "density") value = (p.density / 1000 - 0.85) / 0.3;
        if (session.view === "pressure") value = p.pressure / 60000;
        if (session.view === "speed") value = Math.hypot(p.vx, p.vy) / 8;
        value = Math.max(0, Math.min(1, value));
        ctx.fillStyle = `rgb(${40 + 215 * value} ${170 - 70 * value} ${239 - 180 * value})`;
        ctx.beginPath();
        ctx.arc(
          r.x + p.x * r.scale,
          r.y + (height - p.y) * r.scale,
          Math.max(1.2, 0.032 * r.scale),
          0,
          2 * Math.PI,
        );
        ctx.fill();
      }
      ctx.restore();
      session.drawn = s.particles.length;
    }
    if (s.paddle.enabled) {
      const x = r.x + s.paddle.x * r.scale,
        y = r.y + (height - s.paddle.y) * r.scale;
      ctx.fillStyle = "#1a2b3c";
      ctx.strokeStyle = "#91aec5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, s.paddle.radius * r.scale, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#f4bb6e";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(r.x + s.paddle.targetX * r.scale, r.y + (height - s.paddle.targetY) * r.scale);
      ctx.stroke();
    }
    if (session.debug && s.particles[session.selected]) {
      const p = s.particles[session.selected];
      ctx.strokeStyle = "#ffcc79";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        r.x + p.x * r.scale,
        r.y + (height - p.y) * r.scale,
        support * r.scale,
        0,
        2 * Math.PI,
      );
      ctx.stroke();
    }
    if (session.stage >= 10) {
      ctx.fillStyle = "#f4bb6e";
      ctx.fillRect(
        r.x + session.nozzle.x * r.scale - 15,
        r.y + (height - session.nozzle.y) * r.scale - 10,
        30,
        6,
      );
    }
    ctx.strokeStyle = "#4d7190";
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = "#a6bed4";
    ctx.font = "11px monospace";
    ctx.fillText(
      `t=${s.time.toFixed(3)} s · dt=${s.dt.toFixed(6)} s · ${session.tool}`,
      16,
      size.height - 12,
    );
    if (session.stage === 3) {
      const x = r.x + r.w - 200,
        y = r.y + 18;
      ctx.fillStyle = "rgba(7,12,21,.92)";
      ctx.fillRect(x, y, 185, 120);
      ctx.strokeStyle = "#71d3ff";
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const px = x + 10 + i,
          py = y + 95 - (70 * kernel((support * i) / 160)) / kernel(0);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = "#c2d5e5";
      ctx.fillText("W(r) / W(0)   0 → 2h", x + 8, y + 110);
    }
    if (session.drawn !== previousDrawn) session.invalidate();
  }
  dispose() {
    this.buffer = null;
  }
}
