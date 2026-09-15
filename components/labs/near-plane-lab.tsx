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
  classifyNearTriangle,
  clipNearTriangle,
  intersectNearPlane,
  maximumNearViolation,
  nearSignedDistance,
  nearTriangleVertices,
  nearVertexIsInside,
  projectNearTriangle,
  traceNearPlaneClip,
  triangulateNearPolygon,
  type NearColor,
  type NearTriangle,
  type NearVertex,
} from "@/lib/labs/near-plane";
import {
  rasterizeTriangleCoverage,
  triangleSignedDoubleArea,
  type RasterTriangle,
} from "@/lib/labs/triangle-raster";
import { LabReadout, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const COLUMNS = 24;
const ROWS = 16;
const VERTICAL_FOV = (60 * Math.PI) / 180;

type PresetName = "inside" | "one-out" | "two-out" | "outside" | "on-plane";
type RenderPolicy = "clip" | "discard";

const presets: Record<PresetName, NearTriangle> = {
  inside: {
    a: { position: { x: -1, y: -0.8, z: 2.1 }, color: { red: 255, green: 92, blue: 106 } },
    b: { position: { x: 1.1, y: -0.7, z: 3.2 }, color: { red: 78, green: 232, blue: 163 } },
    c: { position: { x: 0, y: 1, z: 2.6 }, color: { red: 93, green: 145, blue: 255 } },
  },
  "one-out": {
    a: {
      position: { x: -1.15, y: -0.85, z: 0.45 },
      color: { red: 255, green: 92, blue: 106 },
    },
    b: { position: { x: 1.15, y: -0.7, z: 3.2 }, color: { red: 78, green: 232, blue: 163 } },
    c: { position: { x: 0, y: 1.05, z: 2.25 }, color: { red: 93, green: 145, blue: 255 } },
  },
  "two-out": {
    a: { position: { x: -1.1, y: -0.8, z: 0.35 }, color: { red: 255, green: 92, blue: 106 } },
    b: { position: { x: 1.1, y: -0.7, z: 0.55 }, color: { red: 78, green: 232, blue: 163 } },
    c: { position: { x: 0, y: 1, z: 2.8 }, color: { red: 93, green: 145, blue: 255 } },
  },
  outside: {
    a: { position: { x: -1, y: -0.8, z: 0.25 }, color: { red: 255, green: 92, blue: 106 } },
    b: { position: { x: 1, y: -0.7, z: 0.45 }, color: { red: 78, green: 232, blue: 163 } },
    c: { position: { x: 0, y: 1, z: 0.65 }, color: { red: 93, green: 145, blue: 255 } },
  },
  "on-plane": {
    a: { position: { x: -1, y: -0.8, z: 1 }, color: { red: 255, green: 92, blue: 106 } },
    b: { position: { x: 1, y: -0.7, z: 2.8 }, color: { red: 78, green: 232, blue: 163 } },
    c: { position: { x: 0, y: 1, z: 1 }, color: { red: 93, green: 145, blue: 255 } },
  },
};

function cloneVertex(vertex: NearVertex): NearVertex {
  return { position: { ...vertex.position }, color: { ...vertex.color } };
}

function cloneTriangle(triangle: NearTriangle): NearTriangle {
  return { a: cloneVertex(triangle.a), b: cloneVertex(triangle.b), c: cloneVertex(triangle.c) };
}

function moveTriangle(triangle: NearTriangle, depthOffset: number): NearTriangle {
  const move = (vertex: NearVertex): NearVertex => ({
    position: { ...vertex.position, z: vertex.position.z + depthOffset },
    color: { ...vertex.color },
  });
  return { a: move(triangle.a), b: move(triangle.b), c: move(triangle.c) };
}

function cssColor(color: NearColor, alpha = 1) {
  return `rgb(${Math.round(color.red)} ${Math.round(color.green)} ${Math.round(color.blue)} / ${alpha})`;
}

function mixColor(
  colors: [NearColor, NearColor, NearColor],
  weights: { a: number; b: number; c: number },
) {
  return {
    red: weights.a * colors[0].red + weights.b * colors[1].red + weights.c * colors[2].red,
    green: weights.a * colors[0].green + weights.b * colors[1].green + weights.c * colors[2].green,
    blue: weights.a * colors[0].blue + weights.b * colors[1].blue + weights.c * colors[2].blue,
  };
}

export default function NearPlaneLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialPreset: PresetName = mode === "near-validation" ? "inside" : "one-out";
  const [preset, setPreset] = useState<PresetName>(initialPreset);
  const [baseTriangle, setBaseTriangle] = useState(() => cloneTriangle(presets[initialPreset]));
  const [nearPlane, setNearPlane] = useState(1);
  const [depthOffset, setDepthOffset] = useState(0);
  const [policy, setPolicy] = useState<RenderPolicy>("clip");
  const [paused, setPaused] = useState(true);
  const [edgeLimit, setEdgeLimit] = useState(3);
  const dragStart = useRef<{ pointerX: number; depthOffset: number } | null>(null);
  const animationDirection = useRef(1);
  const previousFrame = useRef<number | null>(null);

  const triangle = useMemo(
    () => moveTriangle(baseTriangle, depthOffset),
    [baseTriangle, depthOffset],
  );
  const counts = useMemo(() => classifyNearTriangle(triangle, nearPlane), [nearPlane, triangle]);
  const clipSteps = useMemo(() => traceNearPlaneClip(triangle, nearPlane), [nearPlane, triangle]);
  const fullPolygon = useMemo(() => clipNearTriangle(triangle, nearPlane), [nearPlane, triangle]);
  const visiblePolygon = useMemo(() => {
    if (mode !== "near-polygon" || edgeLimit >= 3) return fullPolygon;
    if (edgeLimit === 0) return [];
    return clipSteps[edgeLimit - 1].output;
  }, [clipSteps, edgeLimit, fullPolygon, mode]);
  const renderPolygon = useMemo(() => {
    if (policy === "discard" && counts.outside > 0) return [];
    return fullPolygon;
  }, [counts.outside, fullPolygon, policy]);
  const outputTriangles = useMemo(() => triangulateNearPolygon(renderPolygon), [renderPolygon]);

  useEffect(() => {
    if (paused || reducedMotion) {
      previousFrame.current = null;
      return;
    }
    let frame = 0;
    const animate = (time: number) => {
      const previous = previousFrame.current ?? time;
      const deltaTime = Math.min((time - previous) / 1000, 0.05);
      previousFrame.current = time;
      setDepthOffset((current) => {
        let next = current + animationDirection.current * deltaTime * 0.75;
        if (next > 1.7 || next < -1.2) {
          animationDirection.current *= -1;
          next = Math.max(-1.2, Math.min(1.7, next));
        }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion]);

  const rasterResult = useMemo(() => {
    let coveredCount = 0;
    const fragments: Array<{ x: number; y: number; color: NearColor }> = [];
    for (const output of outputTriangles) {
      const projected = projectNearTriangle(output, VERTICAL_FOV, COLUMNS / ROWS, nearPlane);
      if (!projected) continue;
      let ordered = projected;
      let rasterTriangle: RasterTriangle = {
        a: { x: ((projected[0].x + 1) * COLUMNS) / 2, y: ((1 - projected[0].y) * ROWS) / 2 },
        b: { x: ((projected[1].x + 1) * COLUMNS) / 2, y: ((1 - projected[1].y) * ROWS) / 2 },
        c: { x: ((projected[2].x + 1) * COLUMNS) / 2, y: ((1 - projected[2].y) * ROWS) / 2 },
      };
      if (triangleSignedDoubleArea(rasterTriangle) < 0) {
        ordered = [projected[0], projected[2], projected[1]];
        rasterTriangle = { a: rasterTriangle.a, b: rasterTriangle.c, c: rasterTriangle.b };
      }
      const raster = rasterizeTriangleCoverage(rasterTriangle, COLUMNS, ROWS, "top-left");
      coveredCount += raster.coveredCount;
      const colors: [NearColor, NearColor, NearColor] = [
        ordered[0].color,
        ordered[1].color,
        ordered[2].color,
      ];
      for (const fragment of raster.fragments) {
        fragments.push({
          x: fragment.x,
          y: fragment.y,
          color: mixColor(colors, fragment.sample.barycentric),
        });
      }
    }
    return { coveredCount, fragments };
  }, [nearPlane, outputTriangles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const narrow = size.width < 560;
    const profile = narrow
      ? { x: 20, y: 18, width: size.width - 40, height: 132 }
      : { x: 24, y: 24, width: size.width * 0.43, height: size.height - 48 };
    const viewport = narrow
      ? { x: 20, y: 174, width: size.width - 40, height: size.height - 194 }
      : { x: size.width * 0.5, y: 24, width: size.width * 0.47, height: size.height - 48 };

    const profilePoint = (vertex: NearVertex) => ({
      x: profile.x + ((vertex.position.z + 0.5) / 6) * profile.width,
      y: profile.y + profile.height - ((vertex.position.x + 1.8) / 3.6) * profile.height,
    });
    const nearX = profile.x + ((nearPlane + 0.5) / 6) * profile.width;
    ctx.strokeStyle = "#263451";
    ctx.strokeRect(profile.x, profile.y, profile.width, profile.height);
    ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "#ffbe52";
    ctx.beginPath();
    ctx.moveTo(nearX, profile.y);
    ctx.lineTo(nearX, profile.y + profile.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffbe52";
    ctx.font = "500 11px ui-monospace";
    ctx.fillText(
      `near=${nearPlane.toFixed(2)}`,
      Math.min(nearX + 6, profile.x + profile.width - 74),
      profile.y + 15,
    );

    const original = nearTriangleVertices(triangle).map(profilePoint);
    ctx.beginPath();
    ctx.moveTo(original[0].x, original[0].y);
    ctx.lineTo(original[1].x, original[1].y);
    ctx.lineTo(original[2].x, original[2].y);
    ctx.closePath();
    ctx.strokeStyle = "#71809e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (const [index, vertex] of nearTriangleVertices(triangle).entries()) {
      const point = profilePoint(vertex);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = nearVertexIsInside(vertex, nearPlane) ? cssColor(vertex.color) : "#ffb14c";
      ctx.fill();
      ctx.fillStyle = "#f7f9ff";
      ctx.fillText("ABC"[index], point.x + 8, point.y - 7);
    }

    if (mode !== "near-scene" && mode !== "near-classify") {
      for (let index = 0; index < 3; index += 1) {
        const start = nearTriangleVertices(triangle)[index];
        const end = nearTriangleVertices(triangle)[(index + 1) % 3];
        if (nearVertexIsInside(start, nearPlane) === nearVertexIsInside(end, nearPlane)) continue;
        const intersection = intersectNearPlane(start, end, nearPlane).vertex;
        const point = profilePoint(intersection);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#f7f9ff";
        ctx.fill();
      }
    }

    if (visiblePolygon.length >= 2 && mode !== "near-scene" && mode !== "near-classify") {
      const points = visiblePolygon.map(profilePoint);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath();
      ctx.strokeStyle = "#53f0ae";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (
      (mode === "near-triangulate" || mode === "near-raster" || mode === "near-validation") &&
      fullPolygon.length === 4
    ) {
      const first = profilePoint(fullPolygon[0]);
      const third = profilePoint(fullPolygon[2]);
      ctx.strokeStyle = "#936cdc";
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(third.x, third.y);
      ctx.stroke();
    }

    const cellWidth = viewport.width / COLUMNS;
    const cellHeight = viewport.height / ROWS;
    ctx.strokeStyle = "#1c2942";
    ctx.lineWidth = 1;
    for (let x = 1; x < COLUMNS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(viewport.x + x * cellWidth, viewport.y);
      ctx.lineTo(viewport.x + x * cellWidth, viewport.y + viewport.height);
      ctx.stroke();
    }
    for (let y = 1; y < ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(viewport.x, viewport.y + y * cellHeight);
      ctx.lineTo(viewport.x + viewport.width, viewport.y + y * cellHeight);
      ctx.stroke();
    }
    for (const fragment of rasterResult.fragments) {
      ctx.fillStyle = cssColor(fragment.color);
      ctx.fillRect(
        viewport.x + fragment.x * cellWidth + 1,
        viewport.y + fragment.y * cellHeight + 1,
        Math.max(1, cellWidth - 2),
        Math.max(1, cellHeight - 2),
      );
    }
  }, [fullPolygon, mode, nearPlane, rasterResult.fragments, size, triangle, visiblePolygon]);

  const applyPreset = (name: PresetName) => {
    setPreset(name);
    setBaseTriangle(cloneTriangle(presets[name]));
    setDepthOffset(0);
    setPaused(true);
    setEdgeLimit(3);
    animationDirection.current = 1;
  };

  const reset = () => {
    applyPreset(preset);
    setNearPlane(1);
    setPolicy("clip");
  };

  const stepDepth = () => {
    setDepthOffset((current) => current + animationDirection.current * 0.08);
    setPaused(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragStart.current = { pointerX: event.clientX, depthOffset };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    const delta = event.clientX - dragStart.current.pointerX;
    setDepthOffset(dragStart.current.depthOffset + delta * 0.012);
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const names: PresetName[] = ["inside", "one-out", "two-out", "outside", "on-plane"];
    if (event.key >= "1" && event.key <= "5") {
      applyPreset(names[Number(event.key) - 1]);
      return;
    }
    if (event.key.toLowerCase() === "a" || event.key === "ArrowLeft") {
      event.preventDefault();
      setDepthOffset((current) => current - 0.12);
      setPaused(true);
    }
    if (event.key.toLowerCase() === "d" || event.key === "ArrowRight") {
      event.preventDefault();
      setDepthOffset((current) => current + 0.12);
      setPaused(true);
    }
    if (event.key === " ") {
      event.preventDefault();
      if (!reducedMotion) setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n") stepDepth();
    if (event.key.toLowerCase() === "v") {
      setPolicy((current) => (current === "clip" ? "discard" : "clip"));
    }
    if (event.key.toLowerCase() === "r") reset();
  };

  const selectedIntersection = useMemo(() => {
    for (let index = 0; index < 3; index += 1) {
      const start = nearTriangleVertices(triangle)[index];
      const end = nearTriangleVertices(triangle)[(index + 1) % 3];
      if (nearVertexIsInside(start, nearPlane) !== nearVertexIsInside(end, nearPlane)) {
        return intersectNearPlane(start, end, nearPlane);
      }
    }
    return undefined;
  }, [nearPlane, triangle]);

  const distances = nearTriangleVertices(triangle)
    .map((vertex) => nearSignedDistance(vertex, nearPlane).toFixed(2))
    .join(" / ");
  const transition =
    mode === "near-polygon" && edgeLimit > 0
      ? clipSteps[edgeLimit - 1].transition
      : clipSteps.map((step) => step.transition).join(", ");

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Tình huống
          <select
            aria-label="Tình huống near-plane clipping"
            value={preset}
            onChange={(event) => applyPreset(event.target.value as PresetName)}
          >
            <option value="inside">1 · All inside</option>
            <option value="one-out">2 · One outside</option>
            <option value="two-out">3 · Two outside</option>
            <option value="outside">4 · All outside</option>
            <option value="on-plane">5 · On plane</option>
          </select>
        </label>
        <label>
          Near
          <input
            aria-label="Độ sâu near plane"
            type="range"
            min="0.6"
            max="1.6"
            step="0.05"
            value={nearPlane}
            onChange={(event) => setNearPlane(Number(event.target.value))}
          />
          <output>{nearPlane.toFixed(2)}</output>
        </label>
        {(mode === "near-scene" || mode === "near-raster" || mode === "near-validation") && (
          <label>
            Xử lý
            <select
              aria-label="Cách xử lý triangle cắt near plane"
              value={policy}
              onChange={(event) => setPolicy(event.target.value as RenderPolicy)}
            >
              <option value="clip">Clip phần ngoài</option>
              <option value="discard">Bỏ cả triangle</option>
            </select>
          </label>
        )}
        {mode === "near-polygon" && (
          <button type="button" onClick={() => setEdgeLimit((current) => (current + 1) % 4)}>
            Tiến một cạnh ({edgeLimit}/3)
          </button>
        )}
        <button
          type="button"
          disabled={reducedMotion}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Chạy sweep" : "Tạm dừng"}
        </button>
        <button type="button" onClick={stepDepth}>
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
        aria-label="Mặt cắt camera space và viewport của tam giác được cắt tại near plane"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          dragStart.current = null;
        }}
      />
      <LabReadout
        items={[
          { label: "d(A) / d(B) / d(C)", value: distances },
          {
            label: "Inside / outside / on",
            value: `${counts.inside} / ${counts.outside} / ${counts.onPlane}`,
          },
          { label: "Chuyển trạng thái", value: transition || "—" },
          {
            label: "Giao điểm t",
            value: selectedIntersection ? selectedIntersection.t.toFixed(4) : "không có",
          },
          {
            label: "Polygon → triangle",
            value: `${fullPolygon.length} → ${triangulateNearPolygon(fullPolygon).length}`,
          },
          {
            label: "Pixels / violation",
            value: `${rasterResult.coveredCount} / ${maximumNearViolation(fullPolygon, nearPlane).toExponential(1)}`,
          },
        ]}
      />
      <p className="sr-only">
        Triangle hiện có {counts.inside} vertex inside và {counts.outside} vertex outside. Polygon
        sau clipping có {fullPolygon.length} vertex và tạo{" "}
        {triangulateNearPolygon(fullPolygon).length}
        triangle.
      </p>
    </div>
  );
}
