export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  mass: number;
}

export interface SimulationBox {
  width: number;
  height: number;
}

export interface MolecularParameters {
  epsilon: number;
  sigma: number;
  cutoff: number;
}

export interface PairSample {
  valid: boolean;
  active: boolean;
  potential: number;
  potentialSlope: number;
}

export interface ForceEvaluation {
  valid: boolean;
  forces: Vec2[];
  potentialEnergy: number;
  evaluatedPairs: number;
  activePairs: number;
  minimumDistance: number;
}

export interface SystemMetrics {
  valid: boolean;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  temperature: number;
  momentum: Vec2;
  minimumDistance: number;
  evaluatedPairs: number;
  activePairs: number;
}

export interface MolecularSystem {
  particles: Particle[];
  box: SimulationBox;
  parameters: MolecularParameters;
  elapsed: number;
  stepCount: number;
  initialEnergy: number;
  wallCollisions: number;
}

export interface MolecularStepOutput {
  evaluation?: ForceEvaluation;
}

export interface FixedStepPlan {
  steps: number;
  remainder: number;
  droppedTime: number;
}

export interface WorkEstimate {
  particleCount: number;
  evaluatedPairs: number;
  relativeToThousand: number;
}

export interface ValidationReport {
  deterministicInitialization: boolean;
  particlesInsideBox: boolean;
  momentumRemoved: boolean;
  exactPairCount: boolean;
  forceSumZero: boolean;
  cutoffContinuous: boolean;
  wallReflection: boolean;
  finiteRun: boolean;
  energyStable: boolean;
  maximumEnergyDrift: number;
  wallEnergyDrift: number;
  wallEvents: number;
  passed: boolean;
}

export const DEFAULT_PARAMETERS: MolecularParameters = {
  epsilon: 1,
  sigma: 1,
  cutoff: 2.5,
};

export const MINIMUM_DISTANCE = 1e-6;
export const DEFAULT_DENSITY = 0.7;

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(value: Vec2, factor: number): Vec2 {
  return { x: value.x * factor, y: value.y * factor };
}

export function lengthSquared(value: Vec2): number {
  return value.x * value.x + value.y * value.y;
}

export function length(value: Vec2): number {
  return Math.sqrt(lengthSquared(value));
}

export function isFiniteVector(value: Vec2): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

export function unorderedPairCount(particleCount: number): number {
  if (!Number.isInteger(particleCount) || particleCount < 0) {
    return 0;
  }

  return (particleCount * (particleCount - 1)) / 2;
}

export function validMolecularParameters(parameters: MolecularParameters): boolean {
  return (
    Number.isFinite(parameters.epsilon) &&
    Number.isFinite(parameters.sigma) &&
    Number.isFinite(parameters.cutoff) &&
    parameters.epsilon > 0 &&
    parameters.sigma > MINIMUM_DISTANCE &&
    parameters.cutoff > parameters.sigma
  );
}

export function makeBoxForDensity(
  particleCount: number,
  density = DEFAULT_DENSITY,
  aspectRatio = 16 / 9,
): SimulationBox {
  if (particleCount < 1 || density <= 0 || aspectRatio <= 0) {
    return { width: Number.NaN, height: Number.NaN };
  }

  const area = particleCount / density;
  const width = Math.sqrt(area * aspectRatio);
  return { width, height: area / width };
}

function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createLatticeParticles(
  particleCount: number,
  box: SimulationBox,
  seed = 42,
): Particle[] {
  if (
    !Number.isInteger(particleCount) ||
    particleCount < 1 ||
    !Number.isFinite(box.width) ||
    !Number.isFinite(box.height) ||
    box.width <= 0 ||
    box.height <= 0
  ) {
    return [];
  }

  const columns = Math.ceil(Math.sqrt((particleCount * box.width) / box.height));
  const rows = Math.ceil(particleCount / columns);
  const cellWidth = box.width / columns;
  const cellHeight = box.height / rows;
  const jitterLimit = 0.08 * Math.min(cellWidth, cellHeight);
  const random = makeRandom(seed);
  const particles: Particle[] = [];

  for (let index = 0; index < particleCount; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const jitterX = (random() * 2 - 1) * jitterLimit;
    const jitterY = (random() * 2 - 1) * jitterLimit;
    particles.push({
      position: {
        x: (column + 0.5) * cellWidth + jitterX,
        y: (row + 0.5) * cellHeight + jitterY,
      },
      velocity: { x: 0, y: 0 },
      mass: 1,
    });
  }

  return particles;
}

