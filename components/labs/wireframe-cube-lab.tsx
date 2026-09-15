"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Vec3 } from "@/lib/labs/normal";
import type { EulerAngles, RotationOrder } from "@/lib/labs/rotation3d";
import {
  CUBE_EDGES,
  advanceCubeAngles,
  applyCubeMouseDrag,
  cubeRotationRoundTripError,
  cubeVertexDegrees,
  hasValidCubeTopology,
  makeCubeVertices,
  maximumCubeEdgeLengthError,
  projectWireframeCube,
  rotateCubeVertices,
  translateCubeVertices,
  visibleCubeEdgesBackToFront,
} from "@/lib/labs/wireframe-cube";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const INITIAL_POSITION: Vec3 = { x: 0, y: 0, z: 6 };
const INITIAL_ANGLES: EulerAngles = { pitch: 18 * DEG_TO_RAD, yaw: 28 * DEG_TO_RAD, roll: 0 };
const ANGULAR_VELOCITY: EulerAngles = {
  pitch: 16 * DEG_TO_RAD,
  yaw: 26 * DEG_TO_RAD,
  roll: 10 * DEG_TO_RAD,
};

function formatVec3(point: Vec3) {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
}

function mixChannel(from: number, to: number, amount: number) {
  return Math.round(from + (to - from) * Math.max(0, Math.min(1, amount)));
}

function edgeColor(depthFactor: number, depthCue: boolean) {
  if (!depthCue) return "rgb(132 169 255)";
  return `rgb(${mixChannel(54, 168, depthFactor)} ${mixChannel(72, 236, depthFactor)} ${mixChannel(112, 255, depthFactor)})`;
}

