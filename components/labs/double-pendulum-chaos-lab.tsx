"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  doublePendulumDerivative,
  doublePendulumEnergy,
  doublePendulumGeometry,
  makeDoublePendulumRace,
  measureDoublePendulumRace,
  planDoublePendulumFixedSteps,
  stepDoublePendulumRace,
  type DoublePendulumParameters,
  type DoublePendulumRace,
  type DoublePendulumState,
} from "@/lib/labs/double-pendulum-chaos";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const COLORS = {
  background: "#0b1020",
  grid: "#24324d",
  primary: "#61afef",
  perturbed: "#e06c75",
  reference: "#98c379",
  text: "#aebbd2",
  physical: "#c678dd",
  numerical: "#e5c07b",
};

interface ChaosHistorySample {
  elapsed: number;
  physical: number;
  numerical: number;
  energyDrift: number;
}

interface ChaosViewState {
  race: DoublePendulumRace;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  primaryTrail: Array<{ x: number; y: number }>;
  perturbedTrail: Array<{ x: number; y: number }>;
  history: ChaosHistorySample[];
}

interface PendulumView {
  scale: number;
  pivotX: number;
  pivotY: number;
  graphTop: number;
}

type ChaosPreset = "calm" | "chaotic" | "near-upright" | "custom";

const parameters: DoublePendulumParameters = {
  mass1: 1,
  mass2: 1,
  length1: 1,
  length2: 1,
  gravity: 9.81,
};

function stateForPreset(preset: ChaosPreset): DoublePendulumState {
  if (preset === "calm") {
    return { theta1: 0.6, omega1: 0, theta2: 0.8, omega2: 0, elapsed: 0 };
  }
  if (preset === "near-upright") {
    return {
      theta1: Math.PI - 0.08,
      omega1: 0,
      theta2: Math.PI - 0.16,
      omega2: 0,
      elapsed: 0,
    };
  }
  return { theta1: 2, omega1: 0, theta2: 1.1, omega2: 0, elapsed: 0 };
}

function makeViewState(initial: DoublePendulumState, perturbation: number): ChaosViewState {
  return {
    race: makeDoublePendulumRace(initial, perturbation),
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    primaryTrail: [],
    perturbedTrail: [],
    history: [],
  };
}

function appendSample(
  view: ChaosViewState,
  race: DoublePendulumRace,
  force = false,
): ChaosViewState {
  const last = view.history.at(-1);
  if (!force && last && race.primary.elapsed - last.elapsed < 0.04) return { ...view, race };
  const metrics = measureDoublePendulumRace(race, parameters);
  const primaryGeometry = doublePendulumGeometry(race.primary, parameters);
  const perturbedGeometry = doublePendulumGeometry(race.perturbed, parameters);
  return {
    ...view,
    race,
    primaryTrail: [...view.primaryTrail, primaryGeometry.bob2].slice(-500),
    perturbedTrail: [...view.perturbedTrail, perturbedGeometry.bob2].slice(-500),
    history: [
      ...view.history,
      {
        elapsed: race.primary.elapsed,
        physical: metrics.phaseSpaceSeparation,
        numerical: metrics.numericalSeparation,
        energyDrift: metrics.relativeEnergyDrift,
      },
    ].slice(-600),
  };
}

function advanceView(current: ChaosViewState, frameSeconds: number, fixedDeltaSeconds: number) {
  const plan = planDoublePendulumFixedSteps(
    current.accumulator,
    frameSeconds,
    fixedDeltaSeconds,
    24,
    0.1,
  );
  let next = current;
  let race = current.race;
  for (let step = 0; step < plan.steps; step += 1) {
    race = stepDoublePendulumRace(race, parameters, fixedDeltaSeconds);
    next = appendSample(next, race);
  }
  return {
    ...next,
    race,
    accumulator: plan.remainder,
    droppedTime: current.droppedTime + plan.droppedTime,
    substeps: plan.steps,
  };
}

function makePendulumView(width: number, height: number, showGraph: boolean): PendulumView {
  const graphHeight = showGraph ? Math.max(125, Math.min(175, height * 0.28)) : 0;
  const graphTop = height - graphHeight;
  const simulationHeight = showGraph ? graphTop : height;
  return {
    scale: Math.min(width * 0.17, simulationHeight * 0.22),
    pivotX: width * 0.5,
    pivotY: Math.max(52, simulationHeight * 0.14),
    graphTop,
  };
}

