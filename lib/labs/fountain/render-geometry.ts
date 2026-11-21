import { fountainFocalScale, fountainViewBasis } from "./camera.ts";
import type { Camera } from "./scene.ts";
import { SprayLight } from "./spray.ts";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface RenderVertex {
  x: number;
  y: number;
  depth: number;
  scale: number;
}
export interface FountainFrame {
  width: number;
  height: number;
  pixels: Uint32Array;
  surface: Uint32Array;
  depth: Float32Array;
  spray: SprayLight;
  key: string;
}
export function createFountainFrame(width: number, height: number): FountainFrame {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 2048 ||
    height > 2048
  )
    throw Error("Fountain viewport budget");
  return {
    width,
    height,
    pixels: new Uint32Array(width * height),
    surface: new Uint32Array(width * height),
    depth: new Float32Array(width * height),
    spray: new SprayLight(width, height),
    key: "",
  };
}
// ImageData uses byte order R,G,B,A. This packing is for the Canvas raster, not particle state.
export function renderColor(red: number, green: number, blue: number) {
  return (
    (0xff000000 |
      (Math.min(255, Math.max(0, blue)) << 16) |
      (Math.min(255, Math.max(0, green)) << 8) |
      Math.min(255, Math.max(0, red))) >>>
    0
  );
}
export function projector(camera: Camera, width: number, height: number) {
  const basis = fountainViewBasis(camera),
    focal = height * fountainFocalScale;
  return (point: Vec3): RenderVertex | null => {
    const x = point.x - basis.eye.x,
      y = point.y - basis.eye.y,
      z = point.z - basis.eye.z;
    const depth = x * basis.forward.x + y * basis.forward.y + z * basis.forward.z;
    if (!Number.isFinite(depth) || depth <= 0.1) return null;
    const scale = focal / depth;
    return {
      x: width * 0.5 + (x * basis.right.x + y * basis.right.y + z * basis.right.z) * scale,
      y: height * 0.5 - (x * basis.up.x + y * basis.up.y + z * basis.up.z) * scale,
      depth,
      scale,
    };
  };
}
export function addWaterLight(
  frame: FountainFrame,
  x: number,
  y: number,
  depth: number,
  color: number,
  opacity: number,
) {
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return false;
  const index = y * frame.width + x;
  if (depth > frame.depth[index] + 0.001) return false;
  const previous = frame.pixels[index];
  frame.pixels[index] = renderColor(
    (previous & 255) + (color & 255) * opacity,
    ((previous >>> 8) & 255) + ((color >>> 8) & 255) * opacity,
    ((previous >>> 16) & 255) + ((color >>> 16) & 255) * opacity,
  );
  return true;
}

// Water layers approach the droplet colour; overlapping samples never "burn"
// white as an additive light source would. The faint floor light stays additive.
export function layWater(
  frame: FountainFrame,
  x: number,
  y: number,
  depth: number,
  color: number,
  coverage: number,
) {
  if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) return false;
  const index = y * frame.width + x;
  if (depth > frame.depth[index] + 0.001) return false;
  const previous = frame.pixels[index];
  const alpha = Math.max(0, Math.min(1, coverage));
  const oldR = previous & 255,
    oldG = (previous >>> 8) & 255,
    oldB = (previous >>> 16) & 255;
  frame.pixels[index] = renderColor(
    oldR + alpha * ((color & 255) - oldR),
    oldG + alpha * (((color >>> 8) & 255) - oldG),
    oldB + alpha * (((color >>> 16) & 255) - oldB),
  );
  return true;
}
