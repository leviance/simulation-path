import { add, sub, mul, dot, cross, normalize, clamp, type Vec3 } from "./math.ts";
export interface Camera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
}
export const defaultCamera = (): Camera => ({
  target: { x: 0, y: 2.25, z: 0 },
  yaw: -1.12,
  pitch: 0.22,
  distance: 8.1,
});
export function cameraBasis(camera: Camera) {
  const horizontal = camera.distance * Math.cos(camera.pitch),
    eye = add(camera.target, {
      x: horizontal * Math.cos(camera.yaw),
      y: camera.distance * Math.sin(camera.pitch),
      z: horizontal * Math.sin(camera.yaw),
    });
  const forward = normalize(sub(camera.target, eye)),
    right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: cross(right, forward) };
}
export function projectPoint(p: Vec3, camera: Camera, width: number, height: number) {
  const b = cameraBasis(camera),
    d = sub(p, b.eye),
    depth = dot(d, b.forward),
    scale = height / (2 * Math.tan(0.48) * Math.max(0.05, depth));
  return {
    x: width / 2 + dot(d, b.right) * scale,
    y: height / 2 - dot(d, b.up) * scale,
    depth,
    scale,
    visible: depth > 0.05,
  };
}
export function moveCamera(camera: Camera, dx: number, dy: number, pan = false) {
  if (pan) {
    const b = cameraBasis(camera);
    camera.target = add(
      camera.target,
      add(mul(b.right, -dx * camera.distance * 0.0014), mul(b.up, dy * camera.distance * 0.0014)),
    );
  } else {
    camera.yaw -= dx * 0.007;
    camera.pitch = clamp(camera.pitch + dy * 0.007, -1.4, 1.4);
  }
}
export function zoomCamera(camera: Camera, delta: number) {
  camera.distance = clamp(camera.distance * Math.exp(-delta * 0.13), 3, 18);
}
