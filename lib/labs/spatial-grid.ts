import {
  createParticleQueryWorkspace,
  noParticleIndex,
  particleDistanceSquared,
  validParticleBounds,
  validParticleQuery,
  type ParticleBatchMetrics,
  type ParticleBounds,
  type ParticlePoint,
  type ParticleQueryCircle,
  type ParticleQueryWorkspace,
} from "./brute-force-particle-query.ts";

export interface SpatialGridConfig {
  bounds: ParticleBounds;
  cellSize: number;
}

export interface SpatialGridAddress {
  column: number;
  row: number;
  index: number;
}

export interface SpatialGridCellRange {
  minimumColumn: number;
  maximumColumn: number;
  minimumRow: number;
  maximumRow: number;
}

export interface SpatialGrid {
  config: SpatialGridConfig;
  columns: number;
  rows: number;
  buckets: number[][];
  particleCount: number;
  insertedCount: number;
  nonEmptyCells: number;
  maximumBucketSize: number;
  rebuildMilliseconds: number;
}

export interface SpatialGridQueryWorkspace extends ParticleQueryWorkspace {
  visitedCells: number;
  candidatesChecked: number;
}

export interface SpatialGridBatchMetrics extends ParticleBatchMetrics {
  totalVisitedCells: number;
  totalCandidates: number;
}

export interface SpatialGridCellSizeRow extends SpatialGridBatchMetrics {
  cellSize: number;
  columns: number;
  rows: number;
  nonEmptyCells: number;
  maximumBucketSize: number;
  rebuildMilliseconds: number;
}

const maximumGridCellCount = 1_000_000;

function pointInsideBounds(point: ParticlePoint, bounds: ParticleBounds) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= bounds.minimum.x &&
    point.x <= bounds.maximum.x &&
    point.y >= bounds.minimum.y &&
    point.y <= bounds.maximum.y
  );
}

function clampInteger(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)));
}

export function validSpatialGridConfig(config: SpatialGridConfig) {
  return (
    validParticleBounds(config.bounds) && Number.isFinite(config.cellSize) && config.cellSize > 0
  );
}

export function spatialGridDimensions(config: SpatialGridConfig) {
  if (!validSpatialGridConfig(config)) return { columns: 0, rows: 0 };
  const width = config.bounds.maximum.x - config.bounds.minimum.x;
  const height = config.bounds.maximum.y - config.bounds.minimum.y;
  const columns = Math.ceil(width / config.cellSize);
  const rows = Math.ceil(height / config.cellSize);
  if (columns * rows > maximumGridCellCount) return { columns: 0, rows: 0 };
  return { columns, rows };
}

export function spatialGridAddress(
  point: ParticlePoint,
  config: SpatialGridConfig,
  columns: number,
  rows: number,
): SpatialGridAddress | null {
  if (columns <= 0 || rows <= 0 || !pointInsideBounds(point, config.bounds)) return null;
  const rawColumn = Math.floor((point.x - config.bounds.minimum.x) / config.cellSize);
  const rawRow = Math.floor((point.y - config.bounds.minimum.y) / config.cellSize);
  const column = clampInteger(rawColumn, 0, columns - 1);
  const row = clampInteger(rawRow, 0, rows - 1);
  return { column, row, index: row * columns + column };
}

export function buildSpatialGrid(
  particles: readonly ParticlePoint[],
  config: SpatialGridConfig,
): SpatialGrid {
  const started = performance.now();
  const { columns, rows } = spatialGridDimensions(config);
  const buckets = Array.from({ length: columns * rows }, () => [] as number[]);
  let insertedCount = 0;

  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    const address = spatialGridAddress(particles[particleIndex], config, columns, rows);
    if (address === null) continue;
    buckets[address.index].push(particleIndex);
    insertedCount += 1;
  }

  let nonEmptyCells = 0;
  let maximumBucketSize = 0;
  for (const bucket of buckets) {
    if (bucket.length > 0) nonEmptyCells += 1;
    maximumBucketSize = Math.max(maximumBucketSize, bucket.length);
  }

  return {
    config,
    columns,
    rows,
    buckets,
    particleCount: particles.length,
    insertedCount,
    nonEmptyCells,
    maximumBucketSize,
    rebuildMilliseconds: performance.now() - started,
  };
}

