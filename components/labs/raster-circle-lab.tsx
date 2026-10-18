"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { clamp, type Point } from "@/lib/labs/geometry";
import { filledCircle, midpointCircleSteps } from "@/lib/labs/raster";
import { LabReadout, setupCanvas, useCanvasSize } from "./lab-shared";
import { drawRasterGrid, drawRasterPixels, rasterGridMetrics } from "./raster-grid";
import { useRasterDrag } from "./use-raster-drag";

export default function RasterCircleLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [center, setCenter] = useState<Point>({ x: 10, y: 7 });
  const [radius, setRadius] = useState(5);
  const [filled, setFilled] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const columns = 21;
  const rows = 15;
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);
  const steps = useMemo(() => midpointCircleSteps(center, radius), [center, radius]);
  const visibleStep = clamp(stepIndex, 0, steps.length - 1);
  const current = steps[visibleStep];
  const pixels = useMemo(
    () =>
      filled
        ? filledCircle(center, radius)
        : [
            ...new Map(
              steps
                .slice(0, visibleStep + 1)
                .flatMap((step) => step.points)
                .map((point) => [`${point.x},${point.y}`, point]),
            ).values(),
          ],
    [center, radius, filled, steps, visibleStep],
  );
  const moveCenter = (point: Point) => {
    setCenter({
      x: clamp(point.x, radius, columns - radius - 1),
      y: clamp(point.y, radius, rows - radius - 1),
    });
    setStepIndex(0);
  };
  const drag = useRasterDrag(canvasRef, size, grid, columns, rows, paused, moveCenter, moveCenter);
  const changeRadius = (value: number) => {
    drag.release();
    setRadius(value);
    setCenter((point) => ({
      x: clamp(point.x, value, columns - value - 1),
      y: clamp(point.y, value, rows - value - 1),
    }));
    setStepIndex(0);
  };
  const reset = () => {
    drag.release();
    setCenter({ x: 10, y: 7 });
    setRadius(5);
    setFilled(false);
    setStepIndex(0);
    setPaused(false);
  };
  const togglePause = () => {
    drag.release();
    setPaused((value) => !value);
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      event.key === " " ||
      event.key.startsWith("Arrow") ||
      ["PageUp", "PageDown", "Home", "End"].includes(event.key)
    ) {
      event.preventDefault();
    }
    if (event.key === "Escape") {
      drag.release();
      return;
    }
    if (event.key === " " && !event.repeat) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (event.key.toLowerCase() === "r" && !event.repeat) {
      event.preventDefault();
      reset();
      return;
    }
    if (paused) return;
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      changeRadius(clamp(radius + (event.key === "]" ? 1 : -1), 0, 6));
      return;
    }
    if (!filled && ["PageUp", "PageDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      drag.release();
      setStepIndex(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? steps.length - 1
            : clamp(visibleStep + (event.key === "PageDown" ? 1 : -1), 0, steps.length - 1),
      );
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    drag.release();
    moveCenter({
      x: center.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
      y: center.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0),
    });
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    // Đường đỏ chỉ minh họa đường cong lý tưởng, không tạo pixel của rasterizer.
    ctx.beginPath();
    ctx.arc(
      grid.ox + (center.x + 0.5) * grid.cell,
      grid.oy + (center.y + 0.5) * grid.cell,
      radius * grid.cell,
      0,
      2 * Math.PI,
    );
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawRasterPixels(ctx, grid, pixels, "#53f0ae", columns, rows);
    if (!filled) drawRasterPixels(ctx, grid, current.points, "#ffffff", columns, rows);
    ctx.fillStyle = "#ffb454";
    ctx.fillRect(
      grid.ox + (center.x + 0.4) * grid.cell,
      grid.oy + (center.y + 0.4) * grid.cell,
      grid.cell / 5,
      grid.cell / 5,
    );
    ctx.fillStyle = "#b6c3df";
    ctx.font = "11px ui-monospace";
    ctx.fillText(
      filled
        ? `Tô tới viền midpoint · ${pixels.length} pixel`
        : `Bước ${visibleStep + 1}/${steps.length} · (x,y)=(${current.x},${current.y}) · decision=${current.decision}`,
      16,
      22,
    );
  }, [size, grid, center, radius, filled, pixels, current, visibleStep, steps.length]);

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset bán kính
          <select
            value={radius}
            disabled={paused}
            onChange={(event) => changeRadius(Number(event.target.value))}
          >
            {Array.from({ length: 7 }, (_, value) => (
              <option key={value} value={value}>
                r = {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Bán kính
          <input
            type="range"
            min="0"
            max="6"
            value={radius}
            disabled={paused}
            onChange={(event) => changeRadius(Number(event.target.value))}
          />
          <output>{radius}</output>
        </label>
        <label>
          Kiểu vẽ
          <select
            value={filled ? "filled" : "outline"}
            disabled={paused}
            onChange={(event) => {
              drag.release();
              setFilled(event.target.value === "filled");
              setStepIndex(0);
            }}
          >
            <option value="outline">Đường viền midpoint</option>
            <option value="filled">Tô tới viền midpoint</option>
          </select>
        </label>
        {!filled && (
          <>
            <label>
              Bước
              <input
                type="range"
                min="0"
                max={steps.length - 1}
                value={visibleStep}
                disabled={paused}
                onChange={(event) => {
                  drag.release();
                  setStepIndex(Number(event.target.value));
                }}
              />
              <output>
                {visibleStep + 1}/{steps.length}
              </output>
            </label>
            <button
              disabled={paused || visibleStep === 0}
              onClick={() => {
                drag.release();
                setStepIndex(visibleStep - 1);
              }}
            >
              Bước trước
            </button>
            <button
              disabled={paused || visibleStep === steps.length - 1}
              onClick={() => {
                drag.release();
                setStepIndex(visibleStep + 1);
              }}
            >
              Bước tiếp
            </button>
          </>
        )}
        <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Lưới midpoint circle: kéo tâm, mũi tên dịch tâm, ngoặc vuông đổi bán kính, PageUp/PageDown chọn bước"
        onPointerDown={drag.startDrag}
        onPointerMove={drag.moveDrag}
        onPointerUp={drag.endDrag}
        onPointerCancel={(event) => drag.endDrag(event, true)}
        onLostPointerCapture={drag.release}
        onBlur={drag.release}
        onKeyDown={onKeyDown}
      />
      <p className="control-hint">
        Trắng: các điểm từ một phép phản chiếu, xanh: pixel đã vẽ, đỏ: đường tròn lý tưởng. Hình đặc
        tô các hàng ngang tới chính đường viền midpoint; r = 2 có 21 pixel, khác brush kiểm tâm
        trong đĩa ở Project 03 (13 pixel). Mũi tên dịch tâm, [ và ] đổi bán kính; Space tạm dừng, R
        đặt lại. Không có hoạt ảnh tự chạy.
      </p>
      <LabReadout
        items={[
          { label: "Tâm", value: `(${center.x}, ${center.y})` },
          { label: "Bán kính", value: radius },
          {
            label: "Offset đang tính",
            value: filled ? "Đã tô toàn hình" : `(${current.x}, ${current.y})`,
          },
          {
            label: "decision trước bước",
            value: filled ? "Không dùng trong bước tô" : current.decision,
          },
          { label: "Tổng pixel đang thấy", value: pixels.length },
        ]}
      />
    </div>
  );
}
