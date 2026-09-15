"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { clamp, type Point } from "@/lib/labs/geometry";
import { screenToWorld, worldToScreen, zoomCameraAt, type Camera } from "@/lib/labs/coordinate";
import { LabReadout, canvasPoint, drawLine, setupCanvas, useCanvasSize } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const cameraPresets: Record<string, Camera> = {
  origin: { x: 0, y: 0, zoom: 55 },
  offset: { x: 2.5, y: -1.5, zoom: 45 },
  close: { x: -1, y: 1, zoom: 110 },
};

export default function CoordinateLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [camera, setCamera] = useState<Camera>(cameraPresets.origin);
  const [preset, setPreset] = useState("origin");
  const [cursor, setCursor] = useState<Point>({ x: 200, y: 160 });
  const [paused, setPaused] = useState(false);
  const [anchorError, setAnchorError] = useState(0);
  const dragOrigin = useRef<Point | null>(null);
  const canPanAndZoom = mode === undefined || mode === "coordinate-zoom";
  const cursorWorld = screenToWorld(cursor, camera, size);
  const restoredCursor = worldToScreen(cursorWorld, camera, size);
  const roundTripError = Math.hypot(restoredCursor.x - cursor.x, restoredCursor.y - cursor.y);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    const left = camera.x - size.width / (2 * camera.zoom);
    const right = camera.x + size.width / (2 * camera.zoom);
    const bottom = camera.y - size.height / (2 * camera.zoom);
    const top = camera.y + size.height / (2 * camera.zoom);
    for (let x = Math.floor(left); x <= Math.ceil(right); x += 1) {
      const screen = worldToScreen({ x, y: 0 }, camera, size);
      drawLine(
        ctx,
        { x: screen.x, y: 0 },
        { x: screen.x, y: size.height },
        x === 0 ? "#63708d" : "#1d2943",
        x === 0 ? 2 : 1,
      );
      if (x !== 0) {
        ctx.fillStyle = "#6f7d9c";
        ctx.font = "10px ui-monospace";
        ctx.fillText(String(x), screen.x + 4, worldToScreen({ x: 0, y: 0 }, camera, size).y - 5);
      }
    }
    for (let y = Math.floor(bottom); y <= Math.ceil(top); y += 1) {
      const screen = worldToScreen({ x: 0, y }, camera, size);
      drawLine(
        ctx,
        { x: 0, y: screen.y },
        { x: size.width, y: screen.y },
        y === 0 ? "#63708d" : "#1d2943",
        y === 0 ? 2 : 1,
      );
    }
    const world = screenToWorld(cursor, camera, size);
    const restored = worldToScreen(world, camera, size);
    const error = Math.hypot(restored.x - cursor.x, restored.y - cursor.y);
    ctx.beginPath();
    ctx.arc(restored.x, restored.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = paused ? "#6f7d9c" : "#53f0ae";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(16, 16, 320, 96);
    ctx.fillStyle = "#9aa6c1";
    ctx.font = "11px ui-monospace";
    ctx.fillText(`SCREEN  (${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)})`, 28, 39);
    ctx.fillStyle = "#53f0ae";
    ctx.fillText(`WORLD   (${world.x.toFixed(3)}, ${world.y.toFixed(3)})`, 28, 61);
    ctx.fillStyle = error < 1e-9 ? "#84a9ff" : "#ff6b6b";
    ctx.fillText(`ROUND TRIP ERROR  ${error.toExponential(2)} px`, 28, 83);
    ctx.fillStyle = anchorError < 1e-9 ? "#84a9ff" : "#ff6b6b";
    ctx.fillText(`ZOOM ANCHOR ERROR ${anchorError.toExponential(2)} world`, 28, 103);
  }, [anchorError, camera, cursor, paused, size]);

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    const point = canvasPoint(event, event.currentTarget);
    setCursor(point);
    if (dragOrigin.current) {
      const dx = point.x - dragOrigin.current.x;
      const dy = point.y - dragOrigin.current.y;
      setPreset("custom");
      setCamera((current) => ({
        ...current,
        x: current.x - dx / current.zoom,
        y: current.y + dy / current.zoom,
      }));
      dragOrigin.current = point;
    }
  };
  const zoomAt = (point: Point, factor: number) => {
    setPreset("custom");
    const result = zoomCameraAt(camera, point, factor, size);
    setAnchorError(result.anchorError);
    setCamera(result.camera);
  };
  const onWheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    if (paused || !canPanAndZoom) return;
    event.preventDefault();
    const point = canvasPoint(event, event.currentTarget);
    setCursor(point);
    if (event.deltaY !== 0) {
      zoomAt(point, event.deltaY < 0 ? 1.12 : 1 / 1.12);
    }
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (paused) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      if (!canPanAndZoom) {
        setCursor((current) => ({
          x: clamp(
            current.x + (event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0),
            0,
            size.width,
          ),
          y: clamp(
            current.y + (event.key === "ArrowDown" ? 10 : event.key === "ArrowUp" ? -10 : 0),
            0,
            size.height,
          ),
        }));
        return;
      }
      setPreset("custom");
      setCamera((current) => ({
        ...current,
        x:
          current.x +
          (event.key === "ArrowRight"
            ? 20 / current.zoom
            : event.key === "ArrowLeft"
              ? -20 / current.zoom
              : 0),
        y:
          current.y +
          (event.key === "ArrowUp"
            ? 20 / current.zoom
            : event.key === "ArrowDown"
              ? -20 / current.zoom
              : 0),
      }));
    }
    if (canPanAndZoom && (event.key === "+" || event.key === "=")) zoomAt(cursor, 1.12);
    if (canPanAndZoom && (event.key === "-" || event.key === "_")) zoomAt(cursor, 1 / 1.12);
  };
  const reset = () => {
    setAnchorError(0);
    setPreset("origin");
    setCamera(cameraPresets.origin);
    setCursor({ x: size.width * 0.55, y: size.height * 0.5 });
    setPaused(false);
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <span className="control-hint">
          {canPanAndZoom
            ? "Kéo/mũi tên để pan · Wheel/+/- để zoom"
            : "Di chuyển chuột hoặc dùng phím mũi tên để đổi screen point"}
        </span>
        {canPanAndZoom && (
          <label>
            Góc nhìn
            <select
              value={preset}
              onChange={(event) => {
                const value = event.target.value;
                setPreset(value);
                if (cameraPresets[value]) setCamera(cameraPresets[value]);
              }}
              disabled={paused}
            >
              <option value="origin">Gốc tọa độ</option>
              <option value="offset">Lệch tâm</option>
              <option value="close">Phóng gần</option>
              {preset === "custom" && <option value="custom">Tự chỉnh</option>}
            </select>
          </label>
        )}
        <label>
          Tỉ lệ <output>{camera.zoom.toFixed(0)} px/unit</output>
        </label>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={(event) => {
          if (paused) return;
          const point = canvasPoint(event, event.currentTarget);
          setCursor(point);
          if (canPanAndZoom) {
            dragOrigin.current = point;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={move}
        onPointerUp={() => {
          dragOrigin.current = null;
        }}
        onPointerCancel={() => {
          dragOrigin.current = null;
        }}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Mặt phẳng tọa độ có pan, zoom quanh cursor và hiển thị round-trip error"
      />
      <LabReadout
        items={[
          { label: "Screen", value: `(${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)}) px` },
          { label: "World", value: `(${cursorWorld.x.toFixed(3)}, ${cursorWorld.y.toFixed(3)})` },
          {
            label: "Camera",
            value: `(${camera.x.toFixed(3)}, ${camera.y.toFixed(3)}), zoom ${camera.zoom.toFixed(1)} px/unit`,
          },
          { label: "Round-trip error", value: `${roundTripError.toExponential(2)} px` },
          { label: "Zoom-anchor error", value: `${anchorError.toExponential(2)} world unit` },
        ]}
      />
    </div>
  );
}
