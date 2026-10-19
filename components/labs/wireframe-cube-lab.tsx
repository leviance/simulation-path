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
import type { EulerAngles } from "@/lib/labs/rotation3d";
import { CUBE_EDGES, hasValidCubeTopology } from "@/lib/labs/wireframe-cube";
import {
  initialCubeScene,
  cubeStage,
  cubePreset,
  cubeResults,
  cubeDirection,
  changeCubeAngle,
  setCubePosition,
  moveCube,
  zoomCube,
  dragCube,
  advanceCube,
  type CubeScene,
} from "@/lib/labs/wireframe-cube-scene";
import { drawCubeLab, cubePointFromEvent } from "./wireframe-cube-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const format = (p: Vec3) => "(" + [p.x, p.y, p.z].map((x) => x.toFixed(3)).join(", ") + ")";
export default function WireframeCubeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    stage = cubeStage(mode);
  const [scene, setScene] = useState<CubeScene>(initialCubeScene),
    sceneRef = useRef(scene);
  const drag = useRef<{ id: number; previous: { x: number; y: number } } | null>(null);
  const keys = useRef(new Set<string>());
  const [moving, setMoving] = useState(false),
    [captured, setCaptured] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState(0);
  const commit = useCallback((next: CubeScene) => {
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
  const stopInput = useCallback(() => {
    keys.current.clear();
    setMoving(false);
    cancelDrag();
  }, [cancelDrag]);
  const reset = useCallback(
    (index = 0) => {
      stopInput();
      setSelectedVertex(0);
      commit(cubePreset(index));
    },
    [stopInput, commit],
  );
  const editAngle = (axis: keyof EulerAngles, value: number) => {
    stopInput();
    commit(changeCubeAngle(sceneRef.current, axis, value));
  };
  const editPosition = (axis: keyof Vec3, value: number) => {
    stopInput();
    commit(setCubePosition(sceneRef.current, axis, value));
  };
  const editScale = (value: number) => {
    if (!Number.isFinite(value)) return;
    stopInput();
    commit({ ...sceneRef.current, paused: true, halfExtent: Math.max(0.5, Math.min(2, value)) });
  };
  const editSensitivity = (value: number) => {
    if (!Number.isFinite(value)) return;
    stopInput();
    commit({
      ...sceneRef.current,
      paused: true,
      sensitivity: Math.max(0.002, Math.min(0.02, value)),
    });
  };
  const toggleProjection = () => {
    stopInput();
    const s = sceneRef.current;
    commit({
      ...s,
      paused: true,
      projection: s.projection === "perspective" ? "orthographic" : "perspective",
    });
  };
  const togglePause = () => {
    stopInput();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const toggleDebug = () => {
    stopInput();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  };
  const zoom = (steps: number) => {
    stopInput();
    commit(zoomCube(sceneRef.current, steps));
  };
  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const point = cubePointFromEvent(event, size, true);
    if (!point) return;
    commit(dragCube(sceneRef.current, point.x - active.previous.x, point.y - active.previous.y));
    active.previous = point;
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 5 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const point = cubePointFromEvent(event, size);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    keys.current.clear();
    setMoving(false);
    drag.current = { id: event.pointerId, previous: point };
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
    if (stage >= 5 && ["w", "a", "s", "d", "q", "e"].includes(key)) {
      event.preventDefault();
      cancelDrag();
      keys.current.add(key);
      setMoving(true);
      commit({ ...sceneRef.current, paused: true });
      return;
    }
    if (key === "r") {
      event.preventDefault();
      if (!event.repeat) reset();
      return;
    }
    if (stage >= 4 && key === "p") {
      event.preventDefault();
      if (!event.repeat) toggleProjection();
      return;
    }
    if (stage >= 5 && (key === "+" || key === "=" || key === "-")) {
      event.preventDefault();
      zoom(key === "-" ? -1 : 1);
      return;
    }
    if (stage >= 6 && key === " ") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (stage >= 6 && key === "n") {
      event.preventDefault();
      if (!event.repeat && sceneRef.current.paused) commit(advanceCube(sceneRef.current, 0.1));
      return;
    }
    if (stage >= 6 && key === "f") {
      event.preventDefault();
      if (!event.repeat) toggleDebug();
      return;
    }
    if (stage >= 6 && key === "c") {
      event.preventDefault();
      if (!event.repeat) {
        stopInput();
        commit({ ...sceneRef.current, depthCue: !sceneRef.current.depthCue });
      }
      return;
    }
    if (stage >= 3 && key === "o") {
      event.preventDefault();
      if (!event.repeat) {
        stopInput();
        commit({
          ...sceneRef.current,
          paused: true,
          order: sceneRef.current.order === "xyz" ? "zyx" : "xyz",
        });
      }
      return;
    }
    const angleKeys: Record<string, [keyof EulerAngles, number]> = {
      ArrowUp: ["pitch", 1],
      ArrowDown: ["pitch", -1],
      ArrowLeft: ["yaw", -1],
      ArrowRight: ["yaw", 1],
      PageUp: ["roll", 1],
      PageDown: ["roll", -1],
    };
    if (stage >= 3 && angleKeys[event.key]) {
      event.preventDefault();
      const [axis, sign] = angleKeys[event.key];
      editAngle(axis, sceneRef.current.angles[axis] + (sign * 5 * Math.PI) / 180);
    }
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (!keys.current.has(key)) return;
    event.preventDefault();
    keys.current.delete(key);
    setMoving(keys.current.size > 0);
  };
  useEffect(() => {
    const pause = () => {
      stopInput();
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
      stopInput();
    };
  }, [stopInput, commit]);
  useEffect(() => {
    stopInput();
    commit(initialCubeScene());
  }, [mode, stopInput, commit]);
  useEffect(() => {
    stopInput();
    commit({ ...sceneRef.current, paused: true });
  }, [size.width, size.height, size.dpr, stopInput, commit]);
  useEffect(() => {
    if (reducedMotion) {
      stopInput();
      commit({ ...sceneRef.current, paused: true });
    }
  }, [reducedMotion, stopInput, commit]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (stage < 5 || !canvas) return;
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        !cubePointFromEvent(
          { ...event, clientX: event.clientX, clientY: event.clientY, currentTarget: canvas },
          size,
        )
      )
        return;
      event.preventDefault();
      stopInput();
      const unit = event.deltaMode === 1 ? 3 : event.deltaMode === 2 ? 1 : 100;
      commit(zoomCube(sceneRef.current, -event.deltaY / unit));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [stage, size, stopInput, commit]);
  useEffect(() => {
    if (stage < 5 || (!moving && (stage < 6 || scene.paused || reducedMotion))) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      let next = sceneRef.current;
      if (keys.current.size > 0) next = moveCube(next, cubeDirection(keys.current), dt);
      else if (stage >= 6 && !next.paused && !reducedMotion) next = advanceCube(next, dt);
      if (next !== sceneRef.current) commit(next);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, moving, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCubeLab(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = cubeResults(scene, stage),
    debug = stage < 6 || scene.debug;
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select aria-label="Cube mẫu" value="" onChange={(e) => reset(Number(e.target.value))}>
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {["Mặc định", "Nhìn chính diện", "Ở xa", "Cắt near", "Lệch khỏi khung"].map(
              (name, i) => (
                <option value={i} key={i}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Half extent
          <input
            aria-label="Half extent"
            type="range"
            min=".5"
            max="2"
            step=".1"
            value={scene.halfExtent}
            onChange={(e) => editScale(Number(e.target.value))}
          />
          <output>{scene.halfExtent.toFixed(1)}</output>
        </label>
        <label>
          Vertex index
          <select
            aria-label="Vertex index"
            value={selectedVertex}
            onChange={(e) => setSelectedVertex(Number(e.target.value))}
          >
            {r.local.map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            Model.{axis.toUpperCase()}
            <input
              aria-label={"Model." + axis.toUpperCase()}
              type="range"
              min={axis === "z" ? 0.1 : -6}
              max={axis === "z" ? 15 : 6}
              step=".1"
              value={scene.position[axis]}
              onChange={(e) => editPosition(axis, Number(e.target.value))}
            />
            <output>{scene.position[axis].toFixed(2)}</output>
          </label>
        ))}
        {stage >= 3 &&
          (["pitch", "yaw", "roll"] as const).map((axis) => (
            <label key={axis}>
              {axis}
              <input
                aria-label={"Góc " + axis}
                type="range"
                min="-180"
                max="180"
                step="1"
                value={(scene.angles[axis] * 180) / Math.PI}
                onChange={(e) => editAngle(axis, (Number(e.target.value) * Math.PI) / 180)}
              />
              <output>{((scene.angles[axis] * 180) / Math.PI).toFixed(1)}°</output>
            </label>
          ))}
        {stage >= 4 && <button onClick={toggleProjection}>Phép chiếu: {scene.projection}</button>}
        {stage >= 5 && (
          <>
            <button onClick={() => zoom(-1)}>Thu nhỏ</button>
            <button onClick={() => zoom(1)}>Phóng to</button>
            <label>
              Sensitivity
              <input
                aria-label="Sensitivity"
                type="range"
                min=".002"
                max=".02"
                step=".001"
                value={scene.sensitivity}
                onChange={(e) => editSensitivity(Number(e.target.value))}
              />
              <output>{scene.sensitivity.toFixed(3)}</output>
            </label>
          </>
        )}
        {stage >= 6 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Tự quay" : "Tạm dừng"}
            </button>
            <button
              disabled={!scene.paused}
              onClick={() => commit(advanceCube(sceneRef.current, 0.1))}
            >
              Tiến 0.1 s
            </button>
            <button onClick={toggleDebug} aria-pressed={scene.debug}>
              {scene.debug ? "Ẩn debug" : "Hiện debug"}
            </button>
            <label className="check">
              <input
                aria-label="Depth cue"
                type="checkbox"
                checked={scene.depthCue}
                onChange={(e) => {
                  stopInput();
                  commit({ ...sceneRef.current, depthCue: e.target.checked });
                }}
              />
              Depth cue
            </label>
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
        onKeyUp={onKeyUp}
        onBlur={() => {
          stopInput();
          commit({ ...sceneRef.current, paused: true });
        }}
        aria-label="Cube wireframe 3D: kéo chuột xoay, WASD/QE di chuyển, wheel zoom, P đổi phép chiếu"
      />
      <p>
        Camera nhìn +Z, Y hướng lên. WASD/QE dịch chuyển theo trục world (W/S: +Z/−Z, A/D: −X/+X,
        Q/E: −Y/+Y); phím mũi tên đổi pitch/yaw, PageUp/Down đổi roll. P đổi phép chiếu, +/− hoặc
        wheel đổi độ phóng đại. R đặt lại, O đổi thứ tự XYZ/ZYX theo trục world cố định. Space tạm
        dừng/tự quay, N tiến 0.1 s, F ẩn debug. Đặt focus vào Canvas để dùng phím; Tab vẫn chuyển
        focus bình thường.{" "}
        {reducedMotion
          ? "Reduced motion: tự quay tắt; vẫn có thể tự di chuyển và tiến từng bước."
          : ""}
      </p>
      {debug && (
        <LabReadout
          items={[
            {
              label: "topology",
              value: hasValidCubeTopology() ? "8 vertex · 12 edge · degree 3" : "không hợp lệ",
            },
            { label: "local vertex " + selectedVertex, value: format(r.local[selectedVertex]) },
            { label: "world vertex " + selectedVertex, value: format(r.world[selectedVertex]) },
            { label: "vertex status", value: r.vertices[selectedVertex].status },
            { label: "projection cache", value: r.projectionCount + " kết quả / frame" },
            ...(stage >= 2
              ? [
                  { label: "visible edges", value: r.edges.length + " / 12" },
                  { label: "extra clip projections", value: String(r.extraProjections) },
                  {
                    label: "edge list",
                    value: CUBE_EDGES.map((e) => e.from + "–" + e.to).join(", "),
                  },
                ]
              : []),
            ...(stage >= 3 ? [{ label: "rotation order", value: scene.order.toUpperCase() }] : []),
            ...(stage >= 4 ? [{ label: "projection", value: r.active.projection }] : []),
            ...(stage >= 5
              ? [
                  { label: "zoom", value: scene.zoom.toFixed(2) + "×" },
                  { label: "model position", value: format(scene.position) },
                  { label: "pointer capture", value: captured ? "đang kéo" : "đã nhả" },
                ]
              : []),
            ...(stage >= 6
              ? [
                  {
                    label: "far → near",
                    value: r.edges
                      .map((e) => "#" + e.edgeIndex + " z=" + e.averageDepth.toFixed(2))
                      .join(" → "),
                  },
                ]
              : []),
            ...(stage >= 7
              ? [
                  { label: "max edge error", value: r.edgeError.toExponential(2) },
                  { label: "round-trip error", value: r.roundTrip.toExponential(2) },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
