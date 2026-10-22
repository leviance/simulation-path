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
import { nearSignedDistance, nearTriangleVertices } from "@/lib/labs/near-plane";
import {
  initialNearScene,
  nearStage,
  nearPresets,
  nearFrame,
  editNearDepth,
  editNearPlane,
  editNearCamera,
  stepNearSweep,
  advanceNearScene,
  type NearPreset,
  type NearPolicy,
  type NearScene,
} from "@/lib/labs/near-plane-scene";
import { drawNearLab, nearPointFromEvent } from "./near-plane-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function NearPlaneLab({ mode }: { mode?: InteractiveLabMode }) {
  return <NearPlaneScene key={mode ?? "default"} mode={mode} />;
}
function NearPlaneScene({ mode }: { mode?: InteractiveLabMode }) {
  const stage = nearStage(mode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [scene, setScene] = useState<NearScene>(() => initialNearScene(stage));
  const sceneRef = useRef(scene);
  const drag = useRef<{ id: number; startX: number; depthOffset: number } | null>(null);
  const held = useRef({ toward: false, away: false });
  const [heldAxis, setHeldAxis] = useState(0);
  const [captured, setCaptured] = useState(false);
  const commit = useCallback((next: NearScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelPointer = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCaptured(false);
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const clearInput = useCallback(() => {
    cancelPointer();
    held.current = { toward: false, away: false };
    setHeldAxis(0);
  }, [cancelPointer]);
  const pauseForEnvironment = useCallback(() => {
    clearInput();
    commit({ ...sceneRef.current, paused: true });
  }, [clearInput, commit]);
  const size = useCanvasSize(canvasRef, pauseForEnvironment);
  usePauseOnReducedMotion(pauseForEnvironment);
  const reset = (preset: NearPreset = sceneRef.current.preset) => {
    if (!nearPresets.includes(preset)) return;
    clearInput();
    commit(initialNearScene(stage, preset));
  };
  const editDepth = (value: number) => {
    clearInput();
    commit(editNearDepth(sceneRef.current, value));
  };
  const editPlane = (value: number) => {
    clearInput();
    commit(editNearPlane(sceneRef.current, value));
  };
  const editCamera = (axis: "x" | "z", value: number) => {
    if (stage < 8) return;
    clearInput();
    commit(editNearCamera(sceneRef.current, axis, value));
  };
  const setPolicy = (policy: NearPolicy) => {
    if (stage < 6 || !["clip", "discard"].includes(policy)) return;
    clearInput();
    commit({ ...sceneRef.current, policy, paused: true });
  };
  const togglePause = () => {
    clearInput();
    if (stage < 7) return;
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const step = () => {
    clearInput();
    if (stage < 7 || !sceneRef.current.paused) return;
    commit(stepNearSweep(sceneRef.current));
  };
  const toggleDebug = () => {
    clearInput();
    if (stage < 8) return;
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug, paused: true });
  };
  const nextEdge = () => {
    clearInput();
    commit({ ...sceneRef.current, paused: true, edgeLimit: (sceneRef.current.edgeLimit + 1) % 4 });
  };
  const movePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const p = nearPointFromEvent(event, size, sceneRef.current, true);
    if (p)
      commit(editNearDepth(sceneRef.current, active.depthOffset + (p.x - active.startX) * 0.012));
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const p = nearPointFromEvent(event, size, sceneRef.current);
    if (!p) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    clearInput();
    commit({ ...sceneRef.current, paused: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        id: event.pointerId,
        startX: p.x,
        depthOffset: sceneRef.current.depthOffset,
      };
      setCaptured(true);
    } catch {
      drag.current = null;
      setCaptured(false);
    }
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelPointer();
      return;
    }
    movePointer(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    movePointer(event);
    cancelPointer();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelPointer();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    if (key === "a" || key === "d") {
      event.preventDefault();
      cancelPointer();
      held.current[key === "a" ? "toward" : "away"] = true;
      setHeldAxis(Number(held.current.away) - Number(held.current.toward));
      commit({ ...sceneRef.current, paused: true });
      return;
    }
    const commands: Record<string, () => void> = {
      r: () => reset(),
      escape: pauseForEnvironment,
      " ": togglePause,
      n: step,
      f: toggleDebug,
      v: () => setPolicy(sceneRef.current.policy === "clip" ? "discard" : "clip"),
      w: () => editPlane(sceneRef.current.nearPlane + 0.05),
      s: () => editPlane(sceneRef.current.nearPlane - 0.05),
      j: () => editCamera("x", sceneRef.current.camera.x - 0.1),
      l: () => editCamera("x", sceneRef.current.camera.x + 0.1),
      i: () => editCamera("z", sceneRef.current.camera.z + 0.1),
      k: () => editCamera("z", sceneRef.current.camera.z - 0.1),
    };
    if (/^[1-5]$/.test(key)) {
      event.preventDefault();
      if (!event.repeat) reset(nearPresets[Number(key) - 1]);
    } else if (commands[key]) {
      event.preventDefault();
      if (!event.repeat || ["w", "s", "j", "l", "i", "k"].includes(key)) commands[key]();
    }
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (key !== "a" && key !== "d") return;
    held.current[key === "a" ? "toward" : "away"] = false;
    setHeldAxis(Number(held.current.away) - Number(held.current.toward));
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) pauseForEnvironment();
    };
    window.addEventListener("blur", pauseForEnvironment);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", pauseForEnvironment);
      document.removeEventListener("visibilitychange", hidden);
      clearInput();
    };
  }, [pauseForEnvironment, clearInput]);
  useEffect(() => {
    if (heldAxis === 0 && (stage < 7 || scene.paused || reducedMotion)) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const axis = Number(held.current.away) - Number(held.current.toward);
      const current = sceneRef.current;
      if (axis === 0 && (stage < 7 || current.paused || reducedMotion)) return;
      const dt = Math.max(0, (now - previous) / 1000);
      previous = now;
      commit(advanceNearScene(current, dt, axis));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [heldAxis, stage, scene.paused, reducedMotion, commit]);
  const result = useMemo(() => nearFrame(scene, stage), [scene, stage]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawNearLab(ctx, size, scene, stage, result);
  }, [size, scene, stage, result]);
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Tình huống
          <select
            aria-label="Tình huống near-plane clipping"
            value={scene.preset}
            onChange={(e) => reset(e.target.value as NearPreset)}
          >
            {nearPresets.map((name, i) => (
              <option key={name} value={name}>
                {i + 1} · {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Độ sâu
          <input
            aria-label="Độ dịch tam giác theo Z"
            type="range"
            min="-4"
            max="3"
            step=".01"
            value={scene.depthOffset}
            onChange={(e) => editDepth(Number(e.target.value))}
          />
          <output>{scene.depthOffset.toFixed(2)}</output>
        </label>
        <label>
          Near
          <input
            aria-label="Độ sâu near plane"
            type="range"
            min=".25"
            max="2"
            step=".05"
            value={scene.nearPlane}
            onChange={(e) => editPlane(Number(e.target.value))}
          />
          <output>{scene.nearPlane.toFixed(2)}</output>
        </label>
        {stage >= 6 && (
          <label>
            Xử lý
            <select
              aria-label="Cách xử lý triangle cắt near plane"
              value={scene.policy}
              onChange={(e) => setPolicy(e.target.value as NearPolicy)}
            >
              <option value="clip">Clip phần ngoài</option>
              <option value="discard">Bỏ cả triangle</option>
            </select>
          </label>
        )}
        {stage === 4 && <button onClick={nextEdge}>Tiến một cạnh ({scene.edgeLimit}/3)</button>}
        {stage >= 8 &&
          (["x", "z"] as const).map((axis) => (
            <label key={axis}>
              Camera {axis.toUpperCase()}
              <input
                aria-label={"Camera " + axis.toUpperCase()}
                type="range"
                min={axis === "x" ? -1 : -0.5}
                max={axis === "x" ? 1 : 0.5}
                step=".1"
                value={scene.camera[axis]}
                onChange={(e) => editCamera(axis, Number(e.target.value))}
              />
              <output>{scene.camera[axis].toFixed(1)}</output>
            </label>
          ))}
        {stage >= 7 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Chạy sweep" : "Tạm dừng"}
            </button>
            <button onClick={step} disabled={!scene.paused}>
              Tiến một bước
            </button>
          </>
        )}
        {stage >= 8 && (
          <button onClick={toggleDebug}>{scene.debug ? "Ẩn debug" : "Hiện debug"}</button>
        )}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        style={{ height: "clamp(380px,58vw,580px)", touchAction: "none" }}
        aria-label="Mặt cắt camera space và viewport 3D của tam giác được cắt tại near plane"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={clearInput}
      />
      <p>
        Giữ A/D hoặc kéo ngang để đưa tam giác lại gần/ra xa camera; không xoay world. W/S chỉnh
        near, 1–5 chọn tình huống, R đặt lại tình huống đang chọn.
        {stage < 6
          ? " Bản đang học chưa nối clipper vào renderer: tam giác có đỉnh ngoài vẫn bị bỏ cả hình."
          : " V đổi clip/discard để so sánh cùng một đầu vào."}
        {stage >= 7 ? " Space chạy/dừng sweep, N tiến một bước khi dừng." : ""}
        {stage >= 8
          ? " J/L dịch camera X, I/K dịch camera Z; F ẩn debug nhưng giữ lưới world và bề mặt 3D."
          : ""}{" "}
        Kéo dùng logical pixel của khung 1100×800, không nhân DPR. Canvas tô buffer 220×120 (debug)
        hoặc 220×160 (clean); C++ dùng 1100×600 hoặc 1100×800.
        {reducedMotion
          ? " Reduced motion: tắt sweep tự động; vẫn kéo, giữ phím và tiến từng bước được."
          : ""}
      </p>
      {scene.debug && (
        <LabReadout
          items={[
            ...(stage >= 2
              ? [
                  {
                    label: "d(A) / d(B) / d(C)",
                    value: nearTriangleVertices(result.source)
                      .map((v) => nearSignedDistance(v, scene.nearPlane).toFixed(3))
                      .join(" / "),
                  },
                  {
                    label: "Inside / outside / on",
                    value: `${result.counts.inside} / ${result.counts.outside} / ${result.counts.onPlane}`,
                  },
                ]
              : []),
            ...(stage >= 3
              ? [
                  {
                    label: "Giao điểm t",
                    value:
                      result.intersections.map((hit) => hit.t.toFixed(4)).join(" / ") || "không có",
                  },
                ]
              : []),
            ...(stage >= 4
              ? [
                  {
                    label: "Chuyển trạng thái",
                    value:
                      (stage === 4 ? result.steps.slice(0, scene.edgeLimit) : result.steps)
                        .map((s) => s.transition)
                        .join(", ") || "chưa duyệt cạnh",
                  },
                  {
                    label: "Polygon → triangle",
                    value: `${result.polygon.length} → ${stage >= 5 ? result.batch.length : "chưa viết fan"}`,
                  },
                ]
              : []),
            {
              label: "Pixels / violation",
              value: `${result.covered} / ${stage >= 7 ? result.violation.toExponential(1) : "chưa đo"}`,
            },
            { label: "pointer capture", value: captured ? "đang kéo" : "đã nhả" },
          ]}
        />
      )}
      <p className="sr-only">
        Tam giác được vẽ trong viewport perspective chính.{" "}
        {stage >= 4 ? `Sau clipping còn ${result.polygon.length} đỉnh.` : ""} {result.covered} pixel
        đã tô;{" "}
        {scene.debug
          ? "mặt cắt ZX nằm dưới, màu xám trước clip, xanh lá sau clip, trắng tại giao điểm."
          : "đã ẩn debug."}
      </p>
    </div>
  );
}
