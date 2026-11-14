import { orbital } from "@/lib/labs/atomic-playground/catalog";
import type { Cloud } from "@/lib/labs/atomic-playground/session";
import { clipVisible, inProbe } from "@/lib/labs/atomic-playground/statistics";
import { projector, type AtomicView } from "@/lib/labs/atomic-playground/view";
import type { Vec3 } from "@/lib/labs/normal";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export interface PaintCounts {
  primary: number;
  secondary: number;
}
const sprites = new Map<string, HTMLCanvasElement>();
function sprite(color: string) {
  let result = sprites.get(color);
  if (result) return result;
  result = document.createElement("canvas");
  result.width = result.height = 16;
  const ctx = result.getContext("2d");
  if (!ctx) return result;
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, `rgba(${color},1)`);
  gradient.addColorStop(0.35, `rgba(${color},0.45)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  sprites.set(color, result);
  return result;
}
function segment(
  ctx: CanvasRenderingContext2D,
  project: ReturnType<typeof projector>,
  a: Vec3,
  b: Vec3,
  color: string,
) {
  const first = project(a),
    second = project(b);
  if (!first || !second) return;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  ctx.lineTo(second.x, second.y);
  ctx.stroke();
}
function guides(
  ctx: CanvasRenderingContext2D,
  view: AtomicView,
  radius: number,
  project: ReturnType<typeof projector>,
) {
  const low = -radius * 0.65;
  ctx.lineWidth = 0.6;
  for (let line = -5; line <= 5; ++line) {
    const coordinate = (line * radius) / 4;
    segment(
      ctx,
      project,
      { x: coordinate, y: low, z: -radius * 1.25 },
      { x: coordinate, y: low, z: radius * 1.25 },
      "#183444",
    );
    segment(
      ctx,
      project,
      { x: -radius * 1.25, y: low, z: coordinate },
      { x: radius * 1.25, y: low, z: coordinate },
      "#183444",
    );
  }
  segment(ctx, project, { x: -radius, y: 0, z: 0 }, { x: radius, y: 0, z: 0 }, "#624148");
  segment(ctx, project, { x: 0, y: -radius, z: 0 }, { x: 0, y: radius, z: 0 }, "#355e51");
  segment(ctx, project, { x: 0, y: 0, z: -radius }, { x: 0, y: 0, z: radius }, "#365a73");
  if (view.clip.enabled) {
    const others = (["x", "y", "z"] as const).filter((axis) => axis !== view.clip.axis);
    const points = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => {
      const point = { x: 0, y: 0, z: 0 };
      point[view.clip.axis] = view.clip.position;
      point[others[0]] = a * radius;
      point[others[1]] = b * radius;
      return point;
    });
    for (let edge = 0; edge < 4; ++edge)
      segment(ctx, project, points[edge], points[(edge + 1) % 4], "#b59665");
  }
  if (view.showProbe) {
    ctx.lineWidth = 1;
    for (const axes of [
      ["x", "y"],
      ["x", "z"],
      ["y", "z"],
    ] as const)
      for (let step = 0; step < 48; ++step) {
        const points = [step, step + 1].map((index) => {
          const point = { ...view.probe.center },
            angle = (index / 48) * Math.PI * 2;
          point[axes[0]] += view.probe.radius * Math.cos(angle);
          point[axes[1]] += view.probe.radius * Math.sin(angle);
          return point;
        });
        segment(ctx, project, points[0], points[1], "#a28d4d");
      }
  }
}
function pane(
  ctx: CanvasRenderingContext2D,
  cloud: Cloud | null,
  view: AtomicView,
  x: number,
  width: number,
  height: number,
  radius: number,
  side: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, 24, width, height - 24);
  ctx.clip();
  const project = projector(view.camera, width, height - 25, x);
  guides(ctx, view, radius, project);
  let painted = 0;
  if (cloud) {
    let maximumDensity = 0;
    if (view.densityBoost)
      for (let index = 0; index < cloud.count; ++index)
        maximumDensity = Math.max(maximumDensity, cloud.records[index * 8 + 3]);
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < cloud.count; ++index) {
      const offset = index * 8,
        point = {
          x: cloud.records[offset],
          y: cloud.records[offset + 1],
          z: cloud.records[offset + 2],
        };
      if (!clipVisible(point, view.clip)) continue;
      const screen = project(point);
      if (!screen || screen.x < x || screen.x > x + width || screen.y < 24 || screen.y > height)
        continue;
      ++painted;
      let color = "96,213,239";
      if (view.palette === "warm" || (view.palette === "phase" && cloud.records[offset + 4] >= 0))
        color = "255,171,113";
      if (view.showProbe && inProbe(point, view.probe)) color = "255,231,142";
      const depth = Math.min(1.8, Math.max(0.35, view.camera.distance / screen.depth));
      let transfer = 1;
      if (view.densityBoost && maximumDensity > 0)
        transfer = Math.sqrt(cloud.records[offset + 3] / maximumDensity);
      ctx.globalAlpha = Math.min(0.75, view.opacity * depth * transfer);
      const size = view.size * Math.sqrt(depth) * 2.8;
      ctx.drawImage(sprite(color), screen.x - size / 2, screen.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "#d9edf0";
  ctx.fillText(
    `${side}: ${cloud ? orbital(cloud.config.orbital).label : "đang chuẩn bị"}`,
    x + 12,
    19,
  );
  if (cloud) {
    ctx.fillStyle = "#91aab5";
    ctx.fillText(
      `${cloud.count.toLocaleString("vi-VN")} mẫu CPU · seed ${cloud.config.seed}`,
      x + 12,
      height - 13,
    );
    if (cloud.config.sampling !== "weighted") {
      ctx.fillStyle = "#ffc183";
      ctx.fillText("SANDBOX SAI PHÂN BỐ", x + 12, 40);
    }
  }
  return painted;
}
export function paintAtomic(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  primary: Cloud | null,
  secondary: Cloud | null,
  view: AtomicView,
): PaintCounts {
  setupCanvas(ctx, size);
  const radius = Math.max(
    primary ? orbital(primary.config.orbital).viewRadius : 12,
    view.compare && secondary ? orbital(secondary.config.orbital).viewRadius : 0,
  );
  const width = view.compare ? size.width / 2 : size.width;
  const first = pane(ctx, primary, view, 0, width, size.height, radius, "A");
  let second = 0;
  if (view.compare) {
    second = pane(ctx, secondary, view, width, width, size.height, radius, "B");
    ctx.strokeStyle = "#304758";
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width, size.height);
    ctx.stroke();
  }
  ctx.fillStyle = "#91aab5";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("a₀ = 1 · phối cảnh · cloud tĩnh, không phải quỹ đạo", 12, size.height - 31);
  return { primary: first, secondary: second };
}
