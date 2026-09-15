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
  add3,
  dot3,
  facingAmount,
  isDegenerateTriangle,
  magnitude3,
  normalize3,
  orthogonalityError,
  projectIsometric,
  reverseWinding,
  scale3,
  triangleArea,
  triangleCentroid,
  triangleEdges,
  triangleRawNormal,
  triangleUnitNormal,
  type Triangle3,
  type Vec3,
} from "@/lib/labs/normal";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type VertexName = "a" | "b" | "c";

const INITIAL_TRIANGLE: Triangle3 = {
  a: { x: -1.25, y: -0.75, z: 0.25 },
  b: { x: 1.2, y: -0.45, z: -0.35 },
  c: { x: 0.1, y: 1.15, z: 0.75 },
};
const VIEW_DIRECTION = normalize3({ x: 1, y: -1, z: 1 });
const VERTICES: readonly VertexName[] = ["a", "b", "c"];

function copyTriangle(triangle: Triangle3): Triangle3 {
  return {
    a: { ...triangle.a },
    b: { ...triangle.b },
    c: { ...triangle.c },
  };
}

function formatVec3(vector: Vec3, digits = 2) {
  return `(${vector.x.toFixed(digits)}, ${vector.y.toFixed(digits)}, ${vector.z.toFixed(digits)})`;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width = 2,
) {
  drawLine(ctx, start, end, color, width);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = 10;
  drawLine(
    ctx,
    end,
    {
      x: end.x - Math.cos(angle - Math.PI / 6) * headLength,
      y: end.y - Math.sin(angle - Math.PI / 6) * headLength,
    },
    color,
    width,
  );
  drawLine(
    ctx,
    end,
    {
      x: end.x - Math.cos(angle + Math.PI / 6) * headLength,
      y: end.y - Math.sin(angle + Math.PI / 6) * headLength,
    },
    color,
    width,
  );
}

