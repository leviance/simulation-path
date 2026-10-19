import type { Point } from "./geometry.ts";
import { normalizeAngle, pointOnUnitCircle } from "./angle.ts";

export const circleBoard = { width: 1100, height: 760, center: { x: 275, y: 390 }, radius: 185 };
export const visibleHistorySeconds = 6;
export const sampleInterval = 1 / 60;
export const maximumSamples = 361;
export type WaveSample = { time: number; sine: number; cosine: number };
export type CircleScene = {
  angle: number;
  requestedAngle: number;
  angularSpeed: number;
  elapsedTime: number;
  nextSampleIndex: number;
  samples: WaveSample[];
  dragging: boolean;
  angularGrabOffset: number;
};

export function circleScene(): CircleScene {
  const angle = (35 * Math.PI) / 180;
  return {
    angle,
    requestedAngle: angle,
    angularSpeed: Math.PI / 2,
    elapsedTime: 0,
    nextSampleIndex: 1,
    samples: [],
    dragging: false,
    angularGrabOffset: 0,
  };
}

export function circleLayers(mode?: string) {
  const order = [
    "angle-radians",
    "angle-sincos",
    "angle-motion",
    "angle-projections",
    "angle-graphs",
    "angle-atan2",
    "angle-full",
  ];
  let level = mode ? order.indexOf(mode) + 1 : 7;
  if (level < 1) level = 7;
  return {
    needle: level >= 2,
    animate: level >= 3,
    projections: level >= 4,
    graphs: level >= 5,
    drag: level >= 6,
  };
}

export function setCircleAngle(scene: CircleScene, angle: number): CircleScene {
  const normalized = normalizeAngle(angle);
  const direction = pointOnUnitCircle(normalized);
  return {
    ...scene,
    angle: normalized,
    requestedAngle: Number.isFinite(angle) ? angle : 0,
    elapsedTime: 0,
    nextSampleIndex: 1,
    samples: [{ time: 0, sine: direction.y, cosine: direction.x }],
  };
}

// Cùng thuật toán với advanceScene C++: mẫu tại timestamp 60 Hz, không tại cuối frame.
export function advanceCircle(scene: CircleScene, deltaTime: number): CircleScene {
  if (!Number.isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 0.1) return scene;
  let current = scene;
  if (!scene.samples.length) current = setCircleAngle(scene, scene.angle);
  const endTime = current.elapsedTime + deltaTime;
  const samples = [...current.samples];
  let nextSampleIndex = current.nextSampleIndex;
  let sampleTime = nextSampleIndex * sampleInterval;
  while (sampleTime <= endTime + 1e-12) {
    const offset = Math.min(deltaTime, Math.max(0, sampleTime - current.elapsedTime));
    const sampleAngle = normalizeAngle(current.angle + current.angularSpeed * offset);
    const direction = pointOnUnitCircle(sampleAngle);
    samples.push({ time: sampleTime, sine: direction.y, cosine: direction.x });
    nextSampleIndex++;
    sampleTime = nextSampleIndex * sampleInterval;
  }
  const angle = normalizeAngle(current.angle + current.angularSpeed * deltaTime);
  return {
    ...current,
    angle,
    requestedAngle: angle,
    elapsedTime: endTime,
    nextSampleIndex,
    samples: samples.slice(-maximumSamples),
  };
}

export function circleWorldToScreen(world: Point): Point {
  return {
    x: circleBoard.center.x + circleBoard.radius * world.x,
    y: circleBoard.center.y - circleBoard.radius * world.y,
  };
}

export function circleScreenToDirection(screen: Point): Point {
  return {
    x: (screen.x - circleBoard.center.x) / circleBoard.radius,
    y: (circleBoard.center.y - screen.y) / circleBoard.radius,
  };
}

export function beginCircleDrag(scene: CircleScene, screen: Point): CircleScene {
  const endpoint = circleWorldToScreen(pointOnUnitCircle(scene.angle));
  if (
    !Number.isFinite(screen.x) ||
    !Number.isFinite(screen.y) ||
    Math.hypot(screen.x - endpoint.x, screen.y - endpoint.y) > 18
  )
    return scene;
  const direction = circleScreenToDirection(screen);
  const pointerAngle = normalizeAngle(Math.atan2(direction.y, direction.x));
  return { ...scene, dragging: true, angularGrabOffset: scene.angle - pointerAngle };
}

export function moveCircleNeedle(scene: CircleScene, screen: Point): CircleScene {
  const direction = circleScreenToDirection(screen);
  if (
    !scene.dragging ||
    !Number.isFinite(direction.x) ||
    !Number.isFinite(direction.y) ||
    Math.hypot(direction.x, direction.y) < 8 / circleBoard.radius
  )
    return scene;
  return setCircleAngle(scene, Math.atan2(direction.y, direction.x) + scene.angularGrabOffset);
}

export function circleTimeToX(time: number, newestTime: number) {
  const progress = (time - (newestTime - visibleHistorySeconds)) / visibleHistorySeconds;
  return 570 + Math.min(1, Math.max(0, progress)) * 480;
}
