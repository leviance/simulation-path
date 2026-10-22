"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  depthStage,
  initialDepthScene,
  depthFrame,
  depthViewport,
  editDepthScene,
  advanceDepthScene,
  type DepthScene,
} from "@/lib/labs/z-buffer-scene";
import { zFrameDifference } from "@/lib/labs/z-buffer";
import { drawDepthScene, depthPointer } from "./z-buffer-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function ZBufferLab({ mode }: { mode?: InteractiveLabMode }) {
  return <DepthWorkbench key={mode ?? "depth-scene"} mode={mode} />;
}
function DepthWorkbench({ mode }: { mode?: InteractiveLabMode }) {
  const stage = depthStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(() => initialDepthScene(stage)),
    sceneRef = useRef(scene);
  const drag = useRef<{ id: number; x: number; y: number; angleX: number; angleY: number } | null>(
    null,
  );
  const reducedMotion = useReducedMotion();
  const commit = useCallback((next: DepthScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pauseEnvironment = useCallback(() => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [cancelDrag, commit]);
  const size = useCanvasSize(canvasRef, pauseEnvironment);
  usePauseOnReducedMotion(pauseEnvironment);
  const reset = (preset = sceneRef.current.preset) => {
    cancelDrag();
    commit(initialDepthScene(stage, preset));
  };
  const edit = (key: "angleX" | "angleY" | "cameraX" | "cameraZ", value: number) => {
    cancelDrag();
    commit(editDepthScene(sceneRef.current, key, value));
  };
  const toggle = (key: "depthEnabled" | "reverseOrder" | "depthView" | "cullEnabled" | "debug") => {
    cancelDrag();
    const s = sceneRef.current;
    const next = {
      ...s,
      [key]: !s[key],
      paused: true,
      traceStep: 0,
      ...(key === "debug" ? { depthView: false } : {}),
    };
    const v = depthViewport(stage, next);
    next.inspect = {
      x: Math.min(v.width - 1, next.inspect.x),
      y: Math.min(v.height - 1, next.inspect.y),
    };
    commit(next);
  };
  const play = () => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const step = () => {
    cancelDrag();
    const s = sceneRef.current;
    if (!s.paused) return;
    commit(editDepthScene(s, "angleY", s.angleY + 0.08));
  };
  const nextFragment = () => {
    cancelDrag();
    const s = sceneRef.current;
    const count = depthFrame(stage, s).traces.length;
    commit({ ...s, paused: true, traceStep: count ? (s.traceStep + 1) % count : 0 });
  };
  const moveDrag = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const s = sceneRef.current;
    const ax = d.angleX + (e.clientY - d.y) * 0.008,
      ay = d.angleY + (e.clientX - d.x) * 0.008;
    commit(editDepthScene(editDepthScene(s, "angleX", ax), "angleY", ay));
  };
  const pointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary || e.button !== 0 || drag.current) return;
    const s = sceneRef.current,
      p = depthPointer(e, size, stage, s),
      v = depthViewport(stage, s);
    if (!p || p.x < 0 || p.y < 0 || p.x >= v.width || p.y >= v.height) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        angleX: s.angleX,
        angleY: s.angleY,
      };
      commit({
        ...s,
        paused: true,
        inspect: { x: Math.floor(p.x), y: Math.floor(p.y) },
        traceStep: 0,
      });
    } catch {
      drag.current = null;
    }
  };
  const pointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) {
      cancelDrag();
      return;
    }
    moveDrag(e);
  };
  const pointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || drag.current?.id !== e.pointerId) return;
    moveDrag(e);
    cancelDrag();
  };
  const pointerCancel = (e: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === e.pointerId) cancelDrag();
  };
  const keyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey || e.key === "Tab") return;
    const key = e.key.toLowerCase(),
      s = sceneRef.current;
    const directions: Record<string, ["angleX" | "angleY" | "cameraX" | "cameraZ", number]> = {
      arrowleft: ["angleY", s.angleY - 0.08],
      arrowright: ["angleY", s.angleY + 0.08],
      arrowup: ["angleX", s.angleX - 0.08],
      arrowdown: ["angleX", s.angleX + 0.08],
      ...(stage >= 9
        ? {
            j: ["cameraX", s.cameraX - 0.1] as ["cameraX", number],
            l: ["cameraX", s.cameraX + 0.1] as ["cameraX", number],
            i: ["cameraZ", s.cameraZ + 0.1] as ["cameraZ", number],
            k: ["cameraZ", s.cameraZ - 0.1] as ["cameraZ", number],
          }
        : {}),
    };
    if (directions[key]) {
      e.preventDefault();
      edit(...directions[key]);
      return;
    }
    const commands: Record<string, () => void> = {
      r: () => reset(),
      ...(stage >= 2 ? { o: () => toggle("reverseOrder") } : {}),
      ...(stage >= 5 ? { d: () => toggle("depthEnabled") } : {}),
      ...(stage >= 6 ? { " ": play, n: step } : {}),
      ...(stage >= 7 ? { v: () => toggle("depthView") } : {}),
      ...(stage >= 8 ? { c: () => toggle("cullEnabled") } : {}),
      ...(stage >= 9 ? { f: () => toggle("debug") } : {}),
      "1": () => reset(1),
      "2": () => reset(2),
      "3": () => reset(3),
    };
    if (!commands[key]) return;
    e.preventDefault();
    if (e.repeat) return;
    commands[key]();
  };
  const frame = useMemo(() => depthFrame(stage, scene), [stage, scene]);
  const reversed = useMemo(() => depthFrame(stage, scene, !scene.reverseOrder), [stage, scene]);
  const difference = zFrameDifference(frame, reversed);
  const index = scene.inspect.y * frame.width + scene.inspect.x,
    depth = frame.depths[index];
  const trace = frame.traces[Math.min(scene.traceStep, frame.traces.length - 1)];
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawDepthScene(ctx, size, stage, scene);
  }, [size, stage, scene]);
  useEffect(() => {
    const blur = () => pauseEnvironment(),
      hidden = () => {
        if (document.hidden) pauseEnvironment();
      };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      cancelDrag();
    };
  }, [pauseEnvironment, cancelDrag]);
  useEffect(() => {
    if (stage < 6 || scene.paused || reducedMotion) return;
    let previous = performance.now(),
      id = 0;
    const animate = (now: number) => {
      const s = sceneRef.current;
      if (s.paused) return;
      commit(advanceDepthScene(s, (now - previous) / 1000));
      previous = now;
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [stage, scene.paused, reducedMotion, commit]);
  const v = depthViewport(stage, scene);
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Góc nhìn
          <select
            aria-label="Góc nhìn cube"
            value={scene.preset}
            onChange={(e) => reset(Number(e.target.value))}
          >
            <option value={1}>Nhìn ba mặt</option>
            <option value={2}>Nhìn thẳng mặt trước</option>
            <option value={3}>Nhiều mặt chồng nhau</option>
          </select>
        </label>
        {stage >= 5 && (
          <label className="check">
            <input
              type="checkbox"
              checked={scene.depthEnabled}
              onChange={() => toggle("depthEnabled")}
            />
            Depth test
          </label>
        )}
        {stage >= 2 && (
          <label className="check">
            <input
              type="checkbox"
              checked={scene.reverseOrder}
              onChange={() => toggle("reverseOrder")}
            />
            Đảo draw order
          </label>
        )}
        {(stage === 3 || stage >= 7) && (
          <label className="check">
            <input
              type="checkbox"
              disabled={!scene.debug}
              checked={scene.depthView}
              onChange={() => toggle("depthView")}
            />
            Xem depth
          </label>
        )}
        {stage >= 8 && (
          <label className="check">
            <input
              type="checkbox"
              checked={scene.cullEnabled}
              onChange={() => toggle("cullEnabled")}
            />
            Back-face culling
          </label>
        )}
        {stage >= 9 && (
          <button onClick={() => toggle("debug")}>{scene.debug ? "Ẩn debug" : "Hiện debug"}</button>
        )}
        {stage >= 6 && (
          <>
            <button disabled={reducedMotion} onClick={play}>
              {scene.paused ? "Cho cube quay" : "Tạm dừng"}
            </button>
            <button disabled={!scene.paused} onClick={step}>
              Tiến một bước
            </button>
          </>
        )}
        {stage === 5 && <button onClick={nextFragment}>Fragment tiếp theo</button>}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <div className="lab-controls">
        <label>
          Góc X
          <input
            aria-label="Góc X"
            type="range"
            min={-3.14}
            max={3.14}
            step={0.01}
            value={scene.angleX}
            onChange={(e) => edit("angleX", Number(e.target.value))}
          />
        </label>
        <label>
          Góc Y
          <input
            aria-label="Góc Y"
            type="range"
            min={-3.14}
            max={3.14}
            step={0.01}
            value={scene.angleY}
            onChange={(e) => edit("angleY", Number(e.target.value))}
          />
        </label>
        {stage >= 9 && (
          <>
            <label>
              Camera X
              <input
                aria-label="Camera X"
                type="range"
                min={-1}
                max={1}
                step={0.1}
                value={scene.cameraX}
                onChange={(e) => edit("cameraX", Number(e.target.value))}
              />
            </label>
            <label>
              Camera Z
              <input
                aria-label="Camera Z"
                type="range"
                min={-0.5}
                max={0.5}
                step={0.1}
                value={scene.cameraZ}
                onChange={(e) => edit("cameraZ", Number(e.target.value))}
              />
            </label>
          </>
        )}
        {stage >= 3 && (
          <>
            <label>
              Pixel X
              <input
                aria-label="Pixel X"
                type="number"
                min={0}
                max={v.width - 1}
                value={scene.inspect.x}
                onChange={(e) => {
                  cancelDrag();
                  const x = Number(e.target.value);
                  if (Number.isInteger(x) && x >= 0 && x < v.width)
                    commit({
                      ...sceneRef.current,
                      inspect: { ...sceneRef.current.inspect, x },
                      paused: true,
                      traceStep: 0,
                    });
                }}
              />
            </label>
            <label>
              Pixel Y
              <input
                aria-label="Pixel Y"
                type="number"
                min={0}
                max={v.height - 1}
                value={scene.inspect.y}
                onChange={(e) => {
                  cancelDrag();
                  const y = Number(e.target.value);
                  if (Number.isInteger(y) && y >= 0 && y < v.height)
                    commit({
                      ...sceneRef.current,
                      inspect: { ...sceneRef.current.inspect, y },
                      paused: true,
                      traceStep: 0,
                    });
                }}
              />
            </label>
          </>
        )}
      </div>
      <p>
        Kéo để xoay mô hình; camera và lưới world không quay theo. Click để chọn pixel. Phím mũi tên
        xoay mô hình; Tab chuyển focus.{" "}
        {stage >= 9 && "J/L dịch camera X; I/K dịch camera Z; F bật/tắt debug."}
      </p>
      {reducedMotion && (
        <p>Reduced motion: không tự quay. Vẫn có thể kéo, dùng slider và tiến một bước.</p>
      )}
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(360px,50vw,560px)" }}
        tabIndex={0}
        role="img"
        aria-label="Khối lập phương sáu mặt màu: CPU Z-buffer, culling và camera"
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
        onLostPointerCapture={pointerCancel}
      />
      <LabReadout
        items={[
          {
            label: "Color / depth buffer",
            value: frame.colors.length + " / " + frame.depths.length,
          },
          {
            label: "Pixel / index",
            value: "(" + scene.inspect.x + ", " + scene.inspect.y + ") / " + index,
          },
          { label: "Depth cuối", value: depth >= 1 ? "1.0000 (clear)" : depth.toFixed(4) },
          { label: "Triangle / cull", value: frame.submittedCount + " / " + frame.culledCount },
          {
            label: "Fragment pass / reject",
            value: frame.passedCount + " / " + frame.rejectedCount,
          },
          ...(stage >= 4
            ? [
                {
                  label: "Weights tại sample",
                  value: trace?.weights
                    ? Object.values(trace.weights)
                        .map((n) => n.toFixed(4))
                        .join(" / ")
                    : "không có sample",
                },
              ]
            : []),
          ...(stage >= 5
            ? [
                {
                  label: "Fragment đang xem",
                  value: trace
                    ? trace.face +
                      ": " +
                      trace.storedDepth.toFixed(4) +
                      " → " +
                      trace.newDepth.toFixed(4) +
                      " " +
                      (trace.passed ? "pass" : "fail")
                    : "không có",
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "Chênh lệch khi đảo order",
                  value: difference.colorPixels + " color · " + difference.depthPixels + " depth",
                },
              ]
            : []),
        ]}
      />
      <p>
        Canvas dùng độ phân giải thấp để thấy từng pixel; ứng dụng SDL3 dùng board 1100×800.{" "}
        {stage >= 8 &&
          "Với cube lồi, culling có thể che mất lỗi khi tắt depth. Hãy tắt culling trước khi so draw order."}{" "}
        Khi tắt depth test ở project này, cả compare lẫn depth write đều dừng; color vẫn ghi theo
        draw order.
      </p>
    </div>
  );
}
