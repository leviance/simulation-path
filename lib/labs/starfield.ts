import type { Vec3 } from "./normal.ts";
import {
  projectPerspective,
  validLens,
  verticalFocalScale,
  type PointViewport,
} from "./projection-point.ts";
import type { PointScene } from "./projection-scene.ts";

// Cùng seed, cùng thứ tự rút mẫu với C++: W/S chỉ có thể đổi camera.
function makeStarCatalog(): readonly Readonly<Vec3>[] {
  const stars: Vec3[] = [
    { x: 1, y: 0.6, z: 4 },
    { x: 0, y: 0, z: 10 },
  ];
  let seed = 1066;
  const sample = () => {
    seed = (73 * seed + 19) % 9973;
    return seed / 9973;
  };
  for (let i = 2; i < 96; ++i) {
    const depth = 2.8 + 13 * sample();
    const x = (2 * sample() - 1) * 0.92 * depth;
    const y = (2 * sample() - 1) * 0.52 * depth;
    const bandStart = 6 * ((i - 2) % 3);
    stars.push({ x, y, z: bandStart + depth });
  }
  for (const star of stars) Object.freeze(star);
  return Object.freeze(stars);
}

export const starCatalog = makeStarCatalog();
const tones = ["218, 233, 255", "175, 206, 255", "244, 246, 255", "215, 217, 255"] as const;

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  scene: PointScene,
  viewport: PointViewport,
) {
  if (!validLens(scene.lens, viewport)) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  const focalPixels = 0.5 * viewport.height * verticalFocalScale(scene.lens);
  for (const [i, star] of starCatalog.entries()) {
    const hit = projectPerspective(star, scene.camera, scene.lens, viewport);
    if (hit.status !== "visible" || !hit.screen) continue;
    const worldRadius = 0.025 + 0.006 * (i % 5);
    const radius = Math.max(1, Math.min(5, (focalPixels * worldRadius) / hit.cameraPoint.z));
    const extent = radius * 2.7;
    const { x, y } = hit.screen;
    const rgb = i === 0 ? "255, 202, 128" : tones[i % tones.length];
    const glow = ctx.createRadialGradient(x, y, 0, x, y, extent);
    glow.addColorStop(0, `rgba(${rgb}, 1)`);
    glow.addColorStop(0.2, `rgba(${rgb}, 1)`);
    glow.addColorStop(0.36, `rgba(${rgb}, 0.50)`);
    glow.addColorStop(0.62, `rgba(${rgb}, 0.08)`);
    glow.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, extent, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
