"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { clamp } from "@/lib/labs/geometry";
import { rectanglePixels } from "@/lib/labs/raster";
import { LabReadout, setupCanvas, useCanvasSize } from "./lab-shared";
import { drawRasterGrid, rasterGridMetrics, rasterPointFromEvent } from "./raster-grid";

export default function RasterRectangleLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const initialCorners = { a: { x: 4, y: 3 }, b: { x: 15, y: 10 } };
  const [corners, setCorners] = useState(initialCorners);
  const [filled, setFilled] = useState(false);
  const [paused, setPaused] = useState(false);
  const dragging = useRef<"a" | "b" | null>(null);
  const columns = 20;
  const rows = 13;
  const pixels = useMemo(() => rectanglePixels(corners.a, corners.b, filled), [corners, filled]);
  const width = Math.abs(corners.b.x - corners.a.x) + 1;
  const height = Math.abs(corners.b.y - corners.a.y) + 1;
  const outlineRule =
    width === 1 ? "height" : height === 1 ? "width" : "2 × width + 2 × height − 4";
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    const { cell, ox, oy } = grid;
    for (const point of pixels) {
      ctx.fillStyle = paused ? "#6f7d9c" : filled ? "#84a9ff" : "#53f0ae";
      ctx.fillRect(ox + point.x * cell + 2, oy + point.y * cell + 2, cell - 4, cell - 4);
    }
    (["a", "b"] as const).forEach((key) => {
      const point = corners[key];
      ctx.beginPath();
      ctx.arc(ox + (point.x + 0.5) * cell, oy + (point.y + 0.5) * cell, 7, 0, Math.PI * 2);
      ctx.fillStyle = key === "a" ? "#ffb454" : "#ff6b6b";
      ctx.fill();
    });
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText(
      `${filled ? "filled" : "outline"} · ${width} × ${height} · ${pixels.length} pixels`,
      20,
      22,
    );
  }, [corners, filled, grid, height, paused, pixels, size, width]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    rasterPointFromEvent(event, grid, { maxX: columns - 1, maxY: rows - 1 });

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = pointFromEvent(event);
    const distanceA = Math.hypot(point.x - corners.a.x, point.y - corners.a.y);
    const distanceB = Math.hypot(point.x - corners.b.x, point.y - corners.b.y);
    dragging.current = distanceA <= distanceB ? "a" : "b";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCorner = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || !dragging.current) return;
    const key = dragging.current;
    setCorners((current) => ({ ...current, [key]: pointFromEvent(event) }));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const key = event.shiftKey ? "a" : "b";
    setCorners((current) => ({
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
  };

  const reset = () => {
    setCorners(initialCorners);
    setFilled(false);
    setPaused(false);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Kiểu vẽ
          <select
            value={filled ? "filled" : "outline"}
            onChange={(event) => setFilled(event.target.value === "filled")}
            disabled={paused}
          >
            <option value="outline">Đường viền</option>
            <option value="filled">Hình đặc</option>
          </select>
        </label>
        <button
          onClick={() => setCorners((current) => ({ a: current.b, b: current.a }))}
          disabled={paused}
        >
          Đảo hai góc
        </button>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveCorner}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Lưới hình chữ nhật; kéo hai góc, dùng phím mũi tên cho góc B hoặc Shift cộng phím mũi tên cho góc A"
      />
      <LabReadout
        items={[
          { label: "Góc A", value: `(${corners.a.x}, ${corners.a.y})` },
          { label: "Góc B", value: `(${corners.b.x}, ${corners.b.y})` },
          { label: "Kích thước lấy cả biên", value: `${width} × ${height}` },
          { label: "Số pixel", value: pixels.length },
          { label: "Quy tắc", value: filled ? "width × height" : outlineRule },
        ]}
      />
    </div>
  );
}
