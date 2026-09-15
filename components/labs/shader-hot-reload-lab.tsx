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
  createShaderProgramState,
  defaultFragmentShader,
  defaultVertexShader,
  evaluateShaderPreset,
  inferShaderPreset,
  shaderPreviewParameters,
  shaderFingerprint,
  transactionalShaderReload,
  type ShaderPreset,
} from "@/lib/labs/shader-hot-reload";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const commonFragmentHeader = `#version 330 core
in vec3 vColor;
in vec3 vLocalPosition;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

out vec4 fragColor;

`;

const basicFragmentShader = `#version 330 core
in vec3 vColor;
in vec3 vLocalPosition;

out vec4 fragColor;

void main() {
    fragColor = vec4(vColor, 1.0);
}
`;

function modeCapabilities(mode?: InteractiveLabMode) {
  const liveUniforms = ["live-uniforms", "procedural-shader", "shader-validation"].includes(
    mode ?? "shader-validation",
  );
  return {
    canCompile: mode !== "shader-files",
    autoReload: [
      "file-watcher",
      "live-uniforms",
      "procedural-shader",
      "shader-validation",
    ].includes(mode ?? "shader-validation"),
    liveUniforms,
    presets: mode === "procedural-shader" || mode === "shader-validation" || !mode,
  };
}

function initialFragment(mode?: InteractiveLabMode) {
  return modeCapabilities(mode).liveUniforms ? defaultFragmentShader : basicFragmentShader;
}

function fragmentForPreset(preset: ShaderPreset): string {
  if (preset === "solid") {
    return `${commonFragmentHeader}void main() {
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    float modulation = 0.98 + 0.02 * sin(uTime + mouseUv.x + mouseUv.y);
    fragColor = vec4(vec3(0.28, 0.62, 0.95) * modulation, 1.0);
}
`;
  }
  if (preset === "coordinates") {
    return `${commonFragmentHeader}void main() {
    vec2 uv = vLocalPosition.xy * 0.5 + 0.5;
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    float modulation = 0.96 + 0.04 * sin(uTime + mouseUv.x);
    fragColor = vec4(uv * modulation, 0.35 + mouseUv.y * 0.05, 1.0);
}
`;
  }
  if (preset === "pulse") {
    return `${commonFragmentHeader}void main() {
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    float pulse = 0.62 + 0.38 * sin(uTime * 3.0);
    fragColor = vec4(vec3(0.95, 0.36, 0.55) * pulse + vec3(mouseUv, 0.0) * 0.03, 1.0);
}
`;
  }
  return defaultFragmentShader;
}

function modeStage(mode?: InteractiveLabMode): string {
  if (mode === "shader-files") return "GLSL rời executable";
  if (mode === "compile-diagnostics") return "Compile status và info log";
  if (mode === "program-interface") return "Candidate program và interface";
  if (mode === "transactional-reload") return "Giữ last-good program";
  if (mode === "file-watcher") return "Timestamp và debounce";
  if (mode === "live-uniforms") return "uTime · uResolution · uMouse";
  if (mode === "procedural-shader") return "Màu procedural theo pixel";
  return "Validation và cleanup";
}

function drawPipeline(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  success: boolean,
) {
  const stages = ["read files", "compile", "link candidate", "validate", "swap program"];
  const left = 18;
  const top = height - 36;
  const slotWidth = (width - left * 2) / stages.length;
  context.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
  stages.forEach((stage, index) => {
    const x = left + index * slotWidth;
    const isSwap = index === stages.length - 1;
    context.fillStyle = isSwap && !success ? "#4b2630" : index < 2 ? "#26334b" : "#203a32";
    context.fillRect(x, top, slotWidth - 3, 22);
    context.fillStyle = "#d7deec";
    context.fillText(stage, x + 6, top + 15);
  });
}

