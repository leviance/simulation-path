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
  buildOctree,
  createBruteVolumeWorkspace,
  createOctreeQueryWorkspace,
  createRootOctree,
  inspectOctreeTopology,
  makeOctreeCapacityStudy,
  makeOctreePointCloud,
  makeVolumeQueries,
  normalizeVolume,
  octreeMatchesBruteForce,
  projectPointWithOrbit,
  queryOctree,
  queryVolumeBruteForce,
  runBruteVolumeBatch,
  runOctreeVolumeBatch,
  type Bounds3D,
  type BruteVolumeBatchMetrics,
  type OctreeBatchMetrics,
  type OctreeCapacityStudyRow,
  type OrbitCamera,
  type Point3D,
} from "@/lib/labs/octree";
import { LabReadout, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const BOUNDS: Bounds3D = {
  minimum: { x: 0, y: 0, z: 0 },
  maximum: { x: 1, y: 1, z: 1 },
};
const DEFAULT_SEED = 0x30c0ffee;
const MAXIMUM_POINT_COUNT = 100_000;
const CAPACITY_PRESETS = [8, 16, 32, 64] as const;
const BOX_EDGES = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
] as const;

interface TimedMetrics<T> {
  metrics: T;
  elapsedMilliseconds: number;
}

interface TimedComparison {
  octree: TimedMetrics<OctreeBatchMetrics>;
  bruteForce: TimedMetrics<BruteVolumeBatchMetrics>;
}

