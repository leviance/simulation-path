export const LENNARD_JONES_DISTANCE_EPSILON = 1e-9;
export const LENNARD_JONES_HISTORY_LIMIT = 480;

export interface LennardJonesPoint {
  x: number;
  y: number;
}

export interface LennardJonesAtom {
  position: LennardJonesPoint;
  velocity: LennardJonesPoint;
  mass: number;
}

export interface LennardJonesPairState {
  atomA: LennardJonesAtom;
  atomB: LennardJonesAtom;
  elapsed: number;
}

export interface LennardJonesParameters {
  epsilon: number;
  sigma: number;
}

export interface LennardJonesPotentialSample {
  valid: boolean;
  distance: number;
  ratio6: number;
  ratio12: number;
  potential: number;
}

export interface LennardJonesInteraction {
  valid: boolean;
  distance: number;
  potential: number;
  potentialSlope: number;
  forceOnA: LennardJonesPoint;
  forceOnB: LennardJonesPoint;
}

export interface LennardJonesMetrics {
  valid: boolean;
  distance: number;
  potential: number;
  kinetic: number;
  totalEnergy: number;
  momentum: LennardJonesPoint;
  center: LennardJonesPoint;
}

export interface LennardJonesStepTrace {
  valid: boolean;
  accelerationA0: LennardJonesPoint;
  accelerationB0: LennardJonesPoint;
  positionA1: LennardJonesPoint;
  positionB1: LennardJonesPoint;
  accelerationA1: LennardJonesPoint;
  accelerationB1: LennardJonesPoint;
  next: LennardJonesPairState;
}

export interface LennardJonesHistorySample {
  elapsed: number;
  distance: number;
  potential: number;
  kinetic: number;
  total: number;
  drift: number;
}

export interface LennardJonesFixedStepPlan {
  steps: number;
  remainder: number;
  droppedTime: number;
}

export function addLennardJonesPoint(left: LennardJonesPoint, right: LennardJonesPoint) {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtractLennardJonesPoint(left: LennardJonesPoint, right: LennardJonesPoint) {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scaleLennardJonesPoint(value: LennardJonesPoint, scalar: number) {
  return { x: value.x * scalar, y: value.y * scalar };
}

export function lengthLennardJonesPoint(value: LennardJonesPoint) {
  return Math.hypot(value.x, value.y);
}

export function finiteLennardJonesPoint(value: LennardJonesPoint) {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}

export function validLennardJonesParameters(parameters: LennardJonesParameters) {
  return (
    Number.isFinite(parameters.epsilon) &&
    Number.isFinite(parameters.sigma) &&
    parameters.epsilon > 0 &&
    parameters.sigma > LENNARD_JONES_DISTANCE_EPSILON
  );
}

export function validLennardJonesPairState(state: LennardJonesPairState) {
  const validAtom = (atom: LennardJonesAtom) =>
    finiteLennardJonesPoint(atom.position) &&
    finiteLennardJonesPoint(atom.velocity) &&
    Number.isFinite(atom.mass) &&
    atom.mass > LENNARD_JONES_DISTANCE_EPSILON;

  return (
    validAtom(state.atomA) &&
    validAtom(state.atomB) &&
    Number.isFinite(state.elapsed) &&
    state.elapsed >= 0
  );
}

export function makeLennardJonesPair(
  separation: number,
  mass = 1,
  direction: LennardJonesPoint = { x: 1, y: 0 },
): LennardJonesPairState {
  const directionLength = lengthLennardJonesPoint(direction);
  if (
    !Number.isFinite(separation) ||
    separation < 0 ||
    !Number.isFinite(mass) ||
    mass <= LENNARD_JONES_DISTANCE_EPSILON ||
    !Number.isFinite(directionLength) ||
    directionLength <= LENNARD_JONES_DISTANCE_EPSILON
  ) {
    return {
      atomA: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, mass: 0 },
      atomB: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, mass: 0 },
      elapsed: 0,
    };
  }
  const unit = scaleLennardJonesPoint(direction, 1 / directionLength);
  return {
    atomA: {
      position: scaleLennardJonesPoint(unit, -0.5 * separation),
      velocity: { x: 0, y: 0 },
      mass,
    },
    atomB: {
      position: scaleLennardJonesPoint(unit, 0.5 * separation),
      velocity: { x: 0, y: 0 },
      mass,
    },
    elapsed: 0,
  };
}

