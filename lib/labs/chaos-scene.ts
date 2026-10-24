import {
  doublePendulumGeometry,
  doublePendulumDerivative,
  doublePendulumEnergy,
  doublePendulumPhaseSpaceSeparation,
  doublePendulumSecondBobSeparation,
  finiteDoublePendulumState,
  validDoublePendulumParameters,
  samePendulumTime,
  makeDoublePendulumRace,
  stepDoublePendulumRace,
  stepDoublePendulumRk4,
  planDoublePendulumFixedSteps,
  wrapPendulumAngle,
  type DoublePendulumState,
  type DoublePendulumParameters,
  type DoublePendulumRace,
} from "./double-pendulum-chaos.ts";

export const CHAOS_STEPS = [1 / 30, 1 / 60, 1 / 120, 1 / 240, 1 / 480, 1 / 960];
const MODES = [
  "chaos-geometry",
  "chaos-derivative",
  "chaos-rk4",
  "chaos-twins",
  "chaos-separation",
  "chaos-shadow",
  "chaos-validation",
];
export const CHAOS_PARAMETERS: DoublePendulumParameters = {
  mass1: 1,
  mass2: 1,
  length1: 1,
  length2: 1,
  gravity: 9.81,
};
export type ChaosPreset = "calm" | "chaotic" | "near-upright" | "custom";
export interface ChaosPoint {
  x: number;
  y: number;
}
export interface ChaosSample {
  time: number;
  physical: number;
  numerical: number;
  energyErrors: number[];
}
export interface ChaosMetrics {
  energyA: number;
  energyB: number;
  energyReference: number;
  energyErrors: number[];
  phase: number;
  bobDistance: number;
  numerical: number;
  exponent: number;
  finite: boolean;
}
export interface ChaosScene {
  stage: number;
  preset: ChaosPreset;
  parameters: DoublePendulumParameters;
  initial: DoublePendulumState;
  epsilon: number;
  dtIndex: number;
  paused: boolean;
  debug: boolean;
  race: DoublePendulumRace;
  metrics: ChaosMetrics;
  maximumEnergyErrors: number[];
  history: ChaosSample[];
  trailA: ChaosPoint[];
  trailB: ChaosPoint[];
  accumulator: number;
  droppedTime: number;
  substeps: number;
  fastRemaining: number;
  dragOffset: number | null;
  message: string;
}
export function chaosStage(mode?: string) {
  const index = MODES.indexOf(mode ?? "");
  return index < 0 ? 7 : index + 1;
}
export function chaosInitial(preset: ChaosPreset): DoublePendulumState {
  if (preset === "calm") return { theta1: 0.2, omega1: 0, theta2: 0.3, omega2: 0, elapsed: 0 };
  if (preset === "near-upright")
    return { theta1: Math.PI - 0.08, omega1: 0, theta2: Math.PI - 0.16, omega2: 0, elapsed: 0 };
  return { theta1: 2, omega1: 0, theta2: 1.1, omega2: 0, elapsed: 0 };
}
export function chaosMetrics(s: ChaosScene): ChaosMetrics {
  const {
    primary: a,
    perturbed: b,
    halfStepReference: r,
    initialPrimary: a0,
    initialPerturbed: b0,
  } = s.race;
  const p = s.parameters;
  const energyA = doublePendulumEnergy(a, p),
    energyB = doublePendulumEnergy(b, p),
    energyReference = doublePendulumEnergy(r, p);
  const e0 = doublePendulumEnergy(a0, p),
    eB0 = doublePendulumEnergy(b0, p);
  const energyErrors = [energyA - e0, energyB - eB0, energyReference - e0];
  const phase = s.stage >= 5 ? doublePendulumPhaseSpaceSeparation(a, b, p) : 0;
  const bobDistance = s.stage >= 5 ? doublePendulumSecondBobSeparation(a, b, p) : 0;
  const numerical = s.stage >= 6 ? doublePendulumPhaseSpaceSeparation(a, r, p) : 0;
  const d0 = s.stage >= 5 ? doublePendulumPhaseSpaceSeparation(a0, b0, p) : 0;
  const duration = a.elapsed - a0.elapsed;
  const exponent =
    duration > 0 && d0 > 0 && phase > 0 ? (Math.log(phase) - Math.log(d0)) / duration : Number.NaN;
  const states = [a, ...(s.stage >= 4 ? [b] : []), ...(s.stage >= 6 ? [r] : [])];
  const finite =
    validDoublePendulumParameters(p) &&
    states.every(
      (st) => finiteDoublePendulumState(st) && samePendulumTime(st.elapsed, a.elapsed),
    ) &&
    energyErrors.slice(0, states.length).every(Number.isFinite) &&
    Number.isFinite(phase) &&
    Number.isFinite(numerical) &&
    Number.isFinite(bobDistance);
  return {
    energyA,
    energyB,
    energyReference,
    energyErrors,
    phase,
    bobDistance,
    numerical,
    exponent,
    finite,
  };
}
export function recordChaosHistory(s: ChaosScene, force = false): ChaosScene {
  if (s.stage < 3) return s;
  const time = s.race.primary.elapsed,
    last = s.history.at(-1);
  if (last && (time - last.time <= 1e-12 || (!force && time - last.time < 0.04 - 1e-12))) return s;
  return {
    ...s,
    history: [
      ...s.history,
      {
        time,
        physical: s.metrics.phase,
        numerical: s.metrics.numerical,
        energyErrors: [...s.metrics.energyErrors],
      },
    ].slice(-751),
    trailA:
      s.stage >= 4
        ? [...s.trailA, doublePendulumGeometry(s.race.primary, s.parameters).bob2].slice(-751)
        : [],
    trailB:
      s.stage >= 4
        ? [...s.trailB, doublePendulumGeometry(s.race.perturbed, s.parameters).bob2].slice(-751)
        : [],
  };
}
export function stopChaos(s: ChaosScene): ChaosScene {
  return { ...s, paused: true, accumulator: 0, substeps: 0, fastRemaining: 0, dragOffset: null };
}
export function resetChaos(s: ChaosScene): ChaosScene {
  const initial = { ...s.initial, elapsed: 0 };
  const next = {
    ...stopChaos(s),
    initial,
    race: makeDoublePendulumRace(initial, s.epsilon),
    history: [],
    trailA: [],
    trailB: [],
    droppedTime: 0,
    maximumEnergyErrors: [0, 0, 0],
    message: "",
  };
  next.metrics = chaosMetrics(next);
  return recordChaosHistory(next, true);
}
export function makeChaosScene(stage = 7): ChaosScene {
  const initial = chaosInitial("chaotic");
  const s: ChaosScene = {
    stage,
    preset: "chaotic",
    parameters: { ...CHAOS_PARAMETERS },
    initial,
    epsilon: 1e-4,
    dtIndex: 3,
    paused: true,
    debug: true,
    race: makeDoublePendulumRace(initial, 1e-4),
    metrics: {} as ChaosMetrics,
    maximumEnergyErrors: [0, 0, 0],
    history: [],
    trailA: [],
    trailB: [],
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    fastRemaining: 0,
    dragOffset: null,
    message: "",
  };
  return resetChaos(s);
}
export type ChaosSetting = "theta1" | "theta2" | "omega1" | "omega2" | "epsilon" | "dtIndex";
export function editChaos(s: ChaosScene, key: ChaosSetting, value: number): ChaosScene {
  if (!Number.isFinite(value)) return s;
  if (key === "epsilon")
    return s.stage >= 4 && (value === 0 || (value >= 1e-8 && value <= 1e-2))
      ? resetChaos({ ...s, epsilon: value })
      : s;
  if (key === "dtIndex")
    return s.stage >= 3 && Number.isInteger(value) && value >= 0 && value < CHAOS_STEPS.length
      ? resetChaos({ ...s, dtIndex: value })
      : s;
  if ((key === "omega1" || key === "omega2") && (s.stage !== 2 || Math.abs(value) > 4)) return s;
  if ((key === "theta1" || key === "theta2") && Math.abs(value) > Math.PI) return s;
  return resetChaos({ ...s, preset: "custom", initial: { ...s.initial, [key]: value } });
}
export function chooseChaosPreset(s: ChaosScene, preset: ChaosPreset): ChaosScene {
  return s.stage >= 7 && ["calm", "chaotic", "near-upright"].includes(preset)
    ? resetChaos({ ...s, preset, initial: chaosInitial(preset) })
    : s;
}
function safeState(s: DoublePendulumState) {
  return finiteDoublePendulumState(s) && Math.abs(s.omega1) <= 10000 && Math.abs(s.omega2) <= 10000;
}
function tickChaos(s: ChaosScene): ChaosScene {
  if (s.stage < 3) return s;
  const dt = CHAOS_STEPS[s.dtIndex];
  if (!Number.isFinite(dt)) return { ...stopChaos(s), message: "Cấu hình fixed dt không hợp lệ." };
  let race = s.race;
  if (s.stage >= 6) race = stepDoublePendulumRace(s.race, s.parameters, dt);
  else {
    const primary = stepDoublePendulumRk4(s.race.primary, s.parameters, dt);
    const perturbed =
      s.stage >= 4 ? stepDoublePendulumRk4(s.race.perturbed, s.parameters, dt) : s.race.perturbed;
    if (primary && perturbed)
      race = { ...s.race, primary, perturbed, stepCount: s.race.stepCount + 1 };
  }
  const next = { ...s, race, substeps: s.substeps + 1 };
  next.metrics = chaosMetrics(next);
  const states = [
    race.primary,
    ...(s.stage >= 4 ? [race.perturbed] : []),
    ...(s.stage >= 6 ? [race.halfStepReference] : []),
  ];
  if (race.stepCount !== s.race.stepCount + 1 || !next.metrics.finite || !states.every(safeState))
    return {
      ...stopChaos(s),
      substeps: s.substeps,
      message:
        "Thí nghiệm đã dừng: bước không hợp lệ, không hữu hạn hoặc vượt giới hạn an toàn. Giảm dt/đặt lại; solver không clamp state.",
    };
  next.maximumEnergyErrors = s.maximumEnergyErrors.map((v, i) =>
    Math.max(v, Math.abs(next.metrics.energyErrors[i])),
  );
  return recordChaosHistory(next);
}
export function singleChaosStep(s: ChaosScene): ChaosScene {
  return s.stage >= 3 ? recordChaosHistory(tickChaos(stopChaos(s)), true) : s;
}
export function requestChaosFast(s: ChaosScene, duration = 30): ChaosScene {
  const dt = CHAOS_STEPS[s.dtIndex];
  if (
    s.stage < 6 ||
    !Number.isFinite(dt) ||
    s.dragOffset !== null ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 30
  )
    return s;
  return { ...stopChaos(s), fastRemaining: Math.round(duration / dt) };
}
export function advanceChaosFrame(s: ChaosScene, frameSeconds: number): ChaosScene {
  if (s.stage < 3) return s;
  if (!Number.isFinite(CHAOS_STEPS[s.dtIndex]))
    return { ...stopChaos(s), message: "Cấu hình fixed dt không hợp lệ." };
  let next = { ...s, substeps: 0 };
  if (s.fastRemaining > 0) {
    for (let i = 0; i < Math.min(32, s.fastRemaining); i++) {
      const before = next.race.stepCount;
      next = tickChaos(next);
      if (next.race.stepCount === before) return next;
      next = { ...next, fastRemaining: next.fastRemaining - 1 };
    }
    return next.fastRemaining === 0 ? recordChaosHistory(next, true) : next;
  }
  if (s.paused) return next;
  const plan = planDoublePendulumFixedSteps(
    s.accumulator,
    frameSeconds,
    CHAOS_STEPS[s.dtIndex],
    32,
    0.1,
  );
  next = { ...next, accumulator: plan.remainder, droppedTime: s.droppedTime + plan.droppedTime };
  for (let i = 0; i < plan.steps; i++) {
    const before = next.race.stepCount;
    next = tickChaos(next);
    if (next.race.stepCount === before) break;
  }
  return next;
}
export function beginChaosDrag(
  s: ChaosScene,
  pointer: ChaosPoint,
  hitRadius: number,
): ChaosScene | null {
  if (
    s.stage < 7 ||
    s.dragOffset !== null ||
    ![pointer.x, pointer.y, hitRadius].every(Number.isFinite) ||
    hitRadius <= 0
  )
    return null;
  const geometry = doublePendulumGeometry(s.race.primary, s.parameters);
  if (Math.hypot(pointer.x - geometry.bob2.x, pointer.y - geometry.bob2.y) > hitRadius) return null;
  const dx = pointer.x - geometry.bob1.x,
    dy = pointer.y - geometry.bob1.y;
  if (Math.hypot(dx, dy) <= 1e-12) return null;
  const initial = {
    ...s.race.primary,
    theta1: wrapPendulumAngle(s.race.primary.theta1),
    theta2: wrapPendulumAngle(s.race.primary.theta2),
    omega1: 0,
    omega2: 0,
    elapsed: 0,
  };
  const dragOffset = initial.theta2 - Math.atan2(dx, -dy);
  return {
    ...resetChaos({ ...s, preset: "custom", initial }),
    dragOffset,
    message: "Đặt lại góc ban đầu, không tác động lực lên hệ đang chạy.",
  };
}
export function moveChaosDrag(s: ChaosScene, pointer: ChaosPoint): ChaosScene {
  if (s.dragOffset === null || ![pointer.x, pointer.y].every(Number.isFinite)) return s;
  const geometry = doublePendulumGeometry(s.initial, s.parameters);
  const dx = pointer.x - geometry.bob1.x,
    dy = pointer.y - geometry.bob1.y;
  if (Math.hypot(dx, dy) <= 0.1) return s;
  const theta2 = wrapPendulumAngle(Math.atan2(dx, -dy) + s.dragOffset);
  return {
    ...resetChaos({ ...s, initial: { ...s.initial, theta2 } }),
    dragOffset: s.dragOffset,
    message: "Đang đặt theta2 ban đầu; thả rồi bấm Tiếp tục.",
  };
}
export function endChaosDrag(s: ChaosScene): ChaosScene {
  return { ...s, dragOffset: null };
}
export function chaosDerivative(s: ChaosScene) {
  return doublePendulumDerivative(s.initial, s.parameters);
}
