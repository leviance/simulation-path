"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { interpolateStroke } from "@/lib/labs/stroke";
import { type Point } from "@/lib/labs/geometry";
import { LabReadout, canvasPoint, setupCanvas, useCanvasSize } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const strokePresets: Record<string, Point[]> = {
  curve: [
    { x: 0.09, y: 0.54 },
    { x: 0.21, y: 0.25 },
    { x: 0.39, y: 0.66 },
    { x: 0.62, y: 0.29 },
    { x: 0.86, y: 0.54 },
  ],
  line: [
    { x: 0.09, y: 0.5 },
    { x: 0.29, y: 0.5 },
    { x: 0.53, y: 0.5 },
    { x: 0.86, y: 0.5 },
  ],
  corner: [
    { x: 0.12, y: 0.68 },
    { x: 0.12, y: 0.26 },
    { x: 0.46, y: 0.26 },
    { x: 0.79, y: 0.65 },
  ],
};

export default function StrokeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [rawPoints, setRawPoints] = useState<Point[]>(strokePresets.curve);
  const [preset, setPreset] = useState("curve");
  const initialInterpolation = mode === "stroke-interpolation";
  const [interpolate, setInterpolate] = useState(initialInterpolation);
  const [radius, setRadius] = useState(11);
  const [sampleEvery, setSampleEvery] = useState(1);
  const [paused, setPaused] = useState(false);
  const drawing = useRef(false);

  const inputPoints = useMemo(() => {
    const pixelPoints = rawPoints.map((point) => ({
      x: point.x * size.width,
      y: point.y * size.height,
    }));
    if (sampleEvery <= 1 || pixelPoints.length <= 2) return pixelPoints;
    const sampled = pixelPoints.filter((_, index) => index % sampleEvery === 0);
    const last = pixelPoints.at(-1)!;
    if (sampled.at(-1) !== last) sampled.push(last);
    return sampled;
  }, [rawPoints, sampleEvery, size.height, size.width]);
  const brushPoints = useMemo(
    () => (interpolate ? interpolateStroke(inputPoints, radius * 0.8) : inputPoints),
    [inputPoints, interpolate, radius],
  );
  const maximumGap = (points: Point[]) =>
    points
      .slice(1)
      .reduce(
        (largest, point, index) =>
          Math.max(largest, Math.hypot(point.x - points[index].x, point.y - points[index].y)),
        0,
      );
  const inputGap = maximumGap(inputPoints);
  const stampGap = maximumGap(brushPoints);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    ctx.fillStyle = "#11182b";
    ctx.fillRect(16, 16, size.width - 32, size.height - 32);
    ctx.fillStyle = paused ? "#6f7d9c" : "#53f0ae";
    for (const point of brushPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    for (const point of inputPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText(
      `${inputPoints.length} INPUT SAMPLES → ${brushPoints.length} BRUSH STAMPS`,
      28,
      size.height - 28,
    );
  }, [brushPoints, inputPoints, paused, radius, size]);

  const startStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreset("custom");
    const point = canvasPoint(event, event.currentTarget);
    setRawPoints([{ x: point.x / size.width, y: point.y / size.height }]);
  };
  const moveStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!paused && drawing.current) {
      const point = canvasPoint(event, event.currentTarget);
      setRawPoints((points) => [...points, { x: point.x / size.width, y: point.y / size.height }]);
    }
  };
  const reset = () => {
    setPreset("curve");
    setRawPoints(strokePresets.curve);
    setInterpolate(initialInterpolation);
    setRadius(11);
    setSampleEvery(1);
    setPaused(false);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            value={preset}
            onChange={(event) => {
              const value = event.target.value;
              setPreset(value);
              if (strokePresets[value]) setRawPoints(strokePresets[value]);
            }}
            disabled={paused}
          >
            <option value="curve">Đường cong</option>
            <option value="line">Đường thẳng</option>
            <option value="corner">Góc gấp</option>
            {preset === "custom" && <option value="custom">Tự vẽ</option>}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={interpolate}
            onChange={(event) => setInterpolate(event.target.checked)}
            disabled={paused}
          />{" "}
          Nội suy
        </label>
        <label>
          Sampling{" "}
          <input
            type="range"
            min="1"
            max="6"
            value={sampleEvery}
            onChange={(event) => setSampleEvery(Number(event.target.value))}
            disabled={paused}
          />
          <output>1/{sampleEvery}</output>
        </label>
        <label>
          Brush{" "}
          <input
            type="range"
            min="4"
            max="24"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
            disabled={paused}
          />
          <output>{radius}px</output>
        </label>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
        <button
          onClick={() => {
            setPreset("custom");
            setRawPoints([]);
          }}
          disabled={paused}
        >
          Xóa
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Delete" && !paused) setRawPoints([]);
        }}
        tabIndex={0}
        aria-label="Canvas vẽ stroke; điều chỉnh sampling và nội suy để lấp khoảng trống giữa các mouse sample"
      />
      <LabReadout
        items={[
          { label: "Input samples", value: inputPoints.length },
          { label: "Brush stamps", value: brushPoints.length },
          { label: "Khoảng cách sample lớn nhất", value: `${inputGap.toFixed(1)} px` },
          { label: "Khoảng cách stamp lớn nhất", value: `${stampGap.toFixed(1)} px` },
          { label: "Nội suy", value: interpolate ? "Đang bật" : "Đang tắt" },
        ]}
      />
    </div>
  );
}
