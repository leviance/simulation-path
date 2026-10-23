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
  kind: IntegratorKind;
  state: IntegratorOscillatorState;
  forceEvaluations: number;
}

export interface IntegratorRaceState {
  initial: IntegratorOscillatorState;
  lanes: IntegratorLaneState[];
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
    parameters.mass > 0 &&
    parameters.stiffness >= 0 &&
    Number.isFinite(parameters.stiffness / parameters.mass)
  );
}

export function integratorAngularFrequency(parameters: IntegratorOscillatorParameters) {
  if (!validIntegratorParameters(parameters)) return NaN;
  return Math.sqrt(parameters.stiffness / parameters.mass);
}

export function integratorAcceleration(
  position: number,
  parameters: IntegratorOscillatorParameters,
) {
  if (!Number.isFinite(position) || !validIntegratorParameters(parameters)) return NaN;
  return -(parameters.stiffness / parameters.mass) * position;
}

export function integratorEnergy(
  state: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
) {
  if (!validIntegratorParameters(parameters) || !finiteIntegratorState(state)) return NaN;
  const kinetic = 0.5 * parameters.mass * state.velocity * state.velocity;
  const potential = 0.5 * parameters.stiffness * state.position * state.position;
  return kinetic + potential;
}

export function analyticIntegratorState(
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  elapsedSeconds: number,
): IntegratorOscillatorState {
  if (
    !finiteIntegratorState(initial) ||
    !validIntegratorParameters(parameters) ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0
  )
    return { position: NaN, velocity: NaN, elapsed: NaN };
  const elapsed = elapsedSeconds;
  const omega = integratorAngularFrequency(parameters);
  if (omega === 0) {
    return {
      position: initial.position + initial.velocity * elapsed,
      velocity: initial.velocity,
      elapsed: initial.elapsed + elapsed,
    };
  }
  const phase = omega * elapsed;
  return {
    position: initial.position * Math.cos(phase) + (initial.velocity / omega) * Math.sin(phase),
    velocity: -initial.position * omega * Math.sin(phase) + initial.velocity * Math.cos(phase),
    elapsed: initial.elapsed + elapsed,
  };
}

export const INTEGRATOR_KINDS: IntegratorKind[] = ["euler", "verlet", "rk4"];
export const INTEGRATOR_NAMES = { euler: "Explicit Euler", verlet: "Velocity Verlet", rk4: "RK4" };
export function finiteIntegratorState(state: IntegratorOscillatorState) {
  return (
    [state.position, state.velocity, state.elapsed].every(Number.isFinite) && state.elapsed >= 0
  );
}
export function validIntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  dt: number,
) {
  return (
    finiteIntegratorState(current) &&
    validIntegratorParameters(parameters) &&
    Number.isFinite(dt) &&
    dt > 0
  );
}
function checkedIntegratorStep(
  current: IntegratorOscillatorState,
  next: IntegratorOscillatorState,
  evaluations: number,
): IntegratorStepResult {
  return finiteIntegratorState(next)
    ? { state: next, forceEvaluations: evaluations }
    : { state: current, forceEvaluations: 0 };
}

export function explicitEulerIntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorStepResult {
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const acceleration = integratorAcceleration(current.position, parameters);
  return checkedIntegratorStep(
    current,
    {
      position: current.position + current.velocity * deltaSeconds,
      velocity: current.velocity + acceleration * deltaSeconds,
      elapsed: current.elapsed + deltaSeconds,
    },
    1,
  );
}

export function traceExplicitEulerStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): ExplicitEulerTrace | null {
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
    return null;
  }
  const accelerationStart = integratorAcceleration(current.position, parameters);
  const next = {
    position: current.position + current.velocity * deltaSeconds,
    velocity: current.velocity + accelerationStart * deltaSeconds,
    elapsed: current.elapsed + deltaSeconds,
  };
  if (!Number.isFinite(accelerationStart) || !finiteIntegratorState(next)) return null;
  return {
    current: { ...current },
    accelerationStart,
    next,
  };
}

