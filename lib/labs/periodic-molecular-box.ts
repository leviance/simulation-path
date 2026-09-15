export interface Vec2 {
  x: number;
  y: number;
}
export interface Box {
  width: number;
  height: number;
}
export interface Particle {
  position: Vec2;
  velocity: Vec2;
  mass: number;
  unwrapped: Vec2;
}
export interface Parameters {
  epsilon: number;
  sigma: number;
  cutoff: number;
}
export interface System {
  box: Box;
  parameters: Parameters;
  particles: Particle[];
  elapsed: number;
}
export interface Evaluation {
  valid: boolean;
  forces: Vec2[];
  potential: number;
  evaluatedPairs: number;
  activePairs: number;
}

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const subtract = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, factor: number): Vec2 => ({ x: a.x * factor, y: a.y * factor });
export const length = (a: Vec2) => Math.hypot(a.x, a.y);
export const finite = (a: Vec2) => Number.isFinite(a.x) && Number.isFinite(a.y);

export function wrapCoordinate(value: number, boxLength: number) {
  if (!Number.isFinite(value) || !Number.isFinite(boxLength) || boxLength <= 0) return NaN;
  let wrapped = value - boxLength * Math.floor(value / boxLength);
  if (wrapped >= boxLength) wrapped = 0;
  return wrapped === 0 ? 0 : wrapped;
}

export function wrapPosition(position: Vec2, box: Box): Vec2 {
  return { x: wrapCoordinate(position.x, box.width), y: wrapCoordinate(position.y, box.height) };
}

export function minimumComponent(delta: number, boxLength: number) {
  return wrapCoordinate(delta + 0.5 * boxLength, boxLength) - 0.5 * boxLength;
}

export function minimumImage(delta: Vec2, box: Box): Vec2 {
  return { x: minimumComponent(delta.x, box.width), y: minimumComponent(delta.y, box.height) };
}

export function imagePositions(position: Vec2, box: Box): Vec2[] {
  const images: Vec2[] = [];
  for (let imageY = -1; imageY <= 1; imageY += 1) {
    for (let imageX = -1; imageX <= 1; imageX += 1) {
      images.push({ x: position.x + imageX * box.width, y: position.y + imageY * box.height });
    }
  }
  return images;
}

export function validParameters(parameters: Parameters, box: Box) {
  return (
    [box.width, box.height, parameters.epsilon, parameters.sigma, parameters.cutoff].every(
      Number.isFinite,
    ) &&
    box.width > 0 &&
    box.height > 0 &&
    parameters.epsilon > 0 &&
    parameters.sigma > 0 &&
    parameters.cutoff > parameters.sigma &&
    parameters.cutoff < 0.5 * Math.min(box.width, box.height)
  );
}

export function rawPair(distance: number, parameters: Parameters) {
  const ratio6 = (parameters.sigma / distance) ** 6;
  const ratio12 = ratio6 * ratio6;
  return {
    potential: 4 * parameters.epsilon * (ratio12 - ratio6),
    slope: (24 * parameters.epsilon * (ratio6 - 2 * ratio12)) / distance,
  };
}

export function shiftedPair(distance: number, parameters: Parameters) {
  if (distance >= parameters.cutoff) return { potential: 0, slope: 0 };
  const current = rawPair(distance, parameters);
  const edge = rawPair(parameters.cutoff, parameters);
  return {
    potential: current.potential - edge.potential - (distance - parameters.cutoff) * edge.slope,
    slope: current.slope - edge.slope,
  };
}

export function evaluate(system: System): Evaluation {
  const result: Evaluation = {
    valid: false,
    forces: system.particles.map(() => ({ x: 0, y: 0 })),
    potential: 0,
    evaluatedPairs: 0,
    activePairs: 0,
  };
  if (!validParameters(system.parameters, system.box)) return result;
  if (
    system.particles.some(
      (p) => !finite(p.position) || !finite(p.velocity) || !Number.isFinite(p.mass) || p.mass <= 0,
    )
  )
    return result;
  for (let i = 0; i < system.particles.length; i += 1) {
    for (let j = i + 1; j < system.particles.length; j += 1) {
      result.evaluatedPairs += 1;
      const delta = minimumImage(
        subtract(system.particles[j].position, system.particles[i].position),
        system.box,
      );
      const distance = length(delta);
      if (!Number.isFinite(distance) || distance < 1e-6) return result;
      if (distance >= system.parameters.cutoff) continue;
      result.activePairs += 1;
      const sample = shiftedPair(distance, system.parameters);
      const force = scale(delta, sample.slope / distance);
      if (!finite(force) || !Number.isFinite(sample.potential)) return result;
      result.forces[i] = add(result.forces[i], force);
      result.forces[j] = subtract(result.forces[j], force);
      result.potential += sample.potential;
    }
  }
  result.valid = Number.isFinite(result.potential) && result.forces.every(finite);
  return result;
}

export function makePair(): System {
  const a = {
    position: { x: 0.6, y: 6 },
    velocity: { x: -0.3, y: 0.12 },
    mass: 1,
    unwrapped: { x: 0.6, y: 6 },
  };
  const b = {
    position: { x: 11.4, y: 6 },
    velocity: { x: 0.3, y: -0.12 },
    mass: 1,
    unwrapped: { x: 11.4, y: 6 },
  };
  return {
    box: { width: 12, height: 12 },
    parameters: { epsilon: 1, sigma: 1, cutoff: 2.5 },
    particles: [a, b],
    elapsed: 0,
  };
}