export function spatialGridQueryCellRange(
  grid: SpatialGrid,
  query: ParticleQueryCircle,
): SpatialGridCellRange | null {
  if (grid.columns <= 0 || grid.rows <= 0 || !validParticleQuery(query)) return null;
  const bounds = grid.config.bounds;
  const queryMinimumX = query.center.x - query.radius;
  const queryMaximumX = query.center.x + query.radius;
  const queryMinimumY = query.center.y - query.radius;
  const queryMaximumY = query.center.y + query.radius;
  if (
    queryMaximumX < bounds.minimum.x ||
    queryMinimumX > bounds.maximum.x ||
    queryMaximumY < bounds.minimum.y ||
    queryMinimumY > bounds.maximum.y
  ) {
    return null;
  }

  const minimumColumn = clampInteger(
    Math.floor((queryMinimumX - bounds.minimum.x) / grid.config.cellSize),
    0,
    grid.columns - 1,
  );
  const maximumColumn = clampInteger(
    Math.floor((queryMaximumX - bounds.minimum.x) / grid.config.cellSize),
    0,
    grid.columns - 1,
  );
  const minimumRow = clampInteger(
    Math.floor((queryMinimumY - bounds.minimum.y) / grid.config.cellSize),
    0,
    grid.rows - 1,
  );
  const maximumRow = clampInteger(
    Math.floor((queryMaximumY - bounds.minimum.y) / grid.config.cellSize),
    0,
    grid.rows - 1,
  );
  return { minimumColumn, maximumColumn, minimumRow, maximumRow };
}

export function createSpatialGridQueryWorkspace(): SpatialGridQueryWorkspace {
  return {
    ...createParticleQueryWorkspace(),
    visitedCells: 0,
    candidatesChecked: 0,
  };
}

function resetSpatialGridQueryWorkspace(workspace: SpatialGridQueryWorkspace) {
  workspace.hitIndices.length = 0;
  workspace.nearestIndex = noParticleIndex;
  workspace.nearestDistanceSquared = Number.POSITIVE_INFINITY;
  workspace.scanned = 0;
  workspace.visitedCells = 0;
  workspace.candidatesChecked = 0;
}

function recordHit(
  workspace: ParticleQueryWorkspace,
  particleIndex: number,
  distanceSquared: number,
) {
  workspace.hitIndices.push(particleIndex);
  const isCloser = distanceSquared < workspace.nearestDistanceSquared;
  const winsTie =
    distanceSquared === workspace.nearestDistanceSquared && particleIndex < workspace.nearestIndex;
  if (isCloser || winsTie) {
    workspace.nearestIndex = particleIndex;
    workspace.nearestDistanceSquared = distanceSquared;
  }
}

export function queryNeighborsBruteForce(
  particles: readonly ParticlePoint[],
  query: ParticleQueryCircle,
  workspace = createParticleQueryWorkspace(),
) {
  workspace.hitIndices.length = 0;
  workspace.nearestIndex = noParticleIndex;
  workspace.nearestDistanceSquared = Number.POSITIVE_INFINITY;
  workspace.scanned = 0;
  if (!validParticleQuery(query)) return workspace;

  const radiusSquared = query.radius * query.radius;
  for (let particleIndex = 0; particleIndex < particles.length; particleIndex += 1) {
    const distanceSquared = particleDistanceSquared(particles[particleIndex], query.center);
    workspace.scanned += 1;
    if (distanceSquared <= radiusSquared) {
      recordHit(workspace, particleIndex, distanceSquared);
    }
  }
  return workspace;
}

export function querySpatialGrid(
  grid: SpatialGrid,
  particles: readonly ParticlePoint[],
  query: ParticleQueryCircle,
  workspace = createSpatialGridQueryWorkspace(),
) {
  resetSpatialGridQueryWorkspace(workspace);
  const cellRange = spatialGridQueryCellRange(grid, query);
  if (cellRange === null) return workspace;

  const radiusSquared = query.radius * query.radius;
  for (let row = cellRange.minimumRow; row <= cellRange.maximumRow; row += 1) {
    for (let column = cellRange.minimumColumn; column <= cellRange.maximumColumn; column += 1) {
      const bucket = grid.buckets[row * grid.columns + column];
      workspace.visitedCells += 1;
      for (const particleIndex of bucket) {
        const particle = particles[particleIndex];
        if (particle === undefined) continue;
        const distanceSquared = particleDistanceSquared(particle, query.center);
        workspace.candidatesChecked += 1;
        workspace.scanned += 1;
        if (distanceSquared <= radiusSquared) {
          recordHit(workspace, particleIndex, distanceSquared);
        }
      }
    }
  }
  return workspace;
}

