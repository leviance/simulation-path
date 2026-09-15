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
  cloneParticlesAoS,
  cloneParticlesSoA,
  estimateMemoryTraffic,
  fieldsForWorkload,
  integrateAoS,
  integrateSoA,
  makeParticlesAoS,
  makeParticlesSoA,
  maximumLayoutDifference,
  type MemoryLayout,
  type MemoryWorkload,
  type ParticlesAoS,
  type ParticlesSoA,
} from "@/lib/labs/memory-layout";
import type { MemoryLayoutBenchmarkResult } from "@/lib/labs/memory-layout-benchmark";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const DEFAULT_SEED = 0x32c0ffee;
const FIELD_COLORS = ["#61afef", "#56b6c2", "#98c379", "#e5c07b", "#d19a66", "#c678dd"];
const FIELD_LABELS = ["px", "py", "pz", "vx", "vy", "vz"];
const FIXED_DELTA_SECONDS = 1 / 120;

interface ParticleState {
  sourceAoS: ParticlesAoS;
  sourceSoA: ParticlesSoA;
  aos: ParticlesAoS;
  soa: ParticlesSoA;
  revision: number;
}

interface BenchmarkWorkerResponse {
  kind: "benchmark" | "scaling";
  rows: MemoryLayoutBenchmarkResult[];
}

function makeParticleState(count: number, seed: number, revision = 0): ParticleState {
  const sourceAoS = makeParticlesAoS(count, seed);
  const sourceSoA = makeParticlesSoA(sourceAoS);
  return {
    sourceAoS,
    sourceSoA,
    aos: cloneParticlesAoS(sourceAoS),
    soa: cloneParticlesSoA(sourceSoA),
    revision,
  };
}

function workloadLabel(workload: MemoryWorkload) {
  if (workload === "position-x") return "chỉ đọc position.x";
  if (workload === "velocity-only") return "chỉ sửa velocity";
  return "tích phân position từ velocity";
}

function layoutLabel(layout: MemoryLayout) {
  return layout === "aos" ? "AoS — từng particle liền nhau" : "SoA — từng field liền nhau";
}

function drawMemoryCells(
  context: CanvasRenderingContext2D,
  layout: MemoryLayout,
  workload: MemoryWorkload,
  selectedParticle: number,
  width: number,
) {
  const left = 26;
  const top = 38;
  const right = width - 26;
  const cellWidth = Math.max(24, Math.min(54, (right - left) / 18));
  const cellHeight = 28;
  const activeFields = new Set(fieldsForWorkload(workload));
  const visibleParticles = 6;
  context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillStyle = "#d7deec";
  context.fillText(layoutLabel(layout), left, 22);

  if (layout === "aos") {
    let slot = 0;
    for (let particle = 0; particle < visibleParticles; particle += 1) {
      for (let field = 0; field < FIELD_LABELS.length; field += 1) {
        const x = left + slot * cellWidth;
        if (x + cellWidth > right) break;
        const isActive = activeFields.has(FIELD_LABELS[field] as never);
        context.fillStyle = FIELD_COLORS[field];
        context.globalAlpha = isActive ? 0.95 : 0.2;
        context.fillRect(x, top, cellWidth - 2, cellHeight);
        context.globalAlpha = 1;
        context.fillStyle = "#0b1020";
        context.fillText(`${FIELD_LABELS[field]}${particle}`, x + 4, top + 18);
        if (particle === selectedParticle % visibleParticles) {
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.strokeRect(x + 1, top + 1, cellWidth - 4, cellHeight - 2);
        }
        slot += 1;
      }
    }
  } else {
    const slotsPerRow = Math.max(4, Math.floor((right - left) / cellWidth));
    FIELD_LABELS.forEach((fieldName, field) => {
      const row = field;
      const y = top + row * (cellHeight + 5);
      const isActive = activeFields.has(fieldName as never);
      context.fillStyle = FIELD_COLORS[field];
      context.globalAlpha = isActive ? 0.95 : 0.2;
      for (let particle = 0; particle < Math.min(visibleParticles, slotsPerRow); particle += 1) {
        const x = left + particle * cellWidth;
        context.fillRect(x, y, cellWidth - 2, cellHeight);
        context.fillStyle = "#0b1020";
        context.globalAlpha = 1;
        context.fillText(`${fieldName}${particle}`, x + 4, y + 18);
        if (particle === selectedParticle % visibleParticles) {
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.strokeRect(x + 1, y + 1, cellWidth - 4, cellHeight - 2);
        }
        context.fillStyle = FIELD_COLORS[field];
        context.globalAlpha = isActive ? 0.95 : 0.2;
      }
      context.globalAlpha = 1;
    });
  }
}