export function lennardJonesPairDelta(state: LennardJonesPairState) {
  return subtractLennardJonesPoint(state.atomB.position, state.atomA.position);
}

export function lennardJonesDragCondition(
  pointer: LennardJonesPoint,
  previousDirection: LennardJonesPoint,
  sigma: number,
) {
  const distance = lengthLennardJonesPoint(pointer);
  const direction =
    distance > LENNARD_JONES_DISTANCE_EPSILON
      ? scaleLennardJonesPoint(pointer, 1 / distance)
      : previousDirection;
  return {
    direction,
    separationRatio: Math.max(0.82, Math.min(2.8, (2 * distance) / sigma)),
  };
}

export function lennardJonesPairDistance(state: LennardJonesPairState) {
  return lengthLennardJonesPoint(lennardJonesPairDelta(state));
}

export function lennardJonesCenterOfMass(state: LennardJonesPairState) {
  const totalMass = state.atomA.mass + state.atomB.mass;
  if (!Number.isFinite(totalMass) || totalMass <= LENNARD_JONES_DISTANCE_EPSILON) {
    return { x: 0, y: 0 };
  }
  const weightedA = scaleLennardJonesPoint(state.atomA.position, state.atomA.mass);
  const weightedB = scaleLennardJonesPoint(state.atomB.position, state.atomB.mass);
  return scaleLennardJonesPoint(addLennardJonesPoint(weightedA, weightedB), 1 / totalMass);
}

export function lennardJonesMomentum(state: LennardJonesPairState) {
  return addLennardJonesPoint(
    scaleLennardJonesPoint(state.atomA.velocity, state.atomA.mass),
    scaleLennardJonesPoint(state.atomB.velocity, state.atomB.mass),
  );
}

export function lennardJonesCenterOfMassVelocity(state: LennardJonesPairState) {
  const totalMass = state.atomA.mass + state.atomB.mass;
  if (!Number.isFinite(totalMass) || totalMass <= LENNARD_JONES_DISTANCE_EPSILON) {
    return { x: 0, y: 0 };
  }
  return scaleLennardJonesPoint(lennardJonesMomentum(state), 1 / totalMass);
}

export function lennardJonesEquilibriumDistance(parameters: LennardJonesParameters) {
  return validLennardJonesParameters(parameters) ? 2 ** (1 / 6) * parameters.sigma : Number.NaN;
}

export function sampleLennardJonesPotential(
  distance: number,
  parameters: LennardJonesParameters,
): LennardJonesPotentialSample {
  const invalid = {
    valid: false,
    distance,
    ratio6: 0,
    ratio12: 0,
    potential: Number.NaN,
  };
  if (
    !validLennardJonesParameters(parameters) ||
    !Number.isFinite(distance) ||
    distance <= LENNARD_JONES_DISTANCE_EPSILON
  ) {
    return invalid;
  }
  const ratio = parameters.sigma / distance;
  const ratio2 = ratio * ratio;
  const ratio6 = ratio2 * ratio2 * ratio2;
  const ratio12 = ratio6 * ratio6;
  const potential = 4 * parameters.epsilon * (ratio12 - ratio6);
  return Number.isFinite(potential)
    ? { valid: true, distance, ratio6, ratio12, potential }
    : invalid;
}

