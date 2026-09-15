"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { add, type Point } from "@/lib/labs/geometry";
import {
  composeTransform,
  determinantLinearPart,
  polygonArea,
  rotatePoint,
  scalePoint,
  shearPoint,
  transformPoint,
  type TransformOrder,
  type TransformParameters,
} from "@/lib/labs/transform";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const HALF_EXTENT = 72;
const LOCAL_SQUARE: readonly Point[] = [
  { x: -HALF_EXTENT, y: -HALF_EXTENT },
  { x: HALF_EXTENT, y: -HALF_EXTENT },
  { x: HALF_EXTENT, y: HALF_EXTENT },
  { x: -HALF_EXTENT, y: HALF_EXTENT },
];
const INITIAL_TRANSLATION = { x: 35, y: 15 };

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  toScreen: (point: Point) => Point,
  color: string,
  width: number,
) {
  for (let index = 0; index < points.length; index += 1) {
    drawLine(
      ctx,
      toScreen(points[index]),
      toScreen(points[(index + 1) % points.length]),
      color,
      width,
    );
  }
}

function directTransform(point: Point, parameters: TransformParameters, order: TransformOrder) {
  if (order === "rotate-shear-scale") {
    const rotated = rotatePoint(point, parameters.angle);
    const sheared = shearPoint(rotated, parameters.shearX, parameters.shearY);
    return add(scalePoint(sheared, parameters.scaleX, parameters.scaleY), parameters.translation);
  }
  const scaled = scalePoint(point, parameters.scaleX, parameters.scaleY);
  const sheared = shearPoint(scaled, parameters.shearX, parameters.shearY);
  return add(rotatePoint(sheared, parameters.angle), parameters.translation);
}

function formatMatrix(values: readonly number[]) {
  return `[${values
    .slice(0, 3)
    .map((value) => value.toFixed(2))
    .join(" ")} ; ${values
    .slice(3, 6)
    .map((value) => value.toFixed(2))
    .join(" ")} ; ${values
    .slice(6, 9)
    .map((value) => value.toFixed(2))
    .join(" ")}]`;
}

