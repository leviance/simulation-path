import { particleAt, type FountainScene } from "./scene.ts";
import type { ParticleAoS } from "./state.ts";
import {
  addWaterLight,
  layWater,
  projector,
  renderColor,
  type FountainFrame,
} from "./render-geometry.ts";
import { prepareFountainSurface } from "./render-surface.ts";
import { displaySlot, maxDrawnDrops } from "./inspection.ts";

export function fountainParticleColor(particle: ParticleAoS) {
  const life = Math.max(0, Math.min(1, particle.age / particle.lifetime)),
    young = Math.min(1, life / 0.4),
    old = Math.max(0, (life - 0.4) / 0.6);
  const glint = particle.hue ** 4;
  return renderColor(
    207 - 100 * young - 24 * old + 46 * glint,
    227 - 59 * young - 26 * old + 27 * glint,
    235 - 36 * young - 26 * old + 20 * glint,
  );
}

function floorLight(
  frame: FountainFrame,
  project: ReturnType<typeof projector>,
  drop: ParticleAoS,
) {
  if (drop.positionY < 0 || drop.positionY > 0.6) return;
  const point = project({ x: drop.positionX, y: 0, z: drop.positionZ });
  if (!point || point.x < 0 || point.y < 0 || point.x >= frame.width || point.y >= frame.height)
    return;
  const x = Math.floor(point.x),
    y = Math.floor(point.y);
  if (!Number.isFinite(frame.depth[y * frame.width + x])) return;
  const radius = Math.floor(Math.max(2, Math.min(8, point.scale * 0.09)));
  const strength = 0.048 * (1 - drop.positionY / 0.6);
  const color = renderColor(63, 177, 190);
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const falloff = 1 - (dx * dx + 2 * dy * dy) / (radius * radius);
      if (falloff > 0)
        addWaterLight(frame, x + dx, y + dy, point.depth - 0.12, color, strength * falloff);
    }
}

function drawParticle(
  frame: FountainFrame,
  scene: FountainScene,
  project: ReturnType<typeof projector>,
  particle: ParticleAoS,
  opacity: number,
) {
  if (particle.positionY < 0) return false;
  const point = project({ x: particle.positionX, y: particle.positionY, z: particle.positionZ });
  if (!point || point.x < 0 || point.y < 0 || point.x >= frame.width || point.y >= frame.height)
    return false;
  if (point.depth > frame.depth[Math.floor(point.y) * frame.width + Math.floor(point.x)] + 0.001)
    return false;
  const life = Math.max(0, Math.min(1, particle.age / particle.lifetime)),
    radius = Math.max(1.45, Math.min(2.8, point.scale * (0.038 - 0.009 * life)));
  const color = fountainParticleColor(particle);
  const depthFade = Math.max(0.45, Math.min(1.2, scene.camera.distance / point.depth));
  const alpha = opacity * depthFade;
  const exposure = 1 / 48,
    tail = project({
      x: particle.positionX - particle.velocityX * exposure,
      y: particle.positionY - particle.velocityY * exposure,
      z: particle.positionZ - particle.velocityZ * exposure,
    });
  if (tail) {
    const dx = tail.x - point.x,
      dy = tail.y - point.y,
      length = Math.hypot(dx, dy),
      samples = Math.floor(Math.min(8, length));
    for (let sample = 1; sample <= samples; sample++) {
      const t = sample / Math.max(1, length);
      layWater(
        frame,
        Math.floor(point.x + dx * t),
        Math.floor(point.y + dy * t),
        point.depth,
        color,
        alpha * 0.62 * (1 - 0.42 * t),
      );
    }
  }
  let visible = false;
  const reach = Math.ceil(radius);
  for (let y = Math.floor(point.y) - reach; y <= Math.floor(point.y) + reach; y++)
    for (let x = Math.floor(point.x) - reach; x <= Math.floor(point.x) + reach; x++) {
      const dx = x + 0.5 - point.x,
        dy = y + 0.5 - point.y,
        coverage = 1 - (dx * dx + dy * dy) / (radius * radius);
      if (coverage > 0) {
        const squared = coverage * coverage,
          softCore = 0.7 * squared + 1.8 * squared * squared * squared * squared;
        visible = layWater(frame, x, y, point.depth, color, alpha * softCore) || visible;
      }
    }
  if (visible) frame.spray.record(point.x, point.y, 0.4 * depthFade);
  return visible;
}
export function renderFountainFrame(
  frame: FountainFrame,
  scene: FountainScene,
  debug = false,
  drawBudget = maxDrawnDrops,
  inspect = debug,
) {
  if (!Number.isInteger(drawBudget) || drawBudget < 0 || drawBudget > 20000)
    throw Error("Fountain draw budget");
  prepareFountainSurface(frame, scene, debug);
  frame.spray.clear();
  const sampled = Math.min(scene.active, drawBudget),
    // The web plots a much smaller sample than the desktop. Size/radiance only
    // affect its exposure; the loop still reads the actual simulated droplets.
    opacity = Math.max(0.25, Math.min(0.9, 62 / Math.sqrt(Math.max(1, sampled))));
  const project = projector(scene.camera, frame.width, frame.height);
  let rendered = 0;
  for (let sample = 0; sample < sampled; sample++) {
    const index = displaySlot(sample, scene.active, sampled);
    const drop = particleAt(scene, index);
    if (sample % 4 === 0) floorLight(frame, project, drop);
    if (drawParticle(frame, scene, project, drop, opacity)) rendered++;
  }
  frame.spray.develop(frame.pixels, frame.width, frame.height);
  if (inspect && scene.selected < scene.active) {
    const selected = particleAt(scene, scene.selected),
      point =
        selected.positionY < 0
          ? null
          : project({ x: selected.positionX, y: selected.positionY, z: selected.positionZ });
    if (point)
      for (let step = 0; step < 40; step++) {
        const angle = (step * Math.PI) / 20;
        addWaterLight(
          frame,
          Math.floor(point.x + 8 * Math.cos(angle)),
          Math.floor(point.y + 8 * Math.sin(angle)),
          point.depth,
          renderColor(255, 192, 85),
          1,
        );
      }
  }
  return { sampled, rendered };
}