export function kineticEnergy(particles: readonly Particle[]): number {
  let energy = 0;
  for (const particle of particles) {
    energy += 0.5 * particle.mass * lengthSquared(particle.velocity);
  }
  return energy;
}

export function linearMomentum(particles: readonly Particle[]): Vec2 {
  let momentum = { x: 0, y: 0 };
  for (const particle of particles) {
    momentum = add(momentum, scale(particle.velocity, particle.mass));
  }
  return momentum;
}

export function temperature(particles: readonly Particle[]): number {
  if (particles.length < 2) return 0;
  const totalMass = particles.reduce((sum, particle) => sum + particle.mass, 0);
  const centerVelocity = scale(linearMomentum(particles), 1 / totalMass);
  let thermalEnergy = 0;
  for (const particle of particles) {
    const relativeVelocity = subtract(particle.velocity, centerVelocity);
    thermalEnergy += 0.5 * particle.mass * lengthSquared(relativeVelocity);
  }
  return (2 * thermalEnergy) / (2 * particles.length - 2);
}

export function assignThermalVelocities(
  particles: readonly Particle[],
  targetTemperature: number,
  seed = 7,
): Particle[] {
  if (particles.length < 2 || !Number.isFinite(targetTemperature) || targetTemperature <= 0) {
    return particles.map((particle) => ({
      ...particle,
      position: { ...particle.position },
      velocity: { x: 0, y: 0 },
    }));
  }

  const random = makeRandom(seed);
  const velocities = particles.map(() => ({
    x: random() * 2 - 1,
    y: random() * 2 - 1,
  }));
  let weightedVelocity = { x: 0, y: 0 };
  let totalMass = 0;
  for (let index = 0; index < particles.length; index += 1) {
    const mass = particles[index].mass;
    if (!Number.isFinite(mass) || mass <= 0) return [];
    weightedVelocity = add(weightedVelocity, scale(velocities[index], mass));
    totalMass += mass;
  }
  const mean = scale(weightedVelocity, 1 / totalMass);

  const centered = velocities.map((velocity) => subtract(velocity, mean));
  const unscaledEnergy = centered.reduce(
    (sum, velocity, index) => sum + 0.5 * particles[index].mass * lengthSquared(velocity),
    0,
  );
  const degreesOfFreedom = 2 * particles.length - 2;
  const targetEnergy = 0.5 * degreesOfFreedom * targetTemperature;
  const velocityScale = Math.sqrt(targetEnergy / unscaledEnergy);

  return particles.map((particle, index) => ({
    ...particle,
    position: { ...particle.position },
    velocity: scale(centered[index], velocityScale),
  }));
}

export function rawLennardJones(distance: number, parameters: MolecularParameters) {
  const ratio = parameters.sigma / distance;
  const ratio2 = ratio * ratio;
  const ratio6 = ratio2 * ratio2 * ratio2;
  const ratio12 = ratio6 * ratio6;
  return {
    potential: 4 * parameters.epsilon * (ratio12 - ratio6),
    potentialSlope: (24 * parameters.epsilon * (ratio6 - 2 * ratio12)) / distance,
  };
}

