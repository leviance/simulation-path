export const SPRING_EPSILON = 1e-12;

export interface SpringVec2 {
  x: number;
  y: number;
}

export interface SpringParticle {
  position: SpringVec2;
  velocity: SpringVec2;
  force: SpringVec2;
  inverseMass: number;
  radius: number;
}

export interface SpringLink {
  first: number;
  second: number;
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface SpringChainState {
  particles: SpringParticle[];
  springs: SpringLink[];
  anchorPosition: SpringVec2;
}

export interface SpringSample {
  valid: boolean;
  direction: SpringVec2;
  distance: number;
  stretch: number;
  relativeSpeed: number;
  forceOnFirst: SpringVec2;
}

export interface SpringDragConstraint {
  active: boolean;
  particleIndex: number;
  target: SpringVec2;
  releaseVelocity: SpringVec2;
}

export interface SpringStepSettings {
  deltaSeconds: number;
  gravity: SpringVec2;
  gravityEnabled: boolean;
  dampingEnabled: boolean;
}

export interface SpringMetrics {
  kineticEnergy: number;
  springEnergy: number;
  gravitationalEnergy: number;
  maximumStretch: number;
  maximumSpeed: number;
  anchorError: number;
  finite: boolean;
}

export function springAdd(left: SpringVec2, right: SpringVec2) {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function springSubtract(left: SpringVec2, right: SpringVec2) {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function springScale(value: SpringVec2, factor: number) {
  return { x: value.x * factor, y: value.y * factor };
}

export function springDot(left: SpringVec2, right: SpringVec2) {
  return left.x * right.x + left.y * right.y;
}

export function springLengthSquared(value: SpringVec2) {
  return springDot(value, value);
}

export function springLength(value: SpringVec2) {
  return Math.sqrt(springLengthSquared(value));
}

function finiteVector(value: SpringVec2) {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

function finiteParticle(particle: SpringParticle) {
  return (
    finiteVector(particle.position) &&
    finiteVector(particle.velocity) &&
    finiteVector(particle.force) &&
    Number.isFinite(particle.inverseMass) &&
    Number.isFinite(particle.radius) &&
    particle.inverseMass >= 0 &&
    particle.radius > 0
  );
}

function validSpring(spring: SpringLink, particleCount: number) {
  return (
    spring.first >= 0 &&
    spring.first < particleCount &&
    spring.second >= 0 &&
    spring.second < particleCount &&
    spring.first !== spring.second &&
    Number.isFinite(spring.restLength) &&
    spring.restLength > SPRING_EPSILON &&
    Number.isFinite(spring.stiffness) &&
    spring.stiffness >= 0 &&
    Number.isFinite(spring.damping) &&
    spring.damping >= 0
  );
}

export function cloneSpringChain(chain: SpringChainState): SpringChainState {
  return {
    particles: chain.particles.map((particle) => ({
      ...particle,
      position: { ...particle.position },
      velocity: { ...particle.velocity },
      force: { ...particle.force },
    })),
    springs: chain.springs.map((spring) => ({ ...spring })),
    anchorPosition: { ...chain.anchorPosition },
  };
}

export function makeSpringChain(
  particleCount: number,
  anchorPosition: SpringVec2,
  restLength: number,
  mass: number,
  radius: number,
  stiffness: number,
  damping: number,
): SpringChainState {
  const chain: SpringChainState = {
    particles: [],
    springs: [],
    anchorPosition: { ...anchorPosition },
  };
  if (
    particleCount < 2 ||
    !finiteVector(anchorPosition) ||
    restLength <= 0 ||
    mass <= 0 ||
    radius <= 0 ||
    stiffness < 0 ||
    damping < 0
  ) {
    return chain;
  }
  for (let index = 0; index < particleCount; index += 1) {
    chain.particles.push({
      position: { x: anchorPosition.x, y: anchorPosition.y - index * restLength },
      velocity: { x: 0, y: 0 },
      force: { x: 0, y: 0 },
      inverseMass: index === 0 ? 0 : 1 / mass,
      radius,
    });
    if (index > 0) {
      chain.springs.push({
        first: index - 1,
        second: index,
        restLength,
        stiffness,
        damping,
      });
    }
  }
  return chain;
}

function invalidSample(): SpringSample {
  return {
    valid: false,
    direction: { x: 1, y: 0 },
    distance: 0,
    stretch: 0,
    relativeSpeed: 0,
    forceOnFirst: { x: 0, y: 0 },
  };
}

export function sampleElasticSpring(chain: SpringChainState, spring: SpringLink): SpringSample {
  if (!validSpring(spring, chain.particles.length)) return invalidSample();
  const first = chain.particles[spring.first];
  const second = chain.particles[spring.second];
  const delta = springSubtract(second.position, first.position);
  const distance = springLength(delta);
  if (!Number.isFinite(distance) || distance <= SPRING_EPSILON) return invalidSample();
  const direction = springScale(delta, 1 / distance);
  const stretch = distance - spring.restLength;
  const relativeVelocity = springSubtract(second.velocity, first.velocity);
  const relativeSpeed = springDot(relativeVelocity, direction);
  return {
    valid: true,
    direction,
    distance,
    stretch,
    relativeSpeed,
    forceOnFirst: springScale(direction, spring.stiffness * stretch),
  };
}

export function sampleDampedSpring(chain: SpringChainState, spring: SpringLink): SpringSample {
  const sample = sampleElasticSpring(chain, spring);
  if (!sample.valid) return sample;
  const magnitude = spring.stiffness * sample.stretch + spring.damping * sample.relativeSpeed;
  return { ...sample, forceOnFirst: springScale(sample.direction, magnitude) };
}

export function accumulateSpringForces(
  chain: SpringChainState,
  gravity: SpringVec2,
  gravityEnabled: boolean,
  dampingEnabled: boolean,
) {
  for (const particle of chain.particles) particle.force = { x: 0, y: 0 };
  if (gravityEnabled && finiteVector(gravity)) {
    for (const particle of chain.particles) {
      if (particle.inverseMass <= SPRING_EPSILON) continue;
      const mass = 1 / particle.inverseMass;
      particle.force = springAdd(particle.force, springScale(gravity, mass));
    }
  }
  for (const spring of chain.springs) {
    const sample = dampingEnabled
      ? sampleDampedSpring(chain, spring)
      : sampleElasticSpring(chain, spring);
    if (!sample.valid) continue;
    const first = chain.particles[spring.first];
    const second = chain.particles[spring.second];
    first.force = springAdd(first.force, sample.forceOnFirst);
    second.force = springSubtract(second.force, sample.forceOnFirst);
  }
}

export function integrateSpringParticle(particle: SpringParticle, deltaSeconds: number) {
  if (
    !finiteParticle(particle) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0 ||
    particle.inverseMass <= SPRING_EPSILON
  ) {
    return;
  }
  const acceleration = springScale(particle.force, particle.inverseMass);
  particle.velocity = springAdd(particle.velocity, springScale(acceleration, deltaSeconds));
  particle.position = springAdd(particle.position, springScale(particle.velocity, deltaSeconds));
}

export function stepSpringChain(
  source: SpringChainState,
  settings: SpringStepSettings,
  drag?: SpringDragConstraint,
) {
  const chain = cloneSpringChain(source);
  accumulateSpringForces(chain, settings.gravity, settings.gravityEnabled, settings.dampingEnabled);
  for (let index = 0; index < chain.particles.length; index += 1) {
    if (drag?.active && index === drag.particleIndex) {
      chain.particles[index].position = { ...drag.target };
      chain.particles[index].velocity = { x: 0, y: 0 };
      continue;
    }
    integrateSpringParticle(chain.particles[index], settings.deltaSeconds);
  }
  if (chain.particles.length > 0) {
    chain.particles[0].position = { ...chain.anchorPosition };
    chain.particles[0].velocity = { x: 0, y: 0 };
  }
  return chain;
}

export function nearestDynamicSpringParticle(
  chain: SpringChainState,
  point: SpringVec2,
  maximumDistance: number,
) {
  let nearest = -1;
  let nearestDistanceSquared = maximumDistance * maximumDistance;
  for (let index = 0; index < chain.particles.length; index += 1) {
    const particle = chain.particles[index];
    if (particle.inverseMass <= SPRING_EPSILON) continue;
    const distanceSquared = springLengthSquared(springSubtract(particle.position, point));
    if (distanceSquared <= nearestDistanceSquared) {
      nearest = index;
      nearestDistanceSquared = distanceSquared;
    }
  }
  return nearest;
}

export function estimateSpringReleaseVelocity(
  previous: SpringVec2,
  target: SpringVec2,
  sampleSeconds: number,
  maximumSpeed: number,
) {
  if (sampleSeconds <= 0 || maximumSpeed < 0) return { x: 0, y: 0 };
  let velocity = springScale(springSubtract(target, previous), 1 / sampleSeconds);
  const speed = springLength(velocity);
  if (speed > maximumSpeed && speed > SPRING_EPSILON) {
    velocity = springScale(velocity, maximumSpeed / speed);
  }
  return velocity;
}

export function springStabilityIndex(stiffness: number, mass: number, deltaSeconds: number) {
  if (stiffness < 0 || mass <= 0 || deltaSeconds < 0) return Number.POSITIVE_INFINITY;
  return deltaSeconds * Math.sqrt(stiffness / mass);
}

export function measureSpringChain(
  chain: SpringChainState,
  gravity: SpringVec2,
  gravityEnabled: boolean,
): SpringMetrics {
  const metrics: SpringMetrics = {
    kineticEnergy: 0,
    springEnergy: 0,
    gravitationalEnergy: 0,
    maximumStretch: 0,
    maximumSpeed: 0,
    anchorError: 0,
    finite: chain.particles.length > 0,
  };
  for (const particle of chain.particles) {
    if (!finiteParticle(particle)) {
      metrics.finite = false;
      continue;
    }
    metrics.maximumSpeed = Math.max(metrics.maximumSpeed, springLength(particle.velocity));
    if (particle.inverseMass <= SPRING_EPSILON) continue;
    const mass = 1 / particle.inverseMass;
    metrics.kineticEnergy += 0.5 * mass * springLengthSquared(particle.velocity);
    if (gravityEnabled)
      metrics.gravitationalEnergy += -mass * springDot(gravity, particle.position);
  }
  for (const spring of chain.springs) {
    const sample = sampleElasticSpring(chain, spring);
    if (!sample.valid) {
      metrics.finite = false;
      continue;
    }
    metrics.maximumStretch = Math.max(metrics.maximumStretch, Math.abs(sample.stretch));
    metrics.springEnergy += 0.5 * spring.stiffness * sample.stretch * sample.stretch;
  }
  if (chain.particles.length > 0) {
    metrics.anchorError = springLength(
      springSubtract(chain.particles[0].position, chain.anchorPosition),
    );
  }
  metrics.finite =
    metrics.finite &&
    Number.isFinite(metrics.kineticEnergy) &&
    Number.isFinite(metrics.springEnergy) &&
    Number.isFinite(metrics.gravitationalEnergy) &&
    Number.isFinite(metrics.maximumStretch) &&
    Number.isFinite(metrics.maximumSpeed) &&
    Number.isFinite(metrics.anchorError);
  return metrics;
}

export function totalSpringMechanicalEnergy(metrics: SpringMetrics) {
  return metrics.kineticEnergy + metrics.springEnergy + metrics.gravitationalEnergy;
}

export function planSpringFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
) {
  if (
    accumulator < 0 ||
    frameSeconds < 0 ||
    fixedDeltaSeconds <= 0 ||
    maximumSteps <= 0 ||
    maximumFrameSeconds <= 0
  ) {
    return { steps: 0, remainder: 0, droppedTime: 0 };
  }
  const acceptedFrame = Math.min(frameSeconds, maximumFrameSeconds);
  let available = accumulator + acceptedFrame;
  const availableSteps = Math.floor((available + SPRING_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrame);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    available -= discardedSteps * fixedDeltaSeconds;
    droppedTime += discardedSteps * fixedDeltaSeconds;
  }
  if (available < 0 && available > -SPRING_EPSILON) available = 0;
  return { steps, remainder: available, droppedTime };
}
