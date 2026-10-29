export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Ray {
  origin: Vec3;
  direction: Vec3;
}
export interface Camera {
  position: Vec3;
  yaw: number;
  pitch: number;
  verticalFieldOfViewRadians: number;
}
export const DEFAULT_CAMERA: Camera = {
  position: { x: 0, y: 1.1, z: 6.1 },
  yaw: 0,
  pitch: -0.14,
  verticalFieldOfViewRadians: Math.PI / 3,
};
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, factor: number): Vec3 => ({
  x: a.x * factor,
  y: a.y * factor,
  z: a.z * factor,
});
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const finite = (p: Vec3) =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
export const length = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
export function normalize(p: Vec3): Vec3 {
  const magnitude = length(p);
  if (!Number.isFinite(magnitude) || magnitude < 1e-12) return { x: 0, y: 0, z: 0 };
  return scale(p, 1 / magnitude);
}
export const validRay = (ray: Ray) =>
  finite(ray.origin) && finite(ray.direction) && Math.abs(length(ray.direction) - 1) <= 1e-6;
export const cameraForward = (camera: Camera): Vec3 => ({
  x: Math.sin(camera.yaw) * Math.cos(camera.pitch),
  y: Math.sin(camera.pitch),
  z: -Math.cos(camera.yaw) * Math.cos(camera.pitch),
});
export const cameraRight = (camera: Camera) =>
  normalize(cross(cameraForward(camera), { x: 0, y: 1, z: 0 }));
export const cameraUp = (camera: Camera) =>
  normalize(cross(cameraRight(camera), cameraForward(camera)));
export function validCamera(camera: Camera) {
  return (
    finite(camera.position) &&
    Number.isFinite(camera.yaw) &&
    Number.isFinite(camera.pitch) &&
    Math.abs(camera.pitch) <= 1.45 &&
    Number.isFinite(camera.verticalFieldOfViewRadians) &&
    camera.verticalFieldOfViewRadians >= 0.2 &&
    camera.verticalFieldOfViewRadians <= 2.8
  );
}
export function makeCameraRay(
  camera: Camera,
  x: number,
  y: number,
  width: number,
  height: number,
): Ray {
  if (
    !validCamera(camera) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    width > 16384 ||
    height > 16384
  )
    return { origin: camera.position, direction: { x: 0, y: 0, z: 0 } };
  const ndcX = (2 * (x + 0.5)) / width - 1;
  const ndcY = 1 - (2 * (y + 0.5)) / height;
  const tangent = Math.tan(camera.verticalFieldOfViewRadians / 2);
  const offsetX = scale(cameraRight(camera), ((ndcX * width) / height) * tangent);
  const offsetY = scale(cameraUp(camera), ndcY * tangent);
  return {
    origin: { ...camera.position },
    direction: normalize(add(cameraForward(camera), add(offsetX, offsetY))),
  };
}
export function lookCamera(camera: Camera, dx: number, dy: number): Camera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return camera;
  const yaw = camera.yaw + dx * 0.004;
  return {
    ...camera,
    yaw: yaw - Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI,
    pitch: clamp(camera.pitch - dy * 0.004, -1.45, 1.45),
  };
}
export function moveCamera(camera: Camera, local: Vec3): Camera {
  if (!finite(local) || !validCamera(camera)) return camera;
  const candidate = add(
    camera.position,
    add(
      scale(cameraRight(camera), local.x),
      add(scale(cameraForward(camera), local.z), scale(cameraUp(camera), local.y)),
    ),
  );
  if (!finite(candidate)) return camera;
  return {
    ...camera,
    position: {
      x: clamp(candidate.x, -40, 40),
      y: clamp(candidate.y, -40, 40),
      z: clamp(candidate.z, -40, 40),
    },
  };
}
