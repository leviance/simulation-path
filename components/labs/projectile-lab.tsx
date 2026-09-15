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
  PROJECTILE_GRAVITY,
  analyticProjectilePosition,
  compareProjectileState,
  explicitEulerProjectileStepToGround,
  launchProjectileState,
  planProjectileFixedSteps,
  projectileAdd,
  projectileAimFromScreenDrag,
  projectileTimeToApex,
  projectileVelocityFromPolar,
  projectileWorldToScreen,
  sampleAnalyticProjectile,
  solveProjectileGroundImpactTime,
  type ProjectileImpactResult,
  type ProjectileLaunch,
  type ProjectileState,
  type ProjectileVec2,
  type ProjectileWorldView,
} from "@/lib/labs/projectile";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const MUZZLE = { x: 0, y: 1.2 };
const MINIMUM_SPEED = 4;
const MAXIMUM_SPEED = 32;
const MINIMUM_ANGLE = (5 * Math.PI) / 180;
const MAXIMUM_ANGLE = (85 * Math.PI) / 180;
const AIM_PIXELS_PER_SPEED = 5;

interface FlightState {
  launch: ProjectileLaunch;
  projectile: ProjectileState;
  trail: ProjectileVec2[];
  accumulator: number;
  substeps: number;
  droppedTime: number;
  impact: ProjectileImpactResult | null;
}

function makeLaunch(speed: number, angleRadians: number): ProjectileLaunch {
  return {
    position: { ...MUZZLE },
    velocity: projectileVelocityFromPolar(speed, angleRadians),
    acceleration: { x: 0, y: PROJECTILE_GRAVITY },
  };
}

function makeIdleFlight(launch: ProjectileLaunch): FlightState {
  return {
    launch,
    projectile: { ...launchProjectileState(launch), active: false },
    trail: [],
    accumulator: 0,
    substeps: 0,
    droppedTime: 0,
    impact: null,
  };
}

function makeActiveFlight(launch: ProjectileLaunch): FlightState {
  const projectile = launchProjectileState(launch);
  return {
    launch,
    projectile,
    trail: [{ ...projectile.position }],
    accumulator: 0,
    substeps: 0,
    droppedTime: 0,
    impact: null,
  };
}

function advanceFlight(current: FlightState, frameSeconds: number, fixedDeltaSeconds: number) {
  if (!current.projectile.active) return current;
  const plan = planProjectileFixedSteps(
    current.accumulator,
    frameSeconds,
    fixedDeltaSeconds,
    16,
    0.1,
  );
  let projectile = current.projectile;
  let impact = current.impact;
  const newSamples: ProjectileVec2[] = [];
  for (let step = 0; step < plan.steps && projectile.active; step += 1) {
    impact = explicitEulerProjectileStepToGround(
      projectile,
      current.launch.acceleration,
      fixedDeltaSeconds,
      0,
    );
    projectile = impact.state;
    newSamples.push({ ...projectile.position });
  }
  return {
    ...current,
    projectile,
    trail: [...current.trail, ...newSamples].slice(-1200),
    accumulator: plan.remainder,
    substeps: plan.steps,
    droppedTime: current.droppedTime + plan.droppedTime,
    impact,
  };
}

function viewForSize(width: number, height: number): ProjectileWorldView {
  return {
    screenOrigin: { x: 48, y: height - 42 },
    pixelsPerMeter: Math.max(2, Math.min((width - 76) / 110, (height - 72) / 48)),
  };
}

function drawArrow(
  context: CanvasRenderingContext2D,
  start: ProjectileVec2,
  end: ProjectileVec2,
  color: string,
  width = 2,
) {
  drawLine(context, start, end, color, width);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const wing = 10;
  drawLine(
    context,
    end,
    { x: end.x - wing * Math.cos(angle - 0.45), y: end.y - wing * Math.sin(angle - 0.45) },
    color,
    width,
  );
  drawLine(
    context,
    end,
    { x: end.x - wing * Math.cos(angle + 0.45), y: end.y - wing * Math.sin(angle + 0.45) },
    color,
    width,
  );
}

