import { projectPerspective, screenToCameraAtDepth } from "./projection-point.ts";
import type { RasterTriangle, BarycentricWeights } from "./triangle-raster.ts";
export interface ScenePoint {
  x: number;
  y: number;
  z: number;
}
export interface RasterScene {
  world: ScenePoint[];
  palette: number[][];
  camera: { position: ScenePoint };
  fov: number;
  selected: number;
  debug: boolean;
  paused: boolean;
  limit: number;
}
export const initialRasterScene = (): RasterScene => ({
  world: [
    { x: -1.4, y: 1.2, z: 4 },
    { x: 1.6, y: -1, z: 5.5 },
    { x: -1.4, y: -1, z: 6.5 },
  ],
  palette: [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ],
  camera: { position: { x: 0, y: 0, z: 0 } },
  fov: Math.PI / 3,
  selected: 0,
  debug: true,
  paused: true,
  limit: Infinity,
});
export const rasterSceneViewport = (s: RasterScene) => ({
  x: 0,
  y: 0,
  width: 330,
  height: s.debug ? 180 : 240,
});
export const rasterSceneLens = (s: RasterScene) => ({
  verticalFovRadians: s.fov,
  nearPlane: 0.5,
  farPlane: 20,
});
export function rasterSceneTriangle(s: RasterScene): RasterTriangle | null {
  const points = s.world.map(
    (p) => projectPerspective(p, s.camera, rasterSceneLens(s), rasterSceneViewport(s)).screen,
  );
  if (points.length !== 3 || points.some((p) => p === null)) return null;
  return { a: points[0]!, b: points[1]!, c: points[2]! };
}
export function rasterScenePreset(index: number): RasterScene {
  const s = initialRasterScene();
  if (index === 1) {
    [s.world[1], s.world[2]] = [s.world[2], s.world[1]];
    [s.palette[1], s.palette[2]] = [s.palette[2], s.palette[1]];
  }
  if (index === 2)
    s.world = [
      { x: -1, y: -1, z: 5 },
      { x: 0, y: 0, z: 5 },
      { x: 1, y: 1, z: 5 },
    ];
  if (index === 3) s.world[0].z = 0;
  return s;
}
export type SceneEdit = "cameraX" | "cameraZ" | "fov" | "vertexX" | "vertexY" | "vertexZ";
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function editRasterScene(s: RasterScene, key: SceneEdit, value: number): RasterScene {
  if (!Number.isFinite(value)) return s;
  const next = { ...s, paused: true, limit: Infinity };
  if (key === "fov")
    return { ...next, fov: clamp(value, (40 * Math.PI) / 180, (100 * Math.PI) / 180) };
  if (key === "cameraX" || key === "cameraZ") {
    const axis = key === "cameraX" ? "x" : "z";
    return {
      ...next,
      camera: {
        position: {
          ...s.camera.position,
          [axis]: clamp(value, axis === "x" ? -1.5 : -1, axis === "x" ? 1.5 : 1),
        },
      },
    };
  }
  const axis = key === "vertexX" ? "x" : key === "vertexY" ? "y" : "z";
  const world = s.world.map((p) => ({ ...p }));
  if (!world[s.selected]) return s;
  world[s.selected][axis] = clamp(
    value,
    axis === "z" ? 2.5 : axis === "x" ? -6 : -4,
    axis === "z" ? 10 : axis === "x" ? 6 : 4,
  );
  return { ...next, world };
}
export function dragRasterScene(
  s: RasterScene,
  index: number,
  screen: { x: number; y: number },
  depth: number,
): RasterScene {
  if (!s.world[index]) return s;
  const p = screenToCameraAtDepth(screen, depth, rasterSceneLens(s), rasterSceneViewport(s));
  if (!p) return s;
  const world = s.world.map((p) => ({ ...p }));
  world[index] = {
    x: clamp(p.x + s.camera.position.x, -6, 6),
    y: clamp(p.y + s.camera.position.y, -4, 4),
    z: s.world[index].z,
  };
  return { ...s, world, selected: index, paused: true, limit: Infinity };
}
export function rasterSceneRgb(s: RasterScene, w: BarycentricWeights) {
  const weights = [w.a, w.b, w.c];
  return [0, 1, 2].map((channel) =>
    Math.round(
      clamp(
        weights.reduce((total, value, i) => total + value * s.palette[i][channel], 0),
        0,
        255,
      ),
    ),
  );
}
