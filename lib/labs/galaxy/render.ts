import type { Body3D } from "../barnes-hut-nbody.ts";
import type { Camera } from "./scene.ts";
import { projectGalaxy } from "./projection.ts";
import { addStarLight, finishGalaxyRaster, starStyle, type GalaxyRaster } from "./appearance.ts";
import { developField, exposeStar } from "./light-field.ts";

export function renderGalaxyRaster(
  raster: GalaxyRaster,
  bodies: readonly Body3D[],
  camera: Camera,
) {
  raster.light.fill(0);
  raster.field.detail.fill(0);
  let drawn = 0;
  const cores = [];
  let discMass = 0,
    stars = 0;
  for (const body of bodies) {
    if (body.mass > 10) cores.push(body.position);
    else {
      discMass += body.mass;
      ++stars;
    }
  }
  const meanMass = stars ? discMass / stars : 1;
  if (!cores.length) cores.push({ x: 0, y: 0, z: 0 });
  for (const body of bodies) {
    const p = projectGalaxy(body.position, camera, raster.width, raster.height);
    if (!p.visible || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    let closestSquared = Infinity;
    for (const center of cores) {
      const dx = body.position.x - center.x,
        dy = body.position.y - center.y,
        dz = body.position.z - center.z;
      closestSquared = Math.min(closestSquared, dx * dx + dy * dy + dz * dz);
    }
    const style = starStyle(body, p.depth, raster.height, Math.sqrt(closestSquared), meanMass);
    const reach = 9 * raster.field.cell;
    if (p.x < -reach || p.x >= raster.width + reach || p.y < -reach || p.y >= raster.height + reach)
      continue;
    addStarLight(raster, p.x, p.y, style);
    const flux = style.diffuse ?? 1;
    exposeStar(raster.field, p.x, p.y, style.red * flux, style.green * flux, style.blue * flux);
    drawn++;
  }
  if (drawn) developField(raster.field, raster.light, raster.width, raster.height);
  finishGalaxyRaster(raster);
  return { simulated: bodies.length, drawn };
}
