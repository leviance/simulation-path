export const GPU_GRID_WORKGROUP_SIZE = 256;
export const GPU_GRID_SCAN_SPAN = 512;
export const GPU_GRID_COUNT_PRESETS = [1_024, 65_537, 262_147, 1_000_003] as const;
export const GPU_GRID_CELL_PRESETS = [4, 8, 16, 32] as const;
export const GPU_GRID_MAXIMUM_ESTIMATED_CANDIDATE_VISITS = 1_500_000_000;

export interface GpuGridPoint {
  x: number;
  y: number;
}

export interface GpuGridSpec {
  worldWidth: number;
  worldHeight: number;
  cellSize: number;
  columns: number;
  rows: number;
  cellCount: number;
}

export interface GpuGridCellRange {
  minimumColumn: number;
  maximumColumn: number;
  minimumRow: number;
  maximumRow: number;
  visitedCellCount: number;
}

export interface GpuNeighborSummary {
  neighborCount: number;
  nearestIndex: number | null;
  nearestDistanceSquared: number;
  visitedCandidates: number;
}

export interface GpuCsrGrid {
  spec: GpuGridSpec;
  counts: number[];
  offsets: number[];
  cursors: number[];
  sortedIndices: number[];
}

export type GpuGridInjectedError = "none" | "lost-count" | "wrong-offset" | "duplicate-index";
export type GpuGridBarrierChoice = "shader-storage" | "buffer-update" | "none";

export function gpuGridCeilDiv(value: number, divisor: number) {
  if (value <= 0 || divisor <= 0) return 0;
  return Math.floor((value - 1) / divisor) + 1;
}

export function makeGpuGridSpec(
  cellSize: number,
  worldWidth = 1_024,
  worldHeight = 576,
): GpuGridSpec {
  const safeCellSize = Number.isFinite(cellSize) && cellSize >= 1 ? cellSize : 8;
  const columns = Math.ceil(worldWidth / safeCellSize);
  const rows = Math.ceil(worldHeight / safeCellSize);
  return {
    worldWidth,
    worldHeight,
    cellSize: safeCellSize,
    columns,
    rows,
    cellCount: columns * rows,
  };
}

function clampInside(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum - Number.EPSILON * maximum, value));
}

export function gpuGridCellAddress(point: GpuGridPoint, spec: GpuGridSpec) {
  const x = clampInside(point.x, spec.worldWidth);
  const y = clampInside(point.y, spec.worldHeight);
  const column = Math.min(spec.columns - 1, Math.floor(x / spec.cellSize));
  const row = Math.min(spec.rows - 1, Math.floor(y / spec.cellSize));
  return { column, row, id: row * spec.columns + column };
}

export function gpuGridMixBits(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function makeGpuGridPositions(count: number, seed = 40, spec = makeGpuGridSpec(8)) {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => {
    const xBits = gpuGridMixBits((index >>> 0) ^ (seed >>> 0) ^ 0x9e3779b9);
    const yBits = gpuGridMixBits((index >>> 0) ^ (seed >>> 0) ^ 0x85ebca6b);
    return {
      x: ((xBits & 0x00ffffff) / 0x01000000) * spec.worldWidth,
      y: ((yBits & 0x00ffffff) / 0x01000000) * spec.worldHeight,
    };
  });
}

export function gpuGridExclusiveScan(values: readonly number[]) {
  const output = new Array<number>(values.length).fill(0);
  let running = 0;
  for (let index = 0; index < values.length; index += 1) {
    output[index] = running;
    running += values[index];
  }
  return output;
}

export function countGpuGridCells(points: readonly GpuGridPoint[], spec: GpuGridSpec) {
  const counts = new Array<number>(spec.cellCount).fill(0);
  for (const point of points) counts[gpuGridCellAddress(point, spec).id] += 1;
  return counts;
}

export function simulateGpuCellCountArrivals(
  points: readonly GpuGridPoint[],
  spec: GpuGridSpec,
  arrivalCount: number,
  atomicEnabled: boolean,
  waveSize = 32,
) {
  const counts = new Array<number>(spec.cellCount).fill(0);
  const safeArrivalCount = Math.min(points.length, Math.max(0, Math.floor(arrivalCount)));
  if (atomicEnabled) {
    for (let index = 0; index < safeArrivalCount; index += 1) {
      counts[gpuGridCellAddress(points[index], spec).id] += 1;
    }
    return counts;
  }

  // Mô hình hóa một race dễ quan sát: các invocation trong cùng một wave cùng đọc
  // snapshot cũ, nên nhiều read+write vào một cell chỉ giữ lại lần ghi cuối.
  const safeWaveSize = Math.max(1, Math.floor(waveSize));
  for (let waveBegin = 0; waveBegin < safeArrivalCount; waveBegin += safeWaveSize) {
    const pendingWrites = new Map<number, number>();
    const waveEnd = Math.min(safeArrivalCount, waveBegin + safeWaveSize);
    for (let index = waveBegin; index < waveEnd; index += 1) {
      const cell = gpuGridCellAddress(points[index], spec).id;
      pendingWrites.set(cell, counts[cell] + 1);
    }
    for (const [cell, value] of pendingWrites) counts[cell] = value;
  }
  return counts;
}

