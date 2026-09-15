"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  compareFrames,
  defaultCubeScene,
  makeIndexedCube,
  makeMvp,
  renderCubeContract,
  renderGpuReferenceContract,
  rendererLabel,
  traceCubeVertex,
  type CubeFrame,
  type CubeSceneState,
  type RendererKind,
} from "@/lib/labs/dual-renderer-cube";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type ViewMode = "color" | "depth" | "difference";

const mesh = makeIndexedCube();

function modeCapabilities(mode?: InteractiveLabMode) {
  const validation = mode === "cube-validation" || mode === undefined;
  return {
    canSwitchRenderer: mode === "shared-scene" || mode === "renderer-switch" || validation,
    canInspectDepth: mode === "depth-contract" || mode === "renderer-switch" || validation,
    canToggleDepth: mode === "depth-contract" || mode === "renderer-switch" || validation,
    canToggleCulling: mode === "culling-contract" || mode === "renderer-switch" || validation,
    canReverseOrder: mode === "depth-contract" || mode === "renderer-switch" || validation,
    canCompareFrames: mode === "renderer-switch" || validation,
  };
}

function initialRenderer(mode?: InteractiveLabMode): RendererKind {
  return mode === "gpu-indexed-draw" ? "gpu" : "cpu";
}

function modeStage(mode?: InteractiveLabMode) {
  if (mode === "shared-scene") return "Một scene state, hai renderer";
  if (mode === "indexed-mesh") return "24 vertices và 36 indices";
  if (mode === "cpu-path") return "CPU transform → raster → RGBA8";
  if (mode === "gpu-indexed-draw") return "VBO + EBO + glDrawElements";
  if (mode === "mvp-contract") return "C++ Mat4 ↔ GLSL uMvp";
  if (mode === "depth-contract") return "CPU Z-buffer ↔ GL_DEPTH_TEST";
  if (mode === "culling-contract") return "Winding ↔ face culling";
  if (mode === "renderer-switch") return "F1/F2 chỉ đổi backend";
  return "Validation và lifecycle hoàn chỉnh";
}

function drawFrame(
  context: CanvasRenderingContext2D,
  frame: CubeFrame,
  reference: CubeFrame,
  viewMode: ViewMode,
  viewport: { x: number; y: number; width: number; height: number },
) {
  const image = context.createImageData(frame.width, frame.height);
  for (let pixel = 0; pixel < frame.colors.length; pixel += 1) {
    const output = pixel * 4;
    if (viewMode === "depth") {
      const depth = Math.min(1, Math.max(0, frame.depths[pixel]));
      const shade = depth >= 1 ? 13 : Math.round((1 - depth) * 215 + 24);
      image.data[output] = shade;
      image.data[output + 1] = shade;
      image.data[output + 2] = shade;
    } else if (viewMode === "difference") {
      const colorDiffers = frame.colors[pixel] !== reference.colors[pixel];
      const depthDiffers = Math.abs(frame.depths[pixel] - reference.depths[pixel]) > 1e-9;
      if (colorDiffers || depthDiffers) {
        image.data[output] = 224;
        image.data[output + 1] = depthDiffers ? 108 : 192;
        image.data[output + 2] = colorDiffers ? 117 : 123;
      } else {
        image.data[output] = 22;
        image.data[output + 1] = 30;
        image.data[output + 2] = 45;
      }
    } else {
      const packed = frame.colors[pixel];
      image.data[output] = (packed >>> 24) & 0xff;
      image.data[output + 1] = (packed >>> 16) & 0xff;
      image.data[output + 2] = (packed >>> 8) & 0xff;
    }
    image.data[output + 3] = 255;
  }

  const buffer = document.createElement("canvas");
  buffer.width = frame.width;
  buffer.height = frame.height;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) return;
  bufferContext.putImageData(image, 0, 0);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, viewport.x, viewport.y, viewport.width, viewport.height);
  context.restore();
}

function drawPipelineRail(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  renderer: RendererKind,
) {
  const cpu = ["CubeScene", "C++ MVP", "CPU raster", "Z-buffer", "RGBA8 upload"];
  const gpu = ["CubeScene", "uMvp", "GPU raster", "Depth test", "Fragment output"];
  const stages = renderer === "cpu" ? cpu : gpu;
  const left = 18;
  const top = height - 38;
  const slotWidth = (width - left * 2) / stages.length;
  context.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  stages.forEach((stage, index) => {
    const x = left + index * slotWidth;
    context.fillStyle = index === 0 ? "#24364f" : renderer === "cpu" ? "#22362f" : "#1f3048";
    context.fillRect(x, top, slotWidth - 3, 23);
    context.fillStyle = "#d7deec";
    context.fillText(stage, x + 6, top + 15);
  });
}

