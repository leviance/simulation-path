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
import {
  makeSpringScene,
  springStage,
  editSpringScene,
  presetSpringScene,
  stopSpringScene,
  stepSpringScene,
  requestSpringFast,
  advanceSpringFrame,
  beginSpringDrag,
  moveSpringDrag,
  endSpringDrag,
  cancelSpringDrag,
  nudgeSpringNode,
  type SpringSetting,
  type SpringScene,
} from "@/lib/labs/spring-scene";
import {
  springEventPoint,
  springInsideViewport,
  springWorldView,
  springScreenToWorld,
  springBoundedPointer,
  drawSpringCanvas,
} from "./spring-view";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const SpringControls = lazy(() =>
  import("./spring-controls").then((module) => ({ default: module.SpringControls })),
);
const SpringReadout = lazy(() =>
  import("./spring-readout").then((module) => ({ default: module.SpringReadout })),
);

export default function SpringChainLab({ mode }: { mode?: InteractiveLabMode }) {
  return <SpringTank key={mode ?? "spring-validation"} mode={mode} />;
}
function SpringTank({ mode }: { mode?: InteractiveLabMode }) {
  const stage = springStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    containerRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(() => makeSpringScene(stage)),
    sceneRef = useRef(scene);
  const ownerRef = useRef<{ id: number; time: number } | null>(null);
  const clearCapture = useCallback(() => {
    const owner = ownerRef.current;
    ownerRef.current = null;
    if (owner && canvasRef.current?.hasPointerCapture(owner.id))
      canvasRef.current.releasePointerCapture(owner.id);
  }, []);
  const commit = useCallback(
    (next: SpringScene) => {
      if (!next.drag?.active) clearCapture();
      sceneRef.current = next;
      setScene(next);
    },
    [clearCapture],
  );
  const stop = useCallback(() => {
    commit(stopSpringScene(cancelSpringDrag(sceneRef.current)));
  }, [commit]);
  const size = useCanvasSize(canvasRef, stop),
    reducedMotion = useReducedMotion();
  usePauseOnReducedMotion(stop);
  const edit = useCallback(
    (key: SpringSetting, value: number) => {
      commit(editSpringScene(cancelSpringDrag(sceneRef.current), key, value));
    },
    [commit],
  );
  const reset = useCallback(() => {
    commit(makeSpringScene(stage));
  }, [commit, stage]);
  const preset = useCallback(
    (value: number) => {
      commit(presetSpringScene(stage, value));
    },
    [commit, stage],
  );
  const step = useCallback(() => {
    commit(stepSpringScene(cancelSpringDrag(sceneRef.current)));
  }, [commit]);
  const togglePause = useCallback(() => {
    const current = sceneRef.current;
    const next = stopSpringScene(cancelSpringDrag(current));
    commit({
      ...next,
      paused: reducedMotion || current.fastRemaining > 0 ? true : !current.paused,
    });
  }, [commit, reducedMotion]);
  const fast = useCallback(() => {
    commit(requestSpringFast(cancelSpringDrag(sceneRef.current)));
  }, [commit]);
  const toggleDebug = useCallback(() => {
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  }, [commit]);
  useEffect(() => {
    let frame = 0,
      disposed = false,
      previous: number | null = null;
    const animate = (now: number) => {
      if (disposed) return;
      const current = sceneRef.current;
      if (!current.paused || current.fastRemaining > 0) {
        const seconds = previous === null ? 0 : Math.max(0, (now - previous) / 1000);
        commit(advanceSpringFrame(current, seconds));
      }
      previous = now;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearCapture();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [commit, clearCapture, stop]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawSpringCanvas(ctx, size, scene);
  }, [scene, size]);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0 || !event.isPrimary || ownerRef.current || stage < 6) return;
      const point = springEventPoint(event, size);
      if (!point || !springInsideViewport(point)) return;
      const current = sceneRef.current,
        view = springWorldView(current);
      const next = beginSpringDrag(current, springScreenToWorld(point, view), 9 / view.scale);
      if (!next) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        return;
      }
      event.preventDefault();
      event.currentTarget.focus();
      ownerRef.current = { id: event.pointerId, time: event.timeStamp };
      commit(next);
    },
    [commit, size, stage],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const owner = ownerRef.current;
      if (!owner || owner.id !== event.pointerId) return;
      if (!(event.buttons & 1)) {
        stop();
        return;
      }
      const point = springEventPoint(event, size);
      if (!point) return;
      const seconds = Math.max(0.001, (event.timeStamp - owner.time) / 1000);
      owner.time = event.timeStamp;
      commit(
        moveSpringDrag(sceneRef.current, springBoundedPointer(point, sceneRef.current), seconds),
      );
    },
    [commit, size, stop],
  );
  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const owner = ownerRef.current;
      if (!owner || owner.id !== event.pointerId || event.button !== 0) return;
      const point = springEventPoint(event, size);
      if (!point) {
        stop();
        return;
      }
      const seconds = Math.max(0.001, (event.timeStamp - owner.time) / 1000);
      const moved = moveSpringDrag(
        sceneRef.current,
        springBoundedPointer(point, sceneRef.current),
        seconds,
      );
      commit(endSpringDrag(moved));
    },
    [commit, size, stop],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current?.id === event.pointerId) stop();
    },
    [stop],
  );
  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current?.id === event.pointerId) stop();
    },
    [stop],
  );
  const onBlur = useCallback(
    (event: ReactFocusEvent<HTMLCanvasElement>) => {
      if (
        event.relatedTarget instanceof Node &&
        containerRef.current?.contains(event.relatedTarget)
      ) {
        if (ownerRef.current) commit(cancelSpringDrag(sceneRef.current));
      } else stop();
    },
    [commit, stop],
  );
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") return;
      const key = event.key.toLowerCase();
      const handled =
        ["r", "f"].includes(key) ||
        (stage >= 4 && [" ", "n"].includes(key)) ||
        (stage >= 6 &&
          ["arrowleft", "arrowright", "arrowup", "arrowdown", "escape"].includes(key)) ||
        (stage >= 8 && key === "enter");
      if (!handled) return;
      event.preventDefault();
      if (event.repeat) return;
      if (key === "r") reset();
      if (key === "f") toggleDebug();
      if (key === " ") togglePause();
      if (key === "n") step();
      if (key === "enter") fast();
      if (key === "escape") stop();
      const directions: Record<string, { x: number; y: number }> = {
        arrowleft: { x: -0.08, y: 0 },
        arrowright: { x: 0.08, y: 0 },
        arrowup: { x: 0, y: 0.08 },
        arrowdown: { x: 0, y: -0.08 },
      };
      if (directions[key])
        commit(nudgeSpringNode(cancelSpringDrag(sceneRef.current), directions[key]));
    },
    [commit, fast, reset, stage, step, stop, toggleDebug, togglePause],
  );
  return (
    <div ref={containerRef}>
      <Suspense fallback={<p role="status">Đang tải điều khiển chuỗi lò xo…</p>}>
        <SpringControls
          scene={scene}
          reducedMotion={reducedMotion}
          edit={edit}
          reset={reset}
          preset={preset}
          togglePause={togglePause}
          step={step}
          fast={fast}
          stop={stop}
          toggleDebug={toggleDebug}
        />
      </Suspense>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: 660 }}
        tabIndex={0}
        aria-label="Chuỗi lò xo 2D: kéo mass, quan sát dao động và năng lượng"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <p role="status" className="lab-hint">
        Space: pause; N: một bước; R: mặc định; F: debug. Từ bài 6, kéo mass hoặc chọn node và dùng
        mũi tên để dịch khối; Esc hủy kéo. Enter tua 20 giây ở bài cuối; Tab rời Canvas.{" "}
        {reducedMotion &&
          "Đang giảm chuyển động: chạy liên tục bị khóa; vẫn dùng được bước đơn và job hữu hạn."}{" "}
        {scene.message}
      </p>
      {scene.debug ? (
        <Suspense
          fallback={
            <LabReadout items={[{ label: "Trạng thái", value: "Đang tải số liệu chuỗi lò xo…" }]} />
          }
        >
          <SpringReadout scene={scene} />
        </Suspense>
      ) : (
        <LabReadout
          items={[
            {
              label: "Trạng thái",
              value: `${scene.paused ? "tạm dừng" : "đang chạy"} · t=${scene.elapsed.toFixed(3)} s`,
            },
          ]}
        />
      )}
    </div>
  );
}
