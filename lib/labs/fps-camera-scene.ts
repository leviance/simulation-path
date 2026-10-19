import { add3, scale3, magnitude3, type Vec3 } from "./normal.ts";
import {
  type FpsCamera,
  worldToCameraTranslationFps,
  worldToCameraFps,
  cameraBasisFps,
  groundForwardFps,
  fpsBasisError,
  fpsViewRoundTripError,
} from "./fps-camera.ts";
import {
  finitePoint,
  projectPerspective,
  clipPointDepth,
  clipPointScreen,
  type PointLens,
} from "./projection-point.ts";
import { FPS_ROOM_GEOMETRY, type RoomLine } from "./fps-camera-room.ts";
export interface FpsScene {
  camera: FpsCamera;
  lens: PointLens;
  speed: number;
  sensitivity: number;
  margin: number;
  fly: boolean;
  paused: boolean;
  demo: boolean;
  debug: boolean;
}
export interface FpsInput {
  strafe: number;
  advance: number;
  lift: number;
}
export const fpsViewport = () => ({ x: 0, y: 0, width: 1100, height: 800 });
export const initialFpsScene = (): FpsScene => ({
  camera: { position: { x: 0, y: 1.6, z: 2 }, yaw: 0, pitch: 0 },
  lens: { verticalFovRadians: Math.PI / 3, nearPlane: 0.15, farPlane: 40 },
  speed: 3.5,
  sensitivity: 0.0025,
  margin: 0.35,
  fly: false,
  paused: false,
  demo: false,
  debug: true,
});
export const fpsStage = (mode?: string): number =>
  ({
    "camera-room": 1,
    "camera-translation": 2,
    "camera-orientation": 3,
    "camera-basis": 4,
    "camera-movement": 5,
    "camera-fly": 6,
    "camera-mouse-look": 7,
    "camera-bounds": 8,
    "camera-validation": 9,
  })[mode ?? "camera-validation"] ?? 9;
