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
  barnesHutAcceleration,
  buildMassOctree,
  directAcceleration,
  inspectMassOctree,
  makeGalaxyBodies,
  measureThetaAccuracy,
  softenedAcceleration,
  stepBodiesSymplecticEuler,
  systemDiagnostics,
  type AccuracyRow,
  type BarnesHutTree,
  type Body3D,
  type SystemDiagnostics,
  type Vec3,
} from "@/lib/labs/barnes-hut-nbody";
import { projectPointWithOrbit } from "@/lib/labs/octree";
import { LabReadout, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const DEFAULT_SEED = 0x31c0ffee;
const GRAVITATIONAL_CONSTANT = 0.001;
const FIXED_DELTA_SECONDS = 1 / 240;
const THETA_PRESETS = [0.25, 0.5, 0.8, 1.1] as const;

interface Projection {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

interface ScalingRow {
  count: number;
  directMilliseconds: number;
  barnesHutMilliseconds: number;
  directInteractions: number;
  barnesHutWork: number;
}

function magnitude(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function projectToCanvas(
  point: Vec3,
  yaw: number,
  pitch: number,
  distance: number,
  width: number,
  height: number,
): Projection {
  const normalizedPoint = {
    x: point.x * 0.5 + 0.5,
    y: point.y * 0.5 + 0.5,
    z: point.z * 0.5 + 0.5,
  };
  const projected = projectPointWithOrbit(normalizedPoint, {
    yaw,
    pitch,
    distance,
    fieldOfViewRadians: Math.PI / 3,
    aspect: width / Math.max(1, height),
    nearPlane: 0.1,
  });
  const scale = Math.min(width, height) * 0.84;
  return {
    x: width * 0.5 + projected.x * scale * 0.5,
    y: height * 0.47 - projected.y * scale * 0.5,
    depth: projected.depth,
    visible: projected.visible,
  };
}

function drawNodeBounds(
  context: CanvasRenderingContext2D,
  tree: BarnesHutTree,
  yaw: number,
  pitch: number,
  distance: number,
  width: number,
  height: number,
) {
  const leaves = tree.nodes.filter((node) => node.children === null && node.totalMass > 0);
  const stride = Math.max(1, Math.ceil(leaves.length / 900));
  leaves.forEach((node, leafIndex) => {
    if (leafIndex % stride !== 0) return;
    const minimum = node.bounds.minimum;
    const maximum = node.bounds.maximum;
    const corners = [
      { x: minimum.x, y: minimum.y, z: minimum.z },
      { x: maximum.x, y: minimum.y, z: minimum.z },
      { x: maximum.x, y: maximum.y, z: minimum.z },
      { x: minimum.x, y: maximum.y, z: minimum.z },
      { x: minimum.x, y: minimum.y, z: maximum.z },
      { x: maximum.x, y: minimum.y, z: maximum.z },
      { x: maximum.x, y: maximum.y, z: maximum.z },
      { x: minimum.x, y: maximum.y, z: maximum.z },
    ].map((point) => projectToCanvas(point, yaw, pitch, distance, width, height));
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ] as const;
    context.strokeStyle = `rgba(97, 175, 239, ${Math.min(0.5, 0.12 + node.depth * 0.035)})`;
    context.lineWidth = 0.8;
    context.beginPath();
    for (const [startIndex, endIndex] of edges) {
      const start = corners[startIndex];
      const end = corners[endIndex];
      if (!start.visible || !end.visible) continue;
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }
    context.stroke();
  });
}

function drawAccuracyGraph(
  context: CanvasRenderingContext2D,
  rows: readonly AccuracyRow[],
  width: number,
  height: number,
) {
  if (rows.length === 0) return;
  const left = 40;
  const right = width - 28;
  const top = height - 132;
  const bottom = height - 28;
  const maximumError = Math.max(...rows.map((row) => row.meanRelativeError), 1e-6);
  const maximumWork = Math.max(
    ...rows.map((row) => row.exactInteractions + row.approximatedNodes),
    1,
  );
  const slotWidth = (right - left) / rows.length;

  context.fillStyle = "rgba(11, 16, 32, 0.9)";
  context.fillRect(left - 20, top - 20, right - left + 40, bottom - top + 40);
  context.strokeStyle = "#42516b";
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  context.font = "11px ui-monospace, monospace";
  context.fillStyle = "#e5c07b";
  context.fillText("mean error", left + 4, top + 11);
  context.fillStyle = "#98c379";
  context.fillText("● work", left + 92, top + 11);
  rows.forEach((row, index) => {
    const centerX = left + slotWidth * (index + 0.5);
    const errorHeight = (row.meanRelativeError / maximumError) * (bottom - top - 18);
    context.fillStyle = "rgba(229, 192, 123, 0.76)";
    context.fillRect(centerX - 14, bottom - errorHeight, 28, errorHeight);
    const work = row.exactInteractions + row.approximatedNodes;
    const workY = bottom - (work / maximumWork) * (bottom - top - 18);
    context.fillStyle = "#98c379";
    context.beginPath();
    context.arc(centerX, workY, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#abb2bf";
    context.textAlign = "center";
    context.fillText(row.theta.toFixed(2), centerX, bottom + 15);
  });
  context.textAlign = "start";
}

export default function BarnesHutNBodyLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointerId = useRef<number | null>(null);
  const previousPointer = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousTimestamp = useRef<number | null>(null);
  const accumulator = useRef(0);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const diagnosticsEnabled = mode === "nbody-validation" || !mode;
  const [bodyCount, setBodyCount] = useState(512);
  const [bodies, setBodies] = useState<Body3D[]>(() => makeGalaxyBodies(512, DEFAULT_SEED));
  const [theta, setTheta] = useState(0.5);
  const [softening, setSoftening] = useState(0.02);
  const [selectedBody, setSelectedBody] = useState(1);
  const [useBarnesHut, setUseBarnesHut] = useState(true);
  const [paused, setPaused] = useState(true);
  const [yaw, setYaw] = useState(0.45);
  const [pitch, setPitch] = useState(-0.52);
  const [distance, setDistance] = useState(2.5);
  const [capturing, setCapturing] = useState(false);
  const [accuracyRows, setAccuracyRows] = useState<AccuracyRow[]>([]);
  const [scalingRows, setScalingRows] = useState<ScalingRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(() =>
    diagnosticsEnabled
      ? systemDiagnostics(makeGalaxyBodies(512, DEFAULT_SEED), GRAVITATIONAL_CONSTANT, 0.02)
      : null,
  );

  const showPairForce = mode !== "nbody-scene";
  const showDirect = mode !== "nbody-scene" && mode !== "nbody-pair-force";
  const showSimulation =
    mode === "nbody-fixed-step" ||
    mode === "nbody-mass-tree" ||
    mode === "nbody-opening" ||
    mode === "nbody-self-force" ||
    mode === "nbody-accuracy" ||
    mode === "nbody-scaling" ||
    mode === "nbody-validation" ||
    !mode;
  const showTree =
    mode === "nbody-mass-tree" ||
    mode === "nbody-opening" ||
    mode === "nbody-self-force" ||
    mode === "nbody-accuracy" ||
    mode === "nbody-scaling" ||
    mode === "nbody-validation" ||
    !mode;
  const showBarnesHut =
    mode === "nbody-opening" ||
    mode === "nbody-self-force" ||
    mode === "nbody-accuracy" ||
    mode === "nbody-scaling" ||
    mode === "nbody-validation" ||
    !mode;
  const showTopology =
    mode === "nbody-self-force" ||
    mode === "nbody-accuracy" ||
    mode === "nbody-scaling" ||
    mode === "nbody-validation" ||
    !mode;
  const showAccuracy =
    mode === "nbody-accuracy" || mode === "nbody-scaling" || mode === "nbody-validation" || !mode;
  const showScaling = mode === "nbody-scaling" || mode === "nbody-validation" || !mode;
  const showDiagnostics = diagnosticsEnabled;
  const simulateWithBarnesHut = showBarnesHut && useBarnesHut;
  const captureDiagnostics = (snapshot = bodies, epsilon = softening) => {
    if (!showDiagnostics) return;
    setDiagnostics(
      systemDiagnostics(
        snapshot.slice(0, Math.min(512, snapshot.length)),
        GRAVITATIONAL_CONSTANT,
        epsilon,
      ),
    );
  };
  const tree = useMemo(() => buildMassOctree(bodies), [bodies]);
  const topology = useMemo(() => inspectMassOctree(tree, bodies), [bodies, tree]);
  const topologyValid = Object.values(topology).every(Boolean);
  const safeSelectedBody = Math.min(selectedBody, bodies.length - 1);
  const exactResult = useMemo(
    () => directAcceleration(bodies, safeSelectedBody, GRAVITATIONAL_CONSTANT, softening),
    [bodies, safeSelectedBody, softening],
  );
  const pairAcceleration = useMemo(
    () =>
      softenedAcceleration(
        bodies[safeSelectedBody].position,
        bodies[0].position,
        bodies[0].mass,
        GRAVITATIONAL_CONSTANT,
        softening,
      ),
    [bodies, safeSelectedBody, softening],
  );
  const approximateResult = useMemo(
    () =>
      barnesHutAcceleration(
        tree,
        bodies,
        safeSelectedBody,
        theta,
        GRAVITATIONAL_CONSTANT,
        softening,
      ),
    [bodies, safeSelectedBody, softening, theta, tree],
  );
  const relativeError =
    Math.hypot(
      approximateResult.acceleration.x - exactResult.acceleration.x,
      approximateResult.acceleration.y - exactResult.acceleration.y,
      approximateResult.acceleration.z - exactResult.acceleration.z,
    ) / Math.max(magnitude(exactResult.acceleration), 1e-12);
  const advanceOneStep = () => {
    const nextBodies = stepBodiesSymplecticEuler(
      bodies,
      FIXED_DELTA_SECONDS,
      theta,
      GRAVITATIONAL_CONSTANT,
      softening,
      simulateWithBarnesHut,
    );
    setBodies(nextBodies);
    captureDiagnostics(nextBodies);
    setAccuracyRows([]);
    setScalingRows([]);
  };

  useEffect(() => {
    if (paused || reducedMotion) {
      previousTimestamp.current = null;
      accumulator.current = 0;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      const previous = previousTimestamp.current ?? timestamp;
      const frameSeconds = Math.min(0.05, (timestamp - previous) / 1000);
      previousTimestamp.current = timestamp;
      accumulator.current += frameSeconds;
      let steps = 0;
      while (accumulator.current >= FIXED_DELTA_SECONDS && steps < 4) {
        accumulator.current -= FIXED_DELTA_SECONDS;
        steps += 1;
      }
      if (accumulator.current >= FIXED_DELTA_SECONDS) {
        accumulator.current %= FIXED_DELTA_SECONDS;
      }
      if (steps > 0) {
        setBodies((current) => {
          let next = current;
          for (let step = 0; step < steps; step += 1) {
            next = stepBodiesSymplecticEuler(
              next,
              FIXED_DELTA_SECONDS,
              theta,
              GRAVITATIONAL_CONSTANT,
              softening,
              simulateWithBarnesHut,
            );
          }
          return next;
        });
        setAccuracyRows((current) => (current.length === 0 ? current : []));
        setScalingRows((current) => (current.length === 0 ? current : []));
      }
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      previousTimestamp.current = null;
    };
  }, [paused, reducedMotion, simulateWithBarnesHut, softening, theta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, size.width, size.height);

    if (showTree) drawNodeBounds(context, tree, yaw, pitch, distance, size.width, size.height);
    const projected = bodies.map((body, index) => ({
      index,
      mass: body.mass,
      projection: projectToCanvas(body.position, yaw, pitch, distance, size.width, size.height),
    }));
    projected.sort((left, right) => right.projection.depth - left.projection.depth);
    for (const item of projected) {
      if (!item.projection.visible) continue;
      const selected = item.index === safeSelectedBody;
      context.fillStyle = selected ? "#e5c07b" : item.index === 0 ? "#e06c75" : "#abb2bf";
      const radius = selected ? 4 : item.index === 0 ? 5 : Math.min(2.4, 0.8 + item.mass * 0.45);
      context.beginPath();
      context.arc(item.projection.x, item.projection.y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const selectedProjection = projectToCanvas(
      bodies[safeSelectedBody].position,
      yaw,
      pitch,
      distance,
      size.width,
      size.height,
    );
    if (selectedProjection.visible && showPairForce) {
      const acceleration =
        mode === "nbody-pair-force"
          ? pairAcceleration
          : simulateWithBarnesHut
            ? approximateResult.acceleration
            : exactResult.acceleration;
      const accelerationMagnitude = magnitude(acceleration);
      const arrowLength = Math.min(0.16, Math.max(0.025, Math.log1p(accelerationMagnitude) * 0.04));
      const forceScale = arrowLength / Math.max(accelerationMagnitude, 1e-9);
      const arrowEnd = projectToCanvas(
        {
          x: bodies[safeSelectedBody].position.x + acceleration.x * forceScale,
          y: bodies[safeSelectedBody].position.y + acceleration.y * forceScale,
          z: bodies[safeSelectedBody].position.z + acceleration.z * forceScale,
        },
        yaw,
        pitch,
        distance,
        size.width,
        size.height,
      );
      context.strokeStyle = "#e5c07b";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(selectedProjection.x, selectedProjection.y);
      context.lineTo(arrowEnd.x, arrowEnd.y);
      context.stroke();
    }

    if (showAccuracy) drawAccuracyGraph(context, accuracyRows, size.width, size.height);
  }, [
    accuracyRows,
    approximateResult.acceleration,
    bodies,
    distance,
    exactResult.acceleration,
    mode,
    pairAcceleration,
    pitch,
    safeSelectedBody,
    showAccuracy,
    showPairForce,
    showTree,
    size,
    tree,
    simulateWithBarnesHut,
    yaw,
  ]);

  const reset = (nextCount = bodyCount) => {
    const canvas = canvasRef.current;
    if (
      canvas !== null &&
      activePointerId.current !== null &&
      canvas.hasPointerCapture(activePointerId.current)
    ) {
      canvas.releasePointerCapture(activePointerId.current);
    }
    const nextBodies = makeGalaxyBodies(nextCount, DEFAULT_SEED);
    setBodies(nextBodies);
    setSelectedBody(Math.min(1, nextCount - 1));
    setTheta(0.5);
    setSoftening(0.02);
    setUseBarnesHut(true);
    setPaused(true);
    setYaw(0.45);
    setPitch(-0.52);
    setDistance(2.5);
    setCapturing(false);
    setAccuracyRows([]);
    setScalingRows([]);
    captureDiagnostics(nextBodies, 0.02);
    activePointerId.current = null;
    previousPointer.current = null;
  };

  const runAccuracyStudy = () => {
    setPaused(true);
    setAccuracyRows(
      measureThetaAccuracy(
        bodies,
        THETA_PRESETS,
        Math.min(24, bodies.length),
        GRAVITATIONAL_CONSTANT,
        softening,
      ),
    );
  };

  const runScalingStudy = () => {
    setPaused(true);
    const rows = [128, 256, 512, 1024].map((count) => {
      const sample = makeGalaxyBodies(count, DEFAULT_SEED);
      const sampleTree = buildMassOctree(sample);
      let directInteractions = 0;
      let started = performance.now();
      for (let targetIndex = 0; targetIndex < count; targetIndex += 1) {
        directInteractions += directAcceleration(
          sample,
          targetIndex,
          GRAVITATIONAL_CONSTANT,
          softening,
        ).exactInteractions;
      }
      const directMilliseconds = performance.now() - started;
      let barnesHutWork = 0;
      started = performance.now();
      for (let targetIndex = 0; targetIndex < count; targetIndex += 1) {
        const result = barnesHutAcceleration(
          sampleTree,
          sample,
          targetIndex,
          theta,
          GRAVITATIONAL_CONSTANT,
          softening,
        );
        barnesHutWork += result.exactInteractions + result.approximatedNodes;
      }
      const barnesHutMilliseconds = performance.now() - started;
      return {
        count,
        directMilliseconds,
        barnesHutMilliseconds,
        directInteractions,
        barnesHutWork,
      };
    });
    setScalingRows(rows);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    previousPointer.current = { x: event.clientX, y: event.clientY };
    setCapturing(true);
    if (!paused) captureDiagnostics();
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const previous = previousPointer.current;
    if (!capturing || previous === null) return;
    setYaw((current) => current + (event.clientX - previous.x) * 0.008);
    setPitch((current) =>
      Math.max(-1.35, Math.min(1.35, current + (event.clientY - previous.y) * 0.008)),
    );
    previousPointer.current = { x: event.clientX, y: event.clientY };
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointerId.current = null;
    previousPointer.current = null;
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === " " && showSimulation) {
      event.preventDefault();
      setAccuracyRows([]);
      setScalingRows([]);
      if (!paused) captureDiagnostics();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && showSimulation) advanceOneStep();
    if (event.key.toLowerCase() === "r") reset();
    if (event.key.toLowerCase() === "t" && showAccuracy) runAccuracyStudy();
    if (event.key.toLowerCase() === "b" && showScaling) runScalingStudy();
    if (event.key === "ArrowLeft") setYaw((current) => current - 0.08);
    if (event.key === "ArrowRight") setYaw((current) => current + 0.08);
    if (event.key === "ArrowUp") setPitch((current) => Math.max(-1.35, current - 0.08));
    if (event.key === "ArrowDown") setPitch((current) => Math.min(1.35, current + 0.08));
  };

  const root = tree.nodes[0];
  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng thiên hà N-body 3D so sánh lực trực tiếp với xấp xỉ Barnes–Hut"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={(event) => {
          event.preventDefault();
          setDistance((current) => Math.max(1.3, Math.min(5, current + event.deltaY * 0.002)));
        }}
      />
      <div className="lab-controls">
        <label>
          Số bodies
          <select
            value={bodyCount}
            onChange={(event) => {
              const nextCount = Number(event.target.value);
              setBodyCount(nextCount);
              reset(nextCount);
            }}
          >
            <option value={128}>128</option>
            <option value={512}>512</option>
            <option value={1024}>1.024</option>
          </select>
        </label>
        {showBarnesHut && (
          <label>
            Algorithm
            <select
              value={useBarnesHut ? "barnes-hut" : "direct"}
              onChange={(event) => {
                setUseBarnesHut(event.target.value === "barnes-hut");
                setPaused(true);
              }}
            >
              <option value="barnes-hut">Barnes–Hut</option>
              <option value="direct">Direct O(N²)</option>
            </select>
          </label>
        )}
        {showBarnesHut && (
          <label>
            Theta: {theta.toFixed(2)}
            <input
              type="range"
              min={0.1}
              max={1.2}
              step={0.05}
              value={theta}
              onChange={(event) => {
                setTheta(Number(event.target.value));
                setPaused(true);
                setAccuracyRows([]);
                setScalingRows([]);
              }}
            />
          </label>
        )}
        {showPairForce && (
          <label>
            Softening: {softening.toFixed(3)}
            <input
              type="range"
              min={0.005}
              max={0.08}
              step={0.005}
              value={softening}
              onChange={(event) => {
                const nextSoftening = Number(event.target.value);
                setSoftening(nextSoftening);
                setPaused(true);
                setAccuracyRows([]);
                setScalingRows([]);
                captureDiagnostics(bodies, nextSoftening);
              }}
            />
          </label>
        )}
        {showPairForce && (
          <label>
            Body đang theo dõi
            <input
              type="range"
              min={0}
              max={Math.max(0, bodies.length - 1)}
              step={1}
              value={safeSelectedBody}
              onChange={(event) => setSelectedBody(Number(event.target.value))}
            />
          </label>
        )}
        {showSimulation && (
          <button
            type="button"
            onClick={() => {
              setAccuracyRows([]);
              setScalingRows([]);
              if (!paused) captureDiagnostics();
              setPaused((current) => !current);
            }}
          >
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        {showSimulation && (
          <button type="button" onClick={advanceOneStep}>
            Tiến một fixed step
          </button>
        )}
        {showAccuracy && (
          <button type="button" onClick={runAccuracyStudy}>
            Chạy theta sweep
          </button>
        )}
        {showScaling && (
          <button type="button" onClick={runScalingStudy}>
            Chạy scaling study
          </button>
        )}
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          {
            label: "Scene / world state",
            value: `${bodies.length.toLocaleString("vi-VN")} bodies · total mass ${root.totalMass.toFixed(2)} · seed ${DEFAULT_SEED.toString(16).toUpperCase()}`,
          },
          ...(showPairForce
            ? [
                {
                  label: "Body đang theo dõi / lực từ body 0",
                  value: `#${safeSelectedBody} · |a_pair| ${magnitude(pairAcceleration).toExponential(3)} · softening ${softening.toFixed(3)}`,
                },
              ]
            : []),
          ...(showDirect
            ? [
                {
                  label: "Direct N-body",
                  value: `|a| ${magnitude(exactResult.acceleration).toExponential(3)} · ${exactResult.exactInteractions.toLocaleString("vi-VN")} interactions cho body #${safeSelectedBody}`,
                },
              ]
            : []),
          ...(showTree
            ? [
                {
                  label: "Tree / aggregate root",
                  value: `${tree.nodes.length.toLocaleString("vi-VN")} nodes · depth ${tree.maximumObservedDepth} · COM (${root.centerOfMass.x.toFixed(3)}, ${root.centerOfMass.y.toFixed(3)}, ${root.centerOfMass.z.toFixed(3)})`,
                },
              ]
            : []),
          ...(showBarnesHut
            ? [
                {
                  label: "Barnes–Hut work",
                  value: `${approximateResult.visitedNodes.toLocaleString("vi-VN")} nodes visited · ${approximateResult.approximatedNodes.toLocaleString("vi-VN")} aggregate sources · ${approximateResult.exactInteractions.toLocaleString("vi-VN")} exact pairs`,
                },
                {
                  label: "Sai số lực tại body đang theo dõi",
                  value: `${(relativeError * 100).toFixed(3)}% với θ=${theta.toFixed(2)}`,
                },
              ]
            : []),
          ...(showTopology
            ? [
                {
                  label: "Topology / self-force contract",
                  value: `${topologyValid ? "aggregate tree hợp lệ" : "TREE KHÔNG HỢP LỆ"} · node chứa target luôn mở tiếp`,
                },
              ]
            : []),
          ...(showDiagnostics
            ? [
                {
                  label: "Năng lượng / momentum (tối đa 512 bodies)",
                  value: diagnostics
                    ? `E ${diagnostics.totalEnergy.toFixed(4)} · |P| ${magnitude(diagnostics.momentum).toExponential(3)}${paused ? "" : " · snapshot gần nhất khi pause"}`
                    : "đang tính snapshot đầu tiên…",
                },
              ]
            : []),
          ...(showAccuracy
            ? [
                {
                  label: "Theta sweep",
                  value:
                    accuracyRows.length === 0
                      ? "chưa chạy — bấm Chạy theta sweep để lấy snapshot hiện tại"
                      : accuracyRows
                          .map(
                            (row) =>
                              `θ ${row.theta.toFixed(2)}: ${(row.meanRelativeError * 100).toFixed(2)}% / ${(row.exactInteractions + row.approximatedNodes).toLocaleString("vi-VN")} work`,
                          )
                          .join(" · "),
                },
              ]
            : []),
          ...(showScaling
            ? [
                {
                  label: "Scaling study direct / Barnes–Hut",
                  value:
                    scalingRows.length === 0
                      ? "chưa chạy"
                      : scalingRows
                          .map(
                            (row) =>
                              `${row.count}: ${row.directMilliseconds.toFixed(1)}/${row.barnesHutMilliseconds.toFixed(1)} ms · ${row.directInteractions.toLocaleString("vi-VN")}/${row.barnesHutWork.toLocaleString("vi-VN")} work`,
                          )
                          .join(" · "),
                },
              ]
            : []),
          {
            label: "Camera / pointer / timestep",
            value: `yaw ${yaw.toFixed(2)} · pitch ${pitch.toFixed(2)} · ${capturing ? "đang xoay" : "đã nhả"} · dt ${FIXED_DELTA_SECONDS.toFixed(5)} s`,
          },
          {
            label: "Mô tả thay thế",
            value: showBarnesHut
              ? `Thiên hà có ${bodies.length} bodies. Barnes–Hut dùng ${approximateResult.approximatedNodes} node tổng hợp và ${approximateResult.exactInteractions} tương tác trực tiếp cho body ${safeSelectedBody}; sai số lực ${(relativeError * 100).toFixed(3)}%.`
              : `Thiên hà có ${bodies.length} bodies trong world space. Camera chỉ thay đổi cách quan sát; state vật lý không đổi khi xoay hoặc zoom.`,
          },
        ]}
      />
      <p className="lab-hint">
        Kéo Canvas để xoay, cuộn để zoom và nhấn R để reset.
        {showSimulation && " Space chạy/dừng; N tiến đúng một fixed step."}
        {showAccuracy && " T hoặc nút theta sweep đo accuracy trên snapshot hiện tại."}
        {showScaling && " B hoặc nút scaling chạy phép so full-system hữu hạn."}
        {showBarnesHut && " Hạ θ để mở nhiều node hơn; tăng θ để nhận nhiều nguồn tổng hợp hơn."}
        {showPairForce &&
          " Độ dài mũi tên acceleration dùng log scale để vẫn đọc được khi độ lớn thay đổi mạnh."}
      </p>
    </>
  );
}
