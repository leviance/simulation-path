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
  applyCollisionPairImpulse,
  cloneCollisionBall,
  collisionAdd,
  collisionDot,
  collisionScale,
  collisionSubtract,
  correctCollisionPenetration,
  findCollisionCircleContact,
  integrateCollisionBall,
  makeCollisionLattice,
  measureCollisionWorld,
  nearestCollisionBallIndex,
  planCollisionFixedSteps,
  resolveCollisionWall,
  stepCollisionTank,
  type CollisionBall,
  type CollisionStepSettings,
  type CollisionStepStats,
  type CollisionTankBounds,
  type CollisionVec2,
} from "@/lib/labs/collision-tank";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const BOUNDS: CollisionTankBounds = {
  minimumX: 0,
  minimumY: 0,
  maximumX: 16,
  maximumY: 10,
};
const SCENE_SEED = 0x00c0ffee;

interface CollisionHistorySample {
  elapsed: number;
  energyDrift: number;
  maximumPenetration: number;
}

interface CollisionViewState {
  balls: CollisionBall[];
  elapsed: number;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  stats: CollisionStepStats;
  history: CollisionHistorySample[];
}

interface DragState {
  index: number;
  start: CollisionVec2;
  current: CollisionVec2;
}

interface TankView {
  scale: number;
  offsetX: number;
  offsetY: number;
  tankHeight: number;
}

const EMPTY_STATS: CollisionStepStats = {
  pairChecks: 0,
  contacts: 0,
  impulses: 0,
  wallHits: 0,
  maximumPenetration: 0,
};

function sceneShape(ballCount: number) {
  if (ballCount === 16) return { columns: 4, rows: 4, radius: 0.38 };
  if (ballCount === 64) return { columns: 8, rows: 8, radius: 0.3 };
  return { columns: 16, rows: 9, radius: 0.24 };
}

function makeScene(ballCount: number) {
  const shape = sceneShape(ballCount);
  return makeCollisionLattice(shape.columns, shape.rows, BOUNDS, shape.radius, 2.2, SCENE_SEED);
}

function makeTeachingScene(mode: InteractiveLabMode | undefined, ballCount: number) {
  if (mode === "collision-walls") {
    return [
      {
        position: { x: 0.34, y: 5 },
        velocity: { x: -2.4, y: 0.8 },
        radius: 0.5,
        inverseMass: 1,
        color: "#61afef",
      },
    ];
  }

  if (
    mode === "collision-detection" ||
    mode === "collision-impulse" ||
    mode === "collision-correction"
  ) {
    const closingSpeed = mode === "collision-impulse" ? 1.2 : 0;
    return [
      {
        position: { x: 7.45, y: 5 },
        velocity: { x: closingSpeed, y: 0 },
        radius: 0.65,
        inverseMass: 1,
        color: "#61afef",
      },
      {
        position: { x: 8.55, y: 5 },
        velocity: { x: -closingSpeed, y: 0 },
        radius: 0.65,
        inverseMass: 1,
        color: "#e06c75",
      },
    ];
  }

  return makeScene(ballCount);
}

function makeView(ballCount: number, mode: InteractiveLabMode | undefined): CollisionViewState {
  return {
    balls: makeTeachingScene(mode, ballCount),
    elapsed: 0,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    stats: { ...EMPTY_STATS },
    history: [],
  };
}

function stepCollisionLesson(
  sourceBalls: CollisionBall[],
  mode: InteractiveLabMode | undefined,
  settings: CollisionStepSettings,
) {
  if (!mode || mode === "collision-bruteforce" || mode === "collision-validation") {
    return stepCollisionTank(sourceBalls, BOUNDS, settings);
  }

  const balls = sourceBalls.map(cloneCollisionBall);
  const stats = { ...EMPTY_STATS };
  if (mode === "collision-scene") return { balls, stats };

  for (const ball of balls) integrateCollisionBall(ball, settings.deltaSeconds);
  if (mode === "collision-motion") return { balls, stats };

  if (mode === "collision-walls") {
    for (const ball of balls) {
      const wall = resolveCollisionWall(ball, BOUNDS, settings.restitution);
      stats.wallHits += wall.hitCount;
      stats.maximumPenetration = Math.max(stats.maximumPenetration, wall.deepestPenetration);
    }
    return { balls, stats };
  }

  const iterations = mode === "collision-correction" ? settings.solverIterations : 1;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
        stats.pairChecks += 1;
        const first = balls[firstIndex];
        const second = balls[secondIndex];
        const contact = findCollisionCircleContact(first, second);
        if (!contact.colliding) continue;
        stats.contacts += 1;
        stats.maximumPenetration = Math.max(stats.maximumPenetration, contact.penetration);
        if (mode === "collision-detection") continue;

        const impulseMagnitude = applyCollisionPairImpulse(
          first,
          second,
          contact,
          settings.restitution,
        );
        if (impulseMagnitude > 0) stats.impulses += 1;
        if (mode === "collision-correction") {
          correctCollisionPenetration(
            first,
            second,
            contact,
            settings.correctionPercent,
            settings.penetrationSlop,
          );
        }
      }
    }
  }
  return { balls, stats };
}

