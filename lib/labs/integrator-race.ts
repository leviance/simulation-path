export const INTEGRATOR_EPSILON = 1e-12;

export interface IntegratorOscillatorParameters {
  mass: number;
  stiffness: number;
}

export interface IntegratorOscillatorState {
  position: number;
  velocity: number;
  elapsed: number;
}

export interface IntegratorStepResult {
  state: IntegratorOscillatorState;
  forceEvaluations: number;
}

export type IntegratorKind = "euler" | "verlet" | "rk4";

export interface IntegratorLaneState {
  state: IntegratorOscillatorState;
  forceEvaluations: number;
}

export interface IntegratorRaceState {
  initial: IntegratorOscillatorState;
  euler: IntegratorLaneState;
  verlet: IntegratorLaneState;
  rk4: IntegratorLaneState;
  stepCount: number;
}

export interface IntegratorMetrics {
  positionError: number;
  phaseSpaceError: number;
  relativeEnergyDrift: number;
}

export interface IntegratorDerivative {
  positionRate: number;
  velocityRate: number;
}

export interface ExplicitEulerTrace {
  current: IntegratorOscillatorState;
  accelerationStart: number;
  next: IntegratorOscillatorState;
}

export interface VelocityVerletTrace {
  current: IntegratorOscillatorState;
  accelerationStart: number;
  positionEnd: number;
  accelerationEnd: number;
  next: IntegratorOscillatorState;
}

export interface RungeKutta4Trace {
  current: IntegratorOscillatorState;
  stage2State: IntegratorOscillatorState;
  stage3State: IntegratorOscillatorState;
  stage4State: IntegratorOscillatorState;
  k1: IntegratorDerivative;
  k2: IntegratorDerivative;
  k3: IntegratorDerivative;
  k4: IntegratorDerivative;
  next: IntegratorOscillatorState;
}

export interface IntegratorFixedStepPlan {
  steps: number;
  remainder: number;
  droppedTime: number;
}

export function validIntegratorParameters(parameters: IntegratorOscillatorParameters) {
  return (
    Number.isFinite(parameters.mass) &&
    Number.isFinite(parameters.stiffness) &&
    parameters.mass > INTEGRATOR_EPSILON &&
    parameters.stiffness >= 0
  );
}

export function integratorAngularFrequency(parameters: IntegratorOscillatorParameters) {
  if (!validIntegratorParameters(parameters)) return 0;
  return Math.sqrt(parameters.stiffness / parameters.mass);
}

export function integratorAcceleration(
  position: number,
  parameters: IntegratorOscillatorParameters,
) {
  if (!Number.isFinite(position) || !validIntegratorParameters(parameters)) return 0;
  return -(parameters.stiffness / parameters.mass) * position;
}

export function integratorEnergy(
  state: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
) {
  if (!validIntegratorParameters(parameters)) return 0;
  const kinetic = 0.5 * parameters.mass * state.velocity * state.velocity;
  const potential = 0.5 * parameters.stiffness * state.position * state.position;
  return kinetic + potential;
}

export function analyticIntegratorState(
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  elapsedSeconds: number,
): IntegratorOscillatorState {
  const elapsed = Math.max(0, elapsedSeconds);
  const omega = integratorAngularFrequency(parameters);
  if (omega <= INTEGRATOR_EPSILON) {
    return {
      position: initial.position + initial.velocity * elapsed,
      velocity: initial.velocity,
      elapsed,
    };
  }
  const phase = omega * elapsed;
  return {
    position: initial.position * Math.cos(phase) + (initial.velocity / omega) * Math.sin(phase),
    velocity: -initial.position * omega * Math.sin(phase) + initial.velocity * Math.cos(phase),
    elapsed,
  };
}

export function explicitEulerIntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorStepResult {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const trace = traceExplicitEulerStep(current, parameters, deltaSeconds);
  if (!trace) return { state: { ...current }, forceEvaluations: 0 };
  return { state: trace.next, forceEvaluations: 1 };
}

export function traceExplicitEulerStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): ExplicitEulerTrace | null {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return null;
  }
  const accelerationStart = integratorAcceleration(current.position, parameters);
  return {
    current: { ...current },
    accelerationStart,
    next: {
      position: current.position + current.velocity * deltaSeconds,
      velocity: current.velocity + accelerationStart * deltaSeconds,
      elapsed: current.elapsed + deltaSeconds,
    },
  };
}

export function velocityVerletIntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorStepResult {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const trace = traceVelocityVerletStep(current, parameters, deltaSeconds);
  if (!trace) return { state: { ...current }, forceEvaluations: 0 };
  return { state: trace.next, forceEvaluations: 2 };
}

export function traceVelocityVerletStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): VelocityVerletTrace | null {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return null;
  }
  const accelerationStart = integratorAcceleration(current.position, parameters);
  const position =
    current.position +
    current.velocity * deltaSeconds +
    0.5 * accelerationStart * deltaSeconds * deltaSeconds;
  const accelerationEnd = integratorAcceleration(position, parameters);
  const velocity = current.velocity + 0.5 * (accelerationStart + accelerationEnd) * deltaSeconds;
  return {
    current: { ...current },
    accelerationStart,
    positionEnd: position,
    accelerationEnd,
    next: { position, velocity, elapsed: current.elapsed + deltaSeconds },
  };
}

function integratorDerivative(
  state: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
): IntegratorDerivative {
  return {
    positionRate: state.velocity,
    velocityRate: integratorAcceleration(state.position, parameters),
  };
}

