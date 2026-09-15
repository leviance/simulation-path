export const DOUBLE_PENDULUM_EPSILON = 1e-12;

export interface DoublePendulumParameters {
  mass1: number;
  mass2: number;
  length1: number;
  length2: number;
  gravity: number;
}

export interface DoublePendulumState {
  theta1: number;
  omega1: number;
  theta2: number;
  omega2: number;
  elapsed: number;
}

export interface DoublePendulumDerivative {
  theta1Rate: number;
  omega1Rate: number;
  theta2Rate: number;
  omega2Rate: number;
}

export interface DoublePendulumGeometry {
  pivot: { x: number; y: number };
  bob1: { x: number; y: number };
  bob2: { x: number; y: number };
}

export interface DoublePendulumFixedStepPlan {
  steps: number;
  remainder: number;
  droppedTime: number;
}

export interface DoublePendulumRace {
  initialPrimary: DoublePendulumState;
  initialPerturbed: DoublePendulumState;
  primary: DoublePendulumState;
  perturbed: DoublePendulumState;
  halfStepReference: DoublePendulumState;
  stepCount: number;
}

export interface DoublePendulumMetrics {
  phaseSpaceSeparation: number;
  secondBobSeparation: number;
  numericalSeparation: number;
  finiteTimeExponent: number;
  relativeEnergyDrift: number;
  finite: boolean;
}

export function validDoublePendulumParameters(parameters: DoublePendulumParameters) {
  return (
    Number.isFinite(parameters.mass1) &&
    Number.isFinite(parameters.mass2) &&
    Number.isFinite(parameters.length1) &&
    Number.isFinite(parameters.length2) &&
    Number.isFinite(parameters.gravity) &&
    parameters.mass1 > DOUBLE_PENDULUM_EPSILON &&
    parameters.mass2 > DOUBLE_PENDULUM_EPSILON &&
    parameters.length1 > DOUBLE_PENDULUM_EPSILON &&
    parameters.length2 > DOUBLE_PENDULUM_EPSILON &&
    parameters.gravity > DOUBLE_PENDULUM_EPSILON
  );
}

export function finiteDoublePendulumState(state: DoublePendulumState) {
  return (
    Number.isFinite(state.theta1) &&
    Number.isFinite(state.omega1) &&
    Number.isFinite(state.theta2) &&
    Number.isFinite(state.omega2) &&
    Number.isFinite(state.elapsed) &&
    state.elapsed >= 0
  );
}

export function wrapPendulumAngle(angle: number) {
  if (!Number.isFinite(angle)) return Number.NaN;
  const fullTurn = 2 * Math.PI;
  let wrapped = ((((angle + Math.PI) % fullTurn) + fullTurn) % fullTurn) - Math.PI;
  if (wrapped === -Math.PI && angle > 0) wrapped = Math.PI;
  return wrapped;
}

export function doublePendulumGeometry(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
): DoublePendulumGeometry {
  const pivot = { x: 0, y: 0 };
  const bob1 = {
    x: parameters.length1 * Math.sin(state.theta1),
    y: -parameters.length1 * Math.cos(state.theta1),
  };
  const bob2 = {
    x: bob1.x + parameters.length2 * Math.sin(state.theta2),
    y: bob1.y - parameters.length2 * Math.cos(state.theta2),
  };
  return { pivot, bob1, bob2 };
}

export function doublePendulumDerivative(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
): DoublePendulumDerivative | null {
  if (!finiteDoublePendulumState(state) || !validDoublePendulumParameters(parameters)) {
    return null;
  }

  const { mass1, mass2, length1, length2, gravity } = parameters;
  const angleDifference = state.theta1 - state.theta2;
  const sharedDenominator =
    2 * mass1 + mass2 - mass2 * Math.cos(2 * state.theta1 - 2 * state.theta2);
  const denominator1 = length1 * sharedDenominator;
  const denominator2 = length2 * sharedDenominator;
  if (
    Math.abs(denominator1) <= DOUBLE_PENDULUM_EPSILON ||
    Math.abs(denominator2) <= DOUBLE_PENDULUM_EPSILON
  ) {
    return null;
  }

  const acceleration1 =
    (-gravity * (2 * mass1 + mass2) * Math.sin(state.theta1) -
      mass2 * gravity * Math.sin(state.theta1 - 2 * state.theta2) -
      2 *
        Math.sin(angleDifference) *
        mass2 *
        (state.omega2 * state.omega2 * length2 +
          state.omega1 * state.omega1 * length1 * Math.cos(angleDifference))) /
    denominator1;
  const acceleration2 =
    (2 *
      Math.sin(angleDifference) *
      (state.omega1 * state.omega1 * length1 * (mass1 + mass2) +
        gravity * (mass1 + mass2) * Math.cos(state.theta1) +
        state.omega2 * state.omega2 * length2 * mass2 * Math.cos(angleDifference))) /
    denominator2;

  return {
    theta1Rate: state.omega1,
    omega1Rate: acceleration1,
    theta2Rate: state.omega2,
    omega2Rate: acceleration2,
  };
}

