import type { Body3D } from "../barnes-hut-nbody.ts";
import { createLightField, type GalaxyLightField } from "./light-field.ts";

export interface StarStyle {
  red: number;
  green: number;
  blue: number;
  radius: number;
  intensity: number;
  haloRadius?: number;
  diffuse?: number;
}
export interface GalaxyRaster {
  width: number;
  height: number;
  light: Float32Array;
  pixels: Uint8ClampedArray;
  field: GalaxyLightField;
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function createGalaxyRaster(width: number, height: number): GalaxyRaster {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 4096 ||
    height > 4096
  )
    throw Error("Invalid galaxy framebuffer");
  return {
    width,
    height,
    light: new Float32Array(width * height * 3),
    pixels: new Uint8ClampedArray(width * height * 4),
    field: createLightField(width, height),
  };
}
export function starStyle(
  body: Body3D,
  depth: number,
  height: number,
  coreDistance = Math.hypot(body.position.x, body.position.y, body.position.z),
  meanMass = 1,
): StarStyle {
  const speed = Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z);
  const heat = clamp((speed - 0.35) / 0.95, 0, 1);
  const radial = clamp((coreDistance - 0.12) / 0.8, 0, 1);
  const t = radial * radial * (3 - 2 * radial);
  const transition = 4 * t * (1 - t);
  const rank = clamp((body.mass / meanMass - 0.7) / 0.6, 0, 1);
  const bright = rank ** 5;
  const perspective = clamp(4 / depth, 0.45, 2.8);
  const radius = clamp(((0.43 + 0.94 * bright) * perspective * height) / 570, 0.4, 2.4);
  return {
    red: 1 - 0.63 * t + 0.07 * transition,
    green: 0.72 - 0.17 * t - 0.07 * transition,
    blue: 0.38 + 0.62 * t * (0.7 + 0.3 * t),
    radius,
    intensity: (0.25 + 0.15 * rank + 3.25 * bright) * (0.84 + 0.55 * heat),
    haloRadius: clamp(radius * (2.8 + bright), 1.6, 7.4),
    diffuse: 0.85 + 0.36 * rank + 0.17 * heat,
  };
}
// Linear additive light, with one finite splat per actual simulated body.
// These are visualization colors, not a stellar temperature/luminosity model.
export function addStarLight(
  raster: GalaxyRaster,
  centerX: number,
  centerY: number,
  style: StarStyle,
) {
  const reach = style.haloRadius ?? style.radius * 6;
  const minimumX = Math.max(0, Math.floor(centerX - reach));
  const maximumX = Math.min(raster.width - 1, Math.ceil(centerX + reach));
  const minimumY = Math.max(0, Math.floor(centerY - reach));
  const maximumY = Math.min(raster.height - 1, Math.ceil(centerY + reach));
  for (let y = minimumY; y <= maximumY; y++) {
    for (let x = minimumX; x <= maximumX; x++) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      const radiusSquared = dx * dx + dy * dy;
      if (radiusSquared > reach * reach) continue;
      const core = Math.max(0, 1 - radiusSquared / (2.25 * style.radius * style.radius));
      const halo = Math.max(0, 1 - radiusSquared / (reach * reach));
      const intensity = style.intensity * (core * core + 0.055 * halo * halo * halo);
      const offset = (y * raster.width + x) * 3;
      raster.light[offset] += style.red * intensity;
      raster.light[offset + 1] += style.green * intensity;
      raster.light[offset + 2] += style.blue * intensity;
    }
  }
}
export function finishGalaxyRaster(raster: GalaxyRaster) {
  const background = [0.00025, 0.0005, 0.0012];
  for (let index = 0; index < raster.width * raster.height; index++) {
    for (let channel = 0; channel < 3; channel++) {
      const linear = background[channel] + raster.light[index * 3 + channel];
      raster.pixels[index * 4 + channel] = Math.round(255 * Math.sqrt(linear / (1 + linear)));
    }
    raster.pixels[index * 4 + 3] = 255;
  }
}
