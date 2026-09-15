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
  GPU_GRID_CELL_PRESETS,
  GPU_GRID_COUNT_PRESETS,
  buildGpuCsrGrid,
  estimateGpuGridCandidateWork,
  gpuGridBarrierContract,
  gpuGridCandidateRange,
  gpuGridCellAddress,
  gpuGridExclusiveScan,
  gpuGridMixBits,
  injectGpuGridError,
  makeGpuGridPassLabels,
  makeGpuGridPositions,
  makeGpuGridSpec,
  modelGpuGridMilliseconds,
  queryGpuCsrNeighbors,
  simulateGpuCellCountArrivals,
  validateGpuCsrGrid,
  type GpuGridBarrierChoice,
  type GpuGridInjectedError,
  type GpuGridPoint,
} from "@/lib/labs/gpu-spatial-grid-neighbors";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const MONO = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
const VISUAL_WORLD_WIDTH = 256;
const VISUAL_WORLD_HEIGHT = 144;
const DEFAULT_EDITABLE_COUNTS = [3, 0, 2, 1, 4, 0, 1, 2];

interface GridViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

function makeViewport(width: number, height: number): GridViewport {
  const viewWidth = Math.max(220, width - 48);
  const viewHeight = Math.min(height - 82, viewWidth * (VISUAL_WORLD_HEIGHT / VISUAL_WORLD_WIDTH));
  return {
    left: (width - viewWidth) / 2,
    top: 44,
    width: viewWidth,
    height: viewHeight,
  };
}

function worldToCanvas(point: GpuGridPoint, view: GridViewport) {
  return {
    x: view.left + (point.x / VISUAL_WORLD_WIDTH) * view.width,
    y: view.top + (point.y / VISUAL_WORLD_HEIGHT) * view.height,
  };
}

function canvasToWorld(point: GpuGridPoint, view: GridViewport) {
  return {
    x: Math.max(
      0,
      Math.min(VISUAL_WORLD_WIDTH, ((point.x - view.left) / view.width) * VISUAL_WORLD_WIDTH),
    ),
    y: Math.max(
      0,
      Math.min(VISUAL_WORLD_HEIGHT, ((point.y - view.top) / view.height) * VISUAL_WORLD_HEIGHT),
    ),
  };
}

function drawHeading(context: CanvasRenderingContext2D, text: string) {
  context.fillStyle = "#d7deec";
  context.font = MONO;
  context.fillText(text, 22, 25);
}

function drawGridScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: readonly GpuGridPoint[],
  cellSize: number,
  selectedIndex: number,
  radius: number,
  showCandidates: boolean,
  showNeighbors: boolean,
  occupancyCounts?: readonly number[],
) {
  const view = makeViewport(width, height);
  const spec = makeGpuGridSpec(cellSize, VISUAL_WORLD_WIDTH, VISUAL_WORLD_HEIGHT);
  const grid = buildGpuCsrGrid(points, spec);
  const selected = points[selectedIndex] ?? points[0];
  const range = gpuGridCandidateRange(selected, radius, spec);
  const summary = queryGpuCsrNeighbors(points, grid, selectedIndex, radius);

  context.fillStyle = "#111a30";
  context.fillRect(view.left, view.top, view.width, view.height);
  const displayedCounts = occupancyCounts ?? grid.counts;
  const maximumCount = Math.max(1, ...displayedCounts);
  for (let row = 0; row < spec.rows; row += 1) {
    for (let column = 0; column < spec.columns; column += 1) {
      const cell = row * spec.columns + column;
      const occupancy = (displayedCounts[cell] ?? 0) / maximumCount;
      if (occupancy <= 0) continue;
      context.fillStyle = `rgba(97, 175, 239, ${0.08 + occupancy * 0.32})`;
      context.fillRect(
        view.left + (column * view.width) / spec.columns,
        view.top + (row * view.height) / spec.rows,
        view.width / spec.columns,
        view.height / spec.rows,
      );
    }
  }

  if (showCandidates) {
    context.fillStyle = "rgba(229, 192, 123, 0.18)";
    context.fillRect(
      view.left + (range.minimumColumn * view.width) / spec.columns,
      view.top + (range.minimumRow * view.height) / spec.rows,
      ((range.maximumColumn - range.minimumColumn + 1) * view.width) / spec.columns,
      ((range.maximumRow - range.minimumRow + 1) * view.height) / spec.rows,
    );
  }

  context.strokeStyle = "rgba(156, 170, 202, 0.25)";
  context.lineWidth = 1;
  for (let column = 0; column <= spec.columns; column += 1) {
    const x = view.left + (column * view.width) / spec.columns;
    context.beginPath();
    context.moveTo(x, view.top);
    context.lineTo(x, view.top + view.height);
    context.stroke();
  }
  for (let row = 0; row <= spec.rows; row += 1) {
    const y = view.top + (row * view.height) / spec.rows;
    context.beginPath();
    context.moveTo(view.left, y);
    context.lineTo(view.left + view.width, y);
    context.stroke();
  }

  const neighborSet = new Set<number>();
  if (showNeighbors) {
    for (let index = 0; index < points.length; index += 1) {
      if (index === selectedIndex) continue;
      const dx = points[index].x - selected.x;
      const dy = points[index].y - selected.y;
      if (dx * dx + dy * dy <= radius * radius) neighborSet.add(index);
    }
  }
  points.forEach((point, index) => {
    const canvas = worldToCanvas(point, view);
    context.beginPath();
    context.arc(canvas.x, canvas.y, index === selectedIndex ? 4.5 : 2.2, 0, Math.PI * 2);
    context.fillStyle =
      index === selectedIndex ? "#e06c75" : neighborSet.has(index) ? "#e5c07b" : "#61afef";
    context.fill();
  });

  const selectedCanvas = worldToCanvas(selected, view);
  context.beginPath();
  context.arc(
    selectedCanvas.x,
    selectedCanvas.y,
    (radius / VISUAL_WORLD_WIDTH) * view.width,
    0,
    Math.PI * 2,
  );
  context.strokeStyle = "#e5c07b";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#9caaca";
  context.font = MONO;
  context.fillText(
    `cell ${gpuGridCellAddress(selected, spec).id} · ${range.visitedCellCount} cells · ${summary.visitedCandidates} candidates · ${summary.neighborCount} neighbors`,
    view.left,
    view.top + view.height + 24,
  );
}

function drawCountScan(
  context: CanvasRenderingContext2D,
  width: number,
  counts: readonly number[],
  offsets: readonly number[],
  step: number,
  scatter: boolean,
  sortedIndices?: readonly number[],
) {
  drawHeading(
    context,
    scatter ? "offsets + atomic cursors → CSR slots" : "cellCounts → exclusive scan → cellOffsets",
  );
  const shown = Math.min(12, counts.length);
  const gap = 5;
  const boxWidth = Math.max(34, Math.min(58, (width - 44 - gap * (shown - 1)) / shown));
  for (let index = 0; index < shown; index += 1) {
    const x = 22 + index * (boxWidth + gap);
    const active = index <= step % shown;
    context.fillStyle = active ? "#61afef" : "#26344f";
    context.fillRect(x, 76, boxWidth, 34);
    context.fillStyle = "#0b1020";
    context.font = MONO;
    context.textAlign = "center";
    context.fillText(String(counts[index]), x + boxWidth / 2, 98);
    context.fillStyle = scatter ? "#c678dd" : "#98c379";
    context.fillRect(x, 148, boxWidth, 34);
    context.fillStyle = "#0b1020";
    context.fillText(String(offsets[index]), x + boxWidth / 2, 170);
  }
  context.textAlign = "left";
  context.fillStyle = "#9caaca";
  context.fillText("counts", 22, 64);
  context.fillText(scatter ? "cursor / slot begin" : "exclusive offsets", 22, 136);
  if (scatter && sortedIndices) {
    const preview = sortedIndices.slice(0, shown);
    context.fillStyle = "#9caaca";
    context.fillText("sortedIndices (các slot đầu)", 22, 214);
    context.fillStyle = "#e5c07b";
    context.fillText(`[${preview.join(", ")}]`, 22, 238);
  }
}

