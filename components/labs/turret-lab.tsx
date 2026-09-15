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
  add as addVectors,
  clamp,
  length as vectorLength,
  normalize as normalizeVector,
  scale as scaleVector,
  subtract as subtractVectors,
  type Point,
} from "@/lib/labs/geometry";
import { normalizeAngle, pointOnUnitCircle, TAU } from "@/lib/labs/angle";
import {
  angleBetween,
  cosineBetween,
  crossZ,
  dot,
  isWithinViewCone,
  rejection,
  rotateTowards,
  scalarProjection,
  signedAngleBetween,
  vectorProjection,
} from "@/lib/labs/turret";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function TurretLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialTarget = { x: 220, y: 120 };
  const initialAngle = 0;
  const [target, setTarget] = useState<Point>(initialTarget);
  const [turretAngle, setTurretAngle] = useState(initialAngle);
  const turretAngleRef = useRef(initialAngle);
  const [turnSpeed, setTurnSpeed] = useState(Math.PI / 2);
  const [halfViewAngle, setHalfViewAngle] = useState((35 * Math.PI) / 180);
  const [paused, setPaused] = useState(false);
  const dragging = useRef(false);

  const showDot = mode !== "turret-scene";
  const showAngle =
    mode === undefined ||
    ["turret-angle", "turret-projection", "turret-rotation", "turret-view-cone"].includes(mode);
  const showProjection =
    mode === undefined ||
    ["turret-projection", "turret-rotation", "turret-view-cone"].includes(mode);
  const canRotate = mode === undefined || mode === "turret-rotation" || mode === "turret-view-cone";
  const showCone = mode === undefined || mode === "turret-view-cone";

  const setTurretAngleValue = useCallback((value: number) => {
    const normalized = normalizeAngle(value);
    turretAngleRef.current = normalized;
    setTurretAngle(normalized);
  }, []);

  const advanceSimulation = useCallback(
    (requestedDeltaTime: number) => {
      const deltaTime = clamp(requestedDeltaTime, 0, 0.1);
      setTurretAngleValue(rotateTowards(turretAngleRef.current, target, turnSpeed * deltaTime));
    },
    [setTurretAngleValue, target, turnSpeed],
  );

  useEffect(() => {
    if (!canRotate || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      advanceSimulation((now - previous) / 1000);
      previous = now;
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [advanceSimulation, canRotate, paused, reducedMotion]);

  const forward = useMemo(() => pointOnUnitCircle(turretAngle), [turretAngle]);
  const targetDirection = useMemo(() => normalizeVector(target), [target]);
  const rawDot = dot(forward, target);
  const normalizedDot = cosineBetween(forward, target);
  const unsignedAngle = angleBetween(forward, target);
  const signedAngle = signedAngleBetween(forward, target);
  const parallel = vectorProjection(target, forward);
  const perpendicular = rejection(target, forward);
  const locked = isWithinViewCone(forward, target, halfViewAngle);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const center = { x: size.width / 2, y: size.height / 2 };
    const toScreen = (point: Point) => ({ x: center.x + point.x, y: center.y - point.y });
    const targetScreen = toScreen(target);

    for (let x = center.x % 40; x < size.width; x += 40) {
      drawLine(ctx, { x, y: 0 }, { x, y: size.height }, "#18233a");
    }
    for (let y = center.y % 40; y < size.height; y += 40) {
      drawLine(ctx, { x: 0, y }, { x: size.width, y }, "#18233a");
    }
    drawLine(ctx, { x: 0, y: center.y }, { x: size.width, y: center.y }, "#394662", 1.5);
    drawLine(ctx, { x: center.x, y: 0 }, { x: center.x, y: size.height }, "#394662", 1.5);

    const drawWorldArrow = (vector: Point, color: string, label: string, width = 3) => {
      const end = toScreen(vector);
      drawLine(ctx, center, end, color, width);
      const backward = normalizeVector(subtractVectors(center, end));
      const side = { x: -backward.y, y: backward.x };
      const base = addVectors(end, scaleVector(backward, 13));
      drawLine(ctx, end, addVectors(base, scaleVector(side, 6)), color, width);
      drawLine(ctx, end, subtractVectors(base, scaleVector(side, 6)), color, width);
      ctx.fillStyle = color;
      ctx.font = "700 11px ui-monospace";
      ctx.fillText(label, end.x + 9, end.y - 9);
    };

    if (showCone) {
      const lower = pointOnUnitCircle(turretAngle - halfViewAngle);
      const upper = pointOnUnitCircle(turretAngle + halfViewAngle);
      drawWorldArrow(scaleVector(lower, 190), "#5b6884", "−halfAngle", 1.5);
      drawWorldArrow(scaleVector(upper, 190), "#5b6884", "+halfAngle", 1.5);
    }

    drawLine(ctx, center, targetScreen, "#46536e", 1.5);

    if (showProjection) {
      drawWorldArrow(parallel, "#84a9ff", "projection", 3);
      drawLine(ctx, toScreen(parallel), targetScreen, "#ff6b6b", 3);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "700 11px ui-monospace";
      ctx.fillText(
        "rejection",
        (toScreen(parallel).x + targetScreen.x) / 2 + 7,
        (toScreen(parallel).y + targetScreen.y) / 2 - 7,
      );
    }

    if (showAngle && vectorLength(target) > 1e-12) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, 48, -turretAngle, -(turretAngle + signedAngle), signedAngle > 0);
      ctx.strokeStyle = "#ffb454";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(center.x, center.y, 27, 0, TAU);
    ctx.fillStyle = "#2c3752";
    ctx.fill();
    drawWorldArrow(scaleVector(forward, 115), "#ffe26c", "forward", 4);

    ctx.beginPath();
    ctx.arc(targetScreen.x, targetScreen.y, 9, 0, TAU);
    ctx.fillStyle = showCone && locked ? "#53f0ae" : "#ff6b6b";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawLine(
      ctx,
      { x: targetScreen.x - 15, y: targetScreen.y },
      { x: targetScreen.x + 15, y: targetScreen.y },
      "#ffffff",
    );
    drawLine(
      ctx,
      { x: targetScreen.x, y: targetScreen.y - 15 },
      { x: targetScreen.x, y: targetScreen.y + 15 },
      "#ffffff",
    );
  }, [
    forward,
    halfViewAngle,
    locked,
    parallel,
    showAngle,
    showCone,
    showProjection,
    signedAngle,
    size,
    target,
    turretAngle,
  ]);

  const targetFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return { x: point.x - size.width / 2, y: size.height / 2 - point.y };
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTarget(targetFromEvent(event));
  };

  const moveTarget = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragging.current) setTarget(targetFromEvent(event));
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
    setTarget((current) => addVectors(current, delta[event.key]));
  };

  const reset = () => {
    setTarget(initialTarget);
    setTurretAngleValue(initialAngle);
    setTurnSpeed(Math.PI / 2);
    setHalfViewAngle((35 * Math.PI) / 180);
    setPaused(false);
  };

  const presets = [
    { label: "Cùng hướng", value: { x: 230, y: 0 } },
    { label: "Vuông góc", value: { x: 0, y: 190 } },
    { label: "Ngược hướng", value: { x: -230, y: 0 } },
    {
      label: "Chéo 35°",
      value: { x: Math.cos((35 * Math.PI) / 180) * 230, y: Math.sin((35 * Math.PI) / 180) * 230 },
    },
  ];

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Vị trí mẫu
          <select
            defaultValue="custom"
            onChange={(event) => {
              const preset = presets[Number(event.target.value)];
              if (preset) setTarget(preset.value);
              event.target.value = "custom";
            }}
          >
            <option value="custom">Tự kéo</option>
            {presets.map((preset, index) => (
              <option key={preset.label} value={index}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        {!canRotate && (
          <label>
            Góc nòng
            <input
              type="range"
              min="0"
              max={TAU}
              step={Math.PI / 180}
              value={turretAngle}
              onChange={(event) => setTurretAngleValue(Number(event.target.value))}
            />
            <output>{((turretAngle * 180) / Math.PI).toFixed(0)}°</output>
          </label>
        )}
        {canRotate && (
          <label>
            Tốc độ quay
            <input
              type="range"
              min="0"
              max={TAU}
              step="0.1"
              value={turnSpeed}
              onChange={(event) => setTurnSpeed(Number(event.target.value))}
            />
            <output>{turnSpeed.toFixed(2)} rad/s</output>
          </label>
        )}
        {showCone && (
          <label>
            Nửa góc khóa
            <input
              type="range"
              min={(5 * Math.PI) / 180}
              max={(90 * Math.PI) / 180}
              step={Math.PI / 180}
              value={halfViewAngle}
              onChange={(event) => setHalfViewAngle(Number(event.target.value))}
            />
            <output>{((halfViewAngle * 180) / Math.PI).toFixed(0)}°</output>
          </label>
        )}
        {reducedMotion && canRotate && (
          <span className="control-hint">Đã bật giảm chuyển động; dùng nút Tiến 0,1 s.</span>
        )}
        {canRotate && (
          <button onClick={() => setPaused((value) => !value)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {canRotate && (paused || reducedMotion) && (
          <button onClick={() => advanceSimulation(0.1)}>Tiến 0,1 s</button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveTarget}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Tháp pháo và mục tiêu; kéo hoặc nhấn các phím mũi tên để di chuyển mục tiêu"
      />
      <LabReadout
        items={[
          {
            label: "targetOffset",
            value: `(${target.x.toFixed(1)}, ${target.y.toFixed(1)}) · length=${vectorLength(target).toFixed(1)} px`,
          },
          { label: "forward", value: `(${forward.x.toFixed(3)}, ${forward.y.toFixed(3)})` },
          ...(showDot
            ? [
                { label: "raw dot", value: rawDot.toFixed(3) },
                { label: "normalized dot", value: normalizedDot.toFixed(6) },
              ]
            : []),
          ...(showAngle
            ? [
                {
                  label: "angle error",
                  value: `${((unsignedAngle * 180) / Math.PI).toFixed(2)}°; signed ${((signedAngle * 180) / Math.PI).toFixed(2)}°`,
                },
              ]
            : []),
          ...(showProjection
            ? [
                {
                  label: "scalar projection",
                  value: `${scalarProjection(target, forward).toFixed(2)} px`,
                },
                {
                  label: "rejection length",
                  value: `${vectorLength(perpendicular).toFixed(2)} px`,
                },
                {
                  label: "projection · rejection",
                  value: dot(parallel, perpendicular).toExponential(2),
                },
              ]
            : []),
          ...(canRotate
            ? [
                {
                  label: "crossZ",
                  value: `${crossZ(forward, targetDirection).toFixed(6)} · ${signedAngle > 1e-9 ? "quay ngược chiều kim đồng hồ" : signedAngle < -1e-9 ? "quay theo chiều kim đồng hồ" : "đã thẳng hướng"}`,
                },
              ]
            : []),
          ...(showCone
            ? [
                {
                  label: "view cone",
                  value: `${normalizedDot.toFixed(4)} ${locked ? "≥" : "<"} cos(${((halfViewAngle * 180) / Math.PI).toFixed(0)}°)=${Math.cos(halfViewAngle).toFixed(4)} · ${locked ? "LOCKED" : "SEARCHING"}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