export function buildGpuCsrGrid(
  points: readonly GpuGridPoint[],
  spec: GpuGridSpec,
  arrivalOrder?: readonly number[],
): GpuCsrGrid {
  const counts = countGpuGridCells(points, spec);
  const offsets = gpuGridExclusiveScan(counts);
  const cursors = [...offsets];
  const sortedIndices = new Array<number>(points.length);
  const order = arrivalOrder ?? points.map((_, index) => index);
  for (const index of order) {
    if (index < 0 || index >= points.length) continue;
    const cell = gpuGridCellAddress(points[index], spec).id;
    const slot = cursors[cell];
    cursors[cell] += 1;
    sortedIndices[slot] = index;
  }
  return { spec, counts, offsets, cursors, sortedIndices };
}

export function gpuGridCandidateRange(
  center: GpuGridPoint,
  radius: number,
  spec: GpuGridSpec,
): GpuGridCellRange {
  const minimum = gpuGridCellAddress({ x: center.x - radius, y: center.y - radius }, spec);
  const maximum = gpuGridCellAddress({ x: center.x + radius, y: center.y + radius }, spec);
  const visitedCellCount = (maximum.column - minimum.column + 1) * (maximum.row - minimum.row + 1);
  return {
    minimumColumn: minimum.column,
    maximumColumn: maximum.column,
    minimumRow: minimum.row,
    maximumRow: maximum.row,
    visitedCellCount,
  };
}

function squaredDistance(left: GpuGridPoint, right: GpuGridPoint) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function betterGpuNeighbor(
  distance: number,
  index: number,
  bestDistance: number,
  bestIndex: number | null,
) {
  if (distance + 1e-6 < bestDistance) return true;
  return Math.abs(distance - bestDistance) <= 1e-6 && (bestIndex === null || index < bestIndex);
}

export function queryGpuCsrNeighbors(
  points: readonly GpuGridPoint[],
  grid: GpuCsrGrid,
  queryIndex: number,
  radius: number,
): GpuNeighborSummary {
  const summary: GpuNeighborSummary = {
    neighborCount: 0,
    nearestIndex: null,
    nearestDistanceSquared: Number.POSITIVE_INFINITY,
    visitedCandidates: 0,
  };
  if (queryIndex < 0 || queryIndex >= points.length || radius < 0) return summary;
  const center = points[queryIndex];
  const range = gpuGridCandidateRange(center, radius, grid.spec);
  const radiusSquared = radius * radius;
  for (let row = range.minimumRow; row <= range.maximumRow; row += 1) {
    for (let column = range.minimumColumn; column <= range.maximumColumn; column += 1) {
      const cell = row * grid.spec.columns + column;
      const begin = grid.offsets[cell];
      const end = begin + grid.counts[cell];
      for (let slot = begin; slot < end; slot += 1) {
        const candidate = grid.sortedIndices[slot];
        if (candidate === queryIndex) continue;
        summary.visitedCandidates += 1;
        const distance = squaredDistance(center, points[candidate]);
        if (distance > radiusSquared) continue;
        summary.neighborCount += 1;
        if (
          betterGpuNeighbor(
            distance,
            candidate,
            summary.nearestDistanceSquared,
            summary.nearestIndex,
          )
        ) {
          summary.nearestDistanceSquared = distance;
          summary.nearestIndex = candidate;
        }
      }
    }
  }
  return summary;
}

export function queryGpuBruteForceNeighbors(
  points: readonly GpuGridPoint[],
  queryIndex: number,
  radius: number,
) {
  const spec = makeGpuGridSpec(Math.max(1, Math.max(1_024, 576)));
  const oneCell = buildGpuCsrGrid(points, spec);
  return queryGpuCsrNeighbors(points, oneCell, queryIndex, radius);
}

