import { fountainFocalScale, fountainViewBasis } from "./camera.ts";
import { renderColor, type FountainFrame } from "./render-geometry.ts";
import type { FountainScene } from "./scene.ts";

export const fountainFloorY = 0;

export function prepareFountainSurface(frame: FountainFrame, scene: FountainScene, debug: boolean) {
  const camera = scene.camera;
  const key = [...Object.values(camera), debug].join("|");
  if (frame.key === key) {
    frame.pixels.set(frame.surface);
    return;
  }
  frame.depth.fill(Infinity);
  const basis = fountainViewBasis(camera);
  const focal = frame.height * fountainFocalScale;
  for (let y = 0; y < frame.height; y++) {
    const vertical = (frame.height * 0.5 - y - 0.5) / focal;
    const background = y / frame.height;
    for (let x = 0; x < frame.width; x++) {
      const index = y * frame.width + x;
      const horizontal = (x + 0.5 - frame.width * 0.5) / focal;
      const rayX = basis.forward.x + horizontal * basis.right.x + vertical * basis.up.x;
      const rayY = basis.forward.y + horizontal * basis.right.y + vertical * basis.up.y;
      const rayZ = basis.forward.z + horizontal * basis.right.z + vertical * basis.up.z;
      let red = 7 + 7 * background;
      let green = 13 + 10 * background;
      let blue = 24 + 16 * background;
      if (basis.eye.y > fountainFloorY && rayY < -1e-8) {
        const depth = (fountainFloorY - basis.eye.y) / rayY;
        if (depth > 0.1) {
          const worldX = basis.eye.x + rayX * depth;
          const worldZ = basis.eye.z + rayZ * depth;
          const fog = 1 / (1 + depth * 0.035);
          red += (17 - red) * fog;
          green += (28 - green) * fog;
          blue += (42 - blue) * fog;

          // One-metre grid; five-metre lines are stronger. Fade fine lines before they alias.
          const footprint = depth / focal;
          const width = Math.max(0.008, footprint * 0.8);
          const distance = Math.min(
            Math.abs(worldX - Math.round(worldX)),
            Math.abs(worldZ - Math.round(worldZ)),
          );
          const majorDistance = Math.min(
            Math.abs(worldX - 5 * Math.round(worldX / 5)),
            Math.abs(worldZ - 5 * Math.round(worldZ / 5)),
          );
          const density = footprint * Math.max(1, depth / (basis.eye.y - fountainFloorY));
          const fade = Math.max(0, Math.min(1, (0.6 - density) / 0.4));
          const minor = Math.max(0, 1 - distance / width) * fade;
          const major =
            Math.max(0, 1 - majorDistance / width) * Math.max(0, Math.min(1, (3 - density) / 2));
          const line = Math.max(minor * 0.55, major) * fog * (debug ? 1.2 : 0.8);
          red += 32 * line;
          green += 57 * line;
          blue += 72 * line;
          // The plane is a depth reference, not a particle collision surface.
          frame.depth[index] = depth;
        }
      }
      frame.surface[index] = renderColor(red, green, blue);
    }
  }
  frame.key = key;
  frame.pixels.set(frame.surface);
}