function drawPassGraph(
  context: CanvasRenderingContext2D,
  width: number,
  labels: readonly string[],
  selectedPass: number,
) {
  drawHeading(context, "GPU pass graph · producer → barrier → consumer");
  const left = 26;
  const right = width - 26;
  const usable = right - left;
  labels.forEach((label, index) => {
    const x = left + (index * usable) / Math.max(1, labels.length - 1);
    context.beginPath();
    context.arc(x, 116, index === selectedPass ? 13 : 9, 0, Math.PI * 2);
    context.fillStyle = index === selectedPass ? "#e5c07b" : "#61afef";
    context.fill();
    if (index + 1 < labels.length) {
      const nextX = left + ((index + 1) * usable) / Math.max(1, labels.length - 1);
      context.strokeStyle = "#5c6b8a";
      context.beginPath();
      context.moveTo(x + 14, 116);
      context.lineTo(nextX - 14, 116);
      context.stroke();
    }
  });
  context.fillStyle = "#d7deec";
  context.font = MONO;
  context.fillText(labels[selectedPass] ?? "empty", 26, 170);
}

export default function GpuSpatialGridNeighborsLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState<number>(262_147);
  const [cellSize, setCellSize] = useState<number>(8);
  const [radius, setRadius] = useState(10);
  const [seed, setSeed] = useState(40);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedPass, setSelectedPass] = useState(0);
  const [draggedPoint, setDraggedPoint] = useState<{ index: number; point: GpuGridPoint } | null>(
    null,
  );
  const draggedIndex = useRef<number | null>(null);
  const [editableCounts, setEditableCounts] = useState([...DEFAULT_EDITABLE_COUNTS]);
  const [arrivalOrder, setArrivalOrder] = useState<"forward" | "reverse" | "seeded">("forward");
  const [paused, setPaused] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [atomicEnabled, setAtomicEnabled] = useState(true);
  const [consumer, setConsumer] = useState<"compute" | "readback">("compute");
  const [barrierChoice, setBarrierChoice] = useState<GpuGridBarrierChoice>("shader-storage");
  const [injectedError, setInjectedError] = useState<GpuGridInjectedError>("none");

  const visualSpec = useMemo(
    () => makeGpuGridSpec(cellSize, VISUAL_WORLD_WIDTH, VISUAL_WORLD_HEIGHT),
    [cellSize],
  );
  const fullSpec = useMemo(() => makeGpuGridSpec(cellSize), [cellSize]);
  const baseVisualPoints = useMemo(
    () => makeGpuGridPositions(Math.min(420, particleCount), seed, visualSpec),
    [particleCount, seed, visualSpec],
  );
  const visualPoints = useMemo(() => {
    if (!draggedPoint || draggedPoint.index >= baseVisualPoints.length) return baseVisualPoints;
    return baseVisualPoints.map((point, index) =>
      index === draggedPoint.index ? draggedPoint.point : point,
    );
  }, [baseVisualPoints, draggedPoint]);
  const scatterOrder = useMemo(() => {
    const order = visualPoints.map((_, index) => index);
    if (arrivalOrder === "reverse") return order.reverse();
    if (arrivalOrder === "seeded") {
      return order.sort(
        (left, right) =>
          gpuGridMixBits(left ^ seed ^ 0x85ebca6b) - gpuGridMixBits(right ^ seed ^ 0x85ebca6b),
      );
    }
    return order;
  }, [arrivalOrder, seed, visualPoints]);
  const grid = useMemo(
    () => buildGpuCsrGrid(visualPoints, visualSpec, scatterOrder),
    [scatterOrder, visualPoints, visualSpec],
  );
  const editableOffsets = useMemo(() => gpuGridExclusiveScan(editableCounts), [editableCounts]);
  const damagedGrid = useMemo(() => injectGpuGridError(grid, injectedError), [grid, injectedError]);
  const validation = useMemo(
    () => validateGpuCsrGrid(damagedGrid, visualPoints.length),
    [damagedGrid, visualPoints.length],
  );
  const passes = useMemo(() => makeGpuGridPassLabels(fullSpec.cellCount), [fullSpec.cellCount]);
  const stepCount =
    mode === "atomic-count"
      ? Math.min(64, visualPoints.length)
      : mode === "count-scan"
        ? editableCounts.length
        : mode === "csr-scatter"
          ? Math.min(12, visualPoints.length)
          : passes.length;
  const arrivalCount = Math.min(visualPoints.length, selectedPass + 1);
  const atomicCounts = useMemo(
    () => simulateGpuCellCountArrivals(visualPoints, visualSpec, arrivalCount, atomicEnabled, 64),
    [arrivalCount, atomicEnabled, visualPoints, visualSpec],
  );
  const atomicCountTotal = useMemo(
    () => atomicCounts.reduce((total, count) => total + count, 0),
    [atomicCounts],
  );
  const query = useMemo(
    () => queryGpuCsrNeighbors(visualPoints, grid, selectedIndex, radius),
    [grid, radius, selectedIndex, visualPoints],
  );

  const reset = useCallback(() => {
    setParticleCount(262_147);
    setCellSize(8);
    setRadius(10);
    setSeed(40);
    setSelectedIndex(0);
    setSelectedPass(0);
    setDraggedPoint(null);
    draggedIndex.current = null;
    setEditableCounts([...DEFAULT_EDITABLE_COUNTS]);
    setArrivalOrder("forward");
    setPaused(false);
    setCapturing(false);
    setAtomicEnabled(true);
    setConsumer("compute");
    setBarrierChoice("shader-storage");
    setInjectedError("none");
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const tick = () => {
      setSelectedPass((current) => (current + 1) % Math.max(1, stepCount));
      animationFrame.current = window.setTimeout(() => {
        animationFrame.current = requestAnimationFrame(tick);
      }, 850) as unknown as number;
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        clearTimeout(animationFrame.current);
      }
      animationFrame.current = null;
    };
  }, [paused, reducedMotion, stepCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || visualPoints.length === 0) return;
    setupCanvas(context, size);
    if (mode === "count-scan") {
      drawCountScan(context, size.width, editableCounts, editableOffsets, selectedPass, false);
    } else if (mode === "csr-scatter") {
      drawCountScan(
        context,
        size.width,
        grid.counts,
        grid.offsets,
        selectedPass,
        true,
        grid.sortedIndices,
      );
    } else if (mode === "grid-pass-graph") {
      drawPassGraph(context, size.width, passes, selectedPass % passes.length);
    } else if (mode === "grid-validation") {
      drawHeading(context, `named validation ${validation.passed ? "PASS" : "FAIL"}`);
      drawCountScan(
        context,
        size.width,
        damagedGrid.counts,
        damagedGrid.offsets,
        selectedPass,
        true,
      );
    } else {
      drawHeading(
        context,
        mode === "atomic-count"
          ? `atomicAdd ${atomicEnabled ? "ON" : "OFF — lost update"}`
          : "GPU CSR grid · kéo để chọn query particle",
      );
      drawGridScene(
        context,
        size.width,
        size.height,
        mode === "atomic-count" ? visualPoints.slice(0, arrivalCount) : visualPoints,
        cellSize,
        selectedIndex,
        radius,
        mode !== "grid-contract" && mode !== "atomic-count",
        mode === "exact-neighbors" || mode === "gpu-grid-final",
        mode === "atomic-count" ? atomicCounts : undefined,
      );
    }
  }, [
    atomicEnabled,
    atomicCounts,
    arrivalCount,
    cellSize,
    damagedGrid,
    editableCounts,
    editableOffsets,
    grid,
    mode,
    passes,
    radius,
    selectedIndex,
    selectedPass,
    size,
    validation.passed,
    visualPoints,
  ]);

  const selectFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const point = canvasPoint(event, event.currentTarget);
      const world = canvasToWorld(point, makeViewport(size.width, size.height));
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      visualPoints.forEach((candidate, index) => {
        const dx = candidate.x - world.x;
        const dy = candidate.y - world.y;
        const distance = dx * dx + dy * dy;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      setSelectedIndex(nearest);
    },
    [size.height, size.width, visualPoints],
  );

  const moveDraggedPoint = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>, index: number) => {
      const point = canvasPoint(event, event.currentTarget);
      const world = canvasToWorld(point, makeViewport(size.width, size.height));
      setSelectedIndex(index);
      setDraggedPoint({ index, point: world });
    },
    [size.height, size.width],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setCapturing(true);
      if (mode === "grid-contract" || mode === "candidate-cells") {
        const point = canvasPoint(event, event.currentTarget);
        const world = canvasToWorld(point, makeViewport(size.width, size.height));
        let nearest = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        visualPoints.forEach((candidate, index) => {
          const dx = candidate.x - world.x;
          const dy = candidate.y - world.y;
          const distance = dx * dx + dy * dy;
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = index;
          }
        });
        draggedIndex.current = nearest;
        moveDraggedPoint(event, nearest);
      } else {
        selectFromPointer(event);
      }
    },
    [mode, moveDraggedPoint, selectFromPointer, size.height, size.width, visualPoints],
  );

  const releasePointer = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (
      activePointer.current === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    draggedIndex.current = null;
    setCapturing(false);
  }, []);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedPass((current) => (current + 1) % Math.max(1, stepCount));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedPass(
          (current) => (current - 1 + Math.max(1, stepCount)) % Math.max(1, stepCount),
        );
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % visualPoints.length);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + visualPoints.length) % visualPoints.length);
      }
      if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
      if (event.key.toLowerCase() === "r") reset();
      const preset = Number(event.key) - 1;
      if (preset >= 0 && preset < GPU_GRID_COUNT_PRESETS.length)
        setParticleCount(GPU_GRID_COUNT_PRESETS[preset]);
    },
    [reset, stepCount, visualPoints.length],
  );

  const barrier = gpuGridBarrierContract(consumer, barrierChoice);
  const timing = modelGpuGridMilliseconds(particleCount, fullSpec.cellCount, radius, cellSize);
  const candidateWork = estimateGpuGridCandidateWork(particleCount, fullSpec, radius);
  const modeledMaximumOccupancy = Math.ceil(
    particleCount / fullSpec.cellCount + Math.sqrt(particleCount / fullSpec.cellCount) * 3,
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng Canvas 2D về atomic cell count, exclusive scan, CSR scatter và neighbor query trên GPU"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (!capturing) return;
          if (
            (mode === "grid-contract" || mode === "candidate-cells") &&
            draggedIndex.current !== null
          ) {
            moveDraggedPoint(event, draggedIndex.current);
          } else {
            selectFromPointer(event);
          }
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        <label>
          Particle count
          <select
            value={particleCount}
            onChange={(event) => {
              setParticleCount(Number(event.target.value));
              setDraggedPoint(null);
            }}
          >
            {GPU_GRID_COUNT_PRESETS.map((count) => (
              <option key={count} value={count}>
                {count.toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cell size
          <select
            value={cellSize}
            onChange={(event) => {
              setCellSize(Number(event.target.value));
              setDraggedPoint(null);
            }}
          >
            {GPU_GRID_CELL_PRESETS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Radius: {radius}
          <input
            type="range"
            min={2}
            max={32}
            step={1}
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          />
        </label>
        <label>
          Seed: {seed}
          <input
            type="range"
            min={1}
            max={99}
            value={seed}
            onChange={(event) => {
              setSeed(Number(event.target.value));
              setDraggedPoint(null);
            }}
          />
        </label>
        {mode === "count-scan" &&
          editableCounts.map((count, index) => (
            <label key={index}>
              Count {index}
              <input
                aria-label={`Count ${index}`}
                type="number"
                min={0}
                max={99}
                step={1}
                value={count}
                onChange={(event) => {
                  const value = Math.max(0, Math.floor(Number(event.target.value)));
                  setEditableCounts((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index && Number.isFinite(value) ? value : item,
                    ),
                  );
                }}
              />
            </label>
          ))}
        {mode === "csr-scatter" && (
          <label>
            Arrival order
            <select
              value={arrivalOrder}
              onChange={(event) =>
                setArrivalOrder(event.target.value as "forward" | "reverse" | "seeded")
              }
            >
              <option value="forward">0 → N−1</option>
              <option value="reverse">N−1 → 0</option>
              <option value="seeded">Thứ tự trộn theo seed</option>
            </select>
          </label>
        )}
        {mode === "atomic-count" && (
          <label>
            Counter update
            <select
              value={atomicEnabled ? "atomic" : "plain"}
              onChange={(event) => setAtomicEnabled(event.target.value === "atomic")}
            >
              <option value="atomic">atomicAdd</option>
              <option value="plain">read + write</option>
            </select>
          </label>
        )}
        {mode === "grid-pass-graph" && (
          <>
            <label>
              Consumer
              <select
                value={consumer}
                onChange={(event) => setConsumer(event.target.value as typeof consumer)}
              >
                <option value="compute">Compute pass</option>
                <option value="readback">CPU readback</option>
              </select>
            </label>
            <label>
              Barrier
              <select
                value={barrierChoice}
                onChange={(event) => setBarrierChoice(event.target.value as GpuGridBarrierChoice)}
              >
                <option value="shader-storage">SHADER_STORAGE</option>
                <option value="buffer-update">BUFFER_UPDATE</option>
                <option value="none">Bỏ barrier</option>
              </select>
            </label>
          </>
        )}
        {mode === "grid-validation" && (
          <label>
            Lỗi cố ý
            <select
              value={injectedError}
              onChange={(event) => setInjectedError(event.target.value as GpuGridInjectedError)}
            >
              <option value="none">Không lỗi</option>
              <option value="lost-count">Lost count</option>
              <option value="wrong-offset">Wrong offset</option>
              <option value="duplicate-index">Duplicate index</option>
            </select>
          </label>
        )}
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPass((current) => (current + 1) % Math.max(1, stepCount))}
        >
          Bước một pass
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Grid / occupancy model",
            value: `${fullSpec.columns}×${fullSpec.rows} = ${fullSpec.cellCount.toLocaleString("vi-VN")} cells · trung bình ${(particleCount / fullSpec.cellCount).toFixed(1)} · max ước lượng ${modeledMaximumOccupancy}`,
          },
          {
            label: "Selected query",
            value: `particle ${selectedIndex} · ${query.visitedCandidates} visual candidates · ${query.neighborCount} exact neighbors · nearest ${query.nearestIndex ?? "none"}`,
          },
          ...(mode === "grid-contract" || mode === "candidate-cells"
            ? [
                {
                  label: "World → cell",
                  value: (() => {
                    const point = visualPoints[selectedIndex];
                    const address = point ? gpuGridCellAddress(point, visualSpec) : null;
                    return point && address
                      ? `(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) → column ${address.column}, row ${address.row}, id ${address.id}`
                      : "Không có particle";
                  })(),
                },
              ]
            : []),
          {
            label: "Chuỗi compute pass",
            value: `${passes.length} passes · bước ${selectedPass + 1}/${stepCount} · ${passes[selectedPass % passes.length]}`,
          },
          ...(mode === "grid-pass-graph"
            ? [
                {
                  label: "Barrier cần dùng",
                  value: `${barrier.passed ? "PASS" : "FAIL"} · ${barrier.message}`,
                },
              ]
            : []),
          ...(mode === "atomic-count"
            ? [
                {
                  label: "Atomic arrivals",
                  value: `${atomicEnabled ? "PASS" : atomicCountTotal === arrivalCount ? "Chưa có collision" : "LOST UPDATE"} · đã đến ${arrivalCount} · tổng counters ${atomicCountTotal}`,
                },
              ]
            : []),
          ...(mode === "count-scan"
            ? [
                {
                  label: "Scan invariant",
                  value: `offset cuối ${editableOffsets.at(-1) ?? 0} + count cuối ${editableCounts.at(-1) ?? 0} = ${editableCounts.reduce((total, count) => total + count, 0)}`,
                },
              ]
            : []),
          ...(mode === "csr-scatter"
            ? [
                {
                  label: "Arrival / membership",
                  value: `${arrivalOrder} · ${new Set(grid.sortedIndices).size}/${visualPoints.length} particle indices xuất hiện đúng một lần`,
                },
              ]
            : []),
          ...(mode === "grid-validation"
            ? [
                {
                  label: "Các điều kiện bất biến",
                  value: `${validation.passed ? "PASS" : "FAIL"} · count ${validation.countsTotalMatches} · offsets ${validation.offsetsMonotonic} · permutation ${validation.particlePermutation}`,
                },
              ]
            : []),
          {
            label: "Candidate-work budget",
            value: `${candidateWork.withinBudget ? "PASS" : "REJECT"} · tối đa ${candidateWork.maximumCandidateCellsPerQuery} cells/query · khoảng ${candidateWork.estimatedCandidateVisits.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} visits`,
          },
          {
            label: "Mô hình đo thời gian",
            value: `${timing.toFixed(3)} ms · Canvas 2D không phải phép đo GPU`,
          },
          {
            label: "Mô tả thay thế",
            value: `Pipeline mô hình hóa ${particleCount.toLocaleString("vi-VN")} particles qua count, scan, scatter và query. Canvas vẽ ${visualPoints.length} điểm đại diện; pointer ${capturing ? "đang capture" : "đã nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        {mode === "grid-contract" || mode === "candidate-cells"
          ? "Kéo một particle để đổi world position và cell. "
          : "Kéo để chọn particle hoặc bước đang quan sát. "}
        ←/→ bước qua pass, ↑/↓ đổi particle, 1–4 đổi workload, Space pause và R reset. Reduced
        motion luôn dừng autoplay.
      </p>
    </>
  );
}
