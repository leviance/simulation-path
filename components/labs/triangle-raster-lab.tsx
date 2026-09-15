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
  barycentricSumError,
  interpolateBarycentricRgb,
  normalizeTriangleWinding,
  rasterPixelCenter,
  rasterizeTriangleCoverage,
  sampleRasterTriangle,
  sharedTriangleEdgeOwnership,
  triangleCandidateCount,
  triangleSignedDoubleArea,
  triangleWinding,
  type RasterPoint,
  type RasterTriangle,
  type TriangleFillRule,
} from "@/lib/labs/triangle-raster";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const COLUMNS = 24;
const ROWS = 16;

type PresetName = "normal" | "reversed" | "degenerate" | "clipped" | "shared" | "custom";

interface PresetValue {
  first: RasterTriangle;
  second?: RasterTriangle;
}

const presets: Record<Exclude<PresetName, "custom">, PresetValue> = {
  normal: {
    first: { a: { x: 12, y: 2 }, b: { x: 21, y: 13 }, c: { x: 3, y: 13 } },
  },
  reversed: {
    first: { a: { x: 12, y: 2 }, b: { x: 3, y: 13 }, c: { x: 21, y: 13 } },
  },
  degenerate: {
    first: { a: { x: 4, y: 4 }, b: { x: 12, y: 8 }, c: { x: 20, y: 12 } },
  },
  clipped: {
    first: { a: { x: -3, y: 5 }, b: { x: 17, y: -2 }, c: { x: 19, y: 15 } },
  },
  shared: {
    first: { a: { x: 5, y: 3 }, b: { x: 19, y: 3 }, c: { x: 5, y: 13 } },
    second: { a: { x: 19, y: 3 }, b: { x: 19, y: 13 }, c: { x: 5, y: 13 } },
  },
};

function cloneTriangle(triangle: RasterTriangle): RasterTriangle {
  return {
    a: { ...triangle.a },
    b: { ...triangle.b },
    c: { ...triangle.c },
  };
}

function presetValue(name: Exclude<PresetName, "custom">) {
  const source = presets[name];
  return {
    first: cloneTriangle(source.first),
    second: source.second ? cloneTriangle(source.second) : undefined,
  };
}

function vertexAt(triangle: RasterTriangle, key: "a" | "b" | "c") {
  return triangle[key];
}

