"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Vec3 } from "@/lib/labs/normal";
import {
  DEFAULT_ROOM_BOUNDS,
  advanceFpsCameraInRoom,
  applyFpsMouseLook,
  cameraBasisFps,
  fpsBasisError,
  fpsViewRoundTripError,
  makeRoomGeometry,
  projectFpsPoint,
  rotateFpsX,
  rotateFpsY,
  worldToCameraTranslationFps,
  type FpsCamera,
  type MoveInput,
  type RoomSegmentKind,
} from "@/lib/labs/fps-camera";
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
const INITIAL_CAMERA: FpsCamera = {
  position: { x: 0, y: 1.6, z: 2 },
  yaw: 0,
  pitch: 0,
};
const INSPECTED_POINT: Vec3 = { x: 2, y: 1, z: 12 };

function formatVec3(point: Vec3) {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
}

function segmentColor(kind: RoomSegmentKind) {
  if (kind === "floor") return "#4484ae";
  if (kind === "ceiling") return "#7570be";
  return "#7da5ee";
}

function inputFromKeys(keys: ReadonlySet<string>): MoveInput {
  let strafe = 0;
  let advance = 0;
  if (keys.has("a")) strafe -= 1;
  if (keys.has("d")) strafe += 1;
  if (keys.has("s")) advance -= 1;
  if (keys.has("w")) advance += 1;
  return { strafe, advance };
}

