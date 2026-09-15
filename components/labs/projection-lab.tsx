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
import {
  advanceFlightTime,
  cameraToNdc,
  cameraToWorld,
  flightPoint,
  ndcToScreen,
  perspectiveDivide,
  previewPoint,
  projectPerspective,
  projectionRoundTripError,
  screenToCameraAtDepth,
  verticalFocalScale,
  worldToCamera,
  type ProjectionStatus,
} from "@/lib/labs/projection";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const INITIAL_POINT: Vec3 = { x: 1.4, y: 0.8, z: 5 };
const INITIAL_CAMERA: Vec3 = { x: 0, y: 0, z: 0 };
const DEG_TO_RAD = Math.PI / 180;

function formatVec3(point: Vec3) {
  return `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
}

function statusText(status: ProjectionStatus) {
  if (status === "visible") return "visible — được phép vẽ";
  if (status === "behind") return "behind — ở sau camera";
  if (status === "before-near") return "before-near — quá sát camera";
  return "outside — nằm ngoài frustum";
}

export default function ProjectionLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [worldPoint, setWorldPoint] = useState<Vec3>(() =>
    mode === "projection-motion" ? flightPoint(0) : INITIAL_POINT,
  );
  const [cameraPosition, setCameraPosition] = useState<Vec3>(INITIAL_CAMERA);
  const [fovDegrees, setFovDegrees] = useState(60);
  const [nearPlane, setNearPlane] = useState(0.5);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(true);
  const [preset, setPreset] = useState("visible");

  const showCamera = mode !== "projection-point";
  const showDivide =
    mode === undefined ||
    ["projection-divide", "projection-fov", "projection-visibility", "projection-motion"].includes(
      mode,
    );
  const showFov =
    mode === undefined ||
    ["projection-fov", "projection-visibility", "projection-motion"].includes(mode);
  const showVisibility =
    mode === undefined || ["projection-visibility", "projection-motion"].includes(mode);
  const showMotion = mode === undefined || mode === "projection-motion";

  const camera = useMemo(() => ({ position: cameraPosition }), [cameraPosition]);
  const lens = useMemo(() => ({ verticalFovRadians: fovDegrees * DEG_TO_RAD }), [fovDegrees]);
  const cameraPoint = worldToCamera(worldPoint, camera);

  const layout = useMemo(() => {
    const gap = 20;
    const padding = 18;
    const sideWidth = Math.max(116, (size.width - gap - padding * 2) * 0.42);
    const screenLeft = padding + sideWidth + gap;
    return {
      padding,
      gap,
      sideWidth,
      screenLeft,
      screenWidth: Math.max(116, size.width - screenLeft - padding),
      screenTop: 28,
      screenHeight: Math.max(170, size.height - 52),
    };
  }, [size.height, size.width]);

  const display = useMemo(() => {
    const localWidth = layout.screenWidth;
    const localHeight = layout.screenHeight;
    const fullProjection = projectPerspective(
      worldPoint,
      camera,
      lens,
      nearPlane,
      localWidth,
      localHeight,
    );
    let localScreen = { x: localWidth * 0.5, y: localHeight * 0.5 };

    if (!showDivide) {
      const source = showCamera ? cameraPoint : worldPoint;
      const preview = previewPoint(source, 42);
      localScreen = {
        x: localWidth * 0.5 + preview.x,
        y: localHeight * 0.5 - preview.y,
      };
    } else if (!showFov && cameraPoint.z > 0) {
      const divided = perspectiveDivide(cameraPoint);
      const previewFocalLength = Math.min(localWidth, localHeight) * 0.38;
      localScreen = {
        x: localWidth * 0.5 + divided.x * previewFocalLength,
        y: localHeight * 0.5 - divided.y * previewFocalLength,
      };
    } else {
      localScreen = fullProjection.screen;
    }

    return {
      ...fullProjection,
      screen: {
        x: layout.screenLeft + localScreen.x,
        y: layout.screenTop + localScreen.y,
      },
      localScreen,
    };
  }, [camera, cameraPoint, layout, lens, nearPlane, showCamera, showDivide, showFov, worldPoint]);

  useEffect(() => {
    if (!showMotion || paused || reducedMotion) return;
    let animationFrame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = (now - previous) / 1000;
      previous = now;
      setElapsed((current) => {
        const next = advanceFlightTime(current, deltaTime);
        setWorldPoint(flightPoint(next));
        return next;
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [paused, reducedMotion, showMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const panelBottom = layout.screenTop + layout.screenHeight;
    const screenRight = layout.screenLeft + layout.screenWidth;
    ctx.strokeStyle = "#394662";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(layout.screenLeft, layout.screenTop, layout.screenWidth, layout.screenHeight);
    drawLine(
      ctx,
      { x: layout.screenLeft + layout.screenWidth * 0.5, y: layout.screenTop },
      { x: layout.screenLeft + layout.screenWidth * 0.5, y: panelBottom },
      "#26334d",
    );
    drawLine(
      ctx,
      { x: layout.screenLeft, y: layout.screenTop + layout.screenHeight * 0.5 },
      { x: screenRight, y: layout.screenTop + layout.screenHeight * 0.5 },
      "#26334d",
    );

    ctx.fillStyle = "#9fb0d0";
    ctx.font = "700 11px ui-monospace";
    ctx.fillText("X–Z nhìn từ trên", layout.padding, 17);
    ctx.fillText("VIEWPORT / SCREEN", layout.screenLeft, 17);

    const sideOrigin = {
      x: layout.padding + 28,
      y: layout.screenTop + layout.screenHeight * 0.5,
    };
    const maxDepth = Math.max(10, Math.abs(cameraPoint.z) + 2, nearPlane + 2);
    const zScale = (layout.sideWidth - 42) / maxDepth;
    const xScale = Math.min(30, layout.screenHeight / 10);
    const sidePoint = {
      x: sideOrigin.x + cameraPoint.z * zScale,
      y: sideOrigin.y - cameraPoint.x * xScale,
    };

    drawLine(
      ctx,
      { x: layout.padding, y: sideOrigin.y },
      { x: layout.padding + layout.sideWidth, y: sideOrigin.y },
      "#394662",
      1.5,
    );
    const aspectRatio = layout.screenWidth / layout.screenHeight;
    const horizontalSlope = Math.tan(lens.verticalFovRadians * 0.5) * aspectRatio;
    const frustumEndX = sideOrigin.x + maxDepth * zScale;
    const frustumOffset = maxDepth * horizontalSlope * xScale;
    if (showFov) {
      drawLine(ctx, sideOrigin, { x: frustumEndX, y: sideOrigin.y - frustumOffset }, "#4c6b9c");
      drawLine(ctx, sideOrigin, { x: frustumEndX, y: sideOrigin.y + frustumOffset }, "#4c6b9c");
    }
    if (showVisibility) {
      const nearX = sideOrigin.x + nearPlane * zScale;
      drawLine(
        ctx,
        { x: nearX, y: layout.screenTop + 12 },
        { x: nearX, y: panelBottom - 12 },
        "#ffb454",
        2,
      );
      ctx.fillStyle = "#ffb454";
      ctx.fillText("near", nearX + 4, panelBottom - 7);
    }

    ctx.beginPath();
    ctx.moveTo(sideOrigin.x - 8, sideOrigin.y - 7);
    ctx.lineTo(sideOrigin.x - 8, sideOrigin.y + 7);
    ctx.lineTo(sideOrigin.x + 9, sideOrigin.y);
    ctx.closePath();
    ctx.fillStyle = "#84a9ff";
    ctx.fill();

    drawLine(ctx, sideOrigin, sidePoint, "#53617d", 1.5);
    ctx.beginPath();
    ctx.arc(sidePoint.x, sidePoint.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe26c";
    ctx.fill();

    const shouldDrawMarker = !showVisibility || display.status === "visible";
    if (
      shouldDrawMarker &&
      Number.isFinite(display.screen.x) &&
      Number.isFinite(display.screen.y)
    ) {
      ctx.beginPath();
      ctx.arc(display.screen.x, display.screen.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#ffb45455";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(display.screen.x, display.screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe26c";
      ctx.fill();
      drawLine(
        ctx,
        { x: display.screen.x - 16, y: display.screen.y },
        { x: display.screen.x + 16, y: display.screen.y },
        "#ffe26c",
      );
      drawLine(
        ctx,
        { x: display.screen.x, y: display.screen.y - 16 },
        { x: display.screen.x, y: display.screen.y + 16 },
        "#ffe26c",
      );
    } else if (showVisibility) {
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "700 13px ui-monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        statusText(display.status),
        layout.screenLeft + layout.screenWidth / 2,
        panelBottom - 18,
      );
      ctx.textAlign = "start";
    }
  }, [
    cameraPoint,
    display,
    layout,
    lens.verticalFovRadians,
    nearPlane,
    showFov,
    showVisibility,
    size,
  ]);

  const updatePointAxis = (axis: keyof Vec3, value: number) => {
    setWorldPoint((current) => ({ ...current, [axis]: value }));
    setPaused(true);
    setPreset("custom");
  };

  const pointFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    const localScreen = {
      x: Math.max(0, Math.min(layout.screenWidth, point.x - layout.screenLeft)),
      y: Math.max(0, Math.min(layout.screenHeight, point.y - layout.screenTop)),
    };
    const depth = Math.max(cameraPoint.z, nearPlane + 0.05);
    let nextCameraPoint = { ...cameraPoint };
    if (showFov) {
      nextCameraPoint = screenToCameraAtDepth(
        localScreen,
        depth,
        lens,
        layout.screenWidth,
        layout.screenHeight,
      );
    } else if (showDivide) {
      const previewFocalLength = Math.min(layout.screenWidth, layout.screenHeight) * 0.38;
      nextCameraPoint = {
        x: ((localScreen.x - layout.screenWidth * 0.5) / previewFocalLength) * depth,
        y: ((layout.screenHeight * 0.5 - localScreen.y) / previewFocalLength) * depth,
        z: depth,
      };
    } else {
      const sourceX = (localScreen.x - layout.screenWidth * 0.5) / 42;
      const sourceY = (layout.screenHeight * 0.5 - localScreen.y) / 42;
      if (showCamera) {
        nextCameraPoint = { ...cameraPoint, x: sourceX, y: sourceY };
      } else {
        setWorldPoint((current) => ({ ...current, x: sourceX, y: sourceY }));
        return;
      }
    }
    setWorldPoint(cameraToWorld(nextCameraPoint, camera));
  };

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    if (point.x < layout.screenLeft) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointFromPointer(event);
    setPaused(true);
    setPreset("custom");
  };

  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const move = event.shiftKey ? 0.5 : 0.15;
    const changes: Partial<Vec3> = {};
    if (event.key === "ArrowLeft") changes.x = worldPoint.x - move;
    if (event.key === "ArrowRight") changes.x = worldPoint.x + move;
    if (event.key === "ArrowDown") changes.y = worldPoint.y - move;
    if (event.key === "ArrowUp") changes.y = worldPoint.y + move;
    if (event.key.toLowerCase() === "q") changes.z = worldPoint.z - move;
    if (event.key.toLowerCase() === "e") changes.z = worldPoint.z + move;
    if (Object.keys(changes).length === 0) return;
    event.preventDefault();
    setWorldPoint((current) => ({ ...current, ...changes }));
    setPaused(true);
    setPreset("custom");
  };

  const applyPreset = (value: string) => {
    setPreset(value);
    setPaused(true);
    if (value === "near") {
      setWorldPoint(cameraToWorld({ x: 0.15, y: 0.1, z: nearPlane * 0.5 }, camera));
    } else if (value === "behind") {
      setWorldPoint(cameraToWorld({ x: 0, y: 0, z: -2 }, camera));
    } else if (value === "outside") {
      setWorldPoint(cameraToWorld({ x: 20, y: 0, z: 5 }, camera));
    } else {
      setWorldPoint(INITIAL_POINT);
    }
  };

  const stepMotion = () => {
    const next = advanceFlightTime(elapsed, 1 / 30);
    setElapsed(next);
    setWorldPoint(flightPoint(next));
    setPreset("custom");
  };

  const reset = () => {
    setCameraPosition(INITIAL_CAMERA);
    setFovDegrees(60);
    setNearPlane(0.5);
    setElapsed(0);
    setPaused(true);
    setPreset("visible");
    setWorldPoint(showMotion ? flightPoint(0) : INITIAL_POINT);
  };

  const divided = cameraPoint.z !== 0 ? perspectiveDivide(cameraPoint) : { x: 0, y: 0 };
  const ndc =
    cameraPoint.z > 0
      ? cameraToNdc(cameraPoint, lens, layout.screenWidth / layout.screenHeight)
      : { x: 0, y: 0 };
  const localPixel = ndcToScreen(ndc, layout.screenWidth, layout.screenHeight);

  return (
    <div className="lab-body">
      <div className="lab-controls">
        {showVisibility && (
          <label>
            Tình huống
            <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
              <option value="visible">Nhìn thấy</option>
              <option value="near">Trước near plane</option>
              <option value="behind">Sau camera</option>
              <option value="outside">Ngoài frustum</option>
              {preset === "custom" && <option value="custom">Tự chỉnh</option>}
            </select>
          </label>
        )}
        {(["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            P.{axis.toUpperCase()}
            <input
              type="range"
              min={axis === "z" ? -3 : -6}
              max={axis === "z" ? 10 : 6}
              step="0.1"
              value={worldPoint[axis]}
              onChange={(event) => updatePointAxis(axis, Number(event.target.value))}
            />
            <output>{worldPoint[axis].toFixed(1)}</output>
          </label>
        ))}
        {showCamera &&
          (["x", "y", "z"] as const).map((axis) => (
            <label key={`camera-${axis}`}>
              Camera.{axis.toUpperCase()}
              <input
                type="range"
                min="-3"
                max="3"
                step="0.1"
                value={cameraPosition[axis]}
                onChange={(event) => {
                  setCameraPosition((current) => ({
                    ...current,
                    [axis]: Number(event.target.value),
                  }));
                  setPaused(true);
                  setPreset("custom");
                }}
              />
              <output>{cameraPosition[axis].toFixed(1)}</output>
            </label>
          ))}
        {showFov && (
          <label>
            Vertical FOV
            <input
              type="range"
              min="25"
              max="110"
              step="1"
              value={fovDegrees}
              onChange={(event) => setFovDegrees(Number(event.target.value))}
            />
            <output>{fovDegrees}°</output>
          </label>
        )}
        {showVisibility && (
          <label>
            Near plane
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={nearPlane}
              onChange={(event) => setNearPlane(Number(event.target.value))}
            />
            <output>{nearPlane.toFixed(1)}</output>
          </label>
        )}
        {showMotion && (
          <button onClick={() => setPaused((current) => !current)}>
            {paused ? "Chạy" : "Tạm dừng"}
          </button>
        )}
        {showMotion && (paused || reducedMotion) && (
          <button onClick={stepMotion}>Tiến một bước</button>
        )}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDrag}
        onPointerMove={(event) => {
          if (dragging.current) pointFromPointer(event);
        }}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragging.current = false;
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Projection pipeline từ world point qua camera space, perspective divide và NDC tới pixel; kéo marker hoặc dùng phím mũi tên và Q/E"
      />
      <LabReadout
        items={[
          { label: "world point", value: formatVec3(worldPoint) },
          ...(showCamera ? [{ label: "camera point", value: formatVec3(cameraPoint) }] : []),
          ...(showDivide
            ? [
                {
                  label: "perspective divide",
                  value: `(${divided.x.toFixed(3)}, ${divided.y.toFixed(3)})`,
                },
              ]
            : []),
          ...(showFov
            ? [
                { label: "focal scale", value: verticalFocalScale(lens).toFixed(4) },
                { label: "NDC", value: `(${ndc.x.toFixed(3)}, ${ndc.y.toFixed(3)})` },
                {
                  label: "pixel",
                  value: `(${localPixel.x.toFixed(1)}, ${localPixel.y.toFixed(1)})`,
                },
              ]
            : []),
          ...(showVisibility ? [{ label: "trạng thái", value: statusText(display.status) }] : []),
          ...(showMotion
            ? [
                { label: "elapsed", value: `${elapsed.toFixed(3)} s` },
                {
                  label: "round-trip error",
                  value: projectionRoundTripError(
                    worldPoint,
                    camera,
                    lens,
                    layout.screenWidth,
                    layout.screenHeight,
                  ).toExponential(2),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
