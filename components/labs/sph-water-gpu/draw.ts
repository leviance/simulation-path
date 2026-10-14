import {
  length,
  project,
  subtract,
  type Camera,
  type Particle,
  type Plan,
  type Vec3,
} from "@/lib/labs/sph-water-gpu";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function drawWater(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  plan: Plan,
  particles: Particle[],
  density: number[],
  acceleration: Vec3[],
  selected: number,
  camera: Camera,
  stage: number,
  slice: boolean,
) {
  setupCanvas(ctx, size);
  ctx.strokeStyle = "#536174";
  const corners = Array.from({ length: 8 }, (_, i) => ({
    x: i & 1 ? 1 : 0,
    y: i & 2 ? 1 : 0,
    z: i & 4 ? 1 : 0,
  }));
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4])
      if ((i & bit) === 0) {
        const a = project(corners[i], camera, size.width, size.height),
          b = project(corners[i | bit], camera, size.width, size.height);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
  const probe = particles[selected];
  const points = particles
    .map((p, i) => ({ ...project(p.position, camera, size.width, size.height), i }))
    .sort((a, b) => a.z - b.z);
  for (const p of points) {
    if (slice && Math.abs(particles[p.i].position.z - probe.position.z) > plan.spacing / 2)
      continue;
    let color = "#61afef";
    if (stage >= 5) {
      const t = Math.max(0, Math.min(1, (density[p.i] / 1000 - 0.7) / 0.4));
      color = `rgb(${Math.round(38 + 192 * t)},${Math.round(115 + 64 * t)},${Math.round(230 - 153 * t)})`;
    }
    if (stage >= 4 && length(subtract(particles[p.i].position, probe.position)) < plan.support)
      color = "#e5c07b";
    if (p.i === selected) color = "#c678dd";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.i === selected ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const center = project(probe.position, camera, size.width, size.height);
  if (stage >= 4) {
    ctx.strokeStyle = "#c678dd";
    ctx.beginPath();
    ctx.arc(center.x, center.y, plan.support * center.scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (stage >= 6) {
    const maximum = Math.max(0, ...acceleration.map(length));
    if (maximum > 0) {
      ctx.strokeStyle = "#64e1b4";
      const factor = (2 * plan.spacing) / maximum;
      for (const [i, particle] of particles.entries()) {
        if (slice && Math.abs(particle.position.z - probe.position.z) > plan.spacing / 2) continue;
        const a = project(particle.position, camera, size.width, size.height);
        const force = acceleration[i];
        const b = project(
          {
            x: particle.position.x + factor * force.x,
            y: particle.position.y + factor * force.y,
            z: particle.position.z + factor * force.z,
          },
          camera,
          size.width,
          size.height,
        );
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        if (Math.hypot(b.x - a.x, b.y - a.y) < 1) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(b.x - 5 * Math.cos(angle - 0.45), b.y - 5 * Math.sin(angle - 0.45));
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - 5 * Math.cos(angle + 0.45), b.y - 5 * Math.sin(angle + 0.45));
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#64e1b4";
    ctx.fillText("max |a| = " + maximum.toFixed(4) + " m/s² · mũi tên dùng tỉ lệ chung", 16, 65);
  }
  ctx.fillStyle = "#d5dcea";
  ctx.font = "13px sans-serif";
  ctx.fillText("CPU oracle nhỏ · không chạy GPU trong browser", 16, 23);
  ctx.fillText("Kéo để orbit · tím: hạt chọn · vàng: trong support 3D", 16, 44);
}