export function fpsPreset(index: number): FpsScene {
  const s = initialFpsScene();
  if (index === 1) {
    s.camera.position.z = 19;
    s.camera.yaw = Math.PI;
  }
  if (index === 2) s.camera.yaw = Math.PI / 2;
  if (index === 3) {
    s.camera.pitch = Math.PI / 3;
    s.fly = true;
  }
  if (index === 4) {
    s.camera.position = { x: 5.65, y: 1.6, z: 10 };
    s.camera.yaw = Math.PI / 2;
  }
  return s;
}
export function activeFpsCamera(scene: FpsScene, stage: number): FpsCamera {
  if (stage < 2) return initialFpsScene().camera;
  if (stage < 3) return { ...scene.camera, yaw: 0, pitch: 0 };
  return scene.camera;
}
export function fpsViewPoint(p: Vec3, scene: FpsScene, stage: number): Vec3 {
  const camera = activeFpsCamera(scene, stage);
  if (stage < 3) return worldToCameraTranslationFps(p, camera);
  return worldToCameraFps(p, camera);
}
export function fpsRoomSegment(line: RoomLine, scene: FpsScene, stage: number) {
  const depth = clipPointDepth(
    fpsViewPoint(line.from, scene, stage),
    fpsViewPoint(line.to, scene, stage),
    scene.lens,
  );
  if (!depth) return null;
  const origin = { position: { x: 0, y: 0, z: 0 } },
    v = fpsViewport();
  const a = projectPerspective(depth[0], origin, scene.lens, v),
    b = projectPerspective(depth[1], origin, scene.lens, v);
  if (!a.screen || !b.screen) return null;
  const screen = clipPointScreen(a.screen, b.screen, v);
  if (!screen) return null;
  return { from: screen[0], to: screen[1], color: line.color };
}
export function finiteFpsCamera(c: FpsCamera) {
  return finitePoint(c.position) && Number.isFinite(c.yaw) && Number.isFinite(c.pitch);
}
export function turnFpsCamera(camera: FpsCamera, dyaw: number, dpitch: number): FpsCamera {
  if (!finiteFpsCamera(camera) || !Number.isFinite(dyaw) || !Number.isFinite(dpitch)) return camera;
  let yaw = (camera.yaw + dyaw) % (2 * Math.PI);
  if (yaw > Math.PI) yaw -= 2 * Math.PI;
  if (yaw < -Math.PI) yaw += 2 * Math.PI;
  return {
    ...camera,
    yaw,
    pitch: Math.max((-89 * Math.PI) / 180, Math.min((89 * Math.PI) / 180, camera.pitch + dpitch)),
  };
}
export function lookFpsScene(scene: FpsScene, dx: number, dy: number): FpsScene {
  if (
    ![dx, dy, scene.sensitivity].every(Number.isFinite) ||
    scene.sensitivity < 0.001 ||
    scene.sensitivity > 0.02
  )
    return scene;
  return {
    ...scene,
    demo: false,
    camera: turnFpsCamera(scene.camera, dx * scene.sensitivity, -dy * scene.sensitivity),
  };
}
export function fpsMoveDirection(camera: FpsCamera, input: FpsInput, fly: boolean): Vec3 {
  const basis = cameraBasisFps(camera),
    forward = fly ? basis.forward : groundForwardFps(camera);
  const direction = add3(scale3(basis.right, input.strafe), scale3(forward, input.advance));
  if (fly) direction.y += input.lift;
  return direction;
}
export function clampFpsRoom(camera: FpsCamera, fly: boolean, margin: number): FpsCamera {
  if (!finiteFpsCamera(camera) || !Number.isFinite(margin)) return camera;
  const m = Math.max(0, Math.min(1, margin));
  return {
    ...camera,
    position: {
      x: Math.max(-6 + m, Math.min(6 - m, camera.position.x)),
      z: Math.max(m, Math.min(22 - m, camera.position.z)),
      y: fly ? Math.max(m, Math.min(4 - m, camera.position.y)) : 1.6,
    },
  };
}
export function advanceFpsScene(scene: FpsScene, input: FpsInput, dt: number, stage = 9): FpsScene {
  if (
    stage < 5 ||
    scene.paused ||
    !finiteFpsCamera(scene.camera) ||
    ![input.strafe, input.advance, input.lift, dt, scene.speed].every(Number.isFinite) ||
    dt <= 0 ||
    scene.speed < 0
  )
    return scene;
  const direction = fpsMoveDirection(scene.camera, input, stage >= 6 && scene.fly),
    length = magnitude3(direction);
  let camera = scene.camera;
  if (finitePoint(direction) && Number.isFinite(length) && length > 1e-12) {
    const candidate = add3(
      camera.position,
      scale3(direction, (scene.speed * Math.min(dt, 0.1)) / length),
    );
    if (finitePoint(candidate)) camera = { ...camera, position: candidate };
  }
  if (stage >= 8) camera = clampFpsRoom(camera, scene.fly, scene.margin);
  return { ...scene, camera };
}
export function toggleFpsMode(scene: FpsScene): FpsScene {
  const fly = !scene.fly;
  return {
    ...scene,
    fly,
    demo: false,
    camera: {
      ...scene.camera,
      position: { ...scene.camera.position, y: fly ? scene.camera.position.y : 1.6 },
    },
  };
}
export function fpsInput(keys: ReadonlySet<string>): FpsInput {
  const i = { strafe: 0, advance: 0, lift: 0 };
  if (keys.has("a")) i.strafe--;
  if (keys.has("d")) i.strafe++;
  if (keys.has("s")) i.advance--;
  if (keys.has("w")) i.advance++;
  if (keys.has("q")) i.lift--;
  if (keys.has("e")) i.lift++;
  return i;
}
export function fpsResults(scene: FpsScene, stage: number) {
  const camera = activeFpsCamera(scene, stage);
  const segments =
    stage < 1
      ? []
      : FPS_ROOM_GEOMETRY.flatMap((l) => {
          const s = fpsRoomSegment(l, scene, stage);
          return s ? [s] : [];
        });
  const inspected = { x: 2, y: 1, z: 12 };
  return {
    camera,
    segments,
    basis: cameraBasisFps(camera),
    world: inspected,
    translated: worldToCameraTranslationFps(inspected, camera),
    view: fpsViewPoint(inspected, scene, stage),
    basisError: fpsBasisError(camera),
    roundTrip: fpsViewRoundTripError(inspected, camera),
  };
}

export function fpsInsideRoom(scene: FpsScene): boolean {
  const p = scene.camera.position,
    m = scene.margin,
    e = 1e-9;
  if (!finiteFpsCamera(scene.camera) || !Number.isFinite(m)) return false;
  const yValid = scene.fly ? p.y >= m - e && p.y <= 4 - m + e : Math.abs(p.y - 1.6) <= e;
  return p.x >= -6 + m - e && p.x <= 6 - m + e && p.z >= m - e && p.z <= 22 - m + e && yValid;
}