export function forceShiftedEquilibrium(parameters = DEFAULT_PARAMETERS): number {
  let lower = parameters.sigma;
  let upper = Math.min(1.5 * parameters.sigma, parameters.cutoff - 1e-6);
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const middle = (lower + upper) / 2;
    if (sampleForceShiftedPair(middle, parameters).potentialSlope < 0) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

export function sampleForceShiftedPair(
  distance: number,
  parameters: MolecularParameters = DEFAULT_PARAMETERS,
): PairSample {
  if (
    !validMolecularParameters(parameters) ||
    !Number.isFinite(distance) ||
    distance <= MINIMUM_DISTANCE
  ) {
    return { valid: false, active: false, potential: 0, potentialSlope: 0 };
  }

  if (distance >= parameters.cutoff) {
    return { valid: true, active: false, potential: 0, potentialSlope: 0 };
  }

  const sample = rawLennardJones(distance, parameters);
  const atCutoff = rawLennardJones(parameters.cutoff, parameters);
  return {
    valid: true,
    active: true,
    potential:
      sample.potential -
      atCutoff.potential -
      (distance - parameters.cutoff) * atCutoff.potentialSlope,
    potentialSlope: sample.potentialSlope - atCutoff.potentialSlope,
  };
}

export function accumulatePairForces(
  particles: readonly Particle[],
  parameters: MolecularParameters = DEFAULT_PARAMETERS,
): ForceEvaluation {
  const forces = particles.map(() => ({ x: 0, y: 0 }));
  let potentialEnergy = 0;
  let evaluatedPairs = 0;
  let activePairs = 0;
  let minimumDistance = Number.POSITIVE_INFINITY;

  const validInput =
    validMolecularParameters(parameters) &&
    particles.every(
      (particle) =>
        isFiniteVector(particle.position) &&
        isFiniteVector(particle.velocity) &&
        Number.isFinite(particle.mass) &&
        particle.mass > 0,
    );
  if (!validInput) {
    return {
      valid: false,
      forces,
      potentialEnergy,
      evaluatedPairs,
      activePairs,
      minimumDistance,
    };
  }

  for (let first = 0; first < particles.length; first += 1) {
    for (let second = first + 1; second < particles.length; second += 1) {
      evaluatedPairs += 1;
      const delta = subtract(particles[second].position, particles[first].position);
      const distance = length(delta);
      minimumDistance = Math.min(minimumDistance, distance);
      const sample = sampleForceShiftedPair(distance, parameters);
      if (!sample.valid) {
        return {
          valid: false,
          forces,
          potentialEnergy,
          evaluatedPairs,
          activePairs,
          minimumDistance,
        };
      }
      if (!sample.active) {
        continue;
      }

      activePairs += 1;
      potentialEnergy += sample.potential;
      const forceOnFirst = scale(delta, sample.potentialSlope / distance);
      forces[first] = add(forces[first], forceOnFirst);
      forces[second] = subtract(forces[second], forceOnFirst);
    }
  }

  return {
    valid: forces.every(isFiniteVector) && Number.isFinite(potentialEnergy),
    forces,
    potentialEnergy,
    evaluatedPairs,
    activePairs,
    minimumDistance,
  };
}

export function reflectCoordinate(
  position: number,
  velocity: number,
  limit: number,
): { valid: boolean; position: number; velocity: number } {
  if (
    !Number.isFinite(position) ||
    !Number.isFinite(velocity) ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return { valid: false, position, velocity };
  }

  let reflectedPosition = position;
  let reflectedVelocity = velocity;
  for (let bounce = 0; bounce < 8; bounce += 1) {
    if (reflectedPosition < 0) {
      reflectedPosition = -reflectedPosition;
      reflectedVelocity = -reflectedVelocity;
      continue;
    }
    if (reflectedPosition > limit) {
      reflectedPosition = 2 * limit - reflectedPosition;
      reflectedVelocity = -reflectedVelocity;
      continue;
    }
    return { valid: true, position: reflectedPosition, velocity: reflectedVelocity };
  }

  return { valid: false, position: reflectedPosition, velocity: reflectedVelocity };
}

export function measureSystem(
  system: MolecularSystem,
  evaluation = accumulatePairForces(system.particles, system.parameters),
): SystemMetrics {
  const kinetic = kineticEnergy(system.particles);
  const total = kinetic + evaluation.potentialEnergy;
  const momentum = linearMomentum(system.particles);
  return {
    valid:
      evaluation.valid &&
      Number.isFinite(kinetic) &&
      Number.isFinite(total) &&
      isFiniteVector(momentum),
    kineticEnergy: kinetic,
    potentialEnergy: evaluation.potentialEnergy,
    totalEnergy: total,
    temperature: temperature(system.particles),
    momentum,
    minimumDistance: evaluation.minimumDistance,
    evaluatedPairs: evaluation.evaluatedPairs,
    activePairs: evaluation.activePairs,
  };
}

export function createMolecularSystem(
  particleCount: number,
  targetTemperature = 0.35,
  seed = 42,
  density = DEFAULT_DENSITY,
): MolecularSystem {
  const box = makeBoxForDensity(particleCount, density);
  const lattice = createLatticeParticles(particleCount, box, seed);
  const particles = assignThermalVelocities(lattice, targetTemperature, seed + 1);
  const system: MolecularSystem = {
    particles,
    box,
    parameters: { ...DEFAULT_PARAMETERS },
    elapsed: 0,
    stepCount: 0,
    initialEnergy: 0,
    wallCollisions: 0,
  };
  system.initialEnergy = measureSystem(system).totalEnergy;
  return system;
}

export function velocityVerletStep(
  system: MolecularSystem,
  dt: number,
  output?: MolecularStepOutput,
): boolean {
  if (output) output.evaluation = undefined;
  const validBox =
    Number.isFinite(system.box.width) &&
    Number.isFinite(system.box.height) &&
    system.box.width > 0 &&
    system.box.height > 0;
  if (!Number.isFinite(dt) || dt <= 0 || !validBox || system.particles.length === 0) {
    return false;
  }

  const firstEvaluation = accumulatePairForces(system.particles, system.parameters);
  if (!firstEvaluation.valid) {
    return false;
  }

  let wallCollisions = 0;
  const candidate = system.particles.map((particle, index) => {
    const halfVelocity = add(
      particle.velocity,
      scale(firstEvaluation.forces[index], (0.5 * dt) / particle.mass),
    );
    const nextPosition = add(particle.position, scale(halfVelocity, dt));
    if (nextPosition.x < 0 || nextPosition.x > system.box.width) wallCollisions += 1;
    if (nextPosition.y < 0 || nextPosition.y > system.box.height) wallCollisions += 1;
    const reflectedX = reflectCoordinate(nextPosition.x, halfVelocity.x, system.box.width);
    const reflectedY = reflectCoordinate(nextPosition.y, halfVelocity.y, system.box.height);
    return {
      position: { x: reflectedX.position, y: reflectedY.position },
      velocity: { x: reflectedX.velocity, y: reflectedY.velocity },
      mass: particle.mass,
      valid: reflectedX.valid && reflectedY.valid,
    };
  });
  if (candidate.some((particle) => !particle.valid)) {
    return false;
  }

  const drifted = candidate.map(({ position, velocity, mass }) => ({ position, velocity, mass }));
  const secondEvaluation = accumulatePairForces(drifted, system.parameters);
  if (!secondEvaluation.valid) {
    return false;
  }

  const completed = drifted.map((particle, index) => ({
    ...particle,
    velocity: add(
      particle.velocity,
      scale(secondEvaluation.forces[index], (0.5 * dt) / particle.mass),
    ),
  }));
  if (completed.some((particle) => !isFiniteVector(particle.velocity))) {
    return false;
  }

  system.particles = completed;
  system.elapsed += dt;
  system.stepCount += 1;
  system.wallCollisions += wallCollisions;
  if (output) output.evaluation = secondEvaluation;
  return true;
}

// A finite trajectory report checks every step, not only its final sample.
export function measureMolecularRun(system: MolecularSystem, dt: number, steps: number) {
  const initial = measureSystem(system);
  let maximumEnergyDrift = 0;
  if (!Number.isInteger(steps) || steps < 1 || steps > 2_000 || system.particles.length > 144) {
    return { valid: false, maximumEnergyDrift: Number.NaN };
  }
  const output: MolecularStepOutput = {};
  for (let step = 0; step < steps; step += 1) {
    if (!velocityVerletStep(system, dt, output)) return { valid: false, maximumEnergyDrift };
    const metrics = measureSystem(system, output.evaluation);
    if (!metrics.valid) return { valid: false, maximumEnergyDrift };
    maximumEnergyDrift = Math.max(
      maximumEnergyDrift,
      Math.abs(relativeEnergyDrift(metrics.totalEnergy, initial.totalEnergy)),
    );
  }
  return { valid: initial.valid, maximumEnergyDrift };
}

export function makeWallExperiment(): MolecularSystem {
  const system = createMolecularSystem(2, 0.2, 42, 0.02);
  system.particles[0].position = { x: 0.02, y: 1 };
  system.particles[1].position = { x: 1.52, y: 1 };
  system.particles[0].velocity = { x: -1, y: 0 };
  system.particles[1].velocity = { x: 0, y: 0 };
  system.initialEnergy = measureSystem(system).totalEnergy;
  return system;
}

export function planFixedSteps(
  accumulator: number,
  frameTime: number,
  fixedDt: number,
  maximumSteps: number,
  maximumFrameTime: number,
): FixedStepPlan {
  if (
    !Number.isFinite(accumulator) ||
    !Number.isFinite(frameTime) ||
    !Number.isFinite(fixedDt) ||
    !Number.isFinite(maximumFrameTime) ||
    !Number.isSafeInteger(maximumSteps) ||
    accumulator < 0 ||
    fixedDt <= 0 ||
    maximumSteps < 0 ||
    maximumFrameTime < 0
  ) {
    return { steps: 0, remainder: 0, droppedTime: 0 };
  }
  const acceptedFrameTime = Math.min(Math.max(frameTime, 0), maximumFrameTime);
  const availableTime = accumulator + acceptedFrameTime;
  const tolerance = fixedDt * 1e-9;
  const availableSteps = Math.floor((availableTime + tolerance) / fixedDt);
  const steps = Math.min(availableSteps, maximumSteps);
  let remainder = availableTime - steps * fixedDt;
  if (remainder < 0 && remainder > -tolerance) {
    remainder = 0;
  }

  let droppedTime = Math.max(0, frameTime - acceptedFrameTime);
  if (availableSteps > maximumSteps) {
    const skippedSteps = Math.floor((remainder + tolerance) / fixedDt);
    droppedTime += skippedSteps * fixedDt;
    remainder -= skippedSteps * fixedDt;
    if (remainder < 0 && remainder > -tolerance) {
      remainder = 0;
    }
  }
  return { steps, remainder, droppedTime };
}

export function relativeEnergyDrift(currentEnergy: number, initialEnergy: number): number {
  return (currentEnergy - initialEnergy) / Math.max(Math.abs(initialEnergy), 1e-12);
}

export function estimateAllPairsWork(particleCount: number): WorkEstimate {
  const evaluatedPairs = unorderedPairCount(particleCount);
  return {
    particleCount,
    evaluatedPairs,
    relativeToThousand: evaluatedPairs / unorderedPairCount(1_000),
  };
}

export function runBoundedSimulation(
  system: MolecularSystem,
  duration: number,
  dt: number,
  maximumSteps: number,
): boolean {
  if (
    !Number.isFinite(duration) ||
    !Number.isFinite(dt) ||
    !Number.isSafeInteger(maximumSteps) ||
    duration < 0 ||
    dt <= 0 ||
    maximumSteps < 0
  ) {
    return false;
  }
  const requestedSteps = Math.ceil(duration / dt);
  if (!Number.isSafeInteger(requestedSteps) || requestedSteps > maximumSteps) {
    return false;
  }
  for (let step = 0; step < requestedSteps; step += 1) {
    if (!velocityVerletStep(system, dt)) {
      return false;
    }
  }
  return true;
}

export function validateMolecularDynamics(): ValidationReport {
  const first = createMolecularSystem(36, 0.2, 123, 0.55);
  const second = createMolecularSystem(36, 0.2, 123, 0.55);
  const deterministicInitialization =
    JSON.stringify(first.particles) === JSON.stringify(second.particles);
  const particlesInsideBox = first.particles.every(
    (particle) =>
      particle.position.x >= 0 &&
      particle.position.x <= first.box.width &&
      particle.position.y >= 0 &&
      particle.position.y <= first.box.height,
  );
  const momentumRemoved = length(linearMomentum(first.particles)) < 1e-10;
  const evaluation = accumulatePairForces(first.particles, first.parameters);
  const exactPairCount = evaluation.evaluatedPairs === unorderedPairCount(first.particles.length);
  const forceSum = evaluation.forces.reduce((sum, force) => add(sum, force), { x: 0, y: 0 });
  const forceSumZero = length(forceSum) < 1e-9;
  const atCutoff = sampleForceShiftedPair(first.parameters.cutoff, first.parameters);
  const inside = sampleForceShiftedPair(first.parameters.cutoff - 1e-5, first.parameters);
  const cutoffContinuous =
    atCutoff.valid &&
    !atCutoff.active &&
    atCutoff.potential === 0 &&
    atCutoff.potentialSlope === 0 &&
    inside.valid &&
    Math.abs(inside.potential) < 1e-8 &&
    Math.abs(inside.potentialSlope) < 1e-5;
  const reflected = reflectCoordinate(-0.25, -2, 10);
  const wall = makeWallExperiment();
  const wallRun = measureMolecularRun(wall, 0.0005, 200);
  const wallReflection =
    reflected.valid &&
    reflected.position === 0.25 &&
    reflected.velocity === 2 &&
    wallRun.valid &&
    wall.wallCollisions > 0 &&
    wallRun.maximumEnergyDrift < 0.01;
  const run = measureMolecularRun(first, 0.001, 400);
  const finiteRun = run.valid;
  const energyStable = finiteRun && run.maximumEnergyDrift < 0.01;
  const passed =
    deterministicInitialization &&
    particlesInsideBox &&
    momentumRemoved &&
    exactPairCount &&
    forceSumZero &&
    cutoffContinuous &&
    wallReflection &&
    finiteRun &&
    energyStable;
  return {
    deterministicInitialization,
    particlesInsideBox,
    momentumRemoved,
    exactPairCount,
    forceSumZero,
    cutoffContinuous,
    wallReflection,
    finiteRun,
    energyStable,
    maximumEnergyDrift: run.maximumEnergyDrift,
    wallEnergyDrift: wallRun.maximumEnergyDrift,
    wallEvents: wall.wallCollisions,
    passed,
  };
}
