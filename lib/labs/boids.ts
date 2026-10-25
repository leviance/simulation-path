export interface Vec2 {
  x: number;
  y: number;
}

export interface Boid {
  id: number;
  position: Vec2;
  velocity: Vec2;
}

export interface BoidsParams {
  width: number;
  height: number;
  radius: number;
  maxSpeed: number;
  maxAcceleration: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
}

export const defaultBoidsParams: BoidsParams = {
  width: 960,
  height: 600,
  radius: 64,
  maxSpeed: 90,
  maxAcceleration: 60,
  separationWeight: 1.5,
  alignmentWeight: 1,
  cohesionWeight: 0.8,
};

export const boidsCounts = [256, 512, 1024] as const;
export const vectorEpsilon = 1e-9;
export const fixedBoidsDt = 1 / 60;
export const responseTime = 1;

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function multiply(v: Vec2, scale: number): Vec2 {
  return { x: v.x * scale, y: v.y * scale };
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function limit(v: Vec2, maximum: number): Vec2 {
  const magnitude = length(v);
  if (magnitude <= maximum || magnitude === 0) return { ...v };
  return multiply(v, maximum / magnitude);
}

export function wrap(value: number, span: number): number {
  let result = value % span;
  if (result < 0) result += span;
  // Cộng một số âm cực nhỏ vào span có thể làm tròn thành đúng span.
  if (result >= span || result === 0) return 0;
  return result;
}

// Giữ dấu tại đúng nửa chu kỳ để displacement(a,b) = -displacement(b,a).
export function minimumImage(delta: number, span: number): number {
  let result = delta % span;
  if (result > span / 2) result -= span;
  if (result < -span / 2) result += span;
  return result;
}

export function displacement(a: Vec2, b: Vec2, params: BoidsParams): Vec2 {
  return {
    x: minimumImage(b.x - a.x, params.width),
    y: minimumImage(b.y - a.y, params.height),
  };
}

export function validateBoidsParams(params: BoidsParams) {
  if (!Object.values(params).every(Number.isFinite)) throw new RangeError("Non-finite parameters");
  if (params.width <= 0 || params.height <= 0) throw new RangeError("Empty domain");
  if (params.width > 1e6 || params.height > 1e6)
    throw new RangeError("Domain exceeds supported scale");
  if (params.radius < 0 || params.radius >= Math.min(params.width, params.height) / 2)
    throw new RangeError("Radius must be smaller than half the shortest side");
  if (params.maxSpeed <= 0 || params.maxSpeed > 1000) throw new RangeError("Invalid maximum speed");
  if (params.maxAcceleration <= 0 || params.maxAcceleration > 1000)
    throw new RangeError("Invalid maximum acceleration");
  for (const weight of [params.separationWeight, params.alignmentWeight, params.cohesionWeight]) {
    if (weight < 0 || weight > 5) throw new RangeError("Weight outside [0,5]");
  }
}

export function validateBoids(boids: readonly Boid[], params: BoidsParams, maximumCount = 1024) {
  validateBoidsParams(params);
  if (!Number.isInteger(maximumCount) || maximumCount < 1 || maximumCount > 10000)
    throw new RangeError("Invalid flock budget");
  if (boids.length > maximumCount) throw new RangeError("Flock exceeds supported count");
  const ids = new Set<number>();
  for (const boid of boids) {
    if (!Number.isInteger(boid.id) || boid.id < 0 || boid.id > 0xffffffff || ids.has(boid.id))
      throw new RangeError("IDs must be unique uint32 values");
    ids.add(boid.id);
    const { position, velocity } = boid;
    if (![position.x, position.y, velocity.x, velocity.y].every(Number.isFinite))
      throw new RangeError("Non-finite state");
    if (!Number.isFinite(length(velocity))) throw new RangeError("Velocity norm overflow");
    if (
      position.x < 0 ||
      position.x >= params.width ||
      position.y < 0 ||
      position.y >= params.height
    )
      throw new RangeError("Position outside periodic domain");
  }
}

export function makeFlock(
  count: number,
  seed: number,
  params = defaultBoidsParams,
  maximumCount = 1024,
): Boid[] {
  validateBoidsParams(params);
  if (!Number.isInteger(maximumCount) || maximumCount < 1 || maximumCount > 10000)
    throw new RangeError("Invalid flock budget");
  if (!Number.isInteger(count) || count < 0 || count > maximumCount)
    throw new RangeError("Invalid count");
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("Invalid seed");
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const boids: Boid[] = [];
  for (let id = 0; id < count; id++) {
    const position = { x: random() * params.width, y: random() * params.height };
    const angle = random() * 2 * Math.PI;
    const speed = params.maxSpeed * 0.6;
    boids.push({
      id,
      position,
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    });
  }
  return boids;
}

export function findNeighbors(
  boids: readonly Boid[],
  targetIndex: number,
  params: BoidsParams,
): number[] {
  const target = boids[targetIndex];
  if (!target) throw new RangeError("Invalid target index");
  const neighbors: number[] = [];
  const radiusSquared = params.radius * params.radius;
  for (let index = 0; index < boids.length; index++) {
    if (boids[index].id === target.id) continue;
    const dx = minimumImage(boids[index].position.x - target.position.x, params.width);
    const dy = minimumImage(boids[index].position.y - target.position.y, params.height);
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared <= radiusSquared) neighbors.push(index);
  }
  return neighbors;
}

