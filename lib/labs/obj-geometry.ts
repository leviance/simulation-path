import type { ZColor, ZVec3 } from "./z-buffer.ts";
import type { ObjLabMesh, ObjLabBounds } from "./obj-types.ts";
export function objAdd(left: ZVec3, right: ZVec3): ZVec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

export function objSubtract(left: ZVec3, right: ZVec3): ZVec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

export function objScale(value: ZVec3, scalar: number): ZVec3 {
  return { x: value.x * scalar, y: value.y * scalar, z: value.z * scalar };
}

export function objDot(left: ZVec3, right: ZVec3) {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function objCross(left: ZVec3, right: ZVec3): ZVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

export function objNormalize(value: ZVec3, epsilon = 1e-9): ZVec3 | null {
  const magnitude = Math.sqrt(objDot(value, value));
  if (!Number.isFinite(magnitude) || magnitude <= epsilon) return null;
  return objScale(value, 1 / magnitude);
}

export function objMeshBounds(mesh: ObjLabMesh): ObjLabBounds | null {
  if (mesh.positions.length === 0) return null;
  const minimum = { ...mesh.positions[0] };
  const maximum = { ...mesh.positions[0] };
  for (const position of mesh.positions) {
    minimum.x = Math.min(minimum.x, position.x);
    minimum.y = Math.min(minimum.y, position.y);
    minimum.z = Math.min(minimum.z, position.z);
    maximum.x = Math.max(maximum.x, position.x);
    maximum.y = Math.max(maximum.y, position.y);
    maximum.z = Math.max(maximum.z, position.z);
  }
  return { minimum, maximum };
}

export function objBoundsCenter(bounds: ObjLabBounds): ZVec3 {
  return objScale(objAdd(bounds.minimum, bounds.maximum), 0.5);
}

export function objBoundsMaxExtent(bounds: ObjLabBounds) {
  const extent = objSubtract(bounds.maximum, bounds.minimum);
  return Math.max(extent.x, extent.y, extent.z);
}

export function normalizeObjMesh(mesh: ObjLabMesh, targetExtent = 2) {
  const bounds = objMeshBounds(mesh);
  if (!bounds || !Number.isFinite(targetExtent) || targetExtent <= 0) return null;
  const maxExtent = objBoundsMaxExtent(bounds);
  if (!Number.isFinite(maxExtent) || maxExtent <= 1e-9) return null;
  const center = objBoundsCenter(bounds);
  const uniformScale = targetExtent / maxExtent;
  return {
    mesh: {
      ...mesh,
      positions: mesh.positions.map((position) =>
        objScale(objSubtract(position, center), uniformScale),
      ),
    },
    center,
    uniformScale,
    before: bounds,
  };
}

export function rotateObjPoint(point: ZVec3, angleX: number, angleY: number): ZVec3 {
  const cosineY = Math.cos(angleY);
  const sineY = Math.sin(angleY);
  const afterY = {
    x: point.x * cosineY + point.z * sineY,
    y: point.y,
    z: -point.x * sineY + point.z * cosineY,
  };
  const cosineX = Math.cos(angleX);
  const sineX = Math.sin(angleX);
  return {
    x: afterY.x,
    y: afterY.y * cosineX - afterY.z * sineX,
    z: afterY.y * sineX + afterY.z * cosineX,
  };
}

export interface ObjCamera {
  yaw: number;
  pitch: number;
  distance: number;
}
export function objWorldToCamera(point: ZVec3, camera: ObjCamera): ZVec3 {
  const horizontalRadius = camera.distance * Math.cos(camera.pitch);
  const eye = {
    x: -horizontalRadius * Math.sin(camera.yaw),
    y: camera.distance * Math.sin(camera.pitch),
    z: -horizontalRadius * Math.cos(camera.yaw),
  };
  const forward = objNormalize(objScale(eye, -1));
  if (!forward) return { x: NaN, y: NaN, z: NaN };
  const right = objNormalize(objCross({ x: 0, y: 1, z: 0 }, forward));
  if (!right) return { x: NaN, y: NaN, z: NaN };
  const up = objCross(forward, right);
  const relative = objSubtract(point, eye);
  return { x: objDot(relative, right), y: objDot(relative, up), z: objDot(relative, forward) };
}

export function objShade(base: ZColor, intensity: number): ZColor {
  const safe = Math.max(0, Math.min(1, intensity));
  return {
    red: Math.round(base.red * safe),
    green: Math.round(base.green * safe),
    blue: Math.round(base.blue * safe),
  };
}
