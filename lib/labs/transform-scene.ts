import type { Point } from "./geometry.ts";
import {
  composeTransform,
  determinantLinearPart,
  polygonArea,
  rotatePoint,
  scalePoint,
  shearPoint,
  transformPoint,
  type TransformParameters,
  type TransformOrder,
} from "./transform.ts";

export const transformSquare: readonly Point[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
];
export const transformSliderSpecs = [
  { key: "scaleX", label: "scaleX", min: -2, max: 2, step: 0.1 },
  { key: "scaleY", label: "scaleY", min: -2, max: 2, step: 0.1 },
  { key: "angle", label: "Góc (radian)", min: -Math.PI, max: Math.PI, step: Math.PI / 180 },
  { key: "shearX", label: "shearX", min: -1, max: 1, step: 0.1 },
  { key: "shearY", label: "shearY", min: -1, max: 1, step: 0.1 },
  { key: "translationX", label: "Dịch chuyển X", min: -2, max: 2, step: 0.1 },
  { key: "translationY", label: "Dịch chuyển Y", min: -2, max: 2, step: 0.1 },
] as const;
export type TransformParameterKey = (typeof transformSliderSpecs)[number]["key"];
export interface TransformScene {
  parameters: TransformParameters;
  order: TransformOrder;
  paused: boolean;
}
export function initialTransformScene(): TransformScene {
  return {
    parameters: {
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      shearX: 0,
      shearY: 0,
      translation: { x: 0, y: 0 },
    },
    order: "scale-shear-rotate",
    paused: true,
  };
}
export function transformStage(mode?: string) {
  return (
    (
      {
        "transform-local": 1,
        "transform-scale": 2,
        "transform-rotation": 3,
        "transform-shear": 4,
        "transform-matrix": 5,
        "transform-order": 6,
        "transform-input": 7,
        "transform-full": 8,
      } as Record<string, number>
    )[mode ?? ""] ?? 8
  );
}
export function effectiveTransformScene(scene: TransformScene, stage: number): TransformScene {
  const p = scene.parameters;
  return {
    ...scene,
    order: stage >= 6 ? scene.order : "scale-shear-rotate",
    parameters: {
      scaleX: stage >= 2 ? p.scaleX : 1,
      scaleY: stage >= 2 ? p.scaleY : 1,
      angle: stage >= 3 ? p.angle : 0,
      shearX: stage >= 4 ? p.shearX : 0,
      shearY: stage >= 4 ? p.shearY : 0,
      translation: stage >= 5 ? p.translation : { x: 0, y: 0 },
    },
  };
}
export function transformWorldToScreen(point: Point): Point {
  return { x: 450 + point.x * 50, y: 400 - point.y * 50 };
}
export function transformScreenToWorld(point: Point): Point {
  return { x: (point.x - 450) / 50, y: (400 - point.y) / 50 };
}
export function boundTransformTranslation(point: Point): Point {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return { x: 0, y: 0 };
  return { x: Math.max(-2, Math.min(2, point.x)), y: Math.max(-2, Math.min(2, point.y)) };
}
export function directTransformPoint(
  point: Point,
  p: TransformParameters,
  order: TransformOrder,
): Point {
  let result: Point;
  if (order === "rotate-shear-scale")
    result = scalePoint(
      shearPoint(rotatePoint(point, p.angle), p.shearX, p.shearY),
      p.scaleX,
      p.scaleY,
    );
  else
    result = rotatePoint(
      shearPoint(scalePoint(point, p.scaleX, p.scaleY), p.shearX, p.shearY),
      p.angle,
    );
  return { x: result.x + p.translation.x, y: result.y + p.translation.y };
}
export function transformResults(scene: TransformScene) {
  const matrix = composeTransform(scene.parameters, scene.order);
  const square = transformSquare.map((point) => transformPoint(matrix, point));
  const origin = transformPoint(matrix, { x: 0, y: 0 });
  const direct = directTransformPoint(transformSquare[2], scene.parameters, scene.order);
  return {
    matrix,
    square,
    origin,
    determinant: determinantLinearPart(matrix),
    areaRatio: polygonArea(square) / 4,
    error: Math.hypot(direct.x - square[2].x, direct.y - square[2].y),
  };
}
export function transformPreset(index: number): TransformScene {
  const scene = initialTransformScene(),
    p = scene.parameters;
  if (index === 1) p.scaleX = -1;
  if (index === 2) p.scaleX = 0;
  if (index === 3) {
    p.shearX = 1;
    p.shearY = 1;
  }
  if (index === 4)
    scene.parameters = {
      scaleX: 1.6,
      scaleY: 0.6,
      angle: Math.PI / 4,
      shearX: 0.4,
      shearY: -0.2,
      translation: { x: 1, y: 0.5 },
    };
  return scene;
}
export function transformParameterValue(scene: TransformScene, key: TransformParameterKey): number {
  if (key === "translationX") return scene.parameters.translation.x;
  if (key === "translationY") return scene.parameters.translation.y;
  return scene.parameters[key];
}
export function changeTransformParameter(
  scene: TransformScene,
  key: TransformParameterKey,
  value: number,
): TransformScene {
  if (!Number.isFinite(value)) return scene;
  const spec = transformSliderSpecs.find((item) => item.key === key)!;
  value = Math.max(spec.min, Math.min(spec.max, value));
  const parameters = { ...scene.parameters, translation: { ...scene.parameters.translation } };
  if (key === "translationX") parameters.translation.x = value;
  else if (key === "translationY") parameters.translation.y = value;
  else parameters[key] = value;
  return { ...scene, parameters, paused: key === "angle" ? true : scene.paused };
}
export function advanceTransform(scene: TransformScene, dt: number): TransformScene {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) return scene;
  let angle = (scene.parameters.angle + 0.45 * dt) % (2 * Math.PI);
  if (angle > Math.PI) angle -= 2 * Math.PI;
  if (angle < -Math.PI) angle += 2 * Math.PI;
  return { ...scene, parameters: { ...scene.parameters, angle } };
}
