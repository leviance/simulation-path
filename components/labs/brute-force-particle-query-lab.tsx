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
  particleQueryResultsMatch,
  queryParticlesSquared,
  queryParticlesWithDistance,
  runParticleQueryBatch,
  type ParticleBatchMetrics,
  type ParticleBounds,
  type ParticlePoint,
  type ParticleQueryCircle,
} from "@/lib/labs/brute-force-particle-query";
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
const SCALING_COUNTS = [1000, 10_000, 100_000] as const;

interface ParticleView {
  left: number;
  top: number;
  size: number;
  graphTop: number;
}

interface TimedBatch extends ParticleBatchMetrics {
  elapsedMilliseconds: number;
}

interface TimedScalingRow extends TimedBatch {
  particleCount: number;
}

function makeView(width: number, height: number, showGraph: boolean): ParticleView {
  const graphHeight = showGraph ? 150 : 0;
  const size = Math.max(120, Math.min(width - 36, height - graphHeight - 42));
  return {
    left: (width - size) / 2,
    top: 18,
    size,
    graphTop: height - graphHeight + 10,
  };
}

function worldToCanvas(point: ParticlePoint, view: ParticleView) {
  return {
    x: view.left + point.x * view.size,
    y: view.top + (1 - point.y) * view.size,
  };
}

function canvasToWorld(point: ParticlePoint, view: ParticleView) {
  return {
    x: Math.max(0, Math.min(1, (point.x - view.left) / view.size)),
    y: Math.max(0, Math.min(1, 1 - (point.y - view.top) / view.size)),
  };
}

function drawScalingGraph(
  context: CanvasRenderingContext2D,
  rows: readonly TimedScalingRow[],
  width: number,
  height: number,
  view: ParticleView,
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
  context.fillText("ms/query", left, top - 7);
  if (rows.length === 0) {
    context.fillText("Chạy scaling để đo 1k → 10k → 100k", left + 12, top + 26);
    return;
  }

  const maximum = Math.max(
    0.001,
    ...rows.map((row) => row.elapsedMilliseconds / Math.max(1, row.queryCount)),
  );
  const slotWidth = (right - left) / rows.length;
  rows.forEach((row, index) => {
    const perQuery = row.elapsedMilliseconds / Math.max(1, row.queryCount);
    const barHeight = (perQuery / maximum) * (bottom - top - 20);
    const centerX = left + slotWidth * (index + 0.5);
    context.fillStyle = "#98c379";
    context.fillRect(centerX - 20, bottom - barHeight, 40, barHeight);
    context.fillStyle = "#aebbd2";
    context.textAlign = "center";
    context.fillText(row.particleCount.toLocaleString("vi-VN"), centerX, bottom + 16);
    context.fillText(perQuery.toFixed(3), centerX, Math.max(top + 12, bottom - barHeight - 6));
  });
  context.textAlign = "start";
}

