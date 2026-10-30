"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  compareProbe,
  barycentricAtPoint,
  defaultTriangle,
  makePipelineTrace,
  maximumColorDifference,
  quantizeColor8,
  sampleTriangle,
  transformTriangle,
  triangleCentroid,
  wrapDegrees,
  type TriangleTransform,
  type TriangleVertex,
  type Vec2,
} from "@/lib/labs/cpu-gpu-triangle";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type DisplayMode = "color" | "coverage" | "difference";

interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BACKGROUND = { r: 11 / 255, g: 16 / 255, b: 32 / 255 };
const subscribeToHydration = () => () => {};

function modeCapabilities(mode?: InteractiveLabMode) {
  const stages: InteractiveLabMode[] = [
    "gl-context",
    "shader-program",
    "vertex-contract",
    "cpu-reference",
    "vertex-transform",
    "viewport-conventions",
    "fragment-interpolation",
    "gpu-readback",
    "pipeline-validation",
  ];
  const stage = mode ? Math.max(0, stages.indexOf(mode)) : stages.length - 1;
  return {
    stage,
    showGpuTriangle: stage >= 2,
    showCpuTriangle: stage >= 3,
    canTransform: stage >= 4,
    canProbe: stage >= 5,
    canInterpolate: stage >= 6,
    canInspectDifference: stage >= 7,
  };
}

function colorByte(value: number) {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function panelPointToNdc(point: Vec2, panel: Panel): Vec2 {
  return {
    x: ((point.x - panel.x) / panel.width) * 2 - 1,
    y: 1 - ((point.y - panel.y) / panel.height) * 2,
  };
}

function ndcToPanel(position: Vec2, panel: Panel): Vec2 {
  return {
    x: panel.x + (position.x * 0.5 + 0.5) * panel.width,
    y: panel.y + (1 - (position.y * 0.5 + 0.5)) * panel.height,
  };
}

function drawRasterPanel(
  context: CanvasRenderingContext2D,
  panel: Panel,
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
  smoothColor: boolean,
  gpuSide: boolean,
  displayMode: DisplayMode,
) {
  const samplingScale = Math.min(1, 240 / panel.width, 180 / panel.height);
  const width = Math.max(1, Math.floor(panel.width * samplingScale));
  const height = Math.max(1, Math.floor(panel.height * samplingScale));
  const image = context.createImageData(width, height);
  // Transform the three vertices once, not once for every candidate pixel.
  const transformed = transformTriangle(triangle, transform);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ndc = {
        x: ((x + 0.5) / width) * 2 - 1,
        y: 1 - ((y + 0.5) / height) * 2,
      };
      const sample = barycentricAtPoint(transformed, ndc);
      let color = BACKGROUND;
      if (sample.inside) {
        const expected = smoothColor ? sample.color : { r: 0.38, g: 0.68, b: 0.94 };
        if (displayMode === "coverage") {
          color = { r: 0.33, g: 0.94, b: 0.68 };
        } else if (displayMode === "difference") {
          const quantized = quantizeColor8(expected);
          const difference = maximumColorDifference(expected, quantized);
          const amplified = Math.min(1, difference * 255 * 8);
          color = gpuSide ? { r: amplified, g: 0.08, b: 0.14 } : { r: 0.08, g: 0.14, b: amplified };
        } else {
          color = gpuSide ? quantizeColor8(expected) : expected;
        }
      }
      const offset = (y * width + x) * 4;
      image.data[offset] = colorByte(color.r);
      image.data[offset + 1] = colorByte(color.g);
      image.data[offset + 2] = colorByte(color.b);
      image.data[offset + 3] = 255;
    }
  }
  const buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) return;
  bufferContext.putImageData(image, 0, 0);
  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, panel.x, panel.y, panel.width, panel.height);
  context.restore();
}

