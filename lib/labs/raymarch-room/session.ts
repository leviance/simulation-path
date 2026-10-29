import {
  DEFAULT_CAMERA,
  add,
  clamp,
  finite,
  lookCamera,
  moveCamera,
  type Camera,
  type Ray,
  type Vec3,
} from "./geometry.ts";
import { FULL_SCENE, SPHERE_ONLY, SPHERE_CENTER, validScene, type SceneOptions } from "./scene.ts";
import { DEFAULT_MARCH_SETTINGS, traceRay, validSettings, type MarchSettings } from "./tracing.ts";
export type Preset =
  | "default"
  | "wide"
  | "surface"
  | "inside"
  | "outside"
  | "axis"
  | "tangent"
  | "miss"
  | "near-surface"
  | "sphere-only"
  | "inside-camera";
export interface RoomSession {
  mode: string;
  stage: number;
  preset: Preset;
  camera: Camera;
  scene: SceneOptions;
  settings: MarchSettings;
  paused: boolean;
  elapsedSeconds: number;
  debugView: number;
  selectedPixel: { x: number; y: number };
  samplePoint: Vec3;
  rayOffset: number;
  traceVisible: number;
}
const MODES = [
  "raymarch-screen",
  "raymarch-camera",
  "raymarch-sphere-sdf",
  "raymarch-stepper",
  "raymarch-normal",
  "raymarch-primitives",
  "raymarch-materials",
  "raymarch-shadow-camera",
  "raymarch-free-camera",
  "raymarch-oracle",
  "raymarch-validation",
];
export const stageForMode = (mode?: string) => {
  const index = MODES.indexOf(mode ?? "raymarch-validation");
  return index < 0 ? 11 : index + 1;
};
export function presetsForStage(stage: number): { value: Preset; label: string }[] {
  if (stage === 1)
    return [
      { value: "default", label: "Tâm ảnh" },
      { value: "wide", label: "Góc trên trái" },
      { value: "outside", label: "Góc dưới phải" },
    ];
  if (stage === 2)
    return [
      { value: "default", label: "Camera ban đầu" },
      { value: "wide", label: "FOV rộng" },
      { value: "inside-camera", label: "Camera trong sphere" },
    ];
  if (stage === 3)
    return [
      { value: "surface", label: "Điểm trên mặt" },
      { value: "inside", label: "Điểm ở tâm" },
      { value: "outside", label: "Điểm ở ngoài" },
    ];
  if (stage === 4 || stage === 10)
    return [
      { value: "axis", label: "Tia chính diện" },
      { value: "tangent", label: "Tiếp tuyến" },
      { value: "inside", label: "Origin ở tâm" },
      { value: "miss", label: "Tia trượt" },
      { value: "near-surface", label: "Near-miss trong epsilon band" },
    ];
  return [
    { value: "default", label: stage < 7 ? "Scene của bài" : "Căn phòng" },
    { value: "sphere-only", label: "Chỉ sphere" },
    { value: "inside-camera", label: "Camera trong sphere" },
  ];
}
export function createSession(mode?: string, preset?: Preset): RoomSession {
  const stage = stageForMode(mode);
  const options = presetsForStage(stage);
  const chosen = options.some((p) => p.value === preset) ? preset! : options[0].value;
  const state: RoomSession = {
    mode: mode ?? "raymarch-validation",
    stage,
    preset: chosen,
    camera: { ...DEFAULT_CAMERA, position: { ...DEFAULT_CAMERA.position } },
    scene: { ...FULL_SCENE },
    settings: { ...DEFAULT_MARCH_SETTINGS },
    paused: true,
    elapsedSeconds: 0,
    debugView: 0,
    selectedPixel: { x: 0.5, y: 0.5 },
    samplePoint: add(SPHERE_CENTER, { x: 0.82, y: 0, z: 0 }),
    rayOffset: 0,
    traceVisible: 0,
  };
  if (stage <= 5) {
    state.scene = { ...SPHERE_ONLY };
    if (stage >= 3)
      state.camera = { ...state.camera, position: { x: -1, y: -0.18, z: 4 }, pitch: 0 };
  } else if (stage === 6) state.scene.includeRoom = false;
  if (chosen === "wide") {
    if (stage === 1) state.selectedPixel = { x: 0.08, y: 0.08 };
    else state.camera.verticalFieldOfViewRadians = 1.6;
  }
  if (chosen === "outside") {
    state.samplePoint = add(SPHERE_CENTER, { x: 1.22, y: 0, z: 0 });
    if (stage === 1) state.selectedPixel = { x: 0.92, y: 0.92 };
  }
  if (chosen === "inside") state.samplePoint = { ...SPHERE_CENTER };
  if (chosen === "tangent") state.rayOffset = state.scene.sphereRadius;
  if (chosen === "miss") state.rayOffset = 1.1;
  if (chosen === "sphere-only") state.scene = { ...SPHERE_ONLY };
  if (chosen === "inside-camera") {
    state.scene = { ...SPHERE_ONLY };
    state.camera = { ...state.camera, position: { ...SPHERE_CENTER }, yaw: Math.PI / 2, pitch: 0 };
  }
  if (stage === 10) state.scene = { ...SPHERE_ONLY };
  return state;
}
export function inspectionRay(state: RoomSession): Ray {
  if (state.preset === "inside")
    return { origin: { ...SPHERE_CENTER }, direction: { x: 1, y: 0, z: 0 } };
  if (state.preset === "near-surface")
    return {
      origin: add(SPHERE_CENTER, {
        x: state.scene.sphereRadius + state.settings.hitEpsilon * 0.5,
        y: 0,
        z: 0,
      }),
      direction: { x: 1, y: 0, z: 0 },
    };
  return {
    origin: { x: SPHERE_CENTER.x + state.rayOffset, y: SPHERE_CENTER.y, z: 4 },
    direction: { x: 0, y: 0, z: -1 },
  };
}
export type RoomAction =
  | { type: "preset"; preset: Preset }
  | { type: "reset" }
  | { type: "pause" }
  | { type: "play" }
  | { type: "step" }
  | { type: "tick" }
  | { type: "view"; value: number }
  | { type: "look"; dx: number; dy: number }
  | { type: "move"; local: Vec3 }
  | { type: "fov"; value: number }
  | { type: "pixel"; x: number; y: number }
  | { type: "sample"; point: Vec3 }
  | { type: "ray"; offset: number }
  | { type: "settings"; patch: Partial<MarchSettings> }
  | { type: "scene"; patch: Partial<SceneOptions> };
