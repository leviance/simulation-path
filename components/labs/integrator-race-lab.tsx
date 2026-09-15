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
  analyticIntegratorState,
  integratorAngularFrequency,
  integratorEnergy,
  makeIntegratorRaceState,
  measureIntegratorState,
  planIntegratorFixedSteps,
  stepIntegratorRaceState,
  traceExplicitEulerStep,
  traceRungeKutta4Step,
  traceVelocityVerletStep,
  type IntegratorOscillatorParameters,
  type IntegratorOscillatorState,
  type IntegratorRaceState,
} from "@/lib/labs/integrator-race";
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
  grid: "#24324d",
  rail: "#66738c",
  exact: "#f5f7ff",
  euler: "#ff7b72",
  verlet: "#53f0ae",
  rk4: "#c792ea",
};

interface RaceHistorySample {
  time: number;
  exact: number;
  euler: number;
  verlet: number;
  rk4: number;
  eulerDrift: number;
  verletDrift: number;
  rk4Drift: number;
}

interface RaceViewState {
  race: IntegratorRaceState;
  lastStepStart: IntegratorRaceState | null;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  history: RaceHistorySample[];
}

function makeRaceView(initial: IntegratorOscillatorState): RaceViewState {
  return {
    race: makeIntegratorRaceState(initial),
    lastStepStart: null,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    history: [],
  };
}

function sampleRace(
  race: IntegratorRaceState,
  parameters: IntegratorOscillatorParameters,
): RaceHistorySample {
  const exact = analyticIntegratorState(race.initial, parameters, race.euler.state.elapsed);
  return {
    time: race.euler.state.elapsed,
    exact: exact.position,
    euler: race.euler.state.position,
    verlet: race.verlet.state.position,
    rk4: race.rk4.state.position,
    eulerDrift: measureIntegratorState(race.euler.state, race.initial, parameters)
      .relativeEnergyDrift,
    verletDrift: measureIntegratorState(race.verlet.state, race.initial, parameters)
      .relativeEnergyDrift,
    rk4Drift: measureIntegratorState(race.rk4.state, race.initial, parameters).relativeEnergyDrift,
  };
}

function appendRaceSample(
  history: RaceHistorySample[],
  race: IntegratorRaceState,
  parameters: IntegratorOscillatorParameters,
) {
  const last = history.at(-1);
  if (last && race.euler.state.elapsed - last.time < 0.04) return history;
  return [...history, sampleRace(race, parameters)].slice(-600);
}

function advanceRace(
  current: RaceViewState,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  parameters: IntegratorOscillatorParameters,
) {
  const plan = planIntegratorFixedSteps(
    current.accumulator,
    frameSeconds,
    fixedDeltaSeconds,
    16,
    0.1,
  );
  let race = current.race;
  let lastStepStart = current.lastStepStart;
  for (let step = 0; step < plan.steps; step += 1) {
    lastStepStart = race;
    race = stepIntegratorRaceState(race, parameters, fixedDeltaSeconds);
  }
  return {
    race,
    lastStepStart,
    accumulator: plan.remainder,
    droppedTime: current.droppedTime + plan.droppedTime,
    substeps: plan.steps,
    history: appendRaceSample(current.history, race, parameters),
  };
}

function positionToScreen(position: number, width: number) {
  const pixelsPerMeter = Math.max(38, Math.min(82, (width - 180) / 8));
  return width * 0.54 + position * pixelsPerMeter;
}

function screenToPosition(screenX: number, width: number) {
  const pixelsPerMeter = Math.max(38, Math.min(82, (width - 180) / 8));
  return (screenX - width * 0.54) / pixelsPerMeter;
}

function drawSpring(
  context: CanvasRenderingContext2D,
  wallX: number,
  massX: number,
  centerY: number,
  color: string,
) {
  const startX = wallX + 8;
  const endX = massX - 17;
  context.beginPath();
  context.moveTo(startX, centerY);
  for (let segment = 1; segment <= 12; segment += 1) {
    const x = startX + ((endX - startX) * segment) / 12;
    let y = centerY;
    if (segment < 12) y += segment % 2 === 0 ? -7 : 7;
    context.lineTo(x, y);
  }
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
}