function drawInactivePanel(context: CanvasRenderingContext2D, panel: Panel, message: string) {
  context.fillStyle = "#0b1020";
  context.fillRect(panel.x, panel.y, panel.width, panel.height);
  context.fillStyle = "#8794aa";
  context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.textAlign = "center";
  context.fillText(message, panel.x + panel.width / 2, panel.y + panel.height / 2);
  context.textAlign = "start";
}

function drawTriangleOutline(
  context: CanvasRenderingContext2D,
  panel: Panel,
  triangle: readonly TriangleVertex[],
  transform: TriangleTransform,
) {
  // Geometry may leave NDC; its diagnostic outline must stay in its own panel.
  context.save();
  context.beginPath();
  context.rect(panel.x, panel.y, panel.width, panel.height);
  context.clip();
  const vertices = transformTriangle(triangle, transform).map((vertex) =>
    ndcToPanel(vertex.position, panel),
  );
  context.beginPath();
  context.moveTo(vertices[0].x, vertices[0].y);
  context.lineTo(vertices[1].x, vertices[1].y);
  context.lineTo(vertices[2].x, vertices[2].y);
  context.closePath();
  context.strokeStyle = "rgba(255,255,255,0.8)";
  context.lineWidth = 1;
  context.stroke();
  vertices.forEach((vertex, index) => {
    context.beginPath();
    context.arc(vertex.x, vertex.y, 4, 0, Math.PI * 2);
    context.fillStyle = ["#f76b59", "#59c77a", "#61afef"][index];
    context.fill();
  });
  context.restore();
}

function drawProbe(context: CanvasRenderingContext2D, panel: Panel, probe: Vec2) {
  const point = ndcToPanel(probe, panel);
  context.strokeStyle = "#e5c07b";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(point.x - 7, point.y);
  context.lineTo(point.x + 7, point.y);
  context.moveTo(point.x, point.y - 7);
  context.lineTo(point.x, point.y + 7);
  context.stroke();
}

function drawPipelineRail(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  activeStage: number,
) {
  const stages = ["Vertex data", "Vertex shader", "Clip / NDC", "Viewport", "Fragment"];
  const left = 22;
  const top = height - 42;
  const slotWidth = (width - 44) / stages.length;
  context.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  stages.forEach((stage, index) => {
    const x = left + index * slotWidth;
    context.fillStyle = index <= activeStage ? "#24364f" : "#111a2b";
    context.fillRect(x, top, slotWidth - 3, 24);
    context.fillStyle = "#b9c5da";
    context.fillText(stage, x + 7, top + 16);
  });
}

function modeStage(mode?: InteractiveLabMode) {
  if (mode === "gl-context") return "Context và framebuffer pixels";
  if (mode === "shader-program") return "Compile và link GLSL";
  if (mode === "vertex-contract") return "VBO, VAO và vertex attributes";
  if (mode === "cpu-reference") return "CPU framebuffer và texture upload";
  if (mode === "vertex-transform") return "CPU transform ↔ vertex shader";
  if (mode === "viewport-conventions") return "NDC ↔ hai hệ tọa độ pixel";
  if (mode === "fragment-interpolation") return "Barycentric ↔ fragment interpolation";
  if (mode === "gpu-readback") return "glReadPixels và tolerance";
  return "Lifecycle và validation hoàn chỉnh";
}

