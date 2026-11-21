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
  measureDoubleDepth,
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
  flightDirection,
  stopFlight,
  type PointScene,
} from "@/lib/labs/projection-scene";
import { drawProjectionLab, projectionPointFromEvent } from "./projection-lab-view";
import { ProjectionGeometry } from "./projection-geometry";
import { ProjectionControls } from "./projection-controls";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const stageHint: Record<number, string> = {
  1: "Dịch sao thử sang phải, rồi đổi Z. Vì sao bước đầu chỉ thấy thay đổi theo X và Y?",
  2: "Đưa camera từ Z = 0 đến Z = 2. Tọa độ thế giới của sao giữ nguyên; độ sâu so với mắt đổi từ 4 thành 2. Bản vẽ XY vẫn chưa thể hiện điều đó.",
  3: "So sao mặc định với mẫu Xa gấp đôi. Bật mặt cắt XZ hoặc YZ bên dưới để nhìn hai tam giác đồng dạng.",
  4: "Giữ nguyên vị trí quan sát rồi tăng FOV. Đưa ống kính về ban đầu, lần này tiến camera. Hai thao tác có giống nhau đối với các sao ở độ sâu khác nhau không?",
  5: "Hạ Far xuống 8 rồi đưa về 16. Các sao xa biến mất và trở lại đúng vị trí vì danh sách tọa độ chưa từng đổi.",
  6: "Bấm vào khung hình, giữ W để tiến và S để lùi. Thả phím: các sao đứng lại ngay. Bạn cũng có thể bấm Tiến 0.1 s để xem một nhịp.",
  7: "Nắm gần mép sao thử rồi kéo. Nó không được giật vào giữa con trỏ; độ sâu so với camera phải giữ nguyên.",
  8: "Theo dõi ngôi sao màu hổ phách khi giữ W. Vì sao nó rời tâm ảnh còn ngôi sao đúng trên trục nhìn thì không? Nhấn R để bay lại từ đúng bầu trời ban đầu.",
};
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
    commit(stopFlight(sceneRef.current));
  }, [cancelDrag, commit]);
  const size = useCanvasSize(canvasRef, pauseForEnvironment);
  usePauseOnReducedMotion(pauseForEnvironment);
  const reset = useCallback(
    (index?: number) => {
      cancelDrag();
      const next = pointPreset(index ?? 0);
      if (index !== undefined) next.debug = true;
      commit(next);
    },
    [cancelDrag, commit],
  );
  const togglePause = () => {
    cancelDrag();
    const current = sceneRef.current;
    commit({ ...stopFlight(current), paused: reducedMotion || !current.paused });
  };
  const step = () => {
    cancelDrag();
    const s = sceneRef.current;
    if (stage < 6 || !s.paused || s.forwardHeld || s.backwardHeld) return;
    commit(advancePoint(s, 0.1));
  };
  const toggleDebug = () => {
    cancelDrag();
    commit({ ...stopFlight(sceneRef.current), debug: !sceneRef.current.debug });
  };
  const toggleMeasure = () => {
    cancelDrag();
    const current = sceneRef.current;
    commit({
      ...stopFlight(current),
      measureDepth: !(current.measureDepth && current.debug),
      debug: true,
      paused: true,
    });
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
      commit({ ...stopFlight(sceneRef.current), aspect });
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
      (stage >= 8 && !s.debug) ||
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
    commit(stopFlight(s));
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
    if (stage >= 6 && (key === "w" || key === "s")) {
      event.preventDefault();
      if (event.repeat) return;
      cancelDrag();
      const current = sceneRef.current;
      if (reducedMotion) {
        commit(advancePoint(stopFlight(current), 0.1, key === "w" ? 1 : -1));
        return;
      }
      commit({ ...current, paused: true, [key === "w" ? "forwardHeld" : "backwardHeld"]: true });
      return;
    }
    if (stage >= 2 && (key === "j" || key === "l")) {
      event.preventDefault();
      editCamera("z", sceneRef.current.camera.position.z + (key === "j" ? -0.1 : 0.1));
      return;
    }
    if (stage >= 8 && key === "m") {
      event.preventDefault();
      if (!event.repeat) toggleMeasure();
      return;
    }
    if (stage >= 8 && key === "f") {
      event.preventDefault();
      if (!event.repeat) toggleDebug();
      return;
    }
    const deltas: Record<string, Vec3> = {
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
  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (stage < 6 || (key !== "w" && key !== "s")) return;
    event.preventDefault();
    const field = key === "w" ? "forwardHeld" : "backwardHeld";
    if (sceneRef.current[field]) commit({ ...sceneRef.current, [field]: false });
  };
  useEffect(() => {
    const pause = () => {
      cancelDrag();
      commit(stopFlight(sceneRef.current));
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
    if (stage < 6 || flightDirection(sceneRef.current) === 0 || reducedMotion) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const current = sceneRef.current;
      const direction = flightDirection(current);
      if (direction === 0) return;
      const next = advancePoint(current, (now - previous) / 1000, direction);
      previous = now;
      if (next !== current) commit(next);
      if (flightDirection(next) !== 0) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, scene.forwardHeld, scene.backwardHeld, reducedMotion, commit]);
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
  const showRuler = stage === 8 && debug && scene.measureDepth;
  const reading = showRuler
    ? measureDoubleDepth(scene.point, scene.camera, scene.lens, viewportFor(scene))
    : null;
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
        toggleMeasure={toggleMeasure}
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
        onKeyUp={onKeyUp}
        onBlur={() => {
          cancelDrag();
          commit(stopFlight(sceneRef.current));
        }}
        aria-label="Bay xuyên trường sao: W/S tiến hoặc lùi, thả phím để dừng; phím mũi tên và Q/E dịch sao thử"
      />
      {stage >= 6 && (
        <p data-testid="flight-status">
          Camera Z = {scene.camera.position.z.toFixed(2)} / 12 ·{" "}
          {flightDirection(scene) === 0
            ? "Đang dừng"
            : flightDirection(scene) > 0
              ? "Đang tiến"
              : "Đang lùi"}
          .{scene.camera.position.z >= 12 && " Đã tới cuối vùng sao. Giữ S để quay về."}
        </p>
      )}
      <p>
        {stageHint[stage]}{" "}
        {stage === 1 &&
          "Trong Canvas, bấm vào hình để dùng phím mũi tên và Q/E; mỗi lần nhấn dịch 0.1 đơn vị. Trong bản SDL, giữ phím để đi liên tục."}
        {stage >= 6 &&
          reducedMotion &&
          " Bạn đang bật giảm chuyển động: nhấn W hoặc S để nhích từng bước, không tự bay."}
      </p>
      {(stage === 3 || stage === 4) && <ProjectionGeometry scene={scene} />}
      {showRuler && (
        <p data-testid="depth-measurement">
          {reading
            ? `Từ tâm ảnh đến A: ${reading.firstOffset.toFixed(2)} px (Z = ${r.cameraPoint.z.toFixed(2)}). Đến vòng B: ${reading.secondOffset.toFixed(2)} px (Z = ${(2 * r.cameraPoint.z).toFixed(2)}). Chỉ độ sâu thay đổi; vòng B không phải một đốm sáng thứ hai.`
            : "Không đo được: cả A và B phải nằm trong vùng nhìn. Chọn điểm mặc định hoặc giảm độ sâu rồi thử lại."}
        </p>
      )}
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
