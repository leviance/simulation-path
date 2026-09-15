"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  angleFromPoint,
  mapSampleTimeToX,
  normalizeAngle,
  pointOnUnitCircle,
  projectOntoXAxis,
  projectOntoYAxis,
  TAU,
} from "@/lib/labs/angle";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function AngleLab({ mode }: { mode?: InteractiveLabMode }) {
  type WaveSample = { time: number; sine: number; cosine: number };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialAngle = (35 * Math.PI) / 180;
  const initialSpeed = Math.PI / 2;
  const [inputAngle, setInputAngle] = useState(initialAngle);
  const angleRef = useRef(initialAngle);
  const [angularSpeed, setAngularSpeed] = useState(initialSpeed);
  const [paused, setPaused] = useState(false);
  const [waveSamples, setWaveSamples] = useState<WaveSample[]>([]);
  const elapsedTime = useRef(0);
  const sampleAccumulator = useRef(0);
  const dragging = useRef(false);
  const canAnimate = mode === undefined || mode === "angle-motion" || mode === "angle-graphs";
  const canDrag = mode === undefined || mode === "angle-atan2";
  const showProjections =
    mode === undefined ||
    mode === "angle-sincos" ||
    mode === "angle-projections" ||
    mode === "angle-graphs" ||
    mode === "angle-atan2";
  const showGraphs = mode === undefined || mode === "angle-graphs";
  const showArc = mode === "angle-radians";
  const visibleHistorySeconds = 6;
  const sampleInterval = 1 / 60;
  const maximumSamples = 360;
  const angle = normalizeAngle(inputAngle);
  const direction = useMemo(() => pointOnUnitCircle(angle), [angle]);
  const period =
    Math.abs(angularSpeed) <= 1e-12 ? Number.POSITIVE_INFINITY : TAU / Math.abs(angularSpeed);

  const clearWaveHistory = useCallback(() => {
    elapsedTime.current = 0;
    sampleAccumulator.current = 0;
    setWaveSamples([]);
  }, []);

  const setAngleValue = useCallback((nextAngle: number) => {
    angleRef.current = nextAngle;
    setInputAngle(nextAngle);
  }, []);

  const setAngleManually = useCallback(
    (nextAngle: number) => {
      setAngleValue(nextAngle);
      clearWaveHistory();
    },
    [clearWaveHistory, setAngleValue],
  );

  const advanceSimulation = useCallback(
    (requestedDeltaTime: number) => {
      const deltaTime = Math.min(Math.max(requestedDeltaTime, 0), 0.1);
      const nextAngle = normalizeAngle(angleRef.current + angularSpeed * deltaTime);
      setAngleValue(nextAngle);
      elapsedTime.current += deltaTime;
      sampleAccumulator.current += deltaTime;

      if (showGraphs && sampleAccumulator.current >= sampleInterval) {
        const sampleDirection = pointOnUnitCircle(nextAngle);
        const newestTime = elapsedTime.current;
        setWaveSamples((current) => {
          const nextSamples = [
            ...current,
            {
              time: newestTime,
              sine: sampleDirection.y,
              cosine: sampleDirection.x,
            },
          ];
          return nextSamples.slice(-maximumSamples);
        });
        sampleAccumulator.current %= sampleInterval;
      }
    },
    [angularSpeed, maximumSamples, sampleInterval, setAngleValue, showGraphs],
  );

  useEffect(() => {
    if (!canAnimate || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = (now - previous) / 1000;
      previous = now;
      advanceSimulation(deltaTime);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [advanceSimulation, canAnimate, paused, reducedMotion]);

  const layout = useMemo(() => {
    const center = {
      x: showGraphs ? size.width * 0.27 : size.width * 0.5,
      y: size.height * 0.54,
    };
    const horizontalLimit = showGraphs ? size.width * 0.19 : size.width * 0.28;
    const radius = Math.max(70, Math.min(horizontalLimit, size.height * 0.31));
    return { center, radius };
  }, [showGraphs, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    const { center, radius } = layout;
    const endpoint = {
      x: center.x + direction.x * radius,
      y: center.y - direction.y * radius,
    };

    drawLine(
      ctx,
      { x: center.x - radius - 18, y: center.y },
      { x: center.x + radius + 18, y: center.y },
      "#63708d",
      1.5,
    );
    drawLine(
      ctx,
      { x: center.x, y: center.y - radius - 18 },
      { x: center.x, y: center.y + radius + 18 },
      "#63708d",
      1.5,
    );
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, TAU);
    ctx.strokeStyle = "#7e8ba6";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (showArc && inputAngle > 1e-6) {
      const arcRadius = radius * 0.32;
      ctx.beginPath();
      ctx.arc(center.x, center.y, arcRadius, 0, -inputAngle, true);
      ctx.strokeStyle = "#ffb454";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#ffb454";
      ctx.font = "700 11px ui-monospace";
      ctx.fillText(`s/r = θ = ${(inputAngle / Math.PI).toFixed(2)}π`, center.x + 12, center.y + 24);
    }

    if (showProjections) {
      const cosineProjection = projectOntoXAxis(direction);
      const sineProjection = projectOntoYAxis(direction);
      const cosinePoint = { x: center.x + cosineProjection.x * radius, y: center.y };
      const sinePoint = { x: center.x, y: center.y - sineProjection.y * radius };
      drawLine(ctx, endpoint, cosinePoint, "#46536e", 1.5);
      drawLine(ctx, endpoint, sinePoint, "#46536e", 1.5);
      drawLine(ctx, center, cosinePoint, "#84a9ff", 3);
      drawLine(ctx, center, sinePoint, "#53f0ae", 3);
      ctx.fillStyle = "#84a9ff";
      ctx.font = "700 11px ui-monospace";
      ctx.fillText(`cos=${direction.x.toFixed(3)}`, cosinePoint.x - 35, center.y + 18);
      ctx.fillStyle = "#53f0ae";
      ctx.fillText(`sin=${direction.y.toFixed(3)}`, center.x + 8, sinePoint.y - 8);
    }

    drawLine(ctx, center, endpoint, "#ffe26c", 3);
    ctx.beginPath();
    ctx.arc(endpoint.x, endpoint.y, 7, 0, TAU);
    ctx.fillStyle = "#ffe26c";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 11px ui-monospace";
    ctx.fillText(`${(inputAngle / Math.PI).toFixed(2)}π`, center.x + 12, center.y - 12);

    if (showGraphs) {
      const left = size.width * 0.52;
      const right = size.width - 24;
      const top = 44;
      const bottom = size.height - 34;
      const middle = (top + bottom) / 2;
      const amplitude = (bottom - top) * 0.42;
      drawLine(ctx, { x: left, y: middle }, { x: right, y: middle }, "#46536e");
      drawLine(ctx, { x: left, y: top }, { x: left, y: bottom }, "#46536e");

      if (waveSamples.length >= 2) {
        const newestTime = waveSamples[waveSamples.length - 1].time;
        const drawHistory = (key: "sine" | "cosine", color: string) => {
          ctx.beginPath();
          let started = false;
          for (const sample of waveSamples) {
            if (sample.time < newestTime - visibleHistorySeconds) continue;
            const x = mapSampleTimeToX(sample.time, newestTime, visibleHistorySeconds, left, right);
            const y = middle - sample[key] * amplitude;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        };
        drawHistory("sine", "#53f0ae");
        drawHistory("cosine", "#84a9ff");
      }

      drawLine(ctx, { x: right, y: top }, { x: right, y: bottom }, "#ffe26c", 1.5);
      ctx.fillStyle = "#9aa6c1";
      ctx.font = "10px ui-monospace";
      ctx.fillText("−6 s", left, bottom + 15);
      ctx.fillText("bây giờ", right - 38, bottom + 15);
      ctx.fillStyle = "#53f0ae";
      ctx.fillText("sin", left + 8, top + 14);
      ctx.fillStyle = "#84a9ff";
      ctx.fillText("cos", left + 40, top + 14);
    }
  }, [direction, inputAngle, layout, showArc, showGraphs, showProjections, size, waveSamples]);

  const angleFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return angleFromPoint({
      x: point.x - layout.center.x,
      y: layout.center.y - point.y,
    });
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDrag) return;
    const point = canvasPoint(event, event.currentTarget);
    const endpoint = {
      x: layout.center.x + direction.x * layout.radius,
      y: layout.center.y - direction.y * layout.radius,
    };
    if (Math.hypot(point.x - endpoint.x, point.y - endpoint.y) > 18) return;
    dragging.current = true;
    if (canAnimate) setPaused(true);
    clearWaveHistory();
    event.currentTarget.setPointerCapture(event.pointerId);
    setAngleValue(angleFromEvent(event));
  };

  const dragPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    setAngleValue(angleFromEvent(event));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const step = Math.PI / 36;
    setAngleManually(
      normalizeAngle(angleRef.current + (event.key === "ArrowRight" ? step : -step)),
    );
  };

  const reset = () => {
    setAngleValue(initialAngle);
    setAngularSpeed(initialSpeed);
    setPaused(false);
    clearWaveHistory();
  };

  const presets = [
    { value: 0, label: "0°" },
    { value: 1, label: "1 rad" },
    { value: Math.PI / 2, label: "90° · π/2" },
    { value: Math.PI, label: "180° · π" },
    { value: (3 * Math.PI) / 2, label: "270° · 3π/2" },
    { value: TAU, label: "360° · 2π" },
  ];
  const selectedPreset =
    presets.find(({ value }) => Math.abs(value - inputAngle) <= 1e-9)?.value.toString() ?? "custom";

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Mốc góc
          <select
            value={selectedPreset}
            onChange={(event) => {
              if (event.target.value !== "custom") setAngleManually(Number(event.target.value));
            }}
          >
            <option value="custom">Tự chỉnh</option>
            {presets.map((preset) => (
              <option key={preset.label} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Góc
          <input
            type="range"
            min="0"
            max={TAU}
            step={Math.PI / 180}
            value={inputAngle}
            onChange={(event) => setAngleManually(Number(event.target.value))}
          />
          <output>{(inputAngle / Math.PI).toFixed(2)}π</output>
        </label>
        {canAnimate && (
          <label>
            Vận tốc góc
            <input
              type="range"
              min={-TAU}
              max={TAU}
              step="0.1"
              value={angularSpeed}
              onChange={(event) => setAngularSpeed(Number(event.target.value))}
            />
            <output>{angularSpeed.toFixed(2)} rad/s</output>
          </label>
        )}
        {reducedMotion && canAnimate && (
          <span className="control-hint">
            Đã bật giảm chuyển động; dùng nút Tiến 0,1 s để quan sát từng bước.
          </span>
        )}
        {canAnimate && (
          <button onClick={() => setPaused((value) => !value)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {canAnimate && (paused || reducedMotion) && (
          <button onClick={() => advanceSimulation(0.1)}>Tiến 0,1 s</button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={dragPoint}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Unit circle với kim quay; dùng thanh góc, các mốc có sẵn, phím trái phải hoặc kéo đầu kim trong bài atan2"
      />
      <LabReadout
        items={[
          {
            label: "angle",
            value: `${inputAngle.toFixed(4)} rad = ${((inputAngle * 180) / Math.PI).toFixed(1)}°${Math.abs(inputAngle - angle) > 1e-12 ? `; sau normalize = ${angle.toFixed(4)} rad` : ""}`,
          },
          { label: "endpoint", value: `(${direction.x.toFixed(4)}, ${direction.y.toFixed(4)})` },
          {
            label: "cos² + sin²",
            value: (direction.x * direction.x + direction.y * direction.y).toFixed(9),
          },
          ...(showArc
            ? [
                {
                  label: "độ dài cung",
                  value: `s = r × θ; s/r = ${inputAngle.toFixed(4)}${Math.abs(inputAngle - 1) <= 1e-9 ? " nên s = r" : ""}`,
                },
              ]
            : []),
          ...(canAnimate
            ? [
                { label: "angularSpeed", value: `${angularSpeed.toFixed(3)} rad/s` },
                {
                  label: "period",
                  value: Number.isFinite(period) ? `${period.toFixed(3)} s` : "∞",
                },
              ]
            : []),
          ...(showGraphs
            ? [
                {
                  label: "history",
                  value: `${waveSamples.length} mẫu · cửa sổ ${visibleHistorySeconds.toFixed(0)} s`,
                },
              ]
            : []),
          ...(canDrag
            ? [
                {
                  label: "atan2",
                  value: `atan2(${direction.y.toFixed(3)}, ${direction.x.toFixed(3)}) → ${angle.toFixed(3)} rad`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