export default function CpuGpuTriangleLab({ mode }: { mode?: InteractiveLabMode }) {
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const probeBeforeDrag = useRef<Vec2>({ x: 0, y: -0.17 });
  const reducedMotion = useReducedMotion();
  const capabilities = modeCapabilities(mode);
  const [angleDegrees, setAngleDegrees] = useState(0);
  const [scale, setScale] = useState(0.82);
  const [translationX, setTranslationX] = useState(0);
  const [translationY, setTranslationY] = useState(0);
  const [smoothColor, setSmoothColor] = useState(mode === "fragment-interpolation");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("color");
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [preset, setPreset] = useState("default");
  const [probe, setProbe] = useState<Vec2>({ x: 0, y: -0.17 });

  const releaseCapture = useCallback(() => {
    const id = activePointer.current;
    activePointer.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id)) {
      canvasRef.current.releasePointerCapture(id);
    }
    setCapturing(false);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    releaseCapture();
  }, [releaseCapture]);
  const size = useCanvasSize(canvasRef, stop);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [stop]);

  const transform = useMemo<TriangleTransform>(
    () => ({
      angleRadians: (angleDegrees * Math.PI) / 180,
      scale,
      translation: { x: translationX, y: translationY },
    }),
    [angleDegrees, scale, translationX, translationY],
  );

  const panels = useMemo(() => {
    const gap = 16;
    const margin = 18;
    const top = 30;
    const availableWidth = Math.max(2, size.width - margin * 2 - gap);
    const panelWidth = Math.max(1, Math.floor(availableWidth / 2));
    const panelHeight = Math.max(1, size.height - 94);
    return {
      cpu: { x: margin, y: top, width: panelWidth, height: panelHeight },
      gpu: { x: margin + panelWidth + gap, y: top, width: panelWidth, height: panelHeight },
    };
  }, [size]);

  const reset = useCallback(() => {
    setPreset("default");
    releaseCapture();
    setAngleDegrees(0);
    setScale(0.82);
    setTranslationX(0);
    setTranslationY(0);
    setSmoothColor(mode === "fragment-interpolation");
    setDisplayMode("color");
    setPaused(true);
    setProbe({ x: 0, y: -0.17 });
  }, [mode, releaseCapture]);

  useEffect(() => {
    if (paused || reducedMotion || !capabilities.canTransform) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setAngleDegrees((current) => wrapDegrees(current + deltaSeconds * 28));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, capabilities.canTransform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#080d19";
    context.fillRect(0, 0, size.width, size.height);

    if (capabilities.showCpuTriangle) {
      drawRasterPanel(
        context,
        panels.cpu,
        defaultTriangle,
        transform,
        smoothColor,
        false,
        displayMode,
      );
      drawTriangleOutline(context, panels.cpu, defaultTriangle, transform);
    } else {
      drawInactivePanel(context, panels.cpu, "CPU path sẽ được thêm ở checkpoint 04");
    }
    if (capabilities.showGpuTriangle) {
      drawRasterPanel(
        context,
        panels.gpu,
        defaultTriangle,
        transform,
        smoothColor,
        true,
        displayMode,
      );
      drawTriangleOutline(context, panels.gpu, defaultTriangle, transform);
    } else {
      drawInactivePanel(
        context,
        panels.gpu,
        mode === "shader-program" ? "Shader đã link; chưa cấp vertex data" : "Framebuffer đã clear",
      );
    }
    if (capabilities.canProbe) {
      drawProbe(context, panels.cpu, probe);
      drawProbe(context, panels.gpu, probe);
    }

    context.fillStyle = "#d7deec";
    context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    context.fillText("CPU · top-left framebuffer", panels.cpu.x, 19);
    context.fillText("GPU (mô hình) · bottom-left viewport", panels.gpu.x, 19);
    drawPipelineRail(context, size.width, size.height, capabilities.stage);
  }, [capabilities, displayMode, mode, panels, probe, size, smoothColor, transform]);

  const setProbeFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const panel = point.x < panels.gpu.x ? panels.cpu : panels.gpu;
    const ndc = panelPointToNdc(point, panel);
    setProbe({
      x: Math.min(1 - 1e-9, Math.max(-1, ndc.x)),
      y: Math.min(1 - 1e-9, Math.max(-1, ndc.y)),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!capabilities.canProbe || event.button !== 0 || !event.isPrimary) return;
    if (activePointer.current !== null) return;
    const point = canvasPoint(event, event.currentTarget);
    const inPanel = [panels.cpu, panels.gpu].some(
      (panel) =>
        point.x >= panel.x &&
        point.x < panel.x + panel.width &&
        point.y >= panel.y &&
        point.y < panel.y + panel.height,
    );
    if (!inPanel) return;
    setPaused(true);
    probeBeforeDrag.current = { ...probe };
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setCapturing(true);
    setProbeFromPointer(event);
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
    if (!capabilities.canTransform) return;
    setPaused(true);
    setAngleDegrees((current) => wrapDegrees(current + 10));
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    if (event.key === "Escape" && activePointer.current !== null) {
      setProbe(probeBeforeDrag.current);
      releaseCapture();
    } else if (event.key === " " && capabilities.canTransform && !reducedMotion) {
      event.preventDefault();
      setPaused((current) => !current);
    } else if (event.key.toLowerCase() === "n") {
      step();
    } else if (event.key.toLowerCase() === "c" && capabilities.canInterpolate) {
      setSmoothColor((current) => !current);
    } else if (event.key.toLowerCase() === "d" && capabilities.canInspectDifference) {
      setDisplayMode((current) => {
        if (current === "color") return "coverage";
        if (current === "coverage") return "difference";
        return "color";
      });
    } else if (event.key.startsWith("Arrow") && capabilities.canProbe) {
      event.preventDefault();
      setPaused(true);
      setProbe((current) => ({
        x: Math.max(
          -1,
          Math.min(
            1 - 1e-9,
            current.x +
              Number(event.key === "ArrowRight") * 0.025 -
              Number(event.key === "ArrowLeft") * 0.025,
          ),
        ),
        y: Math.max(
          -1,
          Math.min(
            1 - 1e-9,
            current.y +
              Number(event.key === "ArrowUp") * 0.025 -
              Number(event.key === "ArrowDown") * 0.025,
          ),
        ),
      }));
    } else if (event.key.toLowerCase() === "r") {
      reset();
    }
  };

  const sample = sampleTriangle(defaultTriangle, transform, probe, smoothColor);
  const gpuColor = quantizeColor8(sample.color);
  const probeAgreement = compareProbe(
    defaultTriangle,
    transform,
    probe,
    panels.cpu.width,
    panels.cpu.height,
    { x: panels.gpu.x, y: 0, width: panels.gpu.width, height: panels.gpu.height },
    smoothColor,
  );
  const trace = makePipelineTrace(defaultTriangle, transform, panels.cpu.width, panels.cpu.height, {
    x: panels.gpu.x,
    y: 0,
    width: panels.gpu.width,
    height: panels.gpu.height,
  });
  const center = triangleCentroid(defaultTriangle, transform);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Cùng một tam giác được mô phỏng qua CPU rasterizer và OpenGL GPU pipeline"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (activePointer.current === event.pointerId) setProbeFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={(event) => {
          if (activePointer.current !== event.pointerId) return;
          setProbe(probeBeforeDrag.current);
          releasePointer(event);
        }}
        onLostPointerCapture={() => {
          activePointer.current = null;
          setCapturing(false);
        }}
        onBlur={stop}
      />
      <fieldset
        className="lab-controls"
        disabled={!ready}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {capabilities.canTransform ? (
          <>
            <label>
              Mẫu thử
              <select
                aria-label="Mẫu thử"
                value={preset}
                onChange={(event) => {
                  releaseCapture();
                  setPaused(true);
                  setPreset(event.target.value);
                  if (event.target.value === "rotated") {
                    setAngleDegrees(45);
                    setScale(0.6);
                    setTranslationX(0.12);
                    setTranslationY(-0.08);
                  } else if (event.target.value === "outside") {
                    setAngleDegrees(0);
                    setScale(0.82);
                    setTranslationX(1.5);
                    setTranslationY(0);
                  } else {
                    reset();
                  }
                }}
              >
                <option value="default">Tam giác ban đầu</option>
                <option value="rotated">Xoay 45° rồi dịch chuyển</option>
                <option value="outside">Tam giác đi ra ngoài viewport</option>
                <option value="custom" disabled>
                  Đã chỉnh tham số
                </option>
              </select>
            </label>
            <label>
              Góc xoay
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={angleDegrees}
                onChange={(event) => {
                  setPreset("custom");
                  setPaused(true);
                  setAngleDegrees(Number(event.target.value));
                }}
              />
              <output>{angleDegrees.toFixed(0)}°</output>
            </label>
            <label>
              Scale
              <input
                type="range"
                min="0.35"
                max="1"
                step="0.01"
                value={scale}
                onChange={(event) => {
                  setPreset("custom");
                  setPaused(true);
                  setScale(Number(event.target.value));
                }}
              />
              <output>{scale.toFixed(2)}</output>
            </label>
          </>
        ) : null}
        {capabilities.canInspectDifference ? (
          <label>
            Hiển thị
            <select
              aria-label="Hiển thị"
              value={displayMode}
              onChange={(event) => setDisplayMode(event.target.value as DisplayMode)}
            >
              <option value="color">Màu kết quả</option>
              <option value="coverage">Coverage</option>
              <option value="difference">Sai số làm tròn màu ×8 (mô hình)</option>
            </select>
          </label>
        ) : null}
        {capabilities.canInterpolate ? (
          <label className="check">
            <input
              type="checkbox"
              checked={smoothColor}
              onChange={(event) => setSmoothColor(event.target.checked)}
            />
            Nội suy màu
          </label>
        ) : null}
        <button
          type="button"
          disabled={reducedMotion || !capabilities.canTransform}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" disabled={!capabilities.canTransform} onClick={step}>
          Tiến 10°
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </fieldset>
      <LabReadout
        items={[
          { label: "Bước đang học", value: modeStage(mode) },
          {
            label: "Vertex 0: input → NDC",
            value: `(${trace[0].input.x.toFixed(2)}, ${trace[0].input.y.toFixed(2)}) → (${trace[0].ndc.x.toFixed(2)}, ${trace[0].ndc.y.toFixed(2)})`,
          },
          {
            label: "Probe NDC / coverage",
            value: `(${probe.x.toFixed(3)}, ${probe.y.toFixed(3)}) · ${sample.inside ? "inside" : "outside"}`,
          },
          {
            label: "Barycentric weights",
            value: sample.weights.map((weight) => weight.toFixed(3)).join(" / "),
          },
          {
            label: "CPU ↔ RGBA8 mô phỏng",
            value: sample.inside
              ? `max channel difference ${maximumColorDifference(sample.color, gpuColor).toFixed(5)}`
              : "probe không tạo fragment",
          },
          {
            label: "Coordinate round-trip",
            value: `CPU ${probeAgreement.cpuRoundTripError.toExponential(1)} · GPU ${probeAgreement.gpuRoundTripError.toExponential(1)}`,
          },
          {
            label: "Tâm pixel được chọn (mô hình)",
            value: `(${probeAgreement.pixelX}, ${probeAgreement.pixelY}) → NDC (${probeAgreement.pixelCenterNdc.x.toFixed(4)}, ${probeAgreement.pixelCenterNdc.y.toFixed(4)})`,
          },
          {
            label: "Triangle centroid",
            value: `(${center.x.toFixed(3)}, ${center.y.toFixed(3)}) — kiểm tra lại khoảng cách tới edge sau khi thu nhỏ`,
          },
          {
            label: "Mô tả thay thế",
            value: `Hai panel dùng cùng ba vertex, cùng transform và cùng smooth-color contract. Pointer ${capturing ? "đang được capture" : "đã được nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Các điều khiển chỉ xuất hiện khi bài học đã giới thiệu khái niệm tương ứng. Từ bài viewport,
        kéo crosshair hoặc dùng phím mũi tên để đổi probe; Space chạy/dừng, N tiến 10° và R reset.
        Canvas dùng mô hình CPU có độ phân giải giới hạn để phản hồi nhanh. Hai panel đều được vẽ
        bằng JavaScript; chế độ sai số chỉ minh họa một lần làm tròn sang byte, không đo sai khác
        CPU/GPU thật. Chương trình C++ mới thực thi OpenGL và dùng glReadPixels để đọc kết quả GPU.
      </p>
    </>
  );
}