interface ScreenProjection {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

function volumeAround(center: Point3D, halfExtent: number) {
  return normalizeVolume(
    { x: center.x - halfExtent, y: center.y - halfExtent, z: center.z - halfExtent },
    { x: center.x + halfExtent, y: center.y + halfExtent, z: center.z + halfExtent },
  );
}

function boxCorners(bounds: Bounds3D) {
  return [
    { x: bounds.minimum.x, y: bounds.minimum.y, z: bounds.minimum.z },
    { x: bounds.maximum.x, y: bounds.minimum.y, z: bounds.minimum.z },
    { x: bounds.minimum.x, y: bounds.maximum.y, z: bounds.minimum.z },
    { x: bounds.maximum.x, y: bounds.maximum.y, z: bounds.minimum.z },
    { x: bounds.minimum.x, y: bounds.minimum.y, z: bounds.maximum.z },
    { x: bounds.maximum.x, y: bounds.minimum.y, z: bounds.maximum.z },
    { x: bounds.minimum.x, y: bounds.maximum.y, z: bounds.maximum.z },
    { x: bounds.maximum.x, y: bounds.maximum.y, z: bounds.maximum.z },
  ];
}

function projectToCanvas(
  point: Point3D,
  camera: Omit<OrbitCamera, "aspect">,
  width: number,
  height: number,
): ScreenProjection {
  const projected = projectPointWithOrbit(point, {
    ...camera,
    aspect: width / Math.max(1, height),
  });
  const scale = Math.min(width, height) * 0.8;
  return {
    x: width * 0.5 + projected.x * scale * 0.5,
    y: height * 0.5 - projected.y * scale * 0.5,
    depth: projected.depth,
    visible: projected.visible,
  };
}

function drawBox(
  context: CanvasRenderingContext2D,
  bounds: Bounds3D,
  camera: Omit<OrbitCamera, "aspect">,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
) {
  const projected = boxCorners(bounds).map((corner) =>
    projectToCanvas(corner, camera, width, height),
  );
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  for (const [from, to] of BOX_EDGES) {
    if (!projected[from].visible || !projected[to].visible) continue;
    context.beginPath();
    context.moveTo(projected[from].x, projected[from].y);
    context.lineTo(projected[to].x, projected[to].y);
    context.stroke();
  }
}

function drawStudy(
  context: CanvasRenderingContext2D,
  rows: readonly OctreeCapacityStudyRow[],
  width: number,
  height: number,
) {
  if (rows.length === 0) return;
  const left = 36;
  const right = width - 28;
  const top = height - 128;
  const bottom = height - 24;
  const maximumCandidates = Math.max(...rows.map((row) => row.totalCandidates), 1);
  const maximumNodes = Math.max(...rows.map((row) => row.nodeCount), 1);
  const slotWidth = (right - left) / rows.length;
  context.fillStyle = "rgba(11, 16, 32, 0.88)";
  context.fillRect(left - 18, top - 16, right - left + 36, bottom - top + 32);
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

  rows.forEach((row, index) => {
    const centerX = left + slotWidth * (index + 0.5);
    const barHeight = (row.totalCandidates / maximumCandidates) * (bottom - top - 12);
    context.fillStyle = "rgba(229, 192, 123, 0.72)";
    context.fillRect(centerX - 15, bottom - barHeight, 30, barHeight);
    const nodeY = bottom - (row.nodeCount / maximumNodes) * (bottom - top - 12);
    context.fillStyle = "#98c379";
    context.beginPath();
    context.arc(centerX, nodeY, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#abb2bf";
    context.font = "11px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillText(String(row.leafCapacity), centerX, bottom + 15);
  });
  context.textAlign = "start";
}

function centerAtPhase(phase: number, halfExtent: number): Point3D {
  const clamp = (value: number) => Math.max(halfExtent, Math.min(1 - halfExtent, value));
  return {
    x: clamp(0.5 + Math.cos(phase) * 0.28),
    y: clamp(0.5 + Math.sin(phase * 1.31) * 0.25),
    z: clamp(0.5 + Math.sin(phase * 0.83) * 0.27),
  };
}

export default function PointCloudOctreeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointerId = useRef<number | null>(null);
  const previousPointer = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousTimestamp = useRef<number | null>(null);
  const autoPhaseRef = useRef(0);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [pointCount, setPointCount] = useState(MAXIMUM_POINT_COUNT);
  const [clustered, setClustered] = useState(true);
  const [leafCapacity, setLeafCapacity] = useState(16);
  const [queryCenter, setQueryCenter] = useState<Point3D>({ x: 0.5, y: 0.5, z: 0.5 });
  const [queryHalfExtent, setQueryHalfExtent] = useState(0.08);
  const [yaw, setYaw] = useState(0.7);
  const [pitch, setPitch] = useState(-0.35);
  const [distance, setDistance] = useState(2.4);
  const [capturing, setCapturing] = useState(false);
  const [paused, setPaused] = useState(true);
  const [autoPhase, setAutoPhase] = useState(0);
  const [benchmark, setBenchmark] = useState<TimedComparison | null>(null);
  const [studyRows, setStudyRows] = useState<OctreeCapacityStudyRow[]>([]);

  const rootOnly = mode === "octree-root" || mode === "octree-octants";
  const showTree = mode !== "octree-octants";
  const showDistribution = mode !== "octree-octants" && mode !== "octree-root";
  const showQuery =
    mode === "octree-query" ||
    mode === "octree-oracle" ||
    mode === "octree-benchmark" ||
    mode === "octree-capacity" ||
    mode === "octree-validation" ||
    !mode;
  const showTopology =
    mode === "octree-topology" ||
    mode === "octree-query" ||
    mode === "octree-oracle" ||
    mode === "octree-benchmark" ||
    mode === "octree-capacity" ||
    mode === "octree-validation" ||
    !mode;
  const showOracle =
    mode === "octree-oracle" ||
    mode === "octree-benchmark" ||
    mode === "octree-capacity" ||
    mode === "octree-validation" ||
    !mode;
  const showBenchmark =
    mode === "octree-benchmark" ||
    mode === "octree-capacity" ||
    mode === "octree-validation" ||
    !mode;
  const showStudy = mode === "octree-capacity" || mode === "octree-validation" || !mode;
  const camera = useMemo(
    () => ({ yaw, pitch, distance, fieldOfViewRadians: Math.PI / 3, nearPlane: 0.1 }),
    [distance, pitch, yaw],
  );
  const allPoints = useMemo(
    () => makeOctreePointCloud(MAXIMUM_POINT_COUNT, BOUNDS, DEFAULT_SEED, clustered),
    [clustered],
  );
  const points = useMemo(() => allPoints.slice(0, pointCount), [allPoints, pointCount]);
  const tree = useMemo(() => {
    const config = {
      bounds: BOUNDS,
      leafCapacity,
      maximumDepth: 10,
      minimumNodeSize: 1 / 1024,
    };
    if (rootOnly) return createRootOctree(points, config);
    return buildOctree(points, config);
  }, [leafCapacity, points, rootOnly]);
  const queryVolume = useMemo(
    () => volumeAround(queryCenter, queryHalfExtent),
    [queryCenter, queryHalfExtent],
  );
  const result = useMemo(
    () => queryOctree(tree, points, queryVolume, createOctreeQueryWorkspace()),
    [points, queryVolume, tree],
  );
  const topology = useMemo(() => inspectOctreeTopology(tree, points.length), [points.length, tree]);
  const oracle = useMemo(() => {
    if (!showOracle) return null;
    return queryVolumeBruteForce(points, queryVolume, createBruteVolumeWorkspace());
  }, [points, queryVolume, showOracle]);
  const oracleMatches = oracle === null || octreeMatchesBruteForce(result, oracle);
  const topologyValid = rootOnly || Object.values(topology).every(Boolean);
  const octantCounts = useMemo(() => {
    if (mode !== "octree-octants") return [];
    const counts = Array.from({ length: 8 }, () => 0);
    for (const point of points) {
      const octant = (point.x >= 0.5 ? 1 : 0) | (point.y >= 0.5 ? 2 : 0) | (point.z >= 0.5 ? 4 : 0);
      counts[octant] += 1;
    }
    return counts;
  }, [mode, points]);

  useEffect(() => {
    if (paused || reducedMotion) {
      previousTimestamp.current = null;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }
    const animate = (timestamp: number) => {
      const previous = previousTimestamp.current ?? timestamp;
      const deltaSeconds = Math.min(0.05, (timestamp - previous) / 1000);
      previousTimestamp.current = timestamp;
      autoPhaseRef.current += deltaSeconds * 0.48;
      setAutoPhase(autoPhaseRef.current);
      setQueryCenter(centerAtPhase(autoPhaseRef.current, queryHalfExtent));
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      previousTimestamp.current = null;
    };
  }, [paused, queryHalfExtent, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, size.width, size.height);

    if (showTree) {
      const stride = Math.max(1, Math.ceil(tree.leafCount / 3000));
      let leafIndex = 0;
      for (const node of tree.nodes) {
        if (node.children !== null) continue;
        if (leafIndex % stride === 0) {
          const alpha = Math.min(0.48, 0.12 + node.depth * 0.035);
          drawBox(
            context,
            node.bounds,
            camera,
            size.width,
            size.height,
            `rgba(92, 126, 168, ${alpha})`,
            0.7,
          );
        }
        leafIndex += 1;
      }
    } else {
      drawBox(context, BOUNDS, camera, size.width, size.height, "#4f6b91", 1.2);
      if (mode === "octree-octants") {
        for (let octant = 0; octant < 8; octant += 1) {
          drawBox(
            context,
            {
              minimum: {
                x: (octant & 1) !== 0 ? 0.5 : 0,
                y: (octant & 2) !== 0 ? 0.5 : 0,
                z: (octant & 4) !== 0 ? 0.5 : 0,
              },
              maximum: {
                x: (octant & 1) !== 0 ? 1 : 0.5,
                y: (octant & 2) !== 0 ? 1 : 0.5,
                z: (octant & 4) !== 0 ? 1 : 0.5,
              },
            },
            camera,
            size.width,
            size.height,
            "rgba(97, 175, 239, 0.42)",
            0.8,
          );
        }
      }
    }

    const hitSet = new Set(showQuery ? result.hitIndices : []);
    const drawStride = Math.max(1, Math.ceil(pointCount / 32_000));
    const projectedPoints: Array<{ index: number; projection: ScreenProjection }> = [];
    for (let index = 0; index < pointCount; index += drawStride) {
      projectedPoints.push({
        index,
        projection: projectToCanvas(points[index], camera, size.width, size.height),
      });
    }
    projectedPoints.sort((a, b) => b.projection.depth - a.projection.depth);
    for (const entry of projectedPoints) {
      if (!entry.projection.visible) continue;
      const hit = hitSet.has(entry.index);
      context.fillStyle = hit ? "#e5c07b" : "#60738f";
      const radius = hit ? 2.2 : 1;
      context.fillRect(
        entry.projection.x - radius * 0.5,
        entry.projection.y - radius * 0.5,
        radius,
        radius,
      );
    }
    if (showQuery) {
      drawBox(context, queryVolume, camera, size.width, size.height, "#61afef", 2);
    }
    if (showStudy) drawStudy(context, studyRows, size.width, size.height);
  }, [
    camera,
    mode,
    pointCount,
    points,
    queryVolume,
    result.hitIndices,
    showStudy,
    showQuery,
    showTree,
    size,
    studyRows,
    tree,
  ]);