function drawWorldPolyline(
  context: CanvasRenderingContext2D,
  points: ProjectileVec2[],
  view: ProjectileWorldView,
  color: string,
  width: number,
) {
  if (points.length < 2) return;
  context.beginPath();
  points.forEach((point, index) => {
    const screen = projectileWorldToScreen(point, view);
    if (index === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  });
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

function startsWithFlight(mode?: InteractiveLabMode) {
  return (
    mode === "projectile-euler" ||
    mode === "projectile-timestep" ||
    mode === "projectile-impact" ||
    mode === "projectile-validation"
  );
}

export default function ProjectileLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [speed, setSpeed] = useState(28);
  const [angleDegrees, setAngleDegrees] = useState(50);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 30);
  const [paused, setPaused] = useState(true);
  const [showAnalytic, setShowAnalytic] = useState(true);
  const [showComponents, setShowComponents] = useState(mode === "projectile-components");
  const [capturing, setCapturing] = useState(false);
  const initialLaunch = useMemo(() => makeLaunch(28, (50 * Math.PI) / 180), []);
  const [flight, setFlight] = useState<FlightState>(() => {
    if (startsWithFlight(mode)) return makeActiveFlight(initialLaunch);
    return makeIdleFlight(initialLaunch);
  });
  const dragging = useRef(false);

  const angleRadians = (angleDegrees * Math.PI) / 180;
  const previewLaunch = useMemo(() => makeLaunch(speed, angleRadians), [angleRadians, speed]);
  const previewImpactTime = solveProjectileGroundImpactTime(previewLaunch, 0) ?? 6;
  const analyticSamples = useMemo(
    () => sampleAnalyticProjectile(previewLaunch, previewImpactTime, 120),
    [previewImpactTime, previewLaunch],
  );
  const view = useMemo(() => viewForSize(size.width, size.height), [size]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    let request = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const frameSeconds = Math.max(0, (now - previous) / 1000);
      previous = now;
      setFlight((current) => advanceFlight(current, frameSeconds, fixedDeltaSeconds));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [fixedDeltaSeconds, paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    for (let meters = 0; meters <= 110; meters += 10) {
      drawLine(
        context,
        projectileWorldToScreen({ x: meters, y: 0 }, view),
        projectileWorldToScreen({ x: meters, y: 48 }, view),
        "#1d2940",
      );
    }
    for (let meters = 0; meters <= 40; meters += 10) {
      drawLine(
        context,
        projectileWorldToScreen({ x: 0, y: meters }, view),
        projectileWorldToScreen({ x: 110, y: meters }, view),
        "#1d2940",
      );
    }
    drawLine(
      context,
      projectileWorldToScreen({ x: 0, y: 0 }, view),
      projectileWorldToScreen({ x: 110, y: 0 }, view),
      "#6f8f72",
      3,
    );

    if (showAnalytic) drawWorldPolyline(context, analyticSamples, view, "#ffd166", 2);
    drawWorldPolyline(context, flight.trail, view, "#53f0ae", 2.5);

    const muzzleScreen = projectileWorldToScreen(MUZZLE, view);
    const pivotScreen = projectileWorldToScreen({ x: 0, y: 0.65 }, view);
    context.fillStyle = "#344564";
    context.fillRect(pivotScreen.x - 22, pivotScreen.y - 10, 44, 20);
    context.beginPath();
    context.arc(pivotScreen.x, pivotScreen.y, 13, 0, Math.PI * 2);
    context.fillStyle = "#d5deef";
    context.fill();
    const barrelEnd = {
      x: pivotScreen.x + Math.cos(angleRadians) * 46,
      y: pivotScreen.y - Math.sin(angleRadians) * 46,
    };
    drawLine(context, pivotScreen, barrelEnd, "#d5deef", 5);

    const aimScreenDelta = {
      x: previewLaunch.velocity.x * AIM_PIXELS_PER_SPEED,
      y: -previewLaunch.velocity.y * AIM_PIXELS_PER_SPEED,
    };
    const aimEnd = projectileAdd(muzzleScreen, aimScreenDelta);
    drawArrow(context, muzzleScreen, aimEnd, "#70d6ff", 2.5);
    context.beginPath();
    context.arc(aimEnd.x, aimEnd.y, 7, 0, Math.PI * 2);
    context.fillStyle = capturing ? "#ffffff" : "#70d6ff";
    context.fill();

    if (showComponents || mode === "projectile-components") {
      const horizontalEnd = {
        x: muzzleScreen.x + previewLaunch.velocity.x * AIM_PIXELS_PER_SPEED,
        y: muzzleScreen.y,
      };
      drawArrow(context, muzzleScreen, horizontalEnd, "#ffb454", 2);
      drawArrow(context, horizontalEnd, aimEnd, "#c792ea", 2);
    }

    const apexTime = projectileTimeToApex(previewLaunch);
    if (apexTime !== null) {
      const apex = projectileWorldToScreen(
        analyticProjectilePosition(previewLaunch, apexTime),
        view,
      );
      context.beginPath();
      context.arc(apex.x, apex.y, 4, 0, Math.PI * 2);
      context.fillStyle = "#ffd166";
      context.fill();
    }
    const exactImpact = projectileWorldToScreen(
      analyticProjectilePosition(previewLaunch, previewImpactTime),
      view,
    );
    context.strokeStyle = "#ffd166";
    context.lineWidth = 2;
    context.strokeRect(exactImpact.x - 4, exactImpact.y - 4, 8, 8);

    if (flight.trail.length > 0) {
      const numerical = projectileWorldToScreen(flight.projectile.position, view);
      const comparison = compareProjectileState(flight.launch, flight.projectile);
      const analytic = projectileWorldToScreen(comparison.analytic, view);
      drawLine(context, analytic, numerical, "#ff7b86", 1.5);
      context.beginPath();
      context.arc(numerical.x, numerical.y, 6, 0, Math.PI * 2);
      context.fillStyle = "#53f0ae";
      context.fill();
      context.beginPath();
      context.arc(analytic.x, analytic.y, 4, 0, Math.PI * 2);
      context.fillStyle = "#ff7b86";
      context.fill();
    }

    if (flight.impact?.impacted) {
      const belowGround = projectileWorldToScreen(flight.impact.uncorrectedPosition, view);
      context.strokeStyle = "#ff7b86";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(belowGround.x - 4, belowGround.y - 4);
      context.lineTo(belowGround.x + 4, belowGround.y + 4);
      context.moveTo(belowGround.x + 4, belowGround.y - 4);
      context.lineTo(belowGround.x - 4, belowGround.y + 4);
      context.stroke();
    }

    context.fillStyle = "#aab6cf";
    context.font = "11px ui-monospace";
    context.fillText("ANALYTIC", 14, 20);
    context.fillStyle = "#ffd166";
    context.fillRect(82, 14, 22, 3);
    context.fillStyle = "#aab6cf";
    context.fillText("EXPLICIT EULER", 120, 20);
    context.fillStyle = "#53f0ae";
    context.fillRect(220, 14, 22, 3);
  }, [
    analyticSamples,
    angleRadians,
    capturing,
    flight,
    mode,
    previewImpactTime,
    previewLaunch,
    showAnalytic,
    showComponents,
    size,
    view,
  ]);

  const fire = () => {
    setFlight(makeActiveFlight(previewLaunch));
    setPaused(reducedMotion);
  };

  const reset = () => {
    const launch = makeLaunch(28, (50 * Math.PI) / 180);
    setSpeed(28);
    setAngleDegrees(50);
    setFixedDeltaSeconds(1 / 30);
    setPaused(true);
    setShowAnalytic(true);
    setShowComponents(mode === "projectile-components");
    setFlight(makeIdleFlight(launch));
  };

  const stepOnce = () => {
    setFlight((current) => {
      let working = current;
      if (working.trail.length === 0) working = makeActiveFlight(previewLaunch);
      if (!working.projectile.active) return working;
      const impact = explicitEulerProjectileStepToGround(
        working.projectile,
        working.launch.acceleration,
        fixedDeltaSeconds,
        0,
      );
      return {
        ...working,
        projectile: impact.state,
        trail: [...working.trail, { ...impact.state.position }],
        substeps: 1,
        impact,
      };
    });
    setPaused(true);
  };

  const simulateSlowFrame = () => {
    setFlight((current) => {
      const working = current.trail.length === 0 ? makeActiveFlight(previewLaunch) : current;
      return advanceFlight(working, 0.12, fixedDeltaSeconds);
    });
    setPaused(true);
  };

  const updateAimFromPointer = (point: ProjectileVec2) => {
    const muzzleScreen = projectileWorldToScreen(MUZZLE, view);
    const selection = projectileAimFromScreenDrag(
      muzzleScreen,
      point,
      AIM_PIXELS_PER_SPEED,
      MINIMUM_SPEED,
      MAXIMUM_SPEED,
      MINIMUM_ANGLE,
      MAXIMUM_ANGLE,
    );
    if (!selection.valid) return;
    setSpeed(selection.speed);
    setAngleDegrees((selection.angleRadians * 180) / Math.PI);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setCapturing(true);
    updateAimFromPointer(canvasPoint(event, event.currentTarget));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    updateAimFromPointer(canvasPoint(event, event.currentTarget));
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    setCapturing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "Enter") fire();
    if (event.key.toLowerCase() === "n") stepOnce();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setSpeed((current) =>
        Math.min(
          MAXIMUM_SPEED,
          Math.max(MINIMUM_SPEED, current + (event.key === "ArrowLeft" ? -1 : 1)),
        ),
      );
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setAngleDegrees((current) =>
        Math.min(85, Math.max(5, current + (event.key === "ArrowDown" ? -1 : 1))),
      );
    }
  };

  const comparison = compareProjectileState(flight.launch, flight.projectile);
  const exactImpactTime = solveProjectileGroundImpactTime(previewLaunch, 0);
  const exactRange = exactImpactTime
    ? analyticProjectilePosition(previewLaunch, exactImpactTime).x
    : null;
  const impactText = flight.impact?.impacted
    ? `${flight.impact.stepFraction.toFixed(3)} bước · y thô ${flight.impact.uncorrectedPosition.y.toFixed(3)} m`
    : "chưa chạm đất";

  return (
    <div className="lab-stack">
      <div className="lab-controls">
        <label>
          Góc bắn
          <input
            aria-label="Góc bắn"
            type="range"
            min="5"
            max="85"
            step="1"
            value={angleDegrees}
            onChange={(event) => setAngleDegrees(Number(event.target.value))}
          />
          <output>{angleDegrees.toFixed(0)}°</output>
        </label>
        <label>
          Tốc độ đầu
          <input
            aria-label="Tốc độ đầu"
            type="range"
            min={MINIMUM_SPEED}
            max={MAXIMUM_SPEED}
            step="1"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <output>{speed.toFixed(0)} m/s</output>
        </label>
        <label>
          Fixed dt
          <select
            aria-label="Fixed dt"
            value={fixedDeltaSeconds}
            onChange={(event) => {
              const next = Number(event.target.value);
              setFixedDeltaSeconds(next);
              setFlight(makeIdleFlight(previewLaunch));
              setPaused(true);
            }}
          >
            <option value={1 / 15}>1/15 s</option>
            <option value={1 / 30}>1/30 s</option>
            <option value={1 / 60}>1/60 s</option>
            <option value={1 / 120}>1/120 s</option>
          </select>
        </label>
        <label className="check">
          <input
            aria-label="Hiện nghiệm giải tích"
            type="checkbox"
            checked={showAnalytic}
            onChange={(event) => setShowAnalytic(event.target.checked)}
          />
          Nghiệm giải tích
        </label>
        <label className="check">
          <input
            aria-label="Hiện component vận tốc"
            type="checkbox"
            checked={showComponents}
            onChange={(event) => setShowComponents(event.target.checked)}
          />
          vx / vy
        </label>
        <button type="button" onClick={fire}>
          Bắn lại
        </button>
        <button type="button" disabled={reducedMotion} onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={stepOnce}>
          Tiến một bước
        </button>
        {mode === "projectile-timestep" && (
          <button type="button" onClick={simulateSlowFrame}>
            Mô phỏng frame 120 ms
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {reducedMotion && <span className="control-hint">Reduced motion: dùng nút bước</span>}
      </div>

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Mô phỏng projectile so sánh quỹ đạo giải tích với Explicit Euler"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          dragging.current = false;
          setCapturing(false);
        }}
      />

      <LabReadout
        items={[
          { label: "Góc / tốc độ", value: `${angleDegrees.toFixed(1)}° / ${speed.toFixed(1)} m/s` },
          {
            label: "vx / vy",
            value: `${previewLaunch.velocity.x.toFixed(3)} / ${previewLaunch.velocity.y.toFixed(3)} m/s`,
          },
          {
            label: "Fixed dt / accumulator",
            value: `${fixedDeltaSeconds.toFixed(5)} / ${flight.accumulator.toFixed(5)} s`,
          },
          {
            label: "Elapsed / substep",
            value: `${flight.projectile.elapsed.toFixed(3)} s / ${flight.substeps}`,
          },
          {
            label: "Numerical position",
            value: `(${flight.projectile.position.x.toFixed(3)}, ${flight.projectile.position.y.toFixed(3)}) m`,
          },
          {
            label: "Analytic position",
            value: `(${comparison.analytic.x.toFixed(3)}, ${comparison.analytic.y.toFixed(3)}) m`,
          },
          { label: "Position error", value: `${comparison.error.toFixed(5)} m` },
          {
            label: "Exact flight / range",
            value:
              exactImpactTime && exactRange !== null
                ? `${exactImpactTime.toFixed(3)} s / ${exactRange.toFixed(3)} m`
                : "không có nghiệm",
          },
          { label: "Impact interpolation", value: impactText },
          { label: "Thời gian bị bỏ", value: `${flight.droppedTime.toFixed(4)} s` },
          { label: "pointer capture", value: capturing ? "đang kéo" : "đã nhả" },
        ]}
      />
      <p className="sr-only">
        Vận tốc đầu có hai component {previewLaunch.velocity.x.toFixed(3)} và{" "}
        {previewLaunch.velocity.y.toFixed(3)} mét trên giây. Sai số vị trí hiện tại là{" "}
        {comparison.error.toFixed(5)} mét. {impactText}.
      </p>
    </div>
  );
}