function drawLane(
  context: CanvasRenderingContext2D,
  width: number,
  centerY: number,
  name: string,
  position: number,
  exactPosition: number,
  color: string,
  muted: boolean,
) {
  drawLine(context, { x: 22, y: centerY + 20 }, { x: width - 18, y: centerY + 20 }, COLORS.rail);
  const equilibriumX = positionToScreen(0, width);
  drawLine(
    context,
    { x: equilibriumX, y: centerY - 28 },
    { x: equilibriumX, y: centerY + 24 },
    COLORS.grid,
  );
  context.fillStyle = COLORS.rail;
  context.fillRect(28, centerY - 28, 8, 50);

  const massX = positionToScreen(position, width);
  drawSpring(context, 36, massX, centerY, muted ? COLORS.rail : color);
  context.globalAlpha = muted ? 0.35 : 1;
  context.fillStyle = color;
  context.fillRect(massX - 15, centerY - 15, 30, 30);
  context.globalAlpha = 1;

  const exactX = positionToScreen(exactPosition, width);
  context.strokeStyle = COLORS.exact;
  context.lineWidth = 2;
  context.strokeRect(exactX - 19, centerY - 19, 38, 38);
  context.fillStyle = color;
  context.font = "600 12px ui-monospace, monospace";
  context.fillText(name, 44, centerY - 24);
}

function graphValue(sample: RaceHistorySample, key: string) {
  if (key === "exact") return sample.exact;
  if (key === "euler") return sample.euler;
  if (key === "verlet") return sample.verlet;
  if (key === "rk4") return sample.rk4;
  if (key === "eulerDrift") return sample.eulerDrift;
  if (key === "verletDrift") return sample.verletDrift;
  return sample.rk4Drift;
}

