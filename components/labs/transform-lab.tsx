"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  initialTransformScene,
  effectiveTransformScene,
  transformStage,
  transformResults,
  transformScreenToWorld,
  boundTransformTranslation,
  transformPreset,
  transformSliderSpecs,
  transformParameterValue,
  changeTransformParameter,
  advanceTransform,
  type TransformScene,
  type TransformParameterKey,
} from "@/lib/labs/transform-scene";
import { drawTransformLab, transformPointFromEvent } from "./transform-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function TransformLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion();
  const [scene, setScene] = useState<TransformScene>(initialTransformScene);
  const sceneRef = useRef(scene),
    drag = useRef<{ id: number; offset: { x: number; y: number } } | null>(null);
  const stage = transformStage(mode),
    effective = effectiveTransformScene(scene, stage),
    result = transformResults(effective);
  const commit = useCallback((next: TransformScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const reset = useCallback(
    (index = 0) => {
      cancelDrag();
      commit(transformPreset(index));
    },
    [cancelDrag, commit],
  );
  const changeParameter = (key: TransformParameterKey, value: number) => {
    cancelDrag();
    commit(changeTransformParameter(sceneRef.current, key, value));
  };
  const togglePause = () => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const moveTarget = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const point = transformPointFromEvent(event, size, true);
    if (!point) return;
    const world = transformScreenToWorld(point),
      current = sceneRef.current;
    const translation = boundTransformTranslation({
      x: world.x + active.offset.x,
      y: world.y + active.offset.y,
    });
    commit({ ...current, parameters: { ...current.parameters, translation } });
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 5 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const point = transformPointFromEvent(event, size);
    if (!point) return;
    const world = transformScreenToWorld(point),
      translation = sceneRef.current.parameters.translation;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = {
      id: event.pointerId,
      offset: { x: translation.x - world.x, y: translation.y - world.y },
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      drag.current = null;
    }
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelDrag();
      return;
    }
    moveTarget(event);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    moveTarget(event);
    cancelDrag();
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    if (key === "r" && !event.repeat) {
      event.preventDefault();
      reset();
      return;
    }
    if (["1", "2", "3", "4", "5"].includes(key) && !event.repeat) {
      event.preventDefault();
      reset(Number(key) - 1);
      return;
    }
    if (key === "o" && stage >= 6 && !event.repeat) {
      event.preventDefault();
      cancelDrag();
      commit({
        ...sceneRef.current,
        order:
          sceneRef.current.order === "scale-shear-rotate"
            ? "rotate-shear-scale"
            : "scale-shear-rotate",
      });
      return;
    }
    if (key === " " && stage >= 7 && !event.repeat) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (key === "n" && stage >= 7 && !event.repeat && sceneRef.current.paused) {
      event.preventDefault();
      commit(advanceTransform(sceneRef.current, 0.1));
      return;
    }
    if (stage >= 5 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      cancelDrag();
      const current = sceneRef.current,
        t = current.parameters.translation;
      const translation = boundTransformTranslation({
        x: t.x + (event.key === "ArrowRight" ? 0.1 : event.key === "ArrowLeft" ? -0.1 : 0),
        y: t.y + (event.key === "ArrowUp" ? 0.1 : event.key === "ArrowDown" ? -0.1 : 0),
      });
      commit({ ...current, parameters: { ...current.parameters, translation } });
    }
  };
  useEffect(() => {
    const pause = () => {
      cancelDrag();
      commit({ ...sceneRef.current, paused: true });
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      cancelDrag();
    };
  }, [cancelDrag, commit]);
  useEffect(() => {
    cancelDrag();
    commit(initialTransformScene());
  }, [mode, cancelDrag, commit]);
  useEffect(() => {
    // Resize releases the drag and pauses without resetting world parameters.
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [size.width, size.height, size.dpr, cancelDrag, commit]);
  useEffect(() => {
    if (reducedMotion) commit({ ...sceneRef.current, paused: true });
  }, [reducedMotion, commit]);
  useEffect(() => {
    if (stage < 7 || scene.paused || reducedMotion) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      commit(advanceTransform(sceneRef.current, dt));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawTransformLab(ctx, size, effectiveTransformScene(scene, stage), stage);
  }, [size, scene, stage]);
  const available = transformSliderSpecs.filter((_, i) =>
    i < 2 ? stage >= 2 : i === 2 ? stage >= 3 : i < 5 ? stage >= 4 : stage >= 5,
  );
  const orientation =
    Math.abs(result.determinant) <= 1e-10
      ? "suy biến/gần suy biến"
      : result.determinant < 0
        ? "đảo chiều"
        : "giữ chiều";
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Preset biến đổi"
            value=""
            onChange={(event) => reset(Number(event.target.value))}
          >
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            <option value="0">Identity</option>
            <option value="1">Scale âm</option>
            <option value="2">Scale bằng 0</option>
            <option value="3">Shear suy biến</option>
            <option value="4">Ghép không giao hoán</option>
          </select>
        </label>
        {available.map((spec) => (
          <label key={spec.key}>
            {spec.label}
            <input
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={transformParameterValue(scene, spec.key)}
              onChange={(event) => changeParameter(spec.key, Number(event.target.value))}
            />
            <output>{transformParameterValue(scene, spec.key).toFixed(3)}</output>
          </label>
        ))}
        {stage >= 6 && (
          <label>
            Thứ tự
            <select
              value={scene.order}
              onChange={(event) => {
                cancelDrag();
                commit({
                  ...sceneRef.current,
                  order: event.target.value as TransformScene["order"],
                });
              }}
            >
              <option value="scale-shear-rotate">Scale → Shear → Rotate → Translate</option>
              <option value="rotate-shear-scale">Rotate → Shear → Scale → Translate</option>
            </select>
          </label>
        )}
        {stage >= 7 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Chạy tự động" : "Tạm dừng"}
            </button>
            <button
              disabled={!scene.paused}
              onClick={() => commit(advanceTransform(sceneRef.current, 0.1))}
            >
              Tiến 0.1 s
            </button>
          </>
        )}
        <button onClick={() => reset()}>Đặt lại identity</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(360px,60vw,560px)", touchAction: "none" }}
        onPointerDown={startDrag}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
        onLostPointerCapture={pointerCancel}
        onKeyDown={onKeyDown}
        onBlur={() => {
          cancelDrag();
          commit({ ...sceneRef.current, paused: true });
        }}
        tabIndex={0}
        aria-label="Hình vuông và hệ cơ sở sau biến đổi; phím mũi tên dịch chuyển, O đổi thứ tự, R đặt lại"
      />
      <p>
        Xám là hình gốc tại world origin; xanh lá là hình sau biến đổi. Từ bài Mat3, kéo trong vùng
        vẽ để dịch chuyển mà không nhảy tâm. Tab tới slider rồi dùng phím mũi tên; trên Canvas, mũi
        tên dịch chuyển, 1–5 chọn preset, O đổi thứ tự, Space pause, N tiến 0.1 s.{" "}
        {reducedMotion ? "Reduced motion đang bật: chỉ chỉnh tay hoặc tiến từng bước." : ""}
      </p>
      <LabReadout
        items={[
          { label: "local P2", value: "(1, 1)" },
          {
            label: "world P2",
            value: `(${result.square[2].x.toFixed(4)}, ${result.square[2].y.toFixed(4)})`,
          },
          ...(stage >= 5
            ? [
                {
                  label: "composed matrix",
                  value: result.matrix.map((n) => n.toFixed(3)).join(" "),
                },
                { label: "direct vs matrix", value: result.error.toExponential(2) },
              ]
            : []),
          ...(stage >= 8
            ? [
                {
                  label: "determinant",
                  value: `${result.determinant.toFixed(6)} · ${orientation}`,
                },
                {
                  label: "area ratio",
                  value: `${result.areaRatio.toFixed(6)} ≈ |det| ${Math.abs(result.determinant).toFixed(6)}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
