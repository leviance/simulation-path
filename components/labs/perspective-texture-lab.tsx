"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  textureStage,
  initialTextureScene,
  presetTexture,
  tiltTexture,
  advanceTexture,
  textureFrame,
  type TextureScene,
} from "@/lib/labs/texture-scene";
import { nearestTextureTexel, textureUvDistance } from "@/lib/labs/perspective-texture";
import { drawTexture, texturePanels } from "./perspective-texture-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function PerspectiveTextureLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Workbench key={mode ?? "texture-validation"} mode={mode} />;
}
function Workbench({ mode }: { mode?: InteractiveLabMode }) {
  const stage = textureStage(mode),
    helpId = useId(),
    canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(() => initialTextureScene(stage)),
    current = useRef(scene);
  const [target, setTarget] = useState<"tilt" | "sample">("tilt");
  const commit = useCallback((next: TextureScene) => {
    current.current = next;
    setScene(next);
  }, []);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    start: TextureScene;
    moved: boolean;
  } | null>(null);
  const cancel = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pause = useCallback(() => {
    cancel();
    commit({ ...current.current, paused: true });
  }, [cancel, commit]);
  const size = useCanvasSize(canvasRef, pause),
    reducedMotion = useReducedMotion();
  usePauseOnReducedMotion(pause);
  useEffect(() => {
    const visible = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visible);
      cancel();
    };
  }, [pause, cancel]);
  useEffect(() => {
    if (stage < 8 || scene.paused || reducedMotion) return;
    let id = 0,
      previous: number | undefined,
      lastPaint = 0;
    const tick = (time: number) => {
      if (time - lastPaint >= 32) {
        const dt = previous === undefined ? 0 : (time - previous) / 1000;
        previous = time;
        lastPaint = time;
        commit(advanceTexture(current.current, dt, stage));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [scene.paused, reducedMotion, stage, commit]);
  const panels = useMemo(
    () => texturePanels(size.width, size.height, stage === 2 ? "affine" : scene.view),
    [size.width, size.height, stage, scene.view],
  );
  const frames = useMemo(
    () =>
      panels.map((panel) => {
        const scale = Math.min(1, 260 / panel.height, 320 / panel.width);
        return textureFrame(
          scene,
          stage,
          Math.max(1, Math.round(panel.width * scale)),
          Math.max(1, Math.round(panel.height * scale)),
          panel.corrected,
        );
      }),
    [panels, scene, stage],
  );
  const scratch = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    scratch.current ??= document.createElement("canvas");
    drawTexture(ctx, size, scene, stage, panels, frames, scratch.current);
  }, [size, scene, stage, panels, frames]);
  const change = (next: TextureScene) => {
    cancel();
    if (!next.debug) setTarget("tilt");
    commit(next);
  };
  const reset = () => {
    setTarget("tilt");
    change(initialTextureScene(stage));
  };
  const step = () =>
    change({
      ...advanceTexture({ ...current.current, paused: false }, 1 / 60, stage),
      paused: true,
    });
  const choosePoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(),
      x = ((event.clientX - rect.left) * size.width) / rect.width,
      y = ((event.clientY - rect.top) * size.height) / rect.height;
    const panel = panels.find(
      (p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height,
    );
    if (!panel) return;
    const point = { x: (x - panel.x) / panel.width, y: (y - panel.y) / panel.height };
    commit(
      stage === 2
        ? { ...current.current, sampleUv: point, paused: true }
        : { ...current.current, sample: point, paused: true },
    );
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    event.currentTarget.focus();
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      start: current.current,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      drag.current = null;
      return;
    }
    commit({ ...current.current, paused: true });
    if (stage === 2 || target === "sample") choosePoint(event);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancel();
      return;
    }
    if (stage === 2 || target === "sample") {
      choosePoint(event);
      return;
    }
    const dx = event.clientX - active.x,
      dy = event.clientY - active.y;
    if (Math.hypot(dx, dy) > 4) active.moved = true;
    if (active.moved) commit(tiltTexture(active.start, dx * 0.008, dy * 0.008));
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    if (stage === 2 || target === "sample") choosePoint(event);
    else {
      const dx = event.clientX - active.x,
        dy = event.clientY - active.y;
      if (active.moved || Math.hypot(dx, dy) > 4)
        commit(tiltTexture(active.start, dx * 0.008, dy * 0.008));
      else if (stage >= 4) choosePoint(event);
    }
    cancel();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase();
    if (["tab", "shift", "control", "alt", "meta"].includes(key)) return;
    const arrows = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"];
    if (arrows.includes(key)) {
      event.preventDefault();
      cancel();
      const dx =
        key === "a" || key === "arrowleft" ? -0.08 : key === "d" || key === "arrowright" ? 0.08 : 0;
      const dy =
        key === "w" || key === "arrowup" ? -0.08 : key === "s" || key === "arrowdown" ? 0.08 : 0;
      if (stage === 2) {
        commit({
          ...current.current,
          sampleUv: {
            x: Math.max(-0.5, Math.min(1.5, current.current.sampleUv.x + dx)),
            y: Math.max(-0.5, Math.min(1.5, current.current.sampleUv.y + dy)),
          },
        });
      } else {
        commit(tiltTexture(current.current, dx, dy));
      }
      return;
    }
    if (event.repeat) return;
    if (key >= "1" && key <= (stage >= 7 ? "4" : "3")) {
      event.preventDefault();
      change(presetTexture(current.current, Number(key), stage));
    } else if (key === "r") {
      event.preventDefault();
      reset();
    } else if (key === "m" && stage >= 6) {
      event.preventDefault();
      change({
        ...current.current,
        view: current.current.view === "affine" ? "perspective" : "affine",
      });
    } else if (key === "c" && stage >= 6) {
      event.preventDefault();
      change({
        ...current.current,
        view: current.current.view === "compare" ? "perspective" : "compare",
      });
    } else if (key === "f" && stage >= 8) {
      event.preventDefault();
      change({ ...current.current, debug: !current.current.debug });
    } else if (key === "t" && stage >= 2) {
      event.preventDefault();
      change({
        ...current.current,
        address: current.current.address === "clamp" ? "repeat" : "clamp",
      });
    } else if (key === " " && stage >= 8 && !reducedMotion) {
      event.preventDefault();
      change({ ...current.current, paused: !current.current.paused });
    } else if (key === "." && stage >= 8) {
      event.preventDefault();
      step();
    }
  };
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    onValue: (state: TextureScene, value: number) => TextureScene,
  ) => (
    <label>
      {label}
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step="0.01"
        value={value}
        onChange={(e) => change(onValue(current.current, Number(e.target.value)))}
      />
      <output>{value.toFixed(2)}</output>
    </label>
  );
  const inspection = frames.at(-1)?.inspection;
  const format = (uv?: { x: number; y: number }) =>
    uv ? `(${uv.x.toFixed(4)}, ${uv.y.toFixed(4)})` : "ngoài quad";
  const texel = nearestTextureTexel(scene.sampleUv, 64, 64, scene.address);
  return (
    <div className="lab-body">
      <div className="lab-controls">
        {stage !== 2 && (
          <>
            <label>
              Tư thế
              <select
                aria-label="Tư thế mặt phẳng"
                value={scene.preset}
                onChange={(e) =>
                  change(presetTexture(current.current, Number(e.target.value), stage))
                }
              >
                <option value="0" disabled>
                  Tùy chỉnh
                </option>
                <option value="1">1 · Chính diện</option>
                <option value="2">2 · Nghiêng vừa</option>
                <option value="3">3 · Nghiêng mạnh</option>
                {stage >= 7 && <option value="4">4 · Qua near plane</option>}
              </select>
            </label>
            {range("Góc xoay Y", scene.yaw, -1.25, 1.25, (state, value) => ({
              ...state,
              yaw: value,
              preset: 0,
              paused: true,
            }))}
            {range("Góc nghiêng X", scene.pitch, -0.8, 0.8, (state, value) => ({
              ...state,
              pitch: value,
              preset: 0,
              paused: true,
            }))}
            {range("Khoảng cách", scene.distance, stage >= 7 ? 1.4 : 2.8, 7, (state, value) => ({
              ...state,
              distance: value,
              preset: 0,
              paused: true,
            }))}
          </>
        )}
        {stage >= 6 && (
          <label>
            Hiển thị
            <select
              aria-label="Cách nội suy texture"
              value={scene.view}
              onChange={(e) =>
                change({ ...current.current, view: e.target.value as TextureScene["view"] })
              }
            >
              <option value="affine">Affine</option>
              <option value="perspective">Perspective-correct</option>
              <option value="compare">So sánh A/B</option>
            </select>
          </label>
        )}
        {(stage === 2 || stage === 8) && (
          <label>
            UV ngoài miền
            <select
              aria-label="Texture address mode"
              value={scene.address}
              onChange={(e) =>
                change({ ...current.current, address: e.target.value as TextureScene["address"] })
              }
            >
              <option value="clamp">Clamp</option>
              <option value="repeat">Repeat</option>
            </select>
          </label>
        )}
        {stage === 2 && (
          <>
            {range("Tọa độ U để lấy mẫu", scene.sampleUv.x, -0.5, 1.5, (state, value) => ({
              ...state,
              sampleUv: { ...state.sampleUv, x: value },
            }))}
            {range("Tọa độ V để lấy mẫu", scene.sampleUv.y, -0.5, 1.5, (state, value) => ({
              ...state,
              sampleUv: { ...state.sampleUv, y: value },
            }))}
          </>
        )}
        {stage >= 4 && scene.debug && (
          <>
            <label>
              Kéo chuột
              <select
                aria-label="Thao tác kéo texture"
                value={target}
                onChange={(e) => {
                  pause();
                  setTarget(e.target.value as "tilt" | "sample");
                }}
              >
                <option value="tilt">Xoay mặt phẳng</option>
                <option value="sample">Chọn pixel</option>
              </select>
            </label>
            {range("Pixel X (tỉ lệ)", scene.sample.x, 0, 0.99, (state, value) => ({
              ...state,
              sample: { ...state.sample, x: value },
            }))}
            {range("Pixel Y (tỉ lệ)", scene.sample.y, 0, 0.99, (state, value) => ({
              ...state,
              sample: { ...state.sample, y: value },
            }))}
          </>
        )}
        {stage >= 8 && (
          <>
            <button
              type="button"
              disabled={reducedMotion}
              onClick={() => change({ ...current.current, paused: !current.current.paused })}
            >
              {scene.paused ? "Chạy xoay mặt phẳng" : "Tạm dừng"}
            </button>
            <button type="button" onClick={step}>
              Tiến một bước
            </button>
            <button
              type="button"
              aria-pressed={scene.debug}
              onClick={() => change({ ...current.current, debug: !current.current.debug })}
            >
              {scene.debug ? "Chế độ trình diễn" : "Hiện debug"}
            </button>
          </>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(380px,50vw,560px)" }}
        role="img"
        tabIndex={0}
        aria-label="Mặt phẳng 3D so sánh texture affine và perspective-correct"
        aria-describedby={helpId}
        onKeyDown={keyDown}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      />
      <p id={helpId} className="lab-hint">
        {stage === 2
          ? "Kéo trên ảnh hoặc dùng thanh U/V để chọn texel; thử UV âm và UV bằng 1."
          : "Kéo hoặc dùng WASD/phím mũi tên để xoay mặt phẳng. Hai cạnh vẫn giữ nguyên chiều dài."}
        {stage >= 6 ? " M đổi affine/corrected; C bật so sánh." : ""}
        {stage >= 8 ? " Space chạy/dừng, dấu chấm tiến một bước, F bật debug." : ""} R đặt lại; Tab
        chuyển sang điều khiển tiếp theo.
      </p>
      {stage === 2 ? (
        <LabReadout
          items={[
            { label: "UV nguồn", value: format(scene.sampleUv) },
            { label: "Texel (64 × 64)", value: `(${texel.x}, ${texel.y}) · ${scene.address}` },
          ]}
        />
      ) : scene.debug && stage >= 4 ? (
        <LabReadout
          items={[
            {
              label: "λA / λB / λC",
              value: inspection
                ? Object.values(inspection.weights)
                    .map((v) => v.toFixed(4))
                    .join(" / ")
                : "ngoài quad",
            },
            { label: "Affine UV", value: format(inspection?.affineUv) },
            { label: "Reference UV (ray–plane)", value: format(inspection?.referenceUv) },
            { label: "Affine error", value: inspection?.error?.toFixed(6) ?? "—" },
            ...(stage >= 5
              ? [{ label: "1/z denominator", value: inspection?.denominator?.toFixed(6) ?? "—" }]
              : []),
            ...(stage >= 6
              ? [
                  {
                    label: "Corrected UV / reference error",
                    value: `${format(inspection?.correctedUv)} / ${inspection?.correctedUv && inspection.referenceUv ? textureUvDistance(inspection.correctedUv, inspection.referenceUv).toExponential(2) : "—"}`,
                  },
                ]
              : []),
            {
              label: "Texel đang vẽ",
              value: inspection ? `(${inspection.texel.x}, ${inspection.texel.y})` : "—",
            },
          ]}
        />
      ) : (
        <LabReadout
          items={[
            { label: "Trạng thái", value: scene.paused ? "Đang tạm dừng" : "Đang xoay mặt phẳng" },
            {
              label: "Góc yaw / pitch",
              value: `${scene.yaw.toFixed(3)} / ${scene.pitch.toFixed(3)} rad`,
            },
            { label: "Khoảng cách camera", value: scene.distance.toFixed(2) },
            { label: "Nội suy", value: stage >= 6 ? scene.view : "Chưa bật ở bài này" },
          ]}
        />
      )}
      <p className="sr-only">
        Mặt phẳng có yaw {scene.yaw.toFixed(3)}, pitch {scene.pitch.toFixed(3)}, cách camera{" "}
        {scene.distance.toFixed(2)}. Bàn cờ sáng/tối cố định, không đổi theo theme. Canvas dùng CPU
        rasterization ở độ phân giải giới hạn để thấy rõ pixel; source C++ dùng framebuffer 960 ×
        640.
      </p>
    </div>
  );
}