function drawHistory(
  context: CanvasRenderingContext2D,
  history: RaceHistorySample[],
  key: string,
  color: string,
  bounds: { left: number; top: number; width: number; height: number },
  verticalScale: number,
) {
  if (history.length < 2) return;
  const firstTime = history[0].time;
  const lastTime = history.at(-1)?.time ?? firstTime + 1;
  const timeSpan = Math.max(1, lastTime - firstTime);
  context.beginPath();
  history.forEach((sample, index) => {
    const x = bounds.left + ((sample.time - firstTime) / timeSpan) * bounds.width;
    const y = bounds.top + bounds.height / 2 - graphValue(sample, key) * verticalScale;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = color;
  context.lineWidth = key === "exact" ? 1 : 2;
  context.stroke();
}

interface PhasePoint {
  label: string;
  state: IntegratorOscillatorState;
}

function drawPhaseInspector(
  context: CanvasRenderingContext2D,
  bounds: { left: number; top: number; width: number; height: number },
  points: PhasePoint[],
  initial: IntegratorOscillatorState,
  parameters: IntegratorOscillatorParameters,
  color: string,
) {
  const omega = integratorAngularFrequency(parameters);
  if (omega <= 0) return;

  const center = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
  const initialRadius = Math.hypot(initial.position, initial.velocity / omega);
  const pointRadius = Math.max(
    0,
    ...points.map((point) => Math.hypot(point.state.position, point.state.velocity / omega)),
  );
  const extent = Math.max(0.5, initialRadius, pointRadius) * 1.18;
  const scale = Math.min(bounds.width, bounds.height) / (2 * extent);
  const toCanvas = (state: IntegratorOscillatorState) => ({
    x: center.x + state.position * scale,
    y: center.y - (state.velocity / omega) * scale,
  });

  drawLine(
    context,
    { x: bounds.left, y: center.y },
    { x: bounds.left + bounds.width, y: center.y },
    COLORS.grid,
  );
  drawLine(
    context,
    { x: center.x, y: bounds.top },
    { x: center.x, y: bounds.top + bounds.height },
    COLORS.grid,
  );

  context.beginPath();
  context.arc(center.x, center.y, initialRadius * scale, 0, Math.PI * 2);
  context.strokeStyle = COLORS.exact;
  context.globalAlpha = 0.45;
  context.stroke();
  context.globalAlpha = 1;

  context.beginPath();
  points.forEach((point, index) => {
    const canvasPoint = toCanvas(point.state);
    if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y);
    else context.lineTo(canvasPoint.x, canvasPoint.y);
  });
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.stroke();

  context.font = "11px ui-monospace, monospace";
  for (const point of points) {
    const canvasPoint = toCanvas(point.state);
    context.beginPath();
    context.arc(canvasPoint.x, canvasPoint.y, 4, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.fillStyle = "#dce6f8";
    context.fillText(point.label, canvasPoint.x + 6, canvasPoint.y - 5);
  }

  context.fillStyle = "#aebbd2";
  context.fillText("x (m)", bounds.left + bounds.width - 38, center.y - 6);
  context.fillText("v / ω (m)", center.x + 7, bounds.top + 12);
}

function modeHighlight(mode?: InteractiveLabMode) {
  if (mode === "integrator-euler") return "euler";
  if (mode === "integrator-verlet") return "verlet";
  if (mode === "integrator-rk4") return "rk4";
  return "all";
}

export default function IntegratorRaceLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [initialPosition, setInitialPosition] = useState(2.5);
  const [stiffness, setStiffness] = useState(4);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 30);
  const [paused, setPaused] = useState(true);
  const [graph, setGraph] = useState(mode === "integrator-energy" ? "energy" : "position");
  const [capturing, setCapturing] = useState(false);
  const parameters = useMemo(() => ({ mass: 1, stiffness }), [stiffness]);
  const makeInitial = (position: number): IntegratorOscillatorState => ({
    position,
    velocity: 0,
    elapsed: 0,
  });
  const [view, setView] = useState<RaceViewState>(() => makeRaceView(makeInitial(2.5)));
  const dragging = useRef(false);

  const resetWith = (position = initialPosition) => {
    setView(makeRaceView(makeInitial(position)));
    setPaused(true);
  };

  const stepOnce = () => {
    setView((current) => {
      const race = stepIntegratorRaceState(current.race, parameters, fixedDeltaSeconds);
      return {
        ...current,
        race,
        lastStepStart: current.race,
        substeps: 1,
        history: appendRaceSample(current.history, race, parameters),
      };
    });
    setPaused(true);
  };

  const runFast = () => {
    setView((current) => {
      let race = current.race;
      let lastStepStart = current.lastStepStart;
      const steps = Math.round(20 / fixedDeltaSeconds);
      let history = current.history;
      for (let step = 0; step < steps; step += 1) {
        lastStepStart = race;
        race = stepIntegratorRaceState(race, parameters, fixedDeltaSeconds);
        if (step % Math.max(1, Math.floor(0.04 / fixedDeltaSeconds)) === 0) {
          history = appendRaceSample(history, race, parameters);
        }
      }
      return { ...current, race, lastStepStart, substeps: steps, history };
    });
    setPaused(true);
  };

  useEffect(() => {
    if (paused || reducedMotion) return;
    let request = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const frameSeconds = Math.max(0, (now - previous) / 1000);
      previous = now;
      setView((current) => advanceRace(current, frameSeconds, fixedDeltaSeconds, parameters));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [fixedDeltaSeconds, parameters, paused, reducedMotion]);

  const elapsed = view.race.euler.state.elapsed;
  const exact = analyticIntegratorState(view.race.initial, parameters, elapsed);
  const eulerMetrics = measureIntegratorState(view.race.euler.state, view.race.initial, parameters);
  const verletMetrics = measureIntegratorState(
    view.race.verlet.state,
    view.race.initial,
    parameters,
  );
  const rk4Metrics = measureIntegratorState(view.race.rk4.state, view.race.initial, parameters);
  const highlight = modeHighlight(mode);
  const traceStart = view.lastStepStart ?? view.race;
  const eulerTrace = traceExplicitEulerStep(traceStart.euler.state, parameters, fixedDeltaSeconds);
  const verletTrace = traceVelocityVerletStep(
    traceStart.verlet.state,
    parameters,
    fixedDeltaSeconds,
  );
  const rk4Trace = traceRungeKutta4Step(traceStart.rk4.state, parameters, fixedDeltaSeconds);
  const showsStepInspector =
    mode === "integrator-euler" || mode === "integrator-verlet" || mode === "integrator-rk4";

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    const raceBottom = Math.min(size.height * 0.61, 250);
    const laneGap = Math.max(64, raceBottom / 3);
    drawLane(
      context,
      size.width,
      46,
      "EULER",
      mode === "integrator-system" ? initialPosition : view.race.euler.state.position,
      exact.position,
      COLORS.euler,
      highlight !== "all" && highlight !== "euler",
    );
    drawLane(
      context,
      size.width,
      46 + laneGap,
      "VERLET",
      mode === "integrator-system" ? initialPosition : view.race.verlet.state.position,
      exact.position,
      COLORS.verlet,
      highlight !== "all" && highlight !== "verlet",
    );
    drawLane(
      context,
      size.width,
      46 + laneGap * 2,
      "RK4",
      mode === "integrator-system" ? initialPosition : view.race.rk4.state.position,
      exact.position,
      COLORS.rk4,
      highlight !== "all" && highlight !== "rk4",
    );

    const bounds = {
      left: 34,
      top: raceBottom + 20,
      width: size.width - 54,
      height: size.height - raceBottom - 34,
    };
    context.fillStyle = "#111a2c";
    context.fillRect(bounds.left - 10, bounds.top - 8, bounds.width + 18, bounds.height + 14);
    drawLine(
      context,
      { x: bounds.left, y: bounds.top + bounds.height / 2 },
      { x: bounds.left + bounds.width, y: bounds.top + bounds.height / 2 },
      COLORS.grid,
    );
    if (showsStepInspector) {
      let points: PhasePoint[] = [];
      let color = COLORS.euler;
      if (mode === "integrator-euler" && eulerTrace) {
        points = [
          { label: "yₙ", state: eulerTrace.current },
          { label: "yₙ₊₁", state: eulerTrace.next },
        ];
      } else if (mode === "integrator-verlet" && verletTrace) {
        color = COLORS.verlet;
        points = [
          { label: "yₙ", state: verletTrace.current },
          { label: "yₙ₊₁", state: verletTrace.next },
        ];
      } else if (mode === "integrator-rk4" && rk4Trace) {
        color = COLORS.rk4;
        points = [
          { label: "yₙ", state: rk4Trace.current },
          { label: "k₂", state: rk4Trace.stage2State },
          { label: "k₃", state: rk4Trace.stage3State },
          { label: "k₄", state: rk4Trace.stage4State },
          { label: "yₙ₊₁", state: rk4Trace.next },
        ];
      }
      drawPhaseInspector(context, bounds, points, view.race.initial, parameters, color);
    } else if (graph === "energy") {
      drawHistory(context, view.history, "eulerDrift", COLORS.euler, bounds, 80);
      drawHistory(context, view.history, "verletDrift", COLORS.verlet, bounds, 80);
      drawHistory(context, view.history, "rk4Drift", COLORS.rk4, bounds, 80);
    } else {
      const verticalScale = (bounds.height * 0.42) / Math.max(0.5, Math.abs(initialPosition));
      drawHistory(context, view.history, "exact", COLORS.exact, bounds, verticalScale);
      drawHistory(context, view.history, "euler", COLORS.euler, bounds, verticalScale);
      drawHistory(context, view.history, "verlet", COLORS.verlet, bounds, verticalScale);
      drawHistory(context, view.history, "rk4", COLORS.rk4, bounds, verticalScale);
    }
    context.fillStyle = "#aebbd2";
    context.font = "12px ui-monospace, monospace";
    if (!showsStepInspector) {
      context.fillText(
        graph === "energy" ? "relative energy drift" : "position (m)",
        bounds.left,
        bounds.top + 13,
      );
    }
  }, [
    eulerTrace,
    exact.position,
    graph,
    highlight,
    initialPosition,
    mode,
    parameters,
    rk4Trace,
    showsStepInspector,
    size,
    verletTrace,
    view,
  ]);

  const updateInitialFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const position = Math.max(-3.2, Math.min(3.2, screenToPosition(point.x, size.width)));
    setInitialPosition(position);
    setView(makeRaceView(makeInitial(position)));
    setPaused(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCapturing(true);
    updateInitialFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setCapturing(false);
  };

  const resetDefaults = () => {
    setInitialPosition(2.5);
    setStiffness(4);
    setFixedDeltaSeconds(1 / 30);
    setGraph("position");
    setView(makeRaceView(makeInitial(2.5)));
    setPaused(true);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && mode !== "integrator-system") stepOnce();
    if (event.key.toLowerCase() === "r") resetDefaults();
    if (
      event.key.toLowerCase() === "g" &&
      (mode === "integrator-energy" || mode === "integrator-validation")
    )
      setGraph((current) => (current === "energy" ? "position" : "energy"));
  };

  const showFixedDelta = mode !== "integrator-system";
  const showGraph = mode === "integrator-energy" || mode === "integrator-validation";
  const showSingleStep = mode !== "integrator-system";
  const showFastRun = mode === "integrator-energy" || mode === "integrator-validation";
  const formatState = (state: IntegratorOscillatorState) =>
    `x ${state.position.toFixed(5)} m · v ${state.velocity.toFixed(5)} m/s`;
  const formatDerivative = (positionRate: number, velocityRate: number) =>
    `(dx/dt ${positionRate.toFixed(5)} m/s · dv/dt ${velocityRate.toFixed(5)} m/s²)`;
  const formatPhaseSpaceError = (value: number) =>
    Number.isFinite(value) ? `${value.toFixed(5)} m` : "không áp dụng khi ω = 0";

  const readoutItems = [
    {
      label: "Hệ oscillator",
      value: `x₀ ${initialPosition.toFixed(2)} m · k ${stiffness.toFixed(0)} N/m · ω ${integratorAngularFrequency(parameters).toFixed(3)} rad/s`,
    },
    {
      label: "Elapsed / step",
      value: `${elapsed.toFixed(3)} s / ${view.race.stepCount}`,
    },
    {
      label: "Exact state",
      value: `${formatState(exact)} · E ${integratorEnergy(exact, parameters).toFixed(4)} J`,
    },
  ];

  if (mode === "integrator-system") {
    readoutItems.push({
      label: "Acceleration tại vị trí ban đầu",
      value: `${(-(stiffness / parameters.mass) * initialPosition).toFixed(5)} m/s²`,
    });
  }
  if (mode === "integrator-euler" && eulerTrace) {
    readoutItems.push(
      { label: "Euler · state đầu bước", value: formatState(eulerTrace.current) },
      {
        label: "Euler · acceleration đầu bước",
        value: `${eulerTrace.accelerationStart.toFixed(5)} m/s²`,
      },
      { label: "Euler · state cuối bước", value: formatState(eulerTrace.next) },
    );
  }
  if (mode === "integrator-verlet" && verletTrace) {
    readoutItems.push(
      {
        label: "Verlet · a₀ → x₁",
        value: `${verletTrace.accelerationStart.toFixed(5)} m/s² → ${verletTrace.positionEnd.toFixed(5)} m`,
      },
      {
        label: "Verlet · a₁ → v₁",
        value: `${verletTrace.accelerationEnd.toFixed(5)} m/s² → ${verletTrace.next.velocity.toFixed(5)} m/s`,
      },
      { label: "Verlet · state cuối bước", value: formatState(verletTrace.next) },
    );
  }
  if (mode === "integrator-rk4" && rk4Trace) {
    readoutItems.push(
      {
        label: "RK4 · k₁ tại yₙ",
        value: formatDerivative(rk4Trace.k1.positionRate, rk4Trace.k1.velocityRate),
      },
      {
        label: "RK4 · k₂ tại nửa bước",
        value: formatDerivative(rk4Trace.k2.positionRate, rk4Trace.k2.velocityRate),
      },
      {
        label: "RK4 · k₃ tại nửa bước",
        value: formatDerivative(rk4Trace.k3.positionRate, rk4Trace.k3.velocityRate),
      },
      {
        label: "RK4 · k₄ tại cuối bước",
        value: formatDerivative(rk4Trace.k4.positionRate, rk4Trace.k4.velocityRate),
      },
      { label: "RK4 · state cuối bước", value: formatState(rk4Trace.next) },
    );
  }

  const appendMetrics = (
    label: string,
    metrics: ReturnType<typeof measureIntegratorState>,
    evaluations: number,
  ) => {
    readoutItems.push({
      label,
      value: `phase-space ${formatPhaseSpaceError(metrics.phaseSpaceError)} · energy ${(100 * metrics.relativeEnergyDrift).toFixed(3)}% · ${evaluations} evaluations`,
    });
  };
  if (mode === "integrator-euler") {
    appendMetrics("Euler · error / cost", eulerMetrics, view.race.euler.forceEvaluations);
  } else if (mode === "integrator-verlet") {
    appendMetrics("Verlet · error / cost", verletMetrics, view.race.verlet.forceEvaluations);
  } else if (mode === "integrator-rk4") {
    appendMetrics("RK4 · error / cost", rk4Metrics, view.race.rk4.forceEvaluations);
  } else if (mode !== "integrator-system") {
    appendMetrics("Euler · error / cost", eulerMetrics, view.race.euler.forceEvaluations);
    appendMetrics("Verlet · error / cost", verletMetrics, view.race.verlet.forceEvaluations);
    appendMetrics("RK4 · error / cost", rk4Metrics, view.race.rk4.forceEvaluations);
    readoutItems.push({
      label: "Force evaluations",
      value: `${view.race.euler.forceEvaluations} / ${view.race.verlet.forceEvaluations} / ${view.race.rk4.forceEvaluations}`,
    });
  }
  readoutItems.push({
    label: "Frame guard / pointer capture",
    value: `${view.substeps} substep · ${view.droppedTime.toFixed(3)} s dropped · ${capturing ? "đang kéo" : "đã nhả"}`,
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Cuộc đua integrator với ba harmonic oscillator và exact ghost"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (dragging.current) updateInitialFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        <label>
          Initial amplitude
          <input
            type="range"
            min="-3.2"
            max="3.2"
            step="0.1"
            value={initialPosition}
            onChange={(event) => {
              const position = Number(event.target.value);
              setInitialPosition(position);
              resetWith(position);
            }}
          />
        </label>
        <label>
          Spring stiffness
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={stiffness}
            onChange={(event) => {
              setStiffness(Number(event.target.value));
              resetWith();
            }}
          />
        </label>
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
              <option value={1 / 15}>1/15 s</option>
              <option value={1 / 30}>1/30 s</option>
              <option value={1 / 60}>1/60 s</option>
              <option value={1 / 120}>1/120 s</option>
              <option value={1 / 240}>1/240 s</option>
            </select>
          </label>
        )}
        {showGraph && (
          <label>
            Graph
            <select value={graph} onChange={(event) => setGraph(event.target.value)}>
              <option value="position">Position</option>
              <option value="energy">Energy drift</option>
            </select>
          </label>
        )}
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        {showSingleStep && (
          <button type="button" onClick={stepOnce}>
            Tiến một bước
          </button>
        )}
        {showFastRun && (
          <button type="button" onClick={runFast}>
            Chạy nhanh 20 giây
          </button>
        )}
        <button type="button" onClick={resetDefaults}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={readoutItems} />
      <p className="lab-hint">
        Kéo khối để chọn x₀. Phím Space chạy/dừng, N tiến một bước, G đổi graph và R đặt lại. Khung
        trắng là nghiệm chính xác tại cùng elapsed time.
      </p>
    </>
  );
}
