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
import { bresenhamSteps, ddaSteps } from "@/lib/labs/raster";
import { LabReadout, drawLine, setupCanvas, useCanvasSize } from "./lab-shared";
import { drawRasterGrid, rasterGridMetrics, rasterPointFromEvent } from "./raster-grid";
import type { InteractiveLabMode } from "./types";

const rasterPresets: Record<string, { a: Point; b: Point }> = {
  gentle: { a: { x: 2, y: 3 }, b: { x: 17, y: 10 } },
  steep: { a: { x: 5, y: 11 }, b: { x: 10, y: 1 } },
  reverse: { a: { x: 18, y: 2 }, b: { x: 2, y: 9 } },
  point: { a: { x: 10, y: 6 }, b: { x: 10, y: 6 } },
  octant1: { a: { x: 10, y: 6 }, b: { x: 17, y: 9 } },
  octant2: { a: { x: 10, y: 6 }, b: { x: 13, y: 12 } },
  octant3: { a: { x: 10, y: 6 }, b: { x: 7, y: 12 } },
  octant4: { a: { x: 10, y: 6 }, b: { x: 3, y: 9 } },
  octant5: { a: { x: 10, y: 6 }, b: { x: 3, y: 3 } },
  octant6: { a: { x: 10, y: 6 }, b: { x: 7, y: 0 } },
  octant7: { a: { x: 10, y: 6 }, b: { x: 13, y: 0 } },
  octant8: { a: { x: 10, y: 6 }, b: { x: 17, y: 3 } },
};

