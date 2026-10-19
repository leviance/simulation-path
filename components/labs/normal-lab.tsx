"use client";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { dot3, type Vec3 } from "@/lib/labs/normal";
import { compassEye, orbitCompass } from "@/lib/labs/normal-camera";
import {
  initialCompassScene,
  compassStage,
  compassResults,
  compassPreset,
  compassVertices,
  changeCompassVertex,
  moveCompassVertex,
  flipCompass,
  advanceCompass,
  type CompassScene,
  type CompassVertex,
} from "@/lib/labs/normal-scene";
import { drawCompassLab, compassPointFromEvent } from "./normal-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const format = (p: Vec3) => `(${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)})`;
export default function NormalLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    stage = compassStage(mode);
  const [scene, setScene] = useState<CompassScene>(initialCompassScene),
    sceneRef = useRef(scene),
    drag = useRef<{ id: number; previous: { x: number; y: number } } | null>(null);
  const commit = useCallback((next: CompassScene) => {
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
      commit(compassPreset(index));
    },
    [cancelDrag, commit],
  );
  const flip = () => {
    cancelDrag();
    commit(flipCompass(sceneRef.current));
  };
  const togglePause = () => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const moveOrbit = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const point = compassPointFromEvent(event, size, true);
    if (!point) return;
    const current = sceneRef.current,
      camera = orbitCompass(
        current.camera,
        point.x - active.previous.x,
        point.y - active.previous.y,
      );
    active.previous = point;
    commit({ ...current, camera });
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 6 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const point = compassPointFromEvent(event, size);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: event.pointerId, previous: point };
    commit({ ...sceneRef.current, paused: true });
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
    moveOrbit(event);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    moveOrbit(event);
    cancelDrag();
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const setCamera = (key: "yaw" | "pitch" | "radius", value: number) => {
    if (!Number.isFinite(value)) return;
    cancelDrag();
    const limits = { yaw: [-Math.PI, Math.PI], pitch: [-1.2, 1.2], radius: [7, 12] },
      [min, max] = limits[key];
    commit({
      ...sceneRef.current,
      paused: true,
      camera: { ...sceneRef.current.camera, [key]: Math.max(min, Math.min(max, value)) },
    });
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    if (key === "r" && !event.repeat) {
      event.preventDefault();
      reset();
      return;
    }
    if (stage >= 2 && ["1", "2", "3"].includes(key)) {
      event.preventDefault();
      cancelDrag();
      commit({ ...sceneRef.current, selected: compassVertices[Number(key) - 1] });
      return;
    }
    if (stage >= 5 && key === "f" && !event.repeat) {
      event.preventDefault();
      flip();
      return;
    }
    if (stage >= 6 && key === " ") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (stage >= 6 && key === "n" && !event.repeat && sceneRef.current.paused) {
      event.preventDefault();
      commit(advanceCompass(sceneRef.current, 0.1));
      return;
    }
    if (["a", "d", "w", "s"].includes(key)) {
      event.preventDefault();
      cancelDrag();
      const camera = orbitCompass(
        sceneRef.current.camera,
        key === "a" ? -6 : key === "d" ? 6 : 0,
        key === "w" ? 6 : key === "s" ? -6 : 0,
      );
      commit({ ...sceneRef.current, camera, paused: true });
      return;
    }
    if (key === "+" || key === "=" || key === "-") {
      event.preventDefault();
      setCamera("radius", sceneRef.current.camera.radius + (key === "-" ? 0.5 : -0.5));
      return;
    }
    const deltas: Record<string, Vec3> = {
      ArrowLeft: { x: -0.1, y: 0, z: 0 },
      ArrowRight: { x: 0.1, y: 0, z: 0 },
      ArrowUp: { x: 0, y: 0.1, z: 0 },
      ArrowDown: { x: 0, y: -0.1, z: 0 },
      PageUp: { x: 0, y: 0, z: 0.1 },
      PageDown: { x: 0, y: 0, z: -0.1 },
    };
    if (stage >= 2 && deltas[event.key]) {
      event.preventDefault();
      cancelDrag();
      commit(moveCompassVertex(sceneRef.current, deltas[event.key]));
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
    commit(initialCompassScene());
  }, [mode, cancelDrag, commit]);
  useEffect(() => {
    // Resize releases capture and pauses, preserving world geometry.
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [size.width, size.height, size.dpr, cancelDrag, commit]);
  useEffect(() => {
    if (reducedMotion) commit({ ...sceneRef.current, paused: true });
  }, [reducedMotion, commit]);
  useEffect(() => {
    if (stage < 6 || scene.paused || reducedMotion) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      if (sceneRef.current.paused) return;
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      commit(advanceCompass(sceneRef.current, dt));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCompassLab(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = compassResults(scene);
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Tam giác mẫu"
            value=""
            onChange={(event) => reset(Number(event.target.value))}
          >
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            <option value="0">Mặc định</option>
            <option value="1">Tam giác 3–4</option>
            <option value="2">Thẳng hàng</option>
            <option value="3">Hai đỉnh trùng</option>
            <option value="4">Gần thẳng hàng</option>
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Đỉnh đang chọn
              <select
                value={scene.selected}
                onChange={(event) => {
                  cancelDrag();
                  commit({ ...sceneRef.current, selected: event.target.value as CompassVertex });
                }}
              >
                {compassVertices.map((key, i) => (
                  <option key={key} value={key}>
                    P{i}
                  </option>
                ))}
              </select>
            </label>
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={axis}>
                Đỉnh {axis.toUpperCase()}
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={scene.triangle[scene.selected][axis]}
                  onChange={(event) => {
                    cancelDrag();
                    commit(changeCompassVertex(sceneRef.current, axis, Number(event.target.value)));
                  }}
                />
                <output>{scene.triangle[scene.selected][axis].toFixed(3)}</output>
              </label>
            ))}
          </>
        )}
        {(["yaw", "pitch", "radius"] as const).map((key) => (
          <label key={key}>
            Camera {key}
            <input
              type="range"
              min={key === "yaw" ? -Math.PI : key === "pitch" ? -1.2 : 7}
              max={key === "yaw" ? Math.PI : key === "pitch" ? 1.2 : 12}
              step={key === "radius" ? 0.1 : 0.01}
              value={scene.camera[key]}
              onChange={(event) => setCamera(key, Number(event.target.value))}
            />
            <output>{scene.camera[key].toFixed(3)}</output>
          </label>
        ))}
        {stage >= 5 && <button onClick={flip}>Đảo winding</button>}
        {stage >= 6 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Chạy orbit" : "Tạm dừng"}
            </button>
            <button
              disabled={!scene.paused}
              onClick={() => commit(advanceCompass(sceneRef.current, 0.1))}
            >
              Tiến 0.1 s
            </button>
          </>
        )}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(380px,58vw,560px)", touchAction: "none" }}
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
        aria-label="La bàn ba trục perspective, vector A B và normal; A/D W/S xoay camera, mũi tên sửa đỉnh"
      />
      <p>
        Vector A=P1−P0, B=P2−P0. Vàng: raw cross vẽ dài min(0.2×|N|,2.2) world; tím: unit normal vẽ
        dài 1.4 world. Độ phóng đại chỉ dành cho hình, không đổi số đo. Từ bài 6, kéo trong viewport
        để orbit; nhấn không làm camera nhảy. Tab tới slider rồi dùng bàn phím mặc định; khi focus ở
        Canvas, 1–3 chọn đỉnh, mũi tên XY, PageUp/Down Z, F đảo winding, Space pause, N tiến từng
        bước.{" "}
        {reducedMotion ? "Reduced motion: tự động orbit bị tắt, chỉnh tay vẫn dùng được." : ""}
      </p>
      <LabReadout
        items={[
          { label: "camera eye", value: format(compassEye(scene.camera)) },
          ...(stage >= 2
            ? [
                { label: "vector A", value: format(r.edges.ab) },
                { label: "vector B", value: format(r.edges.ac) },
              ]
            : []),
          ...(stage >= 3
            ? [
                { label: "raw cross", value: format(r.raw) },
                {
                  label: "dot(N,A) / dot(N,B)",
                  value:
                    dot3(r.raw, r.edges.ab).toExponential(2) +
                    " / " +
                    dot3(r.raw, r.edges.ac).toExponential(2),
                },
              ]
            : []),
          ...(stage >= 4
            ? [
                { label: "unit normal", value: r.valid ? format(r.unit) : "Không xác định" },
                { label: "area", value: r.area.toExponential(5) + " world²" },
              ]
            : []),
          ...(stage >= 5
            ? [
                {
                  label: "facing",
                  value: r.status + (r.facing === null ? "" : " · " + r.facing.toFixed(5)),
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "orthogonality error",
                  value: r.valid
                    ? r.error.toExponential(2)
                    : "Không xác định (không có normal tin cậy)",
                },
                { label: "normal status", value: r.valid ? "Có hướng" : "Suy biến/gần thẳng hàng" },
              ]
            : []),
        ]}
      />
    </div>
  );
}
