import {
  INTEGRATOR_KINDS,
  analyticIntegratorState,
  makeIntegratorRaceState,
  measureIntegratorState,
  planIntegratorFixedSteps,
  stepIntegratorRaceState,
  type IntegratorKind,
  type IntegratorOscillatorParameters,
  type IntegratorOscillatorState,
  type IntegratorRaceState,
} from "./integrator-race.ts";
import { makeIntegratorBenchmark, type IntegratorBenchmarkJob } from "./integrator-benchmark.ts";

export const INTEGRATOR_STEP_SIZES = [0.25, 0.1, 1 / 15, 1 / 30, 1 / 60, 1 / 120, 1 / 240];
export const INTEGRATOR_HISTORY_LIMIT = 1201;
export type IntegratorGraph = "position" | "error" | "energy";
export interface IntegratorHistorySample {
  time: number;
  exactPosition: number;
  positions: number[];
  errors: number[];
  energies: number[];
}
export interface IntegratorScene {
  stage: number;
  parameters: IntegratorOscillatorParameters;
  initial: IntegratorOscillatorState;
  kinds: IntegratorKind[];
  race: IntegratorRaceState;
  beforeLast: IntegratorRaceState | null;
  dtIndex: number;
  elapsed: number;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  fastRemaining: number;
  paused: boolean;
  debug: boolean;
  graph: IntegratorGraph;
  warning: string;
  history: IntegratorHistorySample[];
  benchmark: IntegratorBenchmarkJob | null;
  showBenchmark: boolean;
}
export const integratorStage = (mode?: string) =>
  ({
    "integrator-system": 1,
    "integrator-euler": 2,
    "integrator-verlet": 3,
    "integrator-rk4": 4,
    "integrator-lockstep": 5,
    "integrator-energy": 6,
    "integrator-benchmark": 8,
    "integrator-validation": 7,
  })[mode ?? "integrator-benchmark"] ?? 8;
export const integratorFixedDelta = (scene: IntegratorScene) =>
  INTEGRATOR_STEP_SIZES[scene.dtIndex];