export function makeGas(count: number, seed = 43): System {
  if (!Number.isInteger(count) || count < 4 || count > 1000)
    throw new RangeError("Particle count must be 4–1000.");
  const system = makePair();
  system.particles = [];
  const columns = Math.ceil(Math.sqrt(count));
  const side = Math.max(12, 1.6 * columns);
  system.box = { width: side, height: side };
  let meanVelocity = { x: 0, y: 0 };
  for (let index = 0; index < count; index += 1) {
    const position = {
      x: (((index % columns) + 0.5) * side) / columns,
      y: ((Math.floor(index / columns) + 0.5) * side) / columns,
    };
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const vx = (seed / 4294967296 - 0.5) * 0.8;
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const velocity = { x: vx, y: (seed / 4294967296 - 0.5) * 0.8 };
    meanVelocity = add(meanVelocity, velocity);
    system.particles.push({ position, velocity, mass: 1, unwrapped: { ...position } });
  }
  meanVelocity = scale(meanVelocity, 1 / count);
  for (const particle of system.particles)
    particle.velocity = subtract(particle.velocity, meanVelocity);
  return system;
}

export function makeFreeParticle(): System {
  const system = makePair();
  system.particles.length = 1;
  system.particles[0].velocity = { x: -8, y: 5 };
  return system;
}

export function ballisticStep(particle: Particle, box: Box, dt: number) {
  const displacement = scale(particle.velocity, dt);
  particle.position = wrapPosition(add(particle.position, displacement), box);
  particle.unwrapped = add(particle.unwrapped, displacement);
}

export function verletStep(system: System, dt: number): boolean {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.02) return false;
  const before = evaluate(system);
  if (!before.valid) return false;
  const candidate: System = {
    ...system,
    particles: system.particles.map((p) => ({
      ...p,
      position: { ...p.position },
      velocity: { ...p.velocity },
      unwrapped: { ...p.unwrapped },
    })),
  };
  for (let i = 0; i < candidate.particles.length; i += 1) {
    const particle = candidate.particles[i];
    particle.velocity = add(particle.velocity, scale(before.forces[i], (0.5 * dt) / particle.mass));
    const displacement = scale(particle.velocity, dt);
    particle.position = wrapPosition(add(particle.position, displacement), candidate.box);
    particle.unwrapped = add(particle.unwrapped, displacement);
    if (!finite(particle.unwrapped)) return false;
  }
  const after = evaluate(candidate);
  if (!after.valid) return false;
  for (let i = 0; i < candidate.particles.length; i += 1) {
    const particle = candidate.particles[i];
    particle.velocity = add(particle.velocity, scale(after.forces[i], (0.5 * dt) / particle.mass));
    if (!finite(particle.velocity)) return false;
  }
  candidate.elapsed += dt;
  if (!Number.isFinite(candidate.elapsed)) return false;
  Object.assign(system, candidate);
  return true;
}

export function kineticEnergy(system: System) {
  return system.particles.reduce(
    (sum, p) => sum + 0.5 * p.mass * (p.velocity.x ** 2 + p.velocity.y ** 2),
    0,
  );
}

export function momentum(system: System) {
  return system.particles.reduce((sum, p) => add(sum, scale(p.velocity, p.mass)), { x: 0, y: 0 });
}

export function validateRun() {
  const system = makeGas(36);
  const initialEnergy = kineticEnergy(system) + evaluate(system).potential;
  const initialMomentum = momentum(system);
  let maximumEnergyError = 0;
  let momentumError = 0;
  for (let step = 0; step < 400; step += 1) {
    if (!verletStep(system, 0.001))
      return { passed: false, maximumEnergyError: Infinity, momentumError: Infinity };
    const energy = kineticEnergy(system) + evaluate(system).potential;
    maximumEnergyError = Math.max(
      maximumEnergyError,
      Math.abs(energy - initialEnergy) / Math.max(1, Math.abs(initialEnergy)),
    );
    momentumError = Math.max(momentumError, length(subtract(momentum(system), initialMomentum)));
  }
  return {
    passed: maximumEnergyError < 0.01 && momentumError < 1e-9,
    maximumEnergyError,
    momentumError,
  };
}

export function fixedStepPlan(
  accumulator: number,
  frameTime: number,
  dt: number,
  maximumSteps: number,
) {
  if (
    ![accumulator, frameTime, dt, maximumSteps].every(Number.isFinite) ||
    dt <= 0 ||
    !Number.isInteger(maximumSteps) ||
    maximumSteps < 1 ||
    maximumSteps > 8
  ) {
    throw new RangeError(
      "Fixed-step inputs must be finite, dt positive and the step budget between 1 and 8.",
    );
  }
  const available = Math.max(0, accumulator) + Math.min(Math.max(0, frameTime), 0.1) * 0.1;
  const steps = Math.min(Math.floor(available / dt), maximumSteps);
  const remaining = Math.max(0, available - steps * dt);
  const remainder = remaining % dt;
  return {
    steps,
    remainder,
    droppedTime: Math.max(0, frameTime - 0.1) * 0.1 + remaining - remainder,
  };
}
