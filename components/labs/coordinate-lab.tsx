"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  initialCamera,
  beginCoordinateDrag,
  moveCoordinatePoint,
  panCamera,
  screenToWorld,
  worldToScreen,
  zoomCameraAt,
  gridSpacing,
  type Camera,
  type CoordinateScene,
} from "@/lib/labs/coordinate";
import { clamp, type Point } from "@/lib/labs/geometry";
import { LabReadout, useCanvasSize } from "./lab-shared";
import { coordinatePoint, drawCoordinateLab } from "./coordinate-lab-view";
import type { InteractiveLabMode } from "./types";

const cameraPresets: Record<string, Camera> = {
  origin: initialCamera,
  offset: { x: 2.5, y: -1.5, zoom: 45 },
  close: { x: -1, y: 1, zoom: 250 },
};
const initialScene = (): CoordinateScene => ({
  camera: { ...initialCamera },
  points: [{ x: 2, y: 1 }],
  selected: -1,
  grabOffset: { x: 0, y: 0 },
  draggingPoint: false,
});

export default function CoordinateLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [scene, setScene] = useState<CoordinateScene>(initialScene);
  const sceneRef = useRef(scene);
  const [preset, setPreset] = useState("origin");
  const [cursor, setCursor] = useState<Point>({ x: 200, y: 160 });
  const [paused, setPaused] = useState(false);
  const [anchorError, setAnchorError] = useState(0);
  const owner = useRef<{ id: number; button: number; previous: Point } | null>(null);
  const previousMode = useRef(mode);
  const canPan =
    mode === undefined || ["coordinate-pan", "coordinate-zoom", "coordinate-points"].includes(mode);
  const canZoom = mode === undefined || ["coordinate-zoom", "coordinate-points"].includes(mode);
  const canEdit = mode === undefined || mode === "coordinate-points";
  const camera = scene.camera;
  const cursorWorld = screenToWorld(cursor, camera, size);
  const restored = worldToScreen(cursorWorld, camera, size);
  const roundTripError = Math.hypot(restored.x - cursor.x, restored.y - cursor.y);

  const updateScene = (next: CoordinateScene) => {
    sceneRef.current = next;
    setScene(next);
  };
  const release = () => {
    const active = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
    if (sceneRef.current.draggingPoint) updateScene({ ...sceneRef.current, draggingPoint: false });
  };
  useEffect(() => {
    const blur = () => release();
    const hidden = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, []);
  useEffect(() => {
    release();
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      updateScene(initialScene());
      setPreset("origin");
      setAnchorError(0);
      setPaused(false);
    }
  }, [size.width, size.height, mode]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawCoordinateLab(ctx, size, scene, cursor, canPan);
  }, [size, scene, cursor, canPan]);

  const togglePause = () => {
    release();
    setPaused((value) => !value);
  };
  const reset = () => {
    release();
    updateScene(initialScene());
    setPreset("origin");
    setAnchorError(0);
    setCursor({ x: size.width / 2, y: size.height / 2 });
    setPaused(false);
  };
  const resetView = () => {
    release();
    updateScene({ ...sceneRef.current, camera: { ...initialCamera } });
    setPreset("origin");
    setAnchorError(0);
  };
  const zoomAt = (screen: Point, factor: number) => {
    release();
    const result = zoomCameraAt(sceneRef.current.camera, screen, factor, size);
    updateScene({ ...sceneRef.current, camera: result.camera });
    setAnchorError(result.anchorError);
    setPreset("custom");
  };
  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || !event.isPrimary || owner.current || (event.button !== 0 && event.button !== 2))
      return;
    const point = coordinatePoint(event, size);
    if (!point) return;
    event.currentTarget.focus();
    event.preventDefault();
    setCursor(point);
    if ((event.button === 0 && !canEdit) || (event.button === 2 && !canPan)) return;
    if (event.button === 0) {
      const next = beginCoordinateDrag(sceneRef.current, point, size);
      updateScene(next);
      if (!next.draggingPoint) return;
    }
    owner.current = { id: event.pointerId, button: event.button, previous: point };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused || (owner.current && owner.current.id !== event.pointerId)) return;
    const point = coordinatePoint(event, size);
    if (!point) {
      release();
      return;
    }
    setCursor(point);
    const active = owner.current;
    if (!active) return;
    const mask = active.button === 2 ? 2 : 1;
    if ((event.buttons & mask) === 0) {
      release();
      return;
    }
    if (active.button === 2) {
      const deltaPixels = { x: point.x - active.previous.x, y: point.y - active.previous.y };
      updateScene({ ...sceneRef.current, camera: panCamera(sceneRef.current.camera, deltaPixels) });
      active.previous = point;
      setPreset("custom");
    } else updateScene(moveCoordinatePoint(sceneRef.current, point, size));
  };
  const end = (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const active = owner.current;
    if (!active || active.id !== event.pointerId || (!cancelled && event.button !== active.button))
      return;
    const point = coordinatePoint(event, size);
    if (!cancelled && point && !paused) {
      if (active.button === 2) {
        const deltaPixels = { x: point.x - active.previous.x, y: point.y - active.previous.y };
        updateScene({
          ...sceneRef.current,
          camera: panCamera(sceneRef.current.camera, deltaPixels),
        });
      } else updateScene(moveCoordinatePoint(sceneRef.current, point, size));
      setCursor(point);
    }
    release();
  };
  // A native non-passive listener reliably prevents page scroll over the lab.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (!canZoom || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      if (paused) return;
      const point = coordinatePoint(
        { ...event, clientX: event.clientX, clientY: event.clientY, currentTarget: canvas },
        size,
      );
      if (!point || !Number.isFinite(event.deltaY) || event.deltaY === 0) return;
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= size.height;
      setCursor(point);
      zoomAt(point, Math.exp(-clamp(delta, -600, 600) * 0.002));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [canZoom, paused, size]);

  const erase = () => {
    release();
    const current = sceneRef.current;
    if (current.selected < 0) return;
    updateScene({
      ...current,
      points: current.points.filter((_, index) => index !== current.selected),
      selected: -1,
    });
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const keys = [
      " ",
      "r",
      "R",
      "Enter",
      "Delete",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "=",
      "-",
      "_",
    ];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === " ") {
      if (!event.repeat) togglePause();
      return;
    }
    if (event.key === "Escape") {
      release();
      return;
    }
    if (paused) return;
    if (event.key.toLowerCase() === "r") {
      resetView();
      return;
    }
    if (canEdit && event.key === "Delete") {
      erase();
      return;
    }
    if (canEdit && event.key === "Enter" && !event.repeat) {
      updateScene({ ...beginCoordinateDrag(sceneRef.current, cursor, size), draggingPoint: false });
      return;
    }
    if (canZoom && ["+", "=", "-", "_"].includes(event.key)) {
      zoomAt(cursor, ["+", "="].includes(event.key) ? 1.12 : 1 / 1.12);
      return;
    }
    const dx = event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0;
    const dy = event.key === "ArrowDown" ? 10 : event.key === "ArrowUp" ? -10 : 0;
    if (!dx && !dy) return;
    release();
    const current = sceneRef.current;
    if (canEdit && current.selected >= 0 && !event.shiftKey) {
      const points = current.points.map((point, index) =>
        index === current.selected
          ? { x: point.x + dx / camera.zoom, y: point.y - dy / camera.zoom }
          : point,
      );
      updateScene({ ...current, points });
    } else if (canPan && event.shiftKey) {
      updateScene({ ...current, camera: panCamera(current.camera, { x: dx, y: dy }) });
      setPreset("custom");
    } else
      setCursor((point) => ({
        x: clamp(point.x + dx, 0, size.width - 1),
        y: clamp(point.y + dy, 0, size.height - 1),
      }));
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {canPan && (
          <label>
            Góc nhìn
            <select
              value={preset}
              disabled={paused}
              onChange={(event) => {
                release();
                const value = event.target.value;
                setPreset(value);
                if (cameraPresets[value])
                  updateScene({ ...sceneRef.current, camera: { ...cameraPresets[value] } });
                setAnchorError(0);
              }}
            >
              <option value="origin">Gốc tọa độ</option>
              <option value="offset">Lệch tâm</option>
              <option value="close">Phóng gần</option>
              {preset === "custom" && <option value="custom">Tự chỉnh</option>}
            </select>
          </label>
        )}
        {canEdit && (
          <label>
            Điểm
            <select
              aria-label="Chọn điểm"
              disabled={paused}
              value={scene.selected}
              onChange={(event) => {
                release();
                updateScene({ ...sceneRef.current, selected: Number(event.target.value) });
              }}
            >
              <option value={-1}>Chưa chọn</option>
              {scene.points.map((_, index) => (
                <option key={index} value={index}>
                  P{index + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        {canEdit && (
          <button disabled={paused || scene.selected < 0} onClick={erase}>
            Xóa điểm
          </button>
        )}
        {canZoom && (
          <>
            <button disabled={paused} aria-label="Thu nhỏ" onClick={() => zoomAt(cursor, 1 / 1.12)}>
              −
            </button>
            <button disabled={paused} aria-label="Phóng to" onClick={() => zoomAt(cursor, 1.12)}>
              +
            </button>
          </>
        )}
        <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        <button onClick={reset}>Đặt lại</button>
      </div>
      <p className="control-hint">
        {canEdit
          ? "Chuột trái: đặt/kéo điểm · Chuột phải: pan · Wheel: zoom. Bàn phím: Enter đặt điểm tại dấu chữ thập; chọn P trong danh sách rồi dùng mũi tên để di chuyển; Shift+mũi tên pan; Delete xóa."
          : canPan
            ? "Kéo chuột phải hoặc Shift+mũi tên để pan. Mũi tên di chuyển dấu chữ thập; +/- zoom quanh dấu chữ thập."
            : "Camera được giữ cố định. Di chuyển chuột hoặc dùng mũi tên để đọc hai tọa độ của cùng một vị trí."}{" "}
        Space tạm dừng, R đặt lại góc nhìn (giữ điểm). Không có chuyển động tự chạy.
      </p>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => {
          if (owner.current?.id === event.pointerId) release();
        }}
        onBlur={release}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Mặt phẳng tọa độ: hai trục, lưới, pan zoom và đặt kéo điểm"
      />
      <LabReadout
        items={[
          { label: "Screen", value: `(${cursor.x.toFixed(1)}, ${cursor.y.toFixed(1)}) px` },
          { label: "World", value: `(${cursorWorld.x.toFixed(3)}, ${cursorWorld.y.toFixed(3)})` },
          {
            label: "Camera",
            value: `(${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}), ${camera.zoom.toFixed(1)} px/unit`,
          },
          { label: "Bước lưới", value: gridSpacing(camera.zoom).toString() + " world unit" },
          { label: "Số điểm", value: `${scene.points.length}/256` },
          { label: "Round-trip error", value: roundTripError.toExponential(2) + " px" },
          { label: "Zoom-anchor error", value: anchorError.toExponential(2) + " world unit" },
        ]}
      />
    </div>
  );
}