export default function FpsCameraLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const pressedKeys = useRef(new Set<string>());
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const showTranslation = mode !== "camera-room";
  const showOrientation =
    mode === undefined ||
    [
      "camera-orientation",
      "camera-basis",
      "camera-movement",
      "camera-mouse-look",
      "camera-validation",
    ].includes(mode);
  const showBasis = mode === undefined || ["camera-basis", "camera-validation"].includes(mode);
  const showMovement =
    mode === undefined || ["camera-movement", "camera-validation"].includes(mode);
  const showMouse = mode === undefined || ["camera-mouse-look", "camera-validation"].includes(mode);
  const showValidation = mode === undefined || mode === "camera-validation";

  const [camera, setCamera] = useState<FpsCamera>(INITIAL_CAMERA);
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [speed, setSpeed] = useState(3.5);
  const [fps, setFps] = useState(60);
  const [sensitivity, setSensitivity] = useState(0.006);
  const [margin, setMargin] = useState(0.35);
  const [lastInput, setLastInput] = useState<MoveInput>({ strafe: 0, advance: 0 });
  const [mouseDelta, setMouseDelta] = useState({ x: 0, y: 0 });
  const [pointerCaptured, setPointerCaptured] = useState(false);
  const [paused, setPaused] = useState(false);

  const room = useMemo(() => makeRoomGeometry(DEFAULT_ROOM_BOUNDS, 2), []);
  const activeCamera = useMemo<FpsCamera>(
    () => ({
      position: showTranslation ? camera.position : INITIAL_CAMERA.position,
      yaw: showOrientation ? camera.yaw : 0,
      pitch: showOrientation ? camera.pitch : 0,
    }),
    [camera, showOrientation, showTranslation],
  );
  const lens = useMemo(() => ({ verticalFovRadians: 60 * DEG_TO_RAD }), []);
  const projectedSegments = useMemo(
    () =>
      room.map((segment, index) => ({
        index,
        segment,
        from: projectFpsPoint(segment.from, activeCamera, lens, 0.35, size.width, size.height),
        to: projectFpsPoint(segment.to, activeCamera, lens, 0.35, size.width, size.height),
      })),
    [activeCamera, lens, room, size.height, size.width],
  );
  const visibleSegments = projectedSegments.filter(
    (segment) => segment.from.status === "visible" && segment.to.status === "visible",
  );
  const basis = cameraBasisFps(activeCamera);
  const translatedPoint = worldToCameraTranslationFps(INSPECTED_POINT, activeCamera);
  const afterYaw = rotateFpsY(translatedPoint, -activeCamera.yaw);
  const insideBounds =
    camera.position.x >= DEFAULT_ROOM_BOUNDS.minX + margin - 1e-9 &&
    camera.position.x <= DEFAULT_ROOM_BOUNDS.maxX - margin + 1e-9 &&
    camera.position.z >= DEFAULT_ROOM_BOUNDS.minZ + margin - 1e-9 &&
    camera.position.z <= DEFAULT_ROOM_BOUNDS.maxZ - margin + 1e-9;

  const moveOnce = useCallback(
    (input: MoveInput, deltaTime = 1 / fps) => {
      if (!showMovement || paused) return;
      setLastInput(input);
      setCamera((current) =>
        advanceFpsCameraInRoom(current, input, speed, deltaTime, DEFAULT_ROOM_BOUNDS, 1.6, margin),
      );
    },
    [fps, margin, paused, showMovement, speed],
  );

  useEffect(() => {
    if (!showMovement || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const input = inputFromKeys(pressedKeys.current);
      const deltaTime = (now - previous) / 1000;
      previous = now;
      if (input.strafe !== 0 || input.advance !== 0) moveOnce(input, deltaTime);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [moveOnce, paused, reducedMotion, showMovement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    for (const item of visibleSegments) {
      drawLine(
        context,
        item.from.screen,
        item.to.screen,
        item.index === selectedSegment ? "#ffb454" : segmentColor(item.segment.kind),
        item.index === selectedSegment ? 3.5 : 1.5,
      );
    }

    const center = { x: size.width * 0.5, y: size.height * 0.5 };
    drawLine(
      context,
      { x: center.x - 8, y: center.y },
      { x: center.x + 8, y: center.y },
      "#f4f7ff",
      1.5,
    );
    drawLine(
      context,
      { x: center.x, y: center.y - 8 },
      { x: center.x, y: center.y + 8 },
      "#f4f7ff",
      1.5,
    );

    if (showTranslation) {
      const map = { x: 16, y: 16, width: 136, height: 176 };
      context.fillStyle = "rgb(9 16 31 / 85%)";
      context.fillRect(map.x, map.y, map.width, map.height);
      context.strokeStyle = "#465572";
      context.strokeRect(map.x, map.y, map.width, map.height);
      const mapPoint = (point: Vec3) => ({
        x:
          map.x +
          ((point.x - DEFAULT_ROOM_BOUNDS.minX) /
            (DEFAULT_ROOM_BOUNDS.maxX - DEFAULT_ROOM_BOUNDS.minX)) *
            map.width,
        y:
          map.y +
          (1 -
            (point.z - DEFAULT_ROOM_BOUNDS.minZ) /
              (DEFAULT_ROOM_BOUNDS.maxZ - DEFAULT_ROOM_BOUNDS.minZ)) *
            map.height,
      });
      const cameraOnMap = mapPoint(activeCamera.position);
      const forwardEnd = mapPoint({
        x: activeCamera.position.x + basis.forward.x * 2,
        y: activeCamera.position.y,
        z: activeCamera.position.z + basis.forward.z * 2,
      });
      const rightEnd = mapPoint({
        x: activeCamera.position.x + basis.right.x * 1.5,
        y: activeCamera.position.y,
        z: activeCamera.position.z + basis.right.z * 1.5,
      });
      drawLine(context, cameraOnMap, forwardEnd, "#5cecb9", 3);
      drawLine(context, cameraOnMap, rightEnd, "#ffb454", 3);
      context.beginPath();
      context.arc(cameraOnMap.x, cameraOnMap.y, 5, 0, Math.PI * 2);
      context.fillStyle = insideBounds ? "#f4f7ff" : "#ff6b6b";
      context.fill();
      context.fillStyle = "#d9e2f2";
      context.font = "12px ui-monospace";
      context.fillText("top view", map.x + 8, map.y + 16);
      context.fillText(
        `pitch ${(activeCamera.pitch * RAD_TO_DEG).toFixed(0)}°`,
        map.x + 8,
        map.y + map.height - 8,
      );
    }
  }, [activeCamera, basis, insideBounds, selectedSegment, showTranslation, size, visibleSegments]);

  const reset = () => {
    setCamera(INITIAL_CAMERA);
    setSelectedSegment(0);
    setSpeed(3.5);
    setFps(60);
    setSensitivity(0.006);
    setMargin(0.35);
    setLastInput({ strafe: 0, advance: 0 });
    setMouseDelta({ x: 0, y: 0 });
    setPointerCaptured(false);
    setPaused(false);
    pressedKeys.current.clear();
    lastPointer.current = null;
  };

  const startLook = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showMouse) return;
    lastPointer.current = canvasPoint(event, event.currentTarget);
    event.currentTarget.setPointerCapture(event.pointerId);
    setPointerCaptured(true);
  };

  const moveLook = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!showMouse || !lastPointer.current) return;
    const point = canvasPoint(event, event.currentTarget);
    const delta = { x: point.x - lastPointer.current.x, y: point.y - lastPointer.current.y };
    lastPointer.current = point;
    setMouseDelta(delta);
    setCamera((current) => applyFpsMouseLook(current, delta.x, delta.y, sensitivity));
  };

  const stopLook = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    lastPointer.current = null;
    setPointerCaptured(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (showMovement && ["w", "a", "s", "d"].includes(key)) {
      pressedKeys.current.add(key);
      moveOnce(inputFromKeys(pressedKeys.current));
      event.preventDefault();
      return;
    }
    if (showOrientation && event.key.startsWith("Arrow")) {
      const angleStep = event.shiftKey ? 10 * DEG_TO_RAD : 3 * DEG_TO_RAD;
      setCamera((current) => {
        if (event.key === "ArrowLeft") return applyFpsMouseLook(current, -1, 0, angleStep);
        if (event.key === "ArrowRight") return applyFpsMouseLook(current, 1, 0, angleStep);
        if (event.key === "ArrowUp") return applyFpsMouseLook(current, 0, -1, angleStep);
        return applyFpsMouseLook(current, 0, 1, angleStep);
      });
      event.preventDefault();
    }
    if (event.key === " ") {
      setPaused((current) => !current);
      event.preventDefault();
    }
    if (key === "r") reset();
  };

  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    pressedKeys.current.delete(event.key.toLowerCase());
  };

  const selected = room[Math.min(selectedSegment, room.length - 1)];
  const inputLength = Math.hypot(lastInput.strafe, lastInput.advance);
  const afterPitch = rotateFpsX(afterYaw, activeCamera.pitch);

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {mode === "camera-room" && (
          <label>
            Segment
            <input
              type="range"
              min="0"
              max={room.length - 1}
              value={selectedSegment}
              onChange={(event) => setSelectedSegment(Number(event.target.value))}
            />
            <output>#{selectedSegment}</output>
          </label>
        )}
        {showTranslation && (
          <label>
            Camera X
            <input
              type="range"
              min={DEFAULT_ROOM_BOUNDS.minX + margin}
              max={DEFAULT_ROOM_BOUNDS.maxX - margin}
              step="0.1"
              value={camera.position.x}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  position: { ...current.position, x: Number(event.target.value) },
                }))
              }
            />
            <output>{camera.position.x.toFixed(1)}</output>
          </label>
        )}
        {mode === "camera-translation" && (
          <label>
            Camera Z
            <input
              type="range"
              min={DEFAULT_ROOM_BOUNDS.minZ + margin}
              max={DEFAULT_ROOM_BOUNDS.maxZ - margin}
              step="0.1"
              value={camera.position.z}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  position: { ...current.position, z: Number(event.target.value) },
                }))
              }
            />
            <output>{camera.position.z.toFixed(1)}</output>
          </label>
        )}
        {showOrientation && (
          <label>
            Yaw
            <input
              type="range"
              min="-180"
              max="180"
              value={camera.yaw * RAD_TO_DEG}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  yaw: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(camera.yaw * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showOrientation && (
          <label>
            Pitch
            <input
              type="range"
              min="-89"
              max="89"
              value={camera.pitch * RAD_TO_DEG}
              onChange={(event) =>
                setCamera((current) => ({
                  ...current,
                  pitch: Number(event.target.value) * DEG_TO_RAD,
                }))
              }
            />
            <output>{(camera.pitch * RAD_TO_DEG).toFixed(0)}°</output>
          </label>
        )}
        {showMovement && (
          <label>
            FPS giả lập
            <select value={fps} onChange={(event) => setFps(Number(event.target.value))}>
              <option value="30">30 FPS</option>
              <option value="60">60 FPS</option>
              <option value="144">144 FPS</option>
            </select>
          </label>
        )}
        {showMovement && (
          <label>
            Speed
            <input
              type="range"
              min="1"
              max="7"
              step="0.5"
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
            <output>{speed.toFixed(1)} u/s</output>
          </label>
        )}
        {showMovement &&
          [
            ["W", { strafe: 0, advance: 1 }],
            ["A", { strafe: -1, advance: 0 }],
            ["S", { strafe: 0, advance: -1 }],
            ["D", { strafe: 1, advance: 0 }],
          ].map(([label, input]) => (
            <button key={label as string} onClick={() => moveOnce(input as MoveInput)}>
              Bước {label as string}
            </button>
          ))}
        {showMouse && (
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
        {showValidation && (
          <label>
            Wall margin
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
            />
            <output>{margin.toFixed(2)}</output>
          </label>
        )}
        {showMovement && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startLook}
        onPointerMove={moveLook}
        onPointerUp={stopLook}
        onPointerCancel={stopLook}
        onLostPointerCapture={() => {
          lastPointer.current = null;
          setPointerCaptured(false);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          pressedKeys.current.clear();
          lastPointer.current = null;
          setPointerCaptured(false);
        }}
        tabIndex={0}
        aria-label="Căn phòng wireframe nhìn qua camera FPS; dùng WASD, phím mũi tên hoặc kéo chuột theo bài học hiện tại"
      />
      <LabReadout
        items={[
          { label: "room geometry", value: `${room.length} world-space segments` },
          { label: "visible segments", value: `${visibleSegments.length} / ${room.length}` },
          ...(mode === "camera-room"
            ? [
                { label: `segment #${selectedSegment}`, value: `${selected.kind}` },
                {
                  label: "world endpoints",
                  value: `${formatVec3(selected.from)} → ${formatVec3(selected.to)}`,
                },
              ]
            : []),
          ...(showTranslation
            ? [
                { label: "camera position", value: formatVec3(activeCamera.position) },
                { label: "world point", value: formatVec3(INSPECTED_POINT) },
                { label: "sau trừ position", value: formatVec3(translatedPoint) },
              ]
            : []),
          ...(showOrientation
            ? [
                {
                  label: "yaw / pitch",
                  value: `${(activeCamera.yaw * RAD_TO_DEG).toFixed(1)}° / ${(activeCamera.pitch * RAD_TO_DEG).toFixed(1)}°`,
                },
                { label: "sau inverse yaw", value: formatVec3(afterYaw) },
                { label: "sau inverse pitch", value: formatVec3(afterPitch) },
              ]
            : []),
          ...(showBasis
            ? [
                { label: "forward", value: formatVec3(basis.forward) },
                { label: "right", value: formatVec3(basis.right) },
                { label: "up", value: formatVec3(basis.up) },
                { label: "basis error", value: fpsBasisError(activeCamera).toExponential(2) },
              ]
            : []),
          ...(showMovement
            ? [
                { label: "input axis", value: `(${lastInput.strafe}, ${lastInput.advance})` },
                { label: "input length", value: inputLength.toFixed(3) },
                { label: "dt mỗi bước", value: `${(1000 / fps).toFixed(2)} ms` },
              ]
            : []),
          ...(showMouse
            ? [
                {
                  label: "mouse delta",
                  value: `(${mouseDelta.x.toFixed(1)}, ${mouseDelta.y.toFixed(1)}) px`,
                },
                { label: "pointer capture", value: pointerCaptured ? "đang nhìn" : "đã nhả" },
              ]
            : []),
          ...(showValidation
            ? [
                { label: "room bounds", value: insideBounds ? "bên trong" : "vượt giới hạn" },
                {
                  label: "round-trip error",
                  value: fpsViewRoundTripError(INSPECTED_POINT, activeCamera).toExponential(2),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