export default function RasterLineLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const initialAlgorithm = mode === "raster-dda" ? "dda" : "bresenham";
  const initialPreset = mode === "raster-octants" ? "octant1" : "gentle";
  const [algorithm, setAlgorithm] = useState(initialAlgorithm);
  const [preset, setPreset] = useState(initialPreset);
  const [stepIndex, setStepIndex] = useState(9);
  const [endpoints, setEndpoints] = useState(rasterPresets[initialPreset]);
  const [paused, setPaused] = useState(false);
  const dragging = useRef<"a" | "b" | null>(null);
  const columns = 20;
  const rows = 13;
  const steps = useMemo(
    () =>
      algorithm === "dda"
        ? ddaSteps(endpoints.a, endpoints.b)
        : bresenhamSteps(endpoints.a, endpoints.b),
    [algorithm, endpoints],
  );
  const visibleStep = clamp(stepIndex, 0, Math.max(0, steps.length - 1));
  const currentStep = steps[visibleStep];
  const rasterDetail =
    algorithm === "bresenham"
      ? `bước ${visibleStep + 1}/${steps.length} · error=${currentStep.error} · e2=${currentStep.e2} · đi ${currentStep.movesX ? "X" : ""}${currentStep.movesY ? "Y" : ""}${!currentStep.movesX && !currentStep.movesY ? "dừng" : ""}`
      : `bước ${visibleStep + 1}/${steps.length} · x=${currentStep.x?.toFixed(2)} · y=${currentStep.y?.toFixed(2)}`;
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    const { cell, ox, oy } = grid;
    drawLine(
      ctx,
      { x: ox + (endpoints.a.x + 0.5) * cell, y: oy + (endpoints.a.y + 0.5) * cell },
      { x: ox + (endpoints.b.x + 0.5) * cell, y: oy + (endpoints.b.y + 0.5) * cell },
      "#ff6b6b",
      2,
    );
    steps.slice(0, visibleStep + 1).forEach((step, index) => {
      ctx.fillStyle = index === visibleStep ? "#fff" : paused ? "#6f7d9c" : "#53f0ae";
      ctx.fillRect(ox + step.point.x * cell + 2, oy + step.point.y * cell + 2, cell - 4, cell - 4);
    });
    (["a", "b"] as const).forEach((key) => {
      const point = endpoints[key];
      ctx.beginPath();
      ctx.arc(ox + (point.x + 0.5) * cell, oy + (point.y + 0.5) * cell, 7, 0, Math.PI * 2);
      ctx.fillStyle = key === "a" ? "#ffb454" : "#84a9ff";
      ctx.fill();
    });
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText(rasterDetail, 20, 22);
  }, [endpoints, grid, paused, rasterDetail, size, steps, visibleStep]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    rasterPointFromEvent(event, grid, { maxX: columns - 1, maxY: rows - 1 });

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = pointFromEvent(event);
    const distanceA = Math.hypot(point.x - endpoints.a.x, point.y - endpoints.a.y);
    const distanceB = Math.hypot(point.x - endpoints.b.x, point.y - endpoints.b.y);
    dragging.current = distanceA <= distanceB ? "a" : "b";
    event.currentTarget.setPointerCapture(event.pointerId);
    setPreset("custom");
  };

  const moveEndpoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || !dragging.current) return;
    const key = dragging.current;
    setEndpoints((current) => ({ ...current, [key]: pointFromEvent(event) }));
    setStepIndex(999);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const key = event.shiftKey ? "a" : "b";
    setPreset("custom");
    setEndpoints((current) => ({
      ...current,
      [key]: {
        x: clamp(
          current[key].x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
          0,
          columns - 1,
        ),
        y: clamp(
          current[key].y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0),
          0,
          rows - 1,
        ),
      },
    }));
    setStepIndex(999);
  };

  const reset = () => {
    setAlgorithm(initialAlgorithm);
    setPreset(initialPreset);
    setEndpoints(rasterPresets[initialPreset]);
    setStepIndex(9);
    setPaused(false);
  };

  const selectPreset = (value: string) => {
    setPreset(value);
    if (!rasterPresets[value]) return;
    setEndpoints(rasterPresets[value]);
    setStepIndex(0);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {mode !== "raster-dda" && mode !== "raster-octants" ? (
          <label>
            Thuật toán
            <select
              value={algorithm}
              onChange={(event) => {
                setAlgorithm(event.target.value);
                setStepIndex(0);
              }}
              disabled={paused}
            >
              <option value="bresenham">Bresenham</option>
              <option value="dda">DDA</option>
            </select>
          </label>
        ) : (
          <span className="control-hint">
            Thuật toán: {algorithm === "dda" ? "DDA" : "Bresenham"}
          </span>
        )}
        <label>
          Trường hợp
          <select
            value={preset}
            onChange={(event) => selectPreset(event.target.value)}
            disabled={paused}
          >
            {mode === "raster-octants" ? (
              <>
                <option value="octant1">Octant 1 · phải/xuống</option>
                <option value="octant2">Octant 2 · xuống/phải</option>
                <option value="octant3">Octant 3 · xuống/trái</option>
                <option value="octant4">Octant 4 · trái/xuống</option>
                <option value="octant5">Octant 5 · trái/lên</option>
                <option value="octant6">Octant 6 · lên/trái</option>
                <option value="octant7">Octant 7 · lên/phải</option>
                <option value="octant8">Octant 8 · phải/lên</option>
              </>
            ) : (
              <>
                <option value="gentle">Dốc thấp</option>
                <option value="steep">Dốc cao</option>
                <option value="reverse">Đảo hướng</option>
                <option value="point">Một điểm</option>
              </>
            )}
            {preset === "custom" && <option value="custom">Tự đặt</option>}
          </select>
        </label>
        <label>
          Bước
          <input
            type="range"
            min="0"
            max={Math.max(0, steps.length - 1)}
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
        onPointerMove={moveEndpoint}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Lưới raster với hai endpoint kéo được; dùng phím mũi tên cho điểm B và Shift cộng mũi tên cho điểm A"
      />
      <LabReadout
        items={[
          { label: "Thuật toán", value: algorithm === "bresenham" ? "Bresenham" : "DDA" },
          { label: "Endpoint A", value: `(${endpoints.a.x}, ${endpoints.a.y})` },
          { label: "Endpoint B", value: `(${endpoints.b.x}, ${endpoints.b.y})` },
          { label: "Bước hiện tại", value: rasterDetail },
          { label: "Pixel được chọn", value: `(${currentStep.point.x}, ${currentStep.point.y})` },
        ]}
      />
    </div>
  );
}
