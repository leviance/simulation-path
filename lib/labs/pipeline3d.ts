export interface PipelineVec2 {
  x: number;
  y: number;
}

export interface PipelineVec3 {
  x: number;
  y: number;
  z: number;
}

export interface PipelineVec4 extends PipelineVec3 {
  w: number;
}

export interface PipelineMat4 {
  values: readonly number[];
}

export interface PipelineModel {
  position: PipelineVec3;
  scale: PipelineVec3;
  yaw: number;
}

export interface PipelineCamera {
  position: PipelineVec3;
  yaw: number;
  pitch: number;
}

export interface PipelineLens {
  verticalFovRadians: number;
  nearPlane: number;
  farPlane: number;
}

export type PipelineStatus =
  "visible" | "behind" | "before-near" | "beyond-far" | "outside" | "invalid";

export interface PipelineTrace {
  local: PipelineVec4 | null;
  world: PipelineVec4 | null;
  camera: PipelineVec4 | null;
  clip: PipelineVec4 | null;
  ndc: PipelineVec3 | null;
  screen: PipelineVec2 | null;
  status: PipelineStatus;
}

export const DEFAULT_PIPELINE_MODEL: PipelineModel = {
  position: { x: 0.3, y: -0.2, z: 6 },
  scale: { x: 1.2, y: 0.9, z: 1 },
  yaw: (20 * Math.PI) / 180,
};

export const DEFAULT_PIPELINE_CAMERA: PipelineCamera = {
  position: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 0,
};

export const DEFAULT_PIPELINE_LENS: PipelineLens = {
  verticalFovRadians: (60 * Math.PI) / 180,
  nearPlane: 0.5,
  farPlane: 30,
};

function matrix(values: number[]): PipelineMat4 {
  if (values.length !== 16) throw new Error("Mat4 requires exactly sixteen values");
  return { values };
}

function at(source: PipelineMat4, row: number, column: number) {
  return source.values[row * 4 + column];
}

export function pipelineToPoint(point: PipelineVec3): PipelineVec4 {
  return { ...point, w: 1 };
}

export function pipelineToDirection(direction: PipelineVec3): PipelineVec4 {
  return { ...direction, w: 0 };
}

export function pipelineIdentityMatrix(): PipelineMat4 {
  return matrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

export function pipelineMultiplyMatrices(left: PipelineMat4, right: PipelineMat4): PipelineMat4 {
  const values = Array<number>(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      for (let index = 0; index < 4; index += 1) {
        values[row * 4 + column] += at(left, row, index) * at(right, index, column);
      }
    }
  }
  return matrix(values);
}

export function pipelineTransform(matrixValue: PipelineMat4, vector: PipelineVec4): PipelineVec4 {
  const input = [vector.x, vector.y, vector.z, vector.w];
  const output = [0, 0, 0, 0];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      output[row] += at(matrixValue, row, column) * input[column];
    }
  }
  return { x: output[0], y: output[1], z: output[2], w: output[3] };
}

export function pipelineTranslationMatrix(translation: PipelineVec3): PipelineMat4 {
  return matrix([
    1,
    0,
    0,
    translation.x,
    0,
    1,
    0,
    translation.y,
    0,
    0,
    1,
    translation.z,
    0,
    0,
    0,
    1,
  ]);
}

export function pipelineScaleMatrix(scale: PipelineVec3): PipelineMat4 {
  return matrix([scale.x, 0, 0, 0, 0, scale.y, 0, 0, 0, 0, scale.z, 0, 0, 0, 0, 1]);
}

export function pipelineRotationYMatrix(angle: number): PipelineMat4 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return matrix([cosine, 0, sine, 0, 0, 1, 0, 0, -sine, 0, cosine, 0, 0, 0, 0, 1]);
}

export function pipelineRotationXMatrix(angle: number): PipelineMat4 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return matrix([1, 0, 0, 0, 0, cosine, -sine, 0, 0, sine, cosine, 0, 0, 0, 0, 1]);
}

export function pipelineModelMatrix(model: PipelineModel): PipelineMat4 {
  const rotationScale = pipelineMultiplyMatrices(
    pipelineRotationYMatrix(model.yaw),
    pipelineScaleMatrix(model.scale),
  );
  return pipelineMultiplyMatrices(pipelineTranslationMatrix(model.position), rotationScale);
}

