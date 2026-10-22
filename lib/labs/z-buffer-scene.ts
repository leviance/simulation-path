import { buildCubeTriangles, renderZTriangles } from "./z-buffer.ts";
export interface DepthScene {
  angleX: number;
  angleY: number;
  cameraX: number;
  cameraZ: number;
  depthEnabled: boolean;
  reverseOrder: boolean;
  cullEnabled: boolean;
  debug: boolean;
  depthView: boolean;
  paused: boolean;
  inspect: { x: number; y: number };
  traceStep: number;
  preset: number;
}
const modes = [
  "depth-cube",
  "depth-order",
  "depth-storage",
  "depth-interpolate",
  "depth-test",
  "depth-mesh",
  "depth-validate",
  "depth-culling",
  "depth-scene",
];
export const depthStage = (mode?: string) => {
  const i = modes.indexOf(mode ?? "depth-scene");
  return i < 0 ? 9 : i + 1;
};
export function initialDepthScene(stage = 9, preset = 1): DepthScene {
  if (!Number.isInteger(preset) || preset < 1 || preset > 3) preset = 1;
  const a = [
    [-0.42, 0.68],
    [0, 0],
    [-0.7, 0.95],
  ][preset - 1];
  return {
    angleX: a[0],
    angleY: a[1],
    cameraX: 0,
    cameraZ: 0,
    depthEnabled: stage >= 5,
    reverseOrder: false,
    cullEnabled: false,
    debug: true,
    depthView: stage === 3,
    paused: true,
    inspect: stage === 9 ? { x: 110, y: 60 } : { x: 32, y: 22 },
    traceStep: 0,
    preset,
  };
}
export const depthViewport = (stage: number, s: DepthScene) =>
  stage === 9 ? { width: 220, height: s.debug ? 120 : 160 } : { width: 64, height: 44 };
export function depthFrame(stage: number, s: DepthScene, reverse = s.reverseOrder) {
  const v = depthViewport(stage, s);
  return renderZTriangles(
    buildCubeTriangles(v.width, v.height, s.angleX, s.angleY, { x: s.cameraX, z: s.cameraZ }),
    v.width,
    v.height,
    {
      depthEnabled: stage >= 5 && s.depthEnabled,
      reverseOrder: stage >= 2 && reverse,
      cullEnabled: stage >= 8 && s.cullEnabled,
      writeWhenDisabled: false,
      inspect: s.inspect,
    },
  );
}
export function editDepthScene(
  s: DepthScene,
  key: "angleX" | "angleY" | "cameraX" | "cameraZ",
  value: number,
): DepthScene {
  if (!Number.isFinite(value)) return s;
  const v =
    key === "cameraX"
      ? Math.max(-1, Math.min(1, value))
      : key === "cameraZ"
        ? Math.max(-0.5, Math.min(0.5, value))
        : Math.atan2(Math.sin(value), Math.cos(value));
  return { ...s, [key]: v, paused: true, traceStep: 0 };
}
export function advanceDepthScene(s: DepthScene, dt: number): DepthScene {
  if (s.paused || !Number.isFinite(dt) || dt <= 0) return s;
  return {
    ...s,
    angleY: Math.atan2(
      Math.sin(s.angleY + Math.min(0.05, dt) * 0.55),
      Math.cos(s.angleY + Math.min(0.05, dt) * 0.55),
    ),
  };
}
