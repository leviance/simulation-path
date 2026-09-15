export interface ParticlePoint {
  x: number;
  y: number;
}

export interface ParticleBounds {
  minimum: ParticlePoint;
  maximum: ParticlePoint;
}

export interface ParticleQueryCircle {
  center: ParticlePoint;
  radius: number;
}

export interface ParticleQueryWorkspace {
  hitIndices: number[];
  nearestIndex: number;
  nearestDistanceSquared: number;
  scanned: number;
}

export interface ParticleBatchMetrics {
  queryCount: number;
  totalScanned: number;
  totalHits: number;
  checksum: number;
}

export interface ParticleScalingRow extends ParticleBatchMetrics {
  particleCount: number;
}

export const noParticleIndex = -1;
const uint32Maximum = 0xffffffff;

function validPoint(point: ParticlePoint) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function validParticleBounds(bounds: ParticleBounds) {
  return (
    validPoint(bounds.minimum) &&
    validPoint(bounds.maximum) &&
    bounds.minimum.x < bounds.maximum.x &&
    bounds.minimum.y < bounds.maximum.y
  );
}

export function validParticleQuery(query: ParticleQueryCircle) {
  return validPoint(query.center) && Number.isFinite(query.radius) && query.radius >= 0;
}

function nextRandom(state: number) {
  let value = state >>> 0;
  value = (value ^ ((value << 13) >>> 0)) >>> 0;
  value = (value ^ (value >>> 17)) >>> 0;
  value = (value ^ ((value << 5) >>> 0)) >>> 0;
  return value;
}

export function makeParticleCloud(count: number, bounds: ParticleBounds, seed: number) {
  if (!Number.isInteger(count) || count < 0 || !validParticleBounds(bounds)) return [];

  let randomState = seed >>> 0;
  if (randomState === 0) randomState = 0x6d2b79f5;
  const particles: ParticlePoint[] = [];
  const width = bounds.maximum.x - bounds.minimum.x;
  const height = bounds.maximum.y - bounds.minimum.y;
  for (let index = 0; index < count; index += 1) {
    randomState = nextRandom(randomState);
    const unitX = randomState / uint32Maximum;
    randomState = nextRandom(randomState);
    const unitY = randomState / uint32Maximum;
    particles.push({
      x: bounds.minimum.x + unitX * width,
      y: bounds.minimum.y + unitY * height,
    });
  }
  return particles;
}

export function particleDistanceSquared(first: ParticlePoint, second: ParticlePoint) {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

export function particleInsideCircleWithDistance(
  particle: ParticlePoint,
  query: ParticleQueryCircle,
) {
  if (!validParticleQuery(query)) return false;
  return Math.hypot(particle.x - query.center.x, particle.y - query.center.y) <= query.radius;
}

export function createParticleQueryWorkspace(): ParticleQueryWorkspace {
  return {
    hitIndices: [],
    nearestIndex: noParticleIndex,
    nearestDistanceSquared: Number.POSITIVE_INFINITY,
    scanned: 0,
  };
}

export function queryParticlesWithDistance(
  particles: readonly ParticlePoint[],
  query: ParticleQueryCircle,
  particleLimit = particles.length,
) {
  const result = createParticleQueryWorkspace();
  if (!validParticleQuery(query)) return result;

  const limit = Math.min(Math.max(0, Math.trunc(particleLimit)), particles.length);
  for (let index = 0; index < limit; index += 1) {
    const distanceSquared = particleDistanceSquared(particles[index], query.center);
    result.scanned += 1;
    if (distanceSquared < result.nearestDistanceSquared) {
      result.nearestDistanceSquared = distanceSquared;
      result.nearestIndex = index;
    }
    if (particleInsideCircleWithDistance(particles[index], query)) {
      result.hitIndices.push(index);
    }
  }
  return result;
}

export function queryParticlesSquared(
  particles: readonly ParticlePoint[],
  query: ParticleQueryCircle,
  workspace: ParticleQueryWorkspace,
  particleLimit = particles.length,
) {
  workspace.hitIndices.length = 0;
  workspace.nearestIndex = noParticleIndex;
  workspace.nearestDistanceSquared = Number.POSITIVE_INFINITY;
  workspace.scanned = 0;
  if (!validParticleQuery(query)) return workspace;

  const radiusSquared = query.radius * query.radius;
  const limit = Math.min(Math.max(0, Math.trunc(particleLimit)), particles.length);
  for (let index = 0; index < limit; index += 1) {
    const distanceSquared = particleDistanceSquared(particles[index], query.center);
    workspace.scanned += 1;
    if (distanceSquared < workspace.nearestDistanceSquared) {
      workspace.nearestDistanceSquared = distanceSquared;
      workspace.nearestIndex = index;
    }
    if (distanceSquared <= radiusSquared) workspace.hitIndices.push(index);
  }
  return workspace;
}

export function particleQueryResultsMatch(
  first: ParticleQueryWorkspace,
  second: ParticleQueryWorkspace,
) {
  if (first.nearestIndex !== second.nearestIndex) return false;
  if (first.hitIndices.length !== second.hitIndices.length) return false;

  return first.hitIndices.every((particleIndex, index) => {
    return particleIndex === second.hitIndices[index];
  });
}

export function makeParticleProbeQueries(
  count: number,
  bounds: ParticleBounds,
  radius: number,
  seed: number,
) {
  if (!Number.isInteger(count) || count < 0 || radius < 0) return [];
  return makeParticleCloud(count, bounds, seed).map((center) => ({ center, radius }));
}

function updateParticleChecksum(checksum: number, result: ParticleQueryWorkspace) {
  let next = Math.imul(checksum ^ result.hitIndices.length, 16777619) >>> 0;
  next = Math.imul(next ^ (result.nearestIndex + 1), 16777619) >>> 0;
  return next;
}

export function runParticleQueryBatch(
  particles: readonly ParticlePoint[],
  queries: readonly ParticleQueryCircle[],
  repetitions: number,
  workspace: ParticleQueryWorkspace,
  particleLimit = particles.length,
): ParticleBatchMetrics {
  const safeRepetitions = Math.max(0, Math.trunc(repetitions));
  const limit = Math.min(Math.max(0, Math.trunc(particleLimit)), particles.length);
  let totalScanned = 0;
  let totalHits = 0;
  let checksum = 2166136261;

  for (let repetition = 0; repetition < safeRepetitions; repetition += 1) {
    for (const query of queries) {
      const result = queryParticlesSquared(particles, query, workspace, limit);
      totalScanned += result.scanned;
      totalHits += result.hitIndices.length;
      checksum = updateParticleChecksum(checksum, result);
    }
  }

  return {
    queryCount: queries.length * safeRepetitions,
    totalScanned,
    totalHits,
    checksum,
  };
}

export function makeParticleScalingStudy(
  particles: readonly ParticlePoint[],
  queries: readonly ParticleQueryCircle[],
  particleCounts: readonly number[],
  repetitions: number,
) {
  const workspace = createParticleQueryWorkspace();
  return particleCounts.map<ParticleScalingRow>((particleCount) => ({
    particleCount: Math.min(Math.max(0, Math.trunc(particleCount)), particles.length),
    ...runParticleQueryBatch(particles, queries, repetitions, workspace, particleCount),
  }));
}