function stateFromDerivative(
  state: DoublePendulumState,
  derivative: DoublePendulumDerivative,
  scale: number,
) {
  return {
    theta1: state.theta1 + derivative.theta1Rate * scale,
    omega1: state.omega1 + derivative.omega1Rate * scale,
    theta2: state.theta2 + derivative.theta2Rate * scale,
    omega2: state.omega2 + derivative.omega2Rate * scale,
    elapsed: state.elapsed + scale,
  };
}

export function stepDoublePendulumRk4(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
  deltaSeconds: number,
) {
  if (
    !finiteDoublePendulumState(state) ||
    !validDoublePendulumParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return null;
  }
  const k1 = doublePendulumDerivative(state, parameters);
  if (!k1) return null;
  const k2 = doublePendulumDerivative(
    stateFromDerivative(state, k1, 0.5 * deltaSeconds),
    parameters,
  );
  if (!k2) return null;
  const k3 = doublePendulumDerivative(
    stateFromDerivative(state, k2, 0.5 * deltaSeconds),
    parameters,
  );
  if (!k3) return null;
  const k4 = doublePendulumDerivative(stateFromDerivative(state, k3, deltaSeconds), parameters);
  if (!k4) return null;

  const weighted = (first: number, second: number, third: number, fourth: number) =>
    (first + 2 * second + 2 * third + fourth) / 6;
  return {
    theta1:
      state.theta1 +
      deltaSeconds * weighted(k1.theta1Rate, k2.theta1Rate, k3.theta1Rate, k4.theta1Rate),
    omega1:
      state.omega1 +
      deltaSeconds * weighted(k1.omega1Rate, k2.omega1Rate, k3.omega1Rate, k4.omega1Rate),
    theta2:
      state.theta2 +
      deltaSeconds * weighted(k1.theta2Rate, k2.theta2Rate, k3.theta2Rate, k4.theta2Rate),
    omega2:
      state.omega2 +
      deltaSeconds * weighted(k1.omega2Rate, k2.omega2Rate, k3.omega2Rate, k4.omega2Rate),
    elapsed: state.elapsed + deltaSeconds,
  };
}

export function doublePendulumEnergy(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
) {
  if (!finiteDoublePendulumState(state) || !validDoublePendulumParameters(parameters)) {
    return Number.NaN;
  }
  const { mass1, mass2, length1, length2, gravity } = parameters;
  const velocity1Squared = length1 * length1 * state.omega1 * state.omega1;
  const velocity2X =
    length1 * state.omega1 * Math.cos(state.theta1) +
    length2 * state.omega2 * Math.cos(state.theta2);
  const velocity2Y =
    length1 * state.omega1 * Math.sin(state.theta1) +
    length2 * state.omega2 * Math.sin(state.theta2);
  const kinetic =
    0.5 * mass1 * velocity1Squared +
    0.5 * mass2 * (velocity2X * velocity2X + velocity2Y * velocity2Y);
  const potential =
    mass1 * gravity * length1 * (1 - Math.cos(state.theta1)) +
    mass2 *
      gravity *
      (length1 * (1 - Math.cos(state.theta1)) + length2 * (1 - Math.cos(state.theta2)));
  return kinetic + potential;
}

function characteristicTime(parameters: DoublePendulumParameters) {
  return Math.sqrt((0.5 * (parameters.length1 + parameters.length2)) / parameters.gravity);
}

export function doublePendulumPhaseSpaceSeparation(
  first: DoublePendulumState,
  second: DoublePendulumState,
  parameters: DoublePendulumParameters,
) {
  if (
    !finiteDoublePendulumState(first) ||
    !finiteDoublePendulumState(second) ||
    !validDoublePendulumParameters(parameters)
  ) {
    return Number.NaN;
  }
  const timeScale = characteristicTime(parameters);
  const angle1Difference = wrapPendulumAngle(second.theta1 - first.theta1);
  const angle2Difference = wrapPendulumAngle(second.theta2 - first.theta2);
  const omega1Difference = (second.omega1 - first.omega1) * timeScale;
  const omega2Difference = (second.omega2 - first.omega2) * timeScale;
  return Math.hypot(angle1Difference, angle2Difference, omega1Difference, omega2Difference);
}

