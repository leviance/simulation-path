import { type Point } from "./model.ts";
import type { Rect } from "./display.ts";

// z-up perspective camera, shared by presentation and camera tests.
export interface SliceCamera {
  yaw: number;
  pitch: number;
  distance: number;
}
export const defaultSliceCamera: SliceCamera = { yaw: 0.72, pitch: 0.44, distance: 6.9 };
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function sliceCameraBasis(camera: SliceCamera) {
  const { yaw, pitch, distance } = camera;
  const eye: Point = [
    Math.sin(yaw) * Math.cos(pitch) * distance,
    -Math.cos(yaw) * Math.cos(pitch) * distance,
    Math.sin(pitch) * distance,
  ];
  const forward: Point = eye.map((v) => -v / distance) as Point;
  const right: Point = [Math.cos(yaw), Math.sin(yaw), 0];
  const up: Point = [
    -Math.sin(yaw) * Math.sin(pitch),
    Math.cos(yaw) * Math.sin(pitch),
    Math.cos(pitch),
  ];
  return { eye, forward, right, up };
}
export function projectSlicePoint(camera: SliceCamera, point: Point, area: Rect) {
  const b = sliceCameraBasis(camera);
  const relative = point.map((v, a) => v - b.eye[a]) as Point;
  const depth = dot(relative, b.forward);
  if (depth <= 0.05) return null;
  const scale = area.height / (0.92 * depth);
  return {
    x: area.x + area.width / 2 + dot(relative, b.right) * scale,
    y: area.y + area.height / 2 - dot(relative, b.up) * scale,
    depth,
  };
}
