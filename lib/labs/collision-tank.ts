export const COLLISION_EPSILON = 1e-12;

export interface CollisionVec2 {
  x: number;
  y: number;
}

export interface CollisionBall {
  position: CollisionVec2;
  velocity: CollisionVec2;
  radius: number;
  inverseMass: number;
  color: string;
}

export interface CollisionTankBounds {
  minimumX: number;
  minimumY: number;
  maximumX: number;
  maximumY: number;
}

export interface CircleContact {
  colliding: boolean;
  normal: CollisionVec2;
  penetration: number;
  centerDistance: number;
}

export interface CollisionStepSettings {
  deltaSeconds: number;
  restitution: number;
  solverIterations: number;
  correctionPercent: number;
  penetrationSlop: number;
}

export interface CollisionStepStats {
  pairChecks: number;
  contacts: number;
  impulses: number;
  wallHits: number;
  maximumPenetration: number;
}

export interface CollisionWorldMetrics {
  totalMomentum: CollisionVec2;
  kineticEnergy: number;
  overlapCount: number;
  maximumPenetration: number;
  finite: boolean;
}

export interface CollisionFixedStepPlan {
  steps: number;
  remainder: number;
  droppedTime: number;
}

export function collisionAdd(left: CollisionVec2, right: CollisionVec2) {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function collisionSubtract(left: CollisionVec2, right: CollisionVec2) {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function collisionScale(value: CollisionVec2, factor: number) {
  return { x: value.x * factor, y: value.y * factor };
}

export function collisionDot(left: CollisionVec2, right: CollisionVec2) {
  return left.x * right.x + left.y * right.y;
}

export function collisionLengthSquared(value: CollisionVec2) {
  return collisionDot(value, value);
}

export function collisionLength(value: CollisionVec2) {
  return Math.sqrt(collisionLengthSquared(value));
}

export function collisionNormalizedOr(value: CollisionVec2, fallback: CollisionVec2) {
  const magnitude = collisionLength(value);
  if (!Number.isFinite(magnitude) || magnitude <= COLLISION_EPSILON) return { ...fallback };
  return collisionScale(value, 1 / magnitude);
}

export function cloneCollisionBall(ball: CollisionBall): CollisionBall {
  return {
    ...ball,
    position: { ...ball.position },
    velocity: { ...ball.velocity },
  };
}

function finiteCollisionBall(ball: CollisionBall) {
  return (
    Number.isFinite(ball.position.x) &&
    Number.isFinite(ball.position.y) &&
    Number.isFinite(ball.velocity.x) &&
    Number.isFinite(ball.velocity.y) &&
    Number.isFinite(ball.radius) &&
    Number.isFinite(ball.inverseMass) &&
    ball.radius > COLLISION_EPSILON &&
    ball.inverseMass >= 0
  );
}

class CollisionSeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 1;
  }

  nextU32() {
    let value = this.state;
    value = (value ^ (value << 13)) >>> 0;
    value = (value ^ (value >>> 17)) >>> 0;
    value = (value ^ (value << 5)) >>> 0;
    this.state = value;
    return value;
  }

  nextUnit() {
    return this.nextU32() / 0xffffffff;
  }
}

export function makeCollisionLattice(
  columns: number,
  rows: number,
  bounds: CollisionTankBounds,
  radius: number,
  speed: number,
  seed: number,
) {
  if (columns <= 0 || rows <= 0 || radius <= 0 || speed < 0) return [];
  const cellWidth = (bounds.maximumX - bounds.minimumX) / columns;
  const cellHeight = (bounds.maximumY - bounds.minimumY) / rows;
  if (2 * radius > Math.min(cellWidth, cellHeight)) return [];
  const palette = ["#61afef", "#98c379", "#e5c07b", "#c678dd", "#e06c75", "#56b6c2"];
  const random = new CollisionSeededRandom(seed);
  const balls: CollisionBall[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const position = {
        x: bounds.minimumX + (column + 0.5) * cellWidth,
        y: bounds.minimumY + (row + 0.5) * cellHeight,
      };
      const angle = 2 * Math.PI * random.nextUnit();
      const speedScale = 0.75 + 0.5 * random.nextUnit();
      balls.push({
        position,
        velocity: {
          x: speed * speedScale * Math.cos(angle),
          y: speed * speedScale * Math.sin(angle),
        },
        radius,
        inverseMass: 1,
        color: palette[(row * columns + column) % palette.length],
      });
    }
  }
  return balls;
}

