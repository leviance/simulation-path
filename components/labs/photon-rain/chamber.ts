import type { Point, Settings } from "@/lib/labs/photon-rain";
import type { CanvasSize } from "../lab-shared";

type Ctx = CanvasRenderingContext2D;
export const ink = {
  paper: "#e1eeee",
  muted: "#9bb6c1",
  divider: "#2b4552",
  teal: "#57e1c1",
  gold: "#ffce68",
  coral: "#ff858b",
  lilac: "#c9a6f2",
};
export type Rect = { x: number; y: number; w: number; h: number };
export function layout(size: CanvasSize) {
  const compact = size.width < 590;
  const split = compact ? size.width : size.width * 0.61;
  const maxBottom = compact ? (size.height - 52) * 0.59 : size.height - 99;
  const top = 50,
    low = Math.max(top + 45, maxBottom);
  const scale = Math.max(1, Math.min((split - 56) / 3, (low - top) / 2));
  const tank = {
    x: (split - 3 * scale) / 2,
    y: top + (low - top - 2 * scale) / 2,
    w: 3 * scale,
    h: 2 * scale,
  };
  const readout = compact
    ? { x: 12, y: maxBottom + 26, w: size.width - 24, h: size.height - maxBottom - 94 }
    : { x: split + 3, y: 34, w: size.width - split - 13, h: size.height - 42 };
  return { compact, tank, readout, track: { x: 14, w: split - 28 } };
}
export function tint(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + t * (b[i] - v)));
}
const rgb = (c: number[]) => `rgb(${c.join(",")})`;
export function text(
  ctx: Ctx,
  message: string,
  x: number,
  y: number,
  color: string,
  pixels = 11,
  bold = false,
) {
  ctx.font = `${bold ? "600" : "400"} ${pixels}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(message, x, y);
}
export function line(
  ctx: Ctx,
  x: number,
  y: number,
  u: number,
  v: number,
  color: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(u, v);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}
function face(ctx: Ctx, points: number[][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const p of points.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
}
export function screen(tank: Rect, p: Point): [number, number] {
  return [tank.x + ((p[0] + 1.5) * tank.w) / 3, tank.y + ((1 - p[1]) * tank.h) / 2];
}
export function chamber(ctx: Ctx, size: CanvasSize, tank: Rect, settings: Settings) {
  const { x, y, w, h } = tank;
  const haze = Math.min(1, Math.max(0, settings.muS / 3));
  const absorb = 0.43 * Math.min(1, Math.max(0, settings.muA / 3));
  const surface = tint(tint([17, 77, 91], [70, 130, 128], haze), [16, 39, 48], absorb);
  const bottom = tint(tint([9, 30, 51], [39, 75, 90], haze), [10, 24, 36], absorb);
  ctx.fillStyle = "#0b1924";
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = ink.teal;
  ctx.fillRect(13, 11, 3, 16);
  text(ctx, "BỂ QUANG HỌC", 22, 24, ink.paper, 14, true);
  text(ctx, "Monte Carlo  /  mặt XY", 145, 24, ink.muted, 10);
  const gradient = ctx.createLinearGradient(0, y, 0, y + h);
  gradient.addColorStop(0, rgb(surface));
  gradient.addColorStop(1, rgb(bottom));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  const dx = Math.max(5, Math.min(11, w * 0.035)),
    dy = dx * 0.7;
  face(
    ctx,
    [
      [x, y],
      [x + dx, y - dy],
      [x + w + dx, y - dy],
      [x + w, y],
    ],
    "#396b76",
  );
  face(
    ctx,
    [
      [x + w, y],
      [x + w + dx, y - dy],
      [x + w + dx, y + h - dy],
      [x + w, y + h],
    ],
    "#25424f",
  );
  ctx.save();
  ctx.setLineDash([2, 6]);
  for (let i = 1; i < 6; i++)
    line(ctx, x + (w * i) / 6, y + 1, x + (w * i) / 6, y + h - 1, "rgba(182,220,218,.18)");
  for (let i = 1; i < 4; i++)
    line(ctx, x + 1, y + (h * i) / 4, x + w - 1, y + (h * i) / 4, "rgba(182,220,218,.18)");
  ctx.restore();
  ctx.strokeStyle = "#79a8aa";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  // The dark metal rail and mounting feet are outside the measured rectangle.
  ctx.fillStyle = "#253d48";
  ctx.fillRect(x - 2, y + h + 1, w + dx + 3, 3);
  for (const foot of [0.12, 0.85]) {
    ctx.fillStyle = "#41616a";
    ctx.fillRect(x + w * foot - 5, y + h + 3, 11, 4);
  }
  line(ctx, x + dx, y - dy, x + w + dx, y - dy, "#79a6ac");
  line(ctx, x + 2, y + 2, x + w - 3, y + 2, "rgba(170,227,216,.26)");
  ctx.fillStyle = "#283c45";
  ctx.fillRect(x - 10, y + h / 8 - 3, 9, h * 0.75 + 6);
  ctx.fillStyle = ink.gold;
  ctx.fillRect(x - 4, y + h / 8, 3, h * 0.75);
  for (const bolt of [0.16, 0.84]) {
    ctx.fillStyle = "#9dab9e";
    ctx.fillRect(x - 8, y + h * bolt, 2, 2);
  }
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = "#31565b";
    ctx.fillRect(
      x + w + 1,
      y + ((23 - i) * h) / 24 + 0.5,
      Math.max(2, dx * 0.49),
      Math.max(1, h / 24 - 1),
    );
  }
  text(ctx, "Nguồn", x - 14, y - 9, ink.gold, 10, true);
  text(ctx, "Màn thu", x + w - 32, y - 9, ink.teal, 10, true);
  for (let i = 0; i <= 12; i++)
    line(ctx, x + (i * w) / 12, y + h + 8, x + (i * w) / 12, y + h + (i % 2 ? 10 : 12), ink.muted);
  text(ctx, "−1,5", x - 8, y + h + 22, ink.muted, 9);
  text(ctx, "0", x + w / 2 - 3, y + h + 22, ink.muted, 9);
  text(ctx, "+1,5  x", x + w - 25, y + h + 22, ink.muted, 9);
}
