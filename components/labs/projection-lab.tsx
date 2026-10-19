"use client";
import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Vec3 } from "@/lib/labs/normal";
import {
  screenToCameraAtDepth,
  cameraToWorld,
  projectionRoundTripError,
  type PointLens,
} from "@/lib/labs/projection-point";
import {
  initialPointScene,
  pointStage,
  pointPreset,
  viewportFor,
  pointDisplay,
  changePoint,
  movePoint,
  changePointCamera,
  changePointLens,
  advancePoint,
  type PointScene,
} from "@/lib/labs/projection-scene";
import { drawProjectionLab, projectionPointFromEvent } from "./projection-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const format = (p: Vec3) => "(" + [p.x, p.y, p.z].map((n) => n.toFixed(4)).join(", ") + ")";
export default function ProjectionLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    stage = pointStage(mode);
  const [scene, setScene] = useState<PointScene>(initialPointScene),
    sceneRef = useRef(scene);
  const drag = useRef<{ id: number; depth: number; offset: { x: number; y: number } } | null>(null);
  const commit = useCallback((next: PointScene) => {
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
      commit(pointPreset(index));
    },
    [cancelDrag, commit],
  );
  const togglePause = () => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: reducedMotion ? true : !sceneRef.current.paused });
  };
  const toggleDebug = () => {
    cancelDrag();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  };
  const editPoint = (axis: keyof Vec3, value: number) => {
    cancelDrag();
    commit(changePoint(sceneRef.current, { ...sceneRef.current.point, [axis]: value }));
  };
  const editCamera = (axis: keyof Vec3, value: number) => {
    cancelDrag();
    commit(changePointCamera(sceneRef.current, axis, value));
  };
  const editLens = (key: keyof PointLens, value: number) => {
    cancelDrag();
    commit(changePointLens(sceneRef.current, key, value));
  };
  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const mouse = projectionPointFromEvent(event, size);
    if (!mouse) return;
    const s = sceneRef.current,
      target = { x: mouse.x - active.offset.x, y: mouse.y - active.offset.y };
    const p = screenToCameraAtDepth(target, active.depth, s.lens, viewportFor(s));
    if (p) commit(changePoint(s, cameraToWorld(p, s.camera)));
  };
  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 7 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const s = sceneRef.current,
      mouse = projectionPointFromEvent(event, size),
      r = pointDisplay(s, stage),
      v = viewportFor(s);
    if (
      !mouse ||
      r.status !== "visible" ||
      !r.screen ||
      mouse.x < v.x ||
      mouse.x > v.x + v.width ||
      mouse.y < v.y ||
      mouse.y > v.y + v.height ||
      Math.hypot(mouse.x - r.screen.x, mouse.y - r.screen.y) > 24
    )
      return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = {
      id: event.pointerId,
      depth: r.cameraPoint.z,
      offset: { x: mouse.x - r.screen.x, y: mouse.y - r.screen.y },
    };
    commit({ ...s, paused: true });
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
    if (stage >= 6 && key === " ") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (stage >= 6 && key === "n") {
      event.preventDefault();
      if (!event.repeat && sceneRef.current.paused) commit(advancePoint(sceneRef.current, 0.1));
      return;
    }
    if (stage >= 8 && key === "f") {
      event.preventDefault();
      if (!event.repeat) toggleDebug();
      return;
    }
    const deltas: Record<string, Vec3> = {
      a: { x: -0.1, y: 0, z: 0 },
      d: { x: 0.1, y: 0, z: 0 },
      w: { x: 0, y: 0.1, z: 0 },
      s: { x: 0, y: -0.1, z: 0 },
      q: { x: 0, y: 0, z: -0.1 },
      e: { x: 0, y: 0, z: 0.1 },
      arrowleft: { x: -0.1, y: 0, z: 0 },
      arrowright: { x: 0.1, y: 0, z: 0 },
      arrowup: { x: 0, y: 0.1, z: 0 },
      arrowdown: { x: 0, y: -0.1, z: 0 },
    };
    if (deltas[key]) {
      event.preventDefault();
      cancelDrag();
      commit(movePoint(sceneRef.current, deltas[key]));
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
    commit(initialPointScene());
  }, [mode, cancelDrag, commit]);
  useEffect(() => {
    // Resize releases capture, preserving world point and selected viewport.
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
      commit(advancePoint(sceneRef.current, dt));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawProjectionLab(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = pointDisplay(scene, stage),
    error =
      stage >= 8
        ? projectionRoundTripError(scene.point, scene.camera, scene.lens, viewportFor(scene))
        : null;
  const debug = stage < 8 || scene.debug;
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select aria-label="Điểm mẫu" value="" onChange={(e) => reset(Number(e.target.value))}>
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {["Mặc định", "Xa gấp đôi", "Trước near", "Sau camera", "Vượt far", "Ngoài khung"].map(
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
            Point.{axis.toUpperCase()}
            <input
              type="range"
              aria-label={`Point.${axis.toUpperCase()}`}
              min={axis === "z" ? -2 : -6}
              max={axis === "z" ? 20 : 6}
              step=".05"
              value={scene.point[axis]}
              onChange={(e) => editPoint(axis, Number(e.target.value))}
            />
            <output>{scene.point[axis].toFixed(3)}</output>
          </label>
        ))}
        {stage >= 2 &&
          (["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              Camera.{axis.toUpperCase()}
              <input
                type="range"
                aria-label={`Camera.${axis.toUpperCase()}`}
                min="-2"
                max="2"
                step=".1"
                value={scene.camera.position[axis]}
                onChange={(e) => editCamera(axis, Number(e.target.value))}
              />
              <output>{scene.camera.position[axis].toFixed(2)}</output>
            </label>
          ))}
        {stage >= 4 && (
          <>
            <label>
              Vertical FOV
              <input
                type="range"
                aria-label="Vertical FOV"
                min="25"
                max="110"
                step="1"
                value={(scene.lens.verticalFovRadians * 180) / Math.PI}
                onChange={(e) =>
                  editLens("verticalFovRadians", (Number(e.target.value) * Math.PI) / 180)
                }
              />
              <output>{((scene.lens.verticalFovRadians * 180) / Math.PI).toFixed(0)}°</output>
            </label>
            <label>
              Aspect
              <select
                value={scene.aspect}
                onChange={(e) => {
                  cancelDrag();
                  commit({ ...sceneRef.current, paused: true, aspect: Number(e.target.value) });
                }}
              >
                <option value="0">16:9</option>
                <option value="1">4:3</option>
                <option value="2">1:1</option>
              </select>
            </label>
          </>
        )}
        {stage >= 5 &&
          (["nearPlane", "farPlane"] as const).map((key) => (
            <label key={key}>
              {key === "nearPlane" ? "Near plane" : "Far plane"}
              <input
                type="range"
                aria-label={key === "nearPlane" ? "Near plane" : "Far plane"}
                min={key === "nearPlane" ? 0.1 : 8}
                max={key === "nearPlane" ? 2 : 24}
                step=".1"
                value={scene.lens[key]}
                onChange={(e) => editLens(key, Number(e.target.value))}
              />
              <output>{scene.lens[key].toFixed(2)}</output>
            </label>
          ))}
        {stage >= 6 && (
          <>
            <button onClick={togglePause} disabled={reducedMotion}>
              {scene.paused ? "Cho điểm bay" : "Tạm dừng"}
            </button>
            <button
              disabled={!scene.paused}
              onClick={() => commit(advancePoint(sceneRef.current, 0.1))}
            >
              Tiến 0.1 s
            </button>
          </>
        )}
        {stage >= 8 && (
          <button aria-pressed={scene.debug} onClick={toggleDebug}>
            {scene.debug ? "Ẩn debug" : "Hiện debug"}
          </button>
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
        aria-label="Điểm sáng 3D: WASD đổi XY, Q/E đổi depth; từ bài 7 kéo marker tại depth cố định"
      />
      <p>
        Camera nhìn theo +Z; Y hướng lên. WASD/QE trong Canvas dịch từng nấc 0.1 world; ứng dụng SDL
        dùng trạng thái phím và delta time để di chuyển liên tục. Từ bài 7, nhấn gần marker rồi kéo:
        giữ depth, giữ chỗ nắm, chỉ XY thay đổi. Các khung 3D cùng kích thước ở depth 2/4/8/12;
        resize giữ bảng logic, Aspect thay đổi khung nhìn thật.{" "}
        {reducedMotion ? "Reduced motion: tự động bay bị tắt; vẫn có thể tiến từng bước." : ""}
      </p>
      {debug && (
        <LabReadout
          items={[
            { label: "world point", value: format(scene.point) },
            ...(stage >= 2 ? [{ label: "camera point", value: format(r.cameraPoint) }] : []),
            ...(stage >= 3
              ? [
                  {
                    label: "NDC",
                    value: r.ndc
                      ? "(" + r.ndc.x.toFixed(4) + ", " + r.ndc.y.toFixed(4) + ")"
                      : "Không xác định",
                  },
                  {
                    label: "pixel",
                    value: r.screen
                      ? "(" + r.screen.x.toFixed(2) + ", " + r.screen.y.toFixed(2) + ")"
                      : "Không xác định",
                  },
                ]
              : []),
            ...(stage >= 5 ? [{ label: "trạng thái", value: r.status }] : []),
            ...(stage >= 6 ? [{ label: "elapsed", value: scene.elapsed.toFixed(3) + " s" }] : []),
            ...(stage >= 8
              ? [
                  {
                    label: "round-trip error",
                    value: error === null ? "Không xác định" : error.toExponential(2),
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  );
}
