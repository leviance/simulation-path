import {
  add,
  imagePositions,
  length,
  minimumImage,
  scale,
  subtract,
  type System,
  type Vec2,
  type Evaluation,
} from "@/lib/labs/periodic-molecular-box";
import type { CanvasSize } from "./lab-shared";

export interface TraceSample {
  time: number;
  wrappedX: number;
  unwrappedX: number;
}

export function makeViewport(width: number, height: number, trace: boolean) {
  const reserved = trace ? 130 : 30;
  const side = Math.max(90, Math.min(width * 0.55, (height - reserved) * 0.65));
  return { left: (width - side) / 2, top: 32 + (height - reserved - side) / 2, side };
}

export function screenToWorld(
  point: Vec2,
  system: System,
  viewport: ReturnType<typeof makeViewport>,
): Vec2 {
  return {
    x: ((point.x - viewport.left) / viewport.side) * system.box.width,
    y: ((point.y - viewport.top) / viewport.side) * system.box.height,
  };
}

export function worldToScreen(
  point: Vec2,
  system: System,
  viewport: ReturnType<typeof makeViewport>,
): Vec2 {
  return {
    x: viewport.left + (point.x / system.box.width) * viewport.side,
    y: viewport.top + (point.y / system.box.height) * viewport.side,
  };
}

function arrow(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, color: string) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  if (Math.hypot(b.x - a.x, b.y - a.y) < 2) return;
  ctx.beginPath();
  ctx.moveTo(b.x - 7 * Math.cos(angle - 0.45), b.y - 7 * Math.sin(angle - 0.45));
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(b.x - 7 * Math.cos(angle + 0.45), b.y - 7 * Math.sin(angle + 0.45));
  ctx.stroke();
}

export function drawPeriodicScene(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  system: System,
  options: {
    images: boolean;
    distances: boolean;
    forces?: Evaluation;
    trace: TraceSample[];
    showTrace: boolean;
  },
) {
  const viewport = makeViewport(size.width, size.height, options.showTrace);
  const screen = (p: Vec2) => worldToScreen(p, system, viewport);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 28, size.width, options.showTrace ? size.height - 153 : size.height - 28);
  ctx.clip();
  if (options.images) {
    ctx.strokeStyle = "#334155";
    ctx.setLineDash([5, 5]);
    for (let iy = -1; iy <= 1; iy += 1)
      for (let ix = -1; ix <= 1; ix += 1) {
        ctx.strokeRect(
          viewport.left + ix * viewport.side,
          viewport.top + iy * viewport.side,
          viewport.side,
          viewport.side,
        );
      }
    ctx.setLineDash([]);
    ctx.fillStyle = "#475569";
    for (const particle of system.particles) {
      for (const position of imagePositions(particle.position, system.box)) {
        const p = screen(position);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.fillStyle = "#142039";
  ctx.fillRect(viewport.left, viewport.top, viewport.side, viewport.side);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(viewport.left, viewport.top, viewport.side, viewport.side);
  if (options.distances && system.particles.length === 2) {
    const a = system.particles[0].position;
    const b = system.particles[1].position;
    const delta = minimumImage(subtract(b, a), system.box);
    arrow(ctx, screen(a), screen(b), "#64748b");
    arrow(ctx, screen(a), screen(add(a, delta)), "#fbbf24");
    // Đoạn tương ứng ở phía bên kia giúp nối hai mép bằng mắt.
    ctx.setLineDash([4, 4]);
    arrow(ctx, screen(subtract(b, delta)), screen(b), "#fbbf24");
    ctx.setLineDash([]);
  }
  for (const [index, particle] of system.particles.entries()) {
    const p = screen(particle.position);
    if (options.forces?.valid && system.particles.length === 2) {
      const force = options.forces.forces[index];
      const offset = scale(force, 0.6 / Math.max(1, length(force)));
      arrow(ctx, p, screen(add(particle.position, offset)), "#f87171");
    }
    ctx.fillStyle = index === 0 ? "#fbbf24" : "#60a5fa";
    ctx.beginPath();
    ctx.arc(p.x, p.y, system.particles.length > 144 ? 2 : 5, 0, Math.PI * 2);
    ctx.fill();
    if (system.particles.length <= 2) {
      ctx.font = "14px system-ui";
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(index === 0 ? "A" : "B", p.x + 8, p.y - 8);
    }
  }
  ctx.restore();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "14px system-ui";
  ctx.fillText("Ô gốc: [0, Lx) × [0, Ly)", 12, 20);
  if (!options.showTrace) return;
  const top = size.height - 102;
  ctx.fillText("x theo thời gian: xanh = wrapped, vàng = unwrapped", 12, top - 12);
  const points = options.trace;
  if (points.length < 2) {
    ctx.fillText("Chạy preset một hạt để thấy đường đi qua biên.", 12, top + 25);
    return;
  }
  const min = Math.min(0, ...points.map((p) => p.unwrappedX));
  const max = Math.max(system.box.width, ...points.map((p) => p.unwrappedX));
  const firstTime = points[0].time;
  const timeSpan = Math.max(1e-6, points.at(-1)!.time - firstTime);
  for (const curve of ["wrappedX", "unwrappedX"] as const) {
    ctx.strokeStyle = curve === "wrappedX" ? "#60a5fa" : "#fbbf24";
    ctx.beginPath();
    points.forEach((sample, index) => {
      const x = 12 + ((sample.time - firstTime) / timeSpan) * (size.width - 24);
      const y = top + 80 - ((sample[curve] - min) / (max - min)) * 70;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