export default function TransformLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const dragging = useRef(false);
  const [scaleX, setScaleX] = useState(1.25);
  const [scaleY, setScaleY] = useState(0.8);
  const [angle, setAngle] = useState(Math.PI / 6);
  const [shearX, setShearX] = useState(0.35);
  const [shearY, setShearY] = useState(0);
  const [translation, setTranslation] = useState<Point>(INITIAL_TRANSLATION);
  const [order, setOrder] = useState<TransformOrder>("scale-shear-rotate");
  const [paused, setPaused] = useState(true);

  const showScale = mode !== "transform-local";
  const showRotation =
    mode === undefined ||
    ["transform-rotation", "transform-shear", "transform-matrix", "transform-order"].includes(mode);
  const showShear =
    mode === undefined || ["transform-shear", "transform-matrix", "transform-order"].includes(mode);
  const showMatrix =
    mode === undefined || mode === "transform-matrix" || mode === "transform-order";
  const showOrder = mode === undefined || mode === "transform-order";

  useEffect(() => {
    if (!showOrder || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      setAngle((current) => current + deltaTime * 0.45);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, showOrder]);

  const parameters = useMemo<TransformParameters>(
    () => ({
      scaleX: showScale ? scaleX : 1,
      scaleY: showScale ? scaleY : 1,
      angle: showRotation ? angle : 0,
      shearX: showShear ? shearX : 0,
      shearY: showShear ? shearY : 0,
      translation,
    }),
    [angle, scaleX, scaleY, shearX, shearY, showRotation, showScale, showShear, translation],
  );
  const matrix = useMemo(
    () => composeTransform(parameters, showOrder ? order : "scale-shear-rotate"),
    [order, parameters, showOrder],
  );
  const transformed = useMemo(
    () => LOCAL_SQUARE.map((point) => transformPoint(matrix, point)),
    [matrix],
  );
  const determinant = determinantLinearPart(matrix);
  const originalArea = polygonArea(LOCAL_SQUARE);
  const transformedArea = polygonArea(transformed);
  const directVertex = directTransform(
    LOCAL_SQUARE[2],
    parameters,
    showOrder ? order : "scale-shear-rotate",
  );
  const matrixVertex = transformed[2];
  const matrixError = Math.hypot(directVertex.x - matrixVertex.x, directVertex.y - matrixVertex.y);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const center = { x: size.width / 2, y: size.height / 2 };
    const toScreen = (point: Point) => ({ x: center.x + point.x, y: center.y - point.y });

    for (let x = center.x % 40; x < size.width; x += 40) {
      drawLine(ctx, { x, y: 0 }, { x, y: size.height }, "#18233a");
    }
    for (let y = center.y % 40; y < size.height; y += 40) {
      drawLine(ctx, { x: 0, y }, { x: size.width, y }, "#18233a");
    }
    drawLine(ctx, { x: 0, y: center.y }, { x: size.width, y: center.y }, "#394662", 1.5);
    drawLine(ctx, { x: center.x, y: 0 }, { x: center.x, y: size.height }, "#394662", 1.5);

    const localAtWorld = LOCAL_SQUARE.map((point) => add(point, translation));
    drawPolygon(ctx, localAtWorld, toScreen, "#53617d", 1.5);
    drawPolygon(ctx, transformed, toScreen, "#53f0ae", 3);

    const transformedOrigin = transformPoint(matrix, { x: 0, y: 0 });
    const transformedX = transformPoint(matrix, { x: 92, y: 0 });
    const transformedY = transformPoint(matrix, { x: 0, y: 92 });
    drawLine(ctx, toScreen(transformedOrigin), toScreen(transformedX), "#ff6b6b", 3);
    drawLine(ctx, toScreen(transformedOrigin), toScreen(transformedY), "#84a9ff", 3);

    if (mode === "transform-matrix") {
      const source = LOCAL_SQUARE[2];
      const scaled = scalePoint(source, parameters.scaleX, parameters.scaleY);
      const sheared = shearPoint(scaled, parameters.shearX, parameters.shearY);
      const rotated = rotatePoint(sheared, parameters.angle);
      const stages = [source, scaled, sheared, rotated, add(rotated, parameters.translation)];
      for (let index = 0; index < stages.length - 1; index += 1) {
        drawLine(ctx, toScreen(stages[index]), toScreen(stages[index + 1]), "#ffb454", 1.5);
      }
      for (const [index, stage] of stages.entries()) {
        const screen = toScreen(stage);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffb454";
        ctx.fill();
        ctx.fillStyle = "#f7f9ff";
        ctx.font = "700 10px ui-monospace";
        ctx.fillText(String(index), screen.x + 7, screen.y - 7);
      }
    }

    for (const [index, point] of transformed.entries()) {
      const screen = toScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#53f0ae";
      ctx.fill();
      ctx.fillStyle = "#f7f9ff";
      ctx.font = "700 10px ui-monospace";
      ctx.fillText(`P${index}`, screen.x + 7, screen.y - 7);
    }

    const originScreen = toScreen(transformedOrigin);
    ctx.beginPath();
    ctx.arc(originScreen.x, originScreen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe26c";
    ctx.fill();
  }, [matrix, mode, parameters, size, transformed, translation]);

  const translationFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return { x: point.x - size.width / 2, y: size.height / 2 - point.y };
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTranslation(translationFromEvent(event));
  };

  const moveOrigin = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragging.current) setTranslation(translationFromEvent(event));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -10, y: 0 },
      ArrowRight: { x: 10, y: 0 },
      ArrowUp: { x: 0, y: 10 },
      ArrowDown: { x: 0, y: -10 },
    };
    if (!delta[event.key]) return;
    event.preventDefault();
    setTranslation((current) => add(current, delta[event.key]));
  };

  const reset = () => {
    setScaleX(1.25);
    setScaleY(0.8);
    setAngle(Math.PI / 6);
    setShearX(0.35);
    setShearY(0);
    setTranslation(INITIAL_TRANSLATION);
    setOrder("scale-shear-rotate");
    setPaused(true);
  };

  const applyPreset = (value: string) => {
    if (value === "identity") {
      setScaleX(1);
      setScaleY(1);
      setAngle(0);
      setShearX(0);
      setShearY(0);
    }
    if (value === "rotation") {
      setScaleX(1);
      setScaleY(1);
      setAngle(Math.PI / 4);
      setShearX(0);
      setShearY(0);
    }
    if (value === "shear") {
      setScaleX(1);
      setScaleY(1);
      setAngle(0);
      setShearX(0.8);
      setShearY(0);
    }
    if (value === "reflection") {
      setScaleX(-1);
      setScaleY(1);
      setAngle(0);
      setShearX(0);
      setShearY(0);
    }
    if (value === "composed") reset();
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select defaultValue="composed" onChange={(event) => applyPreset(event.target.value)}>
            <option value="identity">Identity</option>
            <option value="rotation">Xoay 45°</option>
            <option value="shear">Shear X</option>
            <option value="reflection">Phản chiếu X</option>
            <option value="composed">Ghép nhiều phép</option>
          </select>
        </label>
        {showScale && (
          <>
            <label>
              scaleX
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                value={scaleX}
                onChange={(event) => setScaleX(Number(event.target.value))}
              />
              <output>{scaleX.toFixed(2)}</output>
            </label>
            <label>
              scaleY
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                value={scaleY}
                onChange={(event) => setScaleY(Number(event.target.value))}
              />
              <output>{scaleY.toFixed(2)}</output>
            </label>
          </>
        )}
        {showRotation && (
          <label>
            angle
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={Math.PI / 180}
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
            />
            <output>{((angle * 180) / Math.PI).toFixed(0)}°</output>
          </label>
        )}
        {showShear && (
          <>
            <label>
              shearX
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={shearX}
                onChange={(event) => setShearX(Number(event.target.value))}
              />
              <output>{shearX.toFixed(2)}</output>
            </label>
            <label>
              shearY
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={shearY}
                onChange={(event) => setShearY(Number(event.target.value))}
              />
              <output>{shearY.toFixed(2)}</output>
            </label>
          </>
        )}
        {showOrder && (
          <label>
            Thứ tự
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as TransformOrder)}
            >
              <option value="scale-shear-rotate">Scale → Shear → Rotate</option>
              <option value="rotate-shear-scale">Rotate → Shear → Scale</option>
            </select>
          </label>
        )}
        {showOrder && (
          <button onClick={() => setPaused((value) => !value)}>
            {paused ? "Chạy tự động" : "Tạm dừng"}
          </button>
        )}
        {showOrder && (paused || reducedMotion) && (
          <button onClick={() => setAngle((current) => current + Math.PI / 36)}>Tiến 5°</button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveOrigin}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Hình vuông sau biến đổi; kéo hoặc dùng phím mũi tên để di chuyển gốc của vật thể"
      />
      <LabReadout
        items={[
          {
            label: "local P2",
            value: `(${LOCAL_SQUARE[2].x.toFixed(1)}, ${LOCAL_SQUARE[2].y.toFixed(1)})`,
          },
          {
            label: "world P2",
            value: `(${matrixVertex.x.toFixed(2)}, ${matrixVertex.y.toFixed(2)})`,
          },
          ...(showMatrix
            ? [
                { label: "composed matrix", value: formatMatrix(matrix) },
                { label: "direct vs matrix", value: `error=${matrixError.toExponential(2)}` },
              ]
            : []),
          ...(showScale || showShear
            ? [
                {
                  label: "determinant",
                  value: `${determinant.toFixed(4)} · ${determinant < 0 ? "đã phản chiếu" : "giữ chiều"}`,
                },
                {
                  label: "area ratio",
                  value: `${(transformedArea / originalArea).toFixed(4)} ≈ |det| ${Math.abs(determinant).toFixed(4)}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
