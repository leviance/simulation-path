"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { add3, magnitude3, subtract3, type Vec3 } from "@/lib/labs/normal";
import { projectPerspective, type ProjectionResult } from "@/lib/labs/projection";
import {
  DEFAULT_WORLD_TRIANGLE,
  advanceEulerAngles,
  applyRotationMouseDrag,
  maximumEdgeLengthError3,
  projectTriangle3,
  rotateEuler3,
  rotateTriangle3,
  rotationRoundTripError3,
  rotationTriangleCentroid,
  toLocalTriangle3,
  translateTriangle3,
  triangleEdgeLengths3,
  type EulerAngles,
  type RotationOrder,
} from "@/lib/labs/rotation3d";
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
const INITIAL_MODEL_POSITION = rotationTriangleCentroid(DEFAULT_WORLD_TRIANGLE);
const INITIAL_ANGLES: EulerAngles = { pitch: 18 * DEG_TO_RAD, yaw: 25 * DEG_TO_RAD, roll: 0 };
const ANGULAR_VELOCITY: EulerAngles = {
  pitch: 20 * DEG_TO_RAD,
  yaw: 32 * DEG_TO_RAD,
  roll: 12 * DEG_TO_RAD,
};

function formatVec3(point: Vec3) {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
}

function formatEdges(edges: readonly [number, number, number]) {
  return `AB=${edges[0].toFixed(3)} · BC=${edges[1].toFixed(3)} · CA=${edges[2].toFixed(3)}`;
}

function formatProjection(vertex: ProjectionResult) {
  if (vertex.status !== "visible") return vertex.status;
  return `visible · screen (${vertex.screen.x.toFixed(1)}, ${vertex.screen.y.toFixed(1)}) · camera Z=${vertex.cameraPoint.z.toFixed(2)}`;
}

