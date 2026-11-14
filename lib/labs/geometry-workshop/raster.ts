import { rasterizeMesh, type RasterBuffer, type RasterOptions } from "../shared/mesh-raster.ts";
import type { Camera } from "./camera.ts";
import type { Mesh } from "./mesh.ts";
import type { SurfaceKind } from "./settings.ts";

export {
  createRasterBuffer,
  type RasterBuffer,
  type RasterOptions,
} from "../shared/mesh-raster.ts";

const palette: Record<SurfaceKind, readonly [number, number, number]> = {
  patch: [106, 206, 216],
  torus: [105, 186, 241],
  mobius: [179, 148, 237],
  shell: [239, 173, 104],
  knot: [79, 204, 182],
};

export function rasterize(
  target: RasterBuffer,
  mesh: Mesh,
  camera: Camera,
  options: RasterOptions,
) {
  rasterizeMesh(target, mesh, camera, options, palette[mesh.settings.kind]);
}