function drawParticleSample(
  context: CanvasRenderingContext2D,
  layout: MemoryLayout,
  aos: ParticlesAoS,
  soa: ParticlesSoA,
  width: number,
  height: number,
) {
  const top = layout === "aos" ? 112 : 268;
  const left = 28;
  const viewWidth = width - 56;
  const viewHeight = Math.max(90, height - top - 28);
  context.strokeStyle = "#34435f";
  context.strokeRect(left, top, viewWidth, viewHeight);
  const count = layout === "aos" ? aos.count : soa.count;
  const stride = Math.max(1, Math.ceil(count / 15_000));
  context.fillStyle = "rgba(97, 175, 239, 0.72)";
  for (let index = 0; index < count; index += stride) {
    let x = 0;
    let y = 0;
    if (layout === "aos") {
      const base = index * 6;
      x = aos.data[base];
      y = aos.data[base + 1];
    } else {
      x = soa.px[index];
      y = soa.py[index];
    }
    context.fillRect(
      left + (x * 0.5 + 0.5) * viewWidth,
      top + (1 - (y * 0.5 + 0.5)) * viewHeight,
      1.5,
      1.5,
    );
  }
}

export default function MemoryLayoutRaceLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const benchmarkWorker = useRef<Worker | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(16_384);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [layout, setLayout] = useState<MemoryLayout>(mode === "soa-layout" ? "soa" : "aos");
  const [workload, setWorkload] = useState<MemoryWorkload>(
    mode === "layout-scene" || mode === "aos-layout" ? "integrate" : "position-x",
  );
  const [paused, setPaused] = useState(true);
  const [selectedParticle, setSelectedParticle] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [benchmark, setBenchmark] = useState<MemoryLayoutBenchmarkResult | null>(null);
  const [scaling, setScaling] = useState<MemoryLayoutBenchmarkResult[]>([]);
  const [runningExperiment, setRunningExperiment] = useState<"benchmark" | "scaling" | null>(null);
  const [experimentError, setExperimentError] = useState("");
  const [particleState, setParticleState] = useState<ParticleState>(() =>
    makeParticleState(16_384, DEFAULT_SEED),
  );

  const showLayout =
    mode === "soa-layout" ||
    mode === "layout-agreement" ||
    mode === "cache-lines" ||
    mode === "layout-benchmark" ||
    mode === "layout-validation" ||
    !mode;
  const showWorkload =
    mode === "aos-baseline" ||
    mode === "layout-agreement" ||
    mode === "cache-lines" ||
    mode === "layout-benchmark" ||
    mode === "layout-validation" ||
    !mode;
  const showAnimation =
    mode === "aos-layout" || mode === "layout-agreement" || mode === "layout-validation" || !mode;
  const showBenchmark =
    mode === "aos-baseline" || mode === "layout-benchmark" || mode === "layout-validation" || !mode;
  const showAgreement =
    mode === "layout-agreement" ||
    mode === "cache-lines" ||
    mode === "layout-benchmark" ||
    mode === "layout-validation" ||
    !mode;
  const showTraffic =
    mode === "cache-lines" || mode === "layout-benchmark" || mode === "layout-validation" || !mode;
  const showScaling = mode === "layout-benchmark" || mode === "layout-validation" || !mode;

  const reset = useCallback(() => {
    benchmarkWorker.current?.terminate();
    benchmarkWorker.current = null;
    setParticleState((current) => ({
      ...current,
      aos: cloneParticlesAoS(current.sourceAoS),
      soa: cloneParticlesSoA(current.sourceSoA),
      revision: current.revision + 1,
    }));
    setPaused(true);
    setSelectedParticle(0);
    setBenchmark(null);
    setScaling([]);
    setRunningExperiment(null);
    setExperimentError("");
  }, []);

  const loadDataset = (nextCount: number, nextSeed: number) => {
    benchmarkWorker.current?.terminate();
    benchmarkWorker.current = null;
    setParticleState((current) => makeParticleState(nextCount, nextSeed, current.revision + 1));
    setPaused(true);
    setSelectedParticle(0);
    setBenchmark(null);
    setScaling([]);
    setRunningExperiment(null);
    setExperimentError("");
  };

  const stepSimulation = useCallback(() => {
    setParticleState((current) => {
      integrateAoS(current.aos, FIXED_DELTA_SECONDS);
      integrateSoA(current.soa, FIXED_DELTA_SECONDS);
      return { ...current, revision: current.revision + 1 };
    });
  }, []);

  useEffect(
    () => () => {
      benchmarkWorker.current?.terminate();
      benchmarkWorker.current = null;
    },
    [],
  );

  useEffect(() => {
    if (paused || reducedMotion) return;
    let frame = 0;
    const animate = () => {
      stepSimulation();
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stepSimulation]);

  const aosTraffic = useMemo(
    () => estimateMemoryTraffic("aos", workload, particleCount),
    [particleCount, workload],
  );
  const soaTraffic = useMemo(
    () => estimateMemoryTraffic("soa", workload, particleCount),
    [particleCount, workload],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    drawMemoryCells(context, layout, workload, selectedParticle, size.width);
    drawParticleSample(
      context,
      layout,
      particleState.aos,
      particleState.soa,
      size.width,
      size.height,
    );
    context.fillStyle = "#aebbd2";
    context.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
    context.fillText(
      `${particleCount.toLocaleString("vi-VN")} particles · ${workloadLabel(workload)}`,
      28,
      size.height - 10,
    );
  }, [layout, particleCount, particleState, selectedParticle, size, workload]);

  const stopExperiment = () => {
    benchmarkWorker.current?.terminate();
    benchmarkWorker.current = null;
    setRunningExperiment(null);
  };

  const runExperiment = (kind: "benchmark" | "scaling") => {
    stopExperiment();
    setPaused(true);
    setRunningExperiment(kind);
    setExperimentError("");
    const worker = new Worker(
      new URL("./workers/memory-layout-benchmark-worker.ts", import.meta.url),
      { type: "module" },
    );
    benchmarkWorker.current = worker;
    worker.onmessage = (event: MessageEvent<BenchmarkWorkerResponse>) => {
      if (event.data.kind === "benchmark") {
        setBenchmark(event.data.rows[0] ?? null);
      } else {
        setScaling(event.data.rows);
      }
      worker.terminate();
      if (benchmarkWorker.current === worker) benchmarkWorker.current = null;
      setRunningExperiment(null);
    };
    worker.onerror = () => {
      worker.terminate();
      if (benchmarkWorker.current === worker) benchmarkWorker.current = null;
      setRunningExperiment(null);
      setExperimentError("Không thể hoàn thành phép đo. Hãy giảm số particles rồi thử lại.");
    };
    worker.postMessage({ kind, particleCount, seed, workload });
  };

  const runBenchmark = () => runExperiment("benchmark");
  const runScaling = () => runExperiment("scaling");

  const cycleLayout = () => setLayout((current) => (current === "aos" ? "soa" : "aos"));
  const cycleWorkload = () => {
    stopExperiment();
    setWorkload((current) => {
      if (current === "position-x") return "velocity-only";
      if (current === "velocity-only") return "integrate";
      return "position-x";
    });
    setBenchmark(null);
    setScaling([]);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " " && showAnimation && particleCount <= 100_000) {
      event.preventDefault();
      setPaused((current) => !current);
    } else if (event.key.toLowerCase() === "n" && showAnimation) {
      stepSimulation();
    } else if (event.key.toLowerCase() === "l" && showLayout) {
      cycleLayout();
    } else if (event.key.toLowerCase() === "w" && showWorkload) {
      cycleWorkload();
    } else if (event.key.toLowerCase() === "b" && showBenchmark) {
      runBenchmark();
    } else if (event.key.toLowerCase() === "s" && showScaling) {
      runScaling();
    } else if (event.key.toLowerCase() === "r") {
      reset();
    }
  };

  const selectFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const fraction = Math.max(0, Math.min(0.999999, point.x / Math.max(1, size.width)));
    setSelectedParticle(Math.floor(fraction * Math.min(particleCount, 6)));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    setCapturing(true);
    selectFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    setCapturing(false);
  };

  const difference = maximumLayoutDifference(particleState.aos, particleState.soa);
  const speedRatio = benchmark
    ? benchmark.aosMilliseconds / Math.max(benchmark.soaMilliseconds, 1e-9)
    : 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Sơ đồ bộ nhớ AoS và SoA cùng particle cloud được cập nhật từ cùng state"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) selectFromPointer(event);
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
              const nextCount = Number(event.target.value);
              setParticleCount(nextCount);
              loadDataset(nextCount, seed);
            }}
          >
            <option value={4096}>4.096</option>
            <option value={16_384}>16.384</option>
            <option value={100_000}>100.000</option>
            <option value={1_000_000}>1.000.000</option>
          </select>
        </label>
        {showLayout && (
          <label>
            Memory layout
            <select
              value={layout}
              onChange={(event) => setLayout(event.target.value as MemoryLayout)}
            >
              <option value="aos">AoS</option>
              <option value="soa">SoA</option>
            </select>
          </label>
        )}
        {showWorkload && (
          <label>
            Workload
            <select
              value={workload}
              onChange={(event) => {
                stopExperiment();
                setWorkload(event.target.value as MemoryWorkload);
                setBenchmark(null);
                setScaling([]);
              }}
            >
              <option value="position-x">Đọc position.x</option>
              <option value="velocity-only">Sửa velocity</option>
              <option value="integrate">Integrate đầy đủ</option>
            </select>
          </label>
        )}
        <label>
          Seed
          <select
            value={seed}
            onChange={(event) => {
              const nextSeed = Number(event.target.value);
              setSeed(nextSeed);
              loadDataset(particleCount, nextSeed);
            }}
          >
            <option value={DEFAULT_SEED}>32C0FFEE</option>
            <option value={0x12345678}>12345678</option>
            <option value={0x31415926}>31415926</option>
          </select>
        </label>
        {showAnimation && (
          <button
            type="button"
            disabled={particleCount > 100_000}
            title={
              particleCount > 100_000
                ? "Chế độ chạy liên tục được giới hạn ở 100.000 particles để giao diện không bị treo."
                : undefined
            }
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showAnimation && (
          <button type="button" onClick={stepSimulation}>
            Tiến một bước
          </button>
        )}
        {showBenchmark && (
          <button type="button" disabled={runningExperiment !== null} onClick={runBenchmark}>
            {runningExperiment === "benchmark"
              ? "Đang đo…"
              : mode === "aos-baseline"
                ? "Đo baseline AoS"
                : "Chạy benchmark"}
          </button>
        )}
        {showScaling && (
          <button type="button" disabled={runningExperiment !== null} onClick={runScaling}>
            {runningExperiment === "scaling" ? "Đang đo scaling…" : "Chạy scaling"}
          </button>
        )}
        {runningExperiment && (
          <button type="button" onClick={stopExperiment}>
            Dừng phép đo
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "State đang quan sát",
            value: `${particleCount.toLocaleString("vi-VN")} particles · ${layoutLabel(layout)} · ${workloadLabel(workload)}`,
          },
          ...(showTraffic
            ? [
                {
                  label: "AoS cache lines / loaded",
                  value: `${aosTraffic.cacheLines.toLocaleString("vi-VN")} / ${(aosTraffic.loadedBytes / 1_000_000).toFixed(2)} MB`,
                },
                {
                  label: "SoA cache lines / loaded",
                  value: `${soaTraffic.cacheLines.toLocaleString("vi-VN")} / ${(soaTraffic.loadedBytes / 1_000_000).toFixed(2)} MB`,
                },
                {
                  label: "Useful bytes / efficiency",
                  value: `${(aosTraffic.usefulBytes / 1_000_000).toFixed(2)} MB · AoS ${(aosTraffic.efficiency * 100).toFixed(1)}% / SoA ${(soaTraffic.efficiency * 100).toFixed(1)}%`,
                },
              ]
            : []),
          ...(showAgreement
            ? [
                {
                  label: "AoS ↔ SoA agreement",
                  value: difference === 0 ? "khớp từng float" : `maximum difference ${difference}`,
                },
              ]
            : []),
          ...(showBenchmark
            ? [
                {
                  label: mode === "aos-baseline" ? "Baseline AoS" : "Benchmark median AoS / SoA",
                  value:
                    runningExperiment === "benchmark"
                      ? "đang đo trong Web Worker — bạn vẫn có thể dừng"
                      : benchmark
                        ? mode === "aos-baseline"
                          ? `${benchmark.aosMilliseconds.toFixed(2)} ms · checksum ${benchmark.aosChecksum.toFixed(4)}`
                          : `${benchmark.aosMilliseconds.toFixed(2)} / ${benchmark.soaMilliseconds.toFixed(2)} ms · AoS/SoA ${speedRatio.toFixed(2)}×`
                        : experimentError || "chưa chạy — timing phụ thuộc máy và trình duyệt",
                },
              ]
            : []),
          ...(showScaling
            ? [
                {
                  label: "Scaling median 10k / 100k / 1M",
                  value:
                    runningExperiment === "scaling"
                      ? "đang đo trong Web Worker — bạn vẫn có thể dừng"
                      : scaling.length === 0
                        ? "chưa chạy"
                        : scaling
                            .map(
                              (row) =>
                                `${row.particleCount.toLocaleString("vi-VN")}: ${row.aosMilliseconds.toFixed(1)}/${row.soaMilliseconds.toFixed(1)} ms`,
                            )
                            .join(" · "),
                },
              ]
            : []),
          {
            label: "Mô tả thay thế",
            value: `${particleCount.toLocaleString("vi-VN")} particles đang dùng ${layout.toUpperCase()}; workload chạm ${fieldsForWorkload(workload).join(", ")}. Pointer ${capturing ? "đang được capture" : "đã được nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo ngang dải memory để chọn particle và nhấn R để reset.
        {showAnimation && " Space chạy/dừng; N tiến một bước."}
        {showAnimation &&
          particleCount > 100_000 &&
          " Chế độ chạy liên tục tạm khóa khi N lớn hơn 100.000; bạn vẫn có thể tiến từng bước."}
        {showLayout && " L đổi layout."}
        {showWorkload && " W đổi workload."}
        {showBenchmark && " B chạy benchmark hữu hạn."}
        {showScaling && " S chạy scaling theo ba mốc N."}
        {showTraffic && " Cache-line readout là mô hình 64 byte; timing là phép đo thực."}
      </p>
    </>
  );
}