export default function DualRendererCubeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const previousPointer = useRef({ x: 0, y: 0 });
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const capabilities = modeCapabilities(mode);
  const [renderer, setRenderer] = useState<RendererKind>(() => initialRenderer(mode));
  const [angleXDegrees, setAngleXDegrees] = useState(-24);
  const [angleYDegrees, setAngleYDegrees] = useState(39);
  const [depthEnabled, setDepthEnabled] = useState(true);
  const [cullingEnabled, setCullingEnabled] = useState(true);
  const [reverseOrder, setReverseOrder] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("color");
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);

  const scene = useMemo<CubeSceneState>(
    () => ({
      angleX: (angleXDegrees * Math.PI) / 180,
      angleY: (angleYDegrees * Math.PI) / 180,
      depthEnabled,
      cullingEnabled,
    }),
    [angleXDegrees, angleYDegrees, cullingEnabled, depthEnabled],
  );

  const reset = useCallback(() => {
    setRenderer(initialRenderer(mode));
    setAngleXDegrees((defaultCubeScene.angleX * 180) / Math.PI);
    setAngleYDegrees((defaultCubeScene.angleY * 180) / Math.PI);
    setDepthEnabled(true);
    setCullingEnabled(true);
    setReverseOrder(false);
    setViewMode("color");
    setPaused(true);
  }, [mode]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setAngleYDegrees((current) => (current + deltaSeconds * 28) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion]);

  const viewport = useMemo(
    () => ({
      x: 20,
      y: 34,
      width: Math.max(1, size.width - 40),
      height: Math.max(1, size.height - 94),
    }),
    [size],
  );

  const sampleSize = useMemo(() => {
    const width = 192;
    const aspect = viewport.width / Math.max(1, viewport.height);
    return { width, height: Math.max(96, Math.min(160, Math.round(width / aspect))) };
  }, [viewport.height, viewport.width]);

  const cpuFrame = useMemo(
    () => renderCubeContract(sampleSize.width, sampleSize.height, scene, reverseOrder),
    [reverseOrder, sampleSize, scene],
  );
  const gpuFrame = useMemo(
    () => renderGpuReferenceContract(sampleSize.width, sampleSize.height, scene, reverseOrder),
    [reverseOrder, sampleSize, scene],
  );
  const activeFrame = renderer === "cpu" ? cpuFrame : gpuFrame;
  const referenceFrame = renderer === "cpu" ? gpuFrame : cpuFrame;
  const difference = useMemo(() => compareFrames(cpuFrame, gpuFrame), [cpuFrame, gpuFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#080d19";
    context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = "#0d1526";
    context.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);

    drawFrame(context, activeFrame, referenceFrame, viewMode, viewport);
    context.strokeStyle = renderer === "cpu" ? "#98c379" : "#61afef";
    context.lineWidth = 2;
    context.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
    context.fillStyle = "#d7deec";
    context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    context.fillText(rendererLabel(renderer), viewport.x, 20);
    context.fillStyle = "#8794aa";
    context.fillText("Kéo để xoay cùng CubeScene", viewport.x + 180, 20);
    drawPipelineRail(context, size.width, size.height, renderer);
  }, [activeFrame, referenceFrame, renderer, size, viewMode, viewport]);
  const trace = useMemo(() => {
    const mvp = makeMvp(scene, viewport.width / viewport.height);
    return traceCubeVertex(mesh.vertices[0], mvp, viewport.width, viewport.height);
  }, [scene, viewport]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    previousPointer.current = canvasPoint(event, event.currentTarget);
    setCapturing(true);
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const current = canvasPoint(event, event.currentTarget);
    setAngleYDegrees((angle) => angle + (current.x - previousPointer.current.x) * 0.45);
    setAngleXDegrees((angle) => angle + (current.y - previousPointer.current.y) * 0.45);
    previousPointer.current = current;
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    setCapturing(false);
  };

  const step = () => {
    setAngleYDegrees((angle) => angle + 10);
    setPaused(true);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "F1" && capabilities.canSwitchRenderer) {
      event.preventDefault();
      setRenderer("cpu");
    } else if (event.key === "F2" && capabilities.canSwitchRenderer) {
      event.preventDefault();
      setRenderer("gpu");
    } else if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    } else if (event.key.toLowerCase() === "n") {
      step();
    } else if (event.key.toLowerCase() === "d" && capabilities.canToggleDepth) {
      setDepthEnabled((current) => !current);
    } else if (event.key.toLowerCase() === "c" && capabilities.canToggleCulling) {
      setCullingEnabled((current) => !current);
    } else if (event.key.toLowerCase() === "o" && capabilities.canReverseOrder) {
      setReverseOrder((current) => !current);
    } else if (event.key.toLowerCase() === "r") {
      reset();
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Một khối lập phương dùng chung scene state và chuyển giữa CPU rasterizer với OpenGL GPU bằng F1, F2"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        {capabilities.canSwitchRenderer ? (
          <label>
            Renderer
            <select
              value={renderer}
              onChange={(event) => setRenderer(event.target.value as RendererKind)}
            >
              <option value="cpu">F1 · CPU</option>
              <option value="gpu">F2 · GPU</option>
            </select>
          </label>
        ) : null}
        <label>
          Hiển thị
          <select
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
          >
            <option value="color">Màu mặt</option>
            {capabilities.canInspectDepth ? <option value="depth">Depth</option> : null}
            {capabilities.canCompareFrames ? (
              <option value="difference">Sai khác CPU ↔ GPU</option>
            ) : null}
          </select>
        </label>
        {capabilities.canToggleDepth ? (
          <label className="check">
            <input
              type="checkbox"
              checked={depthEnabled}
              onChange={(event) => setDepthEnabled(event.target.checked)}
            />
            Depth test
          </label>
        ) : null}
        {capabilities.canToggleCulling ? (
          <label className="check">
            <input
              type="checkbox"
              checked={cullingEnabled}
              onChange={(event) => setCullingEnabled(event.target.checked)}
            />
            Face culling
          </label>
        ) : null}
        {capabilities.canReverseOrder ? (
          <label className="check">
            <input
              type="checkbox"
              checked={reverseOrder}
              onChange={(event) => setReverseOrder(event.target.checked)}
            />
            Đảo triangle order
          </label>
        ) : null}
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={step}>
          Tiến 10°
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          { label: "Bước đang học", value: modeStage(mode) },
          { label: "Backend đang active", value: rendererLabel(renderer) },
          {
            label: "Indexed mesh",
            value: `${mesh.vertices.length} vertices · ${mesh.indices.length} indices · 12 triangles`,
          },
          {
            label: "Vertex 0: local → clip",
            value: `(${trace.local.x.toFixed(1)}, ${trace.local.y.toFixed(1)}, ${trace.local.z.toFixed(1)}) → (${trace.clip.x.toFixed(2)}, ${trace.clip.y.toFixed(2)}, ${trace.clip.z.toFixed(2)}, ${trace.clip.w.toFixed(2)})`,
          },
          {
            label: "Clip → NDC → depth",
            value: `(${trace.ndc.x.toFixed(3)}, ${trace.ndc.y.toFixed(3)}, ${trace.ndc.z.toFixed(3)}) → ${trace.screen.z.toFixed(4)}`,
          },
          {
            label: "Triangle / fragment stats",
            value: `${activeFrame.submittedTriangles} submit · ${activeFrame.culledTriangles} cull · ${activeFrame.passedFragments} pass · ${activeFrame.rejectedFragments} reject`,
          },
          {
            label: "CPU ↔ GPU contract",
            value: `${difference.colorPixels} color pixels · ${difference.depthPixels} depth pixels khác`,
          },
          {
            label: "Mô tả thay thế",
            value: `Scene giữ nguyên angle/depth/culling khi đổi renderer. Pointer ${capturing ? "đang được capture" : "đã được nhả"}; reduced-motion ${reducedMotion ? "đang bật" : "đang tắt"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo cube để xoay; Space chạy/dừng, N tiến 10° và R reset. Ở các bài phù hợp, F1/F2 đổi
        renderer, D đổi depth, C đổi culling và O đảo triangle order. Canvas 2D chạy hai phép raster
        độc lập theo quy ước CPU top-left và OpenGL bottom-left; source C++ mới thực thi OpenGL
        thật.
      </p>
    </>
  );
}