export function canonicalSpatialGridHits(hitIndices: readonly number[]) {
  return [...hitIndices].sort((first, second) => first - second);
}

export function spatialGridResultMatchesBruteForce(
  gridResult: SpatialGridQueryWorkspace,
  bruteForceResult: ParticleQueryWorkspace,
) {
  if (gridResult.nearestIndex !== bruteForceResult.nearestIndex) return false;
  const gridHits = canonicalSpatialGridHits(gridResult.hitIndices);
  const bruteForceHits = canonicalSpatialGridHits(bruteForceResult.hitIndices);
  if (gridHits.length !== bruteForceHits.length) return false;
  return gridHits.every((particleIndex, index) => particleIndex === bruteForceHits[index]);
}

function updateChecksum(checksum: number, result: ParticleQueryWorkspace) {
  let next = Math.imul(checksum ^ result.hitIndices.length, 16777619) >>> 0;
  next = Math.imul(next ^ (result.nearestIndex + 1), 16777619) >>> 0;
  return next;
}

export function runBruteForceNeighborBatch(
  particles: readonly ParticlePoint[],
  queries: readonly ParticleQueryCircle[],
  repetitions: number,
  workspace = createParticleQueryWorkspace(),
): ParticleBatchMetrics {
  const safeRepetitions = Math.max(0, Math.trunc(repetitions));
  let totalScanned = 0;
  let totalHits = 0;
  let checksum = 2166136261;

  for (let repetition = 0; repetition < safeRepetitions; repetition += 1) {
    for (const query of queries) {
      const result = queryNeighborsBruteForce(particles, query, workspace);
      totalScanned += result.scanned;
      totalHits += result.hitIndices.length;
      checksum = updateChecksum(checksum, result);
    }
  }

  return {
    queryCount: queries.length * safeRepetitions,
    totalScanned,
    totalHits,
    checksum,
  };
}

export function runSpatialGridQueryBatch(
  grid: SpatialGrid,
  particles: readonly ParticlePoint[],
  queries: readonly ParticleQueryCircle[],
  repetitions: number,
  workspace = createSpatialGridQueryWorkspace(),
): SpatialGridBatchMetrics {
  const safeRepetitions = Math.max(0, Math.trunc(repetitions));
  let totalVisitedCells = 0;
  let totalCandidates = 0;
  let totalHits = 0;
  let checksum = 2166136261;

  for (let repetition = 0; repetition < safeRepetitions; repetition += 1) {
    for (const query of queries) {
      const result = querySpatialGrid(grid, particles, query, workspace);
      totalVisitedCells += result.visitedCells;
      totalCandidates += result.candidatesChecked;
      totalHits += result.hitIndices.length;
      checksum = updateChecksum(checksum, result);
    }
  }

  return {
    queryCount: queries.length * safeRepetitions,
    totalScanned: totalCandidates,
    totalHits,
    checksum,
    totalVisitedCells,
    totalCandidates,
  };
}

export function makeSpatialGridCellSizeStudy(
  particles: readonly ParticlePoint[],
  bounds: ParticleBounds,
  queries: readonly ParticleQueryCircle[],
  cellSizes: readonly number[],
  repetitions: number,
) {
  return cellSizes.map<SpatialGridCellSizeRow>((cellSize) => {
    const grid = buildSpatialGrid(particles, { bounds, cellSize });
    return {
      cellSize,
      columns: grid.columns,
      rows: grid.rows,
      nonEmptyCells: grid.nonEmptyCells,
      maximumBucketSize: grid.maximumBucketSize,
      rebuildMilliseconds: grid.rebuildMilliseconds,
      ...runSpatialGridQueryBatch(grid, particles, queries, repetitions),
    };
  });
}
