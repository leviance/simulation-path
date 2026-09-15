import {
  add,
  length,
  minimumImage,
  subtract,
  type NeighborList,
  type System,
  type Vec2,
} from "@/lib/labs/neighbor-list-skin";
import { imagePositions } from "@/lib/labs/periodic-molecular-box";
import type { CanvasSize } from "./lab-shared";

export function makeViewport(width: number, height: number) {
  const side = Math.max(80, Math.min(width - 40, height - 50));
  return { left: (width - side) / 2, top: 24, side };
}
export function toScreen(point: Vec2, system: System, viewport: ReturnType<typeof makeViewport>) {
  return {
    x: viewport.left + (point.x / system.box.width) * viewport.side,
    y: viewport.top + (point.y / system.box.height) * viewport.side,
  };
}
export function drawNeighbors(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  system: System,
  list: NeighborList,
  skin: number,
  stage: number,
  grid: boolean,
  stale: boolean,
) {
  const viewport = makeViewport(size.width, size.height);
  const screen = (point: Vec2) => toScreen(point, system, viewport);
  ctx.strokeStyle = "#64748b";
  ctx.strokeRect(viewport.left, viewport.top, viewport.side, viewport.side);
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.left, viewport.top, viewport.side, viewport.side);
  ctx.clip();
  if (stage >= 5 && grid) {
    const radius = system.parameters.cutoff + skin;
    const columns = Math.min(128, Math.floor(system.box.width / radius));
    const rows = Math.min(128, Math.floor(system.box.height / radius));
    ctx.strokeStyle = "#263449";
    for (let x = 1; x < columns; x += 1) {
      ctx.beginPath();
      ctx.moveTo(viewport.left + (x / columns) * viewport.side, viewport.top);
      ctx.lineTo(viewport.left + (x / columns) * viewport.side, viewport.top + viewport.side);
      ctx.stroke();
    }
    for (let y = 1; y < rows; y += 1) {
      ctx.beginPath();
      ctx.moveTo(viewport.left, viewport.top + (y / rows) * viewport.side);
      ctx.lineTo(viewport.left + viewport.side, viewport.top + (y / rows) * viewport.side);
      ctx.stroke();
    }
  }
  const selected = system.particles[0].position;
  // Các vòng ở ô bên cạnh chỉ để vẽ phần đi qua mép hộp.
  for (const image of imagePositions(selected, system.box)) {
    const center = screen(image);
    if (stage >= 2) {
      ctx.strokeStyle = "#fbbf24";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(
        center.x,
        center.y,
        ((system.parameters.cutoff + skin) / system.box.width) * viewport.side,
        ((system.parameters.cutoff + skin) / system.box.height) * viewport.side,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.strokeStyle = "#4ade80";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      (system.parameters.cutoff / system.box.width) * viewport.side,
      (system.parameters.cutoff / system.box.height) * viewport.side,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  if (stage >= 2) {
    for (const pair of list.pairs) {
      if (pair.i !== 0) continue;
      const delta = minimumImage(subtract(system.particles[pair.j].position, selected), system.box);
      ctx.strokeStyle = "#64748b";
      if (stale) ctx.strokeStyle = "#fb7185";
      else if (stage >= 3 && length(delta) < system.parameters.cutoff) ctx.strokeStyle = "#4ade80";
      // Vẽ ở chín ô để đoạn qua biên cũng hiện ở cả hai phía.
      for (const image of imagePositions(selected, system.box)) {
        const a = screen(image);
        const b = screen(add(image, delta));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  for (let i = 0; i < system.particles.length; i += 1) {
    const point = screen(system.particles[i].position);
    ctx.fillStyle = i === 0 ? "#fde047" : "#7dd3fc";
    ctx.beginPath();
    ctx.arc(point.x, point.y, i === 0 ? 7 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "14px system-ui";
  const a = screen(selected);
  ctx.fillText("A", a.x + 10, a.y - 7);
}