function offsetIntegratorState(
  state: IntegratorOscillatorState,
  derivative: IntegratorDerivative,
  amount: number,
): IntegratorOscillatorState {
  return {
    position: state.position + derivative.positionRate * amount,
    velocity: state.velocity + derivative.velocityRate * amount,
    elapsed: state.elapsed + amount,
  };
}

export function rungeKutta4IntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorStepResult {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const trace = traceRungeKutta4Step(current, parameters, deltaSeconds);
  if (!trace) return { state: { ...current }, forceEvaluations: 0 };
  return { state: trace.next, forceEvaluations: 4 };
}

export function traceRungeKutta4Step(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): RungeKutta4Trace | null {
  if (
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(deltaSeconds) ||
    deltaSeconds <= 0
  ) {
    return null;
  }
  const k1 = integratorDerivative(current, parameters);
  const stage2State = offsetIntegratorState(current, k1, 0.5 * deltaSeconds);
  const k2 = integratorDerivative(stage2State, parameters);
  const stage3State = offsetIntegratorState(current, k2, 0.5 * deltaSeconds);
  const k3 = integratorDerivative(stage3State, parameters);
  const stage4State = offsetIntegratorState(current, k3, deltaSeconds);
  const k4 = integratorDerivative(stage4State, parameters);
  const positionRate =
    (k1.positionRate + 2 * k2.positionRate + 2 * k3.positionRate + k4.positionRate) / 6;
  const velocityRate =
    (k1.velocityRate + 2 * k2.velocityRate + 2 * k3.velocityRate + k4.velocityRate) / 6;
  return {
    current: { ...current },
    stage2State,
    stage3State,
    stage4State,
    k1,
    k2,
    k3,
    k4,
    next: {
      position: current.position + positionRate * deltaSeconds,
      velocity: current.velocity + velocityRate * deltaSeconds,
      elapsed: current.elapsed + deltaSeconds,
    },
  };
}

export function makeIntegratorRaceState(initial: IntegratorOscillatorState): IntegratorRaceState {
  return {
    initial: { ...initial },
    euler: { state: { ...initial }, forceEvaluations: 0 },
    verlet: { state: { ...initial }, forceEvaluations: 0 },
    rk4: { state: { ...initial }, forceEvaluations: 0 },
    stepCount: 0,
  };
}

export function stepIntegratorRaceState(
  race: IntegratorRaceState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorRaceState {
  const euler = explicitEulerIntegratorStep(race.euler.state, parameters, deltaSeconds);
  const verlet = velocityVerletIntegratorStep(race.verlet.state, parameters, deltaSeconds);
  const rk4 = rungeKutta4IntegratorStep(race.rk4.state, parameters, deltaSeconds);
  if (euler.forceEvaluations === 0 || verlet.forceEvaluations === 0 || rk4.forceEvaluations === 0) {
    return race;
  }
  return {
    ...race,
    euler: {
      state: euler.state,
      forceEvaluations: race.euler.forceEvaluations + euler.forceEvaluations,
    },
    verlet: {
      state: verlet.state,
      forceEvaluations: race.verlet.forceEvaluations + verlet.forceEvaluations,
    },
    rk4: {
      state: rk4.state,
      forceEvaluations: race.rk4.forceEvaluations + rk4.forceEvaluations,
    },
    stepCount: race.stepCount + 1,
  };
}

export function measureIntegratorState(
  numerical: IntegratorOscillatorState,
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
): IntegratorMetrics {
  const exact = analyticIntegratorState(initial, parameters, numerical.elapsed);
  const positionDifference = numerical.position - exact.position;
  const velocityDifference = numerical.velocity - exact.velocity;
  const omega = integratorAngularFrequency(parameters);
  const phaseSpaceError =
    omega > INTEGRATOR_EPSILON
      ? Math.hypot(positionDifference, velocityDifference / omega)
      : Number.NaN;
  const initialEnergy = integratorEnergy(initial, parameters);
  const relativeEnergyDrift =
    initialEnergy > INTEGRATOR_EPSILON
      ? (integratorEnergy(numerical, parameters) - initialEnergy) / initialEnergy
      : 0;
  return {
    positionError: Math.abs(positionDifference),
    phaseSpaceError,
    relativeEnergyDrift,
  };
}

export function planIntegratorFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
): IntegratorFixedStepPlan {
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
  const availableSteps = Math.floor((available + INTEGRATOR_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrame);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    available -= discardedSteps * fixedDeltaSeconds;
    droppedTime += discardedSteps * fixedDeltaSeconds;
  }
  if (available < 0 && available > -INTEGRATOR_EPSILON) available = 0;
  return { steps, remainder: available, droppedTime };
}

export function runIntegratorSimulation(
  kind: IntegratorKind,
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  duration: number,
  deltaSeconds: number,
) {
  let state = { ...initial };
  let forceEvaluations = 0;
  const stepCount = Math.floor((duration + INTEGRATOR_EPSILON) / deltaSeconds);
  for (let step = 0; step < stepCount; step += 1) {
    let result: IntegratorStepResult;
    if (kind === "euler") result = explicitEulerIntegratorStep(state, parameters, deltaSeconds);
    else if (kind === "verlet")
      result = velocityVerletIntegratorStep(state, parameters, deltaSeconds);
    else result = rungeKutta4IntegratorStep(state, parameters, deltaSeconds);
    state = result.state;
    forceEvaluations += result.forceEvaluations;
  }
  return { state, steps: stepCount, forceEvaluations };
}