export function sampleIntegratorRace(scene: IntegratorScene): IntegratorHistorySample {
  const metrics = scene.race.lanes.map((lane) =>
    measureIntegratorState(lane.state, scene.initial, scene.parameters),
  );
  return {
    time: scene.elapsed,
    exactPosition: analyticIntegratorState(scene.initial, scene.parameters, scene.elapsed).position,
    positions: scene.race.lanes.map((lane) => lane.state.position),
    errors: metrics.map((m) => m.phaseSpaceError),
    energies: metrics.map((m) => m.relativeEnergyDrift),
  };
}
export function stopIntegratorJobs(scene: IntegratorScene): IntegratorScene {
  return {
    ...scene,
    paused: true,
    fastRemaining: 0,
    benchmark: scene.benchmark ? { ...scene.benchmark, running: false } : null,
  };
}
export function resetIntegratorExperiment(scene: IntegratorScene): IntegratorScene {
  const reset = {
    ...scene,
    race: makeIntegratorRaceState(scene.initial, scene.kinds),
    beforeLast: null,
    elapsed: 0,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    fastRemaining: 0,
    paused: true,
    warning: "",
    benchmark: null,
    showBenchmark: false,
    history: [],
  };
  return { ...reset, history: scene.stage >= 6 ? [sampleIntegratorRace(reset)] : [] };
}
export function makeIntegratorScene(stage = 8): IntegratorScene {
  const initial = { position: 2.5, velocity: 0, elapsed: 0 };
  return resetIntegratorExperiment({
    stage,
    initial,
    parameters: { mass: 1, stiffness: 4 },
    kinds: [...INTEGRATOR_KINDS],
    race: makeIntegratorRaceState(initial),
    beforeLast: null,
    dtIndex: 3,
    elapsed: 0,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    fastRemaining: 0,
    paused: true,
    debug: true,
    graph: "position",
    warning: "",
    history: [],
    benchmark: null,
    showBenchmark: false,
  });
}
export function advanceIntegratorSteps(scene: IntegratorScene, count: number): IntegratorScene {
  if (!Number.isInteger(count) || count < 1 || count > 256 || scene.warning) return scene;
  let next = scene;
  const history = [...scene.history];
  const dt = integratorFixedDelta(scene);
  for (let step = 0; step < count; step++) {
    const before = next.race;
    const race =
      scene.stage >= 2
        ? stepIntegratorRaceState(before, scene.parameters, dt, Math.min(3, scene.stage - 1))
        : before;
    if (scene.stage >= 2 && race === before)
      return {
        ...stopIntegratorJobs(next),
        warning: "Bước tính không hợp lệ; cả ba làn đã dừng.",
        history: history.slice(-INTEGRATOR_HISTORY_LIMIT),
      };
    next = {
      ...next,
      race,
      elapsed: next.elapsed + dt,
      substeps: next.substeps + 1,
      beforeLast: scene.stage >= 2 ? before : null,
    };
    if (scene.stage >= 6) history.push(sampleIntegratorRace(next));
    if (
      race.lanes.some(
        (lane) => Math.abs(lane.state.position) > 1e6 || Math.abs(lane.state.velocity) > 1e6,
      )
    )
      return {
        ...stopIntegratorJobs(next),
        warning:
          "State vượt giới hạn an toàn 10⁶. Giảm dt hoặc đặt lại; không clamp state để che phân kỳ.",
        history: history.slice(-INTEGRATOR_HISTORY_LIMIT),
      };
  }
  return { ...next, history: history.slice(-INTEGRATOR_HISTORY_LIMIT) };
}
export function advanceIntegratorFrame(
  scene: IntegratorScene,
  frameSeconds: number,
): IntegratorScene {
  if (!Number.isFinite(frameSeconds) || frameSeconds < 0) return scene;
  const current = { ...scene, substeps: 0 };
  if (current.fastRemaining > 0) {
    const count = Math.min(current.fastRemaining, 128);
    const next = advanceIntegratorSteps(current, count);
    return {
      ...next,
      fastRemaining: next.warning ? 0 : Math.max(0, current.fastRemaining - count),
    };
  }
  if (current.paused) return current;
  const plan = planIntegratorFixedSteps(
    current.accumulator,
    frameSeconds,
    integratorFixedDelta(current),
    32,
    0.1,
  );
  return advanceIntegratorSteps(
    {
      ...current,
      accumulator: plan.remainder,
      droppedTime: current.droppedTime + plan.droppedTime,
    },
    plan.steps,
  );
}
export function stepIntegratorScene(scene: IntegratorScene) {
  return advanceIntegratorSteps({ ...stopIntegratorJobs(scene), substeps: 0 }, 1);
}
export function requestIntegratorFast(scene: IntegratorScene) {
  if (scene.stage < 6 || scene.warning) return scene;
  return {
    ...stopIntegratorJobs(scene),
    fastRemaining: Math.round(20 / integratorFixedDelta(scene)),
  };
}
export function requestIntegratorBenchmark(scene: IntegratorScene, now: number) {
  if (scene.stage < 8) return scene;
  return {
    ...stopIntegratorJobs(scene),
    showBenchmark: true,
    benchmark: makeIntegratorBenchmark(
      {
        parameters: scene.parameters,
        initial: scene.initial,
        dt: integratorFixedDelta(scene),
        repetitions: 16,
        samples: 5,
      },
      now,
    ),
  };
}
export type IntegratorSetting = "position" | "velocity" | "mass" | "stiffness" | "dtIndex";
export function editIntegratorSetting(
  scene: IntegratorScene,
  key: IntegratorSetting,
  value: number,
): IntegratorScene {
  if (!Number.isFinite(value)) return scene;
  const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
  let changed = scene;
  if (key === "position")
    changed = { ...scene, initial: { ...scene.initial, position: clamp(value, -3.2, 3.2) } };
  if (key === "velocity")
    changed = { ...scene, initial: { ...scene.initial, velocity: clamp(value, -8, 8) } };
  if (key === "mass")
    changed = { ...scene, parameters: { ...scene.parameters, mass: clamp(value, 0.5, 4) } };
  if (key === "stiffness")
    changed = { ...scene, parameters: { ...scene.parameters, stiffness: clamp(value, 0, 64) } };
  if (key === "dtIndex")
    changed = { ...scene, dtIndex: clamp(Math.round(value), 0, INTEGRATOR_STEP_SIZES.length - 1) };
  return resetIntegratorExperiment(changed);
}
export function editIntegratorLane(
  scene: IntegratorScene,
  index: number,
  kind: IntegratorKind,
): IntegratorScene {
  if (
    scene.stage < 5 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > 2 ||
    !INTEGRATOR_KINDS.includes(kind)
  )
    return scene;
  const kinds = scene.kinds.map((old, lane) => (lane === index ? kind : old));
  return resetIntegratorExperiment({ ...scene, kinds });
}
export function integratorPreset(stage: number, index: number): IntegratorScene {
  let scene = makeIntegratorScene(stage);
  if (index === 1)
    scene = { ...scene, initial: { position: 1, velocity: 0, elapsed: 0 }, dtIndex: 1 };
  if (index === 2) scene = { ...scene, parameters: { mass: 1, stiffness: 16 }, dtIndex: 0 };
  return resetIntegratorExperiment(scene);
}