  const updateCenterAxis = (axis: keyof Point3D, value: number) => {
    setQueryCenter((current) => ({ ...current, [axis]: value }));
    setPaused(true);
    setBenchmark(null);
  };

  const stepQuery = () => {
    const next = autoPhase + 0.08;
    autoPhaseRef.current = next;
    setAutoPhase(next);
    setQueryCenter(centerAtPhase(next, queryHalfExtent));
    setPaused(true);
    setBenchmark(null);
  };

  const runBenchmark = () => {
    const volumes = makeVolumeQueries(
      20,
      BOUNDS,
      { x: 0.14, y: 0.12, z: 0.1 },
      DEFAULT_SEED ^ 0x300030,
    );
    runOctreeVolumeBatch(tree, points, volumes, 1);
    const octreeStarted = performance.now();
    const octreeMetrics = runOctreeVolumeBatch(tree, points, volumes, 2);
    const octreeElapsed = performance.now() - octreeStarted;
    runBruteVolumeBatch(points, volumes, 1);
    const bruteStarted = performance.now();
    const bruteMetrics = runBruteVolumeBatch(points, volumes, 2);
    const bruteElapsed = performance.now() - bruteStarted;
    setBenchmark({
      octree: { metrics: octreeMetrics, elapsedMilliseconds: octreeElapsed },
      bruteForce: { metrics: bruteMetrics, elapsedMilliseconds: bruteElapsed },
    });
  };