export function pipelineModelPointDirect(
  localPoint: PipelineVec3,
  model: PipelineModel,
): PipelineVec3 {
  const scaled = {
    x: localPoint.x * model.scale.x,
    y: localPoint.y * model.scale.y,
    z: localPoint.z * model.scale.z,
  };
  const cosine = Math.cos(model.yaw);
  const sine = Math.sin(model.yaw);
  const rotated = {
    x: cosine * scaled.x + sine * scaled.z,
    y: scaled.y,
    z: -sine * scaled.x + cosine * scaled.z,
  };
  return {
    x: rotated.x + model.position.x,
    y: rotated.y + model.position.y,
    z: rotated.z + model.position.z,
  };
}

export function pipelineViewMatrix(camera: PipelineCamera): PipelineMat4 {
  const inverseTranslation = pipelineTranslationMatrix({
    x: -camera.position.x,
    y: -camera.position.y,
    z: -camera.position.z,
  });
  const inverseYawTranslation = pipelineMultiplyMatrices(
    pipelineRotationYMatrix(-camera.yaw),
    inverseTranslation,
  );
  return pipelineMultiplyMatrices(pipelineRotationXMatrix(camera.pitch), inverseYawTranslation);
}

export function pipelineWorldToCameraDirect(
  worldPoint: PipelineVec3,
  camera: PipelineCamera,
): PipelineVec3 {
  const relative = {
    x: worldPoint.x - camera.position.x,
    y: worldPoint.y - camera.position.y,
    z: worldPoint.z - camera.position.z,
  };
  const yawCosine = Math.cos(-camera.yaw);
  const yawSine = Math.sin(-camera.yaw);
  const yawNeutral = {
    x: yawCosine * relative.x + yawSine * relative.z,
    y: relative.y,
    z: -yawSine * relative.x + yawCosine * relative.z,
  };
  const pitchCosine = Math.cos(camera.pitch);
  const pitchSine = Math.sin(camera.pitch);
  return {
    x: yawNeutral.x,
    y: pitchCosine * yawNeutral.y - pitchSine * yawNeutral.z,
    z: pitchSine * yawNeutral.y + pitchCosine * yawNeutral.z,
  };
}

export function pipelineProjectionMatrix(lens: PipelineLens, aspectRatio: number): PipelineMat4 {
  const focalScale = 1 / Math.tan(lens.verticalFovRadians * 0.5);
  const depthRange = lens.farPlane - lens.nearPlane;
  return matrix([
    focalScale / aspectRatio,
    0,
    0,
    0,
    0,
    focalScale,
    0,
    0,
    0,
    0,
    lens.farPlane / depthRange,
    (-lens.nearPlane * lens.farPlane) / depthRange,
    0,
    0,
    1,
    0,
  ]);
}

