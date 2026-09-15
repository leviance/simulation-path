import { add3, dot3, magnitude3, scale3, subtract3, type Vec3 } from "./normal.ts";
import {
  cameraToNdc,
  isInsideNdc,
  ndcToScreen,
  type PerspectiveLens,
  type ProjectionResult,
} from "./projection.ts";

export interface RoomBounds {
  minX: number;
  maxX: number;
  floorY: number;
  ceilingY: number;
  minZ: number;
  maxZ: number;
}

export type RoomSegmentKind = "floor" | "wall" | "ceiling";

export interface RoomSegment {
  from: Vec3;
  to: Vec3;
  kind: RoomSegmentKind;
}

export interface FpsCamera {
  position: Vec3;
  yaw: number;
  pitch: number;
}

export interface CameraBasis {
  forward: Vec3;
  right: Vec3;
  up: Vec3;
}

export interface MoveInput {
  strafe: number;
  advance: number;
}

export const DEFAULT_ROOM_BOUNDS: RoomBounds = {
  minX: -6,
  maxX: 6,
  floorY: 0,
  ceilingY: 4,
  minZ: 0,
  maxZ: 22,
};

function appendSegment(room: RoomSegment[], from: Vec3, to: Vec3, kind: RoomSegmentKind) {
  room.push({ from, to, kind });
}

export function makeRoomGeometry(bounds: RoomBounds, gridSpacing: number) {
  const room: RoomSegment[] = [];
  if (gridSpacing <= 0) return room;

  for (let x = bounds.minX; x <= bounds.maxX + 1e-9; x += gridSpacing) {
    for (let z = bounds.minZ; z < bounds.maxZ - 1e-9; z += gridSpacing) {
      const nextZ = Math.min(z + gridSpacing, bounds.maxZ);
      appendSegment(room, { x, y: bounds.floorY, z }, { x, y: bounds.floorY, z: nextZ }, "floor");
    }
  }
  for (let z = bounds.minZ; z <= bounds.maxZ + 1e-9; z += gridSpacing) {
    for (let x = bounds.minX; x < bounds.maxX - 1e-9; x += gridSpacing) {
      const nextX = Math.min(x + gridSpacing, bounds.maxX);
      appendSegment(room, { x, y: bounds.floorY, z }, { x: nextX, y: bounds.floorY, z }, "floor");
    }
  }

  appendSegment(
    room,
    { x: bounds.minX, y: bounds.ceilingY, z: bounds.minZ },
    { x: bounds.maxX, y: bounds.ceilingY, z: bounds.minZ },
    "ceiling",
  );
  appendSegment(
    room,
    { x: bounds.maxX, y: bounds.ceilingY, z: bounds.minZ },
    { x: bounds.maxX, y: bounds.ceilingY, z: bounds.maxZ },
    "ceiling",
  );
  appendSegment(
    room,
    { x: bounds.maxX, y: bounds.ceilingY, z: bounds.maxZ },
    { x: bounds.minX, y: bounds.ceilingY, z: bounds.maxZ },
    "ceiling",
  );
  appendSegment(
    room,
    { x: bounds.minX, y: bounds.ceilingY, z: bounds.maxZ },
    { x: bounds.minX, y: bounds.ceilingY, z: bounds.minZ },
    "ceiling",
  );

  for (const x of [bounds.minX, bounds.maxX]) {
    for (const z of [bounds.minZ, bounds.maxZ]) {
      appendSegment(room, { x, y: bounds.floorY, z }, { x, y: bounds.ceilingY, z }, "wall");
    }
  }
  for (let z = bounds.minZ; z < bounds.maxZ - 1e-9; z += gridSpacing) {
    const nextZ = Math.min(z + gridSpacing, bounds.maxZ);
    appendSegment(room, { x: bounds.minX, y: 2, z }, { x: bounds.minX, y: 2, z: nextZ }, "wall");
    appendSegment(room, { x: bounds.maxX, y: 2, z }, { x: bounds.maxX, y: 2, z: nextZ }, "wall");
  }
  for (let x = bounds.minX; x <= bounds.maxX + 1e-9; x += gridSpacing) {
    appendSegment(
      room,
      { x, y: bounds.floorY, z: bounds.maxZ },
      { x, y: bounds.ceilingY, z: bounds.maxZ },
      "wall",
    );
  }
  return room;
}

export function rotateFpsX(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x,
    y: cosine * point.y - sine * point.z,
    z: sine * point.y + cosine * point.z,
  };
}

export function rotateFpsY(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: cosine * point.x + sine * point.z,
    y: point.y,
    z: -sine * point.x + cosine * point.z,
  };
}

export function worldToCameraTranslationFps(worldPoint: Vec3, camera: FpsCamera) {
  return subtract3(worldPoint, camera.position);
}

export function worldToCameraFps(worldPoint: Vec3, camera: FpsCamera) {
  const relative = worldToCameraTranslationFps(worldPoint, camera);
  const yawNeutral = rotateFpsY(relative, -camera.yaw);
  return rotateFpsX(yawNeutral, camera.pitch);
}