export function evaluateLennardJonesPair(
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
): LennardJonesInteraction {
  const invalid: LennardJonesInteraction = {
    valid: false,
    distance: Number.NaN,
    potential: Number.NaN,
    potentialSlope: Number.NaN,
    forceOnA: { x: 0, y: 0 },
    forceOnB: { x: 0, y: 0 },
  };
  if (!validLennardJonesPairState(state)) return invalid;
  const delta = lennardJonesPairDelta(state);
  const distance = lengthLennardJonesPoint(delta);
  const potential = sampleLennardJonesPotential(distance, parameters);
  if (!potential.valid) return invalid;
  const potentialSlope = sampleLennardJonesPotentialSlope(potential, parameters);
  const forceOnA = scaleLennardJonesPoint(delta, potentialSlope / distance);
  if (!Number.isFinite(potentialSlope) || !finiteLennardJonesPoint(forceOnA)) return invalid;
  return {
    valid: true,
    distance,
    potential: potential.potential,
    potentialSlope,
    forceOnA,
    forceOnB: scaleLennardJonesPoint(forceOnA, -1),
  };
}

export function sampleLennardJonesPotentialSlope(
  sample: LennardJonesPotentialSample,
  parameters: LennardJonesParameters,
) {
  if (!sample.valid || !validLennardJonesParameters(parameters)) return Number.NaN;
  return (24 * parameters.epsilon * (sample.ratio6 - 2 * sample.ratio12)) / sample.distance;
}

export function traceLennardJonesVelocityVerletStep(
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
  deltaSeconds: number,
): LennardJonesStepTrace {
  const invalid: LennardJonesStepTrace = {
    valid: false,
    accelerationA0: { x: 0, y: 0 },
    accelerationB0: { x: 0, y: 0 },
    positionA1: { ...state.atomA.position },
    positionB1: { ...state.atomB.position },
    accelerationA1: { x: 0, y: 0 },
    accelerationB1: { x: 0, y: 0 },
    next: state,
  };
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return invalid;
  const before = evaluateLennardJonesPair(state, parameters);
  if (!before.valid || state.atomA.mass <= 0 || state.atomB.mass <= 0) return invalid;
  const accelerationA0 = scaleLennardJonesPoint(before.forceOnA, 1 / state.atomA.mass);
  const accelerationB0 = scaleLennardJonesPoint(before.forceOnB, 1 / state.atomB.mass);
  const halfDeltaSquared = 0.5 * deltaSeconds * deltaSeconds;
  const positionA1 = addLennardJonesPoint(
    state.atomA.position,
    addLennardJonesPoint(
      scaleLennardJonesPoint(state.atomA.velocity, deltaSeconds),
      scaleLennardJonesPoint(accelerationA0, halfDeltaSquared),
    ),
  );
  const positionB1 = addLennardJonesPoint(
    state.atomB.position,
    addLennardJonesPoint(
      scaleLennardJonesPoint(state.atomB.velocity, deltaSeconds),
      scaleLennardJonesPoint(accelerationB0, halfDeltaSquared),
    ),
  );
  const candidate: LennardJonesPairState = {
    atomA: { ...state.atomA, position: positionA1 },
    atomB: { ...state.atomB, position: positionB1 },
    elapsed: state.elapsed + deltaSeconds,
  };
  const after = evaluateLennardJonesPair(candidate, parameters);
  if (!after.valid) return invalid;
  const accelerationA1 = scaleLennardJonesPoint(after.forceOnA, 1 / state.atomA.mass);
  const accelerationB1 = scaleLennardJonesPoint(after.forceOnB, 1 / state.atomB.mass);
  const next = {
    atomA: {
      ...candidate.atomA,
      velocity: addLennardJonesPoint(
        state.atomA.velocity,
        scaleLennardJonesPoint(
          addLennardJonesPoint(accelerationA0, accelerationA1),
          0.5 * deltaSeconds,
        ),
      ),
    },
    atomB: {
      ...candidate.atomB,
      velocity: addLennardJonesPoint(
        state.atomB.velocity,
        scaleLennardJonesPoint(
          addLennardJonesPoint(accelerationB0, accelerationB1),
          0.5 * deltaSeconds,
        ),
      ),
    },
    elapsed: candidate.elapsed,
  };
  const finiteNext =
    finiteLennardJonesPoint(next.atomA.position) &&
    finiteLennardJonesPoint(next.atomB.position) &&
    finiteLennardJonesPoint(next.atomA.velocity) &&
    finiteLennardJonesPoint(next.atomB.velocity);
  return finiteNext
    ? {
        valid: true,
        accelerationA0,
        accelerationB0,
        positionA1,
        positionB1,
        accelerationA1,
        accelerationB1,
        next,
      }
    : invalid;
}