export function integrateCollisionBall(ball: CollisionBall, deltaSeconds: number) {
  if (!finiteCollisionBall(ball) || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
  ball.position = collisionAdd(ball.position, collisionScale(ball.velocity, deltaSeconds));
}

export function planCollisionFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
): CollisionFixedStepPlan {
  if (
    !Number.isFinite(accumulator) ||
    accumulator < 0 ||
    !Number.isFinite(frameSeconds) ||
    frameSeconds < 0 ||
    !Number.isFinite(fixedDeltaSeconds) ||
    fixedDeltaSeconds <= 0 ||
    maximumSteps <= 0 ||
    !Number.isFinite(maximumFrameSeconds) ||
    maximumFrameSeconds <= 0
  ) {
    return { steps: 0, remainder: 0, droppedTime: 0 };
  }
  const acceptedFrame = Math.min(frameSeconds, maximumFrameSeconds);
  let available = accumulator + acceptedFrame;
  const availableSteps = Math.floor((available + COLLISION_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrame);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    available -= discardedSteps * fixedDeltaSeconds;
    droppedTime += discardedSteps * fixedDeltaSeconds;
  }
  if (available < 0 && available > -COLLISION_EPSILON) available = 0;
  return { steps, remainder: available, droppedTime };
}

export function resolveCollisionWall(
  ball: CollisionBall,
  bounds: CollisionTankBounds,
  restitution: number,
) {
  const result = { hitCount: 0, deepestPenetration: 0 };
  if (!finiteCollisionBall(ball)) return result;
  const bounce = Math.max(0, Math.min(1, restitution));
  const left = bounds.minimumX + ball.radius;
  if (ball.position.x < left) {
    result.deepestPenetration = Math.max(result.deepestPenetration, left - ball.position.x);
    ball.position.x = left;
    if (ball.velocity.x < 0) ball.velocity.x = -ball.velocity.x * bounce;
    result.hitCount += 1;
  }
  const right = bounds.maximumX - ball.radius;
  if (ball.position.x > right) {
    result.deepestPenetration = Math.max(result.deepestPenetration, ball.position.x - right);
    ball.position.x = right;
    if (ball.velocity.x > 0) ball.velocity.x = -ball.velocity.x * bounce;
    result.hitCount += 1;
  }
  const bottom = bounds.minimumY + ball.radius;
  if (ball.position.y < bottom) {
    result.deepestPenetration = Math.max(result.deepestPenetration, bottom - ball.position.y);
    ball.position.y = bottom;
    if (ball.velocity.y < 0) ball.velocity.y = -ball.velocity.y * bounce;
    result.hitCount += 1;
  }
  const top = bounds.maximumY - ball.radius;
  if (ball.position.y > top) {
    result.deepestPenetration = Math.max(result.deepestPenetration, ball.position.y - top);
    ball.position.y = top;
    if (ball.velocity.y > 0) ball.velocity.y = -ball.velocity.y * bounce;
    result.hitCount += 1;
  }
  return result;
}

export function findCollisionCircleContact(
  first: CollisionBall,
  second: CollisionBall,
): CircleContact {
  if (!finiteCollisionBall(first) || !finiteCollisionBall(second)) {
    return { colliding: false, normal: { x: 1, y: 0 }, penetration: 0, centerDistance: 0 };
  }
  const centerDelta = collisionSubtract(second.position, first.position);
  const radiusSum = first.radius + second.radius;
  const distanceSquared = collisionLengthSquared(centerDelta);
  if (distanceSquared >= radiusSum * radiusSum) {
    return { colliding: false, normal: { x: 1, y: 0 }, penetration: 0, centerDistance: 0 };
  }
  if (distanceSquared <= COLLISION_EPSILON * COLLISION_EPSILON) {
    const relativeVelocity = collisionSubtract(second.velocity, first.velocity);
    return {
      colliding: true,
      normal: collisionNormalizedOr(relativeVelocity, { x: 1, y: 0 }),
      penetration: radiusSum,
      centerDistance: 0,
    };
  }
  const centerDistance = Math.sqrt(distanceSquared);
  return {
    colliding: true,
    normal: collisionScale(centerDelta, 1 / centerDistance),
    penetration: radiusSum - centerDistance,
    centerDistance,
  };
}