export default function BruteForceParticleQueryLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(MAXIMUM_PARTICLE_COUNT);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [query, setQuery] = useState<ParticleQueryCircle>({
    center: { x: 0.5, y: 0.5 },
    radius: 0.08,
  });
  const [scanFraction, setScanFraction] = useState(1);
  const [paused, setPaused] = useState(true);
  const [autoProbe, setAutoProbe] = useState(false);
  const [autoPhase, setAutoPhase] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [benchmark, setBenchmark] = useState<TimedBatch | null>(null);
  const [scalingRows, setScalingRows] = useState<TimedScalingRow[]>([]);
  const animationFrame = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [workspace] = useState(createParticleQueryWorkspace);

  const showQuery = mode !== "brute-scene";
  const showHits =
    mode === "brute-scan" ||
    mode === "brute-squared" ||
    mode === "brute-benchmark" ||
    mode === "brute-scaling" ||
    mode === "brute-validation" ||
    !mode;
  const showBenchmark =
    mode === "brute-benchmark" || mode === "brute-scaling" || mode === "brute-validation" || !mode;
  const showScaling = mode === "brute-scaling" || mode === "brute-validation" || !mode;
  const usesReadableDistance = mode === "brute-scan";
  const view = useMemo(
    () => makeView(size.width, size.height, showScaling),
    [showScaling, size.height, size.width],
  );
  const particles = useMemo(() => makeParticleCloud(MAXIMUM_PARTICLE_COUNT, BOUNDS, seed), [seed]);
  const scanLimit =
    mode === "brute-scan" ? Math.max(1, Math.round(particleCount * scanFraction)) : particleCount;
  const result = useMemo(() => {
    if (usesReadableDistance) return queryParticlesWithDistance(particles, query, scanLimit);
    return queryParticlesSquared(particles, query, workspace, scanLimit);
  }, [particles, query, scanLimit, usesReadableDistance, workspace]);
  const comparison = useMemo(() => {
    if (mode !== "brute-squared") return null;
    return queryParticlesWithDistance(particles, query, particleCount);
  }, [mode, particleCount, particles, query]);

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
    const drawStride = Math.max(1, Math.ceil(particleCount / 30_000));
    context.fillStyle = "#61738d";
    for (let index = 0; index < particleCount; index += drawStride) {
      const screen = worldToCanvas(particles[index], view);
      context.fillRect(Math.round(screen.x), Math.round(screen.y), 1.2, 1.2);
    }

    if (showHits) {
      context.fillStyle = "#e5c07b";
      const hitStride = Math.max(1, Math.ceil(result.hitIndices.length / 5000));
      for (let position = 0; position < result.hitIndices.length; position += hitStride) {
        const index = result.hitIndices[position];
        if (index >= particleCount) continue;
        const screen = worldToCanvas(particles[index], view);
        context.fillRect(screen.x - 1.5, screen.y - 1.5, 3, 3);
      }
      if (result.nearestIndex >= 0 && result.nearestIndex < particleCount) {
        const nearest = worldToCanvas(particles[result.nearestIndex], view);
        context.strokeStyle = "#e06c75";
        context.lineWidth = 2;
        context.beginPath();
        context.arc(nearest.x, nearest.y, 7, 0, Math.PI * 2);
        context.stroke();
      }
    }

    if (showQuery) {
      const center = worldToCanvas(query.center, view);
      context.strokeStyle = "#61afef";
      context.fillStyle = "rgba(97, 175, 239, 0.08)";
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
    }

    if (showScaling) drawScalingGraph(context, scalingRows, size.width, size.height, view);
  }, [
    particleCount,
    particles,
    query,
    result,
    scalingRows,
    showHits,
    showQuery,
    showScaling,
    size,
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
    if (mode === "brute-scan" && scanFraction < 1) {
      setScanFraction((current) => Math.min(1, current + 0.1));
      setPaused(true);
      return;
    }
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
  };

  const runTimedBatch = (limit: number, queries: readonly ParticleQueryCircle[]) => {
    const localWorkspace = createParticleQueryWorkspace();
    runParticleQueryBatch(particles, queries, 1, localWorkspace, limit);
    const started = performance.now();
    const metrics = runParticleQueryBatch(particles, queries, 2, localWorkspace, limit);
    const elapsedMilliseconds = performance.now() - started;
    return { ...metrics, elapsedMilliseconds };
  };

  const runBenchmark = () => {
    const queries = makeParticleProbeQueries(24, BOUNDS, query.radius, seed ^ 0x9e3779b9);
    setBenchmark(runTimedBatch(particleCount, queries));
  };

  const runScaling = () => {
    const queries = makeParticleProbeQueries(8, BOUNDS, query.radius, seed ^ 0x27182818);
    setScalingRows(
      SCALING_COUNTS.map((count) => ({
        particleCount: count,
        ...runTimedBatch(count, queries),
      })),
    );
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
    setQuery({ center: { x: 0.5, y: 0.5 }, radius: 0.08 });
    setScanFraction(1);
    setPaused(true);
    setAutoProbe(false);
    setAutoPhase(0);
    setCapturing(false);
    setBenchmark(null);
    setScalingRows([]);
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
    if (event.key.toLowerCase() === "s" && showScaling) runScaling();
  };

  const nearestDistance = Number.isFinite(result.nearestDistanceSquared)
    ? Math.sqrt(result.nearestDistanceSquared)
    : Number.NaN;
  const comparisonMatches = comparison === null || particleQueryResultsMatch(comparison, result);
  const benchmarkPerQuery = benchmark
    ? benchmark.elapsedMilliseconds / Math.max(1, benchmark.queryCount)
    : 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Đám mây particle với kính lúp brute-force quanh con trỏ"
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
            }}
          >
            <option value={1000}>1.000</option>
            <option value={10_000}>10.000</option>
            <option value={50_000}>50.000</option>
            <option value={100_000}>100.000</option>
          </select>
        </label>
        {showQuery && (
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
                setScalingRows([]);
              }}
            />
          </label>
        )}
        {mode === "brute-scan" && (
          <label>
            Scan progress
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={scanFraction}
              onChange={(event) => setScanFraction(Number(event.target.value))}
            />
          </label>
        )}
        <label>
          Particle seed
          <select
            value={seed}
            onChange={(event) => {
              setSeed(Number(event.target.value));
              setBenchmark(null);
              setScalingRows([]);
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
            Chạy benchmark
          </button>
        )}
        {showScaling && (
          <button type="button" onClick={runScaling}>
            Chạy scaling
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Particles scanned / hits",
            value: `${result.scanned.toLocaleString("vi-VN")} / ${result.hitIndices.length.toLocaleString("vi-VN")}`,
          },
          {
            label: "Nearest index / distance",
            value:
              result.nearestIndex < 0
                ? "không có particle"
                : `${result.nearestIndex.toLocaleString("vi-VN")} / ${nearestDistance.toFixed(6)} world unit`,
          },
          {
            label: "Query center / radius",
            value: `(${query.center.x.toFixed(3)}, ${query.center.y.toFixed(3)}) / ${query.radius.toFixed(3)}`,
          },
          {
            label: "Reference / squared-distance",
            value:
              mode === "brute-squared"
                ? comparisonMatches
                  ? "khớp toàn bộ hit indices và nearest index"
                  : "KHÔNG KHỚP"
                : usesReadableDistance
                  ? "đang dùng sqrt dễ đọc"
                  : "đang dùng squared distance + reused workspace",
          },
          {
            label: "Benchmark / checksum",
            value: benchmark
              ? `${benchmarkPerQuery.toFixed(3)} ms/query · ${(benchmark.totalScanned / 1_000_000).toFixed(2)}M scans · ${benchmark.checksum.toString(16).padStart(8, "0")}`
              : "chưa chạy",
          },
          {
            label: "Scaling 1k / 10k / 100k",
            value:
              scalingRows.length === 0
                ? "chưa chạy"
                : scalingRows
                    .map((row) => {
                      const millisecondsPerQuery =
                        row.elapsedMilliseconds / Math.max(1, row.queryCount);
                      return `${row.particleCount.toLocaleString("vi-VN")}: ${row.totalScanned.toLocaleString("vi-VN")} scans, ${millisecondsPerQuery.toFixed(3)} ms/query`;
                    })
                    .join(" · "),
          },
          {
            label: "Draw sample / query workload",
            value: `${Math.min(particleCount, 30_000).toLocaleString("vi-VN")} điểm được vẽ / ${result.scanned.toLocaleString("vi-VN")} điểm được kiểm tra`,
          },
          {
            label: "Auto probe / pointer",
            value: `${paused ? "paused" : "running"} / ${capturing ? "đang kéo" : "đã nhả"}`,
          },
          {
            label: "Mô tả thay thế",
            value: `Kính lúp bán kính ${query.radius.toFixed(3)} chứa ${result.hitIndices.length.toLocaleString("vi-VN")} hits; brute force đã đọc ${result.scanned.toLocaleString("vi-VN")} particles theo thứ tự index.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo trên Canvas để đặt kính lúp. Space chạy/dừng auto probe, N tiến một bước, B benchmark, S
        scaling và R reset. Canvas chỉ lấy mẫu tối đa 30.000 điểm để vẽ, nhưng query vẫn quét đúng
        số particles trong readout.
      </p>
    </>
  );
}