export function reduceSession(state: RoomSession, action: RoomAction): RoomSession {
  switch (action.type) {
    case "reset":
      return createSession(state.mode, state.preset);
    case "preset":
      return createSession(state.mode, action.preset);
    case "pause":
      return state.paused ? state : { ...state, paused: true };
    case "play":
      return { ...state, paused: false };
    case "step":
    case "tick": {
      if (action.type === "tick" && state.paused) return state;
      const paused = action.type === "step";
      if (state.stage === 4) {
        const count = traceRay(inspectionRay(state), state.settings, {
          ...SPHERE_ONLY,
          sphereRadius: state.scene.sphereRadius,
        }).trace.length;
        return {
          ...state,
          traceVisible: Math.min(count, state.traceVisible + 1),
          paused: paused || state.traceVisible + 1 >= count,
        };
      }
      if (state.stage >= 8)
        return {
          ...state,
          elapsedSeconds: state.elapsedSeconds + (action.type === "step" ? 0.1 : 0.05),
          paused,
        };
      return state;
    }
    case "look":
      return { ...state, camera: lookCamera(state.camera, action.dx, action.dy) };
    case "move":
      return { ...state, camera: moveCamera(state.camera, action.local) };
    case "fov":
      return Number.isFinite(action.value)
        ? {
            ...state,
            camera: {
              ...state.camera,
              verticalFieldOfViewRadians: clamp(action.value, 0.45, 1.65),
            },
          }
        : state;
    case "view":
      return Number.isFinite(action.value)
        ? { ...state, debugView: clamp(Math.round(action.value), 0, 3) }
        : state;
    case "pixel":
      return Number.isFinite(action.x) && Number.isFinite(action.y)
        ? { ...state, selectedPixel: { x: clamp(action.x, 0, 1), y: clamp(action.y, 0, 1) } }
        : state;
    case "sample":
      return finite(action.point) ? { ...state, samplePoint: { ...action.point, z: 0.15 } } : state;
    case "ray":
      return Number.isFinite(action.offset)
        ? {
            ...state,
            preset: "axis",
            rayOffset: clamp(action.offset, -1.2, 1.2),
            traceVisible: 0,
            paused: true,
          }
        : state;
    case "settings": {
      const settings = { ...state.settings, ...action.patch };
      return validSettings(settings) ? { ...state, settings, traceVisible: 0 } : state;
    }
    case "scene": {
      const scene = { ...state.scene, ...action.patch };
      return validScene(scene)
        ? {
            ...state,
            scene,
            rayOffset: state.preset === "tangent" ? scene.sphereRadius : state.rayOffset,
            traceVisible: 0,
          }
        : state;
    }
  }
}
export function keyboardAction(
  event: {
    key: string;
    repeat?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    isComposing?: boolean;
  },
  state: RoomSession,
): RoomAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null;
  const key = event.key.toLowerCase(),
    stage = state.stage;
  if (event.repeat && ["r", " ", "n", "v", "escape"].includes(key)) return null;
  if (key === "r") return { type: "reset" };
  if (key === "escape") return { type: "pause" };
  if (key === " " && (stage === 4 || stage >= 8)) return { type: state.paused ? "play" : "pause" };
  if (key === "n" && (stage === 4 || stage >= 8)) return { type: "step" };
  if (key === "v" && stage >= 10) return { type: "view", value: (state.debugView + 1) % 4 };
  if (stage >= 4) {
    if (key === "[" || key === "]")
      return {
        type: "settings",
        patch: {
          maximumSteps: clamp(state.settings.maximumSteps + (key === "[" ? -16 : 16), 1, 256),
        },
      };
    if (key === "-" || key === "=")
      return {
        type: "settings",
        patch: {
          hitEpsilon: clamp(state.settings.hitEpsilon * (key === "-" ? 0.5 : 2), 1e-5, 0.02),
        },
      };
  }
  if (stage === 2 || stage >= 9) {
    if (key === "arrowleft" || key === "arrowright")
      return { type: "look", dx: key === "arrowleft" ? -20 : 20, dy: 0 };
    if (key === "arrowup" || key === "arrowdown")
      return { type: "look", dx: 0, dy: key === "arrowup" ? -20 : 20 };
  }
  if (stage >= 9) {
    const movement: Record<string, Vec3> = {
      w: { x: 0, y: 0, z: 0.2 },
      s: { x: 0, y: 0, z: -0.2 },
      a: { x: -0.2, y: 0, z: 0 },
      d: { x: 0.2, y: 0, z: 0 },
      q: { x: 0, y: -0.2, z: 0 },
      e: { x: 0, y: 0.2, z: 0 },
    };
    if (movement[key]) return { type: "move", local: movement[key] };
  }
  if (stage === 1) {
    if (key.startsWith("arrow"))
      return {
        type: "pixel",
        x: state.selectedPixel.x + (key === "arrowleft" ? -0.02 : key === "arrowright" ? 0.02 : 0),
        y: state.selectedPixel.y + (key === "arrowup" ? -0.02 : key === "arrowdown" ? 0.02 : 0),
      };
  }
  return null;
}

// Một pointer là owner; pointer lạ không thể kéo hoặc kết thúc thao tác hiện tại.
export class PointerOwner {
  id: number | null = null;
  point = { x: 0, y: 0 };
  begin(id: number, button: number, isPrimary: boolean, x: number, y: number) {
    if (this.id !== null || button !== 0 || !isPrimary) return false;
    this.id = id;
    this.point = { x, y };
    return true;
  }
  move(id: number, buttons: number, x: number, y: number) {
    if (id !== this.id) return null;
    if ((buttons & 1) === 0) return null;
    const delta = { dx: x - this.point.x, dy: y - this.point.y };
    this.point = { x, y };
    return delta;
  }
  clear(id?: number) {
    if (id === undefined || id === this.id) this.id = null;
  }
}
