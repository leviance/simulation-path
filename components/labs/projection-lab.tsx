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
import { ProjectionGeometry } from "./projection-geometry";
import { ProjectionControls } from "./projection-controls";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const format = (p: Vec3) => "(" + [p.x, p.y, p.z].map((n) => n.toFixed(4)).join(", ") + ")";
export default function ProjectionLab({ mode }: { mode?: InteractiveLabMode }) {
  return <ProjectionScene key={mode ?? "projection-full"} mode={mode} />;
}

function ProjectionScene({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
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
  const pauseForEnvironment = useCallback(() => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [cancelDrag, commit]);
  const size = useCanvasSize(canvasRef, pauseForEnvironment);
  usePauseOnReducedMotion(pauseForEnvironment);
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
  const step = () => {
    cancelDrag();
    const s = sceneRef.current;
    if (stage < 6 || !s.paused) return;
    commit(advancePoint(s, 0.1));
  };
  const toggleDebug = () => {
    cancelDrag();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  };
  const editPoint = useCallback(
    (axis: keyof Vec3, value: number) => {
      cancelDrag();
      commit(changePoint(sceneRef.current, { ...sceneRef.current.point, [axis]: value }));
    },
    [cancelDrag, commit],
  );
  const editCamera = useCallback(
    (axis: keyof Vec3, value: number) => {
      cancelDrag();
      commit(changePointCamera(sceneRef.current, axis, value));
    },
    [cancelDrag, commit],
  );
  const editLens = useCallback(
    (key: keyof PointLens, value: number) => {
      cancelDrag();
      commit(changePointLens(sceneRef.current, key, value));
    },
    [cancelDrag, commit],
  );
  const editAspect = useCallback(
    (aspect: number) => {
      cancelDrag();
      commit({ ...sceneRef.current, paused: true, aspect });
    },
    [cancelDrag, commit],
  );
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
      if (!event.repeat) step();
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
      <ProjectionControls
        scene={scene}
        stage={stage}
        reducedMotion={reducedMotion}
        reset={reset}
        togglePause={togglePause}
        step={step}
        toggleDebug={toggleDebug}
        editPoint={editPoint}
        editCamera={editCamera}
        editLens={editLens}
        editAspect={editAspect}
      />
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
        giữ depth, giữ chỗ nắm, chỉ XY thay đổi. Từ bài 5, các khung 3D cùng kích thước nằm ở depth
        2/4/8/12; resize giữ bảng logic, Aspect thay đổi khung nhìn thật.{" "}
        {reducedMotion ? "Reduced motion: tự động bay bị tắt; vẫn có thể tiến từng bước." : ""}
      </p>
      {(stage === 3 || stage === 4) && <ProjectionGeometry scene={scene} />}
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
