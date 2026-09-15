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
  accumulateSpringForces,
  estimateSpringReleaseVelocity,
  makeSpringChain,
  measureSpringChain,
  nearestDynamicSpringParticle,
  planSpringFixedSteps,
  sampleElasticSpring,
  springAdd,
  springScale,
  springStabilityIndex,
  stepSpringChain,
  totalSpringMechanicalEnergy,
  type SpringChainState,
  type SpringDragConstraint,
  type SpringStepSettings,
  type SpringVec2,
} from "@/lib/labs/spring-chain";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const GRAVITY = { x: 0, y: -9.81 };

interface SpringHistorySample {
  elapsed: number;
  energy: number;
  maximumStretch: number;
}

interface SpringViewState {
  chain: SpringChainState;
  elapsed: number;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  history: SpringHistorySample[];
}

interface CanvasDrag {
  constraint: SpringDragConstraint;
  previousTarget: SpringVec2;
  previousTime: number;
}

interface SpringIntegrationTrace {
  particleIndex: number;
  force: SpringVec2;
  acceleration: SpringVec2;
  velocityBefore: SpringVec2;
  velocityAfter: SpringVec2;
  positionBefore: SpringVec2;
  positionAfter: SpringVec2;
}

interface SpringView {
  scale: number;
  centerX: number;
  centerY: number;
  simulationHeight: number;
}

function restLengthForCount(particleCount: number) {
  if (particleCount === 8) return 0.9;
  if (particleCount === 24) return 0.3;
  return 0.42;
}

function makeScene(
  particleCount: number,
  stiffness: number,
  damping: number,
  mass: number,
  mode?: InteractiveLabMode,
) {
  const chain = makeSpringChain(
    particleCount,
    { x: 0, y: 3.6 },
    restLengthForCount(particleCount),
    mass,
    0.1,
    stiffness,
    damping,
  );
  if (mode === "spring-hooke" || mode === "spring-forces" || mode === "spring-damping") {
    const index = Math.floor(particleCount / 2);
    chain.particles[index].position.x += 0.8;
  }
  return chain;
}

function makeViewState(
  particleCount: number,
  stiffness: number,
  damping: number,
  mass: number,
  mode?: InteractiveLabMode,
): SpringViewState {
  return {
    chain: makeScene(particleCount, stiffness, damping, mass, mode),
    elapsed: 0,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    history: [],
  };
}

function appendHistory(
  history: SpringHistorySample[],
  elapsed: number,
  chain: SpringChainState,
  gravityEnabled: boolean,
) {
  const previous = history.at(-1);
  if (previous && elapsed - previous.elapsed < 0.04) return history;
  const metrics = measureSpringChain(chain, GRAVITY, gravityEnabled);
  return [
    ...history,
    {
      elapsed,
      energy: totalSpringMechanicalEnergy(metrics),
      maximumStretch: metrics.maximumStretch,
    },
  ].slice(-240);
}

function advanceView(
  current: SpringViewState,
  frameSeconds: number,
  settings: SpringStepSettings,
  drag?: SpringDragConstraint,
) {
  const plan = planSpringFixedSteps(
    current.accumulator,
    frameSeconds,
    settings.deltaSeconds,
    24,
    0.1,
  );
  let chain = current.chain;
  for (let step = 0; step < plan.steps; step += 1) {
    chain = stepSpringChain(chain, settings, drag);
    if (!measureSpringChain(chain, settings.gravity, settings.gravityEnabled).finite) break;
  }
  const elapsed = current.elapsed + plan.steps * settings.deltaSeconds;
  return {
    chain,
    elapsed,
    accumulator: plan.remainder,
    droppedTime: current.droppedTime + plan.droppedTime,
    substeps: plan.steps,
    history: appendHistory(current.history, elapsed, chain, settings.gravityEnabled),
  };
}

function makeSpringView(width: number, height: number): SpringView {
  const simulationHeight = Math.max(240, height - 115);
  return {
    scale: Math.max(1, Math.min((width - 48) / 8.4, (simulationHeight - 24) / 8.4)),
    centerX: width / 2,
    centerY: simulationHeight / 2,
    simulationHeight,
  };
}

function worldToCanvas(point: SpringVec2, view: SpringView) {
  return { x: view.centerX + point.x * view.scale, y: view.centerY - point.y * view.scale };
}

function canvasToWorld(point: SpringVec2, view: SpringView) {
  return { x: (point.x - view.centerX) / view.scale, y: (view.centerY - point.y) / view.scale };
}

