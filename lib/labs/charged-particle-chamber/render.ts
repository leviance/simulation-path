import { mul, length, position, velocity, projectPoint, type Vec3 } from "./math";
import type { ChamberView } from "./controller";

const warm = "#ff9b59",
  cool = "#5ed9ef",
  gold = "#ffe5a1";
const glyphs = new Map<string, HTMLCanvasElement>();

function sphere(color: string) {
  const cached = glyphs.get(color);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(18, 15, 1, 25, 25, 22);
    gradient.addColorStop(0, "#fff5df");
    gradient.addColorStop(0.2, color);
    gradient.addColorStop(1, "#07121d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  glyphs.set(color, canvas);
  return canvas;
}

export function renderChamber(
  ctx: CanvasRenderingContext2D,
  state: ChamberView,
  width: number,
  height: number,
) {
  const project = (p: Vec3) => projectPoint(p, state.camera, width, height);
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#102331");
  background.addColorStop(0.5, "#050d19");
  background.addColorStop(1, "#0c1d2a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  const line = (a: Vec3, b: Vec3, color: string, thickness = 1) => {
    const p = project(a),
      q = project(b);
    if (p.depth <= 0.05 || q.depth <= 0.05) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  };
  for (let value = -12; value <= 18; value += 1) {
    const color = value % 5 === 0 ? "#375367" : "#1b303f";
    line({ x: value, y: -0.15, z: -12 }, { x: value, y: -0.15, z: 18 }, color);
    line({ x: -12, y: -0.15, z: value }, { x: 18, y: -0.15, z: value }, color);
  }
  for (let value = 0; value <= 12; value += 2) {
    line({ x: -6, y: value, z: -6 }, { x: -6, y: value, z: 8 }, "#172b3a");
    line({ x: -6, y: 0, z: value - 6 }, { x: -6, y: 12, z: value - 6 }, "#172b3a");
  }
  const origin = { x: 0, y: 0, z: 0 };
  const arrow = (vector: Vec3, label: string, color: string) => {
    const p = project(origin),
      end = project(vector);
    line(origin, vector, color, 2);
    if (end.depth <= 0.05 || p.depth <= 0.05 || length(vector) < 1e-7) return;
    const angle = Math.atan2(end.y - p.y, end.x - p.x);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 9 * Math.cos(angle - 0.45), end.y - 9 * Math.sin(angle - 0.45));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 9 * Math.cos(angle + 0.45), end.y - 9 * Math.sin(angle + 0.45));
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = "12px system-ui";
    ctx.fillText(label, end.x + 6, end.y - 6);
  };
  arrow({ x: 3, y: 0, z: 0 }, "X", "#e2797f");
  arrow({ x: 0, y: 3, z: 0 }, "Y", "#7fd6a9");
  arrow({ x: 0, y: 0, z: 3 }, "Z", "#8ba9ed");
  arrow(mul(state.active.fields.electric, 2), "E", "#f39fd0");
  arrow(mul(state.active.fields.magnetic, 2), "B", "#7bf2c6");

  type Item = { depth: number; paint: () => void };
  const items: Item[] = [];
  if (state.showTrails)
    state.trails.forEach((trail, slot) => {
      const selected = slot === state.trails.length - 1;
      for (let index = 1; index < trail.length; ++index) {
        const a = project(trail[index - 1]),
          b = project(trail[index]);
        if (a.depth <= 0.05 || b.depth <= 0.05) continue;
        items.push({
          depth: (a.depth + b.depth) * 0.5,
          paint: () => {
            ctx.globalAlpha = (0.1 + (0.65 * index) / trail.length) * (selected ? 1 : 0.65);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = selected
              ? gold
              : (slot % 2 === 0) === state.active.fields.chargeScale >= 0
                ? warm
                : cool;
            ctx.lineWidth = selected ? 2.5 : 1.1;
            ctx.stroke();
            ctx.globalAlpha = 1;
          },
        });
      }
    });
  const speedPalette = ["#539ce4", "#54c3d9", "#79d6c1", "#bdcf7e", "#f0bb65", "#ff9b59"];
  state.particles.forEach((particle, id) => {
    const p = project(position(particle));
    if (!p.visible) return;
    let color =
      particle.positionCharge.w * state.active.fields.chargeScale === 0
        ? "#b1bdc7"
        : particle.positionCharge.w * state.active.fields.chargeScale > 0
          ? warm
          : cool;
    if (state.bySpeed) color = speedPalette[Math.min(5, Math.floor(length(velocity(particle))))];
    const selected = id === state.selected;
    const radius = Math.max(1.2, Math.min(11, p.scale * (selected ? 0.09 : 0.05)));
    items.push({
      depth: p.depth,
      paint: () => {
        ctx.globalAlpha = Math.max(0.3, Math.min(1, 25 / p.depth));
        ctx.drawImage(sphere(color), p.x - radius, p.y - radius, radius * 2, radius * 2);
        ctx.globalAlpha = 1;
        if (selected) {
          ctx.strokeStyle = gold;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = gold;
          ctx.font = "12px system-ui";
          ctx.fillText(`ID ${id}`, p.x + radius + 8, p.y - 8);
        }
      },
    });
  });
  items.sort((a, b) => b.depth - a.depth);
  for (const item of items) item.paint();
  ctx.fillStyle = "#d9e8f4";
  ctx.font = "12px system-ui";
  ctx.fillText(
    `${state.particles.length} mẫu CPU · t = ${state.clock.simulatedSeconds.toFixed(3)} s · ${state.integrator.toUpperCase()}`,
    16,
    height - 36,
  );
  ctx.fillStyle = "#90acbf";
  ctx.fillText(
    state.bySpeed
      ? "Tốc độ 0–5: xanh → vàng cam"
      : "q > 0: cam · q < 0: xanh · q = 0: xám · chọn: viền vàng",
    16,
    height - 16,
  );
  // No simulation time appears in the projection: camera changes presentation only.
}