export default function Rotation3dLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [modelPosition, setModelPosition] = useState<Vec3>(INITIAL_MODEL_POSITION);
  const [angles, setAngles] = useState<EulerAngles>(() =>
    mode === "rotation-triangle" || mode === "rotation-pivot"
      ? { pitch: 0, yaw: 0, roll: 0 }
      : INITIAL_ANGLES,
  );
  const [order, setOrder] = useState<RotationOrder>("xyz");
  const [sensitivity, setSensitivity] = useState(0.008);
  const [mouseDelta, setMouseDelta] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(true);
  const [preset, setPreset] = useState("visible");

  const showPivot = mode !== "rotation-triangle";
  const showPitch =
    mode === undefined ||
    ["rotation-x", "rotation-euler", "rotation-mouse", "rotation-validation"].includes(mode);
  const showEuler =
    mode === undefined ||
    ["rotation-euler", "rotation-mouse", "rotation-validation"].includes(mode);
  const showMouse = mode === undefined || ["rotation-mouse", "rotation-validation"].includes(mode);
  const showValidation = mode === undefined || mode === "rotation-validation";

  const camera = useMemo(() => ({ position: { x: 0, y: 0, z: 0 } }), []);
  const lens = useMemo(() => ({ verticalFovRadians: 60 * DEG_TO_RAD }), []);
  const localTriangle = useMemo(() => toLocalTriangle3(DEFAULT_WORLD_TRIANGLE), []);
  const activeAngles = useMemo<EulerAngles>(
    () => ({
      pitch: showPitch ? angles.pitch : 0,
      yaw: showEuler ? angles.yaw : 0,
      roll: showEuler ? angles.roll : 0,
    }),
    [angles, showEuler, showPitch],
  );
  const rotatedLocal = useMemo(
    () => rotateTriangle3(localTriangle, activeAngles, showEuler ? order : "xyz"),
    [activeAngles, localTriangle, order, showEuler],
  );
  const worldTriangle = useMemo(
    () => translateTriangle3(rotatedLocal, modelPosition),
    [modelPosition, rotatedLocal],
  );
  const projection = useMemo(
    () => projectTriangle3(worldTriangle, camera, lens, 0.5, size.width, size.height),
    [camera, lens, size.height, size.width, worldTriangle],
  );
  const edgeError = maximumEdgeLengthError3(localTriangle, rotatedLocal);
  const roundTripError = rotationRoundTripError3(
    localTriangle.a,
    activeAngles,
    showEuler ? order : "xyz",
  );
  const otherOrder: RotationOrder = order === "xyz" ? "zyx" : "xyz";
  const otherOrderA = rotateEuler3(localTriangle.a, activeAngles, otherOrder);
  const orderDifference = magnitude3(subtract3(rotatedLocal.a, otherOrderA));

  useEffect(() => {
    if (!showValidation || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = (now - previous) / 1000;
      previous = now;
      setAngles((current) => advanceEulerAngles(current, ANGULAR_VELOCITY, deltaTime));
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, showValidation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    for (let x = 0; x < size.width; x += 40) {
      drawLine(ctx, { x, y: 0 }, { x, y: size.height }, "#18233a");
    }
    for (let y = 0; y < size.height; y += 40) {
      drawLine(ctx, { x: 0, y }, { x: size.width, y }, "#18233a");
    }
    drawLine(
      ctx,
      { x: size.width * 0.5, y: 0 },
      { x: size.width * 0.5, y: size.height },
      "#26334d",
    );
    drawLine(
      ctx,
      { x: 0, y: size.height * 0.5 },
      { x: size.width, y: size.height * 0.5 },
      "#26334d",
    );

    const drawProjection = (
      points: readonly { screen: { x: number; y: number } }[],
      colors: readonly string[],
      width: number,
    ) => {
      for (let index = 0; index < 3; index += 1) {
        drawLine(ctx, points[index].screen, points[(index + 1) % 3].screen, colors[index], width);
      }
    };

    if (showPitch) {
      const unrotatedWorld = translateTriangle3(localTriangle, modelPosition);
      const ghost = projectTriangle3(unrotatedWorld, camera, lens, 0.5, size.width, size.height);
      if (ghost.visible) {
        drawProjection(ghost.vertices, ["#394662", "#394662", "#394662"], 1.5);
      }
    }

    if (projection.visible) {
      drawProjection(projection.vertices, ["#ffb454", "#53f0ae", "#84a9ff"], 3);
      const labels = ["A", "B", "C"];
      const colors = ["#ffe26c", "#f7f9ff", "#c484ff"];
      for (const [index, vertex] of projection.vertices.entries()) {
        ctx.beginPath();
        ctx.arc(vertex.screen.x, vertex.screen.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = colors[index];
        ctx.fill();
        ctx.fillStyle = "#f7f9ff";
        ctx.font = "700 11px ui-monospace";
        ctx.fillText(labels[index], vertex.screen.x + 10, vertex.screen.y - 9);
      }
    } else {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "700 13px ui-monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "Không nối cạnh: ít nhất một vertex không visible",
        size.width * 0.5,
        size.height * 0.5,
      );
      ctx.textAlign = "start";
    }

    if (showPivot) {
      const pivotProjection = projectPerspective(
        modelPosition,
        camera,
        lens,
        0.5,
        size.width,
        size.height,
      );
      if (pivotProjection.status === "visible") {
        drawLine(
          ctx,
          { x: pivotProjection.screen.x - 9, y: pivotProjection.screen.y },
          { x: pivotProjection.screen.x + 9, y: pivotProjection.screen.y },
          "#ff6b6b",
          2,
        );
        drawLine(
          ctx,
          { x: pivotProjection.screen.x, y: pivotProjection.screen.y - 9 },
          { x: pivotProjection.screen.x, y: pivotProjection.screen.y + 9 },
          "#ff6b6b",
          2,
        );
      }
    }

    if (showEuler) {
      const axes = [
        { vector: { x: 1, y: 0, z: 0 }, color: "#ff6b6b", label: "X" },
        { vector: { x: 0, y: 1, z: 0 }, color: "#53f0ae", label: "Y" },
        { vector: { x: 0, y: 0, z: 1 }, color: "#84a9ff", label: "Z" },
      ];
      const origin = projectPerspective(modelPosition, camera, lens, 0.5, size.width, size.height);
      if (origin.status === "visible") {
        for (const axis of axes) {
          const rotatedAxis = rotateEuler3(axis.vector, activeAngles, order);
          const endpoint = projectPerspective(
            add3(modelPosition, rotatedAxis),
            camera,
            lens,
            0.5,
            size.width,
            size.height,
          );
          if (endpoint.status === "visible") {
            drawLine(ctx, origin.screen, endpoint.screen, axis.color, 2);
            ctx.fillStyle = axis.color;
            ctx.fillText(axis.label, endpoint.screen.x + 5, endpoint.screen.y - 5);
          }
        }
      }
    }
  }, [
    activeAngles,
    camera,
    lens,
    localTriangle,
    modelPosition,
    order,
    projection,
    showEuler,
    showPitch,
    showPivot,
    size,
  ]);

  const applyPreset = (value: string) => {
    setPreset(value);
    setPaused(true);
    if (value === "near") {
      // local A có z=-0.3, vì vậy model Z=0.7 đặt A tại z=0.4, trước near plane 0.5.
      setModelPosition({ x: 0, y: 0, z: 0.7 });
    } else if (value === "behind") {
      setModelPosition({ x: 0, y: 0, z: -1 });
    } else if (value === "outside") {
      setModelPosition({ x: 12, y: 0, z: 6 });
    } else {
      setModelPosition(INITIAL_MODEL_POSITION);
    }
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showMouse) return;
    lastPointer.current = canvasPoint(event, event.currentTarget);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setPaused(true);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showMouse || !lastPointer.current) return;
    const point = canvasPoint(event, event.currentTarget);
    const delta = { x: point.x - lastPointer.current.x, y: point.y - lastPointer.current.y };
    lastPointer.current = point;
    setMouseDelta(delta);
    setAngles((current) => applyRotationMouseDrag(current, delta.x, delta.y, sensitivity));
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastPointer.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const reset = () => {
    setModelPosition(INITIAL_MODEL_POSITION);
    setAngles(showPitch ? INITIAL_ANGLES : { pitch: 0, yaw: 0, roll: 0 });
    setOrder("xyz");
    setSensitivity(0.008);
    setMouseDelta({ x: 0, y: 0 });
    setDragging(false);
    setPaused(true);
    setPreset("visible");
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const angleStep = event.shiftKey ? 10 * DEG_TO_RAD : 3 * DEG_TO_RAD;
    let handled = true;
    let pauseAfterInput = true;
    if (showPitch && event.key.toLowerCase() === "w") {
      setAngles((current) => ({ ...current, pitch: current.pitch + angleStep }));
    } else if (showPitch && event.key.toLowerCase() === "s") {
      setAngles((current) => ({ ...current, pitch: current.pitch - angleStep }));
    } else if (showEuler && event.key.toLowerCase() === "a") {
      setAngles((current) => ({ ...current, yaw: current.yaw - angleStep }));
    } else if (showEuler && event.key.toLowerCase() === "d") {
      setAngles((current) => ({ ...current, yaw: current.yaw + angleStep }));
    } else if (showEuler && event.key.toLowerCase() === "q") {
      setAngles((current) => ({ ...current, roll: current.roll - angleStep }));
    } else if (showEuler && event.key.toLowerCase() === "e") {
      setAngles((current) => ({ ...current, roll: current.roll + angleStep }));
    } else if (showEuler && event.key.toLowerCase() === "o") {
      setOrder((current) => (current === "xyz" ? "zyx" : "xyz"));
    } else if (showPivot && event.key === "ArrowLeft") {
      setModelPosition((current) => ({ ...current, x: current.x - 0.1 }));
    } else if (showPivot && event.key === "ArrowRight") {
      setModelPosition((current) => ({ ...current, x: current.x + 0.1 }));
    } else if (showPivot && event.key === "ArrowDown") {
      setModelPosition((current) => ({ ...current, y: current.y - 0.1 }));
    } else if (showPivot && event.key === "ArrowUp") {
      setModelPosition((current) => ({ ...current, y: current.y + 0.1 }));
    } else if (showPivot && event.key === "PageDown") {
      setModelPosition((current) => ({ ...current, z: current.z - 0.1 }));
    } else if (showPivot && event.key === "PageUp") {
      setModelPosition((current) => ({ ...current, z: current.z + 0.1 }));
    } else if (event.key.toLowerCase() === "r") {
      reset();
    } else if (showValidation && event.key === " ") {
      setPaused((current) => !current);
      pauseAfterInput = false;
    } else if (showValidation && event.key === "." && paused) {
      setAngles((current) => advanceEulerAngles(current, ANGULAR_VELOCITY, 1 / 60));
    } else {
      handled = false;
    }
    if (handled) {
      event.preventDefault();
      if (pauseAfterInput) setPaused(true);
    }
  };

  const stepAnimation = () => {
    setAngles((current) => advanceEulerAngles(current, ANGULAR_VELOCITY, 1 / 60));
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {!showPivot && (
          <label>
            Trạng thái projection
            <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
              <option value="visible">Cả ba vertex visible</option>
              <option value="near">Có vertex trước near</option>
              <option value="behind">Có vertex sau camera</option>
              <option value="outside">Có vertex ngoài frustum</option>
            </select>
          </label>
        )}
        {showPivot &&
          (["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              Model.{axis.toUpperCase()}
              <input
                type="range"
                min={axis === "z" ? "1" : "-4"}
                max={axis === "z" ? "10" : "4"}
                step="0.1"
                value={modelPosition[axis]}
                onChange={(event) => {
                  setModelPosition((current) => ({
                    ...current,
                    [axis]: Number(event.target.value),
                  }));
                  setPaused(true);
                  setPreset("custom");
                }}
              />
              <output>{modelPosition[axis].toFixed(1)}</output>
            </label>
          ))}
        {showPitch && (
          <label>
            Pitch X
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={angles.pitch * RAD_TO_DEG}
              onChange={(event) => {
                setAngles((current) => ({
                  ...current,
                  pitch: Number(event.target.value) * DEG_TO_RAD,
                }));
                setPaused(true);
              }}
            />
            <output>{(angles.pitch * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showEuler && (
          <>
            <label>
              Yaw Y
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={angles.yaw * RAD_TO_DEG}
                onChange={(event) => {
                  setAngles((current) => ({
                    ...current,
                    yaw: Number(event.target.value) * DEG_TO_RAD,
                  }));
                  setPaused(true);
                }}
              />
              <output>{(angles.yaw * RAD_TO_DEG).toFixed(0)}°</output>
            </label>
            <label>
              Roll Z
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={angles.roll * RAD_TO_DEG}
                onChange={(event) => {
                  setAngles((current) => ({
                    ...current,
                    roll: Number(event.target.value) * DEG_TO_RAD,
                  }));
                  setPaused(true);
                }}
              />
              <output>{(angles.roll * RAD_TO_DEG).toFixed(0)}°</output>
            </label>
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
          </>
        )}
        {showMouse && (
          <label>
            Mouse sensitivity
            <input
              type="range"
              min="0.002"
              max="0.02"
              step="0.001"
              value={sensitivity}
              onChange={(event) => setSensitivity(Number(event.target.value))}
            />
            <output>{sensitivity.toFixed(3)} rad/px</output>
          </label>
        )}
        {showValidation && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Chạy" : "Tạm dừng"}
          </button>
        )}
        {showValidation && (paused || reducedMotion) && (
          <button onClick={stepAnimation}>Tiến một bước</button>
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
        aria-label="Tam giác 3D qua local space, rotation X Y Z và perspective; kéo chuột hoặc dùng W/S, A/D, Q/E, các phím mũi tên, O, Space, dấu chấm và R"
      />
      <LabReadout
        items={[
          { label: "local centroid", value: formatVec3(rotationTriangleCentroid(localTriangle)) },
          ...(!showPivot
            ? projection.vertices.map((vertex, index) => ({
                label: `vertex ${["A", "B", "C"][index]}`,
                value: formatProjection(vertex),
              }))
            : []),
          ...(showPivot
            ? [
                { label: "local A", value: formatVec3(localTriangle.a) },
                { label: "world A", value: formatVec3(worldTriangle.a) },
                { label: "model position / pivot", value: formatVec3(modelPosition) },
              ]
            : []),
          ...(showPitch
            ? [
                {
                  label: "pitch / yaw / roll",
                  value: `${(activeAngles.pitch * RAD_TO_DEG).toFixed(1)}° · ${(activeAngles.yaw * RAD_TO_DEG).toFixed(1)}° · ${(activeAngles.roll * RAD_TO_DEG).toFixed(1)}°`,
                },
                {
                  label: "local A → rotated A",
                  value: `${formatVec3(localTriangle.a)} → ${formatVec3(rotatedLocal.a)}`,
                },
                {
                  label: "|A| trước / sau",
                  value: `${magnitude3(localTriangle.a).toFixed(6)} / ${magnitude3(rotatedLocal.a).toFixed(6)}`,
                },
              ]
            : []),
          ...(showEuler
            ? [
                { label: "rotation order", value: order.toUpperCase() },
                { label: "A: chênh lệch giữa hai order", value: orderDifference.toFixed(6) },
              ]
            : []),
          {
            label: "projection",
            value: projection.visible
              ? "3/3 visible — đã nối cạnh"
              : "ẩn — có vertex không visible",
          },
          ...(showMouse
            ? [
                {
                  label: "mouse delta",
                  value: `(${mouseDelta.x.toFixed(1)}, ${mouseDelta.y.toFixed(1)}) px`,
                },
                { label: "pointer capture", value: dragging ? "đang kéo" : "đã nhả" },
              ]
            : []),
          ...(showValidation
            ? [
                { label: "edge lengths", value: formatEdges(triangleEdgeLengths3(rotatedLocal)) },
                { label: "edge-length error", value: edgeError.toExponential(2) },
                { label: "round-trip error", value: roundTripError.toExponential(2) },
              ]
            : []),
        ]}
      />
    </div>
  );
}
