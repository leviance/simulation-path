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
  createParticleQueryWorkspace,
  makeParticleCloud,
  makeParticleProbeQueries,
  type ParticleBatchMetrics,
  type ParticleBounds,
  type ParticlePoint,
  type ParticleQueryCircle,
} from "@/lib/labs/brute-force-particle-query";
import {
  buildSpatialGrid,
  createSpatialGridQueryWorkspace,
  makeSpatialGridCellSizeStudy,
  queryNeighborsBruteForce,
  querySpatialGrid,
  runBruteForceNeighborBatch,
  runSpatialGridQueryBatch,
  spatialGridQueryCellRange,
  spatialGridResultMatchesBruteForce,
  type SpatialGridBatchMetrics,
  type SpatialGridCellRange,
  type SpatialGridCellSizeRow,
} from "@/lib/labs/spatial-grid";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const BOUNDS: ParticleBounds = {
  minimum: { x: 0, y: 0 },
  maximum: { x: 1, y: 1 },
};
const DEFAULT_SEED = 0x00c0ffee;
const MAXIMUM_PARTICLE_COUNT = 100_000;
const CELL_SIZE_PRESETS = [0.025, 0.05, 0.1, 0.2] as const;

interface GridView {
  left: number;
  top: number;
  size: number;
  graphTop: number;
}

interface TimedMetrics<T> {
  metrics: T;
  elapsedMilliseconds: number;
}

interface TimedComparison {
  grid: TimedMetrics<SpatialGridBatchMetrics>;
  bruteForce: TimedMetrics<ParticleBatchMetrics>;
}

function makeView(width: number, height: number, showGraph: boolean): GridView {
  const graphHeight = showGraph ? 150 : 0;
  const size = Math.max(120, Math.min(width - 36, height - graphHeight - 42));
  return {
    left: (width - size) / 2,
    top: 18,
    size,
    graphTop: height - graphHeight + 10,
  };
}

function worldToCanvas(point: ParticlePoint, view: GridView) {
  return {
    x: view.left + point.x * view.size,
    y: view.top + (1 - point.y) * view.size,
  };
}

function canvasToWorld(point: ParticlePoint, view: GridView) {
  return {
    x: Math.max(0, Math.min(1, (point.x - view.left) / view.size)),
    y: Math.max(0, Math.min(1, 1 - (point.y - view.top) / view.size)),
  };
}

function drawCandidateCells(
  context: CanvasRenderingContext2D,
  range: SpatialGridCellRange,
  cellSize: number,
  view: GridView,
) {
  context.fillStyle = "rgba(97, 175, 239, 0.14)";
  for (let row = range.minimumRow; row <= range.maximumRow; row += 1) {
    for (let column = range.minimumColumn; column <= range.maximumColumn; column += 1) {
      const minimum = worldToCanvas({ x: column * cellSize, y: row * cellSize }, view);
      const maximum = worldToCanvas(
        { x: Math.min(1, (column + 1) * cellSize), y: Math.min(1, (row + 1) * cellSize) },
        view,
      );
      context.fillRect(
        minimum.x + 1,
        maximum.y + 1,
        Math.max(0, maximum.x - minimum.x - 2),
        Math.max(0, minimum.y - maximum.y - 2),
      );
    }
  }
}

function drawGrid(
  context: CanvasRenderingContext2D,
  columns: number,
  rows: number,
  cellSize: number,
  view: GridView,
) {
  context.strokeStyle = "#2b3b58";
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 0; column <= columns; column += 1) {
    const worldX = Math.min(1, column * cellSize);
    const top = worldToCanvas({ x: worldX, y: 1 }, view);
    const bottom = worldToCanvas({ x: worldX, y: 0 }, view);
    context.moveTo(top.x, top.y);
    context.lineTo(bottom.x, bottom.y);
  }
  for (let row = 0; row <= rows; row += 1) {
    const worldY = Math.min(1, row * cellSize);
    const left = worldToCanvas({ x: 0, y: worldY }, view);
    const right = worldToCanvas({ x: 1, y: worldY }, view);
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
  }
  context.stroke();
}

