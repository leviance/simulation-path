import { clamp, type Point, type ViewportSize } from "./geometry.ts";

export type Camera = { x: number; y: number; zoom: number };

export function screenToWorld(point: Point, camera: Camera, size: ViewportSize): Point {
  return {
    x: (point.x - size.width / 2) / camera.zoom + camera.x,
    y: -(point.y - size.height / 2) / camera.zoom + camera.y,
  };
}

export function worldToScreen(point: Point, camera: Camera, size: ViewportSize): Point {
  return {
    x: size.width / 2 + (point.x - camera.x) * camera.zoom,
    y: size.height / 2 - (point.y - camera.y) * camera.zoom,
  };
}

export function zoomCameraAt(camera: Camera, point: Point, factor: number, size: ViewportSize) {
  const before = screenToWorld(point, camera, size);
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const zoom = clamp(camera.zoom * safeFactor, 20, 160);
  const next: Camera = {
    x: before.x - (point.x - size.width / 2) / zoom,
    y: before.y + (point.y - size.height / 2) / zoom,
    zoom,
  };
  const after = screenToWorld(point, next, size);
  return {
    camera: next,
    anchorError: Math.hypot(after.x - before.x, after.y - before.y),
  };
}
