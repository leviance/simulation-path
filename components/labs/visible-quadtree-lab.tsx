"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ParticleBounds, ParticlePoint } from "@/lib/labs/brute-force-particle-query";
import {
  buildQuadtree,
  createRootQuadtree,
  createBruteSelectionWorkspace,
  createQuadtreeQueryWorkspace,
  inspectQuadtreeTopology,
  makeQuadtreeCapacityStudy,
  makeQuadtreeParticleCloud,
  makeSelectionQueries,
  normalizeSelectionBox,
  quadtreeMatchesBruteForce,
  queryQuadtree,
  querySelectionBruteForce,
  runBruteSelectionBatch,
  runQuadtreeSelectionBatch,
  type BruteSelectionBatchMetrics,
  type QuadtreeBatchMetrics,
  type QuadtreeCapacityStudyRow,
  type SelectionBox,
} from "@/lib/labs/quadtree";
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
const DEFAULT_SEED = 0x29c0ffee;
const MAXIMUM_PARTICLE_COUNT = 100_000;
const CAPACITY_PRESETS = [4, 8, 16, 32] as const;

interface TreeView {
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
  quadtree: TimedMetrics<QuadtreeBatchMetrics>;
  bruteForce: TimedMetrics<BruteSelectionBatchMetrics>;
}

function makeView(width: number, height: number, showGraph: boolean): TreeView {
  const graphHeight = showGraph ? 150 : 0;
  const size = Math.max(120, Math.min(width - 36, height - graphHeight - 42));
  return {
    left: (width - size) / 2,
    top: 18,
    size,
    graphTop: height - graphHeight + 8,
  };
}

function worldToCanvas(point: ParticlePoint, view: TreeView) {
  return {
    x: view.left + point.x * view.size,
    y: view.top + (1 - point.y) * view.size,
  };
}

function canvasToWorld(point: ParticlePoint, view: TreeView) {
  return {
    x: Math.max(0, Math.min(1, (point.x - view.left) / view.size)),
    y: Math.max(0, Math.min(1, 1 - (point.y - view.top) / view.size)),
  };
}

function boxRect(box: ParticleBounds | SelectionBox, view: TreeView) {
  const minimum = worldToCanvas(box.minimum, view);
  const maximum = worldToCanvas(box.maximum, view);
  return {
    x: minimum.x,
    y: maximum.y,
    width: maximum.x - minimum.x,
    height: minimum.y - maximum.y,
  };
}

function drawTree(
  context: CanvasRenderingContext2D,
  tree: ReturnType<typeof buildQuadtree>,
  view: TreeView,
  rootOnly: boolean,
  overlappingLeaves: ReadonlySet<number>,
  showQueryPath: boolean,
) {
  const nodes = rootOnly ? tree.nodes.slice(0, 1) : tree.nodes;
  const leafStride = Math.max(1, Math.ceil(tree.leafCount / 12_000));
  let leafIndex = 0;
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    const node = nodes[nodeIndex];
    if (!rootOnly && node.children !== null) continue;
    const overlapsSelection = overlappingLeaves.has(nodeIndex);
    const shouldDraw = rootOnly || overlapsSelection || leafIndex % leafStride === 0;
    leafIndex += 1;
    if (!shouldDraw) continue;
    const rectangle = boxRect(node.bounds, view);
    if (showQueryPath && overlapsSelection) {
      context.fillStyle = "rgba(97, 175, 239, 0.14)";
      context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    }
    const depthAlpha = Math.min(0.9, 0.28 + node.depth * 0.055);
    context.strokeStyle = `rgba(92, 126, 168, ${depthAlpha})`;
    context.lineWidth = node.depth >= 8 ? 0.55 : 1;
    context.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
  }
}

