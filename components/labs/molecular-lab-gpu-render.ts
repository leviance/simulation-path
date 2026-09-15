import { neighborCellIds, type Pipeline } from "@/lib/labs/molecular-lab-gpu";
import type { CanvasSize } from "./lab-shared";

export function drawMolecularGpu(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  model: Pipeline,
  selected: number,
  stage: number,
  pan: { x: number; y: number },
  zoom: number,
) {
  const { system, grid } = model;
  const scale =
    Math.min((size.width - 70) / system.box.width, (size.height - 75) / system.box.height) * zoom;
  const left = (size.width - system.box.width * scale) / 2 + pan.x;
  const top = (size.height - system.box.height * scale) / 2 + pan.y;
  const screen = (p: { x: number; y: number }) => ({
    x: left + p.x * scale,
    y: top + (system.box.height - p.y) * scale,
  });
  const highlighted = new Set(neighborCellIds(grid, system.box, grid.reference[selected]));
  if (stage >= 5) {
    for (let y = 0; y < grid.cellsY; y += 1) {
      for (let x = 0; x < grid.cellsX; x += 1) {
        const cell = y * grid.cellsX + x;
        const width = (system.box.width / grid.cellsX) * scale;
        const height = (system.box.height / grid.cellsY) * scale;
        ctx.fillStyle = highlighted.has(cell) ? "#164e6380" : "#17203370";
        ctx.fillRect(left + x * width, top + (grid.cellsY - 1 - y) * height, width - 1, height - 1);
      }
    }
  }
  ctx.strokeStyle = "#64748b";
  ctx.strokeRect(left, top, system.box.width * scale, system.box.height * scale);
  const points = system.particles.map((particle, i) => {
    const point = screen(particle.position);
    if (model.candidate) {
      const candidate = screen(model.candidate.particles[i].position);
      ctx.strokeStyle = "#f0abfc";
      ctx.strokeRect(candidate.x - 5, candidate.y - 5, 10, 10);
    }
    ctx.fillStyle = i === selected ? "#fbbf24" : "#67e8f9";
    ctx.beginPath();
    ctx.arc(point.x, point.y, i === selected ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
    return point;
  });
  if (stage >= 4) {
    const point = points[selected];
    ctx.strokeStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.5 * scale, 0, Math.PI * 2);
    ctx.stroke();
    const force = model.force.forces[selected];
    const magnitude = Math.hypot(force.x, force.y);
    if (magnitude > 1e-8) {
      const arrowLength = Math.min(45, magnitude * 35);
      const end = {
        x: point.x + (force.x / magnitude) * arrowLength,
        y: point.y - (force.y / magnitude) * arrowLength,
      };
      ctx.strokeStyle = "#fb7185";
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fillStyle = "#fb7185";
      ctx.fillRect(end.x - 2, end.y - 2, 4, 4);
    }
    if (stage >= 7) {
      const reference = screen(grid.reference[selected]);
      ctx.strokeStyle = "#c4b5fd";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(reference.x, reference.y, 2.9 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "13px monospace";
  ctx.fillText(
    `Canvas CPU · ${system.particles.length} hạt · bank ${model.bank} · bước ${model.steps}`,
    12,
    22,
  );
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Vàng: hạt chọn · tím: ứng viên chưa commit", 12, size.height - 12);
  return points;
}