function worldToCanvas(point: { x: number; y: number }, view: PendulumView) {
  return { x: view.pivotX + point.x * view.scale, y: view.pivotY - point.y * view.scale };
}

function canvasToWorld(point: { x: number; y: number }, view: PendulumView) {
  return { x: (point.x - view.pivotX) / view.scale, y: (view.pivotY - point.y) / view.scale };
}

function drawCircle(
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  color: string,
) {
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
}

function drawPendulum(
  context: CanvasRenderingContext2D,
  state: DoublePendulumState,
  view: PendulumView,
  color: string,
  alpha = 1,
) {
  const geometry = doublePendulumGeometry(state, parameters);
  const pivot = worldToCanvas(geometry.pivot, view);
  const bob1 = worldToCanvas(geometry.bob1, view);
  const bob2 = worldToCanvas(geometry.bob2, view);
  context.save();
  context.globalAlpha = alpha;
  drawLine(context, pivot, bob1, color, 3);
  drawLine(context, bob1, bob2, color, 3);
  drawCircle(context, bob1, 8, color);
  drawCircle(context, bob2, 11, color);
  context.restore();
  drawCircle(context, pivot, 5, "#f5f7ff");
}

function drawTrail(
  context: CanvasRenderingContext2D,
  trail: Array<{ x: number; y: number }>,
  view: PendulumView,
  color: string,
) {
  if (trail.length < 2) return;
  context.beginPath();
  trail.forEach((point, index) => {
    const canvas = worldToCanvas(point, view);
    if (index === 0) context.moveTo(canvas.x, canvas.y);
    else context.lineTo(canvas.x, canvas.y);
  });
  context.strokeStyle = color;
  context.globalAlpha = 0.55;
  context.lineWidth = 1.5;
  context.stroke();
  context.globalAlpha = 1;
}

function drawAngleGuide(
  context: CanvasRenderingContext2D,
  state: DoublePendulumState,
  view: PendulumView,
) {
  const geometry = doublePendulumGeometry(state, parameters);
  const pivot = worldToCanvas(geometry.pivot, view);
  const bob1 = worldToCanvas(geometry.bob1, view);
  drawLine(context, pivot, { x: pivot.x, y: pivot.y + view.scale * 0.62 }, COLORS.grid, 1);
  drawLine(context, bob1, { x: bob1.x, y: bob1.y + view.scale * 0.62 }, COLORS.grid, 1);
  context.fillStyle = COLORS.text;
  context.font = "12px ui-monospace, monospace";
  context.fillText(`θ₁ ${state.theta1.toFixed(3)} rad`, pivot.x + 12, pivot.y + 20);
  context.fillText(`θ₂ ${state.theta2.toFixed(3)} rad`, bob1.x + 12, bob1.y + 20);
}