export default function ShaderHotReloadLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const capabilities = modeCapabilities(mode);
  const startingFragment = initialFragment(mode);
  const [candidateFragment, setCandidateFragment] = useState(startingFragment);
  const [program, setProgram] = useState(() =>
    createShaderProgramState({ vertex: defaultVertexShader, fragment: startingFragment }),
  );
  const [autoReload, setAutoReload] = useState(capabilities.autoReload);
  const [watchPending, setWatchPending] = useState(false);
  const [paused, setPaused] = useState(true);
  const [timeSeconds, setTimeSeconds] = useState(0.75);
  const [mouse, setMouse] = useState({ x: 320, y: 170 });
  const [capturing, setCapturing] = useState(false);

  const candidateSources = useMemo(
    () => ({ vertex: defaultVertexShader, fragment: candidateFragment }),
    [candidateFragment],
  );
  const candidateChanged = shaderFingerprint(candidateSources) !== program.activeFingerprint;
  const shouldWatchCandidate = capabilities.autoReload && autoReload && candidateChanged;
  const visibleWatchPending = shouldWatchCandidate && watchPending;

  const compileCandidate = useCallback(() => {
    const requiredUniforms = capabilities.liveUniforms
      ? ["uMvp", "uTime", "uResolution", "uMouse"]
      : ["uMvp"];
    setProgram((current) => transactionalShaderReload(current, candidateSources, requiredUniforms));
    setWatchPending(false);
  }, [candidateSources, capabilities.liveUniforms]);

  useEffect(() => {
    if (!shouldWatchCandidate) return;
    const pendingTimer = window.setTimeout(() => setWatchPending(true), 0);
    const timer = window.setTimeout(compileCandidate, 280);
    return () => {
      window.clearTimeout(pendingTimer);
      window.clearTimeout(timer);
    };
  }, [compileCandidate, shouldWatchCandidate]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setTimeSeconds((current) => current + deltaSeconds);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion]);

  const activePreset = inferShaderPreset(program.activeSources.fragment);
  const previewParameters = useMemo(
    () => shaderPreviewParameters(program.activeSources.fragment),
    [program.activeSources.fragment],
  );
  const viewport = useMemo(
    () => ({
      x: 24,
      y: 38,
      width: Math.max(1, size.width - 48),
      height: Math.max(1, size.height - 96),
    }),
    [size],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#080d19";
    context.fillRect(0, 0, size.width, size.height);

    const sampleWidth = 180;
    const sampleHeight = 100;
    const image = context.createImageData(sampleWidth, sampleHeight);
    const uniforms = {
      timeSeconds,
      resolution: { x: viewport.width * size.dpr, y: viewport.height * size.dpr },
      mouse: {
        x: (mouse.x - viewport.x) * size.dpr,
        y: (viewport.height - (mouse.y - viewport.y)) * size.dpr,
      },
    };
    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const color = evaluateShaderPreset(
          activePreset,
          x / Math.max(1, sampleWidth - 1),
          1 - y / Math.max(1, sampleHeight - 1),
          uniforms,
          program.activeSources.fragment,
        );
        const offset = (y * sampleWidth + x) * 4;
        image.data[offset] = Math.round(color.red * 255);
        image.data[offset + 1] = Math.round(color.green * 255);
        image.data[offset + 2] = Math.round(color.blue * 255);
        image.data[offset + 3] = 255;
      }
    }
    const preview = document.createElement("canvas");
    preview.width = sampleWidth;
    preview.height = sampleHeight;
    preview.getContext("2d")?.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = true;
    context.drawImage(preview, viewport.x, viewport.y, viewport.width, viewport.height);

    context.strokeStyle = program.lastReloadSucceeded ? "#53f0ae" : "#e06c75";
    context.lineWidth = 2;
    context.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
    context.fillStyle = "#d7deec";
    context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    context.fillText(`program generation ${program.generation} · ${activePreset}`, viewport.x, 22);
    context.fillStyle = visibleWatchPending ? "#e5c07b" : "#8794aa";
    context.fillText(
      visibleWatchPending ? "đang chờ file ổn định…" : "last-good program đang vẽ",
      viewport.x + 245,
      22,
    );
    if (capabilities.liveUniforms) {
      context.strokeStyle = "rgba(255, 255, 255, 0.8)";
      context.beginPath();
      context.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
      context.stroke();
    }
    drawPipeline(context, size.width, size.height, program.lastReloadSucceeded);
  }, [
    activePreset,
    mouse,
    program.generation,
    program.lastReloadSucceeded,
    program.activeSources.fragment,
    capabilities.liveUniforms,
    size,
    timeSeconds,
    viewport,
    visibleWatchPending,
  ]);

  const reset = useCallback(() => {
    const fragment = initialFragment(mode);
    setCandidateFragment(fragment);
    setProgram(createShaderProgramState({ vertex: defaultVertexShader, fragment }));
    setAutoReload(modeCapabilities(mode).autoReload);
    setWatchPending(false);
    setPaused(true);
    setTimeSeconds(0.75);
    setMouse({ x: 320, y: 170 });
  }, [mode]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!capabilities.liveUniforms) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setMouse(canvasPoint(event, event.currentTarget));
    setCapturing(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!capabilities.liveUniforms) return;
    if (activePointer.current !== event.pointerId) return;
    setMouse(canvasPoint(event, event.currentTarget));
  };
  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    setCapturing(false);
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "F5" && capabilities.canCompile) {
      event.preventDefault();
      compileCandidate();
    } else if (event.key === " " && capabilities.liveUniforms) {
      event.preventDefault();
      setPaused((current) => !current);
    } else if (event.key.toLowerCase() === "n" && capabilities.liveUniforms) {
      setTimeSeconds((current) => current + 0.1);
      setPaused(true);
    } else if (event.key.toLowerCase() === "r") {
      reset();
    }
  };

  const firstDiagnostic = program.diagnostics[0];
  return (
    <>
      <div className="lab-controls">
        {capabilities.presets ? (
          <label>
            Preset
            <select
              value={inferShaderPreset(candidateFragment)}
              onChange={(event) =>
                setCandidateFragment(fragmentForPreset(event.target.value as ShaderPreset))
              }
            >
              <option value="solid">Solid</option>
              <option value="coordinates">Local coordinates</option>
              <option value="pulse">Time pulse</option>
              <option value="rings">Procedural rings</option>
            </select>
          </label>
        ) : null}
        {capabilities.autoReload ? (
          <label className="check">
            <input
              type="checkbox"
              checked={autoReload}
              onChange={(event) => setAutoReload(event.target.checked)}
            />
            Auto reload + debounce
          </label>
        ) : null}
        {capabilities.canCompile ? (
          <>
            <button type="button" onClick={compileCandidate}>
              Compile candidate (F5)
            </button>
            <button
              type="button"
              onClick={() =>
                setCandidateFragment((source) =>
                  source.replace("fragColor =", "BROKEN_TOKEN fragColor ="),
                )
              }
            >
              Chèn lỗi compile
            </button>
          </>
        ) : null}
        {capabilities.liveUniforms ? (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Chạy time" : "Tạm dừng"}
          </button>
        ) : null}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>

      <label className="lab-source-editor">
        Candidate fragment shader — program đang chạy chỉ đổi khi candidate hợp lệ
        <textarea
          aria-label="Candidate fragment shader"
          value={candidateFragment}
          spellCheck={false}
          onChange={(event) => setCandidateFragment(event.target.value)}
        />
      </label>

      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        role="img"
        aria-label="Shader Lab mô phỏng compile, transactional hot reload và procedural fragment output"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />

      <LabReadout
        items={[
          { label: "Bước đang học", value: modeStage(mode) },
          {
            label: "Candidate",
            value: candidateChanged ? "đã sửa, chưa active" : "trùng last-good",
          },
          { label: "Program generation", value: String(program.generation) },
          { label: "Reload attempts", value: String(program.attempts) },
          {
            label: "Kết quả gần nhất",
            value: program.lastReloadSucceeded
              ? "compile + link thành công"
              : "thất bại — vẫn giữ last-good",
          },
          {
            label: "Info log",
            value: firstDiagnostic
              ? `${firstDiagnostic.stage}${firstDiagnostic.line ? `:${firstDiagnostic.line}` : ""} — ${firstDiagnostic.message}`
              : "không có lỗi",
          },
          {
            label: "Uniform snapshot",
            value: capabilities.liveUniforms
              ? `time ${timeSeconds.toFixed(2)}s · framebuffer ${Math.round(viewport.width * size.dpr)}×${Math.round(viewport.height * size.dpr)} px · mouse ${Math.round((mouse.x - viewport.x) * size.dpr)},${Math.round((viewport.height - (mouse.y - viewport.y)) * size.dpr)}`
              : "chưa xuất hiện ở checkpoint này",
          },
          {
            label: "Preview parameters",
            value:
              activePreset === "rings"
                ? `frequency ${previewParameters.ringFrequency} · speed ${previewParameters.ringSpeed} · mouse falloff ${previewParameters.mouseFalloff}`
                : `preset ${activePreset} đọc trực tiếp từ source hợp lệ`,
          },
          {
            label: "Mô tả thay thế",
            value: `Canvas đang hiển thị preset ${activePreset}. Pointer ${capturing ? "đang được capture" : "đã được nhả"}; reduced-motion ${reducedMotion ? "đang bật" : "đang tắt"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        {capabilities.canCompile
          ? "Sửa source rồi compile; các hằng số trong preset đang active được đọc lại để tạo preview mới. "
          : "Checkpoint này chỉ minh họa việc source nằm ngoài executable; compile/reload sẽ xuất hiện từ bài sau. "}
        Canvas dùng bộ kiểm tra GLSL giới hạn, không thay thế compiler của driver. Source tải về mới
        gọi OpenGL compiler thật.
      </p>
    </>
  );
}