  const runCapacityStudy = () => {
    const volumes = makeVolumeQueries(
      10,
      BOUNDS,
      { x: 0.14, y: 0.12, z: 0.1 },
      DEFAULT_SEED ^ 0x300030,
    );
    setStudyRows(makeOctreeCapacityStudy(points, BOUNDS, volumes, CAPACITY_PRESETS, 1));
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
    setPointCount(MAXIMUM_POINT_COUNT);
    setClustered(true);
    setLeafCapacity(16);
    setQueryCenter({ x: 0.5, y: 0.5, z: 0.5 });
    setQueryHalfExtent(0.08);
    setYaw(0.7);
    setPitch(-0.35);
    setDistance(2.4);
    setCapturing(false);
    setPaused(true);
    setAutoPhase(0);
    autoPhaseRef.current = 0;
    setBenchmark(null);
    setStudyRows([]);
    activePointerId.current = null;
    previousPointer.current = null;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    previousPointer.current = { x: event.clientX, y: event.clientY };
    setCapturing(true);
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const previous = previousPointer.current;
    if (!capturing || previous === null) return;
    setYaw((current) => current + (event.clientX - previous.x) * 0.008);
    setPitch((current) =>
      Math.max(-1.35, Math.min(1.35, current + (event.clientY - previous.y) * 0.008)),
    );
    previousPointer.current = { x: event.clientX, y: event.clientY };
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerId.current = null;
    previousPointer.current = null;
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " " && showQuery) {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && showQuery) stepQuery();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "g" && showDistribution) {
      setClustered((current) => !current);
      setBenchmark(null);
      setStudyRows([]);
    }
    if (event.key.toLowerCase() === "b" && showBenchmark) runBenchmark();
    if (event.key.toLowerCase() === "t" && showStudy) runCapacityStudy();
    if (event.key === "ArrowLeft") setYaw((current) => current - 0.08);
    if (event.key === "ArrowRight") setYaw((current) => current + 0.08);
    if (event.key === "ArrowUp") setPitch((current) => Math.max(-1.35, current - 0.08));
    if (event.key === "ArrowDown") setPitch((current) => Math.min(1.35, current + 0.08));
  };

  const candidateReduction = 1 - result.candidatesChecked / Math.max(1, pointCount);
  const benchmarkMatches =
    benchmark === null ||
    benchmark.octree.metrics.checksum === benchmark.bruteForce.metrics.checksum;
  const octreePerQuery = benchmark
    ? benchmark.octree.elapsedMilliseconds / Math.max(1, benchmark.octree.metrics.queryCount)
    : 0;
  const brutePerQuery = benchmark
    ? benchmark.bruteForce.elapsedMilliseconds /
      Math.max(1, benchmark.bruteForce.metrics.queryCount)
    : 0;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Point cloud 3D được tổ chức bằng Octree và truy vấn bằng một hộp AABB thể tích"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={(event) => {
          event.preventDefault();
          setDistance((current) => Math.max(1.2, Math.min(5, current + event.deltaY * 0.002)));
        }}
      />
      <div className="lab-controls">
        <label>
          Số points
          <select
            value={pointCount}
            onChange={(event) => {
              setPointCount(Number(event.target.value));
              setBenchmark(null);
              setStudyRows([]);
            }}
          >
            <option value={1000}>1.000</option>
            <option value={10_000}>10.000</option>
            <option value={100_000}>100.000</option>
          </select>
        </label>
        {showDistribution && (
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
        )}
        {showDistribution && (
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
        )}
        {showQuery &&
          (["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              Query {axis.toUpperCase()}
              <input
                type="range"
                min={queryHalfExtent}
                max={1 - queryHalfExtent}
                step={0.01}
                value={queryCenter[axis]}
                onChange={(event) => updateCenterAxis(axis, Number(event.target.value))}
              />
            </label>
          ))}
        {showQuery && (
          <label>
            Nửa cạnh query
            <input
              type="range"
              min={0.03}
              max={0.22}
              step={0.01}
              value={queryHalfExtent}
              onChange={(event) => {
                const next = Number(event.target.value);
                setQueryHalfExtent(next);
                setQueryCenter((current) => ({
                  x: Math.max(next, Math.min(1 - next, current.x)),
                  y: Math.max(next, Math.min(1 - next, current.y)),
                  z: Math.max(next, Math.min(1 - next, current.z)),
                }));
                setPaused(true);
                setBenchmark(null);
              }}
            />
          </label>
        )}
        {showQuery && (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showQuery && (
          <button type="button" onClick={stepQuery}>
            Tiến một bước
          </button>
        )}
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
            label: "Point cloud / world space",
            value: `${pointCount.toLocaleString("vi-VN")} points · ${clustered ? "clustered" : "uniform"} · seed ${DEFAULT_SEED.toString(16).toUpperCase()}`,
          },
          ...(mode === "octree-octants"
            ? [
                {
                  label: "Số point trong octant 0 → 7",
                  value: octantCounts
                    .map((count, octant) => `${octant}: ${count.toLocaleString("vi-VN")}`)
                    .join(" · "),
                },
              ]
            : []),
          ...(showTree
            ? [
                {
                  label: "Tree topology / rebuild",
                  value: `${tree.nodes.length.toLocaleString("vi-VN")} nodes · ${tree.leafCount.toLocaleString("vi-VN")} leaves · depth ${tree.maximumObservedDepth} · max leaf ${tree.maximumLeafOccupancy.toLocaleString("vi-VN")} · ${tree.rebuildMilliseconds.toFixed(2)} ms`,
                },
              ]
            : []),
          ...(showQuery
            ? [
                {
                  label: "Visited / pruned / leaf / candidates / hits",
                  value: `${result.visitedNodes.toLocaleString("vi-VN")} / ${result.prunedNodes.toLocaleString("vi-VN")} / ${result.visitedLeaves.toLocaleString("vi-VN")} / ${result.candidatesChecked.toLocaleString("vi-VN")} / ${result.hitIndices.length.toLocaleString("vi-VN")}`,
                },
                {
                  label: "Octree candidates / brute scans",
                  value: `${result.candidatesChecked.toLocaleString("vi-VN")} / ${pointCount.toLocaleString("vi-VN")} · giảm ${(candidateReduction * 100).toFixed(1)}%`,
                },
                {
                  label: "Query center / half extent",
                  value: `(${queryCenter.x.toFixed(2)}, ${queryCenter.y.toFixed(2)}, ${queryCenter.z.toFixed(2)}) / ${queryHalfExtent.toFixed(2)}`,
                },
              ]
            : []),
          ...(showTopology || mode === "octree-root"
            ? [
                {
                  label: "Topology / brute-force oracle",
                  value:
                    mode === "octree-root"
                      ? `root-only baseline hợp lệ · capacity chưa được áp dụng · ${result.candidatesChecked.toLocaleString("vi-VN")} candidates`
                      : `${topologyValid ? "topology hợp lệ" : "TOPOLOGY KHÔNG HỢP LỆ"} · ${showOracle ? (oracleMatches ? "hit set khớp" : "HIT SET KHÔNG KHỚP") : benchmark ? (benchmarkMatches ? "checksum khớp" : "CHECKSUM KHÔNG KHỚP") : "chưa đối chiếu live"}`,
                },
              ]
            : []),
          ...(showBenchmark
            ? [
                {
                  label: "Benchmark Octree / brute",
                  value: benchmark
                    ? `${octreePerQuery.toFixed(3)} / ${brutePerQuery.toFixed(3)} ms/query · ${benchmark.octree.metrics.checksum.toString(16).padStart(8, "0")}`
                    : "chưa chạy",
                },
              ]
            : []),
          ...(showStudy
            ? [
                {
                  label: "Capacity study",
                  value:
                    studyRows.length === 0
                      ? "chưa chạy"
                      : studyRows
                          .map((row) => {
                            const candidatesPerQuery =
                              row.totalCandidates / Math.max(1, row.queryCount);
                            return `cap ${row.leafCapacity}: ${row.nodeCount.toLocaleString("vi-VN")} nodes, ${Math.round(candidatesPerQuery).toLocaleString("vi-VN")} candidates/query`;
                          })
                          .join(" · "),
                },
              ]
            : []),
          {
            label: "Draw sample / indexed workload",
            value: `${Math.min(pointCount, 32_000).toLocaleString("vi-VN")} điểm được vẽ / ${pointCount.toLocaleString("vi-VN")} indices nằm trong leaves`,
          },
          {
            label: "Camera / pointer",
            value: `yaw ${yaw.toFixed(2)} · pitch ${pitch.toFixed(2)} · distance ${distance.toFixed(2)} / ${capturing ? "đang xoay" : "đã nhả"}`,
          },
          {
            label: "Mô tả thay thế",
            value: showQuery
              ? `Octree ${tree.nodes.length} nodes, depth ${tree.maximumObservedDepth}; query thăm ${result.visitedNodes} nodes, prune ${result.prunedNodes}, kiểm ${result.candidatesChecked} candidates và chọn ${result.hitIndices.length} trong ${pointCount} points.`
              : `Point cloud có ${pointCount} points trong world space; cấu trúc hiện tại có ${tree.nodes.length} nodes và depth ${tree.maximumObservedDepth}.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo Canvas để xoay camera, cuộn để zoom và nhấn R để reset.
        {showQuery &&
          " Các slider di chuyển hộp query theo X/Y/Z; Space chạy/dừng, N tiến một bước."}
        {showDistribution && " G đổi distribution."}
        {showBenchmark && " B chạy benchmark."}
        {showStudy && " T chạy capacity study."} Phím mũi tên cũng xoay camera khi Canvas đang
        focus.
      </p>
    </>
  );
}
