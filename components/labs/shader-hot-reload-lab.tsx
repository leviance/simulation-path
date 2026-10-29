"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  advanceGalleryView,
  createGalleryProgram,
  defaultVertexShader,
  effectNames,
  fragmentTemplates,
  initialGalleryView,
  makeGalleryUniforms,
  tryGalleryCandidate,
  zoomGalleryView,
  type DemoFault,
  type SavedCandidate,
  type ShaderEffect,
} from "@/lib/labs/shader-hot-reload";
import { drawShaderGallery } from "@/lib/labs/shader-gallery/draw";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const effects: ShaderEffect[] = ["gradient", "circle", "mandelbrot", "noise"];

function visibleEffects(mode?: InteractiveLabMode) {
  if (mode === "procedural-shader") return effects.slice(0, 2);
  if (mode === "mandelbrot-shader") return effects.slice(0, 3);
  if (!mode || mode === "noise-shader" || mode === "shader-validation") return effects;
  return effects.slice(0, 1);
}

function templateCandidate(effect: ShaderEffect, version: number): SavedCandidate {
  return {
    effect,
    version,
    sources: { vertex: defaultVertexShader, fragment: fragmentTemplates[effect] },
  };
}

export default function ShaderHotReloadLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const version = useRef(0);
  const lastAttemptedVersion = useRef(0);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [program, setProgram] = useState(() => createGalleryProgram());
  const [saved, setSaved] = useState(() => templateCandidate("gradient", 0));
  const [draft, setDraft] = useState<string>(fragmentTemplates.gradient);
  const [view, setView] = useState(initialGalleryView);
  const [autoReload, setAutoReload] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const choices = visibleEffects(mode);
  const canReload = mode !== "shader-files";
  const canWatch =
    !mode ||
    [
      "file-watcher",
      "live-uniforms",
      "procedural-shader",
      "mandelbrot-shader",
      "noise-shader",
      "shader-validation",
    ].includes(mode);
  const liveUniforms =
    !mode ||
    [
      "live-uniforms",
      "procedural-shader",
      "mandelbrot-shader",
      "noise-shader",
      "shader-validation",
    ].includes(mode);

  const attempt = useCallback((candidate: SavedCandidate) => {
    lastAttemptedVersion.current = candidate.version;
    setProgram((current) => tryGalleryCandidate(current, candidate));
  }, []);

  const saveDraft = useCallback(() => {
    version.current += 1;
    setSaved({
      effect: saved.effect,
      version: version.current,
      sources: { vertex: defaultVertexShader, fragment: draft },
    });
  }, [draft, saved.effect]);

  useEffect(() => {
    if (!canWatch || !autoReload || lastAttemptedVersion.current === saved.version) return;
    // Only saved versions are watched. Typing never changes the active image.
    const timer = window.setTimeout(() => {
      if (lastAttemptedVersion.current !== saved.version) attempt(saved);
    }, 140);
    return () => window.clearTimeout(timer);
  }, [attempt, autoReload, canWatch, saved]);

  const pause = useCallback(() => setView((current) => ({ ...current, paused: true })), []);
  usePauseOnReducedMotion(pause);

  const releaseCapture = useCallback(() => {
    const canvas = canvasRef.current;
    const active = pointer.current;
    pointer.current = null;
    if (canvas && active && canvas.hasPointerCapture(active.id))
      canvas.releasePointerCapture(active.id);
    setCapturing(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stop = () => {
      pause();
      releaseCapture();
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      const active = pointer.current;
      pointer.current = null;
      if (canvas && active && canvas.hasPointerCapture(active.id))
        canvas.releasePointerCapture(active.id);
    };
  }, [pause, releaseCapture]);

  useEffect(() => {
    if (view.paused || reducedMotion || !liveUniforms) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      if (now - previous >= 1000 / 30) {
        const dt = (now - previous) / 1000;
        previous = now;
        setView((current) => advanceGalleryView(current, dt));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [view.paused, reducedMotion, liveUniforms]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    previewRef.current ??= document.createElement("canvas");
    drawShaderGallery(canvas, previewRef.current, program, view);
  }, [program, size, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !liveUniforms) return;
    const zoom = (event: WheelEvent) => {
      if (document.activeElement !== canvas) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      setView((current) => zoomGalleryView(current, (-event.deltaY * scale) / 100));
    };
    canvas.addEventListener("wheel", zoom, { passive: false });
    return () => canvas.removeEventListener("wheel", zoom);
  }, [liveUniforms]);

  const chooseEffect = (effect: ShaderEffect) => {
    releaseCapture();
    version.current += 1;
    const next = templateCandidate(effect, version.current);
    setDraft(next.sources.fragment);
    setSaved(next);
    attempt(next);
  };

  const injectFault = (fault: DemoFault) => {
    version.current += 1;
    const fragment =
      fault === "compile"
        ? fragmentTemplates[saved.effect] + "\nTHIS_IS_A_SIMULATED_ERROR\n"
        : fragmentTemplates[saved.effect].replace("uniform vec2 uMouse;", "uniform vec3 uMouse;");
    const next: SavedCandidate = {
      effect: saved.effect,
      version: version.current,
      fault,
      sources: { vertex: defaultVertexShader, fragment },
    };
    setDraft(fragment);
    setSaved(next);
    attempt(next);
  };

  const reset = () => {
    releaseCapture();
    // Reset the experiment, not the candidate or selected effect.
    setView(initialGalleryView());
  };

  const updateMouse = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setView((current) => ({
      ...current,
      mouseX: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      mouseY: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }));
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!liveUniforms || event.button !== 0 || pointer.current) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: view.mouseX, y: view.mouseY };
    setCapturing(true);
    updateMouse(event);
  };
  const pointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === event.pointerId) releaseCapture();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (key === "f5" && canReload) {
      event.preventDefault();
      attempt(saved);
    } else if (key === "escape" && pointer.current) {
      const previous = pointer.current;
      setView((current) => ({ ...current, mouseX: previous.x, mouseY: previous.y }));
      releaseCapture();
      event.preventDefault();
    } else if (liveUniforms && key === " " && !event.repeat && !reducedMotion) {
      event.preventDefault();
      setView((current) => ({ ...current, paused: !current.paused }));
    } else if (liveUniforms && key === "n") {
      event.preventDefault();
      setView((current) => ({ ...current, time: current.time + 1 / 30, paused: true }));
    } else if (key === "r") {
      event.preventDefault();
      reset();
    } else if (liveUniforms && ["+", "=", "-"].includes(key)) {
      event.preventDefault();
      setView((current) => zoomGalleryView(current, key === "-" ? -1 : 1));
    } else if (liveUniforms && key.startsWith("arrow")) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        mouseX: Math.max(
          0,
          Math.min(
            1,
            current.mouseX + (key === "arrowright" ? 0.025 : key === "arrowleft" ? -0.025 : 0),
          ),
        ),
        mouseY: Math.max(
          0,
          Math.min(
            1,
            current.mouseY + (key === "arrowdown" ? 0.025 : key === "arrowup" ? -0.025 : 0),
          ),
        ),
      }));
    }
  };
  const uniforms = makeGalleryUniforms(
    view,
    Math.round(size.width * size.dpr),
    Math.round(size.height * size.dpr),
  );

  return (
    <>
      <p className="lab-hint">
        Canvas 2D tính lại công thức bằng TypeScript, không chạy GLSL hay đo tốc độ GPU. Editor chỉ
        hỗ trợ đổi hằng số SPEED từ 0.05 đến 4 trong mẫu có sẵn; hãy dùng ứng dụng C++ để thử mã
        GLSL tùy ý và đọc log driver thật.
      </p>
      <div className="lab-controls">
        <label>
          Hiệu ứng
          <select
            aria-label="Hiệu ứng shader"
            value={saved.effect}
            onChange={(event) => chooseEffect(event.target.value as ShaderEffect)}
          >
            {choices.map((effect) => (
              <option key={effect} value={effect}>
                {effectNames[effect]}
              </option>
            ))}
          </select>
        </label>
        {canReload && (
          <>
            <button type="button" onClick={saveDraft}>
              Lưu bản sửa
            </button>
            <button type="button" onClick={() => attempt(saved)}>
              Thử bản đã lưu (F5)
            </button>
            <button type="button" onClick={() => injectFault("compile")}>
              Thử lỗi compile (mô phỏng)
            </button>
            <button type="button" onClick={() => injectFault("interface")}>
              Thử lỗi interface (mô phỏng)
            </button>
          </>
        )}
        <button type="button" onClick={() => setDraft(fragmentTemplates[saved.effect])}>
          Khôi phục mẫu trong editor
        </button>
        {canWatch && (
          <label className="check">
            <input
              type="checkbox"
              checked={autoReload}
              onChange={(event) => setAutoReload(event.target.checked)}
            />
            Tự thử sau khi lưu (140 ms)
          </label>
        )}
        {liveUniforms && (
          <>
            <button
              type="button"
              disabled={reducedMotion}
              onClick={() => setView((current) => ({ ...current, paused: !current.paused }))}
            >
              {view.paused || reducedMotion ? "Chạy time" : "Tạm dừng"}
            </button>
            <button
              type="button"
              onClick={() =>
                setView((current) => ({ ...current, time: current.time + 1 / 30, paused: true }))
              }
            >
              Tiến 1/30 giây
            </button>
            <button type="button" onClick={() => setView((current) => zoomGalleryView(current, 1))}>
              Phóng to
            </button>
            <button
              type="button"
              onClick={() => setView((current) => zoomGalleryView(current, -1))}
            >
              Thu nhỏ
            </button>
          </>
        )}
        <button type="button" onClick={reset}>
          Đặt lại thời gian và con trỏ
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        role="img"
        aria-label="Gallery shader: minh họa công thức bằng Canvas 2D"
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={(event) => {
          if (pointer.current?.id === event.pointerId) updateMouse(event);
        }}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onLostPointerCapture={releaseCapture}
        onBlur={() => {
          pause();
          releaseCapture();
        }}
      />
      <p className="lab-hint">
        Ảnh đang chạy: {effectNames[program.activeEffect]}.{" "}
        {liveUniforms
          ? "Kéo chuột để đổi uMouse; khi Canvas có focus, dùng phím mũi tên, +/−, Space, N hoặc R. Escape hủy lần kéo hiện tại. Cuộn chuột chỉ zoom khi Canvas có focus."
          : "Các điều khiển time, mouse và zoom sẽ được mở từ bài 06."}{" "}
        {reducedMotion
          ? "Reduced motion đang bật: chỉ tiến từng bước, không tự chạy."
          : "Mô phỏng khởi đầu ở trạng thái tạm dừng."}
      </p>
      <label className="lab-source-editor">
        Fragment shader — bản đang sửa chưa thay đổi ảnh
        <textarea
          aria-label="Candidate fragment shader"
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
              event.preventDefault();
              if (canReload) saveDraft();
            }
          }}
        />
      </label>
      <LabReadout
        items={[
          {
            label: "Editor",
            value: draft === saved.sources.fragment ? "trùng bản đã lưu" : "có thay đổi chưa lưu",
          },
          { label: "Bản đã lưu", value: "v" + saved.version + " · " + effectNames[saved.effect] },
          { label: "Program generation", value: String(program.generation) },
          { label: "Reload attempts", value: String(program.attempts) },
          {
            label: "Ảnh đang chạy",
            value: effectNames[program.activeEffect] + " · SPEED " + program.activeSpeed,
          },
          {
            label: "Kết quả gần nhất",
            value: program.lastReloadSucceeded
              ? "mẫu Canvas đã được áp dụng"
              : "chưa áp dụng — vẫn giữ last-good",
          },
          { label: "Thông báo mô hình", value: program.diagnostic },
          {
            label: "Uniform snapshot",
            value:
              "time " +
              uniforms.time.toFixed(2) +
              "s · framebuffer " +
              uniforms.width +
              "×" +
              uniforms.height +
              " px · mouse " +
              uniforms.mouseX.toFixed(0) +
              "," +
              uniforms.mouseY.toFixed(0) +
              " · zoom " +
              uniforms.zoom.toFixed(2),
          },
          {
            label: "Mô tả thay thế",
            value:
              effectNames[program.activeEffect] +
              ": " +
              (program.activeEffect === "gradient"
                ? "dải màu uốn theo thời gian, vùng sáng đi theo con trỏ"
                : program.activeEffect === "circle"
                  ? "đĩa tròn có sóng và viền sáng, giữ tỉ lệ khi resize"
                  : program.activeEffect === "mandelbrot"
                    ? "miền lặp z²+c, vùng chưa thoát màu tối và bên ngoài đổi palette"
                    : "các lớp value noise được nội suy và làm biến dạng theo thời gian") +
              ". Pointer " +
              (capturing ? "đang capture" : "đã nhả") +
              ". Preview CPU có độ phân giải giảm, không phải ảnh GPU đọc ngược.",
          },
        ]}
      />
    </>
  );
}