function appendHistory(
  history: CollisionHistorySample[],
  elapsed: number,
  balls: CollisionBall[],
  initialEnergy: number,
) {
  const previous = history.at(-1);
  if (previous && elapsed - previous.elapsed < 0.05) return history;
  const metrics = measureCollisionWorld(balls);
  let energyDrift = 0;
  if (initialEnergy > 1e-12) energyDrift = (metrics.kineticEnergy - initialEnergy) / initialEnergy;
  return [
    ...history,
    { elapsed, energyDrift, maximumPenetration: metrics.maximumPenetration },
  ].slice(-240);
}

function advanceCollisionView(
  current: CollisionViewState,
  frameSeconds: number,
  settings: CollisionStepSettings,
  initialEnergy: number,
  mode: InteractiveLabMode | undefined,
) {
  const plan = planCollisionFixedSteps(
    current.accumulator,
    frameSeconds,
    settings.deltaSeconds,
    12,
    0.1,
  );
  let balls = current.balls;
  let stats = current.stats;
  for (let step = 0; step < plan.steps; step += 1) {
    const result = stepCollisionLesson(balls, mode, settings);
    balls = result.balls;
    stats = result.stats;
  }
  const elapsed = current.elapsed + plan.steps * settings.deltaSeconds;
  return {
    balls,
    elapsed,
    accumulator: plan.remainder,
    droppedTime: current.droppedTime + plan.droppedTime,
    substeps: plan.steps,
    stats,
    history: appendHistory(current.history, elapsed, balls, initialEnergy),
  };
}

function tankView(width: number, height: number): TankView {
  const tankHeight = Math.max(190, height - 105);
  const usableWidth = Math.max(1, width - 34);
  const usableHeight = Math.max(1, tankHeight - 24);
  const scale = Math.min(usableWidth / 16, usableHeight / 10);
  return {
    scale,
    offsetX: (width - 16 * scale) / 2,
    offsetY: 10 * scale + 8,
    tankHeight,
  };
}

function collisionWorldToScreen(point: CollisionVec2, view: TankView) {
  return { x: view.offsetX + point.x * view.scale, y: view.offsetY - point.y * view.scale };
}

function collisionScreenToWorld(point: CollisionVec2, view: TankView) {
  return { x: (point.x - view.offsetX) / view.scale, y: (view.offsetY - point.y) / view.scale };
}

function deepestContact(balls: CollisionBall[]) {
  let best:
    | {
        firstIndex: number;
        secondIndex: number;
        normal: CollisionVec2;
        penetration: number;
        centerDistance: number;
      }
    | undefined;
  for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
      const contact = findCollisionCircleContact(balls[firstIndex], balls[secondIndex]);
      if (!contact.colliding || (best && contact.penetration <= best.penetration)) continue;
      best = {
        firstIndex,
        secondIndex,
        normal: contact.normal,
        penetration: contact.penetration,
        centerDistance: contact.centerDistance,
      };
    }
  }
  return best;
}

