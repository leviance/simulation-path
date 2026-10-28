import { objCross, objDot, objNormalize, objSubtract } from "../obj-geometry.ts";
import type { Mat4, Vec3, Vec4, ViewerScene, ScreenVertex } from "./types.ts";

export function initialViewerScene(): ViewerScene {
  return {
    view: {
      angleX: -0.35,
      angleY: 0.65,
      cameraYaw: 0,
      cameraPitch: 0,
      distance: 4.2,
      cameraDrag: false,
      paused: true,
      wireframe: false,
      normals: false,
      cullBackfaces: true,
      reverseOrder: false,
      grid: true,
    },
    meshIndex: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    verticalFov: Math.PI / 3,
    nearPlane: 0.2,
    farPlane: 50,
    depthEnabled: true,
    lit: true,
    light: { x: -0.45, y: 0.75, z: 1 },
    baseColor: { x: 0.28, y: 0.64, z: 0.91 },
  };
}

export function identityMatrix(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function multiplyMatrices(a: Mat4, b: Mat4): number[] {
  const result = Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let inner = 0; inner < 4; inner++)
        result[column * 4 + row] += a[inner * 4 + row] * b[column * 4 + inner];
    }
  }
  return result;
}
export function transformVector(m: Mat4, v: Vec4): Vec4 {
  return {
    x: m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * v.w,
    y: m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * v.w,
    z: m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * v.w,
    w: m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] * v.w,
  };
}
export function viewerMatrices(scene: ViewerScene, aspect: number) {
  if (
    !Number.isFinite(aspect) ||
    aspect <= 0 ||
    scene.nearPlane <= 0 ||
    scene.farPlane <= scene.nearPlane
  )
    throw new Error("Projection không hợp lệ");
  const { angleX: x, angleY: y, cameraYaw: yaw, cameraPitch: pitch, distance } = scene.view;
  const rx = [
    1,
    0,
    0,
    0,
    0,
    Math.cos(x),
    Math.sin(x),
    0,
    0,
    -Math.sin(x),
    Math.cos(x),
    0,
    0,
    0,
    0,
    1,
  ];
  const ry = [
    Math.cos(y),
    0,
    -Math.sin(y),
    0,
    0,
    1,
    0,
    0,
    Math.sin(y),
    0,
    Math.cos(y),
    0,
    0,
    0,
    0,
    1,
  ];
  const model = multiplyMatrices(rx, ry);
  const target = { x: scene.targetX, y: scene.targetY, z: scene.targetZ };
  const eye = {
    x: target.x + distance * Math.sin(yaw) * Math.cos(pitch),
    y: target.y + distance * Math.sin(pitch),
    z: target.z + distance * Math.cos(yaw) * Math.cos(pitch),
  };
  const forward = objNormalize(objSubtract(target, eye))!;
  const right = objNormalize(objCross(forward, { x: 0, y: 1, z: 0 }))!;
  const up = objCross(right, forward);
  const view = [
    right.x,
    up.x,
    -forward.x,
    0,
    right.y,
    up.y,
    -forward.y,
    0,
    right.z,
    up.z,
    -forward.z,
    0,
    -objDot(right, eye),
    -objDot(up, eye),
    objDot(forward, eye),
    1,
  ];
  const scale = 1 / Math.tan(scene.verticalFov / 2),
    n = scene.nearPlane,
    f = scene.farPlane;
  const projection = [
    scale / aspect,
    0,
    0,
    0,
    0,
    scale,
    0,
    0,
    0,
    0,
    (f + n) / (n - f),
    -1,
    0,
    0,
    (2 * f * n) / (n - f),
    0,
  ];
  return {
    model,
    view,
    projection,
    mvp: multiplyMatrices(projection, multiplyMatrices(view, model)),
    right,
    up,
  };
}
export function turnViewer(scene: ViewerScene, dx: number, dy: number): ViewerScene {
  if (![dx, dy].every(Number.isFinite)) return scene;
  const view = { ...scene.view, paused: true };
  const wrap = (n: number) => Math.atan2(Math.sin(n), Math.cos(n));
  if (view.cameraDrag) {
    view.cameraYaw = wrap(view.cameraYaw + dx);
    view.cameraPitch = Math.max(-1.3, Math.min(1.3, view.cameraPitch + dy));
  } else {
    view.angleY = wrap(view.angleY + dx);
    view.angleX = wrap(view.angleX + dy);
  }
  return { ...scene, view };
}
export function zoomViewer(scene: ViewerScene, wheel: number): ViewerScene {
  if (!Number.isFinite(wheel)) return scene;
  return {
    ...scene,
    view: {
      ...scene.view,
      distance: Math.max(
        0.35,
        Math.min(40, scene.view.distance * Math.exp(-Math.max(-50, Math.min(50, wheel)) * 0.12)),
      ),
    },
  };
}
export function panViewer(scene: ViewerScene, dx: number, dy: number, height: number): ViewerScene {
  if (height <= 0 || ![dx, dy].every(Number.isFinite)) return scene;
  const { right, up } = viewerMatrices(scene, 1),
    scale = (2 * scene.view.distance * Math.tan(scene.verticalFov / 2)) / height;
  return {
    ...scene,
    view: { ...scene.view, paused: true },
    targetX: scene.targetX + (-dx * right.x + dy * up.x) * scale,
    targetY: scene.targetY + (-dx * right.y + dy * up.y) * scale,
    targetZ: scene.targetZ + (-dx * right.z + dy * up.z) * scale,
  };
}
export function screenVertex(p: Vec4, width: number, height: number): ScreenVertex {
  return {
    x: ((p.x / p.w) * 0.5 + 0.5) * width,
    y: (0.5 - (p.y / p.w) * 0.5) * height,
    depth: (p.z / p.w) * 0.5 + 0.5,
  };
}
export function traceViewerVertex(
  position: Vec3,
  scene: ViewerScene,
  width: number,
  height: number,
) {
  const clip = transformVector(viewerMatrices(scene, width / height).mvp, { ...position, w: 1 });
  if (Math.abs(clip.w) < 1e-7) return { clip, ndc: null, screen: null };
  return {
    clip,
    ndc: { x: clip.x / clip.w, y: clip.y / clip.w, z: clip.z / clip.w },
    screen: screenVertex(clip, width, height),
  };
}
