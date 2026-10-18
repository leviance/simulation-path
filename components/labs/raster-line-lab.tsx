"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { clamp, type Point } from "@/lib/labs/geometry";
import { bresenhamSteps, ddaSteps } from "@/lib/labs/raster";
import { LabReadout, drawLine, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import { drawRasterGrid, drawRasterPixels, rasterGridMetrics } from "./raster-grid";
import { useRasterDrag } from "./use-raster-drag";
import type { InteractiveLabMode } from "./types";

const presets: Record<string, { a: Point; b: Point }> = {
  gentle: { a: { x: 2, y: 3 }, b: { x: 17, y: 10 } },
  steep: { a: { x: 5, y: 11 }, b: { x: 10, y: 1 } },
  reverse: { a: { x: 18, y: 2 }, b: { x: 2, y: 9 } },
  point: { a: { x: 10, y: 6 }, b: { x: 10, y: 6 } },
  tie: { a: { x: 8, y: 6 }, b: { x: 10, y: 7 } },
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
  const selectedHandle = useRef<"a" | "b">("b");
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialAlgorithm = mode === "raster-dda" ? "dda" : "bresenham";
  const initialPreset =
    mode === "raster-octants" ? "octant1" : mode === "raster-validation" ? "tie" : "gentle";
  const [algorithm, setAlgorithm] = useState(initialAlgorithm);
  const [preset, setPreset] = useState(initialPreset);
  const [endpoints, setEndpoints] = useState(presets[initialPreset]);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const columns = 20;
  const rows = 13;
  const grid = useMemo(() => rasterGridMetrics(size, columns, rows), [size]);
  const steps = useMemo(
    () =>
      algorithm === "dda"
        ? ddaSteps(endpoints.a, endpoints.b)
        : bresenhamSteps(endpoints.a, endpoints.b),
    [algorithm, endpoints],
  );
  const visibleStep = clamp(stepIndex, 0, steps.length - 1);
  const current = steps[visibleStep];
  const detail =
    algorithm === "dda"
      ? `x=${current.x?.toFixed(3)} · y=${current.y?.toFixed(3)}`
      : `error=${current.error} · e2=${current.e2} · bước tiếp: ${current.movesX ? "X" : ""}${current.movesY ? "Y" : ""}${!current.movesX && !current.movesY ? "dừng" : ""}`;

  const moveEndpoint = (point: Point) => {
    const key = selectedHandle.current;
    setEndpoints((value) => ({ ...value, [key]: point }));
    setPreset("custom");
    setStepIndex(0);
  };
  const beginEndpoint = (point: Point) => {
    const a = Math.hypot(point.x - endpoints.a.x, point.y - endpoints.a.y);
    const b = Math.hypot(point.x - endpoints.b.x, point.y - endpoints.b.y);
    selectedHandle.current = a <= b ? "a" : "b";
    moveEndpoint(point);
  };
  const drag = useRasterDrag(
    canvasRef,
    size,
    grid,
    columns,
    rows,
    paused,
    beginEndpoint,
    moveEndpoint,
  );
  const reset = () => {
    drag.release();
    setEndpoints(presets[initialPreset]);
    setAlgorithm(initialAlgorithm);
    setPreset(initialPreset);
    setStepIndex(0);
    setPaused(false);
  };
  const togglePause = () => {
    drag.release();
    setPaused((value) => !value);
  };
  const selectPreset = (value: string) => {
    drag.release();
    if (!presets[value]) return;
    setPreset(value);
    setEndpoints(presets[value]);
    setStepIndex(0);
  };
  const swap = () => {
    drag.release();
    setEndpoints((value) => ({ a: value.b, b: value.a }));
    setPreset("custom");
    setStepIndex(0);
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    drawRasterGrid(ctx, grid, columns, rows);
    const screen = (point: Point) => ({
      x: grid.ox + (point.x + 0.5) * grid.cell,
      y: grid.oy + (point.y + 0.5) * grid.cell,
    });
    drawLine(ctx, screen(endpoints.a), screen(endpoints.b), "#ff6b6b", 1.5);
    drawRasterPixels(
      ctx,
      grid,
      steps.slice(0, visibleStep + 1).map((step) => step.point),
      "#53f0ae",
      columns,
      rows,
    );
    drawRasterPixels(ctx, grid, [current.point], "#ffffff", columns, rows);
    for (const key of ["a", "b"] as const) {
      const point = screen(endpoints[key]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.min(6, grid.cell / 4), 0, 2 * Math.PI);
      ctx.fillStyle = key === "a" ? "#ffb454" : "#84a9ff";
      ctx.fill();
    }
    ctx.fillStyle = "#b6c3df";
    ctx.font = "11px ui-monospace";
    ctx.fillText(`Bước ${visibleStep + 1}/${steps.length} · ${detail}`, 16, 22);
  }, [size, grid, endpoints, steps, current, visibleStep, detail]);

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
    if (["PageUp", "PageDown", "Home", "End"].includes(event.key)) {
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
    const key = event.shiftKey ? "a" : "b";
    setEndpoints((value) => ({
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
              disabled={paused}
              onChange={(event) => {
                drag.release();
                setAlgorithm(event.target.value);
                setStepIndex(0);
              }}
            >
              <option value="dda">DDA</option>
              <option value="bresenham">Bresenham</option>
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
            disabled={paused}
            onChange={(event) => selectPreset(event.target.value)}
          >
            {mode === "raster-octants" ? (
              Array.from({ length: 8 }, (_, index) => (
                <option key={index} value={`octant${index + 1}`}>
                  Octant {index + 1}
                </option>
              ))
            ) : (
              <>
                <option value="gentle">Dốc thấp</option>
                <option value="steep">Dốc cao</option>
                <option value="reverse">Đảo hướng</option>
                <option value="point">Một điểm</option>
                <option value="tie">Giữa hai lựa chọn</option>
              </>
            )}
            {preset === "custom" && <option value="custom">Tự đặt</option>}
          </select>
        </label>
        <button onClick={swap} disabled={paused}>
          Đảo A/B
        </button>
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
        <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Lưới raster đường thẳng: kéo A/B hoặc dùng mũi tên; Shift chọn A; PageUp/PageDown đổi bước"
        onPointerDown={drag.startDrag}
        onPointerMove={drag.moveDrag}
        onPointerUp={drag.endDrag}
        onPointerCancel={(event) => drag.endDrag(event, true)}
        onLostPointerCapture={drag.release}
        onBlur={drag.release}
        onKeyDown={onKeyDown}
      />
      <p className="control-hint">
        Cam: A, xanh lam: B; đỏ: đường lý tưởng; trắng: pixel ở bước hiện tại. Mũi tên dịch B, Shift
        + mũi tên dịch A; PageUp/PageDown chọn bước, Home/End chọn đầu/cuối. Space tạm dừng thao
        tác, R đặt lại. Mô phỏng chỉ thay đổi khi bạn điều khiển
        {reducedMotion ? " — không có hoạt ảnh tự chạy" : ""}.
      </p>
      <LabReadout
        items={[
          { label: "Thuật toán", value: algorithm === "dda" ? "DDA" : "Bresenham" },
          { label: "Điểm A", value: `(${endpoints.a.x}, ${endpoints.a.y})` },
          { label: "Điểm B", value: `(${endpoints.b.x}, ${endpoints.b.y})` },
          { label: "Pixel được chọn", value: `(${current.point.x}, ${current.point.y})` },
          { label: "Trạng thái trước bước", value: detail },
          { label: "Số pixel toàn đoạn", value: steps.length },
        ]}
      />
    </div>
  );
}
