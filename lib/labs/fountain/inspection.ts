import { projector } from "./render-geometry.ts";
import { particleAt, type FountainScene } from "./scene.ts";
import type { ParticleAoS } from "./state.ts";

export const maxDrawnDrops = 8_000;
export const maxInspectedDrops = 4_096;

export function displaySlot(sample: number, active: number, sampled: number) {
  return Math.floor((sample * active) / sampled);
}

/** Query the committed snapshot. Reading the remaining lifetime must not advance the solver. */
export function nextExpirySlot(scene: FountainScene) {
  let chosen = -1;
  let smallest = Infinity;
  const count = Math.min(scene.active, maxInspectedDrops);
  for (let slot = 0; slot < count; slot++) {
    const drop = particleAt(scene, slot);
    const remaining = drop.lifetime - drop.age;
    if (remaining < smallest) {
      smallest = remaining;
      chosen = slot;
    }
  }
  return chosen;
}

/** Hit test only shown samples; prefer the nearer drop on equal screen distance. */
export function pickFountainDrop(
  scene: FountainScene,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sampled = Math.min(scene.active, maxDrawnDrops);
  const project = projector(scene.camera, width, height);
  let selected = -1;
  let distanceSquared = 12 * 12;
  let depth = Infinity;
  for (let sample = 0; sample < sampled; sample++) {
    const slot = displaySlot(sample, scene.active, sampled);
    const drop = particleAt(scene, slot);
    if (drop.positionY < 0) continue;
    const point = project({ x: drop.positionX, y: drop.positionY, z: drop.positionZ });
    if (!point || point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) continue;
    const square = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (square < distanceSquared || (square === distanceSquared && point.depth < depth)) {
      selected = slot;
      distanceSquared = square;
      depth = point.depth;
    }
  }
  return selected;
}

export function dropPhase(drop: ParticleAoS) {
  if (drop.positionY < 0) return "Đã xuống dưới mặt lưới";
  if (Math.abs(drop.velocityY) < 0.15) return "Gần đỉnh quỹ đạo";
  return drop.velocityY > 0 ? "Đang bay lên" : "Đang rơi";
}