export function cameraToWorldFps(cameraPoint: Vec3, camera: FpsCamera) {
  const pitchRestored = rotateFpsX(cameraPoint, -camera.pitch);
  const yawRestored = rotateFpsY(pitchRestored, camera.yaw);
  return add3(yawRestored, camera.position);
}

export function cameraBasisFps(camera: FpsCamera): CameraBasis {
  const sinYaw = Math.sin(camera.yaw);
  const cosYaw = Math.cos(camera.yaw);
  const sinPitch = Math.sin(camera.pitch);
  const cosPitch = Math.cos(camera.pitch);
  return {
    forward: { x: sinYaw * cosPitch, y: sinPitch, z: cosYaw * cosPitch },
    right: { x: cosYaw, y: 0, z: -sinYaw },
    up: { x: -sinYaw * sinPitch, y: cosPitch, z: -cosYaw * sinPitch },
  };
}

export function groundForwardFps(camera: FpsCamera): Vec3 {
  return { x: Math.sin(camera.yaw), y: 0, z: Math.cos(camera.yaw) };
}

export function normalizeMoveInput(input: MoveInput): MoveInput {
  const length = Math.hypot(input.strafe, input.advance);
  if (length <= 1) return input;
  return { strafe: input.strafe / length, advance: input.advance / length };
}

export function advanceFpsCamera(
  camera: FpsCamera,
  rawInput: MoveInput,
  speed: number,
  deltaTime: number,
): FpsCamera {
  const input = normalizeMoveInput(rawInput);
  const basis = cameraBasisFps(camera);
  const forward = groundForwardFps(camera);
  const velocity = add3(
    scale3(basis.right, input.strafe * speed),
    scale3(forward, input.advance * speed),
  );
  const safeDeltaTime = Math.max(0, Math.min(deltaTime, 0.1));
  return { ...camera, position: add3(camera.position, scale3(velocity, safeDeltaTime)) };
}

export function clampFpsCamera(
  camera: FpsCamera,
  bounds: RoomBounds,
  eyeHeight: number,
  margin: number,
): FpsCamera {
  const safeMargin = Math.max(0, margin);
  return {
    ...camera,
    position: {
      x: Math.max(bounds.minX + safeMargin, Math.min(bounds.maxX - safeMargin, camera.position.x)),
      y: Math.max(bounds.floorY, Math.min(bounds.ceilingY, eyeHeight)),
      z: Math.max(bounds.minZ + safeMargin, Math.min(bounds.maxZ - safeMargin, camera.position.z)),
    },
  };
}

export function advanceFpsCameraInRoom(
  camera: FpsCamera,
  input: MoveInput,
  speed: number,
  deltaTime: number,
  bounds: RoomBounds,
  eyeHeight: number,
  margin: number,
) {
  return clampFpsCamera(
    advanceFpsCamera(camera, input, speed, deltaTime),
    bounds,
    eyeHeight,
    margin,
  );
}

export function wrapFpsAngle(angle: number) {
  const fullTurn = Math.PI * 2;
  return angle - Math.round(angle / fullTurn) * fullTurn;
}

export function applyFpsMouseLook(
  camera: FpsCamera,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
): FpsCamera {
  const pitchLimit = (89 * Math.PI) / 180;
  return {
    ...camera,
    yaw: wrapFpsAngle(camera.yaw + deltaX * sensitivity),
    pitch: Math.max(-pitchLimit, Math.min(pitchLimit, camera.pitch - deltaY * sensitivity)),
  };
}

export function projectFpsPoint(
  worldPoint: Vec3,
  camera: FpsCamera,
  lens: PerspectiveLens,
  nearPlane: number,
  width: number,
  height: number,
): ProjectionResult {
  const cameraPoint = worldToCameraFps(worldPoint, camera);
  const empty = { x: 0, y: 0 };
  if (cameraPoint.z <= 0) return { status: "behind", cameraPoint, ndc: empty, screen: empty };
  if (cameraPoint.z < nearPlane)
    return { status: "before-near", cameraPoint, ndc: empty, screen: empty };
  const ndc = cameraToNdc(cameraPoint, lens, width / height);
  const screen = ndcToScreen(ndc, width, height);
  if (!isInsideNdc(ndc)) return { status: "outside", cameraPoint, ndc, screen };
  return { status: "visible", cameraPoint, ndc, screen };
}

export function fpsBasisError(camera: FpsCamera) {
  const basis = cameraBasisFps(camera);
  return Math.max(
    Math.abs(magnitude3(basis.forward) - 1),
    Math.abs(magnitude3(basis.right) - 1),
    Math.abs(magnitude3(basis.up) - 1),
    Math.abs(dot3(basis.forward, basis.right)),
    Math.abs(dot3(basis.forward, basis.up)),
    Math.abs(dot3(basis.right, basis.up)),
  );
}

export function fpsViewRoundTripError(worldPoint: Vec3, camera: FpsCamera) {
  const restored = cameraToWorldFps(worldToCameraFps(worldPoint, camera), camera);
  return magnitude3(subtract3(restored, worldPoint));
}
