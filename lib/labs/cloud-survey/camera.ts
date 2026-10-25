import { add, sub, scale, dot, cross, unit, region, type Vec3, type Box } from "./geometry.ts";
export interface Camera {
  target: Vec3;
  eye: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
  nearPlane: number;
  farPlane: number;
  fov: number;
  freeFly: boolean;
}
export function camera(): Camera {
  return {
    target: { x: 0, y: 3, z: 0 },
    eye: { x: 0, y: 3, z: 28 },
    yaw: 0.65,
    pitch: 0.35,
    distance: 32,
    nearPlane: 0.05,
    farPlane: 1000,
    fov: Math.PI / 3,
    freeFly: false,
  };
}
export function cameraBasis(c: Camera) {
  const outward = {
    x: Math.sin(c.yaw) * Math.cos(c.pitch),
    y: Math.sin(c.pitch),
    z: Math.cos(c.yaw) * Math.cos(c.pitch),
  };
  const eye = c.freeFly ? c.eye : add(c.target, scale(outward, c.distance));
  const forward = scale(outward, -1),
    right = unit(cross(forward, { x: 0, y: 1, z: 0 }));
  return { eye, right, up: cross(right, forward), forward };
}
export function resetCamera(bounds: Box) {
  const c = camera();
  c.target = scale(add(bounds.minimum, bounds.maximum), 0.5);
  c.distance =
    Math.max(
      bounds.maximum.x - bounds.minimum.x,
      bounds.maximum.y - bounds.minimum.y,
      bounds.maximum.z - bounds.minimum.z,
      2,
    ) * 1.6;
  c.eye = cameraBasis(c).eye;
  c.farPlane = Math.max(1000, c.distance * 4);
  return c;
}
export function switchCameraMode(c: Camera) {
  const basis = cameraBasis(c);
  c.freeFly = !c.freeFly;
  c.eye = basis.eye;
  c.target = add(basis.eye, scale(basis.forward, c.distance));
}
export function translateCamera(c: Camera, delta: Vec3) {
  c.eye = add(c.eye, delta);
  c.target = add(c.target, delta);
}
export function cameraFrustum(c: Camera, aspect: number) {
  const basis = cameraBasis(c),
    tangent = Math.tan(c.fov / 2),
    result = region();
  result.shape = "frustum";
  result.planes = [
    { normal: basis.forward, distance: -dot(basis.forward, basis.eye) - c.nearPlane },
    { normal: scale(basis.forward, -1), distance: dot(basis.forward, basis.eye) + c.farPlane },
  ];
  const normals = [
    add(scale(basis.forward, tangent * aspect), basis.right),
    sub(scale(basis.forward, tangent * aspect), basis.right),
    add(scale(basis.forward, tangent), basis.up),
    sub(scale(basis.forward, tangent), basis.up),
  ];
  for (const normal of normals) result.planes.push({ normal, distance: -dot(normal, basis.eye) });
  return result;
}
