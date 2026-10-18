"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { clamp, type Point } from "@/lib/labs/geometry";
import { rectanglePixels } from "@/lib/labs/raster";
import { LabReadout, setupCanvas, useCanvasSize } from "./lab-shared";
import { drawRasterGrid, drawRasterPixels, rasterGridMetrics } from "./raster-grid";
import { useRasterDrag } from "./use-raster-drag";

const presets: Record<string, { a: Point; b: Point }> = {
  normal: { a: { x: 4, y: 3 }, b: { x: 15, y: 10 } },
  reverse: { a: { x: 15, y: 10 }, b: { x: 4, y: 3 } },
  point: { a: { x: 10, y: 6 }, b: { x: 10, y: 6 } },
  row: { a: { x: 3, y: 6 }, b: { x: 16, y: 6 } },
  column: { a: { x: 10, y: 2 }, b: { x: 10, y: 11 } },
};

export default function RasterRectangleLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedHandle = useRef<"a" | "b">("b");
  const size = useCanvasSize(canvasRef);
  const [corners, setCorners] = useState(presets.normal);
  const [preset, setPreset] = useState("normal");
  const [filled, setFilled] = useState(false);
  const [paused, setPaused] = useState(false);
  const columns = 20;
  const rows = 13;
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);
  const pixels = useMemo(() => rectanglePixels(corners.a, corners.b, filled), [corners, filled]);
  const width = Math.abs(corners.a.x - corners.b.x) + 1;
  const height = Math.abs(corners.a.y - corners.b.y) + 1;
  const rule = filled
    ? "width × height"
    : width === 1
      ? "height"
      : height === 1
        ? "width"
        : "2 × width + 2 × height − 4";
  const moveCorner = (point: Point) => {
    const key = selectedHandle.current;
    setCorners((value) => ({ ...value, [key]: point }));
    setPreset("custom");
  };
  const beginCorner = (point: Point) => {
    const a = Math.hypot(point.x - corners.a.x, point.y - corners.a.y);
    const b = Math.hypot(point.x - corners.b.x, point.y - corners.b.y);
    selectedHandle.current = a <= b ? "a" : "b";
    moveCorner(point);
  };
  const drag = useRasterDrag(canvasRef, size, grid, columns, rows, paused, beginCorner, moveCorner);
  const reset = () => {
    drag.release();
    setCorners(presets.normal);
    setPreset("normal");
    setFilled(false);
    setPaused(false);
  };
  const togglePause = () => {
    drag.release();
    setPaused((value) => !value);
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === " " || event.key.startsWith("Arrow")) {
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
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    drag.release();
    const key = event.shiftKey ? "a" : "b";
    setCorners((value) => ({
      ...value,
      [key]: {
        x: clamp(
          value[key].x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0),
          0,
          columns - 1,
        ),
        y: clamp(
          value[key].y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0),
          0,
          rows - 1,
        ),
      },
    }));
    setPreset("custom");
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    drawRasterPixels(ctx, grid, pixels, filled ? "#84a9ff" : "#53f0ae", columns, rows);
    for (const key of ["a", "b"] as const) {
      const point = corners[key];
      ctx.beginPath();
      ctx.arc(
        grid.ox + (point.x + 0.5) * grid.cell,
        grid.oy + (point.y + 0.5) * grid.cell,
        Math.min(6, grid.cell / 4),
        0,
        2 * Math.PI,
      );
      ctx.fillStyle = key === "a" ? "#ffb454" : "#ff6b6b";
      ctx.fill();
    }
    ctx.fillStyle = "#b6c3df";
    ctx.font = "11px ui-monospace";
    ctx.fillText(
      `${filled ? "Hình đặc" : "Đường viền"} · ${width} × ${height} · ${pixels.length} pixel`,
      16,
      22,
    );
  }, [size, grid, corners, filled, height, pixels, width]);

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Trường hợp
          <select
            value={preset}
            disabled={paused}
            onChange={(event) => {
              drag.release();
              setPreset(event.target.value);
              setCorners(presets[event.target.value]);
            }}
          >
            <option value="normal">Hai góc</option>
            <option value="reverse">Đảo góc</option>
            <option value="point">Một điểm</option>
            <option value="row">Một hàng</option>
            <option value="column">Một cột</option>
            {preset === "custom" && <option value="custom">Tự đặt</option>}
          </select>
        </label>
        <label>
          Kiểu vẽ
          <select
            value={filled ? "filled" : "outline"}
            disabled={paused}
            onChange={(event) => {
              drag.release();
              setFilled(event.target.value === "filled");
            }}
          >
            <option value="outline">Đường viền</option>
            <option value="filled">Hình đặc</option>
          </select>
        </label>
        <button
          disabled={paused}
          onClick={() => {
            drag.release();
            setCorners((value) => ({ a: value.b, b: value.a }));
            setPreset("custom");
          }}
        >
          Đảo hai góc
        </button>
        <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Lưới hình chữ nhật: kéo hai góc; mũi tên dịch B, Shift chọn A"
        onPointerDown={drag.startDrag}
        onPointerMove={drag.moveDrag}
        onPointerUp={drag.endDrag}
        onPointerCancel={(event) => drag.endDrag(event, true)}
        onLostPointerCapture={drag.release}
        onBlur={drag.release}
        onKeyDown={onKeyDown}
      />
      <p className="control-hint">
        Cả hai biên đều được lấy, nên hai góc (1,1) và (4,3) tạo hình 4 × 3 pixel, không phải 3 × 2.
        Kéo hai góc hoặc dùng mũi tên (Shift chọn A). Space tạm dừng, R đặt lại. Không có hoạt ảnh
        tự chạy.
      </p>
      <LabReadout
        items={[
          { label: "Góc A", value: `(${corners.a.x}, ${corners.a.y})` },
          { label: "Góc B", value: `(${corners.b.x}, ${corners.b.y})` },
          { label: "Kích thước lấy cả biên", value: `${width} × ${height}` },
          { label: "Số pixel", value: pixels.length },
          { label: "Quy tắc", value: rule },
        ]}
      />
    </div>
  );
}