export function doublePendulumSecondBobSeparation(
  first: DoublePendulumState,
  second: DoublePendulumState,
  parameters: DoublePendulumParameters,
) {
  const firstGeometry = doublePendulumGeometry(first, parameters);
  const secondGeometry = doublePendulumGeometry(second, parameters);
  return Math.hypot(
    secondGeometry.bob2.x - firstGeometry.bob2.x,
    secondGeometry.bob2.y - firstGeometry.bob2.y,
  );
}

export function makeDoublePendulumRace(
  initial: DoublePendulumState,
  perturbationRadians: number,
): DoublePendulumRace {
  const perturbed = {
    ...initial,
    theta2: initial.theta2 + perturbationRadians,
  };
  return {
    initialPrimary: { ...initial },
    initialPerturbed: { ...perturbed },
    primary: { ...initial },
    perturbed: { ...perturbed },
    halfStepReference: { ...initial },
    stepCount: 0,
  };
}

export function stepDoublePendulumRace(
  race: DoublePendulumRace,
  parameters: DoublePendulumParameters,
  deltaSeconds: number,
) {
  const primary = stepDoublePendulumRk4(race.primary, parameters, deltaSeconds);
  const perturbed = stepDoublePendulumRk4(race.perturbed, parameters, deltaSeconds);
  const halfStep = stepDoublePendulumRk4(race.halfStepReference, parameters, 0.5 * deltaSeconds);
  const halfStepReference = halfStep
    ? stepDoublePendulumRk4(halfStep, parameters, 0.5 * deltaSeconds)
    : null;
  if (!primary || !perturbed || !halfStepReference) return race;
  return {
    ...race,
    primary,
    perturbed,
    halfStepReference,
    stepCount: race.stepCount + 1,
  };
}

export function measureDoublePendulumRace(
  race: DoublePendulumRace,
  parameters: DoublePendulumParameters,
): DoublePendulumMetrics {
  const phaseSpaceSeparation = doublePendulumPhaseSpaceSeparation(
    race.primary,
    race.perturbed,
    parameters,
  );
  const initialSeparation = doublePendulumPhaseSpaceSeparation(
    race.initialPrimary,
    race.initialPerturbed,
    parameters,
  );
  const numericalSeparation = doublePendulumPhaseSpaceSeparation(
    race.primary,
    race.halfStepReference,
    parameters,
  );
  const initialEnergy = doublePendulumEnergy(race.initialPrimary, parameters);
  const currentEnergy = doublePendulumEnergy(race.primary, parameters);
  let relativeEnergyDrift = 0;
  if (Math.abs(initialEnergy) > DOUBLE_PENDULUM_EPSILON) {
    relativeEnergyDrift = (currentEnergy - initialEnergy) / Math.abs(initialEnergy);
  }
  let finiteTimeExponent = Number.NaN;
  if (
    race.primary.elapsed > 0 &&
    initialSeparation > DOUBLE_PENDULUM_EPSILON &&
    phaseSpaceSeparation > DOUBLE_PENDULUM_EPSILON
  ) {
    finiteTimeExponent = Math.log(phaseSpaceSeparation / initialSeparation) / race.primary.elapsed;
  }
  const secondBobSeparation = doublePendulumSecondBobSeparation(
    race.primary,
    race.perturbed,
    parameters,
  );
  return {
    phaseSpaceSeparation,
    secondBobSeparation,
    numericalSeparation,
    finiteTimeExponent,
    relativeEnergyDrift,
    finite:
      finiteDoublePendulumState(race.primary) &&
      finiteDoublePendulumState(race.perturbed) &&
      finiteDoublePendulumState(race.halfStepReference) &&
      Number.isFinite(phaseSpaceSeparation) &&
      Number.isFinite(numericalSeparation) &&
      Number.isFinite(relativeEnergyDrift),
  };
}

export function planDoublePendulumFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
): DoublePendulumFixedStepPlan {
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
  const availableSteps = Math.floor((available + DOUBLE_PENDULUM_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrame);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    available -= discardedSteps * fixedDeltaSeconds;
    droppedTime += discardedSteps * fixedDeltaSeconds;
  }
  if (available < 0 && available > -DOUBLE_PENDULUM_EPSILON) available = 0;
  return { steps, remainder: available, droppedTime };
}