function drawCellSizeGraph(
  context: CanvasRenderingContext2D,
  rows: readonly SpatialGridCellSizeRow[],
  width: number,
  height: number,
  view: GridView,
) {
  const left = 42;
  const right = width - 24;
  const top = view.graphTop;
  const bottom = height - 28;
  context.strokeStyle = "#34435f";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();
  context.fillStyle = "#aebbd2";
  context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillText("candidates/query", left, top - 7);
  if (rows.length === 0) {
    context.fillText("Chạy cell-size study để so 0.025 → 0.2", left + 12, top + 26);
    return;
  }

  const maximum = Math.max(
    1,
    ...rows.map((row) => row.totalCandidates / Math.max(1, row.queryCount)),
  );
  const slotWidth = (right - left) / rows.length;
  rows.forEach((row, index) => {
    const candidatesPerQuery = row.totalCandidates / Math.max(1, row.queryCount);
    const barHeight = (candidatesPerQuery / maximum) * (bottom - top - 20);
    const centerX = left + slotWidth * (index + 0.5);
    context.fillStyle = "#98c379";
    context.fillRect(centerX - 20, bottom - barHeight, 40, barHeight);
    context.fillStyle = "#aebbd2";
    context.textAlign = "center";
    context.fillText(row.cellSize.toFixed(3), centerX, bottom + 16);
    context.fillText(
      Math.round(candidatesPerQuery).toLocaleString("vi-VN"),
      centerX,
      Math.max(top + 12, bottom - barHeight - 6),
    );
  });
  context.textAlign = "start";
}

export default function SpatialGridNeighborQueryLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(MAXIMUM_PARTICLE_COUNT);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [cellSize, setCellSize] = useState(0.05);
  const [query, setQuery] = useState<ParticleQueryCircle>({
    center: { x: 0.5, y: 0.5 },
    radius: 0.08,
  });
  const [paused, setPaused] = useState(true);
  const [autoProbe, setAutoProbe] = useState(false);
  const [autoPhase, setAutoPhase] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [benchmark, setBenchmark] = useState<TimedComparison | null>(null);
  const [studyRows, setStudyRows] = useState<SpatialGridCellSizeRow[]>([]);
  const animationFrame = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  const showCandidates =
    mode === "grid-candidates" ||
    mode === "grid-filter" ||
    mode === "grid-compare" ||
    mode === "grid-benchmark" ||
    mode === "grid-cell-size" ||
    mode === "grid-validation" ||
    !mode;
  const showHits = mode !== "grid-layout" && mode !== "grid-insert";
  const showBenchmark =
    mode === "grid-benchmark" || mode === "grid-cell-size" || mode === "grid-validation" || !mode;
  const showStudy = mode === "grid-cell-size" || mode === "grid-validation" || !mode;
  const showLiveOracle = mode === "grid-compare";
  const view = useMemo(
    () => makeView(size.width, size.height, showStudy),
    [showStudy, size.height, size.width],
  );
  const cloud = useMemo(() => makeParticleCloud(MAXIMUM_PARTICLE_COUNT, BOUNDS, seed), [seed]);
  const particles = useMemo(() => cloud.slice(0, particleCount), [cloud, particleCount]);
  const grid = useMemo(
    () => buildSpatialGrid(particles, { bounds: BOUNDS, cellSize }),
    [cellSize, particles],
  );
  const result = useMemo(
    () => querySpatialGrid(grid, particles, query, createSpatialGridQueryWorkspace()),
    [grid, particles, query],
  );
  const cellRange = useMemo(() => spatialGridQueryCellRange(grid, query), [grid, query]);
  const liveOracle = useMemo(() => {
    if (!showLiveOracle) return null;
    return queryNeighborsBruteForce(particles, query, createParticleQueryWorkspace());
  }, [particles, query, showLiveOracle]);
  const liveMatch = liveOracle === null || spatialGridResultMatchesBruteForce(result, liveOracle);

  useEffect(() => {
    if (paused || !autoProbe || reducedMotion) {
      lastTimestamp.current = null;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      const previous = lastTimestamp.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - previous) / 1000);
      lastTimestamp.current = timestamp;
      setAutoPhase((current) => {
        const next = current + deltaSeconds * 0.8;
        setQuery((currentQuery) => ({
          ...currentQuery,
          center: {
            x: 0.5 + 0.33 * Math.cos(next),
            y: 0.5 + 0.28 * Math.sin(1.7 * next),
          },
        }));
        return next;
      });
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      lastTimestamp.current = null;
    };
  }, [autoProbe, paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    context.fillStyle = "#11182a";
    context.fillRect(view.left - 1, view.top - 1, view.size + 2, view.size + 2);
    if (showCandidates && cellRange !== null) {
      drawCandidateCells(context, cellRange, cellSize, view);
    }
    drawGrid(context, grid.columns, grid.rows, cellSize, view);

    const drawStride = Math.max(1, Math.ceil(particleCount / 30_000));
    context.fillStyle = "#61738d";
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += drawStride) {
      const screen = worldToCanvas(particles[particleIndex], view);
      context.fillRect(Math.round(screen.x), Math.round(screen.y), 1.2, 1.2);
    }

    if (showHits) {
      context.fillStyle = "#e5c07b";
      const hitStride = Math.max(1, Math.ceil(result.hitIndices.length / 5000));
      for (let position = 0; position < result.hitIndices.length; position += hitStride) {
        const particleIndex = result.hitIndices[position];
        const particle = particles[particleIndex];
        if (particle === undefined) continue;
        const screen = worldToCanvas(particle, view);
        context.fillRect(screen.x - 1.5, screen.y - 1.5, 3, 3);
      }
      if (result.nearestIndex >= 0 && result.nearestIndex < particles.length) {
        const nearest = worldToCanvas(particles[result.nearestIndex], view);
        context.strokeStyle = "#e06c75";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(nearest.x, nearest.y, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }

    const center = worldToCanvas(query.center, view);
    context.strokeStyle = "#61afef";
    context.fillStyle = "rgba(97, 175, 239, 0.06)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(center.x, center.y, query.radius * view.size, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(center.x - 7, center.y);
    context.lineTo(center.x + 7, center.y);
    context.moveTo(center.x, center.y - 7);
    context.lineTo(center.x, center.y + 7);
    context.stroke();

    if (showStudy) drawCellSizeGraph(context, studyRows, size.width, size.height, view);
  }, [
    cellRange,
    cellSize,
    grid.columns,
    grid.rows,
    particleCount,
    particles,
    query,
    result,
    showCandidates,
    showHits,
    showStudy,
    size,
    studyRows,
    view,
  ]);

  const setQueryFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setQuery((current) => ({
      ...current,
      center: canvasToWorld(canvasPoint(event, canvas), view),
    }));
    setAutoProbe(false);
    setBenchmark(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    setCapturing(true);
    setQueryFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerId.current = null;
    setCapturing(false);
  };

  const stepProbe = () => {
    const next = autoPhase + 0.08;
    setAutoPhase(next);
    setQuery((current) => ({
      ...current,
      center: {
        x: 0.5 + 0.33 * Math.cos(next),
        y: 0.5 + 0.28 * Math.sin(1.7 * next),
      },
    }));
    setAutoProbe(true);
    setPaused(true);
    setBenchmark(null);
  };

  const timeGridBatch = (queries: readonly ParticleQueryCircle[]) => {
    const workspace = createSpatialGridQueryWorkspace();
    runSpatialGridQueryBatch(grid, particles, queries, 1, workspace);
    const started = performance.now();
    const metrics = runSpatialGridQueryBatch(grid, particles, queries, 2, workspace);
    return { metrics, elapsedMilliseconds: performance.now() - started };
  };

  const timeBruteForceBatch = (queries: readonly ParticleQueryCircle[]) => {
    const workspace = createParticleQueryWorkspace();
    runBruteForceNeighborBatch(particles, queries, 1, workspace);
    const started = performance.now();
    const metrics = runBruteForceNeighborBatch(particles, queries, 2, workspace);
    return { metrics, elapsedMilliseconds: performance.now() - started };
  };

  const runBenchmark = () => {
    const queries = makeParticleProbeQueries(24, BOUNDS, query.radius, seed ^ 0x9e3779b9);
    setBenchmark({
      grid: timeGridBatch(queries),
      bruteForce: timeBruteForceBatch(queries),
    });
  };

  const runCellSizeStudy = () => {
    const queries = makeParticleProbeQueries(8, BOUNDS, query.radius, seed ^ 0x280028);
    setStudyRows(makeSpatialGridCellSizeStudy(particles, BOUNDS, queries, CELL_SIZE_PRESETS, 1));
  };

  const reset = () => {
    const canvas = canvasRef.current;
    if (
      canvas !== null &&
      activePointerId.current !== null &&
      canvas.hasPointerCapture(activePointerId.current)
    ) {
      canvas.releasePointerCapture(activePointerId.current);
    }
    setParticleCount(MAXIMUM_PARTICLE_COUNT);
    setSeed(DEFAULT_SEED);
    setCellSize(0.05);
    setQuery({ center: { x: 0.5, y: 0.5 }, radius: 0.08 });
    setPaused(true);
    setAutoProbe(false);
    setAutoPhase(0);
    setCapturing(false);
    setBenchmark(null);
    setStudyRows([]);
    activePointerId.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      setAutoProbe(true);
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n") stepProbe();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "b" && showBenchmark) runBenchmark();
    if (event.key.toLowerCase() === "s" && showStudy) runCellSizeStudy();
  };

  const bruteScans = particleCount;
  const reduction = 1 - result.candidatesChecked / Math.max(1, bruteScans);
  const gridPerQuery = benchmark
    ? benchmark.grid.elapsedMilliseconds / Math.max(1, benchmark.grid.metrics.queryCount)
    : 0;
  const brutePerQuery = benchmark
    ? benchmark.bruteForce.elapsedMilliseconds /
      Math.max(1, benchmark.bruteForce.metrics.queryCount)
    : 0;
  const benchmarkMatches =
    benchmark === null || benchmark.grid.metrics.checksum === benchmark.bruteForce.metrics.checksum;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Spatial Grid chia thành phố particle thành các cell và tìm hàng xóm quanh con trỏ"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) setQueryFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        <label>
          Số particles
          <select
            value={particleCount}
            onChange={(event) => {
              setParticleCount(Number(event.target.value));
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            <option value={1000}>1.000</option>
            <option value={10_000}>10.000</option>
            <option value={100_000}>100.000</option>
          </select>
        </label>
        <label>
          Cell size
          <select
            value={cellSize}
            onChange={(event) => {
              setCellSize(Number(event.target.value));
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            {CELL_SIZE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {value.toFixed(3)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Query radius
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.005"
            value={query.radius}
            onChange={(event) => {
              setQuery((current) => ({ ...current, radius: Number(event.target.value) }));
              setBenchmark(null);
              setStudyRows([]);
            }}
          />
        </label>
        <label>
          Particle seed
          <select
            value={seed}
            onChange={(event) => {
              setSeed(Number(event.target.value));
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            <option value={DEFAULT_SEED}>C0FFEE</option>
            <option value={0x12345678}>12345678</option>
            <option value={0x31415926}>31415926</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setAutoProbe(true);
            setPaused((current) => !current);
          }}
        >
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={stepProbe}>
          Tiến một bước
        </button>
        {showBenchmark && (
          <button type="button" onClick={runBenchmark}>
            So benchmark
          </button>
        )}
        {showStudy && (
          <button type="button" onClick={runCellSizeStudy}>
            Chạy cell-size study
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Grid / occupancy",
            value: `${grid.columns}×${grid.rows} · ${grid.nonEmptyCells.toLocaleString("vi-VN")} cell có hạt · max ${grid.maximumBucketSize.toLocaleString("vi-VN")} · build ${grid.rebuildMilliseconds.toFixed(2)} ms`,
          },
          {
            label: "Cells visited / candidates / hits",
            value: `${result.visitedCells.toLocaleString("vi-VN")} / ${result.candidatesChecked.toLocaleString("vi-VN")} / ${result.hitIndices.length.toLocaleString("vi-VN")}`,
          },
          {
            label: "Grid candidates / brute scans",
            value: `${result.candidatesChecked.toLocaleString("vi-VN")} / ${bruteScans.toLocaleString("vi-VN")} · giảm ${(reduction * 100).toFixed(1)}%`,
          },
          {
            label: "Query center / radius",
            value: `(${query.center.x.toFixed(3)}, ${query.center.y.toFixed(3)}) / ${query.radius.toFixed(3)}`,
          },
          {
            label: "Grid / brute-force oracle",
            value: showLiveOracle
              ? liveMatch
                ? "khớp hit set và nearest hit"
                : "KHÔNG KHỚP"
              : benchmark
                ? benchmarkMatches
                  ? "checksum khớp"
                  : "CHECKSUM KHÔNG KHỚP"
                : "chưa đối chiếu",
          },
          {
            label: "Benchmark grid / brute",
            value: benchmark
              ? `${gridPerQuery.toFixed(3)} / ${brutePerQuery.toFixed(3)} ms/query · ${benchmark.grid.metrics.checksum.toString(16).padStart(8, "0")}`
              : "chưa chạy",
          },
          {
            label: "Cell-size study",
            value:
              studyRows.length === 0
                ? "chưa chạy"
                : studyRows
                    .map((row) => {
                      const candidatesPerQuery = row.totalCandidates / Math.max(1, row.queryCount);
                      return `${row.cellSize.toFixed(3)}: ${Math.round(candidatesPerQuery).toLocaleString("vi-VN")} candidates/query, max bucket ${row.maximumBucketSize.toLocaleString("vi-VN")}`;
                    })
                    .join(" · "),
          },
          {
            label: "Draw sample / indexed workload",
            value: `${Math.min(particleCount, 30_000).toLocaleString("vi-VN")} điểm được vẽ / ${particleCount.toLocaleString("vi-VN")} index nằm trong grid`,
          },
          {
            label: "Auto probe / pointer",
            value: `${paused ? "paused" : "running"} / ${capturing ? "đang kéo" : "đã nhả"}`,
          },
          {
            label: "Mô tả thay thế",
            value: `Grid ${grid.columns}×${grid.rows} thăm ${result.visitedCells} cells, kiểm ${result.candidatesChecked} candidates và tìm ${result.hitIndices.length} hàng xóm trong circle; brute force sẽ đọc ${particleCount} particles.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo trên Canvas để đặt query. Space chạy/dừng auto probe, N tiến một bước, B so benchmark, S
        chạy cell-size study và R reset. Ô xanh là candidate cells; hạt vàng mới là hit thật sau
        circle test.
      </p>
    </>
  );
}