export function pipelineFinite3(v: PipelineVec3): boolean {
  return [v.x, v.y, v.z].every(Number.isFinite);
}
export function pipelineFinite4(v: PipelineVec4): boolean {
  return pipelineFinite3(v) && Number.isFinite(v.w);
}
export function pipelineValidLens(lens: PipelineLens): boolean {
  return (
    [lens.verticalFovRadians, lens.nearPlane, lens.farPlane].every(Number.isFinite) &&
    lens.verticalFovRadians > 0 &&
    lens.verticalFovRadians < Math.PI &&
    lens.nearPlane > 0 &&
    lens.farPlane > lens.nearPlane
  );
}
export function pipelineValidViewport(width: number, height: number): boolean {
  return [width, height, width / height].every(Number.isFinite) && width > 0 && height > 0;
}
export function pipelinePerspectiveDivide(clipPoint: PipelineVec4): PipelineVec3 | null {
  if (!pipelineFinite4(clipPoint) || clipPoint.w <= 1e-9) return null;
  const ndc = {
    x: clipPoint.x / clipPoint.w,
    y: clipPoint.y / clipPoint.w,
    z: clipPoint.z / clipPoint.w,
  };
  return pipelineFinite3(ndc) ? ndc : null;
}
export function pipelineNdcToScreen(
  ndc: PipelineVec3,
  width: number,
  height: number,
): PipelineVec2 | null {
  if (!pipelineFinite3(ndc) || !pipelineValidViewport(width, height)) return null;
  const screen = { x: (ndc.x + 1) * 0.5 * width, y: (1 - ndc.y) * 0.5 * height };
  return Number.isFinite(screen.x) && Number.isFinite(screen.y) ? screen : null;
}
export function trace3dPipeline(
  localVertex: PipelineVec3,
  model: PipelineModel,
  camera: PipelineCamera,
  lens: PipelineLens,
  width: number,
  height: number,
): PipelineTrace {
  const trace: PipelineTrace = {
    local: null,
    world: null,
    camera: null,
    clip: null,
    ndc: null,
    screen: null,
    status: "invalid",
  };
  if (!pipelineFinite3(localVertex)) return trace;
  trace.local = pipelineToPoint(localVertex);
  if (
    !pipelineFinite3(model.position) ||
    !pipelineFinite3(model.scale) ||
    !Number.isFinite(model.yaw)
  )
    return trace;
  const world = pipelineTransform(pipelineModelMatrix(model), trace.local);
  if (!pipelineFinite4(world)) return trace;
  trace.world = world;
  if (!pipelineFinite3(camera.position) || ![camera.yaw, camera.pitch].every(Number.isFinite))
    return trace;
  const view = pipelineTransform(pipelineViewMatrix(camera), world);
  if (!pipelineFinite4(view)) return trace;
  trace.camera = view;
  if (!pipelineValidLens(lens) || !pipelineValidViewport(width, height)) return trace;
  const clip = pipelineTransform(pipelineProjectionMatrix(lens, width / height), view);
  if (!pipelineFinite4(clip)) return trace;
  trace.clip = clip;
  if (clip.w <= 1e-9) return { ...trace, status: "behind" };
  trace.ndc = pipelinePerspectiveDivide(clip);
  if (!trace.ndc) return trace;
  trace.screen = pipelineNdcToScreen(trace.ndc, width, height);
  if (!trace.screen) return trace;
  const epsilon = 1e-10 * Math.max(1, Math.abs(clip.w));
  if (clip.z < -epsilon) trace.status = "before-near";
  else if (clip.z > clip.w + epsilon) trace.status = "beyond-far";
  else if (Math.abs(clip.x) > clip.w + epsilon || Math.abs(clip.y) > clip.w + epsilon)
    trace.status = "outside";
  else trace.status = "visible";
  return trace;
}

export function pipelineMvpMatrix(
  model: PipelineModel,
  camera: PipelineCamera,
  lens: PipelineLens,
  aspectRatio: number,
): PipelineMat4 {
  const viewModel = pipelineMultiplyMatrices(
    pipelineViewMatrix(camera),
    pipelineModelMatrix(model),
  );
  return pipelineMultiplyMatrices(pipelineProjectionMatrix(lens, aspectRatio), viewModel);
}

export function pipelineAgreementError(
  localVertex: PipelineVec3,
  model: PipelineModel,
  camera: PipelineCamera,
  lens: PipelineLens,
  width: number,
  height: number,
) {
  const separate = trace3dPipeline(localVertex, model, camera, lens, width, height).clip;
  if (!separate) return Infinity;
  const composed = pipelineTransform(
    pipelineMvpMatrix(model, camera, lens, width / height),
    pipelineToPoint(localVertex),
  );
  if (!pipelineFinite4(composed)) return Infinity;
  return Math.max(
    Math.abs(separate.x - composed.x),
    Math.abs(separate.y - composed.y),
    Math.abs(separate.z - composed.z),
    Math.abs(separate.w - composed.w),
  );
}

export function advancePipelineYaw(yaw: number, speed: number, deltaTime: number) {
  if (![yaw, speed, deltaTime].every(Number.isFinite) || deltaTime <= 0) return yaw;
  const safeDeltaTime = Math.min(deltaTime, 0.1);
  const next = yaw + speed * safeDeltaTime;
  if (!Number.isFinite(next)) return yaw;
  return Math.atan2(Math.sin(next), Math.cos(next));
}
