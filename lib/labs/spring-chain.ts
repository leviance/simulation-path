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
  grabOffset?: SpringVec2;
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
  return Math.hypot(value.x, value.y);
}

export function finiteSpringVector(value: SpringVec2) {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

export function finiteSpringParticle(particle: SpringParticle) {
  return (
    finiteSpringVector(particle.position) &&
    finiteSpringVector(particle.velocity) &&
    finiteSpringVector(particle.force) &&
    Number.isFinite(particle.inverseMass) &&
    Number.isFinite(particle.radius) &&
    particle.inverseMass >= 0 &&
    particle.radius > 0
  );
}

function validSpring(spring: SpringLink, particleCount: number) {
  return (
    Number.isInteger(spring.first) &&
    Number.isInteger(spring.second) &&
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
    !Number.isInteger(particleCount) ||
    particleCount < 2 ||
    particleCount > 100 ||
    ![restLength, mass, radius, stiffness, damping, 1 / mass].every(Number.isFinite) ||
    !finiteSpringVector(anchorPosition) ||
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
  return validSpringChain(chain)
    ? chain
    : { particles: [], springs: [], anchorPosition: { ...anchorPosition } };
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
  if (!finiteSpringParticle(first) || !finiteSpringParticle(second)) return invalidSample();
  const delta = springSubtract(second.position, first.position);
  const distance = springLength(delta);
  if (!Number.isFinite(distance) || distance <= SPRING_EPSILON) return invalidSample();
  const direction = springScale(delta, 1 / distance);
  const stretch = distance - spring.restLength;
  const relativeVelocity = springSubtract(second.velocity, first.velocity);
  const relativeSpeed = springDot(relativeVelocity, direction);
  const force = springScale(direction, spring.stiffness * stretch);
  if (!finiteSpringVector(force) || !Number.isFinite(relativeSpeed)) return invalidSample();
  return {
    valid: true,
    direction,
    distance,
    stretch,
    relativeSpeed,
    forceOnFirst: force,
  };
}

export function sampleDampedSpring(chain: SpringChainState, spring: SpringLink): SpringSample {
  const sample = sampleElasticSpring(chain, spring);
  if (!sample.valid) return sample;
  const magnitude = spring.stiffness * sample.stretch + spring.damping * sample.relativeSpeed;
  const forceOnFirst = springScale(sample.direction, magnitude);
  return { ...sample, valid: finiteSpringVector(forceOnFirst), forceOnFirst };
}

export function validSpringChain(chain: SpringChainState) {
  return (
    chain.particles.length >= 2 &&
    chain.particles.length <= 100 &&
    chain.springs.length + 1 === chain.particles.length &&
    finiteSpringVector(chain.anchorPosition) &&
    chain.particles.every(finiteSpringParticle) &&
    chain.springs.every(
      (spring, index) =>
        validSpring(spring, chain.particles.length) &&
        spring.first === index &&
        spring.second === index + 1,
    )
  );
}
export function accumulateSpringForces(
  chain: SpringChainState,
  gravity: SpringVec2,
  gravityEnabled: boolean,
  dampingEnabled: boolean,
) {
  if (!validSpringChain(chain) || !finiteSpringVector(gravity)) return false;
  for (const spring of chain.springs) {
    const sample = dampingEnabled
      ? sampleDampedSpring(chain, spring)
      : sampleElasticSpring(chain, spring);
    if (!sample.valid) return false;
  }
  for (const particle of chain.particles) particle.force = { x: 0, y: 0 };
  if (gravityEnabled)
    for (const particle of chain.particles) {
      if (particle.inverseMass === 0) continue;
      particle.force = springScale(gravity, 1 / particle.inverseMass);
    }
  for (const spring of chain.springs) {
    const sample = dampingEnabled
      ? sampleDampedSpring(chain, spring)
      : sampleElasticSpring(chain, spring);
    const first = chain.particles[spring.first],
      second = chain.particles[spring.second];
    first.force = springAdd(first.force, sample.forceOnFirst);
    second.force = springSubtract(second.force, sample.forceOnFirst);
  }
  return validSpringChain(chain);
}
export function integrateSpringParticle(particle: SpringParticle, deltaSeconds: number) {
  if (!finiteSpringParticle(particle) || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0)
    return false;
  if (particle.inverseMass === 0) return true;
  const acceleration = springScale(particle.force, particle.inverseMass);
  const nextVelocity = springAdd(particle.velocity, springScale(acceleration, deltaSeconds));
  const nextPosition = springAdd(particle.position, springScale(nextVelocity, deltaSeconds));
  if (!finiteSpringVector(nextVelocity) || !finiteSpringVector(nextPosition)) return false;
  particle.velocity = nextVelocity;
  particle.position = nextPosition;
  return true;
}
export function trySpringStep(
  source: SpringChainState,
  settings: SpringStepSettings,
  drag?: SpringDragConstraint,
) {
  const fail = () => ({ chain: source, accepted: false });
  if (
    !validSpringChain(source) ||
    !Number.isFinite(settings.deltaSeconds) ||
    settings.deltaSeconds <= 0 ||
    settings.deltaSeconds > 0.1 ||
    !finiteSpringVector(settings.gravity)
  )
    return fail();
  if (
    drag?.active &&
    (!Number.isInteger(drag.particleIndex) ||
      drag.particleIndex < 1 ||
      drag.particleIndex >= source.particles.length ||
      !finiteSpringVector(drag.target))
  )
    return fail();
  const chain = cloneSpringChain(source);
  if (drag?.active) {
    chain.particles[drag.particleIndex].position = { ...drag.target };
    chain.particles[drag.particleIndex].velocity = { x: 0, y: 0 };
  }
  if (
    !accumulateSpringForces(
      chain,
      settings.gravity,
      settings.gravityEnabled,
      settings.dampingEnabled,
    )
  )
    return fail();
  for (let i = 0; i < chain.particles.length; i++) {
    if (drag?.active && i === drag.particleIndex) continue;
    if (!integrateSpringParticle(chain.particles[i], settings.deltaSeconds)) return fail();
  }
  chain.particles[0].position = { ...chain.anchorPosition };
  chain.particles[0].velocity = { x: 0, y: 0 };
  return { chain, accepted: true };
}
export function stepSpringChain(
  source: SpringChainState,
  settings: SpringStepSettings,
  drag?: SpringDragConstraint,
) {
  return trySpringStep(source, settings, drag).chain;
}

export function nearestDynamicSpringParticle(
  chain: SpringChainState,
  point: SpringVec2,
  maximumDistance: number,
) {
  if (
    !validSpringChain(chain) ||
    !finiteSpringVector(point) ||
    !Number.isFinite(maximumDistance) ||
    maximumDistance < 0
  )
    return -1;
  let nearest = -1;
  let nearestDistanceSquared = maximumDistance * maximumDistance;
  for (let index = 0; index < chain.particles.length; index += 1) {
    const particle = chain.particles[index];
    if (particle.inverseMass === 0) continue;
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
  if (
    !finiteSpringVector(previous) ||
    !finiteSpringVector(target) ||
    !Number.isFinite(sampleSeconds) ||
    sampleSeconds <= 0 ||
    !Number.isFinite(maximumSpeed) ||
    maximumSpeed < 0
  )
    return { x: 0, y: 0 };
  let velocity = springScale(springSubtract(target, previous), 1 / sampleSeconds);
  const speed = springLength(velocity);
  if (!finiteSpringVector(velocity) || !Number.isFinite(speed)) return { x: 0, y: 0 };
  if (speed > maximumSpeed && speed > SPRING_EPSILON) {
    velocity = springScale(velocity, maximumSpeed / speed);
  }
  return velocity;
}

export function springStabilityIndex(stiffness: number, mass: number, deltaSeconds: number) {
  if (
    ![stiffness, mass, deltaSeconds].every(Number.isFinite) ||
    stiffness < 0 ||
    mass <= 0 ||
    deltaSeconds < 0
  )
    return Infinity;
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
    finite: validSpringChain(chain) && finiteSpringVector(gravity),
  };
  if (!metrics.finite) return metrics;
  for (const particle of chain.particles) {
    if (!finiteSpringParticle(particle)) {
      metrics.finite = false;
      continue;
    }
    metrics.maximumSpeed = Math.max(metrics.maximumSpeed, springLength(particle.velocity));
    if (particle.inverseMass === 0) continue;
    const mass = 1 / particle.inverseMass;
    metrics.kineticEnergy += 0.5 * mass * springLengthSquared(particle.velocity);
    if (gravityEnabled)
      metrics.gravitationalEnergy +=
        -mass * springDot(gravity, springSubtract(particle.position, chain.anchorPosition));
  }
  for (const spring of chain.springs) {
    const distance = springLength(
      springSubtract(
        chain.particles[spring.second].position,
        chain.particles[spring.first].position,
      ),
    );
    const stretch = distance - spring.restLength;
    metrics.maximumStretch = Math.max(metrics.maximumStretch, Math.abs(stretch));
    metrics.springEnergy += 0.5 * spring.stiffness * stretch * stretch;
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
    ![accumulator, frameSeconds, fixedDeltaSeconds, maximumSteps, maximumFrameSeconds].every(
      Number.isFinite,
    ) ||
    accumulator < 0 ||
    accumulator > 1 ||
    frameSeconds < 0 ||
    fixedDeltaSeconds < 1e-6 ||
    fixedDeltaSeconds > 1 ||
    !Number.isInteger(maximumSteps) ||
    maximumSteps < 1 ||
    maximumSteps > 256 ||
    maximumFrameSeconds <= 0 ||
    maximumFrameSeconds > 1
  )
    return { steps: 0, remainder: 0, droppedTime: 0 };
  const acceptedFrame = Math.min(frameSeconds, maximumFrameSeconds);
  const available = accumulator + acceptedFrame;
  const availableSteps = Math.floor((available + SPRING_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  const remainder = Math.max(0, available - availableSteps * fixedDeltaSeconds);
  const droppedTime =
    frameSeconds - acceptedFrame + Math.max(0, availableSteps - steps) * fixedDeltaSeconds;
  return { steps, remainder, droppedTime };
}