export function validateGpuCsrGrid(grid: GpuCsrGrid, particleCount: number) {
  const countsTotal = grid.counts.reduce((total, value) => total + value, 0);
  let offsetsMonotonic = grid.offsets.length === 0 || grid.offsets[0] === 0;
  let rangesInsideStorage = true;
  for (let cell = 0; cell < grid.counts.length; cell += 1) {
    if (cell > 0 && grid.offsets[cell] < grid.offsets[cell - 1]) offsetsMonotonic = false;
    if (cell > 0 && grid.offsets[cell] !== grid.offsets[cell - 1] + grid.counts[cell - 1]) {
      rangesInsideStorage = false;
    }
    if (grid.offsets[cell] + grid.counts[cell] > particleCount) rangesInsideStorage = false;
  }
  const validIndices = grid.sortedIndices.every(
    (index) => Number.isInteger(index) && index >= 0 && index < particleCount,
  );
  const particlePermutation = validIndices && new Set(grid.sortedIndices).size === particleCount;
  return {
    countsTotalMatches: countsTotal === particleCount,
    offsetsMonotonic,
    rangesInsideStorage,
    particlePermutation,
    passed:
      countsTotal === particleCount &&
      offsetsMonotonic &&
      rangesInsideStorage &&
      particlePermutation,
  };
}

export function injectGpuGridError(grid: GpuCsrGrid, error: GpuGridInjectedError): GpuCsrGrid {
  const copy: GpuCsrGrid = {
    spec: grid.spec,
    counts: [...grid.counts],
    offsets: [...grid.offsets],
    cursors: [...grid.cursors],
    sortedIndices: [...grid.sortedIndices],
  };
  if (error === "lost-count") {
    const occupiedCell = copy.counts.findIndex((count) => count > 0);
    if (occupiedCell >= 0) copy.counts[occupiedCell] -= 1;
  }
  if (error === "wrong-offset" && copy.offsets.length > 2) copy.offsets[2] += 3;
  if (error === "duplicate-index" && copy.sortedIndices.length > 1)
    copy.sortedIndices[1] = copy.sortedIndices[0];
  return copy;
}

export function gpuGridScanHierarchy(cellCount: number) {
  const levels: Array<{ inputCount: number; blockCount: number }> = [];
  let current = Math.max(0, Math.floor(cellCount));
  while (current > 0) {
    const blockCount = gpuGridCeilDiv(current, GPU_GRID_SCAN_SPAN);
    levels.push({ inputCount: current, blockCount });
    if (blockCount === 1) break;
    current = blockCount;
  }
  return levels;
}

export function makeGpuGridPassLabels(cellCount: number) {
  const hierarchy = gpuGridScanHierarchy(cellCount);
  const labels = ["clear cellCounts", "atomic count"];
  for (const [level, item] of hierarchy.entries()) {
    labels.push(`scan L${level}: ${item.inputCount} → ${item.blockCount}`);
  }
  for (let level = hierarchy.length - 1; level > 0; level -= 1) {
    labels.push(`uniform add L${level - 1}`);
  }
  labels.push("prepare cursors", "atomic scatter", "neighbor query");
  return labels;
}

export function gpuGridBarrierContract(
  consumer: "compute" | "readback",
  choice: GpuGridBarrierChoice,
) {
  const expected: GpuGridBarrierChoice =
    consumer === "compute" ? "shader-storage" : "buffer-update";
  return {
    expected,
    passed: choice === expected,
    message:
      choice === expected
        ? `Đúng: ${choice} chuẩn bị dữ liệu cho ${consumer}.`
        : `Sai: ${consumer} cần ${expected}, không phải ${choice}.`,
  };
}

export function modelGpuGridMilliseconds(
  particleCount: number,
  cellCount: number,
  radius: number,
  cellSize: number,
) {
  const passes = makeGpuGridPassLabels(cellCount).length;
  const candidateWork = estimateGpuGridCandidateWork(
    particleCount,
    makeGpuGridSpec(cellSize),
    radius,
  ).estimatedCandidateVisits;
  return passes * 0.018 + particleCount / 3_000_000 + candidateWork / 650_000_000;
}

export function estimateGpuGridCandidateWork(
  particleCount: number,
  spec: GpuGridSpec,
  radius: number,
) {
  if (
    particleCount <= 0 ||
    spec.cellCount <= 0 ||
    spec.cellSize <= 0 ||
    !Number.isFinite(radius) ||
    radius < 0
  ) {
    return { maximumCandidateCellsPerQuery: 0, estimatedCandidateVisits: 0, withinBudget: false };
  }

  const cellsAcross = Math.floor((2 * radius) / spec.cellSize) + 2;
  const maximumColumns = Math.min(spec.columns, cellsAcross);
  const maximumRows = Math.min(spec.rows, cellsAcross);
  const maximumCandidateCellsPerQuery = maximumColumns * maximumRows;
  const averageOccupancy = particleCount / spec.cellCount;
  const estimatedCandidateVisits = particleCount * maximumCandidateCellsPerQuery * averageOccupancy;
  return {
    maximumCandidateCellsPerQuery,
    estimatedCandidateVisits,
    withinBudget: estimatedCandidateVisits <= GPU_GRID_MAXIMUM_ESTIMATED_CANDIDATE_VISITS,
  };
}