function drawEnergyHistory(
  context: CanvasRenderingContext2D,
  history: CollisionHistorySample[],
  width: number,
  top: number,
  height: number,
) {
  context.fillStyle = "#111a2c";
  context.fillRect(12, top, width - 24, height - 10);
  const centerY = top + (height - 10) / 2;
  drawLine(context, { x: 22, y: centerY }, { x: width - 22, y: centerY }, "#24324d");
  if (history.length < 2) return;
  const firstTime = history[0].elapsed;
  const lastTime = history.at(-1)?.elapsed ?? firstTime + 1;
  const span = Math.max(1, lastTime - firstTime);
  const drawSeries = (key: "energyDrift" | "maximumPenetration", color: string, scale: number) => {
    context.beginPath();
    history.forEach((sample, index) => {
      const x = 22 + ((sample.elapsed - firstTime) / span) * (width - 44);
      const y = centerY - sample[key] * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  };
  drawSeries("energyDrift", "#c792ea", 180);
  drawSeries("maximumPenetration", "#ffd166", 650);
  context.fillStyle = "#aebbd2";
  context.font = "11px ui-monospace, monospace";
  context.fillText("energy drift", 22, top + 14);
  context.fillStyle = "#ffd166";
  context.fillText("max penetration", 112, top + 14);
}

export default function CollisionTankLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [ballCount, setBallCount] = useState(144);
  const [restitution, setRestitution] = useState(0.96);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 120);
  const [solverIterations, setSolverIterations] = useState(3);
  const [correctionEnabled, setCorrectionEnabled] = useState(mode !== "collision-correction");
  const [showContact, setShowContact] = useState(true);
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [viewState, setViewState] = useState<CollisionViewState>(() => makeView(144, mode));
  const initialEnergy = useMemo(
    () => measureCollisionWorld(makeTeachingScene(mode, ballCount)).kineticEnergy,
    [ballCount, mode],
  );
  const settings = useMemo<CollisionStepSettings>(
    () => ({
      deltaSeconds: fixedDeltaSeconds,
      restitution,
      solverIterations,
      correctionPercent: correctionEnabled ? 0.8 : 0,
      penetrationSlop: 0.001,
    }),
    [correctionEnabled, fixedDeltaSeconds, restitution, solverIterations],
  );

  const reset = (count = ballCount) => {
    setViewState(makeView(count, mode));
    setPaused(true);
    setDrag(null);
    setCapturing(false);
  };

  const stepOnce = () => {
    setViewState((current) => {
      const result = stepCollisionLesson(current.balls, mode, settings);
      const elapsed = current.elapsed + settings.deltaSeconds;
      return {
        ...current,
        balls: result.balls,
        elapsed,
        substeps: 1,
        stats: result.stats,
        history: appendHistory(current.history, elapsed, result.balls, initialEnergy),
      };
    });
    setPaused(true);
  };

  const runFast = () => {
    setViewState((current) => {
      let balls = current.balls;
      let stats = current.stats;
      let history = current.history;
      const steps = Math.round(2 / settings.deltaSeconds);
      let elapsed = current.elapsed;
      for (let step = 0; step < steps; step += 1) {
        const result = stepCollisionLesson(balls, mode, settings);
        balls = result.balls;
        stats = result.stats;
        elapsed += settings.deltaSeconds;
        if (step % Math.max(1, Math.floor(0.05 / settings.deltaSeconds)) === 0) {
          history = appendHistory(history, elapsed, balls, initialEnergy);
        }
      }
      return { ...current, balls, elapsed, substeps: steps, stats, history };
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
      setViewState((current) =>
        advanceCollisionView(current, frameSeconds, settings, initialEnergy, mode),
      );
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [initialEnergy, mode, paused, reducedMotion, settings]);

  const metrics = useMemo(() => measureCollisionWorld(viewState.balls), [viewState.balls]);
  const contact = useMemo(() => deepestContact(viewState.balls), [viewState.balls]);
  const view = useMemo(() => tankView(size.width, size.height), [size]);
  let energyDrift = 0;
  if (initialEnergy > 1e-12) energyDrift = (metrics.kineticEnergy - initialEnergy) / initialEnergy;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    const topLeft = collisionWorldToScreen({ x: 0, y: 10 }, view);
    const bottomRight = collisionWorldToScreen({ x: 16, y: 0 }, view);
    context.fillStyle = "#111a2c";
    context.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    context.strokeStyle = "#7183a1";
    context.lineWidth = 2;
    context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    for (const [index, ball] of viewState.balls.entries()) {
      const center = collisionWorldToScreen(ball.position, view);
      context.beginPath();
      context.arc(center.x, center.y, Math.max(2, ball.radius * view.scale), 0, 2 * Math.PI);
      context.fillStyle = ball.color;
      context.fill();
      if (drag?.index === index) {
        context.strokeStyle = "#f5f7ff";
        context.lineWidth = 2;
        context.stroke();
      }
    }
    if (showContact && contact) {
      const first = viewState.balls[contact.firstIndex];
      const point = collisionAdd(first.position, collisionScale(contact.normal, first.radius));
      const end = collisionAdd(point, collisionScale(contact.normal, 0.8));
      drawLine(
        context,
        collisionWorldToScreen(point, view),
        collisionWorldToScreen(end, view),
        "#ffd166",
        3,
      );
    }
    if (drag) {
      drawLine(
        context,
        collisionWorldToScreen(viewState.balls[drag.index].position, view),
        collisionWorldToScreen(drag.current, view),
        "#f5f7ff",
        2,
      );
    }
    drawEnergyHistory(
      context,
      viewState.history,
      size.width,
      view.tankHeight,
      size.height - view.tankHeight,
    );
  }, [contact, drag, showContact, size, view, viewState]);

  const pointerWorld = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return collisionScreenToWorld(canvasPoint(event, canvas), view);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointerWorld(event);
    const index = nearestCollisionBallIndex(viewState.balls, point);
    if (index < 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ index, start: point, current: point });
    setCapturing(true);
    setPaused(true);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag) {
      const velocityChange = collisionScale(collisionSubtract(drag.current, drag.start), 1.5);
      setViewState((current) => {
        const balls = current.balls.map((ball, index) => {
          if (index !== drag.index) return ball;
          return { ...ball, velocity: collisionAdd(ball.velocity, velocityChange) };
        });
        return { ...current, balls };
      });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " " && mode !== "collision-scene") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && mode !== "collision-scene") stepOnce();
    if (event.key.toLowerCase() === "r") reset();
  };

  const actualBallCount = viewState.balls.length;
  const unorderedPairs = (actualBallCount * (actualBallCount - 1)) / 2;
  const showPopulation =
    !mode ||
    mode === "collision-scene" ||
    mode === "collision-motion" ||
    mode === "collision-bruteforce" ||
    mode === "collision-validation";
  const showRestitution =
    !mode ||
    mode === "collision-walls" ||
    mode === "collision-impulse" ||
    mode === "collision-validation";
  const showFixedDelta = mode !== "collision-scene";
  const showSolverIterations =
    !mode ||
    mode === "collision-correction" ||
    mode === "collision-bruteforce" ||
    mode === "collision-validation";
  const showCorrection =
    !mode || mode === "collision-correction" || mode === "collision-validation";
  const showContactToggle =
    !mode ||
    mode === "collision-detection" ||
    mode === "collision-impulse" ||
    mode === "collision-correction" ||
    mode === "collision-validation";
  const showSimulationControls = mode !== "collision-scene";
  const showFastRun =
    !mode ||
    mode === "collision-correction" ||
    mode === "collision-bruteforce" ||
    mode === "collision-validation";

  let contactDescription = "Không có cặp nào overlap.";
  let relativeNormalDescription = "Không áp dụng khi chưa có contact.";
  if (contact) {
    const first = viewState.balls[contact.firstIndex];
    const second = viewState.balls[contact.secondIndex];
    const relativeVelocity = collisionSubtract(second.velocity, first.velocity);
    const relativeNormalSpeed = collisionDot(relativeVelocity, contact.normal);
    const inverseMassSum = first.inverseMass + second.inverseMass;
    let predictedImpulse = 0;
    if (relativeNormalSpeed < 0 && inverseMassSum > 1e-12) {
      predictedImpulse =
        (-(1 + Math.max(0, Math.min(1, restitution))) * relativeNormalSpeed) / inverseMassSum;
    }
    contactDescription = `A${contact.firstIndex} → B${contact.secondIndex} · distance ${contact.centerDistance.toFixed(5)} m · n (${contact.normal.x.toFixed(3)}, ${contact.normal.y.toFixed(3)}) · depth ${contact.penetration.toFixed(5)} m`;
    relativeNormalDescription = `${relativeNormalSpeed.toFixed(5)} m/s · impulse kế tiếp ${predictedImpulse.toFixed(5)} N·s`;
  }

  const readoutItems = [
    { label: "Balls / unordered pairs", value: `${actualBallCount} / ${unorderedPairs}` },
    {
      label: "Elapsed / substep",
      value: `${viewState.elapsed.toFixed(3)} s / ${viewState.substeps}`,
    },
  ];
  if (mode === "collision-scene") {
    readoutItems.push({
      label: "Deterministic scene",
      value: `seed 0x00c0ffee · reset giữ nguyên ${actualBallCount} position và velocity`,
    });
  }
  if (mode === "collision-walls" && viewState.balls[0]) {
    const ball = viewState.balls[0];
    readoutItems.push({
      label: "Một bóng sát wall",
      value: `center (${ball.position.x.toFixed(3)}, ${ball.position.y.toFixed(3)}) m · radius ${ball.radius.toFixed(2)} m`,
    });
    readoutItems.push({
      label: "Velocity normal / tangent",
      value: `${ball.velocity.x.toFixed(3)} / ${ball.velocity.y.toFixed(3)} m/s`,
    });
  }
  if (
    mode === "collision-detection" ||
    mode === "collision-impulse" ||
    mode === "collision-correction"
  ) {
    readoutItems.push(
      { label: "Deepest contact", value: contactDescription },
      { label: "Relative normal speed / impulse", value: relativeNormalDescription },
    );
  }
  if (mode === "collision-detection" || mode === "collision-impulse") {
    readoutItems.push({
      label: "Pair checks",
      value: `${viewState.stats.pairChecks} cặp được kiểm đúng một lần`,
    });
  } else if (
    !mode ||
    mode === "collision-correction" ||
    mode === "collision-bruteforce" ||
    mode === "collision-validation"
  ) {
    readoutItems.push({
      label: "Pair checks",
      value: `${viewState.stats.pairChecks} = ${solverIterations} × ${unorderedPairs}`,
    });
  }
  readoutItems.push(
    {
      label: "Contacts / impulses / walls",
      value: `${viewState.stats.contacts} / ${viewState.stats.impulses} / ${viewState.stats.wallHits}`,
    },
    {
      label: "Overlap / max penetration",
      value: `${metrics.overlapCount} / ${metrics.maximumPenetration.toFixed(5)} m`,
    },
  );
  if (!mode || mode === "collision-validation") {
    readoutItems.push(
      {
        label: "Momentum",
        value: `(${metrics.totalMomentum.x.toFixed(3)}, ${metrics.totalMomentum.y.toFixed(3)}) kg·m/s`,
      },
      {
        label: "Kinetic energy / drift",
        value: `${metrics.kineticEnergy.toFixed(3)} J / ${(100 * energyDrift).toFixed(3)}%`,
      },
    );
  }
  readoutItems.push(
    {
      label: "Frame guard / pointer capture",
      value: `${viewState.droppedTime.toFixed(3)} s dropped / ${capturing ? "đang kéo" : "đã nhả"}`,
    },
    {
      label: "Mô tả thay thế",
      value:
        mode === "collision-bruteforce"
          ? `Mỗi iteration kiểm ${unorderedPairs} cặp dù chỉ một phần rất nhỏ đang chạm.`
          : "Mũi tên vàng là normal của contact xuyên sâu nhất; graph tím là energy drift, vàng là penetration.",
    },
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Bể va chạm với hàng trăm quả bóng và contact normal"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (drag) setDrag({ ...drag, current: pointerWorld(event) });
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        {showPopulation && (
          <label>
            Số bóng
            <select
              value={ballCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setBallCount(count);
                reset(count);
              }}
            >
              <option value="16">16</option>
              <option value="64">64</option>
              <option value="144">144</option>
            </select>
          </label>
        )}
        {showRestitution && (
          <label>
            Restitution
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={restitution}
              onChange={(event) => setRestitution(Number(event.target.value))}
            />
          </label>
        )}
        {showFixedDelta && (
          <label>
            Fixed dt
            <select
              value={fixedDeltaSeconds}
              onChange={(event) => {
                setFixedDeltaSeconds(Number(event.target.value));
                reset();
              }}
            >
              <option value={1 / 30}>1/30 s</option>
              <option value={1 / 60}>1/60 s</option>
              <option value={1 / 120}>1/120 s</option>
              <option value={1 / 240}>1/240 s</option>
            </select>
          </label>
        )}
        {showSolverIterations && (
          <label>
            Solver iterations
            <select
              value={solverIterations}
              onChange={(event) => setSolverIterations(Number(event.target.value))}
            >
              <option value="1">1</option>
              <option value="3">3</option>
              <option value="5">5</option>
            </select>
          </label>
        )}
        {showCorrection && (
          <label>
            <input
              type="checkbox"
              checked={correctionEnabled}
              onChange={(event) => setCorrectionEnabled(event.target.checked)}
            />
            Positional correction
          </label>
        )}
        {showContactToggle && (
          <label>
            <input
              type="checkbox"
              checked={showContact}
              onChange={(event) => setShowContact(event.target.checked)}
            />
            Contact normal
          </label>
        )}
        {showSimulationControls && (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showSimulationControls && (
          <button type="button" onClick={stepOnce}>
            Tiến một bước
          </button>
        )}
        {showFastRun && (
          <button type="button" onClick={runFast}>
            Chạy nhanh 2 giây
          </button>
        )}
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={readoutItems} />
      <p className="lab-hint">
        Kéo từ một quả bóng để truyền velocity kick. Space chạy/dừng, N tiến một fixed step và R tạo
        lại đúng scene từ seed 0x00c0ffee.
      </p>
    </>
  );
}