export function velocityVerletIntegratorStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): IntegratorStepResult {
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const accelerationStart = integratorAcceleration(current.position, parameters);
  const position =
    current.position +
    current.velocity * deltaSeconds +
    0.5 * accelerationStart * deltaSeconds * deltaSeconds;
  const accelerationEnd = integratorAcceleration(position, parameters);
  const velocity = current.velocity + 0.5 * (accelerationStart + accelerationEnd) * deltaSeconds;
  return checkedIntegratorStep(
    current,
    { position, velocity, elapsed: current.elapsed + deltaSeconds },
    2,
  );
}

export function traceVelocityVerletStep(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): VelocityVerletTrace | null {
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
    return null;
  }
  const accelerationStart = integratorAcceleration(current.position, parameters);
  const position =
    current.position +
    current.velocity * deltaSeconds +
    0.5 * accelerationStart * deltaSeconds * deltaSeconds;
  const accelerationEnd = integratorAcceleration(position, parameters);
  const velocity = current.velocity + 0.5 * (accelerationStart + accelerationEnd) * deltaSeconds;
  const next = { position, velocity, elapsed: current.elapsed + deltaSeconds };
  if (![accelerationStart, accelerationEnd].every(Number.isFinite) || !finiteIntegratorState(next))
    return null;
  return {
    current: { ...current },
    accelerationStart,
    positionEnd: position,
    accelerationEnd,
    next,
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
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
    return { state: { ...current }, forceEvaluations: 0 };
  }
  const k1 = integratorDerivative(current, parameters);
  const k2 = integratorDerivative(
    offsetIntegratorState(current, k1, 0.5 * deltaSeconds),
    parameters,
  );
  const k3 = integratorDerivative(
    offsetIntegratorState(current, k2, 0.5 * deltaSeconds),
    parameters,
  );
  const k4 = integratorDerivative(offsetIntegratorState(current, k3, deltaSeconds), parameters);
  const positionRate =
    (k1.positionRate + 2 * k2.positionRate + 2 * k3.positionRate + k4.positionRate) / 6;
  const velocityRate =
    (k1.velocityRate + 2 * k2.velocityRate + 2 * k3.velocityRate + k4.velocityRate) / 6;
  return checkedIntegratorStep(
    current,
    {
      position: current.position + positionRate * deltaSeconds,
      velocity: current.velocity + velocityRate * deltaSeconds,
      elapsed: current.elapsed + deltaSeconds,
    },
    4,
  );
}

