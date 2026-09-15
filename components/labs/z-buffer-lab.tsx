"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  buildCubeTriangles,
  renderZTriangles,
  zBufferIndex,
  zFrameDifference,
} from "@/lib/labs/z-buffer";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const BUFFER_WIDTH = 64;
const BUFFER_HEIGHT = 44;

type Preset = "corner" | "front" | "overlap";

const presetAngles: Record<Preset, { x: number; y: number }> = {
  corner: { x: -0.42, y: 0.68 },
  front: { x: 0, y: 0 },
  overlap: { x: -0.7, y: 0.95 },
};

export default function ZBufferLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [preset, setPreset] = useState<Preset>(mode === "depth-order" ? "overlap" : "corner");
  const [angle, setAngle] = useState(presetAngles[preset]);
  const [depthEnabled, setDepthEnabled] = useState(mode !== "depth-order");
  const [reverseOrder, setReverseOrder] = useState(false);
  const [depthView, setDepthView] = useState(mode === "depth-storage");
  const [paused, setPaused] = useState(true);
  const [inspect, setInspect] = useState({ x: 32, y: 22 });
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    angleX: number;
    angleY: number;
  } | null>(null);

  const triangles = useMemo(
    () => buildCubeTriangles(BUFFER_WIDTH, BUFFER_HEIGHT, angle.x, angle.y),
    [angle],
  );
  const frame = useMemo(
    () =>
      renderZTriangles(triangles, BUFFER_WIDTH, BUFFER_HEIGHT, {
        depthEnabled,
        reverseOrder,
        inspect,
      }),
    [depthEnabled, inspect, reverseOrder, triangles],
  );
  const reversedFrame = useMemo(
    () =>
      renderZTriangles(triangles, BUFFER_WIDTH, BUFFER_HEIGHT, {
        depthEnabled,
        reverseOrder: !reverseOrder,
      }),
    [depthEnabled, reverseOrder, triangles],
  );
  const difference = zFrameDifference(frame, reversedFrame);
  const inspectedIndex = zBufferIndex(BUFFER_WIDTH, inspect.x, inspect.y);
  const inspectedDepth = frame.depths[inspectedIndex];

  useEffect(() => {
    if (paused || reducedMotion) return;
    let previous = performance.now();
    let animationFrame = 0;
    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setAngle((current) => ({ ...current, y: current.y + deltaSeconds * 0.55 }));
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion]);

  const layout = useMemo(() => {
    const cell = Math.max(
      3,
      Math.floor(Math.min((size.width - 36) / BUFFER_WIDTH, (size.height - 36) / BUFFER_HEIGHT)),
    );
    return {
      cell,
      left: Math.round((size.width - cell * BUFFER_WIDTH) / 2),
      top: Math.round((size.height - cell * BUFFER_HEIGHT) / 2),
    };
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    for (let y = 0; y < BUFFER_HEIGHT; y += 1) {
      for (let x = 0; x < BUFFER_WIDTH; x += 1) {
        const index = zBufferIndex(BUFFER_WIDTH, x, y);
        if (depthView) {
          const depth = frame.depths[index];
          const shade = depth >= 1 ? 12 : Math.round((1 - depth) * 235 + 20);
          context.fillStyle = `rgb(${shade} ${shade} ${shade})`;
        } else {
          const color = frame.colors[index];
          context.fillStyle = `rgb(${color.red} ${color.green} ${color.blue})`;
        }
        context.fillRect(
          layout.left + x * layout.cell,
          layout.top + y * layout.cell,
          layout.cell + 0.25,
          layout.cell + 0.25,
        );
      }
    }

    context.strokeStyle = "#ffbe52";
    context.lineWidth = 2;
    context.strokeRect(
      layout.left + inspect.x * layout.cell + 1,
      layout.top + inspect.y * layout.cell + 1,
      Math.max(2, layout.cell - 2),
      Math.max(2, layout.cell - 2),
    );
    context.strokeStyle = "#344564";
    context.lineWidth = 1;
    context.strokeRect(
      layout.left - 0.5,
      layout.top - 0.5,
      BUFFER_WIDTH * layout.cell + 1,
      BUFFER_HEIGHT * layout.cell + 1,
    );
  }, [depthView, frame, inspect, layout, size]);

  const applyPreset = (next: Preset) => {
    setPreset(next);
    setAngle(presetAngles[next]);
    setPaused(true);
  };

  const reset = () => {
    setAngle(presetAngles[preset]);
    setDepthEnabled(mode !== "depth-order");
    setReverseOrder(false);
    setDepthView(mode === "depth-storage");
    setInspect({ x: 32, y: 22 });
    setPaused(true);
  };

  const inspectFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    setInspect({
      x: Math.max(0, Math.min(BUFFER_WIDTH - 1, Math.floor((point.x - layout.left) / layout.cell))),
      y: Math.max(0, Math.min(BUFFER_HEIGHT - 1, Math.floor((point.y - layout.top) / layout.cell))),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    drag.current = {
      pointerX: point.x,
      pointerY: point.y,
      angleX: angle.x,
      angleY: angle.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    inspectFromPointer(event);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const point = canvasPoint(event, event.currentTarget);
    setAngle({
      x: drag.current.angleX + (point.y - drag.current.pointerY) * 0.008,
      y: drag.current.angleY + (point.x - drag.current.pointerX) * 0.008,
    });
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drag.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (key === "r") reset();
    if (key === "d") setDepthEnabled((current) => !current);
    if (key === "o") setReverseOrder((current) => !current);
    if (key === "v") setDepthView((current) => !current);
    if (key === "n") setAngle((current) => ({ ...current, y: current.y + 0.08 }));
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    const movement: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = movement[event.key];
    if (delta) {
      event.preventDefault();
      setInspect((current) => ({
        x: Math.max(0, Math.min(BUFFER_WIDTH - 1, current.x + delta.x)),
        y: Math.max(0, Math.min(BUFFER_HEIGHT - 1, current.y + delta.y)),
      }));
    }
  };

  const lastTrace = frame.traces.at(-1);
  return (
    <div className="lab-stack">
      <div className="lab-controls">
        <label>
          Góc nhìn
          <select
            aria-label="Góc nhìn cube"
            value={preset}
            onChange={(event) => applyPreset(event.target.value as Preset)}
          >
            <option value="corner">Nhìn ba mặt</option>
            <option value="front">Nhìn thẳng mặt trước</option>
            <option value="overlap">Nhiều mặt chồng nhau</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={depthEnabled}
            onChange={(event) => setDepthEnabled(event.target.checked)}
          />
          Depth test
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={reverseOrder}
            onChange={(event) => setReverseOrder(event.target.checked)}
          />
          Đảo draw order
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={depthView}
            onChange={(event) => setDepthView(event.target.checked)}
          />
          Xem depth
        </label>
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Cho cube quay" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAngle((current) => ({ ...current, y: current.y + 0.08 }));
            setPaused(true);
          }}
        >
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Khối lập phương sáu mặt màu được rasterize bằng CPU và kiểm tra Z-buffer"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      />
      <LabReadout
        items={[
          {
            label: "Color / depth buffer",
            value: `${frame.colors.length} / ${frame.depths.length}`,
          },
          { label: "Pixel / index", value: `(${inspect.x}, ${inspect.y}) / ${inspectedIndex}` },
          {
            label: "Depth cuối",
            value: inspectedDepth >= 1 ? "1.0000 (clear)" : inspectedDepth.toFixed(4),
          },
          {
            label: "Fragment pass / reject",
            value: `${frame.passedCount} / ${frame.rejectedCount}`,
          },
          {
            label: "Fragment cuối tại pixel",
            value: lastTrace
              ? `${lastTrace.face}: ${lastTrace.newDepth.toFixed(4)} ${lastTrace.passed ? "pass" : "fail"}`
              : "không có",
          },
          {
            label: "Chênh lệch khi đảo order",
            value: `${difference.colorPixels} color · ${difference.depthPixels} depth`,
          },
        ]}
      />
      <p className="sr-only">
        Cube có mười hai triangle. Pixel ({inspect.x}, {inspect.y}) nhận {frame.traces.length}{" "}
        fragment; depth hiện tại là {inspectedDepth.toFixed(4)}. Khi đảo draw order, có{" "}
        {difference.colorPixels}
        pixel màu và {difference.depthPixels} pixel depth khác nhau.
      </p>
    </div>
  );
}
