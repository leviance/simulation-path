"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";
import { INTEGRATOR_KINDS, type IntegratorKind } from "@/lib/labs/integrator-race";
import { advanceIntegratorBenchmark } from "@/lib/labs/integrator-benchmark";
import {
  advanceIntegratorFrame,
  editIntegratorLane,
  editIntegratorSetting,
  integratorPreset,
  integratorStage,
  makeIntegratorScene,
  requestIntegratorBenchmark,
  requestIntegratorFast,
  stepIntegratorScene,
  stopIntegratorJobs,
  type IntegratorScene,
  type IntegratorSetting,
  type IntegratorGraph,
} from "@/lib/labs/integrator-scene";
import {
  drawIntegratorRace,
  integratorHitMass,
  integratorPointFromEvent,
  integratorScreenToPosition,
} from "./integrator-race-view";
import { IntegratorReadout, IntegratorBenchmarkPanel } from "./integrator-readout";
import { useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const IntegratorControls = lazy(() => import("./integrator-controls"));

export default function IntegratorRaceLab({ mode }: { mode?: InteractiveLabMode }) {
  return <RaceScene key={mode ?? "integrator-benchmark"} mode={mode} />;
}
function RaceScene({ mode }: { mode?: InteractiveLabMode }) {
  const stage = integratorStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    reducedMotion = useReducedMotion();
  const [scene, setScene] = useState(() => makeIntegratorScene(stage)),
    sceneRef = useRef(scene);
  const [capturing, setCapturing] = useState(false);
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const commit = useCallback((next: IntegratorScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
    setCapturing(false);
  }, []);
  const stop = useCallback(() => {
    cancelDrag();
    commit(stopIntegratorJobs(sceneRef.current));
  }, [cancelDrag, commit]);
  const size = useCanvasSize(canvasRef, stop);
  usePauseOnReducedMotion(stop);
  const preset = useCallback(
    (index: number) => {
      cancelDrag();
      commit(integratorPreset(stage, index));
    },
    [stage, cancelDrag, commit],
  );
  const edit = useCallback(
    (key: IntegratorSetting, value: number) => {
      cancelDrag();
      commit(editIntegratorSetting(sceneRef.current, key, value));
    },
    [cancelDrag, commit],
  );
  const editLane = useCallback(
    (index: number, kind: IntegratorKind) => {
      cancelDrag();
      commit(editIntegratorLane(sceneRef.current, index, kind));
    },
    [cancelDrag, commit],
  );
  const setGraph = useCallback(
    (graph: IntegratorGraph) => {
      cancelDrag();
      commit({ ...sceneRef.current, graph, showBenchmark: false });
    },
    [cancelDrag, commit],
  );
  const toggleDebug = useCallback(() => {
    cancelDrag();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  }, [cancelDrag, commit]);
  const togglePause = useCallback(() => {
    cancelDrag();
    const current = sceneRef.current;
    if (current.fastRemaining > 0 || current.benchmark?.running) {
      commit(stopIntegratorJobs(current));
      return;
    }
    commit({ ...current, paused: reducedMotion || !!current.warning ? true : !current.paused });
  }, [cancelDrag, commit, reducedMotion]);
  const step = useCallback(() => {
    cancelDrag();
    commit(stepIntegratorScene(sceneRef.current));
  }, [cancelDrag, commit]);
  const fast = useCallback(() => {
    cancelDrag();
    commit(requestIntegratorFast(sceneRef.current));
  }, [cancelDrag, commit]);
  const benchmark = useCallback(() => {
    cancelDrag();
    commit(requestIntegratorBenchmark(sceneRef.current, performance.now()));
  }, [cancelDrag, commit]);
  const updateDrag = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = drag.current;
      if (!active || active.id !== event.pointerId) return;
      const point = integratorPointFromEvent(event, size);
      if (!point) return;
      commit(
        editIntegratorSetting(
          sceneRef.current,
          "position",
          integratorScreenToPosition(point.x - active.offset),
        ),
      );
    },
    [commit, size],
  );
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const point = integratorPointFromEvent(event, size);
    if (!point) return;
    const center = integratorHitMass(sceneRef.current, point);
    if (center === null) return;
    event.currentTarget.focus();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    drag.current = { id: event.pointerId, offset: point.x - center };
    setCapturing(true);
    updateDrag(event);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      cancelDrag();
      return;
    }
    updateDrag(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    updateDrag(event);
    cancelDrag();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const onCanvasBlur = (event: ReactFocusEvent<HTMLCanvasElement>) => {
    // Nút pause cần nhận đúng trạng thái trước cú click. Chỉ rời cả lab mới pause.
    if (event.currentTarget.parentElement?.contains(event.relatedTarget)) cancelDrag();
    else stop();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab" || event.repeat)
      return;
    const key = event.key.toLowerCase(),
      current = sceneRef.current;
    if (key === " ") togglePause();
    else if (key === "n") step();
    else if (key === "r") preset(0);
    else if (key === "arrowleft" || key === "arrowright")
      edit("position", current.initial.position + (key === "arrowleft" ? -0.1 : 0.1));
    else if (key === "arrowup" || key === "arrowdown")
      edit("stiffness", current.parameters.stiffness + (key === "arrowdown" ? -1 : 1));
    else if (key === "u" || key === "o")
      edit("velocity", current.initial.velocity + (key === "u" ? -0.25 : 0.25));
    else if (key === "m")
      edit("mass", current.parameters.mass >= 4 ? 0.5 : current.parameters.mass * 2);
    else if (stage >= 2 && (key === "[" || key === "]"))
      edit("dtIndex", current.dtIndex + (key === "[" ? -1 : 1));
    else if (stage >= 5 && ["1", "2", "3"].includes(key)) {
      const index = Number(key) - 1;
      editLane(index, INTEGRATOR_KINDS[(INTEGRATOR_KINDS.indexOf(current.kinds[index]) + 1) % 3]);
    } else if (stage >= 6 && key === "g")
      setGraph(
        current.graph === "position" ? "error" : current.graph === "error" ? "energy" : "position",
      );
    else if (stage >= 6 && key === "enter") fast();
    else if (stage >= 8 && key === "b") benchmark();
    else if (stage >= 8 && key === "f") toggleDebug();
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      cancelDrag();
    };
  }, [stop, cancelDrag]);
  const active =
    (!scene.paused && !reducedMotion) || scene.fastRemaining > 0 || !!scene.benchmark?.running;
  useEffect(() => {
    if (!active) return;
    let frame = 0,
      previous = performance.now(),
      disposed = false;
    const animate = (now: number) => {
      if (disposed) return;
      const current = sceneRef.current;
      if (current.paused && current.fastRemaining === 0 && !current.benchmark?.running) return;
      let next = current;
      if (current.benchmark?.running)
        next = {
          ...current,
          benchmark: advanceIntegratorBenchmark(current.benchmark, () => performance.now()),
        };
      else next = advanceIntegratorFrame(current, Math.max(0, (now - previous) / 1000));
      previous = now;
      commit(next);
      if (!disposed && (!next.paused || next.fastRemaining > 0 || next.benchmark?.running))
        frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [active, commit]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawIntegratorRace(context, size, scene);
  }, [scene, size]);
  return (
    <div className="lab-body">
      <Suspense fallback={<p role="status">Đang tải bộ điều khiển mô phỏng…</p>}>
        <IntegratorControls
          scene={scene}
          reducedMotion={reducedMotion}
          edit={edit}
          editLane={editLane}
          preset={preset}
          setGraph={setGraph}
          togglePause={togglePause}
          toggleDebug={toggleDebug}
          step={step}
          fast={fast}
          benchmark={benchmark}
          stop={stop}
        />
      </Suspense>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(500px,62vw,660px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Cuộc đua integrator: ba làn lò xo, khung trắng là nghiệm chính xác"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onBlur={onCanvasBlur}
      />
      <p>
        Kéo đúng khối để đặt x₀; giữ vị trí nắm, chỉ pointer bắt đầu được kéo. Mũi tên trái/phải:
        x₀; lên/xuống: k; U/O: v₀; M: mass; Space: pause; N: một bước.
        {scene.stage >= 2 && " [ / ]: dt."}
        {scene.stage >= 5 && " 1/2/3: đổi solver mỗi làn."}
        {scene.stage >= 6 && " Enter: tua 20 giây."}
        {scene.stage >= 8 && " B: benchmark; F: debug."} Tab rời Canvas. Đổi cấu hình sẽ khởi động
        lại cả ba làn để phép so vẫn công bằng.
      </p>
      {reducedMotion && (
        <p>Reduced motion: không tự chạy liên tục; vẫn dùng N, nút bước và các job hữu hạn.</p>
      )}
      {scene.warning && <p role="alert">{scene.warning}</p>}
      {(scene.stage < 8 || scene.debug) && (
        <IntegratorReadout scene={scene} capturing={capturing} />
      )}
      <IntegratorBenchmarkPanel scene={scene} />
    </div>
  );
}