export interface Steering {
  separation: Vec2;
  alignment: Vec2;
  cohesion: Vec2;
  acceleration: Vec2;
}

export function desiredSteering(direction: Vec2, velocity: Vec2, params: BoidsParams): Vec2 {
  const magnitude = length(direction);
  if (magnitude <= vectorEpsilon) return { x: 0, y: 0 };
  const desiredVelocity = multiply(direction, params.maxSpeed / magnitude);
  const velocityChange = subtract(desiredVelocity, velocity);
  const acceleration = multiply(velocityChange, 1 / responseTime);
  return limit(acceleration, params.maxAcceleration);
}

export function overlapDirection(a: number, b: number): Vec2 {
  const sign = a < b ? -1 : 1;
  if (((a ^ b) & 1) === 0) return { x: sign, y: 0 };
  return { x: 0, y: sign };
}

export function computeSteering(
  boids: readonly Boid[],
  targetIndex: number,
  neighbors: readonly number[],
  params: BoidsParams,
  stage = 9,
): Steering {
  const target = boids[targetIndex];
  let separationSum = { x: 0, y: 0 };
  let velocitySum = { x: 0, y: 0 };
  let offsetSum = { x: 0, y: 0 };
  for (const index of neighbors) {
    const other = boids[index];
    const offset = displacement(target.position, other.position, params);
    const distanceSquared = offset.x * offset.x + offset.y * offset.y;
    let away: Vec2;
    if (distanceSquared <= vectorEpsilon * vectorEpsilon) {
      away = overlapDirection(target.id, other.id);
    } else {
      away = multiply(offset, -1 / distanceSquared);
    }
    separationSum = add(separationSum, away);
    velocitySum = add(velocitySum, other.velocity);
    offsetSum = add(offsetSum, offset);
  }
  const separation =
    stage >= 4 ? desiredSteering(separationSum, target.velocity, params) : { x: 0, y: 0 };
  const alignment =
    stage >= 5 ? desiredSteering(velocitySum, target.velocity, params) : { x: 0, y: 0 };
  const cohesion =
    stage >= 6 ? desiredSteering(offsetSum, target.velocity, params) : { x: 0, y: 0 };
  let acceleration = multiply(separation, params.separationWeight);
  acceleration = add(acceleration, multiply(alignment, params.alignmentWeight));
  acceleration = add(acceleration, multiply(cohesion, params.cohesionWeight));
  acceleration = limit(acceleration, params.maxAcceleration);
  return { separation, alignment, cohesion, acceleration };
}

export function integrateBoid(
  boid: Boid,
  acceleration: Vec2,
  params: BoidsParams,
  dt: number,
): Boid {
  const velocity = limit(add(boid.velocity, multiply(acceleration, dt)), params.maxSpeed);
  const position = add(boid.position, multiply(velocity, dt));
  return {
    id: boid.id,
    position: { x: wrap(position.x, params.width), y: wrap(position.y, params.height) },
    velocity,
  };
}

export interface BoidsMetrics {
  comparisons: number;
  neighbors: number;
  queryMs: number;
  updateMs: number;
  totalMs: number;
}

// Chỉ đọc snapshot. Không ghi vào boids, kể cả khi caller đổi thứ tự lưu trữ.
export function stepBoids(
  boids: readonly Boid[],
  params: BoidsParams,
  dt: number,
  stage = 9,
  now: () => number = () => performance.now(),
): { boids: Boid[]; metrics: BoidsMetrics } {
  const start = now();
  validateBoids(boids, params);
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.05) throw new RangeError("dt outside [0,0.05]");
  const output: Boid[] = [];
  const metrics: BoidsMetrics = {
    comparisons: 0,
    neighbors: 0,
    queryMs: 0,
    updateMs: 0,
    totalMs: 0,
  };
  for (let index = 0; index < boids.length; index++) {
    const queryStart = now();
    const neighbors = stage >= 3 ? findNeighbors(boids, index, params) : [];
    const queryEnd = now();
    if (stage >= 3) metrics.comparisons += Math.max(0, boids.length - 1);
    metrics.neighbors += neighbors.length;
    metrics.queryMs += queryEnd - queryStart;
    const steering = computeSteering(boids, index, neighbors, params, stage);
    output.push(integrateBoid(boids[index], steering.acceleration, params, dt));
    metrics.updateMs += now() - queryEnd;
  }
  metrics.totalMs = now() - start;
  return { boids: output, metrics };
}