export default function WireframeCubeLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const showEdges = mode !== "cube-vertices";
  const showTransform =
    mode === undefined || ["cube-transform", "cube-depth", "cube-validation"].includes(mode);
  const showDepth = mode === undefined || ["cube-depth", "cube-validation"].includes(mode);
  const showInteraction = mode === undefined || mode === "cube-validation";

  const [halfExtent, setHalfExtent] = useState(1.2);
  const [modelPosition, setModelPosition] = useState<Vec3>(INITIAL_POSITION);
  const [angles, setAngles] = useState<EulerAngles>(() =>
    showTransform ? INITIAL_ANGLES : { pitch: 0, yaw: 0, roll: 0 },
  );
  const [order, setOrder] = useState<RotationOrder>("xyz");
  const [selectedVertex, setSelectedVertex] = useState(0);
  const [selectedEdge, setSelectedEdge] = useState(0);
  const [depthCue, setDepthCue] = useState(true);
  const [showVertices, setShowVertices] = useState(true);
  const [sensitivity, setSensitivity] = useState(0.008);
  const [mouseDelta, setMouseDelta] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(true);

  const localVertices = useMemo(() => makeCubeVertices(halfExtent), [halfExtent]);
  const activeAngles = useMemo<EulerAngles>(
    () => (showTransform ? angles : { pitch: 0, yaw: 0, roll: 0 }),
    [angles, showTransform],
  );
  const rotatedLocal = useMemo(
    () => rotateCubeVertices(localVertices, activeAngles, order),
    [activeAngles, localVertices, order],
  );
  const worldVertices = useMemo(
    () => translateCubeVertices(rotatedLocal, modelPosition),
    [modelPosition, rotatedLocal],
  );
  const camera = useMemo(() => ({ position: { x: 0, y: 0, z: 0 } }), []);
  const lens = useMemo(() => ({ verticalFovRadians: 60 * DEG_TO_RAD }), []);
  const projection = useMemo(
    () => projectWireframeCube(worldVertices, camera, lens, 0.5, size.width, size.height),
    [camera, lens, size.height, size.width, worldVertices],
  );
  const visibleEdges = useMemo(() => visibleCubeEdgesBackToFront(projection), [projection]);
  const degrees = useMemo(() => cubeVertexDegrees(), []);
  const edgeError = maximumCubeEdgeLengthError(localVertices, rotatedLocal);
  const roundTripError = cubeRotationRoundTripError(localVertices, activeAngles, order);

  useEffect(() => {
    if (!showInteraction || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = (now - previous) / 1000;
      previous = now;
      setAngles((current) => advanceCubeAngles(current, ANGULAR_VELOCITY, deltaTime));
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, showInteraction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    for (let x = 0; x < size.width; x += 40) {
      drawLine(context, { x, y: 0 }, { x, y: size.height }, "#18233a");
    }
    for (let y = 0; y < size.height; y += 40) {
      drawLine(context, { x: 0, y }, { x: size.width, y }, "#18233a");
    }

    if (showTransform) {
      const unrotatedWorld = translateCubeVertices(localVertices, modelPosition);
      const ghost = projectWireframeCube(
        unrotatedWorld,
        camera,
        lens,
        0.5,
        size.width,
        size.height,
      );
      for (const edge of CUBE_EDGES) {
        if (ghost.vertices[edge.from].status !== "visible") continue;
        if (ghost.vertices[edge.to].status !== "visible") continue;
        drawLine(
          context,
          ghost.vertices[edge.from].screen,
          ghost.vertices[edge.to].screen,
          "#33415f",
        );
      }
    }

    if (showEdges) {
      for (const item of visibleEdges) {
        const edge = CUBE_EDGES[item.edgeIndex];
        drawLine(
          context,
          projection.vertices[edge.from].screen,
          projection.vertices[edge.to].screen,
          item.edgeIndex === selectedEdge
            ? "#ffb454"
            : edgeColor(item.depthFactor, showDepth && depthCue),
          item.edgeIndex === selectedEdge ? 4 : 2.5,
        );
      }
    }

    if (showVertices) {
      for (const [index, vertex] of projection.vertices.entries()) {
        if (vertex.status !== "visible") continue;
        context.beginPath();
        context.arc(
          vertex.screen.x,
          vertex.screen.y,
          index === selectedVertex ? 8 : 5,
          0,
          Math.PI * 2,
        );
        context.fillStyle = index < 4 ? "#ffbe5c" : "#5cecb9";
        context.fill();
        context.fillStyle = "#f7f9ff";
        context.font = "700 11px ui-monospace";
        context.fillText(String(index), vertex.screen.x + 8, vertex.screen.y - 7);
      }
    }

    if (projection.vertices.some((vertex) => vertex.status !== "visible")) {
      context.fillStyle = "#ff6b6b";
      context.font = "700 12px ui-monospace";
      context.fillText("Edge có endpoint không visible sẽ được bỏ qua", 16, 24);
    }
  }, [
    camera,
    depthCue,
    lens,
    localVertices,
    modelPosition,
    projection,
    selectedEdge,
    selectedVertex,
    showDepth,
    showEdges,
    showTransform,
    showVertices,
    size,
    visibleEdges,
  ]);

  const reset = () => {
    setHalfExtent(1.2);
    setModelPosition(INITIAL_POSITION);
    setAngles(showTransform ? INITIAL_ANGLES : { pitch: 0, yaw: 0, roll: 0 });
    setOrder("xyz");
    setSelectedVertex(0);
    setSelectedEdge(0);
    setDepthCue(true);
    setShowVertices(true);
    setSensitivity(0.008);
    setMouseDelta({ x: 0, y: 0 });
    setDragging(false);
    setPaused(true);
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showInteraction) return;
    lastPointer.current = canvasPoint(event, event.currentTarget);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setPaused(true);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showInteraction || !lastPointer.current) return;
    const point = canvasPoint(event, event.currentTarget);
    const delta = { x: point.x - lastPointer.current.x, y: point.y - lastPointer.current.y };
    lastPointer.current = point;
    setMouseDelta(delta);
    setAngles((current) => applyCubeMouseDrag(current, delta.x, delta.y, sensitivity));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastPointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const step = event.shiftKey ? 10 * DEG_TO_RAD : 3 * DEG_TO_RAD;
    let handled = true;
    let pauseAfterInput = true;
    const key = event.key.toLowerCase();

    if (showTransform && key === "w")
      setAngles((current) => ({ ...current, pitch: current.pitch + step }));
    else if (showTransform && key === "s")
      setAngles((current) => ({ ...current, pitch: current.pitch - step }));
    else if (showTransform && key === "a")
      setAngles((current) => ({ ...current, yaw: current.yaw - step }));
    else if (showTransform && key === "d")
      setAngles((current) => ({ ...current, yaw: current.yaw + step }));
    else if (showTransform && key === "q")
      setAngles((current) => ({ ...current, roll: current.roll - step }));
    else if (showTransform && key === "e")
      setAngles((current) => ({ ...current, roll: current.roll + step }));
    else if (showTransform && key === "o")
      setOrder((current) => (current === "xyz" ? "zyx" : "xyz"));
    else if (showDepth && key === "c") setDepthCue((current) => !current);
    else if (showInteraction && key === "v") setShowVertices((current) => !current);
    else if (event.key === "ArrowLeft")
      setModelPosition((current) => ({ ...current, x: current.x - 0.1 }));
    else if (event.key === "ArrowRight")
      setModelPosition((current) => ({ ...current, x: current.x + 0.1 }));
    else if (event.key === "ArrowDown")
      setModelPosition((current) => ({ ...current, y: current.y - 0.1 }));
    else if (event.key === "ArrowUp")
      setModelPosition((current) => ({ ...current, y: current.y + 0.1 }));
    else if (event.key === "PageDown")
      setModelPosition((current) => ({ ...current, z: current.z - 0.1 }));
    else if (event.key === "PageUp")
      setModelPosition((current) => ({ ...current, z: current.z + 0.1 }));
    else if (key === "r") reset();
    else if (showInteraction && event.key === " ") {
      setPaused((current) => !current);
      pauseAfterInput = false;
    } else if (showInteraction && event.key === "." && paused) {
      setAngles((current) => advanceCubeAngles(current, ANGULAR_VELOCITY, 1 / 60));
    } else handled = false;

    if (handled) {
      event.preventDefault();
      if (pauseAfterInput) setPaused(true);
    }
  };

  const selectedEdgeData = CUBE_EDGES[selectedEdge];
  const farToNear = visibleEdges
    .slice(0, 6)
    .map((edge) => `#${edge.edgeIndex} z=${edge.averageDepth.toFixed(2)}`)
    .join(" → ");

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Half extent
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={halfExtent}
            onChange={(event) => setHalfExtent(Number(event.target.value))}
          />
          <output>{halfExtent.toFixed(1)}</output>
        </label>
        {!showEdges && (
          <label>
            Vertex index
            <select
              value={selectedVertex}
              onChange={(event) => setSelectedVertex(Number(event.target.value))}
            >
              {localVertices.map((_, index) => (
                <option key={index} value={index}>
                  {index}
                </option>
              ))}
            </select>
          </label>
        )}
        {showEdges && (
          <label>
            Edge
            <select
              value={selectedEdge}
              onChange={(event) => setSelectedEdge(Number(event.target.value))}
            >
              {CUBE_EDGES.map((edge, index) => (
                <option key={index} value={index}>
                  #{index}: {edge.from} → {edge.to}
                </option>
              ))}
            </select>
          </label>
        )}
        {showTransform &&
          (["pitch", "yaw", "roll"] as const).map((axis) => (
            <label key={axis}>
              {axis[0].toUpperCase() + axis.slice(1)}
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={angles[axis] * RAD_TO_DEG}
                onChange={(event) => {
                  setAngles((current) => ({
                    ...current,
                    [axis]: Number(event.target.value) * DEG_TO_RAD,
                  }));
                  setPaused(true);
                }}
              />
              <output>{(angles[axis] * RAD_TO_DEG).toFixed(0)}°</output>
            </label>
          ))}
        {showTransform && (
          <label>
            Rotation order
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as RotationOrder)}
            >
              <option value="xyz">X → Y → Z</option>
              <option value="zyx">Z → Y → X</option>
            </select>
          </label>
        )}
        {showDepth && (
          <label className="check">
            <input
              type="checkbox"
              checked={depthCue}
              onChange={(event) => setDepthCue(event.target.checked)}
            />
            Depth cue
          </label>
        )}
        {showInteraction && (
          <label className="check">
            <input
              type="checkbox"
              checked={showVertices}
              onChange={(event) => setShowVertices(event.target.checked)}
            />
            Vertex markers
          </label>
        )}
        {showInteraction && (
          <label>
            Sensitivity
            <input
              type="range"
              min="0.002"
              max="0.02"
              step="0.001"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
            />
            <output>{sensitivity.toFixed(3)}</output>
          </label>
        )}
        {showInteraction && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Chạy" : "Tạm dừng"}
          </button>
        )}
        {showInteraction && (paused || reducedMotion) && (
          <button
            onClick={() =>
              setAngles((current) => advanceCubeAngles(current, ANGULAR_VELOCITY, 1 / 60))
            }
          >
            Tiến một bước
          </button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          lastPointer.current = null;
          setDragging(false);
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Cube wireframe gồm tám vertex và mười hai edge; dùng phím hoặc kéo chuột để đổi orientation"
      />
      <LabReadout
        items={[
          {
            label: "topology",
            value: hasValidCubeTopology() ? "8 vertex · 12 edge · degree 3" : "không hợp lệ",
          },
          { label: "projection cache", value: `${projection.projectionCount} kết quả / frame` },
          ...(!showEdges
            ? [
                {
                  label: `local vertex ${selectedVertex}`,
                  value: formatVec3(localVertices[selectedVertex]),
                },
                { label: "projection status", value: projection.vertices[selectedVertex].status },
              ]
            : []),
          ...(showEdges
            ? [
                {
                  label: `edge #${selectedEdge}`,
                  value: `${selectedEdgeData.from} → ${selectedEdgeData.to}`,
                },
                {
                  label: "endpoint degree",
                  value: `${degrees[selectedEdgeData.from]} / ${degrees[selectedEdgeData.to]}`,
                },
                { label: "visible edges", value: `${visibleEdges.length} / 12` },
              ]
            : []),
          ...(showTransform
            ? [
                {
                  label: "local 0 → world 0",
                  value: `${formatVec3(localVertices[0])} → ${formatVec3(worldVertices[0])}`,
                },
                { label: "rotation order", value: order.toUpperCase() },
                { label: "max edge error", value: edgeError.toExponential(2) },
              ]
            : []),
          ...(showDepth
            ? [{ label: "far → near (6 edge đầu)", value: farToNear || "không có edge visible" }]
            : []),
          ...(showInteraction
            ? [
                { label: "round-trip error", value: roundTripError.toExponential(2) },
                {
                  label: "mouse delta",
                  value: `(${mouseDelta.x.toFixed(1)}, ${mouseDelta.y.toFixed(1)}) px`,
                },
                { label: "pointer capture", value: dragging ? "đang kéo" : "đã nhả" },
              ]
            : []),
        ]}
      />
    </div>
  );
}