export function measureLennardJonesSystem(
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
): LennardJonesMetrics {
  const interaction = evaluateLennardJonesPair(state, parameters);
  const momentum = lennardJonesMomentum(state);
  const center = lennardJonesCenterOfMass(state);
  const kinetic =
    0.5 * state.atomA.mass * lengthLennardJonesPoint(state.atomA.velocity) ** 2 +
    0.5 * state.atomB.mass * lengthLennardJonesPoint(state.atomB.velocity) ** 2;
  const totalEnergy = kinetic + interaction.potential;
  const valid =
    interaction.valid &&
    Number.isFinite(kinetic) &&
    Number.isFinite(totalEnergy) &&
    finiteLennardJonesPoint(momentum) &&
    finiteLennardJonesPoint(center);
  return {
    valid,
    distance: interaction.distance,
    potential: interaction.potential,
    kinetic,
    totalEnergy,
    momentum,
    center,
  };
}

export function lennardJonesRelativeEnergyDrift(currentEnergy: number, initialEnergy: number) {
  return (
    (currentEnergy - initialEnergy) /
    Math.max(Math.abs(initialEnergy), LENNARD_JONES_DISTANCE_EPSILON)
  );
}

export function appendLennardJonesHistory(
  history: readonly LennardJonesHistorySample[],
  state: LennardJonesPairState,
  parameters: LennardJonesParameters,
  initialEnergy: number,
  limit = LENNARD_JONES_HISTORY_LIMIT,
) {
  const metrics = measureLennardJonesSystem(state, parameters);
  if (!metrics.valid) return [...history];
  const next = [
    ...history,
    {
      elapsed: state.elapsed,
      distance: metrics.distance,
      potential: metrics.potential,
      kinetic: metrics.kinetic,
      total: metrics.totalEnergy,
      drift: lennardJonesRelativeEnergyDrift(metrics.totalEnergy, initialEnergy),
    },
  ];
  return next.slice(-Math.max(1, limit));
}

export function planLennardJonesFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
): LennardJonesFixedStepPlan {
  if (
    !Number.isFinite(accumulator) ||
    accumulator < 0 ||
    !Number.isFinite(frameSeconds) ||
    frameSeconds < 0 ||
    !Number.isFinite(fixedDeltaSeconds) ||
    fixedDeltaSeconds <= 0 ||
    maximumSteps <= 0 ||
    maximumFrameSeconds <= 0
  ) {
    return { steps: 0, remainder: 0, droppedTime: 0 };
  }
  const acceptedFrame = Math.min(frameSeconds, maximumFrameSeconds);
  let available = accumulator + acceptedFrame;
  const availableSteps = Math.floor(
    (available + LENNARD_JONES_DISTANCE_EPSILON) / fixedDeltaSeconds,
  );
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrame);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    available -= discardedSteps * fixedDeltaSeconds;
    droppedTime += discardedSteps * fixedDeltaSeconds;
  }
  return { steps, remainder: Math.max(0, available), droppedTime };
}

export function runLennardJonesPair(
  initial: LennardJonesPairState,
  parameters: LennardJonesParameters,
  duration: number,
  deltaSeconds: number,
  maximumSteps: number,
) {
  const stepCount = Math.floor((duration + LENNARD_JONES_DISTANCE_EPSILON) / deltaSeconds);
  if (!Number.isFinite(stepCount) || stepCount < 0 || stepCount > maximumSteps) {
    return { valid: false, state: initial, steps: 0 };
  }
  let state = initial;
  for (let step = 0; step < stepCount; step += 1) {
    const trace = traceLennardJonesVelocityVerletStep(state, parameters, deltaSeconds);
    if (!trace.valid) return { valid: false, state, steps: step };
    state = trace.next;
  }
  return { valid: true, state, steps: stepCount };
}

