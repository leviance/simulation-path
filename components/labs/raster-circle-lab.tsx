"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clamp, type Point } from "@/lib/labs/geometry";
import { midpointCircleSteps } from "@/lib/labs/raster";
import { LabReadout, setupCanvas, useCanvasSize } from "./lab-shared";
import { drawRasterGrid, rasterGridMetrics, rasterPointFromEvent } from "./raster-grid";

export default function RasterCircleLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const initialCenter = { x: 10, y: 7 };
  const initialRadius = 5;
  const [center, setCenter] = useState(initialCenter);
  const [radius, setRadius] = useState(initialRadius);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);
  const columns = 21;
  const rows = 15;
  const steps = useMemo(() => midpointCircleSteps(center, radius), [center, radius]);
  const visibleStep = clamp(stepIndex, 0, steps.length - 1);
  const currentStep = steps[visibleStep];
  const visiblePixels = useMemo(() => {
    const unique = new Map<string, Point>();
    for (const step of steps.slice(0, visibleStep + 1)) {
      for (const point of step.points) {
        unique.set(`${point.x},${point.y}`, point);
      }
    }
    return [...unique.values()];
  }, [steps, visibleStep]);
  const currentPixelKeys = useMemo(
    () => new Set(currentStep.points.map((point) => `${point.x},${point.y}`)),
    [currentStep],
  );
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    const { cell, ox, oy } = grid;
    ctx.beginPath();
    ctx.arc(
      ox + (center.x + 0.5) * cell,
      oy + (center.y + 0.5) * cell,
      radius * cell,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    for (const point of visiblePixels) {
      const isCurrent = currentPixelKeys.has(`${point.x},${point.y}`);
      ctx.fillStyle = paused ? "#6f7d9c" : isCurrent ? "#fff" : "#53f0ae";
      ctx.fillRect(ox + point.x * cell + 2, oy + point.y * cell + 2, cell - 4, cell - 4);
    }
    ctx.beginPath();
    ctx.arc(ox + (center.x + 0.5) * cell, oy + (center.y + 0.5) * cell, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb454";
    ctx.fill();
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText(
      `bước ${visibleStep + 1}/${steps.length} · (x,y)=(${currentStep.x},${currentStep.y}) · decision=${currentStep.decision}`,
      20,
      22,
    );
  }, [
    center,
    currentPixelKeys,
    currentStep,
    grid,
    paused,
    radius,
    size,
    steps.length,
    visiblePixels,
    visibleStep,
  ]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    rasterPointFromEvent(event, grid, {
      minX: radius,
      maxX: columns - radius - 1,
      minY: radius,
      maxY: rows - radius - 1,
    });

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCenter(pointFromEvent(event));
    setStepIndex(0);
  };

  const moveCenter = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || !dragging.current) return;
    setCenter(pointFromEvent(event));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    setCenter((current) => ({
      x: clamp(
        current.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
        radius,
        columns - radius - 1,
      ),
      y: clamp(
        current.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0),
        radius,
        rows - radius - 1,
      ),
    }));
  };

  const changeRadius = (nextRadius: number) => {
    setRadius(nextRadius);
    setCenter((current) => ({
      x: clamp(current.x, nextRadius, columns - nextRadius - 1),
      y: clamp(current.y, nextRadius, rows - nextRadius - 1),
    }));
    setStepIndex(0);
  };

  const reset = () => {
    setCenter(initialCenter);
    setRadius(initialRadius);
    setStepIndex(0);
    setPaused(false);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Bán kính
          <input
            type="range"
            min="0"
            max="6"
            value={radius}
            onChange={(event) => changeRadius(Number(event.target.value))}
            disabled={paused}
          />
          <output>{radius}</output>
        </label>
        <label>
          Bước
          <input
            type="range"
            min="0"
            max={steps.length - 1}
            value={visibleStep}
            onChange={(event) => setStepIndex(Number(event.target.value))}
            disabled={paused}
          />
          <output>
            {visibleStep + 1}/{steps.length}
          </output>
        </label>
        <button
          onClick={() => setStepIndex(Math.max(0, visibleStep - 1))}
          disabled={paused || visibleStep === 0}
        >
          Bước trước
        </button>
        <button
          onClick={() => setStepIndex(Math.min(steps.length - 1, visibleStep + 1))}
          disabled={paused || visibleStep === steps.length - 1}
        >
          Bước tiếp
        </button>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveCenter}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Lưới midpoint circle; kéo tâm hoặc dùng phím mũi tên và chọn từng bước bằng thanh điều khiển"
      />
      <LabReadout
        items={[
          { label: "Tâm", value: `(${center.x}, ${center.y})` },
          { label: "Offset đang tính", value: `(${currentStep.x}, ${currentStep.y})` },
          { label: "decision trước bước", value: currentStep.decision },
          { label: "Pixel mới sau phản chiếu", value: currentStep.points.length },
          { label: "Tổng pixel đang thấy", value: visiblePixels.length },
        ]}
      />
    </div>
  );
}