export default function TriangleRasterLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialPreset = mode === "triangle-top-left" ? "shared" : "normal";
  const initialValue = presetValue(initialPreset);
  const [preset, setPreset] = useState<PresetName>(initialPreset);
  const [triangle, setTriangle] = useState(initialValue.first);
  const [secondTriangle, setSecondTriangle] = useState<RasterTriangle | undefined>(
    initialValue.second,
  );
  const [fillRule, setFillRule] = useState<TriangleFillRule>("top-left");
  const [sampleCell, setSampleCell] = useState({ x: 11, y: 8 });
  const [sampleAtCenter, setSampleAtCenter] = useState(true);
  const [barycentricColor, setBarycentricColor] = useState(true);
  const [candidateLimit, setCandidateLimit] = useState(Number.POSITIVE_INFINITY);
  const [paused, setPaused] = useState(true);
  const draggedVertex = useRef<"a" | "b" | "c" | null>(null);

  const grid = useMemo(() => {
    const cell = Math.max(
      10,
      Math.floor(Math.min((size.width - 40) / COLUMNS, (size.height - 40) / ROWS)),
    );
    return {
      cell,
      left: Math.round((size.width - cell * COLUMNS) / 2),
      top: Math.round((size.height - cell * ROWS) / 2),
    };
  }, [size]);

  const primary = useMemo(
    () => rasterizeTriangleCoverage(triangle, COLUMNS, ROWS, fillRule, candidateLimit),
    [candidateLimit, fillRule, triangle],
  );
  const secondary = useMemo(
    () =>
      secondTriangle
        ? rasterizeTriangleCoverage(secondTriangle, COLUMNS, ROWS, fillRule)
        : undefined,
    [fillRule, secondTriangle],
  );
  const candidateCount = primary.candidateCount;

  const samplePosition = useMemo(
    () =>
      sampleAtCenter
        ? rasterPixelCenter(sampleCell.x, sampleCell.y)
        : { x: sampleCell.x, y: sampleCell.y },
    [sampleAtCenter, sampleCell],
  );
  const selectedSample = sampleRasterTriangle(triangle, samplePosition, fillRule);
  const sampleOwners = secondTriangle
    ? sharedTriangleEdgeOwnership(triangle, secondTriangle, samplePosition, fillRule)
    : Number(selectedSample.inside);

  useEffect(() => {
    if (paused || !Number.isFinite(candidateLimit) || candidateLimit >= candidateCount) return;
    if (reducedMotion) return;
    const frame = requestAnimationFrame(() => {
      setCandidateLimit((current) => Math.min(candidateCount, current + 8));
    });
    return () => cancelAnimationFrame(frame);
  }, [candidateCount, candidateLimit, paused, reducedMotion]);

  const showFill =
    mode === "triangle-fill" || mode === "triangle-top-left" || mode === "triangle-barycentric";
  const showBounds = mode !== "triangle-frame";
  const showSample =
    mode === "triangle-edge" ||
    mode === "triangle-center" ||
    mode === "triangle-fill" ||
    mode === "triangle-top-left" ||
    mode === "triangle-barycentric";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const toCanvas = (point: RasterPoint) => ({
      x: grid.left + point.x * grid.cell,
      y: grid.top + point.y * grid.cell,
    });
    const cellRect = (x: number, y: number, inset = 1) => ({
      x: grid.left + x * grid.cell + inset,
      y: grid.top + y * grid.cell + inset,
      size: grid.cell - inset * 2,
    });

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#263451";
    for (let x = 0; x <= COLUMNS; x += 1) {
      const px = grid.left + x * grid.cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, grid.top);
      ctx.lineTo(px, grid.top + ROWS * grid.cell);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y += 1) {
      const py = grid.top + y * grid.cell + 0.5;
      ctx.beginPath();
      ctx.moveTo(grid.left, py);
      ctx.lineTo(grid.left + COLUMNS * grid.cell, py);
      ctx.stroke();
    }

    if (showFill) {
      const coverage = new Map<string, number>();
      const drawFragments = (fragments: typeof primary.fragments, second: boolean) => {
        for (const fragment of fragments) {
          const key = `${fragment.x},${fragment.y}`;
          const count = (coverage.get(key) ?? 0) + 1;
          coverage.set(key, count);
          const rect = cellRect(fragment.x, fragment.y, 2);
          if (count > 1) {
            ctx.fillStyle = "#ff4860";
          } else if (second) {
            ctx.fillStyle = "#936cdc";
          } else if (mode === "triangle-barycentric" && barycentricColor) {
            const color = interpolateBarycentricRgb(fragment.sample.barycentric);
            ctx.fillStyle = `rgb(${color.red} ${color.green} ${color.blue})`;
          } else {
            ctx.fillStyle = "#5d84d6";
          }
          ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
        }
      };
      drawFragments(primary.fragments, false);
      if (secondary) drawFragments(secondary.fragments, true);

      if (mode === "triangle-fill" && Number.isFinite(candidateLimit)) {
        let visited = 0;
        for (
          let y = primary.bounds.minY;
          y <= primary.bounds.maxY && visited < primary.testedCount;
          y += 1
        ) {
          for (
            let x = primary.bounds.minX;
            x <= primary.bounds.maxX && visited < primary.testedCount;
            x += 1
          ) {
            const sample = sampleRasterTriangle(triangle, rasterPixelCenter(x, y), fillRule);
            if (!sample.inside) {
              const rect = cellRect(x, y, 4);
              ctx.fillStyle = "#303b55";
              ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
            }
            visited += 1;
          }
        }
      }
    }

    if (showBounds && primary.candidateCount > 0) {
      ctx.strokeStyle = "#ffbe52";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        grid.left + primary.bounds.minX * grid.cell,
        grid.top + primary.bounds.minY * grid.cell,
        (primary.bounds.maxX - primary.bounds.minX + 1) * grid.cell,
        (primary.bounds.maxY - primary.bounds.minY + 1) * grid.cell,
      );
    }

    const drawOutline = (source: RasterTriangle, color: string) => {
      const points = [toCanvas(source.a), toCanvas(source.b), toCanvas(source.c)];
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    drawOutline(triangle, "#e1e8f8");
    if (secondTriangle) drawOutline(secondTriangle, "#c2aef0");

    const vertexColors = { a: "#ff6970", b: "#53f0ae", c: "#649bff" } as const;
    for (const key of ["a", "b", "c"] as const) {
      const point = toCanvas(vertexAt(triangle, key));
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = vertexColors[key];
      ctx.fill();
      ctx.fillStyle = "#f7f9ff";
      ctx.font = "500 11px ui-monospace";
      ctx.fillText(key.toUpperCase(), point.x + 10, point.y - 8);
    }

    if (showSample) {
      const point = toCanvas(samplePosition);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = sampleOwners > 1 ? "#ff4860" : selectedSample.inside ? "#53f0ae" : "#ff6970";
      ctx.fill();
      ctx.strokeStyle = "#f7f9ff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [
    barycentricColor,
    candidateLimit,
    fillRule,
    grid,
    mode,
    primary,
    sampleOwners,
    samplePosition,
    secondTriangle,
    secondary,
    selectedSample.inside,
    showBounds,
    showFill,
    showSample,
    size,
    triangle,
  ]);

  const applyPreset = (name: Exclude<PresetName, "custom">) => {
    const next = presetValue(name);
    setPreset(name);
    setTriangle(next.first);
    setSecondTriangle(next.second);
    setCandidateLimit(Number.POSITIVE_INFINITY);
    setPaused(true);
  };

  const reset = () => {
    const name = preset === "custom" ? "normal" : preset;
    applyPreset(name);
    setFillRule("top-left");
    setSampleCell({ x: 11, y: 8 });
    setSampleAtCenter(true);
    setBarycentricColor(true);
  };

  const fromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return {
      x: Math.max(-4, Math.min(COLUMNS + 4, (point.x - grid.left) / grid.cell)),
      y: Math.max(-4, Math.min(ROWS + 4, (point.y - grid.top) / grid.cell)),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = fromEvent(event);
    let nearest: "a" | "b" | "c" | null = null;
    let distance = 0.8;
    for (const key of ["a", "b", "c"] as const) {
      const vertex = triangle[key];
      const candidate = Math.hypot(vertex.x - point.x, vertex.y - point.y);
      if (candidate < distance) {
        distance = candidate;
        nearest = key;
      }
    }
    if (nearest) {
      draggedVertex.current = nearest;
      event.currentTarget.setPointerCapture(event.pointerId);
      setPreset("custom");
      setSecondTriangle(undefined);
      return;
    }
    setSampleCell({
      x: Math.max(0, Math.min(COLUMNS - 1, Math.floor(point.x))),
      y: Math.max(0, Math.min(ROWS - 1, Math.floor(point.y))),
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const key = draggedVertex.current;
    if (!key) return;
    const point = fromEvent(event);
    setTriangle((current) => ({ ...current, [key]: point }));
    setCandidateLimit(Number.POSITIVE_INFINITY);
    setPaused(true);
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggedVertex.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key >= "1" && event.key <= "5") {
      const names = ["normal", "reversed", "degenerate", "clipped", "shared"] as const;
      applyPreset(names[Number(event.key) - 1]);
      return;
    }
    if (event.key.toLowerCase() === "t")
      setFillRule((current) => (current === "top-left" ? "inclusive" : "top-left"));
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "n") {
      setCandidateLimit((current) =>
        Math.min(candidateCount, Number.isFinite(current) ? current + 1 : 1),
      );
      setPaused(true);
    }
    if (event.key === " ") {
      event.preventDefault();
      if (candidateLimit >= candidateCount || !Number.isFinite(candidateLimit))
        setCandidateLimit(0);
      setPaused((current) => !current);
    }
    const movement: Record<string, RasterPoint> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const delta = movement[event.key];
    if (delta) {
      event.preventDefault();
      setSampleCell((current) => ({
        x: Math.max(0, Math.min(COLUMNS - 1, current.x + delta.x)),
        y: Math.max(0, Math.min(ROWS - 1, current.y + delta.y)),
      }));
    }
  };

  const startOrPause = () => {
    if (candidateLimit >= candidateCount || !Number.isFinite(candidateLimit)) {
      if (reducedMotion) {
        setCandidateLimit(candidateCount);
        setPaused(true);
        return;
      }
      setCandidateLimit(0);
      setPaused(false);
      return;
    }
    setPaused((current) => !current);
  };

  const winding = triangleWinding(triangle);
  const normalizedArea = triangleSignedDoubleArea(normalizeTriangleWinding(triangle));
  const fullPixelCount = COLUMNS * ROWS;
  const controlsFill = mode === "triangle-fill" || mode === "triangle-barycentric";

  return (
    <div className="lab-stack">
      <div className="lab-controls">
        <label>
          Tình huống
          <select
            aria-label="Tình huống tam giác"
            value={preset}
            onChange={(event) => {
              if (event.target.value !== "custom") {
                applyPreset(event.target.value as Exclude<PresetName, "custom">);
              }
            }}
          >
            <option value="normal">Tam giác thường</option>
            <option value="reversed">Đảo B/C</option>
            <option value="degenerate">Ba điểm thẳng hàng</option>
            <option value="clipped">Cắt mép Canvas</option>
            <option value="shared">Hai tam giác chung cạnh</option>
            {preset === "custom" && <option value="custom">Tự chỉnh</option>}
          </select>
        </label>
        {(mode === "triangle-top-left" || mode === "triangle-barycentric") && (
          <label>
            Fill rule
            <select
              aria-label="Quy tắc tô cạnh"
              value={fillRule}
              onChange={(event) => setFillRule(event.target.value as TriangleFillRule)}
            >
              <option value="inclusive">Inclusive (≥ 0)</option>
              <option value="top-left">Top-left</option>
            </select>
          </label>
        )}
        {mode === "triangle-center" && (
          <label>
            Điểm lấy mẫu
            <select
              aria-label="Điểm lấy mẫu pixel"
              value={sampleAtCenter ? "center" : "corner"}
              onChange={(event) => setSampleAtCenter(event.target.value === "center")}
            >
              <option value="center">Tâm (x+0.5, y+0.5)</option>
              <option value="corner">Góc (x, y)</option>
            </select>
          </label>
        )}
        {mode === "triangle-barycentric" && (
          <label>
            Shading
            <select
              aria-label="Cách tô màu tam giác"
              value={barycentricColor ? "barycentric" : "solid"}
              onChange={(event) => setBarycentricColor(event.target.value === "barycentric")}
            >
              <option value="barycentric">Barycentric RGB</option>
              <option value="solid">Màu đơn</option>
            </select>
          </label>
        )}
        {controlsFill && (
          <button type="button" onClick={startOrPause}>
            {candidateLimit >= candidateCount || !Number.isFinite(candidateLimit)
              ? "Chạy lại"
              : paused
                ? "Tiếp tục"
                : "Tạm dừng"}
          </button>
        )}
        {controlsFill && (
          <button
            type="button"
            onClick={() => {
              setCandidateLimit((current) =>
                Math.min(candidateCount, Number.isFinite(current) ? current + 1 : 1),
              );
              setPaused(true);
            }}
          >
            Tiến một pixel
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Lưới raster tam giác với ba vertex, bounding box, sample pixel và coverage"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          draggedVertex.current = null;
        }}
      />
      <LabReadout
        items={[
          {
            label: "Winding / area×2",
            value: `${winding} / ${normalizedArea.toFixed(1)}`,
          },
          {
            label: "Candidate",
            value: `${primary.candidateCount} / ${fullPixelCount} pixel`,
          },
          {
            label: "Sample edges",
            value: `${selectedSample.edgeAB.toFixed(1)}, ${selectedSample.edgeBC.toFixed(1)}, ${selectedSample.edgeCA.toFixed(1)}`,
          },
          {
            label: "Barycentric",
            value: `${selectedSample.barycentric.a.toFixed(3)}, ${selectedSample.barycentric.b.toFixed(3)}, ${selectedSample.barycentric.c.toFixed(3)}`,
          },
          {
            label: "Coverage / owners",
            value: `${selectedSample.inside ? "inside" : "outside"} / ${sampleOwners}`,
          },
          {
            label: "Tested / covered / Σw error",
            value: `${primary.testedCount}/${triangleCandidateCount(primary.bounds)} · ${primary.coveredCount} · ${barycentricSumError(selectedSample.barycentric).toExponential(1)}`,
          },
        ]}
      />
      <p className="sr-only">
        A ở ({triangle.a.x.toFixed(1)}, {triangle.a.y.toFixed(1)}), B ở ({triangle.b.x.toFixed(1)},{" "}
        {triangle.b.y.toFixed(1)}), C ở ({triangle.c.x.toFixed(1)}, {triangle.c.y.toFixed(1)}).
        Sample hiện có {sampleOwners} triangle nhận theo {fillRule} rule.
      </p>
    </div>
  );
}
