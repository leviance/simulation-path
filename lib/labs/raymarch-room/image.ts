import {
  add,
  scale,
  subtract,
  dot,
  length,
  normalize,
  clamp,
  makeCameraRay,
  type Ray,
  type Vec3,
} from "./geometry.ts";
import { marchRay, estimateNormal, traceShadow, type MarchResult } from "./tracing.ts";
import type { RoomSession } from "./session.ts";
export const MAX_PREVIEW_PIXELS = 6144;
export function sampleSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1)
    return { width: 1, height: 1 };
  const ratio = Math.min(
    1,
    128 / width,
    128 / height,
    Math.sqrt(MAX_PREVIEW_PIXELS / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * ratio)),
    height: Math.max(1, Math.floor(height * ratio)),
  };
}
const mix = (a: Vec3, b: Vec3, t: number) => add(scale(a, 1 - t), scale(b, t));
export function lightPosition(time: number): Vec3 {
  return { x: -1.2 + 1.8 * Math.sin(time * 0.35), y: 1.7, z: 1.5 + 0.4 * Math.cos(time * 0.35) };
}
export function shadeResult(ray: Ray, result: MarchResult, state: RoomSession): Vec3 {
  if (state.debugView === 1 && state.stage >= 10) {
    const ratio = clamp(result.steps / state.settings.maximumSteps, 0, 1);
    return mix({ x: 0.05, y: 0.16, z: 0.5 }, { x: 1, y: 0.3, z: 0.06 }, ratio);
  }
  if (state.debugView === 2 && state.stage >= 10) {
    const value = result.hit ? 1 : 0;
    return { x: value, y: value, z: value };
  }
  const sky = mix(
    { x: 0.025, y: 0.04, z: 0.065 },
    { x: 0.14, y: 0.2, z: 0.29 },
    ray.direction.y * 0.5 + 0.5,
  );
  const gamma = (p: Vec3): Vec3 => ({
    x: Math.pow(Math.max(p.x, 0), 1 / 2.2),
    y: Math.pow(Math.max(p.y, 0), 1 / 2.2),
    z: Math.pow(Math.max(p.z, 0), 1 / 2.2),
  });
  if (!result.hit) {
    if (["invalidInput", "invalidSample", "stalled"].includes(result.status))
      return gamma({ x: 0.8, y: 0, z: 0.55 });
    return gamma(sky);
  }
  const geometricNormal = estimateNormal(
    result.position,
    state.scene,
    state.settings.normalEpsilon,
  );
  if (length(geometricNormal) < 0.5) return { x: 1, y: 0, z: 0.65 };
  if (state.debugView === 3 && state.stage >= 10)
    return add(scale(geometricNormal, 0.5), { x: 0.5, y: 0.5, z: 0.5 });
  let normal = geometricNormal;
  if (dot(normal, ray.direction) > 0) normal = scale(normal, -1);
  const light = lightPosition(state.stage >= 8 ? state.elapsedSeconds : 0);
  const toLight = subtract(light, result.position),
    lightDistance = length(toLight),
    lightDirection = scale(toLight, 1 / Math.max(lightDistance, 0.0001));
  let visibility = 1;
  if (state.stage >= 8)
    visibility = traceShadow(
      add(result.position, scale(normal, state.settings.hitEpsilon * 3)),
      lightDirection,
      lightDistance,
      state.scene,
    ).visibility;
  let base: Vec3 = { x: 0.08, y: 0.4, z: 0.7 };
  if (result.materialId === 2) base = { x: 0.82, y: 0.27, z: 0.08 };
  if (result.materialId === 3) base = { x: 0.48, y: 0.16, z: 0.68 };
  if (result.materialId === 4) {
    if (normal.y > 0.5) {
      const checker =
        (((Math.floor(result.position.x * 1.5) + Math.floor(result.position.z * 1.5)) % 2) + 2) % 2;
      base = mix({ x: 0.16, y: 0.2, z: 0.25 }, { x: 0.28, y: 0.33, z: 0.39 }, checker);
    } else {
      const t = clamp((normal.x + 1) / 2, 0, 1);
      base = mix({ x: 0.36, y: 0.41, z: 0.48 }, { x: 0.48, y: 0.38, z: 0.29 }, t * t * (3 - 2 * t));
    }
  }
  const diffuse = Math.max(dot(normal, lightDirection), 0),
    halfDirection = normalize(subtract(lightDirection, ray.direction));
  const specular = 0.22 * Math.pow(Math.max(dot(normal, halfDirection), 0), 48);
  const attenuation = 2.4 / (1 + 0.025 * lightDistance * lightDistance);
  const color = add(scale(base, 0.22 + attenuation * diffuse * visibility), {
    x: specular * visibility,
    y: specular * visibility,
    z: specular * visibility,
  });
  return gamma(mix(color, sky, 1 - Math.exp(-0.006 * result.traveled * result.traveled)));
}
export function createImageJob(source: RoomSession, viewportWidth: number, viewportHeight: number) {
  const state = {
    ...source,
    camera: { ...source.camera, position: { ...source.camera.position } },
    scene: { ...source.scene },
    settings: { ...source.settings },
  };
  const size = sampleSize(viewportWidth, viewportHeight);
  const pixels = new Uint8ClampedArray(size.width * size.height * 4);
  let cursor = 0,
    disposed = false;
  return {
    ...size,
    pixels,
    get done() {
      return cursor === size.width * size.height;
    },
    get count() {
      return cursor;
    },
    step(budget = 64) {
      if (disposed) return 0;
      const limit = cursor + clamp(Math.floor(Number.isFinite(budget) ? budget : 1), 1, 128);
      const before = cursor;
      while (cursor < size.width * size.height && cursor < limit) {
        const x = cursor % size.width,
          y = Math.floor(cursor / size.width);
        const ray = makeCameraRay(
          state.camera,
          ((x + 0.5) * viewportWidth) / size.width - 0.5,
          ((y + 0.5) * viewportHeight) / size.height - 0.5,
          viewportWidth,
          viewportHeight,
        );
        const color = shadeResult(ray, marchRay(ray, state.settings, state.scene), state);
        pixels[cursor * 4] = 255 * color.x;
        pixels[cursor * 4 + 1] = 255 * color.y;
        pixels[cursor * 4 + 2] = 255 * color.z;
        pixels[cursor * 4 + 3] = 255;
        cursor++;
      }
      return cursor - before;
    },
    dispose() {
      disposed = true;
    },
  };
}
