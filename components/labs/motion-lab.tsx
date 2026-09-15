"use client";

import { useEffect, useRef, useState } from "react";
import { LabReadout, drawLine, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type MotionState = {
  frameDistance: number;
  timeDistance: number;
  elapsed: number;
  last: number;
  accumulator: number;
  history: Array<{ t: number; frame: number; timed: number }>;
};

function freshMotionState(): MotionState {
  return {
    frameDistance: 0,
    timeDistance: 0,
    elapsed: 0,
    last: performance.now(),
    accumulator: 0,
    history: [],
  };
}

export default function MotionLab({ mode }: { mode?: InteractiveLabMode }) {
  void mode;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [fps, setFps] = useState(30);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  const [readout, setReadout] = useState({ frameDistance: 0, timeDistance: 0, elapsed: 0 });
  const simulation = useRef<MotionState>(freshMotionState());
  const lastReadoutTick = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let animationFrame = 0;

    const draw = (now: number) => {
      const state = simulation.current;
      const dt = Math.min(Math.max((now - state.last) / 1000, 0), 0.05);
      state.last = now;
      if (!paused && !reducedMotion) {
        state.accumulator += dt;
        const step = 1 / fps;
        while (state.accumulator >= step) {
          state.frameDistance += 3;
          state.timeDistance += 180 * step;
          state.elapsed += step;
          state.accumulator -= step;
        }
        const lastSample = state.history.at(-1)?.t ?? -1;
        if (state.elapsed - lastSample >= 0.2) {
          state.history.push({
            t: state.elapsed,
            frame: state.frameDistance,
            timed: state.timeDistance,
          });
          if (state.history.length > 80) state.history.shift();
        }
        const readoutTick = Math.floor(state.elapsed);
        if (readoutTick !== lastReadoutTick.current) {
          lastReadoutTick.current = readoutTick;
          setReadout({
            frameDistance: state.frameDistance,
            timeDistance: state.timeDistance,
            elapsed: state.elapsed,
          });
        }
      }

      setupCanvas(ctx, size);
      const laneWidth = Math.max(120, size.width - 90);
      ctx.fillStyle = "#9aa6c1";
      ctx.font = "11px ui-monospace";
      ctx.fillText("FRAME-BASED · +3 px/frame", 28, 34);
      ctx.fillText("TIME-BASED · 180 px/second", 28, 120);
      for (const y of [70, 156]) drawLine(ctx, { x: 28, y }, { x: size.width - 28, y }, "#26314c");
      ctx.fillStyle = "#ffb454";
      ctx.fillRect(28 + (state.frameDistance % laneWidth), 49, 34, 34);
      ctx.fillStyle = "#53f0ae";
      ctx.fillRect(28 + (state.timeDistance % laneWidth), 135, 34, 34);
      ctx.fillStyle = "#fff";
      ctx.font = "700 12px ui-monospace";
      ctx.fillText(`${fps} FPS → ${(fps * 3).toFixed(0)} px/s`, size.width - 180, 34);
      ctx.fillText(`${state.frameDistance.toFixed(1)} px`, 28, 98);
      ctx.fillText(`${state.timeDistance.toFixed(1)} px`, 28, 184);

      const chartTop = 218;
      const chartBottom = size.height - 24;
      const chartLeft = 38;
      const chartRight = size.width - 24;
      drawLine(ctx, { x: chartLeft, y: chartTop }, { x: chartLeft, y: chartBottom }, "#46536e");
      drawLine(ctx, { x: chartLeft, y: chartBottom }, { x: chartRight, y: chartBottom }, "#46536e");
      ctx.fillStyle = "#9aa6c1";
      ctx.font = "10px ui-monospace";
      ctx.fillText("DISTANCE–TIME", chartLeft, chartTop - 10);
      const history = state.history;
      if (history.length > 1) {
        const firstT = history[0].t;
        const spanT = Math.max(1, history.at(-1)!.t - firstT);
        const maximum = Math.max(1, ...history.flatMap((item) => [item.frame, item.timed]));
        const plot = (key: "frame" | "timed", color: string) => {
          ctx.beginPath();
          history.forEach((item, index) => {
            const x = chartLeft + ((item.t - firstT) / spanT) * (chartRight - chartLeft);
            const y = chartBottom - (item[key] / maximum) * (chartBottom - chartTop);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        };
        plot("frame", "#ffb454");
        plot("timed", "#53f0ae");
      }
      if (!paused && !reducedMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    if (paused || reducedMotion) {
      draw(performance.now());
    } else {
      animationFrame = requestAnimationFrame(draw);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [fps, paused, reducedMotion, revision, size]);

  const reset = () => {
    simulation.current = freshMotionState();
    lastReadoutTick.current = -1;
    setReadout({ frameDistance: 0, timeDistance: 0, elapsed: 0 });
    setPaused(false);
    setFps(30);
    setRevision((value) => value + 1);
  };
  const simulateFiveSeconds = () => {
    const history = Array.from({ length: 6 }, (_, second) => ({
      t: second,
      frame: second * fps * 3,
      timed: second * 180,
    }));
    simulation.current = {
      frameDistance: fps * 3 * 5,
      timeDistance: 180 * 5,
      elapsed: 5,
      last: performance.now(),
      accumulator: 0,
      history,
    };
    lastReadoutTick.current = 5;
    setReadout({ frameDistance: fps * 3 * 5, timeDistance: 180 * 5, elapsed: 5 });
    setPaused(true);
    setRevision((value) => value + 1);
  };
  const togglePaused = () => {
    simulation.current.last = performance.now();
    setPaused((value) => !value);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          FPS mô phỏng
          <input
            type="range"
            min="30"
            max="120"
            step="15"
            value={fps}
            onChange={(event) => {
              simulation.current.last = performance.now();
              setFps(Number(event.target.value));
            }}
          />
          <output>{fps}</output>
        </label>
        {reducedMotion && <span className="control-hint">Đã bật giảm chuyển động</span>}
        <button onClick={simulateFiveSeconds}>Mô phỏng 5 giây</button>
        <button disabled={reducedMotion} onClick={togglePaused}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Hai chuyển động và đồ thị distance-time so sánh frame-based với delta time"
      />
      <LabReadout
        items={[
          { label: "Thời gian mô phỏng", value: `${readout.elapsed.toFixed(2)} s` },
          {
            label: "Frame-based",
            value: `${readout.frameDistance.toFixed(1)} px (${fps * 3} px/s)`,
          },
          { label: "Time-based", value: `${readout.timeDistance.toFixed(1)} px (180 px/s)` },
          {
            label: "Chênh lệch",
            value: `${Math.abs(readout.frameDistance - readout.timeDistance).toFixed(1)} px`,
          },
        ]}
      />
    </div>
  );
}