export default function NormalLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const dragging = useRef(false);
  const [triangle, setTriangle] = useState<Triangle3>(() => copyTriangle(INITIAL_TRIANGLE));
  const [selected, setSelected] = useState<VertexName>("c");
  const [paused, setPaused] = useState(true);

  const showTriangle = mode !== "normal-axes";
  const showNormal =
    mode === undefined ||
    ["normal-cross", "normal-unit-area", "normal-winding", "normal-degenerate"].includes(mode);
  const showUnitNormal =
    mode === undefined ||
    ["normal-unit-area", "normal-winding", "normal-degenerate"].includes(mode);
  const showWinding =
    mode === undefined || mode === "normal-winding" || mode === "normal-degenerate";
  const showDegenerate = mode === undefined || mode === "normal-degenerate";

  const edges = useMemo(() => triangleEdges(triangle), [triangle]);
  const rawNormal = useMemo(() => triangleRawNormal(triangle), [triangle]);
  const unitNormal = useMemo(() => triangleUnitNormal(triangle), [triangle]);
  const area = useMemo(() => triangleArea(triangle), [triangle]);
  const degenerate = useMemo(() => isDegenerateTriangle(triangle, 1e-5), [triangle]);
  const facing = useMemo(() => facingAmount(triangle, VIEW_DIRECTION), [triangle]);

  useEffect(() => {
    if (!showDegenerate || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      setTriangle((current) => {
        const midpoint = scale3(add3(current.a, current.b), 0.5);
        const blend = Math.min(1, deltaTime * 0.8);
        return {
          ...current,
          c: add3(
            current.c,
            scale3(
              {
                x: midpoint.x - current.c.x,
                y: midpoint.y - current.c.y,
                z: midpoint.z - current.c.z,
              },
              blend,
            ),
          ),
        };
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, showDegenerate]);

  const updateSelected = (update: (current: Vec3) => Vec3) => {
    setTriangle((current) => ({ ...current, [selected]: update(current[selected]) }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const scale = Math.min(size.width, size.height) * 0.25;
    const center = { x: size.width * 0.5, y: size.height * 0.54 };
    const toScreen = (point: Vec3) => {
      const projected = projectIsometric(point);
      return { x: center.x + projected.x * scale, y: center.y - projected.y * scale };
    };

    const axisData = [
      { endpoint: { x: 1.65, y: 0, z: 0 }, label: "X", color: "#ff6b6b" },
      { endpoint: { x: 0, y: 1.65, z: 0 }, label: "Y", color: "#53f0ae" },
      { endpoint: { x: 0, y: 0, z: 1.65 }, label: "Z", color: "#84a9ff" },
    ];
    for (const axis of axisData) {
      const endpoint = toScreen(axis.endpoint);
      drawArrow(ctx, toScreen({ x: 0, y: 0, z: 0 }), endpoint, axis.color, 2.5);
      ctx.fillStyle = axis.color;
      ctx.font = "700 12px ui-monospace";
      ctx.fillText(axis.label, endpoint.x + 8, endpoint.y - 7);
    }

    if (!showTriangle) {
      const point = triangle.c;
      const xPart = { x: point.x, y: 0, z: 0 };
      const xyPart = { x: point.x, y: point.y, z: 0 };
      drawLine(ctx, toScreen({ x: 0, y: 0, z: 0 }), toScreen(xPart), "#ff6b6b", 2);
      drawLine(ctx, toScreen(xPart), toScreen(xyPart), "#53f0ae", 2);
      drawLine(ctx, toScreen(xyPart), toScreen(point), "#84a9ff", 2);
      const screen = toScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe26c";
      ctx.fill();
      ctx.fillStyle = "#f7f9ff";
      ctx.fillText("P", screen.x + 9, screen.y - 8);
      return;
    }

    const a = toScreen(triangle.a);
    const b = toScreen(triangle.b);
    const c = toScreen(triangle.c);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = facing >= 0 ? "rgba(83, 240, 174, 0.13)" : "rgba(196, 132, 255, 0.13)";
    ctx.fill();
    drawLine(ctx, a, b, "#ffb454", 3);
    drawLine(ctx, a, c, "#53f0ae", 3);
    drawLine(ctx, b, c, "#d6ddef", 2);

    if (showNormal && !degenerate) {
      const centroid = triangleCentroid(triangle);
      const displayNormal = showUnitNormal ? scale3(unitNormal, 1.1) : scale3(rawNormal, 0.18);
      drawArrow(ctx, toScreen(centroid), toScreen(add3(centroid, displayNormal)), "#c484ff", 3);
    }

    for (const name of VERTICES) {
      const screen = toScreen(triangle[name]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, name === selected ? 8 : 6, 0, Math.PI * 2);
      ctx.fillStyle = name === selected ? "#ffe26c" : "#f7f9ff";
      ctx.fill();
      ctx.fillStyle = "#f7f9ff";
      ctx.font = "700 11px ui-monospace";
      ctx.fillText(name.toUpperCase(), screen.x + 9, screen.y - 8);
    }
  }, [
    degenerate,
    facing,
    rawNormal,
    selected,
    showNormal,
    showTriangle,
    showUnitNormal,
    size,
    triangle,
    unitNormal,
  ]);

  const screenScale = Math.min(size.width, size.height) * 0.25;
  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return { point, center: { x: size.width * 0.5, y: size.height * 0.54 } };
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showTriangle) {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const { point, center } = pointFromEvent(event);
    let nearest: VertexName | undefined;
    let nearestDistance = 18;
    for (const name of VERTICES) {
      const projected = projectIsometric(triangle[name]);
      const screen = {
        x: center.x + projected.x * screenScale,
        y: center.y - projected.y * screenScale,
      };
      const distance = Math.hypot(screen.x - point.x, screen.y - point.y);
      if (distance <= nearestDistance) {
        nearest = name;
        nearestDistance = distance;
      }
    }
    if (!nearest) return;
    setSelected(nearest);
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveVertex = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const deltaX = event.movementX / (screenScale * (Math.sqrt(3) * 0.5));
    const deltaY = -event.movementY / screenScale - deltaX * 0.5;
    updateSelected((current) => ({ ...current, x: current.x + deltaX, y: current.y + deltaY }));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const delta = 0.1;
    const changes: Record<string, Vec3> = {
      ArrowLeft: { x: -delta, y: 0, z: 0 },
      ArrowRight: { x: delta, y: 0, z: 0 },
      ArrowDown: { x: 0, y: -delta, z: 0 },
      ArrowUp: { x: 0, y: delta, z: 0 },
      q: { x: 0, y: 0, z: -delta },
      e: { x: 0, y: 0, z: delta },
    };
    if (event.key === "1" || event.key === "2" || event.key === "3") {
      setSelected(VERTICES[Number(event.key) - 1]);
      return;
    }
    const change = changes[event.key];
    if (!change) return;
    event.preventDefault();
    updateSelected((current) => add3(current, change));
  };

  const applyPreset = (value: string) => {
    setPaused(true);
    if (value === "right") {
      setTriangle({ a: { x: 0, y: 0, z: 0 }, b: { x: 2, y: 0, z: 0 }, c: { x: 0, y: 1.5, z: 0 } });
    } else if (value === "line") {
      setTriangle({
        a: { x: -1.5, y: -0.5, z: 0 },
        b: { x: 0, y: 0, z: 0 },
        c: { x: 1.5, y: 0.5, z: 0 },
      });
    } else if (value === "near") {
      setTriangle({
        a: { x: -1.5, y: -0.5, z: 0 },
        b: { x: 0, y: 0, z: 0 },
        c: { x: 1.5, y: 0.5001, z: 0 },
      });
    } else {
      setTriangle(copyTriangle(INITIAL_TRIANGLE));
    }
    setSelected("c");
  };

  const collapseOneStep = () => {
    setTriangle((current) => {
      const midpoint = scale3(add3(current.a, current.b), 0.5);
      return {
        ...current,
        c: add3(
          current.c,
          scale3(
            {
              x: midpoint.x - current.c.x,
              y: midpoint.y - current.c.y,
              z: midpoint.z - current.c.z,
            },
            0.12,
          ),
        ),
      };
    });
  };

  const selectedPoint = triangle[selected];
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select defaultValue="spatial" onChange={(event) => applyPreset(event.target.value)}>
            <option value="spatial">Tam giác trong không gian</option>
            <option value="right">Tam giác vuông 3×2</option>
            <option value="near">Gần thẳng hàng</option>
            <option value="line">Thẳng hàng</option>
          </select>
        </label>
        {showTriangle && (
          <label>
            Đỉnh đang chọn
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value as VertexName)}
            >
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
            </select>
          </label>
        )}
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            {showTriangle ? `${selected.toUpperCase()}.${axis}` : `P.${axis}`}
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={selectedPoint[axis]}
              onChange={(event) =>
                updateSelected((current) => ({ ...current, [axis]: Number(event.target.value) }))
              }
            />
            <output>{selectedPoint[axis].toFixed(2)}</output>
          </label>
        ))}
        {showWinding && (
          <button onClick={() => setTriangle((current) => reverseWinding(current))}>
            Đảo B ↔ C
          </button>
        )}
        {showDegenerate && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Tự làm phẳng" : "Tạm dừng"}
          </button>
        )}
        {showDegenerate && (paused || reducedMotion) && (
          <button onClick={collapseOneStep}>Tiến một bước</button>
        )}
        <button onClick={() => applyPreset("spatial")}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveVertex}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="La bàn ba trục và tam giác 3D; chọn hoặc kéo đỉnh, dùng phím mũi tên và Q/E để đổi tọa độ"
      />
      <LabReadout
        items={[
          ...(showTriangle
            ? [
                { label: "AB = B − A", value: formatVec3(edges.ab) },
                { label: "AC = C − A", value: formatVec3(edges.ac) },
              ]
            : [{ label: "P trong 3D", value: formatVec3(triangle.c) }]),
          ...(showNormal
            ? [
                { label: "raw normal", value: formatVec3(rawNormal) },
                {
                  label: "kiểm tra vuông góc",
                  value: `N·AB=${dot3(rawNormal, edges.ab).toExponential(1)} · N·AC=${dot3(rawNormal, edges.ac).toExponential(1)}`,
                },
              ]
            : []),
          ...(showUnitNormal
            ? [
                {
                  label: "unit normal",
                  value: degenerate
                    ? "không xác định"
                    : `${formatVec3(unitNormal)} · length=${magnitude3(unitNormal).toFixed(3)}`,
                },
                { label: "diện tích", value: `${area.toFixed(4)} = |AB×AC| / 2` },
              ]
            : []),
          ...(showWinding
            ? [
                {
                  label: "winding / facing",
                  value: degenerate
                    ? "degenerate"
                    : `${facing >= 0 ? "front" : "back"} · dot=${facing.toFixed(3)}`,
                },
              ]
            : []),
          ...(showDegenerate
            ? [
                {
                  label: "validation",
                  value: `${degenerate ? "degenerate" : "valid"} · orthogonality error=${orthogonalityError(triangle).toExponential(2)}`,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
