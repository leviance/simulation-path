import type { Point, ViewportSize } from "./geometry.ts";

export type Camera = { x: number; y: number; zoom: number };
export const initialCamera: Camera = { x: 0, y: 0, zoom: 55 };

export function cameraScale(camera: Camera) {
  if (!Number.isFinite(camera.zoom) || camera.zoom <= 0) return 55;
  return Math.max(5, Math.min(800, camera.zoom));
}

export function screenToWorld(screen: Point, camera: Camera, size: ViewportSize): Point {
  return {
    x: camera.x + (screen.x - size.width * 0.5) / cameraScale(camera),
    y: camera.y - (screen.y - size.height * 0.5) / cameraScale(camera),
  };
}

export function worldToScreen(world: Point, camera: Camera, size: ViewportSize): Point {
  const relativeX = world.x - camera.x;
  const relativeY = world.y - camera.y;
  return {
    x: size.width * 0.5 + relativeX * cameraScale(camera),
    y: size.height * 0.5 - relativeY * cameraScale(camera),
  };
}

export function panCamera(camera: Camera, deltaPixels: Point): Camera {
  if (!Number.isFinite(deltaPixels.x) || !Number.isFinite(deltaPixels.y)) return camera;
  return {
    ...camera,
    x: camera.x - deltaPixels.x / cameraScale(camera),
    y: camera.y + deltaPixels.y / cameraScale(camera),
  };
}

export function zoomCameraAt(camera: Camera, screen: Point, factor: number, size: ViewportSize) {
  if (
    !Number.isFinite(screen.x) ||
    !Number.isFinite(screen.y) ||
    !Number.isFinite(factor) ||
    factor <= 0
  )
    return { camera, anchorError: 0 };
  const worldBeforeZoom = screenToWorld(screen, camera, size);
  const zoom = Math.max(5, Math.min(800, cameraScale(camera) * factor));
  const next = { ...camera, zoom };
  const worldAfterZoom = screenToWorld(screen, next, size);
  next.x += worldBeforeZoom.x - worldAfterZoom.x;
  next.y += worldBeforeZoom.y - worldAfterZoom.y;
  const restored = screenToWorld(screen, next, size);
  return {
    camera: next,
    anchorError: Math.hypot(restored.x - worldBeforeZoom.x, restored.y - worldBeforeZoom.y),
  };
}

export function gridSpacing(pixelsPerUnit: number) {
  if (!Number.isFinite(pixelsPerUnit) || pixelsPerUnit <= 0) return 1;
  const target = 40 / pixelsPerUnit;
  const power = 10 ** Math.floor(Math.log10(target));
  for (const multiplier of [1, 2, 5, 10]) {
    const step = multiplier * power;
    if (step >= target) return step;
  }
  return power * 10;
}

export function gridValues(min: number, max: number, spacing: number) {
  if (![min, max, spacing].every(Number.isFinite) || spacing <= 0 || max < min) return [];
  const count = Math.ceil((max - min) / spacing) + 1;
  if (count > 256) return [];
  const first = Math.ceil(min / spacing) * spacing;
  return Array.from({ length: count }, (_, index) => first + index * spacing);
}

export function hitCoordinatePoint(
  points: Point[],
  screen: Point,
  camera: Camera,
  size: ViewportSize,
) {
  for (let index = points.length - 1; index >= 0; index--) {
    const point = worldToScreen(points[index], camera, size);
    if (Math.hypot(point.x - screen.x, point.y - screen.y) <= 10) return index;
  }
  return -1;
}

export type CoordinateScene = {
  camera: Camera;
  points: Point[];
  selected: number;
  grabOffset: Point;
  draggingPoint: boolean;
};

export function beginCoordinateDrag(
  scene: CoordinateScene,
  screen: Point,
  size: ViewportSize,
): CoordinateScene {
  const world = screenToWorld(screen, scene.camera, size);
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return scene;
  let selected = hitCoordinatePoint(scene.points, screen, scene.camera, size);
  let points = scene.points;
  if (selected < 0) {
    if (points.length >= 256) return { ...scene, selected: -1, draggingPoint: false };
    points = [...points, world];
    selected = points.length - 1;
  }
  const point = points[selected];
  return {
    ...scene,
    points,
    selected,
    draggingPoint: true,
    grabOffset: { x: point.x - world.x, y: point.y - world.y },
  };
}

export function moveCoordinatePoint(
  scene: CoordinateScene,
  screen: Point,
  size: ViewportSize,
): CoordinateScene {
  if (!scene.draggingPoint || scene.selected < 0) return scene;
  const world = screenToWorld(screen, scene.camera, size);
  if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) return scene;
  const points = scene.points.map((point, index) =>
    index === scene.selected
      ? { x: world.x + scene.grabOffset.x, y: world.y + scene.grabOffset.y }
      : point,
  );
  return { ...scene, points };
}