function drawStudyGraph(
  context: CanvasRenderingContext2D,
  rows: readonly QuadtreeCapacityStudyRow[],
  width: number,
  height: number,
  view: TreeView,
) {
  if (rows.length === 0) return;
  const left = 40;
  const right = width - 28;
  const top = view.graphTop + 18;
  const bottom = height - 24;
  const maximumCandidates = Math.max(...rows.map((row) => row.totalCandidates), 1);
  const maximumNodes = Math.max(...rows.map((row) => row.nodeCount), 1);
  const slotWidth = (right - left) / rows.length;

  context.strokeStyle = "#42516b";
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  context.font = "11px ui-monospace, monospace";
  context.textAlign = "start";
  context.fillStyle = "rgba(229, 192, 123, 0.9)";
  context.fillRect(left + 4, top + 4, 10, 8);
  context.fillStyle = "#abb2bf";
  context.fillText("candidates", left + 18, top + 12);
  context.fillStyle = "#98c379";
  context.beginPath();
  context.arc(left + 104, top + 8, 4, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#abb2bf";
  context.fillText("nodes", left + 112, top + 12);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const centerX = left + slotWidth * (index + 0.5);
    const barHeight = (row.totalCandidates / maximumCandidates) * (bottom - top - 12);
    context.fillStyle = "rgba(229, 192, 123, 0.72)";
    context.fillRect(centerX - 18, bottom - barHeight, 36, barHeight);
    const nodeY = bottom - (row.nodeCount / maximumNodes) * (bottom - top - 12);
    context.fillStyle = "#98c379";
    context.beginPath();
    context.arc(centerX, nodeY, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#abb2bf";
    context.font = "11px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillText(String(row.leafCapacity), centerX, bottom + 15);
  }
  context.textAlign = "start";
}

function selectionAroundPhase(phase: number, current: SelectionBox) {
  const halfWidth = Math.max(0.025, (current.maximum.x - current.minimum.x) * 0.5);
  const halfHeight = Math.max(0.025, (current.maximum.y - current.minimum.y) * 0.5);
  const centerX = Math.max(halfWidth, Math.min(1 - halfWidth, 0.5 + Math.cos(phase) * 0.32));
  const centerY = Math.max(
    halfHeight,
    Math.min(1 - halfHeight, 0.5 + Math.sin(phase * 1.37) * 0.29),
  );
  return normalizeSelectionBox(
    { x: centerX - halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY + halfHeight },
  );
}

export default function VisibleQuadtreeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<ParticlePoint | null>(null);
  const activePointerId = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(MAXIMUM_PARTICLE_COUNT);
  const [clustered, setClustered] = useState(true);
  const [leafCapacity, setLeafCapacity] = useState(8);
  const [selection, setSelection] = useState<SelectionBox>(() =>
    normalizeSelectionBox({ x: 0.4, y: 0.42 }, { x: 0.6, y: 0.58 }),
  );
  const [capturing, setCapturing] = useState(false);
  const [paused, setPaused] = useState(true);
  const [autoPhase, setAutoPhase] = useState(0);
  const [benchmark, setBenchmark] = useState<TimedComparison | null>(null);
  const [studyRows, setStudyRows] = useState<QuadtreeCapacityStudyRow[]>([]);

  const rootOnly = mode === "quadtree-root";
  const baselineOnly = rootOnly || mode === "quadtree-selection";
  const showTree = mode !== "quadtree-selection";
  const showQueryPath =
    mode === "quadtree-query" ||
    mode === "quadtree-compare" ||
    mode === "quadtree-capacity" ||
    mode === "quadtree-validation" ||
    !mode;
  const showLiveOracle = mode === "quadtree-compare";
  const showBenchmark = mode === "quadtree-capacity" || mode === "quadtree-validation" || !mode;
  const showStudy = mode === "quadtree-capacity" || mode === "quadtree-validation" || !mode;
  const view = useMemo(
    () => makeView(size.width, size.height, showStudy),
    [showStudy, size.height, size.width],
  );
  const fullCloud = useMemo(
    () => makeQuadtreeParticleCloud(MAXIMUM_PARTICLE_COUNT, BOUNDS, DEFAULT_SEED, clustered),
    [clustered],
  );
  const particles = useMemo(() => fullCloud.slice(0, particleCount), [fullCloud, particleCount]);
  const tree = useMemo(() => {
    const config = {
      bounds: BOUNDS,
      leafCapacity,
      maximumDepth: 12,
      minimumNodeSize: 1 / 4096,
    };
    if (baselineOnly) return createRootQuadtree(particles, config);
    return buildQuadtree(particles, config);
  }, [baselineOnly, leafCapacity, particles]);
  const result = useMemo(
    () => queryQuadtree(tree, particles, selection, createQuadtreeQueryWorkspace()),
    [particles, selection, tree],
  );
  const topology = useMemo(
    () => inspectQuadtreeTopology(tree, particles.length),
    [particles.length, tree],
  );
  const liveOracle = useMemo(() => {
    if (!showLiveOracle) return null;
    return querySelectionBruteForce(particles, selection, createBruteSelectionWorkspace());
  }, [particles, selection, showLiveOracle]);
  const liveMatch = liveOracle === null || quadtreeMatchesBruteForce(result, liveOracle);
  const topologyValid = Object.values(topology).every(Boolean);

  useEffect(() => {
    if (paused || reducedMotion) {
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
        const next = current + deltaSeconds * 0.65;
        setSelection((currentSelection) => selectionAroundPhase(next, currentSelection));
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
  }, [paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#11182a";
    context.fillRect(view.left - 1, view.top - 1, view.size + 2, view.size + 2);

    const overlappingLeaves = new Set(result.overlappingLeafIndices);
    if (showTree) drawTree(context, tree, view, rootOnly, overlappingLeaves, showQueryPath);
    else {
      context.strokeStyle = "#4f6b91";
      context.strokeRect(view.left, view.top, view.size, view.size);
      context.beginPath();
      context.moveTo(view.left + view.size / 2, view.top);
      context.lineTo(view.left + view.size / 2, view.top + view.size);
      context.moveTo(view.left, view.top + view.size / 2);
      context.lineTo(view.left + view.size, view.top + view.size / 2);
      context.stroke();
    }

    const drawStride = Math.max(1, Math.ceil(particleCount / 30_000));
    context.fillStyle = "#61738d";
    for (let particleIndex = 0; particleIndex < particleCount; particleIndex += drawStride) {
      const point = worldToCanvas(particles[particleIndex], view);
      context.fillRect(Math.round(point.x), Math.round(point.y), 1.2, 1.2);
    }

    if (!rootOnly && mode !== "quadtree-selection") {
      context.fillStyle = "#e5c07b";
      const hitStride = Math.max(1, Math.ceil(result.hitIndices.length / 5000));
      for (let index = 0; index < result.hitIndices.length; index += hitStride) {
        const particle = particles[result.hitIndices[index]];
        if (particle === undefined) continue;
        const point = worldToCanvas(particle, view);
        context.fillRect(point.x - 1.5, point.y - 1.5, 3, 3);
      }
    }

    const rectangle = boxRect(selection, view);
    context.fillStyle = "rgba(97, 175, 239, 0.07)";
    context.fillRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    context.strokeStyle = "#61afef";
    context.lineWidth = 2;
    context.strokeRect(rectangle.x, rectangle.y, rectangle.width, rectangle.height);
    if (showStudy) drawStudyGraph(context, studyRows, size.width, size.height, view);
  }, [
    mode,
    particleCount,
    particles,
    result,
    rootOnly,
    selection,
    showQueryPath,
    showStudy,
    showTree,
    size,
    studyRows,
    tree,
    view,
  ]);

  const updateSelectionFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dragStart.current === null) return;
    const current = canvasToWorld(canvasPoint(event, canvas), view);
    setSelection(normalizeSelectionBox(dragStart.current, current));
    setBenchmark(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasToWorld(canvasPoint(event, canvas), view);
    dragStart.current = point;
    setSelection(normalizeSelectionBox(point, point));
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    setCapturing(true);
    setPaused(true);
    setBenchmark(null);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    updateSelectionFromPointer(event);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
    activePointerId.current = null;
    setCapturing(false);
  };

  const stepSelection = () => {
    const next = autoPhase + 0.08;
    setAutoPhase(next);
    setSelection((current) => selectionAroundPhase(next, current));
    setPaused(true);
    setBenchmark(null);
  };

  const runBenchmark = () => {
    const selections = makeSelectionQueries(24, BOUNDS, 0.12, 0.09, DEFAULT_SEED ^ 0x290029);
    runQuadtreeSelectionBatch(tree, particles, selections, 1);
    const treeStarted = performance.now();
    const treeMetrics = runQuadtreeSelectionBatch(tree, particles, selections, 2);
    const treeElapsed = performance.now() - treeStarted;
    runBruteSelectionBatch(particles, selections, 1);
    const bruteStarted = performance.now();
    const bruteMetrics = runBruteSelectionBatch(particles, selections, 2);
    const bruteElapsed = performance.now() - bruteStarted;
    setBenchmark({
      quadtree: { metrics: treeMetrics, elapsedMilliseconds: treeElapsed },
      bruteForce: { metrics: bruteMetrics, elapsedMilliseconds: bruteElapsed },
    });
  };

  const runCapacityStudy = () => {
    const selections = makeSelectionQueries(12, BOUNDS, 0.12, 0.09, DEFAULT_SEED ^ 0x290029);
    setStudyRows(makeQuadtreeCapacityStudy(particles, BOUNDS, selections, CAPACITY_PRESETS, 1));
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
    setClustered(true);
    setLeafCapacity(8);
    setSelection(normalizeSelectionBox({ x: 0.4, y: 0.42 }, { x: 0.6, y: 0.58 }));
    setCapturing(false);
    setPaused(true);
    setAutoPhase(0);
    setBenchmark(null);
    setStudyRows([]);
    dragStart.current = null;
    activePointerId.current = null;
  };

  const cycleCapacity = () => {
    const index = CAPACITY_PRESETS.indexOf(leafCapacity as (typeof CAPACITY_PRESETS)[number]);
    const nextIndex = (index + 1) % CAPACITY_PRESETS.length;
    setLeafCapacity(CAPACITY_PRESETS[nextIndex]);
    setBenchmark(null);
    setStudyRows([]);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n") stepSelection();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "d") {
      setClustered((current) => !current);
      setBenchmark(null);
      setStudyRows([]);
    }
    if (event.key.toLowerCase() === "c") cycleCapacity();
    if (event.key.toLowerCase() === "b" && showBenchmark) runBenchmark();
    if (event.key.toLowerCase() === "s" && showStudy) runCapacityStudy();
  };

  const bruteScans = particleCount;
  const candidateReduction = 1 - result.candidatesChecked / Math.max(1, bruteScans);
  const treePerQuery = benchmark
    ? benchmark.quadtree.elapsedMilliseconds / Math.max(1, benchmark.quadtree.metrics.queryCount)
    : 0;
  const brutePerQuery = benchmark
    ? benchmark.bruteForce.elapsedMilliseconds /
      Math.max(1, benchmark.bruteForce.metrics.queryCount)
    : 0;
  const benchmarkMatches =
    benchmark === null ||
    benchmark.quadtree.metrics.checksum === benchmark.bruteForce.metrics.checksum;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Quadtree nhìn thấy được chia particle cloud theo mật độ và truy vấn bằng vùng chọn hình chữ nhật"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) updateSelectionFromPointer(event);
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
          Distribution
          <select
            value={clustered ? "clustered" : "uniform"}
            onChange={(event) => {
              setClustered(event.target.value === "clustered");
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            <option value="clustered">Clustered</option>
            <option value="uniform">Uniform</option>
          </select>
        </label>
        <label>
          Leaf capacity
          <select
            value={leafCapacity}
            onChange={(event) => {
              setLeafCapacity(Number(event.target.value));
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            {CAPACITY_PRESETS.map((capacity) => (
              <option key={capacity} value={capacity}>
                {capacity}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={stepSelection}>
          Tiến một bước
        </button>
        {showBenchmark && (
          <button type="button" onClick={runBenchmark}>
            So benchmark
          </button>
        )}
        {showStudy && (
          <button type="button" onClick={runCapacityStudy}>
            Chạy capacity study
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Tree topology / rebuild",
            value: `${tree.nodes.length.toLocaleString("vi-VN")} nodes · ${tree.leafCount.toLocaleString("vi-VN")} leaves · depth ${tree.maximumObservedDepth} · max leaf ${tree.maximumLeafOccupancy.toLocaleString("vi-VN")} · ${tree.rebuildMilliseconds.toFixed(2)} ms`,
          },
          {
            label: "Visited / pruned / leaf / candidates / hits",
            value: `${result.visitedNodes.toLocaleString("vi-VN")} / ${result.prunedNodes.toLocaleString("vi-VN")} / ${result.visitedLeaves.toLocaleString("vi-VN")} / ${result.candidatesChecked.toLocaleString("vi-VN")} / ${result.hitIndices.length.toLocaleString("vi-VN")}`,
          },
          {
            label: "Quadtree candidates / brute scans",
            value: `${result.candidatesChecked.toLocaleString("vi-VN")} / ${bruteScans.toLocaleString("vi-VN")} · giảm ${(candidateReduction * 100).toFixed(1)}%`,
          },
          {
            label: "Selection min / max",
            value: `(${selection.minimum.x.toFixed(3)}, ${selection.minimum.y.toFixed(3)}) → (${selection.maximum.x.toFixed(3)}, ${selection.maximum.y.toFixed(3)})`,
          },
          {
            label: "Topology / brute-force oracle",
            value: `${topologyValid ? "topology hợp lệ" : "TOPOLOGY KHÔNG HỢP LỆ"} · ${showLiveOracle ? (liveMatch ? "hit set khớp" : "HIT SET KHÔNG KHỚP") : benchmark ? (benchmarkMatches ? "checksum khớp" : "CHECKSUM KHÔNG KHỚP") : "chưa đối chiếu live"}`,
          },
          {
            label: "Benchmark tree / brute",
            value: benchmark
              ? `${treePerQuery.toFixed(3)} / ${brutePerQuery.toFixed(3)} ms/query · ${benchmark.quadtree.metrics.checksum.toString(16).padStart(8, "0")}`
              : "chưa chạy",
          },
          {
            label: "Capacity study",
            value:
              studyRows.length === 0
                ? "chưa chạy"
                : studyRows
                    .map((row) => {
                      const candidatesPerQuery = row.totalCandidates / Math.max(1, row.queryCount);
                      return `cap ${row.leafCapacity}: ${row.nodeCount.toLocaleString("vi-VN")} nodes, ${Math.round(candidatesPerQuery).toLocaleString("vi-VN")} candidates/query`;
                    })
                    .join(" · "),
          },
          {
            label: "Draw sample / indexed workload",
            value: `${Math.min(particleCount, 30_000).toLocaleString("vi-VN")} điểm được vẽ / ${particleCount.toLocaleString("vi-VN")} indices nằm trong leaves`,
          },
          {
            label: "Tree draw sample / stored topology",
            value: `tối đa ${Math.min(tree.leafCount, 12_000).toLocaleString("vi-VN")} leaf outlines nền / ${tree.leafCount.toLocaleString("vi-VN")} leaves thật trong tree`,
          },
          {
            label: "Auto selection / pointer",
            value: `${paused ? "paused" : reducedMotion ? "reduced motion" : "running"} / ${capturing ? "đang kéo" : "đã nhả"}`,
          },
          {
            label: "Mô tả thay thế",
            value: `Quadtree ${tree.nodes.length} nodes, depth ${tree.maximumObservedDepth}; selection thăm ${result.visitedNodes} nodes, prune ${result.prunedNodes}, kiểm ${result.candidatesChecked} candidates và chọn ${result.hitIndices.length} trong ${particleCount} particles.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo trên Canvas để tạo selection. Space chạy/dừng, N tiến một bước, D đổi distribution, C
        đổi capacity, B benchmark, S chạy capacity study và R reset. Leaf xanh còn overlap; hạt vàng
        mới là exact hit.
      </p>
    </>
  );
}
