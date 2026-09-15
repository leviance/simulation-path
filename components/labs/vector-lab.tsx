"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  add as addVectors,
  clamp,
  length as vectorLength,
  lerp as lerpVector,
  normalize as normalizeVector,
  scale as scaleVector,
  subtract as subtractVectors,
  type Point,
} from "@/lib/labs/geometry";
import { LabReadout, canvasPoint, drawLine, setupCanvas, useCanvasSize } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const vectorPresets: Record<string, { a: Point; b: Point }> = {
  basic: { a: { x: 3, y: 1.5 }, b: { x: -1, y: 2.5 } },
  perpendicular: { a: { x: 3, y: 0 }, b: { x: 0, y: 2 } },
  opposite: { a: { x: 3, y: 1 }, b: { x: -3, y: -1 } },
  zero: { a: { x: 0, y: 0 }, b: { x: 2, y: 2 } },
};

export default function VectorLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [vectors, setVectors] = useState(vectorPresets.basic);
  const [preset, setPreset] = useState("basic");
  const [scalar, setScalar] = useState(0.5);
  const [interpolation, setInterpolation] = useState(0.5);
  const [paused, setPaused] = useState(false);
  const [activeTarget, setActiveTarget] = useState<"a" | "b" | null>(null);
  const [cursorScreen, setCursorScreen] = useState<Point | null>(null);
  const dragging = useRef<"a" | "b" | null>(null);
  const showDragDetails = mode === "vector-drag";
  const showArithmetic = mode === undefined || mode === "vector-addition";
  const showNormalize =
    mode === undefined || mode === "vector-magnitude" || mode === "vector-normalize";
  const showScalar = mode === undefined || mode === "vector-scalar-distance";
  const showDistance = mode === undefined || mode === "vector-scalar-distance";
  const showLerp = mode === undefined || mode === "vector-normalize";
  const scale = Math.max(34, Math.min(58, size.width / 16));
  const center = { x: size.width * 0.5, y: size.height * 0.54 };
  const sum = addVectors(vectors.a, vectors.b);
  const difference = subtractVectors(vectors.a, vectors.b);
  const unitA = normalizeVector(vectors.a);
  const scaledA = scaleVector(vectors.a, scalar);
  const lerped = lerpVector(vectors.a, vectors.b, interpolation);

  const toScreen = useCallback(
    (world: Point): Point => ({
      x: center.x + world.x * scale,
      y: center.y - world.y * scale,
    }),
    [center.x, center.y, scale],
  );

  const toWorld = useCallback(
    (screen: Point): Point => ({
      x: (screen.x - center.x) / scale,
      y: (center.y - screen.y) / scale,
    }),
    [center.x, center.y, scale],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const firstX = center.x % scale;
    const firstY = center.y % scale;
    for (let x = firstX; x < size.width; x += scale) {
      drawLine(ctx, { x, y: 0 }, { x, y: size.height }, "#1d2943");
    }
    for (let y = firstY; y < size.height; y += scale) {
      drawLine(ctx, { x: 0, y }, { x: size.width, y }, "#1d2943");
    }
    drawLine(ctx, { x: 0, y: center.y }, { x: size.width, y: center.y }, "#63708d", 2);
    drawLine(ctx, { x: center.x, y: 0 }, { x: center.x, y: size.height }, "#63708d", 2);

    const drawArrow = (
      startWorld: Point,
      endWorld: Point,
      color: string,
      label: string,
      dashed = false,
    ) => {
      const start = toScreen(startWorld);
      const end = toScreen(endWorld);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const magnitude = Math.hypot(dx, dy);
      ctx.save();
      if (dashed) ctx.setLineDash([6, 5]);
      drawLine(ctx, start, end, color, 2.5);
      ctx.restore();
      if (magnitude > 1e-6) {
        const ux = dx / magnitude;
        const uy = dy / magnitude;
        const base = { x: end.x - ux * 14, y: end.y - uy * 14 };
        const perpendicular = { x: -uy, y: ux };
        drawLine(
          ctx,
          end,
          { x: base.x + perpendicular.x * 6, y: base.y + perpendicular.y * 6 },
          color,
          2.5,
        );
        drawLine(
          ctx,
          end,
          { x: base.x - perpendicular.x * 6, y: base.y - perpendicular.y * 6 },
          color,
          2.5,
        );
      }
      ctx.fillStyle = color;
      ctx.font = "700 12px ui-monospace";
      ctx.fillText(label, end.x + 9, end.y - 9);
    };

    const origin = { x: 0, y: 0 };
    drawArrow(origin, vectors.a, "#53f0ae", "A");
    drawArrow(origin, vectors.b, "#84a9ff", "B");

    if (showDragDetails) {
      (["a", "b"] as const).forEach((key) => {
        const point = toScreen(vectors[key]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = activeTarget === key ? "#ffe26c" : "#7f8daa";
        ctx.lineWidth = activeTarget === key ? 3 : 1.5;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    if (showArithmetic) {
      drawArrow(origin, sum, "#ffb454", "A+B");
      drawArrow(origin, difference, "#ff6b6b", "A−B");
      drawArrow(vectors.a, sum, "#4b5875", "", true);
      drawArrow(vectors.b, sum, "#4b5875", "", true);
      drawArrow(vectors.b, vectors.a, "#ae5b68", "A−B moved", true);
    }
    if (showDistance) {
      drawLine(ctx, toScreen(vectors.a), toScreen(vectors.b), "#7e8ba6", 2);
    }
    if (showScalar) {
      drawArrow(origin, scaledA, "#c678ff", "sA");
    }
    if (showNormalize) drawArrow(origin, unitA, "#ffffff", "Â");
    if (showLerp) {
      drawLine(ctx, toScreen(vectors.a), toScreen(vectors.b), "#4b7480", 2);
      const point = toScreen(lerped);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe26c";
      ctx.fill();
      ctx.fillStyle = "#ffe26c";
      ctx.font = "700 11px ui-monospace";
      ctx.fillText("lerp", point.x + 9, point.y + 4);
    }

    (["a", "b"] as const).forEach((key) => {
      const point = toScreen(vectors[key]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = paused ? "#6f7d9c" : key === "a" ? "#53f0ae" : "#84a9ff";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });
  }, [
    activeTarget,
    center.x,
    center.y,
    difference,
    lerped,
    paused,
    scale,
    scaledA,
    showArithmetic,
    showDistance,
    showDragDetails,
    showLerp,
    showNormalize,
    showScalar,
    size,
    sum,
    toScreen,
    unitA,
    vectors,
  ]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) =>
    canvasPoint(event, event.currentTarget);

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = pointFromEvent(event);
    const endpointA = toScreen(vectors.a);
    const endpointB = toScreen(vectors.b);
    const distanceA = Math.hypot(point.x - endpointA.x, point.y - endpointA.y);
    const distanceB = Math.hypot(point.x - endpointB.x, point.y - endpointB.y);
    if (showDragDetails) {
      setCursorScreen(point);
    }
    if (Math.min(distanceA, distanceB) > 20) {
      if (showDragDetails) {
        setActiveTarget(null);
      }
      return;
    }
    dragging.current = distanceA <= distanceB ? "a" : "b";
    if (showDragDetails) {
      setActiveTarget(dragging.current);
    }
    setPreset("custom");
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveEndpoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = pointFromEvent(event);
    if (showDragDetails) {
      setCursorScreen(point);
    }
    if (!dragging.current) return;
    const key = dragging.current;
    const world = toWorld(point);
    setVectors((current) => ({
      ...current,
      [key]: {
        x: clamp(world.x, -7, 7),
        y: clamp(world.y, -4.5, 4.5),
      },
    }));
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const key = event.shiftKey ? "a" : "b";
    setPreset("custom");
    setVectors((current) => ({
      ...current,
      [key]: {
        x: clamp(
          current[key].x +
            (event.key === "ArrowRight" ? 0.25 : event.key === "ArrowLeft" ? -0.25 : 0),
          -7,
          7,
        ),
        y: clamp(
          current[key].y + (event.key === "ArrowUp" ? 0.25 : event.key === "ArrowDown" ? -0.25 : 0),
          -4.5,
          4.5,
        ),
      },
    }));
  };

  const reset = () => {
    setVectors(vectorPresets.basic);
    setPreset("basic");
    setScalar(0.5);
    setInterpolation(0.5);
    setActiveTarget(null);
    setCursorScreen(null);
    dragging.current = null;
    setPaused(false);
  };

  const stopDrag = () => {
    dragging.current = null;
    setActiveTarget(null);
  };

  const cursorWorld = cursorScreen ? toWorld(cursorScreen) : null;

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Trường hợp
          <select
            value={preset}
            onChange={(event) => {
              const value = event.target.value;
              setPreset(value);
              if (vectorPresets[value]) setVectors(vectorPresets[value]);
            }}
            disabled={paused}
          >
            <option value="basic">Hai hướng khác nhau</option>
            <option value="perpendicular">Vuông góc</option>
            <option value="opposite">Đối hướng</option>
            <option value="zero">A bằng zero</option>
            {preset === "custom" && <option value="custom">Tự chỉnh</option>}
          </select>
        </label>
        {showScalar && (
          <label>
            Scalar
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={scalar}
              onChange={(event) => setScalar(Number(event.target.value))}
              disabled={paused}
            />
            <output>{scalar.toFixed(1)}</output>
          </label>
        )}
        {showLerp && (
          <label>
            t
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={interpolation}
              onChange={(event) => setInterpolation(Number(event.target.value))}
              disabled={paused}
            />
            <output>{interpolation.toFixed(2)}</output>
          </label>
        )}
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveEndpoint}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Mô phỏng vector 2D; dùng phím mũi tên để di chuyển B và giữ Shift cùng phím mũi tên để di chuyển A"
      />
      <LabReadout
        items={[
          {
            label: "A",
            value: `(${vectors.a.x.toFixed(2)}, ${vectors.a.y.toFixed(2)}) · |A|=${vectorLength(vectors.a).toFixed(3)}`,
          },
          {
            label: "B",
            value: `(${vectors.b.x.toFixed(2)}, ${vectors.b.y.toFixed(2)}) · |B|=${vectorLength(vectors.b).toFixed(3)}`,
          },
          ...(showArithmetic
            ? [
                { label: "A+B", value: `(${sum.x.toFixed(2)}, ${sum.y.toFixed(2)})` },
                { label: "A−B", value: `(${difference.x.toFixed(2)}, ${difference.y.toFixed(2)})` },
              ]
            : []),
          ...(showDragDetails
            ? [
                { label: "Vùng chọn", value: "20 px quanh mỗi endpoint" },
                {
                  label: "Con trỏ screen",
                  value: cursorScreen
                    ? `(${cursorScreen.x.toFixed(1)}, ${cursorScreen.y.toFixed(1)}) px`
                    : "Di chuyển chuột trên lab",
                },
                {
                  label: "Con trỏ world",
                  value: cursorWorld
                    ? `(${cursorWorld.x.toFixed(2)}, ${cursorWorld.y.toFixed(2)})`
                    : "—",
                },
                { label: "Đang kéo", value: activeTarget ? activeTarget.toUpperCase() : "Không" },
              ]
            : []),
          ...(showNormalize
            ? [
                {
                  label: "normalize(A)",
                  value: `(${unitA.x.toFixed(3)}, ${unitA.y.toFixed(3)}) · length=${vectorLength(unitA).toFixed(3)}`,
                },
              ]
            : []),
          ...(showScalar
            ? [{ label: "scalar × A", value: `(${scaledA.x.toFixed(2)}, ${scaledA.y.toFixed(2)})` }]
            : []),
          ...(showDistance
            ? [
                {
                  label: "distance(A,B)",
                  value: vectorLength(subtractVectors(vectors.b, vectors.a)).toFixed(3),
                },
              ]
            : []),
          ...(showLerp
            ? [
                {
                  label: "lerp(A,B,t)",
                  value: `(${lerped.x.toFixed(2)}, ${lerped.y.toFixed(2)}) tại t=${interpolation.toFixed(2)}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
