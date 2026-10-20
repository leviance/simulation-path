import {
  pipelineToPoint,
  pipelineToDirection,
  pipelineTransform,
  pipelineModelMatrix,
  pipelineViewMatrix,
  pipelineModelPointDirect,
  pipelineProjectionMatrix,
  pipelinePerspectiveDivide,
  pipelineNdcToScreen,
  pipelineTranslationMatrix,
  pipelineFinite3,
  pipelineValidLens,
  trace3dPipeline,
  pipelineAgreementError,
  advancePipelineYaw,
  type PipelineVec2,
  type PipelineVec3,
  type PipelineVec4,
  type PipelineModel,
  type PipelineCamera,
  type PipelineLens,
} from "./pipeline3d.ts";
import { clipPointDepth, clipPointScreen } from "./projection-point.ts";

export interface InspectorScene {
  vertices: PipelineVec3[];
  selectedVertex: number;
  selectedStage: number;
  model: PipelineModel;
  camera: PipelineCamera;
  lens: PipelineLens;
  debug: boolean;
  paused: boolean;
}
export const INSPECTOR_VERTICES: readonly PipelineVec3[] = [
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
  { x: 1, y: 1, z: -1 },
  { x: -1, y: 1, z: -1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
];
export const INSPECTOR_EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;
export const INSPECTOR_STAGES = ["LOCAL", "WORLD", "VIEW", "CLIP", "NDC", "SCREEN"] as const;
export const initialInspector = (): InspectorScene => ({
  vertices: INSPECTOR_VERTICES.map((p) => ({ ...p })),
  selectedVertex: 6,
  selectedStage: 0,
  model: { position: { x: 0, y: 1, z: 6 }, scale: { x: 1.2, y: 0.9, z: 1 }, yaw: Math.PI / 9 },
  camera: { position: { x: 0, y: 1.6, z: 0 }, yaw: 0, pitch: 0 },
  lens: { verticalFovRadians: Math.PI / 3, nearPlane: 0.5, farPlane: 30 },
  debug: true,
  paused: true,
});
export const inspectorStage = (mode?: string): number =>
  ({
    "pipeline-local": 1,
    "pipeline-homogeneous": 2,
    "pipeline-model": 3,
    "pipeline-view": 4,
    "pipeline-projection": 5,
    "pipeline-viewport": 6,
    "pipeline-validation": 7,
  })[mode ?? "pipeline-validation"] ?? 7;
export const inspectorViewport = (scene: InspectorScene) => ({
  width: 1100,
  height: scene.debug ? 560 : 800,
});
export function inspectorPreset(index: number): InspectorScene {
  const s = initialInspector();
  if (index === 1) {
    s.selectedVertex = 0;
    s.vertices[0] = { x: 1, y: 1, z: 0 };
    s.model = { position: { x: 1, y: 0, z: 6 }, scale: { x: 2, y: 1, z: 1 }, yaw: Math.PI / 2 };
    s.camera = { position: { x: 1, y: 0, z: 0 }, yaw: 0, pitch: 0 };
    s.lens = { verticalFovRadians: Math.PI / 2, nearPlane: 1, farPlane: 9 };
  }
  if (index >= 2 && index <= 6) {
    s.selectedVertex = 0;
    s.vertices[0] = { x: 0, y: 0, z: 0 };
    s.model = { position: { x: 0, y: 1.6, z: 6 }, scale: { x: 1, y: 1, z: 1 }, yaw: 0 };
    if (index === 2) s.model.position.z = 0.2;
    if (index === 3) s.model.position.z = -2;
    if (index === 4) s.model.position.z = 34;
    if (index === 5) s.model.position = { x: 12, y: 1.6, z: 4 };
    if (index === 6) s.model.position.z = 0;
  }
  return s;
}
export type InspectorParameter =
  | "localX"
  | "localY"
  | "localZ"
  | "modelX"
  | "modelZ"
  | "modelYaw"
  | "scaleX"
  | "cameraZ"
  | "cameraYaw"
  | "cameraPitch"
  | "fov"
  | "near"
  | "far";
export function editInspector(
  s: InspectorScene,
  key: InspectorParameter,
  value: number,
): InspectorScene {
  if (!Number.isFinite(value) || !s.vertices[s.selectedVertex]) return s;
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const angle = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
  const next = { ...s, paused: true };
  if (key.startsWith("local")) {
    const axis = key.slice(-1).toLowerCase() as "x" | "y" | "z";
    next.vertices = s.vertices.map((p, i) =>
      i === s.selectedVertex ? { ...p, [axis]: clamp(value, -4, 4) } : p,
    );
  } else if (key === "modelX" || key === "modelZ") {
    const axis = key === "modelX" ? "x" : "z";
    next.model = {
      ...s.model,
      position: {
        ...s.model.position,
        [axis]: clamp(value, axis === "x" ? -12 : -4, axis === "x" ? 12 : 34),
      },
    };
  } else if (key === "modelYaw") next.model = { ...s.model, yaw: angle(value) };
  else if (key === "scaleX")
    next.model = { ...s.model, scale: { ...s.model.scale, x: clamp(value, -2, 2) } };
  else if (key === "cameraZ")
    next.camera = { ...s.camera, position: { ...s.camera.position, z: clamp(value, -4, 8) } };
  else if (key === "cameraYaw") next.camera = { ...s.camera, yaw: angle(value) };
  else if (key === "cameraPitch")
    next.camera = { ...s.camera, pitch: clamp(value, (-89 * Math.PI) / 180, (89 * Math.PI) / 180) };
  else if (key === "fov")
    next.lens = {
      ...s.lens,
      verticalFovRadians: clamp(value, (25 * Math.PI) / 180, (110 * Math.PI) / 180),
    };
  else {
    if (!pipelineValidLens(s.lens)) return s;
    next.lens = { ...s.lens };
    if (key === "near") next.lens.nearPlane = clamp(value, 0.05, s.lens.farPlane - 0.05);
    if (key === "far") next.lens.farPlane = clamp(value, s.lens.nearPlane + 0.05, 60);
  }
  return next;
}
export function inspectorParameterValue(s: InspectorScene, key: InspectorParameter): number {
  const p = s.vertices[s.selectedVertex];
  if (!p) return NaN;
  return {
    localX: p.x,
    localY: p.y,
    localZ: p.z,
    modelX: s.model.position.x,
    modelZ: s.model.position.z,
    modelYaw: s.model.yaw,
    scaleX: s.model.scale.x,
    cameraZ: s.camera.position.z,
    cameraYaw: s.camera.yaw,
    cameraPitch: s.camera.pitch,
    fov: s.lens.verticalFovRadians,
    near: s.lens.nearPlane,
    far: s.lens.farPlane,
  }[key];
}
export function advanceInspector(s: InspectorScene, dt: number): InspectorScene {
  if (s.paused) return s;
  const yaw = advancePipelineYaw(s.model.yaw, (35 * Math.PI) / 180, dt);
  return yaw === s.model.yaw ? s : { ...s, model: { ...s.model, yaw } };
}
export function inspectorModelPoint(local: PipelineVec3, s: InspectorScene, stage: number) {
  if (stage >= 3) return pipelineTransform(pipelineModelMatrix(s.model), pipelineToPoint(local));
  return {
    x: local.x + s.model.position.x,
    y: local.y + s.model.position.y,
    z: local.z + s.model.position.z,
  };
}
export function inspectorViewPoint(world: PipelineVec3, s: InspectorScene, stage: number) {
  if (stage >= 4) return pipelineTransform(pipelineViewMatrix(s.camera), pipelineToPoint(world));
  return {
    x: world.x - s.camera.position.x,
    y: world.y - s.camera.position.y,
    z: world.z - s.camera.position.z,
  };
}
export function inspectorProjectView(
  view: PipelineVec3,
  s: InspectorScene,
  stage: number,
): PipelineVec2 | null {
  const v = inspectorViewport(s);
  if (!pipelineFinite3(view) || view.z <= 1e-9 || !pipelineValidLens(s.lens)) return null;
  if (stage >= 6) {
    const clip = pipelineTransform(
      pipelineProjectionMatrix(s.lens, v.width / v.height),
      pipelineToPoint(view),
    );
    const ndc = pipelinePerspectiveDivide(clip);
    return ndc ? pipelineNdcToScreen(ndc, v.width, v.height) : null;
  }
  const focal = v.height / (2 * Math.tan(s.lens.verticalFovRadians / 2));
  const p = {
    x: v.width / 2 + (view.x * focal) / view.z,
    y: v.height / 2 - (view.y * focal) / view.z,
  };
  return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
}
export function inspectorVisiblePoint(local: PipelineVec3, s: InspectorScene, stage: number) {
  const view = inspectorViewPoint(inspectorModelPoint(local, s, stage), s, stage),
    v = inspectorViewport(s);
  if (view.z < s.lens.nearPlane || view.z > s.lens.farPlane) return null;
  const p = inspectorProjectView(view, s, stage);
  return p && p.x >= 0 && p.y >= 0 && p.x < v.width && p.y < v.height ? p : null;
}
export function inspectorPick(
  point: PipelineVec2,
  s: InspectorScene,
  stage: number,
): number | null {
  const v = inspectorViewport(s);
  if (
    ![point.x, point.y].every(Number.isFinite) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x >= v.width ||
    point.y >= v.height
  )
    return null;
  let selected: number | null = null,
    best = 14;
  s.vertices.forEach((p, i) => {
    const screen = inspectorVisiblePoint(p, s, stage);
    if (!screen) return;
    const d = Math.hypot(screen.x - point.x, screen.y - point.y);
    if (d < best) {
      best = d;
      selected = i;
    }
  });
  return selected;
}
export interface InspectorLine {
  from: PipelineVec2;
  to: PipelineVec2;
  color: string;
}
export function inspectorLine(
  a: PipelineVec3,
  b: PipelineVec3,
  s: InspectorScene,
  stage: number,
  color: string,
): InspectorLine | null {
  const depth = clipPointDepth(
    inspectorViewPoint(a, s, stage),
    inspectorViewPoint(b, s, stage),
    s.lens,
  );
  if (!depth) return null;
  const pa = inspectorProjectView(depth[0], s, stage),
    pb = inspectorProjectView(depth[1], s, stage),
    v = inspectorViewport(s);
  if (!pa || !pb) return null;
  const screen = clipPointScreen(pa, pb, { x: 0, y: 0, width: v.width - 1, height: v.height - 1 });
  return screen ? { from: screen[0], to: screen[1], color } : null;
}
export function inspectorResults(s: InspectorScene, stage: number) {
  const v = inspectorViewport(s),
    local = s.vertices[s.selectedVertex] ?? { x: NaN, y: NaN, z: NaN };
  const trace = trace3dPipeline(local, s.model, s.camera, s.lens, v.width, v.height);
  const values: (PipelineVec2 | PipelineVec3 | PipelineVec4 | null)[] = [
    stage >= 1 ? trace.local : null,
    stage >= 3 ? trace.world : null,
    stage >= 4 ? trace.camera : null,
    stage >= 5 ? trace.clip : null,
    stage >= 6 ? trace.ndc : null,
    stage >= 6 ? trace.screen : null,
  ];
  const lines: InspectorLine[] = [];
  const line = (a: PipelineVec3, b: PipelineVec3, color: string) => {
    const l = inspectorLine(a, b, s, stage, color);
    if (l) lines.push(l);
  };
  for (let x = -8; x <= 8; x += 2) line({ x, y: 0, z: 2 }, { x, y: 0, z: 26 }, "#28334d");
  for (let z = 2; z <= 26; z += 2) line({ x: -8, y: 0, z }, { x: 8, y: 0, z }, "#28334d");
  line({ x: 0, y: 0, z: 6 }, { x: 3, y: 0, z: 6 }, "#ff6b6b");
  line({ x: 0, y: 0, z: 6 }, { x: 0, y: 3, z: 6 }, "#84a9ff");
  line({ x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: 9 }, "#53f0ae");
  if (stage >= 1)
    for (const [a, b] of INSPECTOR_EDGES)
      line(
        inspectorModelPoint(s.vertices[a], s, stage),
        inspectorModelPoint(s.vertices[b], s, stage),
        "#74839f",
      );
  const points =
    stage < 1
      ? []
      : s.vertices.flatMap((p, i) => {
          const point = inspectorVisiblePoint(p, s, stage);
          return point ? [{ ...point, index: i }] : [];
        });
  const translatedPoint = pipelineFinite3(local)
    ? pipelineTransform(pipelineTranslationMatrix({ x: 2, y: 1, z: 3 }), pipelineToPoint(local))
    : null;
  const translatedDirection = pipelineFinite3(local)
    ? pipelineTransform(pipelineTranslationMatrix({ x: 2, y: 1, z: 3 }), pipelineToDirection(local))
    : null;
  const direct = pipelineModelPointDirect(local, s.model);
  const modelError = trace.world
    ? Math.hypot(trace.world.x - direct.x, trace.world.y - direct.y, trace.world.z - direct.z)
    : Infinity;
  return {
    trace,
    values,
    lines,
    points,
    translatedPoint,
    translatedDirection,
    modelError,
    agreement:
      stage >= 7
        ? pipelineAgreementError(local, s.model, s.camera, s.lens, v.width, v.height)
        : null,
  };
}
export function formatInspectorValue(v: PipelineVec2 | PipelineVec3 | PipelineVec4 | null): string {
  if (!v) return "— chưa có giá trị (không thay bằng 0)";
  return (
    "(" +
    Object.values(v)
      .map((x) => Number(x).toFixed(5))
      .join(", ") +
    ")"
  );
}