function drawGraph(
  context: CanvasRenderingContext2D,
  history: ChaosHistorySample[],
  width: number,
  height: number,
  view: PendulumView,
  graph: "energy" | "separation",
  showNumerical: boolean,
) {
  const left = 36;
  const right = width - 20;
  const top = view.graphTop + 18;
  const bottom = height - 24;
  context.fillStyle = "#111a2c";
  context.fillRect(12, view.graphTop + 4, width - 24, height - view.graphTop - 12);
  drawLine(context, { x: left, y: top }, { x: left, y: bottom }, COLORS.grid);
  drawLine(context, { x: left, y: bottom }, { x: right, y: bottom }, COLORS.grid);
  context.fillStyle = COLORS.text;
  context.font = "11px ui-monospace, monospace";
  context.fillText(
    graph === "energy" ? "relative energy drift" : "log10 phase-space separation",
    left + 6,
    top + 12,
  );
  if (history.length < 2) return;

  const drawSeries = (key: "physical" | "numerical" | "energyDrift", color: string) => {
    context.beginPath();
    history.forEach((sample, index) => {
      const x = left + (index / Math.max(1, history.length - 1)) * (right - left);
      let normalized = 0.5;
      if (graph === "energy") {
        normalized = Math.max(0, Math.min(1, 0.5 - sample.energyDrift * 200));
      } else {
        const value = Math.max(sample[key], 1e-12);
        normalized = 1 - Math.max(0, Math.min(1, (Math.log10(value) + 12) / 13));
      }
      const y = top + normalized * (bottom - top);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  };
  if (graph === "energy") {
    drawSeries("energyDrift", COLORS.primary);
  } else {
    drawSeries("physical", COLORS.physical);
    if (showNumerical) drawSeries("numerical", COLORS.numerical);
  }
}

export default function DoublePendulumChaosLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [preset, setPreset] = useState<ChaosPreset>("chaotic");
  const [initialState, setInitialState] = useState<DoublePendulumState>(() =>
    stateForPreset("chaotic"),
  );
  const [perturbation, setPerturbation] = useState(1e-4);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 240);
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const [viewState, setViewState] = useState<ChaosViewState>(() =>
    makeViewState(stateForPreset("chaotic"), 1e-4),
  );

  const showsSimulation =
    mode === "chaos-rk4" ||
    mode === "chaos-twins" ||
    mode === "chaos-separation" ||
    mode === "chaos-shadow" ||
    mode === "chaos-validation" ||
    !mode;
  const showsTwins =
    mode === "chaos-twins" ||
    mode === "chaos-separation" ||
    mode === "chaos-shadow" ||
    mode === "chaos-validation" ||
    !mode;
  const showsShadow = mode === "chaos-shadow" || mode === "chaos-validation" || !mode;
  const showsGraph =
    mode === "chaos-rk4" ||
    mode === "chaos-separation" ||
    mode === "chaos-shadow" ||
    mode === "chaos-validation" ||
    !mode;
  const graphKind = mode === "chaos-rk4" ? "energy" : "separation";
  const view = useMemo(
    () => makePendulumView(size.width, size.height, showsGraph),
    [showsGraph, size.height, size.width],
  );

  const resetWith = (
    state = initialState,
    epsilon = perturbation,
    preservePointerCapture = false,
  ) => {
    const canvas = canvasRef.current;
    if (
      !preservePointerCapture &&
      canvas !== null &&
      activePointerId.current !== null &&
      canvas.hasPointerCapture(activePointerId.current)
    ) {
      canvas.releasePointerCapture(activePointerId.current);
      activePointerId.current = null;
    }
    setViewState(makeViewState(state, epsilon));
    setPaused(true);
    if (!preservePointerCapture) setCapturing(false);
  };

  const changeInitial = (change: Partial<DoublePendulumState>, preservePointerCapture = false) => {
    const state = { ...initialState, ...change, elapsed: 0 };
    setInitialState(state);
    setPreset("custom");
    resetWith(state, perturbation, preservePointerCapture);
  };

  const changePreset = (nextPreset: ChaosPreset) => {
    const state = stateForPreset(nextPreset);
    setPreset(nextPreset);
    setInitialState(state);
    resetWith(state);
  };

  const stepOnce = () => {
    setViewState((current) => {
      const race = stepDoublePendulumRace(current.race, parameters, fixedDeltaSeconds);
      return { ...appendSample(current, race, true), substeps: 1 };
    });
    setPaused(true);
  };

  const runFast = () => {
    setViewState((current) => {
      let next = current;
      let race = current.race;
      const steps = Math.round(30 / fixedDeltaSeconds);
      let executedSteps = 0;
      for (let step = 0; step < steps; step += 1) {
        race = stepDoublePendulumRace(race, parameters, fixedDeltaSeconds);
        executedSteps += 1;
        if (step % Math.max(1, Math.floor(0.04 / fixedDeltaSeconds)) === 0) {
          next = appendSample(next, race, true);
        }
        if (!measureDoublePendulumRace(race, parameters).finite) break;
      }
      return { ...next, race, substeps: executedSteps };
    });
    setPaused(true);
  };

  useEffect(() => {
    if (!showsSimulation || paused || reducedMotion) return;
    let request = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const frameSeconds = Math.max(0, (now - previous) / 1000);
      previous = now;
      setViewState((current) => advanceView(current, frameSeconds, fixedDeltaSeconds));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [fixedDeltaSeconds, paused, reducedMotion, showsSimulation]);

  const displayPrimary = showsSimulation ? viewState.race.primary : initialState;
  const metrics = measureDoublePendulumRace(viewState.race, parameters);
  const derivative = doublePendulumDerivative(initialState, parameters);
  const geometry = doublePendulumGeometry(displayPrimary, parameters);
  const energy = doublePendulumEnergy(displayPrimary, parameters);
  const initialEnergy = doublePendulumEnergy(viewState.race.initialPrimary, parameters);
  const sharedDenominator =
    2 * parameters.mass1 +
    parameters.mass2 -
    parameters.mass2 * Math.cos(2 * initialState.theta1 - 2 * initialState.theta2);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = COLORS.background;
    context.fillRect(0, 0, size.width, size.height);
    drawLine(
      context,
      { x: 22, y: view.pivotY },
      { x: size.width - 22, y: view.pivotY },
      COLORS.grid,
    );
    if (showsTwins) {
      drawTrail(context, viewState.primaryTrail, view, COLORS.primary);
      drawTrail(context, viewState.perturbedTrail, view, COLORS.perturbed);
    }
    if (showsShadow) {
      drawPendulum(context, viewState.race.halfStepReference, view, COLORS.reference, 0.42);
    }
    if (showsTwins) {
      drawPendulum(context, viewState.race.perturbed, view, COLORS.perturbed, 0.8);
    }
    drawPendulum(context, displayPrimary, view, COLORS.primary);
    if (mode === "chaos-geometry" || mode === "chaos-derivative") {
      drawAngleGuide(context, initialState, view);
    }
    if (showsGraph) {
      drawGraph(context, viewState.history, size.width, size.height, view, graphKind, showsShadow);
    }
  }, [
    displayPrimary,
    graphKind,
    initialState,
    mode,
    showsGraph,
    showsShadow,
    showsTwins,
    size,
    view,
    viewState,
  ]);

  const updateTheta2FromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pointer = canvasToWorld(canvasPoint(event, canvas), view);
    const initialGeometry = doublePendulumGeometry(initialState, parameters);
    const delta = {
      x: pointer.x - initialGeometry.bob1.x,
      y: pointer.y - initialGeometry.bob1.y,
    };
    if (Math.hypot(delta.x, delta.y) <= 0.1) return;
    changeInitial({ theta2: Math.atan2(delta.x, -delta.y) }, true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    setCapturing(true);
    updateTheta2FromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerId.current = null;
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " " && showsSimulation) {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && showsSimulation) stepOnce();
    if (event.key.toLowerCase() === "r") resetWith();
    if (event.key.toLowerCase() === "p") {
      if (preset === "calm") changePreset("chaotic");
      else if (preset === "chaotic") changePreset("near-upright");
      else changePreset("calm");
    }
  };

  const readoutItems = [
    {
      label: "Initial state",
      value: `θ₁ ${initialState.theta1.toFixed(5)} · ω₁ ${initialState.omega1.toFixed(5)} · θ₂ ${initialState.theta2.toFixed(5)} · ω₂ ${initialState.omega2.toFixed(5)}`,
    },
  ];
  if (mode === "chaos-geometry") {
    readoutItems.push(
      {
        label: "Bob 1 / Bob 2",
        value: `(${geometry.bob1.x.toFixed(4)}, ${geometry.bob1.y.toFixed(4)}) / (${geometry.bob2.x.toFixed(4)}, ${geometry.bob2.y.toFixed(4)}) m`,
      },
      {
        label: "Rod lengths",
        value: `${Math.hypot(geometry.bob1.x, geometry.bob1.y).toFixed(5)} / ${Math.hypot(geometry.bob2.x - geometry.bob1.x, geometry.bob2.y - geometry.bob1.y).toFixed(5)} m`,
      },
    );
  }
  if (mode === "chaos-derivative") {
    readoutItems.push(
      {
        label: "Δθ / shared denominator",
        value: `${(initialState.theta1 - initialState.theta2).toFixed(5)} rad / ${sharedDenominator.toFixed(5)}`,
      },
      {
        label: "α₁ / α₂",
        value: derivative
          ? `${derivative.omega1Rate.toFixed(6)} / ${derivative.omega2Rate.toFixed(6)} rad/s²`
          : "state không hợp lệ",
      },
    );
  }
  if (showsSimulation) {
    readoutItems.push(
      {
        label: "Elapsed / steps",
        value: `${viewState.race.primary.elapsed.toFixed(3)} s / ${viewState.race.stepCount}`,
      },
      {
        label: "Energy / relative drift",
        value: `${energy.toFixed(6)} J / ${(100 * ((energy - initialEnergy) / Math.max(Math.abs(initialEnergy), 1e-12))).toFixed(6)}%`,
      },
    );
  }
  if (showsTwins) {
    readoutItems.push(
      {
        label: "Phase-space / bob separation",
        value: `${metrics.phaseSpaceSeparation.toExponential(5)} / ${metrics.secondBobSeparation.toExponential(5)} m`,
      },
      {
        label: "Finite-time exponent",
        value: Number.isFinite(metrics.finiteTimeExponent)
          ? `${metrics.finiteTimeExponent.toFixed(5)} 1/s`
          : "chưa đủ thời gian hoặc separation bằng zero",
      },
    );
  }
  if (showsShadow) {
    readoutItems.push({
      label: "Numerical shadow separation",
      value: `${metrics.numericalSeparation.toExponential(5)} · ${metrics.numericalSeparation < metrics.phaseSpaceSeparation ? "nhỏ hơn intentional separation" : "đang lấn át intentional separation"}`,
    });
  }
  readoutItems.push(
    {
      label: "Finite / frame guard / pointer",
      value: `${metrics.finite ? "yes" : "NO"} / ${viewState.droppedTime.toFixed(3)} s dropped / ${capturing ? "đang kéo" : "đã nhả"}`,
    },
    {
      label: "Mô tả thay thế",
      value: showsTwins
        ? `Hai double pendulum lệch ban đầu ${perturbation.toExponential(1)} rad; đường tím đo separation vật lý${showsShadow ? ", đường vàng đo sai khác dt với hai half-step" : ""}.`
        : "Hai thanh dài một mét; góc được đo từ phương thẳng đứng hướng xuống.",
    },
  );

  const showAngleControls =
    mode === "chaos-geometry" || mode === "chaos-derivative" || mode === "chaos-validation";
  const showOmegaControls = mode === "chaos-derivative";
  const showPerturbation = showsTwins;
  const showFixedDelta = mode === "chaos-rk4" || showsShadow;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Hai double pendulum gần nhau với trail và đồ thị separation"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) updateTheta2FromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        {(mode === "chaos-twins" || mode === "chaos-validation" || !mode) && (
          <label>
            Preset
            <select
              value={preset}
              onChange={(event) => changePreset(event.target.value as ChaosPreset)}
            >
              <option value="calm">Calm</option>
              <option value="chaotic">Chaotic</option>
              <option value="near-upright">Near upright</option>
              <option value="custom" disabled>
                Tự chỉnh
              </option>
            </select>
          </label>
        )}
        {showAngleControls && (
          <label>
            Theta 1
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.01"
              value={initialState.theta1}
              onChange={(event) => changeInitial({ theta1: Number(event.target.value) })}
            />
          </label>
        )}
        {showAngleControls && (
          <label>
            Theta 2
            <input
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step="0.01"
              value={initialState.theta2}
              onChange={(event) => changeInitial({ theta2: Number(event.target.value) })}
            />
          </label>
        )}
        {showOmegaControls && (
          <label>
            Omega 1
            <input
              type="range"
              min="-4"
              max="4"
              step="0.05"
              value={initialState.omega1}
              onChange={(event) => changeInitial({ omega1: Number(event.target.value) })}
            />
          </label>
        )}
        {showOmegaControls && (
          <label>
            Omega 2
            <input
              type="range"
              min="-4"
              max="4"
              step="0.05"
              value={initialState.omega2}
              onChange={(event) => changeInitial({ omega2: Number(event.target.value) })}
            />
          </label>
        )}
        {showPerturbation && (
          <label>
            Perturbation
            <select
              value={perturbation}
              onChange={(event) => {
                const epsilon = Number(event.target.value);
                setPerturbation(epsilon);
                resetWith(initialState, epsilon);
              }}
            >
              <option value={1e-6}>1e-6 rad</option>
              <option value={1e-4}>1e-4 rad</option>
              <option value={1e-2}>1e-2 rad</option>
            </select>
          </label>
        )}
        {showFixedDelta && (
          <label>
            Fixed dt
            <select
              value={fixedDeltaSeconds}
              onChange={(event) => {
                setFixedDeltaSeconds(Number(event.target.value));
                resetWith();
              }}
            >
              <option value={1 / 120}>1/120 s</option>
              <option value={1 / 240}>1/240 s</option>
              <option value={1 / 480}>1/480 s</option>
              <option value={1 / 960}>1/960 s</option>
            </select>
          </label>
        )}
        {showsSimulation && (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showsSimulation && (
          <button type="button" onClick={stepOnce}>
            Tiến một bước
          </button>
        )}
        {(mode === "chaos-shadow" || mode === "chaos-validation" || !mode) && (
          <button type="button" onClick={runFast}>
            Chạy nhanh 30 giây
          </button>
        )}
        <button type="button" onClick={() => resetWith()}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={readoutItems} />
      <p className="lab-hint">
        Kéo bob thứ hai để đặt lại theta2. Space chạy/dừng, N tiến một fixed step, P đổi preset và R
        reset. Reduced motion giữ mô phỏng paused cho tới khi bạn chủ động chạy.
      </p>
    </>
  );
}
