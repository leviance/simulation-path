"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Vec3 } from "@/lib/labs/normal";
import type { EulerAngles, RotationOrder } from "@/lib/labs/rotation3d";
import {
  initialRotationScene,
  rotationStage,
  rotationPreset,
  rotationResults,
  changeRotationAngle,
  setRotationPosition,
  moveRotationModel,
  applyMouseDrag,
  advanceRotation,
  type RotationScene,
} from "@/lib/labs/rotation3d-scene";
import { drawRotationLab, rotationPointFromEvent } from "./rotation3d-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const format = (p: Vec3) => "(" + [p.x, p.y, p.z].map((x) => x.toFixed(4)).join(", ") + ")";
export default function Rotation3dLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    stage = rotationStage(mode);
  const [scene, setScene] = useState<RotationScene>(initialRotationScene),
    sceneRef = useRef(scene),
    drag = useRef<{ id: number; previous: { x: number; y: number } } | null>(null);
  const [captured, setCaptured] = useState(false);
  const commit = useCallback((next: RotationScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCaptured(false);
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const reset = useCallback(
    (index = 0) => {
      cancelDrag();
      commit(rotationPreset(index));
    },
    [cancelDrag, commit],
  );
  const editAngle = (key: keyof EulerAngles, value: number) => {
    cancelDrag();
    commit(changeRotationAngle(sceneRef.current, key, value));
  };
  const editPosition = (axis: keyof Vec3, value: number) => {
    cancelDrag();
    commit(setRotationPosition(sceneRef.current, axis, value));
  };
  const editSensitivity = (value: number) => {
    if (!Number.isFinite(value)) return;
    cancelDrag();
    commit({
      ...sceneRef.current,
      paused: true,
      sensitivity: Math.max(0.002, Math.min(0.02, value)),
    });
  };
  const setOrder = (order: RotationOrder) => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: true, order });
  };
  const togglePause = () => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const toggleDebug = () => {
    cancelDrag();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  };
  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const p = rotationPointFromEvent(event, size, true);
    if (!p) return;
    const s = sceneRef.current;
    const angles = applyMouseDrag(
      s.angles,
      p.x - active.previous.x,
      p.y - active.previous.y,
      s.sensitivity,
    );
    active.previous = p;
    commit({ ...s, angles, paused: true });
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 6 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const p = rotationPointFromEvent(event, size);
    if (!p) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: event.pointerId, previous: p };
    commit({ ...sceneRef.current, paused: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      setCaptured(true);
    } catch {
      drag.current = null;
      setCaptured(false);
    }
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelDrag();
      return;
    }
    moveDrag(event);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    moveDrag(event);
    cancelDrag();
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    if (key === "r") {
      event.preventDefault();
      if (!event.repeat) reset();
      return;
    }
    if (stage >= 7 && key === " ") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (stage >= 7 && key === "n") {
      event.preventDefault();
      if (!event.repeat && sceneRef.current.paused) commit(advanceRotation(sceneRef.current, 0.1));
      return;
    }
    if (stage >= 7 && key === "f") {
      event.preventDefault();
      if (!event.repeat) toggleDebug();
      return;
    }
    if (stage >= 4 && key === "o") {
      event.preventDefault();
      if (!event.repeat) setOrder(sceneRef.current.order === "xyz" ? "zyx" : "xyz");
      return;
    }
    const angleKeys: Record<string, [keyof EulerAngles, number]> = {
      w: ["pitch", 1],
      s: ["pitch", -1],
      a: ["yaw", -1],
      d: ["yaw", 1],
      q: ["roll", -1],
      e: ["roll", 1],
    };
    if (angleKeys[key] && stage >= 3) {
      const [axis, sign] = angleKeys[key];
      if (stage < 4 && axis !== "pitch") return;
      event.preventDefault();
      editAngle(axis, sceneRef.current.angles[axis] + (sign * 5 * Math.PI) / 180);
      return;
    }
    const delta: Record<string, Vec3> = {
      ArrowLeft: { x: -0.1, y: 0, z: 0 },
      ArrowRight: { x: 0.1, y: 0, z: 0 },
      ArrowUp: { x: 0, y: 0.1, z: 0 },
      ArrowDown: { x: 0, y: -0.1, z: 0 },
      PageUp: { x: 0, y: 0, z: 0.1 },
      PageDown: { x: 0, y: 0, z: -0.1 },
    };
    if (delta[event.key]) {
      event.preventDefault();
      cancelDrag();
      commit(moveRotationModel(sceneRef.current, delta[event.key]));
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
    commit(initialRotationScene());
  }, [mode, cancelDrag, commit]);
  useEffect(() => {
    // Resize releases capture, preserving model position and orientation.
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [size.width, size.height, size.dpr, cancelDrag, commit]);
  useEffect(() => {
    if (reducedMotion) {
      cancelDrag();
      commit({ ...sceneRef.current, paused: true });
    }
  }, [reducedMotion, cancelDrag, commit]);
  useEffect(() => {
    if (stage < 7 || scene.paused || reducedMotion) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      if (sceneRef.current.paused) return;
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      commit(advanceRotation(sceneRef.current, dt));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawRotationLab(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = rotationResults(scene, stage),
    debug = stage < 7 || scene.debug;
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Tam giác mẫu"
            value=""
            onChange={(e) => reset(Number(e.target.value))}
          >
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {["Mặc định", "Hai góc 90°", "Góc tổng quát", "Cắt near", "Lệch ra ngoài"].map(
              (name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            Model.{axis.toUpperCase()}
            <input
              type="range"
              aria-label={"Model." + axis.toUpperCase()}
              min={axis === "z" ? 0.1 : -4}
              max={axis === "z" ? 15 : 4}
              step=".1"
              value={scene.position[axis]}
              onChange={(e) => editPosition(axis, Number(e.target.value))}
            />
            <output>{scene.position[axis].toFixed(2)}</output>
          </label>
        ))}
        {(["pitch", "yaw", "roll"] as const)
          .filter((key) => (key === "pitch" ? stage >= 3 : stage >= 4))
          .map((key) => (
            <label key={key}>
              {key}
              <input
                type="range"
                aria-label={"Góc " + key}
                min="-180"
                max="180"
                step="1"
                value={(scene.angles[key] * 180) / Math.PI}
                onChange={(e) => editAngle(key, (Number(e.target.value) * Math.PI) / 180)}
              />
              <output>{((scene.angles[key] * 180) / Math.PI).toFixed(2)}°</output>
            </label>
          ))}
        {stage >= 4 && (
          <label>
            Rotation order
            <select
              aria-label="Rotation order"
              value={scene.order}
              onChange={(e) => setOrder(e.target.value as RotationOrder)}
            >
              <option value="xyz">X → Y → Z</option>
              <option value="zyx">Z → Y → X</option>
            </select>
          </label>
        )}
        {stage >= 6 && (
          <label>
            Mouse sensitivity
            <input
              aria-label="Mouse sensitivity"
              type="range"
              min=".002"
              max=".02"
              step=".001"
              value={scene.sensitivity}
              onChange={(e) => editSensitivity(Number(e.target.value))}
            />
            <output>{scene.sensitivity.toFixed(3)} rad/logical px</output>
          </label>
        )}
        {stage >= 7 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Tự quay" : "Tạm dừng"}
            </button>
            <button
              disabled={!scene.paused}
              onClick={() => commit(advanceRotation(sceneRef.current, 0.1))}
            >
              Tiến 0.1 s
            </button>
            <button onClick={toggleDebug} aria-pressed={scene.debug}>
              {scene.debug ? "Ẩn debug" : "Hiện debug"}
            </button>
          </>
        )}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(380px,58vw,560px)", touchAction: "none" }}
        tabIndex={0}
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
        aria-label="Tam giác 3D perspective và normal: kéo ngang yaw, dọc pitch, Q/E roll; O đổi rotation order"
      />
      <p>
        Camera nhìn +Z; object quay quanh centroid theo các trục world cố định. XYZ nghĩa là làm X
        trước, Y tiếp, Z cuối; không phải yaw/pitch quanh trục local đang quay. Kéo trong viewport
        từ bài 6: nhấn không đổi góc, mỗi logical pixel đổi sensitivity radian, thả nhận mẫu cuối.
        Q/E đổi roll 5° mỗi nấc. Pitch được wrap, không khóa ở ±89°; Euler vẫn có những tư thế mà
        hai trục điều khiển trùng hướng. Resize/HiDPI letterbox bảng logic, không thay vị trí world.{" "}
        {reducedMotion ? "Reduced motion: tự quay tắt, vẫn dùng step được." : ""}
      </p>
      {debug && (
        <LabReadout
          items={[
            { label: "model position / pivot", value: format(scene.position) },
            ...(stage >= 2
              ? [
                  { label: "local A", value: format(r.local.a) },
                  { label: "world A", value: format(r.world.a) },
                ]
              : []),
            ...(stage >= 3
              ? [
                  {
                    label: "pitch / yaw / roll",
                    value: [r.angles.pitch, r.angles.yaw, r.angles.roll]
                      .map((a) => ((a * 180) / Math.PI).toFixed(2) + "°")
                      .join(" / "),
                  },
                ]
              : []),
            ...(stage >= 4
              ? [
                  { label: "rotation order", value: scene.order.toUpperCase() },
                  { label: "order difference", value: r.orderDifference.toExponential(3) },
                ]
              : []),
            ...r.vertices.map((vertex, i) => ({
              label: "vertex " + ["A", "B", "C"][i],
              value: vertex.status,
            })),
            ...(stage >= 5 ? [{ label: "unit normal", value: format(r.normal) }] : []),
            ...(stage >= 6
              ? [{ label: "pointer capture", value: captured ? "đang kéo" : "đã nhả" }]
              : []),
            ...(stage >= 8
              ? [
                  { label: "edge-length error", value: r.edgeError.toExponential(2) },
                  { label: "round-trip error", value: r.roundTrip.toExponential(2) },
                  { label: "normal rotation error", value: r.normalError.toExponential(2) },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