function drawGraph(
  context: CanvasRenderingContext2D,
  chain: SpringChainState,
  history: SpringHistorySample[],
  width: number,
  top: number,
  height: number,
) {
  context.fillStyle = "#111a2c";
  context.fillRect(12, top + 4, width - 24, height - 8);
  const centerY = top + height / 2;
  drawLine(context, { x: 22, y: centerY }, { x: width - 22, y: centerY }, "#26344e");
  if (chain.particles.length > 1) {
    context.beginPath();
    chain.particles.forEach((particle, index) => {
      const x = 22 + (index / (chain.particles.length - 1)) * (width - 44);
      const y = centerY - particle.position.x * 22;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = "#61afef";
    context.lineWidth = 2;
    context.stroke();
  }
  if (history.length > 1) {
    const firstEnergy = history[0].energy;
    const scale = Math.max(1, Math.abs(firstEnergy));
    const startTime = history[0].elapsed;
    const endTime = history.at(-1)?.elapsed ?? startTime + 1;
    const span = Math.max(1, endTime - startTime);
    context.beginPath();
    history.forEach((sample, index) => {
      const x = 22 + ((sample.elapsed - startTime) / span) * (width - 44);
      const y = centerY - ((sample.energy - firstEnergy) / scale) * 28;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = "#c678dd";
    context.lineWidth = 1.5;
    context.stroke();
  }
  context.font = "11px ui-monospace, monospace";
  context.fillStyle = "#61afef";
  context.fillText("x displacement theo particle index", 22, top + 18);
  context.fillStyle = "#c678dd";
  context.fillText("energy change theo time", Math.max(220, width - 180), top + 18);
}

export default function SpringChainLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(18);
  const [mass, setMass] = useState(0.25);
  const [stiffness, setStiffness] = useState(120);
  const [damping, setDamping] = useState(1.6);
  const [fixedDeltaSeconds, setFixedDeltaSeconds] = useState(1 / 240);
  const [gravityEnabled, setGravityEnabled] = useState(true);
  const [dampingEnabled, setDampingEnabled] = useState(mode !== "spring-integration");
  const [showForces, setShowForces] = useState(mode === "spring-forces");
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [drag, setDrag] = useState<CanvasDrag | null>(null);
  const [selectedSpring, setSelectedSpring] = useState(8);
  const [hookeDistance, setHookeDistance] = useState(0.7);
  const [hookeAngleDegrees, setHookeAngleDegrees] = useState(-60);
  const [stabilityPreset, setStabilityPreset] = useState("custom");
  const [integrationTrace, setIntegrationTrace] = useState<SpringIntegrationTrace | null>(null);
  const [viewState, setViewState] = useState(() => makeViewState(18, 120, 1.6, 0.25, mode));
  const settings = useMemo<SpringStepSettings>(
    () => ({
      deltaSeconds: fixedDeltaSeconds,
      gravity: GRAVITY,
      gravityEnabled,
      dampingEnabled,
    }),
    [dampingEnabled, fixedDeltaSeconds, gravityEnabled],
  );
  const view = useMemo(() => makeSpringView(size.width, size.height), [size]);

  const reset = (
    count = particleCount,
    nextStiffness = stiffness,
    nextDamping = damping,
    nextMass = mass,
  ) => {
    setViewState(makeViewState(count, nextStiffness, nextDamping, nextMass, mode));
    setSelectedSpring(Math.min(Math.floor((count - 1) / 2), count - 2));
    setPaused(true);
    setDrag(null);
    setCapturing(false);
    setIntegrationTrace(null);
  };

  const stepOnce = () => {
    if (mode === "spring-integration" && viewState.chain.particles.length > 1) {
      const forceState = stepSpringChain(viewState.chain, { ...settings, deltaSeconds: 0 });
      const chain = stepSpringChain(viewState.chain, settings, drag?.constraint);
      const particleIndex = Math.min(selectedSpring + 1, chain.particles.length - 1);
      const before = viewState.chain.particles[particleIndex];
      const after = chain.particles[particleIndex];
      const force = forceState.particles[particleIndex].force;
      setIntegrationTrace({
        particleIndex,
        force: { ...force },
        acceleration: springScale(force, before.inverseMass),
        velocityBefore: { ...before.velocity },
        velocityAfter: { ...after.velocity },
        positionBefore: { ...before.position },
        positionAfter: { ...after.position },
      });
      const elapsed = viewState.elapsed + settings.deltaSeconds;
      setViewState({
        ...viewState,
        chain,
        elapsed,
        substeps: 1,
        history: appendHistory(viewState.history, elapsed, chain, settings.gravityEnabled),
      });
      setPaused(true);
      return;
    }

    setViewState((current) => {
      const chain = stepSpringChain(current.chain, settings, drag?.constraint);
      const elapsed = current.elapsed + settings.deltaSeconds;
      return {
        ...current,
        chain,
        elapsed,
        substeps: 1,
        history: appendHistory(current.history, elapsed, chain, settings.gravityEnabled),
      };
    });
    setPaused(true);
  };

  const runFast = () => {
    setViewState((current) => {
      let chain = current.chain;
      let elapsed = current.elapsed;
      let history = current.history;
      const steps = Math.round(20 / settings.deltaSeconds);
      for (let step = 0; step < steps; step += 1) {
        chain = stepSpringChain(chain, settings);
        elapsed += settings.deltaSeconds;
        const metrics = measureSpringChain(chain, settings.gravity, settings.gravityEnabled);
        if (!metrics.finite) break;
        if (step % Math.max(1, Math.floor(0.05 / settings.deltaSeconds)) === 0) {
          history = appendHistory(history, elapsed, chain, settings.gravityEnabled);
        }
      }
      return { ...current, chain, elapsed, substeps: steps, history };
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
      setViewState((current) => advanceView(current, frameSeconds, settings, drag?.constraint));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [drag, paused, reducedMotion, settings]);

  const displayChain = useMemo(() => {
    const chain = viewState.chain;
    if (showForces || mode === "spring-hooke" || mode === "spring-forces") {
      const copy = stepSpringChain(chain, { ...settings, deltaSeconds: 0 });
      copy.particles = chain.particles.map((particle) => ({
        ...particle,
        position: { ...particle.position },
        velocity: { ...particle.velocity },
        force: { ...particle.force },
      }));
      if (mode === "spring-hooke" && copy.springs.length > 0) {
        const index = Math.min(selectedSpring, copy.springs.length - 1);
        const spring = copy.springs[index];
        const first = copy.particles[spring.first];
        const second = copy.particles[spring.second];
        const angleRadians = (hookeAngleDegrees * Math.PI) / 180;
        second.position = {
          x: first.position.x + hookeDistance * Math.cos(angleRadians),
          y: first.position.y + hookeDistance * Math.sin(angleRadians),
        };
        first.velocity = { x: 0, y: 0 };
        second.velocity = { x: 0, y: 0 };
      }
      accumulateSpringForces(
        copy,
        GRAVITY,
        mode === "spring-hooke" ? false : gravityEnabled,
        mode === "spring-hooke" ? false : dampingEnabled,
      );
      return copy;
    }
    return chain;
  }, [
    dampingEnabled,
    gravityEnabled,
    hookeAngleDegrees,
    hookeDistance,
    mode,
    selectedSpring,
    settings,
    showForces,
    viewState.chain,
  ]);
  const metrics = useMemo(
    () => measureSpringChain(viewState.chain, GRAVITY, gravityEnabled),
    [gravityEnabled, viewState.chain],
  );
  const energy = totalSpringMechanicalEnergy(metrics);
  const stability = springStabilityIndex(stiffness, mass, fixedDeltaSeconds);
  const safeSpringIndex = Math.min(selectedSpring, Math.max(0, viewState.chain.springs.length - 1));
  const springSample = sampleElasticSpring(displayChain, displayChain.springs[safeSpringIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, size.width, size.height);
    for (let coordinate = -4; coordinate <= 4; coordinate += 1) {
      drawLine(
        context,
        worldToCanvas({ x: coordinate, y: -4 }, view),
        worldToCanvas({ x: coordinate, y: 4 }, view),
        "#202c44",
      );
      drawLine(
        context,
        worldToCanvas({ x: -4, y: coordinate }, view),
        worldToCanvas({ x: 4, y: coordinate }, view),
        "#202c44",
      );
    }
    for (const [index, spring] of displayChain.springs.entries()) {
      const sample = sampleElasticSpring(displayChain, spring);
      let color = "#7183a1";
      if (sample.stretch > 0.015) color = "#e5c07b";
      if (sample.stretch < -0.015) color = "#56b6c2";
      drawLine(
        context,
        worldToCanvas(displayChain.particles[spring.first].position, view),
        worldToCanvas(displayChain.particles[spring.second].position, view),
        color,
        index === safeSpringIndex ? 4 : 2,
      );
    }
    displayChain.particles.forEach((particle, index) => {
      const center = worldToCanvas(particle.position, view);
      const radius = Math.max(5, particle.radius * view.scale);
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      context.fillStyle = particle.inverseMass === 0 ? "#c678dd" : "#98c379";
      context.fill();
      if (drag?.constraint.particleIndex === index) {
        context.strokeStyle = "#f5f7ff";
        context.lineWidth = 3;
        context.stroke();
      }
      if ((showForces || mode === "spring-hooke") && particle.inverseMass > 0) {
        drawLine(
          context,
          center,
          worldToCanvas(springAdd(particle.position, springScale(particle.force, 0.02)), view),
          "#e06c75",
          2,
        );
      }
    });
    drawGraph(
      context,
      viewState.chain,
      viewState.history,
      size.width,
      view.simulationHeight,
      size.height - view.simulationHeight,
    );
  }, [displayChain, drag, safeSpringIndex, showForces, size, view, viewState]);

  const pointerWorld = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const point = canvasToWorld(canvasPoint(event, canvas), view);
    return { x: Math.max(-4, Math.min(4, point.x)), y: Math.max(-4, Math.min(4, point.y)) };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointerWorld(event);
    const index = nearestDynamicSpringParticle(viewState.chain, point, 0.35);
    if (index < 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      constraint: {
        active: true,
        particleIndex: index,
        target: point,
        releaseVelocity: { x: 0, y: 0 },
      },
      previousTarget: point,
      previousTime: performance.now(),
    });
    setCapturing(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const target = pointerWorld(event);
    const now = performance.now();
    const releaseVelocity = estimateSpringReleaseVelocity(
      drag.previousTarget,
      target,
      Math.max(0.0001, (now - drag.previousTime) / 1000),
      6,
    );
    const nextDrag = {
      constraint: { ...drag.constraint, target, releaseVelocity },
      previousTarget: target,
      previousTime: now,
    };
    setDrag(nextDrag);
    setViewState((current) => {
      const chain = { ...current.chain, particles: [...current.chain.particles] };
      const particle = current.chain.particles[drag.constraint.particleIndex];
      chain.particles[drag.constraint.particleIndex] = {
        ...particle,
        position: target,
        velocity: { x: 0, y: 0 },
      };
      return { ...current, chain };
    });
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag) {
      setViewState((current) => {
        const chain = { ...current.chain, particles: [...current.chain.particles] };
        const particle = current.chain.particles[drag.constraint.particleIndex];
        chain.particles[drag.constraint.particleIndex] = {
          ...particle,
          velocity: drag.constraint.releaseVelocity,
        };
        return { ...current, chain };
      });
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const supportsSimulation =
      mode === "spring-integration" ||
      mode === "spring-damping" ||
      mode === "spring-drag" ||
      mode === "spring-stability" ||
      mode === "spring-validation" ||
      !mode;
    if (event.key === " " && supportsSimulation) {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && supportsSimulation) stepOnce();
    if (event.key.toLowerCase() === "r") reset();
  };

  const applyStabilityPreset = (preset: string) => {
    setStabilityPreset(preset);
    if (preset === "stable") {
      setStiffness(40);
      setMass(1);
      setDamping(0.8);
      setFixedDeltaSeconds(1 / 240);
      reset(particleCount, 40, 0.8, 1);
    } else if (preset === "borderline") {
      setStiffness(300);
      setMass(0.1);
      setDamping(0.8);
      setFixedDeltaSeconds(1 / 60);
      reset(particleCount, 300, 0.8, 0.1);
    } else if (preset === "unstable") {
      setStiffness(600);
      setMass(0.1);
      setDamping(0);
      setFixedDeltaSeconds(1 / 30);
      reset(particleCount, 600, 0, 0.1);
    }
  };

  const showParticleCount =
    !mode || mode === "spring-scene" || mode === "spring-drag" || mode === "spring-validation";
  const showStiffness = mode !== "spring-scene";
  const showMass =
    !mode ||
    mode === "spring-integration" ||
    mode === "spring-stability" ||
    mode === "spring-validation";
  const showDamping =
    !mode ||
    mode === "spring-damping" ||
    mode === "spring-stability" ||
    mode === "spring-validation";
  const showFixedDelta =
    !mode ||
    mode === "spring-integration" ||
    mode === "spring-drag" ||
    mode === "spring-stability" ||
    mode === "spring-validation";
  const showSelectedSpring =
    mode === "spring-hooke" || mode === "spring-forces" || mode === "spring-damping";
  const showGravity =
    !mode ||
    mode === "spring-forces" ||
    mode === "spring-integration" ||
    mode === "spring-drag" ||
    mode === "spring-validation";
  const showDampingToggle =
    !mode ||
    mode === "spring-damping" ||
    mode === "spring-stability" ||
    mode === "spring-validation";
  const showForceToggle = !mode || mode === "spring-forces" || mode === "spring-validation";
  const showSimulationControls =
    !mode ||
    mode === "spring-integration" ||
    mode === "spring-damping" ||
    mode === "spring-drag" ||
    mode === "spring-stability" ||
    mode === "spring-validation";
  const showFastRun = !mode || mode === "spring-stability" || mode === "spring-validation";

  const readoutItems = [
    {
      label: "Particles / springs",
      value: `${viewState.chain.particles.length} / ${viewState.chain.springs.length}`,
    },
    {
      label: "Elapsed / substeps",
      value: `${viewState.elapsed.toFixed(3)} s / ${viewState.substeps}`,
    },
    {
      label: "Selected spring",
      value: `#${safeSpringIndex}: L=${springSample.distance.toFixed(3)}, x=${springSample.stretch.toFixed(4)} m`,
    },
  ];
  if (mode === "spring-hooke") {
    readoutItems.push(
      {
        label: "Direction",
        value: `(${springSample.direction.x.toFixed(4)}, ${springSample.direction.y.toFixed(4)})`,
      },
      {
        label: "Hai lực Hooke",
        value: `Fₐ (${springSample.forceOnFirst.x.toFixed(3)}, ${springSample.forceOnFirst.y.toFixed(3)}) N · Fᵦ (${(-springSample.forceOnFirst.x).toFixed(3)}, ${(-springSample.forceOnFirst.y).toFixed(3)}) N`,
      },
    );
  }
  if (mode === "spring-integration") {
    if (integrationTrace) {
      readoutItems.push(
        {
          label: `Particle #${integrationTrace.particleIndex} · force → acceleration`,
          value: `F (${integrationTrace.force.x.toFixed(4)}, ${integrationTrace.force.y.toFixed(4)}) N → a (${integrationTrace.acceleration.x.toFixed(4)}, ${integrationTrace.acceleration.y.toFixed(4)}) m/s²`,
        },
        {
          label: "Velocity trước → sau",
          value: `(${integrationTrace.velocityBefore.x.toFixed(5)}, ${integrationTrace.velocityBefore.y.toFixed(5)}) → (${integrationTrace.velocityAfter.x.toFixed(5)}, ${integrationTrace.velocityAfter.y.toFixed(5)}) m/s`,
        },
        {
          label: "Position trước → sau",
          value: `(${integrationTrace.positionBefore.x.toFixed(5)}, ${integrationTrace.positionBefore.y.toFixed(5)}) → (${integrationTrace.positionAfter.x.toFixed(5)}, ${integrationTrace.positionAfter.y.toFixed(5)}) m`,
        },
      );
    } else {
      readoutItems.push({
        label: "Trace một substep",
        value: "Nhấn “Tiến một bước” để xem force → acceleration → velocity → position.",
      });
    }
  }
  readoutItems.push(
    {
      label: "Stability index q",
      value: `${stability.toFixed(4)} = dt·sqrt(k/m)`,
    },
    {
      label: "Kinetic / spring / gravity",
      value: `${metrics.kineticEnergy.toFixed(3)} / ${metrics.springEnergy.toFixed(3)} / ${metrics.gravitationalEnergy.toFixed(3)} J`,
    },
    {
      label: "Mechanical energy",
      value: `${energy.toFixed(3)} J`,
    },
    {
      label: "Max stretch / speed",
      value: `${metrics.maximumStretch.toFixed(4)} m / ${metrics.maximumSpeed.toFixed(3)} m/s`,
    },
    {
      label: "Anchor / finite / pointer",
      value: `${metrics.anchorError.toExponential(1)} m / ${metrics.finite ? "yes" : "NO"} / ${capturing ? "đang kéo" : "đã nhả"}`,
    },
    {
      label: "Mô tả thay thế",
      value:
        mode === "spring-stability"
          ? `q=${stability.toFixed(3)}; energy ${energy.toFixed(2)} J; stretch lớn nhất ${metrics.maximumStretch.toFixed(3)} m.`
          : "Đường xanh dưới Canvas là độ lệch ngang theo particle index; đường tím là thay đổi energy theo thời gian.",
    },
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Chuỗi khối lượng và lò xo treo với biểu đồ dao động"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
      />
      <div className="lab-controls">
        {mode === "spring-stability" && (
          <label>
            Stability preset
            <select
              value={stabilityPreset}
              onChange={(event) => applyStabilityPreset(event.target.value)}
            >
              <option value="custom">Tự chọn</option>
              <option value="stable">Stable</option>
              <option value="borderline">Borderline</option>
              <option value="unstable">Deliberately unstable</option>
            </select>
          </label>
        )}
        {showParticleCount && (
          <label>
            Số particles
            <select
              value={particleCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setParticleCount(count);
                reset(count);
              }}
            >
              <option value="8">8</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
          </label>
        )}
        {showStiffness && (
          <label>
            Stiffness
            <select
              value={stiffness}
              onChange={(event) => {
                const value = Number(event.target.value);
                setStabilityPreset("custom");
                setStiffness(value);
                reset(particleCount, value);
              }}
            >
              <option value="40">40 N/m</option>
              <option value="120">120 N/m</option>
              <option value="300">300 N/m</option>
              <option value="600">600 N/m</option>
            </select>
          </label>
        )}
        {showMass && (
          <label>
            Mass
            <select
              value={mass}
              onChange={(event) => {
                const value = Number(event.target.value);
                setStabilityPreset("custom");
                setMass(value);
                reset(particleCount, stiffness, damping, value);
              }}
            >
              <option value="0.1">0.10 kg</option>
              <option value="0.25">0.25 kg</option>
              <option value="1">1.00 kg</option>
            </select>
          </label>
        )}
        {showDamping && (
          <label>
            Damping
            <select
              value={damping}
              onChange={(event) => {
                const value = Number(event.target.value);
                setStabilityPreset("custom");
                setDamping(value);
                reset(particleCount, stiffness, value);
              }}
            >
              <option value="0">0 N·s/m</option>
              <option value="0.8">0.8 N·s/m</option>
              <option value="1.6">1.6 N·s/m</option>
              <option value="4">4.0 N·s/m</option>
            </select>
          </label>
        )}
        {showFixedDelta && (
          <label>
            Fixed dt
            <select
              value={fixedDeltaSeconds}
              onChange={(event) => {
                setStabilityPreset("custom");
                setFixedDeltaSeconds(Number(event.target.value));
                reset();
              }}
            >
              <option value={1 / 30}>1/30 s</option>
              <option value={1 / 60}>1/60 s</option>
              <option value={1 / 120}>1/120 s</option>
              <option value={1 / 240}>1/240 s</option>
              <option value={1 / 480}>1/480 s</option>
            </select>
          </label>
        )}
        {showSelectedSpring && (
          <label>
            Spring được chọn
            <input
              type="range"
              min="0"
              max={Math.max(0, viewState.chain.springs.length - 1)}
              value={safeSpringIndex}
              onChange={(event) => setSelectedSpring(Number(event.target.value))}
            />
          </label>
        )}
        {mode === "spring-hooke" && (
          <label>
            Distance
            <input
              type="range"
              min="0.1"
              max="1.2"
              step="0.01"
              value={hookeDistance}
              onChange={(event) => setHookeDistance(Number(event.target.value))}
            />
          </label>
        )}
        {mode === "spring-hooke" && (
          <label>
            Endpoint angle
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={hookeAngleDegrees}
              onChange={(event) => setHookeAngleDegrees(Number(event.target.value))}
            />
          </label>
        )}
        {showGravity && (
          <label>
            <input
              type="checkbox"
              checked={gravityEnabled}
              onChange={(event) => setGravityEnabled(event.target.checked)}
            />
            Gravity
          </label>
        )}
        {showDampingToggle && (
          <label>
            <input
              type="checkbox"
              checked={dampingEnabled}
              onChange={(event) => setDampingEnabled(event.target.checked)}
            />
            Axial damping
          </label>
        )}
        {showForceToggle && (
          <label>
            <input
              type="checkbox"
              checked={showForces}
              onChange={(event) => setShowForces(event.target.checked)}
            />
            Force vectors
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
            Chạy nhanh 20 giây
          </button>
        )}
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
      </div>
      <LabReadout items={readoutItems} />
      <p className="lab-hint">
        Kéo trực tiếp một mass rồi thả. Space chạy/dừng, N tiến một fixed step và R dựng lại chuỗi.
        Reduced motion giữ demo ở trạng thái paused cho tới khi bạn chủ động chạy.
      </p>
    </>
  );
}
