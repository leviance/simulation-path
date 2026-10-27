import { particleAt, type FountainScene } from "./scene.ts";
import type { ParticleAoS } from "./state.ts";
import { addWaterLight, projector, renderColor, type FountainFrame } from "./render-geometry.ts";
import { prepareFountainSurface } from "./render-surface.ts";

export function fountainParticleColor(particle: ParticleAoS) {
  const life = Math.max(0, Math.min(1, particle.age / particle.lifetime)),
    young = Math.min(1, life / 0.4),
    old = Math.max(0, (life - 0.4) / 0.6);
  return renderColor(
    228 - 167 * young + 5 * particle.hue,
    250 - 65 * young - 45 * old,
    255 - 25 * old,
  );
}
function drawParticle(
  frame: FountainFrame,
  scene: FountainScene,
  project: ReturnType<typeof projector>,
  particle: ParticleAoS,
  opacity: number,
) {
  const point = project({ x: particle.positionX, y: particle.positionY, z: particle.positionZ });
  if (!point || point.x < 0 || point.y < 0 || point.x >= frame.width || point.y >= frame.height)
    return false;
  if (point.depth > frame.depth[Math.floor(point.y) * frame.width + Math.floor(point.x)] + 0.001)
    return false;
  const life = Math.max(0, Math.min(1, particle.age / particle.lifetime)),
    radius = Math.max(1.1, Math.min(2.4, point.scale * (0.027 - 0.009 * life)));
  const color = fountainParticleColor(particle),
    alpha = opacity * Math.max(0.45, Math.min(1.2, scene.camera.distance / point.depth));
  const exposure = 1 / 90,
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
      addWaterLight(
        frame,
        Math.floor(point.x + dx * t),
        Math.floor(point.y + dy * t),
        point.depth,
        color,
        alpha * 0.18,
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
        visible = addWaterLight(frame, x, y, point.depth, color, alpha * softCore) || visible;
      }
    }
  return visible;
}
export function renderFountainFrame(
  frame: FountainFrame,
  scene: FountainScene,
  debug = false,
  drawBudget = 8000,
) {
  if (!Number.isInteger(drawBudget) || drawBudget < 0 || drawBudget > 20000)
    throw Error("Fountain draw budget");
  prepareFountainSurface(frame, scene, debug);
  const sampled = Math.min(scene.active, drawBudget),
    opacity = Math.max(0.2, Math.min(0.8, 30 / Math.sqrt(Math.max(1, sampled))));
  const project = projector(scene.camera, frame.width, frame.height);
  let rendered = 0;
  for (let sample = 0; sample < sampled; sample++) {
    const index = Math.floor((sample * scene.active) / sampled);
    if (drawParticle(frame, scene, project, particleAt(scene, index), opacity)) rendered++;
  }
  if (debug && scene.selected < scene.active) {
    const selected = particleAt(scene, scene.selected),
      point = project({ x: selected.positionX, y: selected.positionY, z: selected.positionZ });
    if (point)
      for (let step = 0; step < 40; step++) {
        const angle = (step * Math.PI) / 20;
        addWaterLight(
          frame,
          Math.floor(point.x + 8 * Math.cos(angle)),
          Math.floor(point.y + 8 * Math.sin(angle)),
          point.depth,
          renderColor(255, 255, 255),
          0.8,
        );
      }
  }
  return { sampled, rendered };
}