export function validateLennardJonesModel(parameters: LennardJonesParameters, mass = 1) {
  const validMass = Number.isFinite(mass) && mass > LENNARD_JONES_DISTANCE_EPSILON;
  const equilibrium = lennardJonesEquilibriumDistance(parameters);
  const atSigma = sampleLennardJonesPotential(parameters.sigma, parameters);
  const atEquilibrium = sampleLennardJonesPotential(equilibrium, parameters);
  const repulsive = evaluateLennardJonesPair(
    makeLennardJonesPair(0.95 * parameters.sigma, mass),
    parameters,
  );
  const attractive = evaluateLennardJonesPair(
    makeLennardJonesPair(1.5 * parameters.sigma, mass),
    parameters,
  );
  const atR0 = evaluateLennardJonesPair(makeLennardJonesPair(equilibrium, mass), parameters);
  const initial = makeLennardJonesPair(1.45 * parameters.sigma, mass);
  const initialMetrics = measureLennardJonesSystem(initial, parameters);
  const characteristicTime = validMass
    ? parameters.sigma * Math.sqrt(mass / parameters.epsilon)
    : Number.NaN;
  const run = runLennardJonesPair(
    initial,
    parameters,
    20 * characteristicTime,
    characteristicTime / 1000,
    25_000,
  );
  const finalMetrics = measureLennardJonesSystem(run.state, parameters);
  const checks = {
    landmarks:
      atSigma.valid &&
      atEquilibrium.valid &&
      validMass &&
      Math.abs(atSigma.potential) < 1e-10 * Math.max(1, parameters.epsilon) &&
      Math.abs(atEquilibrium.potential + parameters.epsilon) <
        1e-9 * Math.max(1, parameters.epsilon) &&
      atR0.valid &&
      Math.abs(atR0.potentialSlope) < 1e-9 * Math.max(1, parameters.epsilon / parameters.sigma),
    forceDirections:
      repulsive.valid &&
      attractive.valid &&
      repulsive.potentialSlope < 0 &&
      attractive.potentialSlope > 0,
    newtonThirdLaw:
      attractive.valid &&
      lengthLennardJonesPoint(addLennardJonesPoint(attractive.forceOnA, attractive.forceOnB)) <
        1e-12,
    finiteRun: run.valid && finalMetrics.valid,
    momentum: run.valid && lengthLennardJonesPoint(finalMetrics.momentum) < 1e-9,
    centerOfMass:
      run.valid && lengthLennardJonesPoint(finalMetrics.center) < 1e-9 * parameters.sigma,
    energy:
      run.valid &&
      initialMetrics.valid &&
      Math.abs(
        lennardJonesRelativeEnergyDrift(finalMetrics.totalEnergy, initialMetrics.totalEnergy),
      ) < 0.002,
  };
  return { ...checks, passed: Object.values(checks).every(Boolean) };
}

// Assess the selected initial condition and dt without changing the visible pair.
export function assessLennardJonesExperiment(
  initial: LennardJonesPairState,
  parameters: LennardJonesParameters,
  dt: number,
  steps = 1_000,
) {
  const initialMetrics = measureLennardJonesSystem(initial, parameters);
  let maximumEnergyDrift = 0;
  if (!initialMetrics.valid || !Number.isInteger(steps) || steps < 1 || steps > 2_000) {
    return { valid: false, maximumEnergyDrift: Number.NaN, steps: 0, stable: false };
  }
  let state = initial;
  for (let step = 0; step < steps; step += 1) {
    const trace = traceLennardJonesVelocityVerletStep(state, parameters, dt);
    if (!trace.valid) return { valid: false, maximumEnergyDrift, steps: step, stable: false };
    state = trace.next;
    const metrics = measureLennardJonesSystem(state, parameters);
    if (!metrics.valid) return { valid: false, maximumEnergyDrift, steps: step + 1, stable: false };
    maximumEnergyDrift = Math.max(
      maximumEnergyDrift,
      Math.abs(lennardJonesRelativeEnergyDrift(metrics.totalEnergy, initialMetrics.totalEnergy)),
    );
  }
  return { valid: true, maximumEnergyDrift, steps, stable: maximumEnergyDrift < 0.002 };
}
