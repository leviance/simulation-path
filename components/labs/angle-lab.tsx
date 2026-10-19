"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { TAU, pointOnUnitCircle } from "@/lib/labs/angle";
import {
  circleScene,
  circleLayers,
  advanceCircle,
  setCircleAngle,
  beginCircleDrag,
  moveCircleNeedle,
  type CircleScene,
} from "@/lib/labs/unit-circle";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import { circlePointFromEvent, drawAngleLab } from "./angle-lab-view";
import type { InteractiveLabMode } from "./types";

export default function AngleLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [scene, setScene] = useState(() =>
    mode === "angle-radians" ? setCircleAngle(circleScene(), 0) : circleScene(),
  );
  const sceneRef = useRef(scene);
  const owner = useRef<number | null>(null);
  const previousMode = useRef(mode);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const layers = circleLayers(mode);
  const direction = pointOnUnitCircle(scene.angle);
  const period = scene.angularSpeed === 0 ? Infinity : TAU / Math.abs(scene.angularSpeed);
  const updateScene = (next: CircleScene) => {
    sceneRef.current = next;
    setScene(next);
  };
  const pause = (value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
  };
  const release = () => {
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    if (sceneRef.current.dragging) updateScene({ ...sceneRef.current, dragging: false });
  };
  const manualAngle = (angle: number) => {
    release();
    pause(true);
    updateScene(setCircleAngle(sceneRef.current, angle));
  };
  const togglePause = () => {
    release();
    pause(!pausedRef.current);
  };
  const reset = () => {
    release();
    const next = circleScene();
    updateScene(mode === "angle-radians" ? setCircleAngle(next, 0) : next);
    pause(true);
  };

  useEffect(() => {
    const blur = () => {
      release();
      pause(true);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, []);
  useEffect(() => {
    release();
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      reset();
    }
  }, [size.width, size.height, size.dpr, mode]);
  useEffect(() => {
    if (reducedMotion) {
      release();
      pause(true);
    }
  }, [reducedMotion]);
  useEffect(() => {
    if (!layers.animate || paused || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!document.hidden && !pausedRef.current)
        updateScene(advanceCircle(sceneRef.current, deltaTime));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [layers.animate, paused, reducedMotion, mode]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawAngleLab(ctx, size, scene, circleLayers(mode));
  }, [size, scene, mode]);

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!layers.drag || !event.isPrimary || event.button !== 0 || owner.current !== null) return;
    const screen = circlePointFromEvent(event, size);
    if (!screen) return;
    const next = beginCircleDrag(sceneRef.current, screen);
    if (!next.dragging) return;
    event.preventDefault();
    event.currentTarget.focus();
    pause(true);
    updateScene(next);
    owner.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      release();
    }
  };
  const dragPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId) return;
    if ((event.buttons & 1) === 0) {
      release();
      return;
    }
    const screen = circlePointFromEvent(event, size, true);
    if (!screen) {
      release();
      return;
    }
    updateScene(moveCircleNeedle(sceneRef.current, screen));
  };
  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (owner.current !== event.pointerId || (!cancelled && event.button !== 0)) return;
    const screen = circlePointFromEvent(event, size, true);
    if (!cancelled && screen) updateScene(moveCircleNeedle(sceneRef.current, screen));
    release();
  };
  const step = () => {
    release();
    pause(true);
    updateScene(advanceCircle(sceneRef.current, 0.1));
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "r",
        "R",
        "s",
        "S",
        "Escape",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (event.key === " ") {
      if (!event.repeat) togglePause();
      return;
    }
    if (event.key === "Escape") {
      release();
      return;
    }
    if (event.key.toLowerCase() === "r") {
      if (!event.repeat) reset();
      return;
    }
    if (event.key.toLowerCase() === "s") {
      if (!event.repeat && layers.animate && (pausedRef.current || reducedMotion)) step();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      manualAngle(sceneRef.current.angle + ((event.key === "ArrowRight" ? 1 : -1) * Math.PI) / 36);
    } else if (layers.animate) {
      release();
      updateScene({
        ...sceneRef.current,
        angularSpeed: Math.min(
          TAU,
          Math.max(-TAU, sceneRef.current.angularSpeed + (event.key === "ArrowUp" ? 0.25 : -0.25)),
        ),
      });
    }
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Mốc góc
          <select
            value="custom"
            onChange={(event) => {
              if (event.target.value !== "custom") manualAngle(Number(event.target.value));
            }}
          >
            <option value="custom">Chọn một góc…</option>
            {[
              [0, "0°"],
              [1, "1 rad"],
              [Math.PI / 2, "90° · π/2"],
              [Math.PI, "180° · π"],
              [(3 * Math.PI) / 2, "270° · 3π/2"],
              [TAU, "360° · 2π"],
              [-Math.PI / 4, "−45°"],
            ].map(([value, label]) => (
              <option key={String(label)} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Góc (radian)
          <input
            type="range"
            min={-TAU}
            max={2 * TAU}
            step={Math.PI / 180}
            value={scene.requestedAngle}
            onChange={(event) => manualAngle(Number(event.target.value))}
          />
          <output>{scene.requestedAngle.toFixed(3)} rad</output>
        </label>
        {layers.animate && (
          <label>
            Vận tốc góc
            <input
              type="range"
              min={-TAU}
              max={TAU}
              step="0.05"
              value={scene.angularSpeed}
              onChange={(event) => {
                release();
                updateScene({ ...sceneRef.current, angularSpeed: Number(event.target.value) });
              }}
            />
            <output>{scene.angularSpeed.toFixed(3)} rad/s</output>
          </label>
        )}
        {layers.animate && (
          <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        )}
        {layers.animate && (paused || reducedMotion) && <button onClick={step}>Tiến 0,1 s</button>}
        <button onClick={reset}>Đặt lại</button>
      </div>
      {reducedMotion && layers.animate && (
        <p>Đã bật giảm chuyển động: mô phỏng không tự chạy; dùng Tiến 0,1 s.</p>
      )}
      <p>
        Đổi góc bằng tay sẽ tạm dừng và bắt đầu lịch sử mới.{" "}
        {layers.drag
          ? "Kéo chấm vàng, hoặc dùng ←/→ để đổi góc. Sát tâm thì giữ góc cũ."
          : "Dùng các mốc hoặc thanh góc; thao tác kéo được thêm ở bài atan2."}{" "}
        Tab chuyển focus như bình thường.
      </p>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(360px, 54vw, 560px)", touchAction: "none" }}
        onPointerDown={startDrag}
        onPointerMove={dragPoint}
        onPointerUp={stopDrag}
        onPointerCancel={(event) => stopDrag(event, true)}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) release();
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Đường tròn đơn vị: góc radian, kim quay, hình chiếu X/Y và đồ thị sin/cos theo từng bài. Trái/phải đổi góc; Space tạm dừng; S tiến một bước."
      />
      <LabReadout
        items={[
          {
            label: "angle",
            value:
              scene.angle.toFixed(5) + " rad = " + ((scene.angle * 180) / Math.PI).toFixed(2) + "°",
          },
          {
            label: "góc vừa nhập / s/r",
            value: scene.requestedAngle.toFixed(5) + " rad; góc sau normalize ở ô angle",
          },
          {
            label: "endpoint (cos, sin)",
            value: "(" + direction.x.toFixed(5) + ", " + direction.y.toFixed(5) + ")",
          },
          { label: "cos² + sin²", value: (direction.x ** 2 + direction.y ** 2).toFixed(12) },
          ...(layers.animate
            ? [
                {
                  label: "period",
                  value: Number.isFinite(period) ? period.toFixed(4) + " s" : "∞ (đứng yên)",
                },
              ]
            : []),
          ...(layers.graphs
            ? [
                { label: "history", value: scene.samples.length + "/361 mẫu · 60 Hz · 6 s" },
                { label: "simulation time", value: scene.elapsedTime.toFixed(3) + " s" },
              ]
            : []),
        ]}
      />
    </div>
  );
}
