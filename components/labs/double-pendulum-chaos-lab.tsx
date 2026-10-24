"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";
import {
  makeChaosScene,
  chaosStage,
  resetChaos,
  editChaos,
  chooseChaosPreset,
  stopChaos,
  singleChaosStep,
  requestChaosFast,
  advanceChaosFrame,
  beginChaosDrag,
  moveChaosDrag,
  endChaosDrag,
  type ChaosSetting,
  type ChaosPreset,
  type ChaosScene,
} from "@/lib/labs/chaos-scene";
import {
  chaosEventPoint,
  chaosWorldView,
  chaosScreenToWorld,
  chaosInPrimaryPane,
  drawChaosCanvas,
} from "./chaos-view";
import { useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import { ChaosControls } from "./chaos-controls";
import { ChaosReadout } from "./chaos-readout";
import type { InteractiveLabMode } from "./types";

export default function DoublePendulumChaosLab({ mode }: { mode?: InteractiveLabMode }) {
  return <ChaosTank key={mode ?? "chaos-validation"} mode={mode} />;
}
function ChaosTank({ mode }: { mode?: InteractiveLabMode }) {
  const stage = chaosStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    containerRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(() => makeChaosScene(stage)),
    sceneRef = useRef(scene);
  const ownerRef = useRef<number | null>(null);
  const clearCapture = useCallback(() => {
    const owner = ownerRef.current;
    ownerRef.current = null;
    if (owner !== null && canvasRef.current?.hasPointerCapture(owner))
      canvasRef.current.releasePointerCapture(owner);
  }, []);
  const commit = useCallback(
    (next: ChaosScene) => {
      if (next.dragOffset === null) clearCapture();
      sceneRef.current = next;
      setScene(next);
    },
    [clearCapture],
  );
  const stop = useCallback(() => commit(stopChaos(sceneRef.current)), [commit]);
  const size = useCanvasSize(canvasRef, stop),
    reducedMotion = useReducedMotion();
  usePauseOnReducedMotion(stop);
  const reset = useCallback(() => commit(resetChaos(sceneRef.current)), [commit]);
  const defaults = useCallback(() => commit(makeChaosScene(stage)), [commit, stage]);
  const edit = useCallback(
    (key: ChaosSetting, value: number) => commit(editChaos(sceneRef.current, key, value)),
    [commit],
  );
  const preset = useCallback(
    (p: ChaosPreset) => commit(chooseChaosPreset(sceneRef.current, p)),
    [commit],
  );
  const step = useCallback(() => commit(singleChaosStep(sceneRef.current)), [commit]);
  const togglePause = useCallback(() => {
    const current = sceneRef.current,
      next = stopChaos(current);
    commit({
      ...next,
      paused: reducedMotion || current.fastRemaining > 0 ? true : !current.paused,
    });
  }, [commit, reducedMotion]);
  const fast = useCallback(
    () => commit(requestChaosFast(sceneRef.current, stage >= 7 ? 30 : 10)),
    [commit, stage],
  );
  const shortRun = useCallback(() => commit(requestChaosFast(sceneRef.current, 10)), [commit]);
  const toggleDebug = useCallback(
    () => commit({ ...endChaosDrag(sceneRef.current), debug: !sceneRef.current.debug }),
    [commit],
  );
  useEffect(() => {
    let frame = 0,
      disposed = false,
      previous: number | null = null;
    const animate = (now: number) => {
      if (disposed) return;
      const current = sceneRef.current;
      if (!current.paused || current.fastRemaining > 0)
        commit(
          advanceChaosFrame(current, previous === null ? 0 : Math.max(0, (now - previous) / 1000)),
        );
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
  }, [commit, stop, clearCapture]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawChaosCanvas(context, size, scene);
  }, [scene, size]);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (stage < 7 || event.button !== 0 || !event.isPrimary || ownerRef.current !== null) return;
      const point = chaosEventPoint(event, size);
      if (!point || !chaosInPrimaryPane(point)) return;
      const view = chaosWorldView(sceneRef.current);
      const candidate = beginChaosDrag(
        sceneRef.current,
        chaosScreenToWorld(point, view),
        14 / view.scale,
      );
      if (!candidate) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        return;
      }
      event.preventDefault();
      event.currentTarget.focus();
      ownerRef.current = event.pointerId;
      commit(candidate);
    },
    [stage, size, commit],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current !== event.pointerId) return;
      if (!(event.buttons & 1)) {
        stop();
        return;
      }
      const point = chaosEventPoint(event, size);
      if (point)
        commit(
          moveChaosDrag(
            sceneRef.current,
            chaosScreenToWorld(point, chaosWorldView(sceneRef.current)),
          ),
        );
    },
    [size, stop, commit],
  );
  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current !== event.pointerId || event.button !== 0) return;
      const point = chaosEventPoint(event, size);
      if (!point) {
        stop();
        return;
      }
      commit(
        endChaosDrag(
          moveChaosDrag(
            sceneRef.current,
            chaosScreenToWorld(point, chaosWorldView(sceneRef.current)),
          ),
        ),
      );
    },
    [size, stop, commit],
  );
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current === event.pointerId) stop();
    },
    [stop],
  );
  const onLostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (ownerRef.current === event.pointerId) stop();
    },
    [stop],
  );
  const onBlur = useCallback(
    (event: ReactFocusEvent<HTMLCanvasElement>) => {
      if (
        event.relatedTarget instanceof Node &&
        containerRef.current?.contains(event.relatedTarget)
      ) {
        if (ownerRef.current !== null) commit(endChaosDrag(sceneRef.current));
      } else stop();
    },
    [commit, stop],
  );
  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") return;
      const key = event.key.toLowerCase();
      const handled =
        ["r", "f", "a", "d", "w", "s"].includes(key) ||
        (stage === 2 && ["q", "e", "z", "c"].includes(key)) ||
        (stage >= 3 && [" ", "n", "[", "]"].includes(key)) ||
        (stage >= 4 && ["arrowup", "arrowdown", "0"].includes(key)) ||
        (stage >= 6 && ["enter", "escape", "backspace"].includes(key)) ||
        (stage >= 7 && key === "p");
      if (!handled) return;
      event.preventDefault();
      if (event.repeat) return;
      if (key === "r") reset();
      if (key === "f") toggleDebug();
      if (key === " ") togglePause();
      if (key === "n") step();
      if (key === "enter") fast();
      if (key === "escape" || key === "backspace") stop();
      const current = sceneRef.current;
      if (key === "p")
        preset(
          current.preset === "calm"
            ? "chaotic"
            : current.preset === "chaotic"
              ? "near-upright"
              : "calm",
        );
      if (key === "[" || key === "]")
        edit("dtIndex", Math.max(0, Math.min(5, current.dtIndex + (key === "[" ? 1 : -1))));
      if (["a", "d", "w", "s"].includes(key)) {
        const field = key === "a" || key === "d" ? "theta1" : "theta2";
        edit(
          field,
          Math.max(
            -Math.PI,
            Math.min(Math.PI, current.initial[field] + (key === "d" || key === "w" ? 0.05 : -0.05)),
          ),
        );
      }
      if (stage === 2 && ["q", "e", "z", "c"].includes(key)) {
        const field = key === "q" || key === "e" ? "omega1" : "omega2";
        edit(
          field,
          Math.max(
            -4,
            Math.min(4, current.initial[field] + (key === "e" || key === "c" ? 0.1 : -0.1)),
          ),
        );
      }
      if (key === "0") edit("epsilon", 0);
      if (key === "arrowup")
        edit(
          "epsilon",
          Number(Math.min(0.01, Math.max(1e-8, current.epsilon * 10)).toPrecision(1)),
        );
      if (key === "arrowdown")
        edit(
          "epsilon",
          current.epsilon <= 1e-8 ? 0 : Number((current.epsilon / 10).toPrecision(1)),
        );
    },
    [stage, reset, toggleDebug, togglePause, step, fast, stop, preset, edit],
  );
  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(500px,62vw,660px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Hai double pendulum gần nhau với trail và đồ thị separation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <ChaosControls
        scene={scene}
        reducedMotion={reducedMotion}
        edit={edit}
        preset={preset}
        reset={reset}
        defaults={defaults}
        togglePause={togglePause}
        step={step}
        fast={fast}
        shortRun={shortRun}
        stop={stop}
        toggleDebug={toggleDebug}
      />
      <ChaosReadout scene={scene} />
      <p className="lab-hint">
        A/D: góc theta1; W/S: góc theta2. Space: chạy/dừng; N: một bước; R: đặt lại cùng cấu hình;
        F: debug. Từ bài 7: kéo quả cuối của A, Enter chạy nhanh, Esc dừng. Tab rời Canvas. Reduced
        motion tắt chạy liên tục; vẫn dùng được bước đơn và job hữu hạn.
      </p>
    </div>
  );
}
