import {
  add,
  subtract,
  scale,
  cross,
  dot,
  unit,
  clamp,
  type Vec3,
  type Matching,
  type Easing,
  type Path,
} from "./math.ts";
import { defaultSettings, type Settings } from "./session.ts";

export const modes = [
  "first",
  "area",
  "sampling",
  "matching",
  "timeline",
  "buffers",
  "compute",
  "generation",
  "inspector",
  "showcase",
] as const;
export type MorphMode = (typeof modes)[number];
export function morphMode(value: string): MorphMode {
  return modes.find((mode) => mode === value) ?? "showcase";
}
export const shapeNames = { sphere: "Cầu", torus: "Xuyến", knot: "Nút thắt" };
export interface Camera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
}
export interface View {
  camera: Camera;
  matching: Matching;
  easing: Easing;
  path: Path;
  heat: boolean;
  paths: boolean;
}
export const defaultCamera = (): Camera => ({
  target: { x: 0, y: 0.2, z: 0 },
  yaw: -0.78,
  pitch: 0.44,
  distance: 7.4,
});
export function initialSettings(mode: MorphMode): Settings {
  return {
    ...defaultSettings,
    count: mode === "first" ? 127 : 2048,
    target: mode === "first" ? "torus" : "knot",
    sampling: mode === "first" ? "triangle" : "area",
  };
}
export function initialView(mode: MorphMode): View {
  return {
    camera: defaultCamera(),
    matching: mode === "first" ? "random" : "spatial",
    easing: mode === "first" ? "linear" : "smooth",
    path: ["timeline", "buffers", "compute", "generation", "inspector", "showcase"].includes(mode)
      ? "flow"
      : "straight",
    heat: mode === "sampling" || mode === "inspector",
    paths: mode === "matching" || mode === "inspector",
  };
}
export function orbit(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    yaw: camera.yaw - dx * 0.007,
    pitch: clamp(camera.pitch + dy * 0.007, -1.47, 1.47),
  };
}
function basis(camera: Camera) {
  const horizontal = camera.distance * Math.cos(camera.pitch);
  const eye = add(camera.target, {
    x: horizontal * Math.cos(camera.yaw),
    y: camera.distance * Math.sin(camera.pitch),
    z: horizontal * Math.sin(camera.yaw),
  });
  const forward = unit(subtract(camera.target, eye));
  const right = unit(cross(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: cross(right, forward) };
}
export function pan(camera: Camera, dx: number, dy: number): Camera {
  const { right, up } = basis(camera);
  return {
    ...camera,
    target: add(
      add(camera.target, scale(right, -dx * camera.distance * 0.0014)),
      scale(up, dy * camera.distance * 0.0014),
    ),
  };
}
export function zoom(camera: Camera, wheel: number): Camera {
  return { ...camera, distance: clamp(camera.distance * Math.exp(-wheel * 0.14), 0.3, 40) };
}
export function projector(camera: Camera, width: number, height: number) {
  const frame = basis(camera);
  const focal = (height * 0.5) / Math.tan(0.42);
  return (point: Vec3) => {
    const delta = subtract(point, frame.eye);
    const z = dot(delta, frame.forward);
    if (z <= 0.025 || z > 100) return null;
    return {
      x: width * 0.5 + (dot(delta, frame.right) * focal) / z,
      y: height * 0.5 - (dot(delta, frame.up) * focal) / z,
      z,
    };
  };
}
