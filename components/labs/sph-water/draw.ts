import {
  h,
  support,
  restDensity,
  length,
  subtract,
  type State,
  type Vec2,
} from "@/lib/labs/sph-water";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function viewport(size: Pick<CanvasSize, "width" | "height">) {
  const scale = Math.min(size.width - 48, (size.height - 52) / 0.8);
  return { scale, left: (size.width - scale) / 2, top: (size.height - 0.8 * scale) / 2 };
}
export function fromScreen(point: Vec2, size: Pick<CanvasSize, "width" | "height">): Vec2 {
  const view = viewport(size);
  return { x: (point.x - view.left) / view.scale, y: 0.8 - (point.y - view.top) / view.scale };
}
export function drawWater(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  state: State,
  selected: number,
  stage: number,
  showWalls: boolean,
  densityColor: boolean,
  nozzle: Vec2,
) {
  setupCanvas(ctx, size);
  const view = viewport(size);
  const screen = (p: Vec2) => ({
    x: view.left + p.x * view.scale,
    y: view.top + (0.8 - p.y) * view.scale,
  });
  ctx.strokeStyle = "#7b8baa";
  ctx.beginPath();
  ctx.moveTo(view.left, view.top);
  ctx.lineTo(view.left, view.top + 0.8 * view.scale);
  ctx.lineTo(view.left + view.scale, view.top + 0.8 * view.scale);
  ctx.lineTo(view.left + view.scale, view.top);
  ctx.stroke();
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(view.left, view.top);
  ctx.lineTo(view.left + view.scale, view.top);
  ctx.stroke();
  ctx.setLineDash([]);
  const disk = (p: Vec2, radius: number, color: string) => {
    const s = screen(p);
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  };
  if (stage >= 4 && showWalls) state.walls.forEach((p) => disk(p, 2, "#697086"));
  const inspected = state.particles[selected];
  state.particles.forEach((p, i) => {
    let color = "#46aaf0";
    if (stage >= 4 && densityColor) {
      const compression = Math.max(0, Math.min(1, (p.density / restDensity - 0.7) / 0.6));
      color = `rgb(${50 + 200 * compression},${200 - 100 * compression},240)`;
    }
    disk(p.position, Math.max(3, view.scale * 0.01), color);
    if (
      stage >= 3 &&
      inspected &&
      length(subtract(p.position, inspected.position)) < support &&
      i !== selected
    ) {
      const a = screen(inspected.position),
        b = screen(p.position);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "#e8c15b60";
      ctx.stroke();
    }
  });
  if (stage >= 3 && inspected) {
    const s = screen(inspected.position);
    for (const radius of [h, support]) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius * view.scale, 0, 2 * Math.PI);
      ctx.strokeStyle = "#ffd268";
      ctx.stroke();
    }
  }
  if (stage >= 8) {
    const s = screen(nozzle);
    ctx.beginPath();
    ctx.moveTo(s.x - 8, s.y);
    ctx.lineTo(s.x + 8, s.y);
    ctx.moveTo(s.x, s.y - 8);
    ctx.lineTo(s.x, s.y + 8);
    ctx.strokeStyle = "#ffd268";
    ctx.stroke();
  }
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#c0cade";
  ctx.fillText(
    "World 1 × 0.8 m · y ↑ · trần an toàn nét đứt",
    view.left,
    Math.max(14, view.top - 8),
  );
}
