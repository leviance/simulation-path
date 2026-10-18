"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceMotion,
  createMotionTimeline,
  freshMotionState,
  remainingFrameNs,
  simulateMotion,
  type MotionPreset,
} from "@/lib/labs/motion";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import { drawMotion } from "./motion-lab-view";
import type { InteractiveLabMode } from "./types";

export default function MotionLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [fps, setFps] = useState(30);
  const [preset, setPreset] = useState<MotionPreset>("even");
  const [paused, setPaused] = useState(true);
  const [revision, setRevision] = useState(0);
  const [sampleTime, setSampleTime] = useState(5);
  const [workMs, setWorkMs] = useState(4);
  const [readout, setReadout] = useState({
    elapsed: 0,
    frameDistance: 0,
    timeDistance: 0,
    discarded: 0,
  });
  const simulation = useRef(freshMotionState());
  const playback = useRef({ last: 0, accumulator: 0, index: 0 });
  const timeline = useRef(createMotionTimeline(30, "even"));
  const ownerPointer = useRef<number | null>(null);
  const showFrame = mode !== "motion-dt";
  const showLimiter = mode === "motion-limiter";

  const publish = useCallback(() => {
    const state = simulation.current;
    setReadout({
      elapsed: state.elapsed,
      frameDistance: state.frameDistance,
      timeDistance: state.timeDistance,
      discarded: state.discarded,
    });
    setRevision((value) => value + 1);
  }, []);

  const clearPointer = useCallback(() => {
    const id = ownerPointer.current;
    const canvas = canvasRef.current;
    ownerPointer.current = null;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
  }, []);

  const stop = useCallback(() => {
    playback.current.last = 0;
    setPaused(true);
  }, []);
  usePauseOnReducedMotion(stop);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) stop();
    };
    const onWindowBlur = () => {
      clearPointer();
      stop();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onWindowBlur);
      clearPointer();
    };
  }, [stop, clearPointer]);

  const reset = useCallback(
    (nextFps = fps, nextPreset = preset) => {
      clearPointer();
      simulation.current = freshMotionState();
      playback.current = { last: 0, accumulator: 0, index: 0 };
      timeline.current = createMotionTimeline(nextFps, nextPreset);
      setPaused(true);
      setSampleTime(5);
      publish();
    },
    [fps, preset, clearPointer, publish],
  );

  const calculate = useCallback(() => {
    clearPointer();
    simulation.current = simulateMotion(fps, preset);
    playback.current = { last: 0, accumulator: 0, index: timeline.current.length };
    setPaused(true);
    publish();
  }, [fps, preset, clearPointer, publish]);

  const togglePaused = useCallback(() => {
    if (reducedMotion) return;
    if (simulation.current.elapsed >= 5) reset();
    playback.current.last = 0;
    setPaused((value) => !value);
  }, [reducedMotion, reset]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let animationFrame = 0;
    let lastPublish = 0;
    const draw = (now: number) => {
      const clock = playback.current;
      const state = simulation.current;
      if (!paused && !reducedMotion) {
        if (clock.last !== 0) clock.accumulator += Math.max(0, (now - clock.last) / 1000);
        clock.last = now;
        // Timeline dài tối đa 600 bước; mỗi callback chỉ xử lý tối đa 32 bước.
        let steps = 0;
        while (clock.index < timeline.current.length && steps < 32) {
          const dt = timeline.current[clock.index];
          if (clock.accumulator < dt) break;
          advanceMotion(state, dt);
          clock.accumulator -= dt;
          clock.index += 1;
          steps += 1;
        }
        if (now - lastPublish >= 100 || state.elapsed >= 5) {
          const { elapsed, frameDistance, timeDistance, discarded } = state;
          setReadout({ elapsed, frameDistance, timeDistance, discarded });
          lastPublish = now;
        }
        if (state.elapsed >= 5) setPaused(true);
      }
      drawMotion(ctx, size, state, sampleTime, showFrame);
      if (!paused && !reducedMotion && state.elapsed < 5) {
        animationFrame = requestAnimationFrame(draw);
      }
    };
    if (paused || reducedMotion) draw(performance.now());
    else animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, revision, size, sampleTime, showFrame]);

  const inspect = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * size.width;
      setSampleTime(Math.max(0, Math.min(5, ((x - 38) / (size.width - 66)) * 5)));
    },
    [size.width],
  );

  const sample =
    simulation.current.history.findLast((item) => item.elapsed <= sampleTime) ??
    simulation.current.history[0];
  return (
    <div className="lab-body">
      <p>
        Mốc FPS ở đây là dữ liệu của thí nghiệm, không phải FPS thật của trình duyệt.
        {showFrame ? " Hai làn dùng cùng thang 1.800 px." : " Làn xanh dùng thang 1.800 px."} Thử
        tính ngay năm giây rồi kéo trên đồ thị để đọc số.
      </p>
      <div className="lab-controls">
        <label>
          FPS thí nghiệm
          <select
            value={fps}
            onChange={(event) => {
              const value = Number(event.target.value);
              setFps(value);
              reset(value, preset);
            }}
          >
            {[15, 30, 60, 120].map((value) => (
              <option key={value} value={value}>
                {value} FPS
              </option>
            ))}
          </select>
        </label>
        <label>
          Dãy thời gian
          <select
            value={preset}
            onChange={(event) => {
              const value = event.target.value as MotionPreset;
              setPreset(value);
              reset(fps, value);
            }}
          >
            <option value="even">Đều</option>
            <option value="jitter">Xen kẽ 0,75× / 1,25×</option>
            <option value="stall">Một frame dài 0,2 s</option>
          </select>
        </label>
        <button onClick={calculate}>Tính ngay 5 giây</button>
        <button disabled={reducedMotion} onClick={togglePaused}>
          {paused ? "Chạy / tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={() => reset()}>Đặt lại</button>
        {reducedMotion && (
          <span className="control-hint">Giảm chuyển động: dùng “Tính ngay 5 giây”.</span>
        )}
      </div>
      {showLimiter && (
        <label>
          Thời gian làm việc mỗi frame (ms)
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={workMs}
            onChange={(event) => setWorkMs(Number(event.target.value))}
          />
          <output>
            {workMs} ms làm việc + {(remainingFrameNs(fps, workMs * 1e6) / 1e6).toFixed(3)} ms nghỉ.
            Đây là ngân sách lý tưởng, không phải phép đo SDL_DelayNS.
          </output>
        </label>
      )}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="So sánh quãng đường theo frame và theo dt; kéo để đọc đồ thị, mũi tên trái phải để chọn thời điểm"
        onPointerDown={(event) => {
          if (event.button !== 0 || ownerPointer.current !== null) return;
          ownerPointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
          inspect(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.pointerId === ownerPointer.current) inspect(event.clientX);
        }}
        onPointerUp={(event) => {
          if (event.pointerId === ownerPointer.current) clearPointer();
        }}
        onPointerCancel={(event) => {
          if (event.pointerId === ownerPointer.current) clearPointer();
        }}
        onLostPointerCapture={(event) => {
          if (event.pointerId === ownerPointer.current) ownerPointer.current = null;
        }}
        onBlur={() => {
          clearPointer();
          stop();
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          if (!["ArrowLeft", "ArrowRight", " ", "r", "R"].includes(event.key)) return;
          event.preventDefault();
          if (event.repeat) return;
          if (event.key === " ") togglePaused();
          if (event.key.toLowerCase() === "r") reset();
          if (event.key === "ArrowLeft") setSampleTime((value) => Math.max(0, value - 0.25));
          if (event.key === "ArrowRight") setSampleTime((value) => Math.min(5, value + 0.25));
        }}
      />
      <LabReadout
        items={[
          { label: "Thời gian đo", value: readout.elapsed.toFixed(2) + " s" },
          {
            label: "Thời gian đã cập nhật",
            value: (readout.elapsed - readout.discarded).toFixed(3) + " s",
          },
          { label: "Frame-based", value: readout.frameDistance.toFixed(1) + " px" },
          { label: "Dùng dt", value: readout.timeDistance.toFixed(1) + " px" },
          { label: "Thời gian bị bỏ", value: readout.discarded.toFixed(3) + " s" },
          {
            label: "Mốc đang đọc",
            value: sample.elapsed.toFixed(2) + " s; dt " + sample.timeDistance.toFixed(1) + " px",
          },
        ]}
      />
      <p>
        {showFrame && "Vàng: 3 pixel mỗi frame. "}Xanh: 180 pixel/giây × min(dt, 0,05). Ở 30/60/120
        FPS đều, đường xanh kết thúc tại 900 px; 15 FPS hoặc frame 0,2 s sẽ làm mất thời gian vì
        clamp. Trong ứng dụng C++, WASD vẫn do bạn điều khiển; phím B đo một vật tham chiếu riêng,
        không kéo nhân vật chạy tự động.
      </p>
    </div>
  );
}