export function applyCollisionPairImpulse(
  first: CollisionBall,
  second: CollisionBall,
  contact: CircleContact,
  restitution: number,
) {
  if (!contact.colliding) return 0;
  const inverseMassSum = first.inverseMass + second.inverseMass;
  if (inverseMassSum <= COLLISION_EPSILON) return 0;
  const relativeVelocity = collisionSubtract(second.velocity, first.velocity);
  const velocityAlongNormal = collisionDot(relativeVelocity, contact.normal);
  if (velocityAlongNormal >= 0) return 0;
  const bounce = Math.max(0, Math.min(1, restitution));
  const impulseMagnitude = (-(1 + bounce) * velocityAlongNormal) / inverseMassSum;
  const impulse = collisionScale(contact.normal, impulseMagnitude);
  first.velocity = collisionSubtract(first.velocity, collisionScale(impulse, first.inverseMass));
  second.velocity = collisionAdd(second.velocity, collisionScale(impulse, second.inverseMass));
  return impulseMagnitude;
}

export function correctCollisionPenetration(
  first: CollisionBall,
  second: CollisionBall,
  contact: CircleContact,
  correctionPercent: number,
  penetrationSlop: number,
) {
  if (!contact.colliding) return 0;
  const inverseMassSum = first.inverseMass + second.inverseMass;
  if (inverseMassSum <= COLLISION_EPSILON) return 0;
  const percent = Math.max(0, Math.min(1, correctionPercent));
  const slop = Math.max(0, penetrationSlop);
  const magnitude = (Math.max(contact.penetration - slop, 0) * percent) / inverseMassSum;
  const correction = collisionScale(contact.normal, magnitude);
  first.position = collisionSubtract(first.position, collisionScale(correction, first.inverseMass));
  second.position = collisionAdd(second.position, collisionScale(correction, second.inverseMass));
  return magnitude;
}

export function stepCollisionTank(
  sourceBalls: CollisionBall[],
  bounds: CollisionTankBounds,
  settings: CollisionStepSettings,
) {
  const balls = sourceBalls.map(cloneCollisionBall);
  const stats: CollisionStepStats = {
    pairChecks: 0,
    contacts: 0,
    impulses: 0,
    wallHits: 0,
    maximumPenetration: 0,
  };
  for (const ball of balls) integrateCollisionBall(ball, settings.deltaSeconds);
  const iterations = Math.max(1, Math.min(8, Math.trunc(settings.solverIterations)));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (const ball of balls) {
      const wall = resolveCollisionWall(ball, bounds, settings.restitution);
      stats.wallHits += wall.hitCount;
      stats.maximumPenetration = Math.max(stats.maximumPenetration, wall.deepestPenetration);
    }
    for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
        stats.pairChecks += 1;
        const first = balls[firstIndex];
        const second = balls[secondIndex];
        const contact = findCollisionCircleContact(first, second);
        if (!contact.colliding) continue;
        stats.contacts += 1;
        stats.maximumPenetration = Math.max(stats.maximumPenetration, contact.penetration);
        const impulse = applyCollisionPairImpulse(first, second, contact, settings.restitution);
        if (impulse > 0) stats.impulses += 1;
        correctCollisionPenetration(
          first,
          second,
          contact,
          settings.correctionPercent,
          settings.penetrationSlop,
        );
      }
    }
  }
  return { balls, stats };
}

export function measureCollisionWorld(balls: CollisionBall[]): CollisionWorldMetrics {
  const metrics: CollisionWorldMetrics = {
    totalMomentum: { x: 0, y: 0 },
    kineticEnergy: 0,
    overlapCount: 0,
    maximumPenetration: 0,
    finite: true,
  };
  for (const ball of balls) {
    if (!finiteCollisionBall(ball)) {
      metrics.finite = false;
      continue;
    }
    if (ball.inverseMass <= COLLISION_EPSILON) continue;
    const mass = 1 / ball.inverseMass;
    metrics.totalMomentum = collisionAdd(
      metrics.totalMomentum,
      collisionScale(ball.velocity, mass),
    );
    metrics.kineticEnergy += 0.5 * mass * collisionLengthSquared(ball.velocity);
  }
  for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
      const contact = findCollisionCircleContact(balls[firstIndex], balls[secondIndex]);
      if (!contact.colliding) continue;
      metrics.overlapCount += 1;
      metrics.maximumPenetration = Math.max(metrics.maximumPenetration, contact.penetration);
    }
  }
  return metrics;
}

export function nearestCollisionBallIndex(balls: CollisionBall[], point: CollisionVec2) {
  if (balls.length === 0) return -1;
  let nearestIndex = 0;
  let nearestDistanceSquared = collisionLengthSquared(collisionSubtract(balls[0].position, point));
  for (let index = 1; index < balls.length; index += 1) {
    const distanceSquared = collisionLengthSquared(collisionSubtract(balls[index].position, point));
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}
