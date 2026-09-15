"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DEFAULT_PIPELINE_CAMERA,
  DEFAULT_PIPELINE_LENS,
  DEFAULT_PIPELINE_MODEL,
  advancePipelineYaw,
  pipelineAgreementError,
  pipelineModelPointDirect,
  pipelineToDirection,
  pipelineToPoint,
  pipelineTransform,
  pipelineTranslationMatrix,
  pipelineWorldToCameraDirect,
  trace3dPipeline,
  type PipelineCamera,
  type PipelineLens,
  type PipelineModel,
  type PipelineStatus,
  type PipelineTrace,
  type PipelineVec3,
  type PipelineVec4,
} from "@/lib/labs/pipeline3d";
import { LabReadout, drawLine, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const INITIAL_LOCAL: PipelineVec3 = { x: 1, y: 0.75, z: 0.5 };
const STAGES = ["LOCAL", "WORLD", "CAMERA", "CLIP", "NDC", "SCREEN"] as const;

const MODE_STAGE: Record<string, number> = {
  "pipeline-local": 0,
  "pipeline-homogeneous": 0,
  "pipeline-model": 1,
  "pipeline-view": 2,
  "pipeline-projection": 3,
  "pipeline-viewport": 5,
  "pipeline-validation": 5,
};

function cloneModel(): PipelineModel {
  return {
    position: { ...DEFAULT_PIPELINE_MODEL.position },
    scale: { ...DEFAULT_PIPELINE_MODEL.scale },
    yaw: DEFAULT_PIPELINE_MODEL.yaw,
  };
}

function cloneCamera(): PipelineCamera {
  return {
    position: { ...DEFAULT_PIPELINE_CAMERA.position },
    yaw: DEFAULT_PIPELINE_CAMERA.yaw,
    pitch: DEFAULT_PIPELINE_CAMERA.pitch,
  };
}

function cloneLens(): PipelineLens {
  return { ...DEFAULT_PIPELINE_LENS };
}

function formatVec3(value: PipelineVec3) {
  return `(${value.x.toFixed(3)}, ${value.y.toFixed(3)}, ${value.z.toFixed(3)})`;
}

function formatVec4(value: PipelineVec4) {
  return `(${value.x.toFixed(3)}, ${value.y.toFixed(3)}, ${value.z.toFixed(3)}, ${value.w.toFixed(3)})`;
}

function statusText(status: PipelineStatus) {
  if (status === "visible") return "visible — được phép vẽ";
  if (status === "behind") return "behind — sau camera";
  if (status === "before-near") return "before-near — quá sát camera";
  if (status === "beyond-far") return "beyond-far — vượt far plane";
  return "outside — ngoài frustum";
}

function stageValue(trace: PipelineTrace, stage: number) {
  if (stage === 0) return formatVec4(trace.local);
  if (stage === 1) return formatVec4(trace.world);
  if (stage === 2) return formatVec4(trace.camera);
  if (stage === 3) return formatVec4(trace.clip);
  if (stage === 4) return formatVec3(trace.ndc);
  return `(${trace.screen.x.toFixed(1)}, ${trace.screen.y.toFixed(1)}) px`;
}

function presetState(value: string) {
  const localVertex = { ...INITIAL_LOCAL };
  const model = cloneModel();
  const camera = cloneCamera();
  const lens = cloneLens();

  if (value === "near") {
    localVertex.x = 0.1;
    localVertex.y = 0.1;
    localVertex.z = 0;
    model.position = { x: 0, y: 0, z: 0.2 };
  } else if (value === "behind") {
    localVertex.x = 0;
    localVertex.y = 0;
    localVertex.z = 0;
    model.position = { x: 0, y: 0, z: -2 };
  } else if (value === "far") {
    localVertex.x = 0;
    localVertex.y = 0;
    localVertex.z = 0;
    model.position = { x: 0, y: 0, z: lens.farPlane + 4 };
  } else if (value === "outside") {
    localVertex.x = 0;
    localVertex.y = 0;
    localVertex.z = 0;
    model.position = { x: 12, y: 0, z: 4 };
  }
  return { localVertex, model, camera, lens };
}

export default function Pipeline3dLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const availableStage = MODE_STAGE[mode ?? "pipeline-validation"] ?? 5;
  const [localVertex, setLocalVertex] = useState<PipelineVec3>({ ...INITIAL_LOCAL });
  const [model, setModel] = useState<PipelineModel>(cloneModel);
  const [camera, setCamera] = useState<PipelineCamera>(cloneCamera);
  const [lens, setLens] = useState<PipelineLens>(cloneLens);
  const [selectedStage, setSelectedStage] = useState(() => availableStage);
  const [preset, setPreset] = useState("visible");
  const [homogeneousKind, setHomogeneousKind] = useState<"point" | "direction">("point");
  const [translationX, setTranslationX] = useState(2);
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const showHomogeneous = mode === "pipeline-homogeneous";
  const showModel = mode === "pipeline-model";
  const showView = mode === "pipeline-view";
  const showProjection = mode === "pipeline-projection";
  const showViewport = mode === "pipeline-viewport";
  const showValidation = mode === undefined || mode === "pipeline-validation";

  const viewport = useMemo(() => {
    const top = 116;
    const left = 24;
    const sideWidth = size.width >= 620 ? Math.min(230, size.width * 0.28) : 0;
    const gap = sideWidth > 0 ? 22 : 0;
    return {
      left,
      top,
      width: Math.max(220, size.width - left * 2 - sideWidth - gap),
      height: Math.max(170, size.height - top - 24),
      sideLeft: size.width - left - sideWidth,
      sideWidth,
    };
  }, [size.height, size.width]);

  const trace = useMemo(
    () => trace3dPipeline(localVertex, model, camera, lens, viewport.width, viewport.height),
    [camera, lens, localVertex, model, viewport.height, viewport.width],
  );

  useEffect(() => {
    if (!showValidation || paused || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = (now - previous) / 1000;
      previous = now;
      setModel((current) => ({
        ...current,
        yaw: advancePipelineYaw(current.yaw, 35 * DEG_TO_RAD, deltaTime),
      }));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, showValidation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const railLeft = 35;
    const railRight = size.width - 35;
    const railY = 55;
    drawLine(ctx, { x: railLeft, y: railY }, { x: railRight, y: railY }, "#394662", 2);
    ctx.textAlign = "center";
    ctx.font = "700 10px ui-monospace";

    STAGES.forEach((label, stage) => {
      const x = railLeft + (stage * (railRight - railLeft)) / (STAGES.length - 1);
      const available = stage <= availableStage;
      ctx.beginPath();
      ctx.arc(x, railY, stage === selectedStage ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = stage === selectedStage ? "#ffbe52" : available ? "#68a0ef" : "#303b54";
      ctx.fill();
      ctx.fillStyle = available ? "#dce7ff" : "#65718a";
      ctx.fillText(label, x, railY + 25);
    });
    ctx.textAlign = "start";

    ctx.strokeStyle = "#405071";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(viewport.left, viewport.top, viewport.width, viewport.height);
    drawLine(
      ctx,
      { x: viewport.left + viewport.width / 2, y: viewport.top },
      { x: viewport.left + viewport.width / 2, y: viewport.top + viewport.height },
      "#26334d",
    );
    drawLine(
      ctx,
      { x: viewport.left, y: viewport.top + viewport.height / 2 },
      { x: viewport.left + viewport.width, y: viewport.top + viewport.height / 2 },
      "#26334d",
    );

    let markerX = viewport.left + viewport.width / 2;
    let markerY = viewport.top + viewport.height / 2;
    let markerVisible = true;
    if (availableStage >= 5) {
      markerVisible = trace.status === "visible";
      markerX = viewport.left + trace.screen.x;
      markerY = viewport.top + trace.screen.y;
    } else {
      let point: PipelineVec3 = trace.local;
      if (availableStage === 1) point = trace.world;
      if (availableStage === 2 || availableStage === 3) point = trace.camera;
      markerX += point.x * 34;
      markerY -= point.y * 34;
    }

    if (markerVisible && Number.isFinite(markerX) && Number.isFinite(markerY)) {
      ctx.beginPath();
      ctx.arc(markerX, markerY, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#ffbe5233";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(markerX, markerY, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe070";
      ctx.fill();
      drawLine(ctx, { x: markerX - 15, y: markerY }, { x: markerX + 15, y: markerY }, "#ffe070");
      drawLine(ctx, { x: markerX, y: markerY - 15 }, { x: markerX, y: markerY + 15 }, "#ffe070");
    } else {
      ctx.fillStyle = "#ff7b86";
      ctx.font = "700 12px ui-monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        statusText(trace.status),
        viewport.left + viewport.width / 2,
        viewport.top + viewport.height / 2,
      );
      ctx.textAlign = "start";
    }

    ctx.fillStyle = "#9fb0d0";
    ctx.font = "700 11px ui-monospace";
    ctx.fillText(
      `${STAGES[selectedStage]} ${stageValue(trace, selectedStage)}`,
      viewport.left + 10,
      viewport.top + 19,
    );

    if (viewport.sideWidth > 0) {
      const sideTop = viewport.top + 12;
      const sideBottom = viewport.top + viewport.height - 12;
      const originX = viewport.sideLeft + 18;
      const zScale = Math.max(3, (viewport.sideWidth - 36) / 35);
      const yCenter = (sideTop + sideBottom) / 2;
      ctx.fillStyle = "#9fb0d0";
      ctx.fillText("X–Z TRACE", viewport.sideLeft, viewport.top - 10);
      drawLine(ctx, { x: originX, y: sideTop }, { x: originX, y: sideBottom }, "#394662");
      drawLine(
        ctx,
        { x: viewport.sideLeft, y: yCenter },
        { x: viewport.sideLeft + viewport.sideWidth, y: yCenter },
        "#394662",
      );
      const stagePoints = [
        { label: "L", value: trace.local, color: "#7e8da8" },
        { label: "W", value: trace.world, color: "#68a0ef" },
        { label: "C", value: trace.camera, color: "#ffbe52" },
      ];
      stagePoints.forEach((entry) => {
        const x = originX + Math.max(-2, Math.min(32, entry.value.z)) * zScale;
        const y = yCenter - Math.max(-5, Math.min(5, entry.value.x)) * 12;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = entry.color;
        ctx.fill();
        ctx.fillStyle = "#dce7ff";
        ctx.fillText(entry.label, x + 7, y - 7);
      });
    }
  }, [availableStage, selectedStage, size, trace, viewport]);

  const setLocalAxis = (axis: keyof PipelineVec3, value: number) => {
    setLocalVertex((current) => ({ ...current, [axis]: value }));
    setPreset("custom");
    setPaused(true);
  };

  const applyPreset = (value: string) => {
    const next = presetState(value);
    setPreset(value);
    setLocalVertex(next.localVertex);
    setModel(next.model);
    setCamera(next.camera);
    setLens(next.lens);
    setPaused(true);
  };

  const reset = () => {
    setLocalVertex({ ...INITIAL_LOCAL });
    setModel(cloneModel());
    setCamera(cloneCamera());
    setLens(cloneLens());
    setSelectedStage(availableStage);
    setPreset("visible");
    setHomogeneousKind("point");
    setTranslationX(2);
    setPaused(true);
    setCapturing(false);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCapturing(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const previous = dragStart.current;
    if (!previous || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    dragStart.current = { x: event.clientX, y: event.clientY };
    setPaused(true);
    setPreset("custom");
    if (availableStage >= 1) {
      setModel((current) => ({ ...current, yaw: current.yaw + deltaX * 0.01 }));
      if (availableStage >= 2) {
        setCamera((current) => ({
          ...current,
          pitch: Math.max(
            -89 * DEG_TO_RAD,
            Math.min(89 * DEG_TO_RAD, current.pitch - deltaY * 0.006),
          ),
        }));
      }
    } else {
      setLocalVertex((current) => ({
        ...current,
        x: Math.max(-4, Math.min(4, current.x + deltaX / 45)),
        y: Math.max(-3, Math.min(3, current.y - deltaY / 45)),
      }));
    }
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragStart.current = null;
    setCapturing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (showValidation && event.key === "ArrowLeft")
      setSelectedStage((current) => Math.max(0, current - 1));
    else if (showValidation && event.key === "ArrowRight")
      setSelectedStage((current) => Math.min(5, current + 1));
    else if (event.key === "ArrowLeft") setLocalAxis("x", localVertex.x - 0.1);
    else if (event.key === "ArrowRight") setLocalAxis("x", localVertex.x + 0.1);
    else if (event.key === "ArrowUp") setLocalAxis("y", localVertex.y + 0.1);
    else if (event.key === "ArrowDown") setLocalAxis("y", localVertex.y - 0.1);
    else if (key === "a" && availableStage >= 1)
      setModel((current) => ({ ...current, yaw: current.yaw - 5 * DEG_TO_RAD }));
    else if (key === "d" && availableStage >= 1)
      setModel((current) => ({ ...current, yaw: current.yaw + 5 * DEG_TO_RAD }));
    else if (key === "w" && availableStage >= 2)
      setCamera((current) => ({
        ...current,
        position: { ...current.position, z: current.position.z + 0.2 },
      }));
    else if (key === "s" && availableStage >= 2)
      setCamera((current) => ({
        ...current,
        position: { ...current.position, z: current.position.z - 0.2 },
      }));
    else if (key === " " && showValidation) setPaused((current) => !current);
    else return;
    event.preventDefault();
  };

  const homogeneousInput =
    homogeneousKind === "point" ? pipelineToPoint(localVertex) : pipelineToDirection(localVertex);
  const homogeneousOutput = pipelineTransform(
    pipelineTranslationMatrix({ x: translationX, y: 1, z: 3 }),
    homogeneousInput,
  );
  const modelDirect = pipelineModelPointDirect(localVertex, model);
  const modelError = Math.hypot(
    trace.world.x - modelDirect.x,
    trace.world.y - modelDirect.y,
    trace.world.z - modelDirect.z,
  );
  const cameraDirect = pipelineWorldToCameraDirect(trace.world, camera);
  const viewError = Math.hypot(
    trace.camera.x - cameraDirect.x,
    trace.camera.y - cameraDirect.y,
    trace.camera.z - cameraDirect.z,
  );
  const agreement = pipelineAgreementError(
    localVertex,
    model,
    camera,
    lens,
    viewport.width,
    viewport.height,
  );

  const readout = [
    { label: "stage đang chọn", value: STAGES[selectedStage] },
    { label: "giá trị", value: stageValue(trace, selectedStage) },
  ];
  if (showHomogeneous) {
    readout.push({ label: "đầu vào homogeneous", value: formatVec4(homogeneousInput) });
    readout.push({ label: "sau translation", value: formatVec4(homogeneousOutput) });
  } else if (showModel) {
    readout.push({ label: "local vertex", value: formatVec4(trace.local) });
    readout.push({ label: "model direct error", value: modelError.toExponential(2) });
  } else if (showView) {
    readout.push({ label: "world vertex", value: formatVec4(trace.world) });
    readout.push({ label: "view direct error", value: viewError.toExponential(2) });
  } else if (showProjection) {
    readout.push({ label: "camera depth", value: trace.camera.z.toFixed(3) });
    readout.push({ label: "clip.w", value: trace.clip.w.toFixed(3) });
  } else if (showViewport) {
    readout.push({ label: "trạng thái", value: statusText(trace.status) });
    readout.push({ label: "screen pixel", value: stageValue(trace, 5) });
  } else if (showValidation) {
    readout.push({ label: "trạng thái", value: statusText(trace.status) });
    readout.push({ label: "MVP agreement error", value: agreement.toExponential(2) });
    readout.push({ label: "pointer capture", value: capturing ? "đang kéo" : "đã nhả" });
  } else {
    readout.push({ label: "local vertex", value: formatVec3(localVertex) });
  }

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {(mode === "pipeline-local" || showHomogeneous) &&
          (["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              Local {axis.toUpperCase()}
              <input
                type="range"
                min="-4"
                max="4"
                step="0.1"
                value={localVertex[axis]}
                onChange={(event) => setLocalAxis(axis, Number(event.target.value))}
              />
              <output>{localVertex[axis].toFixed(1)}</output>
            </label>
          ))}
        {showHomogeneous && (
          <label>
            Loại dữ liệu
            <select
              value={homogeneousKind}
              onChange={(event) => setHomogeneousKind(event.target.value as "point" | "direction")}
            >
              <option value="point">Point · w=1</option>
              <option value="direction">Direction · w=0</option>
            </select>
          </label>
        )}
        {showHomogeneous && (
          <label>
            Translation X
            <input
              type="range"
              min="-4"
              max="4"
              step="0.1"
              value={translationX}
              onChange={(event) => setTranslationX(Number(event.target.value))}
            />
            <output>{translationX.toFixed(1)}</output>
          </label>
        )}
        {(showModel || showValidation) && (
          <label>
            Model yaw
            <input
              type="range"
              min="-180"
              max="180"
              value={model.yaw * RAD_TO_DEG}
              onChange={(event) =>
                setModel((current) => ({
                  ...current,
                  yaw: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(model.yaw * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showModel && (
          <label>
            Scale X
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={model.scale.x}
              onChange={(event) =>
                setModel((current) => ({
                  ...current,
                  scale: { ...current.scale, x: Number(event.target.value) },
                }))
              }
            />
            <output>{model.scale.x.toFixed(1)}</output>
          </label>
        )}
        {(showModel || showValidation) && (
          <label>
            Model Z
            <input
              type="range"
              min="-4"
              max="34"
              step="0.1"
              value={model.position.z}
              onChange={(event) => {
                setModel((current) => ({
                  ...current,
                  position: { ...current.position, z: Number(event.target.value) },
                }));
                setPreset("custom");
              }}
            />
            <output>{model.position.z.toFixed(1)}</output>
          </label>
        )}
        {(showView || showValidation) && (
          <label>
            Camera Z
            <input
              type="range"
              min="-4"
              max="8"
              step="0.1"
              value={camera.position.z}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  position: { ...current.position, z: Number(event.target.value) },
                }))
              }
            />
            <output>{camera.position.z.toFixed(1)}</output>
          </label>
        )}
        {showView && (
          <label>
            Camera yaw
            <input
              type="range"
              min="-90"
              max="90"
              value={camera.yaw * RAD_TO_DEG}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  yaw: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(camera.yaw * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showView && (
          <label>
            Camera pitch
            <input
              type="range"
              min="-60"
              max="60"
              value={camera.pitch * RAD_TO_DEG}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  pitch: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(camera.pitch * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {(showProjection || showViewport || showValidation) && (
          <label>
            Vertical FOV
            <input
              type="range"
              min="25"
              max="110"
              value={lens.verticalFovRadians * RAD_TO_DEG}
              onChange={(event) =>
                setLens((current) => ({
                  ...current,
                  verticalFovRadians: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(lens.verticalFovRadians * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showProjection && (
          <label>
            Near plane
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={lens.nearPlane}
              onChange={(event) =>
                setLens((current) => ({ ...current, nearPlane: Number(event.target.value) }))
              }
            />
            <output>{lens.nearPlane.toFixed(1)}</output>
          </label>
        )}
        {(showViewport || showValidation) && (
          <label>
            Tình huống
            <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
              <option value="visible">Visible</option>
              <option value="near">Before near</option>
              <option value="behind">Behind camera</option>
              <option value="far">Beyond far</option>
              <option value="outside">Outside frustum</option>
              {preset === "custom" && <option value="custom">Tự chỉnh</option>}
            </select>
          </label>
        )}
        {showValidation && (
          <label>
            Stage
            <select
              value={selectedStage}
              onChange={(event) => setSelectedStage(Number(event.target.value))}
            >
              {STAGES.map((stage, index) => (
                <option key={stage} value={index}>
                  {stage}
                </option>
              ))}
            </select>
          </label>
        )}
        {showValidation && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showValidation && (
          <button
            onClick={() =>
              setModel((current) => ({
                ...current,
                yaw: advancePipelineYaw(current.yaw, 35 * DEG_TO_RAD, 1 / 30),
              }))
            }
          >
            Tiến một bước
          </button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Pipeline 3D từ local vertex qua Model, View, Projection tới pixel"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          dragStart.current = null;
          setCapturing(false);
        }}
      />
      <LabReadout items={readout} />
    </div>
  );
}
