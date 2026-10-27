import type { Body3D } from "../barnes-hut-nbody.ts";
import type { Camera } from "./scene.ts";
import { projectGalaxy } from "./projection.ts";
import { addStarLight, finishGalaxyRaster, starStyle, type GalaxyRaster } from "./appearance.ts";

export function renderGalaxyRaster(
  raster: GalaxyRaster,
  bodies: readonly Body3D[],
  camera: Camera,
) {
  raster.light.fill(0);
  let drawn = 0;
  const cores = bodies.filter((body) => body.mass > 10).map((body) => body.position);
  if (!cores.length) cores.push({ x: 0, y: 0, z: 0 });
  for (const body of bodies) {
    const p = projectGalaxy(body.position, camera, raster.width, raster.height);
    if (!p.visible || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const coreDistance = Math.min(
      ...cores.map((center) =>
        Math.hypot(
          body.position.x - center.x,
          body.position.y - center.y,
          body.position.z - center.z,
        ),
      ),
    );
    const style = starStyle(body, p.depth, raster.height, coreDistance);
    const reach = style.haloRadius ?? style.radius * 6;
    if (p.x < -reach || p.x >= raster.width + reach || p.y < -reach || p.y >= raster.height + reach)
      continue;
    addStarLight(raster, p.x, p.y, style);
    drawn++;
  }
  finishGalaxyRaster(raster);
  return { simulated: bodies.length, drawn };
}