export function traceRungeKutta4Step(
  current: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
): RungeKutta4Trace | null {
  if (!validIntegratorStep(current, parameters, deltaSeconds)) {
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
  const next = {
    position: current.position + positionRate * deltaSeconds,
    velocity: current.velocity + velocityRate * deltaSeconds,
    elapsed: current.elapsed + deltaSeconds,
  };
  if (
    ![stage2State, stage3State, stage4State, next].every(finiteIntegratorState) ||
    ![k1, k2, k3, k4].every((k) => [k.positionRate, k.velocityRate].every(Number.isFinite))
  )
    return null;
  return {
    current: { ...current },
    stage2State,
    stage3State,
    stage4State,
    k1,
    k2,
    k3,
    k4,
    next,
  };
}

export function makeIntegratorRaceState(
  initial: IntegratorOscillatorState,
  kinds: IntegratorKind[] = INTEGRATOR_KINDS,
): IntegratorRaceState {
  return {
    initial: { ...initial },
    lanes: INTEGRATOR_KINDS.map((fallback, index) => ({
      kind: kinds[index] ?? fallback,
      state: { ...initial },
      forceEvaluations: 0,
    })),
    stepCount: 0,
  };
}

export function stepIntegratorByKind(
  kind: IntegratorKind,
  state: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  dt: number,
): IntegratorStepResult {
  if (kind === "euler") return explicitEulerIntegratorStep(state, parameters, dt);
  if (kind === "verlet") return velocityVerletIntegratorStep(state, parameters, dt);
  if (kind === "rk4") return rungeKutta4IntegratorStep(state, parameters, dt);
  return { state, forceEvaluations: 0 };
}

export function stepIntegratorRaceState(
  race: IntegratorRaceState,
  parameters: IntegratorOscillatorParameters,
  deltaSeconds: number,
  laneCount = 3,
): IntegratorRaceState {
  if (race.lanes.length !== 3 || !Number.isInteger(laneCount) || laneCount < 1 || laneCount > 3)
    return race;
  const results = race.lanes
    .slice(0, laneCount)
    .map((lane) => stepIntegratorByKind(lane.kind, lane.state, parameters, deltaSeconds));
  if (results.some((result) => result.forceEvaluations === 0)) return race;
  return {
    ...race,
    lanes: race.lanes.map((lane, index) =>
      index < laneCount
        ? {
            ...lane,
            state: results[index].state,
            forceEvaluations: lane.forceEvaluations + results[index].forceEvaluations,
          }
        : lane,
    ),
    stepCount: race.stepCount + 1,
  };
}

export function measureIntegratorState(
  numerical: IntegratorOscillatorState,
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
): IntegratorMetrics {
  if (
    !finiteIntegratorState(numerical) ||
    !finiteIntegratorState(initial) ||
    !validIntegratorParameters(parameters) ||
    numerical.elapsed < initial.elapsed
  )
    return { positionError: NaN, phaseSpaceError: NaN, relativeEnergyDrift: NaN };
  const exact = analyticIntegratorState(initial, parameters, numerical.elapsed - initial.elapsed);
  const positionDifference = numerical.position - exact.position;
  const velocityDifference = numerical.velocity - exact.velocity;
  const omega = integratorAngularFrequency(parameters);
  const phaseSpaceError =
    omega > 0 ? Math.hypot(positionDifference, velocityDifference / omega) : Number.NaN;
  const initialEnergy = integratorEnergy(initial, parameters);
  const relativeEnergyDrift =
    initialEnergy > 0 && Number.isFinite(initialEnergy)
      ? (integratorEnergy(numerical, parameters) - initialEnergy) / initialEnergy
      : NaN;
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
    fixedDeltaSeconds < 1e-6 ||
    !Number.isInteger(maximumSteps) ||
    maximumSteps <= 0 ||
    maximumSteps > 256 ||
    !Number.isFinite(maximumFrameSeconds) ||
    maximumFrameSeconds <= 0
  ) {
    return { steps: 0, remainder: 0, droppedTime: 0 };
  }
  const acceptedFrame = Math.min(frameSeconds, maximumFrameSeconds);
  const available = accumulator + acceptedFrame;
  const availableSteps = Math.floor((available + INTEGRATOR_EPSILON) / fixedDeltaSeconds);
  if (!Number.isFinite(available) || !Number.isFinite(availableSteps))
    return { steps: 0, remainder: 0, droppedTime: 0 };
  const steps = Math.min(availableSteps, maximumSteps);
  const remainder = Math.max(
    0,
    ((available + INTEGRATOR_EPSILON) % fixedDeltaSeconds) - INTEGRATOR_EPSILON,
  );
  const droppedTime =
    Math.max(0, frameSeconds - acceptedFrame) +
    Math.max(0, available - remainder - steps * fixedDeltaSeconds);
  return { steps, remainder, droppedTime };
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
  if (
    !validIntegratorStep(initial, parameters, deltaSeconds) ||
    !Number.isFinite(duration) ||
    duration < 0 ||
    !Number.isFinite(stepCount) ||
    stepCount > 10000
  )
    return { state, steps: 0, forceEvaluations: 0 };
  let steps = 0;
  for (let step = 0; step < stepCount; step += 1) {
    const result = stepIntegratorByKind(kind, state, parameters, deltaSeconds);
    if (result.forceEvaluations === 0) break;
    state = result.state;
    forceEvaluations += result.forceEvaluations;
    steps++;
  }
  return { state, steps, forceEvaluations };
}
