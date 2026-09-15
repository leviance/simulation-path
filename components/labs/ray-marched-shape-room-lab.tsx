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
  DEFAULT_CAMERA,
  DEFAULT_MARCH_SETTINGS,
  add,
  cameraPosition,
  dot,
  estimateNormal,
  length,
  makeCameraRay,
  marchRay,
  normalize,
  scale,
  sdSphere,
  softShadow,
  subtract,
  traceRaySteps,
  validateRayMarchRoom,
  type MarchResult,
  type MarchSettings,
  type OrbitCamera,
  type SceneOptions,
  type Vec3,
} from "@/lib/labs/ray-marched-shape-room";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const SPHERE_ONLY: SceneOptions = {
  includeSphere: true,
  includeBox: false,
  includeTorus: false,
  includeRoom: false,
};

const MATERIAL_COLORS = [
  [20, 30, 50],
  [55, 145, 245],
  [245, 108, 55],
  [188, 103, 243],
  [58, 66, 82],
] as const;

function cloneCamera(): OrbitCamera {
  return { ...DEFAULT_CAMERA, target: { ...DEFAULT_CAMERA.target } };
}

function formatVector(vector: Vec3) {
  return `(${vector.x.toFixed(3)}, ${vector.y.toFixed(3)}, ${vector.z.toFixed(3)})`;
}

function putScaledImage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
  targetWidth: number,
  targetHeight: number,
) {
  const buffer = document.createElement("canvas");
  buffer.width = width;
  buffer.height = height;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) return;
  const image = bufferContext.createImageData(width, height);
  image.data.set(pixels);
  bufferContext.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
}

function shadeHit(
  result: MarchResult,
  options: SceneOptions,
  settings: MarchSettings,
  debugView: number,
  elapsedSeconds: number,
  withLighting: boolean,
  withShadow: boolean,
) {
  if (debugView === 1) {
    const ratio = result.steps / Math.max(1, settings.maximumSteps);
    return [Math.round(ratio * 255), 64, Math.round((1 - ratio) * 255)] as const;
  }
  if (debugView === 2) {
    const value = result.hit ? 245 : 20;
    return [value, value, value] as const;
  }
  if (!result.hit) return [10, 19, 36] as const;

  const normal = estimateNormal(result.position, options);
  if (debugView === 3) {
    return [
      Math.round((normal.x * 0.5 + 0.5) * 255),
      Math.round((normal.y * 0.5 + 0.5) * 255),
      Math.round((normal.z * 0.5 + 0.5) * 255),
    ] as const;
  }

  const base = MATERIAL_COLORS[result.materialId] ?? MATERIAL_COLORS[0];
  if (!withLighting) return base;
  const lightPosition = {
    x: 2.4 + Math.sin(elapsedSeconds * 0.35) * 0.6,
    y: 2,
    z: 3,
  };
  const toLight = subtract(lightPosition, result.position);
  const lightDistance = length(toLight);
  const lightDirection = normalize(toLight);
  const diffuse = Math.max(0, dot(normal, lightDirection));
  const visibility = withShadow
    ? softShadow(
        add(result.position, scale(normal, settings.hitEpsilon * 3)),
        lightDirection,
        lightDistance,
        options,
      )
    : 1;
  const light = Math.max(0, 0.18 + diffuse * visibility * 0.82 - result.steps * 0.004);
  return [
    Math.round(Math.min(255, base[0] * light)),
    Math.round(Math.min(255, base[1] * light)),
    Math.round(Math.min(255, base[2] * light)),
  ] as const;
}

function drawRayMarchedImage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: OrbitCamera,
  settings: MarchSettings,
  options: SceneOptions,
  debugView: number,
  elapsedSeconds: number,
  withLighting: boolean,
  withShadow: boolean,
) {
  const sampleWidth = Math.max(80, Math.min(160, Math.floor(width / 5)));
  const sampleHeight = Math.max(52, Math.round((sampleWidth * height) / Math.max(1, width)));
  const pixels = new Uint8ClampedArray(sampleWidth * sampleHeight * 4);
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const ray = makeCameraRay(camera, x, y, sampleWidth, sampleHeight);
      const result = marchRay(ray, settings, options);
      const color = shadeHit(
        result,
        options,
        settings,
        debugView,
        elapsedSeconds,
        withLighting,
        withShadow,
      );
      const offset = (y * sampleWidth + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
  putScaledImage(context, sampleWidth, sampleHeight, pixels, width, height);
  return { sampleWidth, sampleHeight };
}

function drawScreenCoordinates(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  selected: { x: number; y: number },
) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#17375f");
  gradient.addColorStop(1, "#8a4771");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(255,255,255,0.13)";
  context.lineWidth = 1;
  for (let x = 0; x <= 10; x += 1) {
    context.beginPath();
    context.moveTo((x / 10) * width, 0);
    context.lineTo((x / 10) * width, height);
    context.stroke();
  }
  for (let y = 0; y <= 6; y += 1) {
    context.beginPath();
    context.moveTo(0, (y / 6) * height);
    context.lineTo(width, (y / 6) * height);
    context.stroke();
  }
  const x = selected.x * width;
  const y = selected.y * height;
  context.strokeStyle = "#e5c07b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x - 12, y);
  context.lineTo(x + 12, y);
  context.moveTo(x, y - 12);
  context.lineTo(x, y + 12);
  context.stroke();
}

function drawCameraDiagram(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: OrbitCamera,
) {
  const origin = cameraPosition(camera);
  const map = (point: Vec3) => ({
    x: width * 0.5 + point.x * Math.min(width / 9, height / 9),
    y: height * 0.72 - point.z * Math.min(width / 9, height / 9),
  });
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#34435f";
  context.beginPath();
  context.moveTo(0, map({ x: 0, y: 0, z: 0 }).y);
  context.lineTo(width, map({ x: 0, y: 0, z: 0 }).y);
  context.stroke();

  for (const fraction of [0.08, 0.5, 0.92]) {
    const ray = makeCameraRay(camera, fraction * width, height * 0.5, width, height);
    const start = map(ray.origin);
    const end = map(add(ray.origin, scale(ray.direction, 8)));
    context.strokeStyle = fraction === 0.5 ? "#e5c07b" : "#61afef";
    context.lineWidth = fraction === 0.5 ? 2.5 : 1.4;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  const cameraPoint = map(origin);
  const target = map(camera.target);
  context.fillStyle = "#e06c75";
  context.beginPath();
  context.arc(cameraPoint.x, cameraPoint.y, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#98c379";
  context.beginPath();
  context.arc(target.x, target.y, 5, 0, Math.PI * 2);
  context.fill();
}

function drawSdfSlice(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  samplePoint: { x: number; y: number },
) {
  const sampleWidth = 140;
  const sampleHeight = Math.max(70, Math.round((sampleWidth * height) / Math.max(1, width)));
  const pixels = new Uint8ClampedArray(sampleWidth * sampleHeight * 4);
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const world = {
        x: -2.4 + (x / (sampleWidth - 1)) * 2.8,
        y: 1.2 - (y / (sampleHeight - 1)) * 2.8,
        z: 0.15,
      };
      const distance = sdSphere(world, { x: -1, y: -0.18, z: 0.15 }, 0.82);
      const edge = Math.exp(-Math.abs(distance) * 18);
      const inside = distance < 0;
      const offset = (y * sampleWidth + x) * 4;
      pixels[offset] = Math.round((inside ? 225 : 40) + edge * 25);
      pixels[offset + 1] = Math.round((inside ? 70 : 112) + edge * 90);
      pixels[offset + 2] = Math.round((inside ? 65 : 205) + edge * 45);
      pixels[offset + 3] = 255;
    }
  }
  putScaledImage(context, sampleWidth, sampleHeight, pixels, width, height);
  const x = ((samplePoint.x + 2.4) / 2.8) * width;
  const y = ((1.2 - samplePoint.y) / 2.8) * height;
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, 6, 0, Math.PI * 2);
  context.stroke();
}

function drawTraceDiagram(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: OrbitCamera,
  settings: MarchSettings,
  rayFraction: number,
) {
  const ray = makeCameraRay(camera, rayFraction * width, height * 0.5, width, height);
  const trace = traceRaySteps(ray, settings, SPHERE_ONLY);
  const scaleFactor = Math.min(width / 9, height / 9);
  const map = (point: Vec3) => ({
    x: width * 0.5 + point.x * scaleFactor,
    y: height * 0.78 - point.z * scaleFactor,
  });
  context.fillStyle = "#0b1020";
  context.fillRect(0, 0, width, height);
  const sphere = map({ x: -1, y: 0, z: 0.15 });
  context.strokeStyle = "#61afef";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(sphere.x, sphere.y, 0.82 * scaleFactor, 0, Math.PI * 2);
  context.stroke();
  for (const item of trace) {
    const center = map(item.position);
    context.strokeStyle = `rgba(229, 192, 123, ${Math.max(0.16, 0.75 - item.step * 0.045)})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(center.x, center.y, Math.max(1.5, item.distance * scaleFactor), 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#e5c07b";
    context.fillRect(center.x - 2, center.y - 2, 4, 4);
  }
  return trace;
}

export default function RayMarchedShapeRoomLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const previousPointer = useRef<{ x: number; y: number } | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousTimestamp = useRef<number | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [camera, setCamera] = useState<OrbitCamera>(() => cloneCamera());
  const [settings, setSettings] = useState<MarchSettings>({ ...DEFAULT_MARCH_SETTINGS });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(true);
  const [debugView, setDebugView] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [selectedPixel, setSelectedPixel] = useState({ x: 0.5, y: 0.5 });
  const [samplePoint, setSamplePoint] = useState({ x: -0.18, y: -0.18 });
  const [rayFraction, setRayFraction] = useState(0.38);
  const [includeSphere, setIncludeSphere] = useState(true);
  const [includeBox, setIncludeBox] = useState(true);
  const [includeTorus, setIncludeTorus] = useState(true);

  const showCamera = mode !== "raymarch-screen";
  const showSdf = mode === "raymarch-sphere-sdf";
  const showStepper = mode === "raymarch-stepper";
  const showNormal =
    mode === "raymarch-normal" ||
    mode === "raymarch-primitives" ||
    mode === "raymarch-materials" ||
    mode === "raymarch-shadow-camera" ||
    mode === "raymarch-validation" ||
    !mode;
  const showPrimitives =
    mode === "raymarch-primitives" ||
    mode === "raymarch-materials" ||
    mode === "raymarch-shadow-camera" ||
    mode === "raymarch-validation" ||
    !mode;
  const showMaterials =
    mode === "raymarch-materials" ||
    mode === "raymarch-shadow-camera" ||
    mode === "raymarch-validation" ||
    !mode;
  const showShadow = mode === "raymarch-shadow-camera" || mode === "raymarch-validation" || !mode;
  const showValidation = mode === "raymarch-validation" || !mode;
  const sceneOptions = useMemo<SceneOptions>(
    () => ({
      includeSphere: showPrimitives ? includeSphere : true,
      includeBox: showPrimitives && includeBox,
      includeTorus: showPrimitives && includeTorus,
      includeRoom: showMaterials,
    }),
    [includeBox, includeSphere, includeTorus, showMaterials, showPrimitives],
  );
  const centerRay = useMemo(() => makeCameraRay(camera, 479.5, 319.5, 960, 640), [camera]);
  const centerResult = useMemo(
    () => marchRay(centerRay, settings, sceneOptions),
    [centerRay, sceneOptions, settings],
  );
  const centerNormal = centerResult.hit
    ? estimateNormal(centerResult.position, sceneOptions)
    : { x: 0, y: 0, z: 0 };
  const sdfValue = sdSphere(
    { x: samplePoint.x, y: samplePoint.y, z: 0.15 },
    { x: -1, y: -0.18, z: 0.15 },
    0.82,
  );
  const validation = useMemo(() => validateRayMarchRoom(), []);
  const validationPassed = Object.values(validation).every(Boolean);

  useEffect(() => {
    if (!showShadow || paused || reducedMotion) {
      previousTimestamp.current = null;
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }
    const animate = (timestamp: number) => {
      const previous = previousTimestamp.current ?? timestamp;
      const delta = Math.min(0.1, (timestamp - previous) / 1000);
      if (timestamp - previous >= 80) {
        previousTimestamp.current = timestamp;
        setElapsedSeconds((current) => current + delta);
      }
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      previousTimestamp.current = null;
    };
  }, [paused, reducedMotion, showShadow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    context.fillStyle = "#0b1020";
    context.fillRect(0, 0, size.width, size.height);
    if (mode === "raymarch-screen") {
      drawScreenCoordinates(context, size.width, size.height, selectedPixel);
    } else if (mode === "raymarch-camera") {
      drawCameraDiagram(context, size.width, size.height, camera);
    } else if (showSdf) {
      drawSdfSlice(context, size.width, size.height, samplePoint);
    } else if (showStepper) {
      drawTraceDiagram(context, size.width, size.height, camera, settings, rayFraction);
    } else {
      drawRayMarchedImage(
        context,
        size.width,
        size.height,
        camera,
        settings,
        sceneOptions,
        showValidation ? debugView : 0,
        elapsedSeconds,
        showNormal,
        showShadow,
      );
    }
  }, [
    camera,
    debugView,
    elapsedSeconds,
    mode,
    rayFraction,
    samplePoint,
    sceneOptions,
    selectedPixel,
    settings,
    showNormal,
    showSdf,
    showShadow,
    showStepper,
    showValidation,
    size,
  ]);

  const reset = () => {
    const canvas = canvasRef.current;
    if (
      canvas &&
      activePointer.current !== null &&
      canvas.hasPointerCapture(activePointer.current)
    ) {
      canvas.releasePointerCapture(activePointer.current);
    }
    setCamera(cloneCamera());
    setSettings({ ...DEFAULT_MARCH_SETTINGS });
    setElapsedSeconds(0);
    setPaused(true);
    setDebugView(0);
    setCapturing(false);
    setSelectedPixel({ x: 0.5, y: 0.5 });
    setSamplePoint({ x: -0.18, y: -0.18 });
    setRayFraction(0.38);
    setIncludeSphere(true);
    setIncludeBox(true);
    setIncludeTorus(true);
    activePointer.current = null;
    previousPointer.current = null;
  };

  const updateFromPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPoint(event, canvas);
    const fractionX = Math.min(1, Math.max(0, point.x / Math.max(1, size.width)));
    const fractionY = Math.min(1, Math.max(0, point.y / Math.max(1, size.height)));
    if (mode === "raymarch-screen") {
      setSelectedPixel({ x: fractionX, y: fractionY });
    } else if (showSdf) {
      setSamplePoint({ x: -2.4 + fractionX * 2.8, y: 1.2 - fractionY * 2.8 });
    } else if (showStepper) {
      setRayFraction(fractionX);
    } else {
      const previous = previousPointer.current;
      if (previous) {
        setCamera((current) => ({
          ...current,
          yaw: Math.min(0.72, Math.max(-0.72, current.yaw + (event.clientX - previous.x) * 0.006)),
          pitch: Math.min(
            0.45,
            Math.max(-0.2, current.pitch + (event.clientY - previous.y) * 0.006),
          ),
        }));
      }
    }
    previousPointer.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    previousPointer.current = { x: event.clientX, y: event.clientY };
    setCapturing(true);
    updateFromPointer(event);
  };

  const releasePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    activePointer.current = null;
    previousPointer.current = null;
    setCapturing(false);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " " && showShadow) {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key.toLowerCase() === "n" && showShadow) {
      setElapsedSeconds((current) => current + 0.1);
      setPaused(true);
    }
    if (event.key.toLowerCase() === "d" && showValidation) {
      setDebugView((current) => (current + 1) % 4);
    }
    if (event.key === "[") {
      setSettings((current) => ({
        ...current,
        maximumSteps: Math.max(16, current.maximumSteps - 16),
      }));
    }
    if (event.key === "]") {
      setSettings((current) => ({
        ...current,
        maximumSteps: Math.min(160, current.maximumSteps + 16),
      }));
    }
    if (event.key === "ArrowLeft" && showCamera) {
      setCamera((current) => ({ ...current, yaw: Math.max(-0.72, current.yaw - 0.06) }));
    }
    if (event.key === "ArrowRight" && showCamera) {
      setCamera((current) => ({ ...current, yaw: Math.min(0.72, current.yaw + 0.06) }));
    }
  };

  const trace = showStepper
    ? traceRaySteps(
        makeCameraRay(camera, rayFraction * 960, 319.5, 960, 640),
        settings,
        SPHERE_ONLY,
      )
    : [];
  const lastTrace = trace.at(-1);
  const sampleWidth = Math.max(80, Math.min(160, Math.floor(size.width / 5)));
  const sampleHeight = Math.max(
    52,
    Math.round((sampleWidth * size.height) / Math.max(1, size.width)),
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng Ray-marched Shape Room với camera ray, SDF, tracing steps, normal và shadow"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (capturing) updateFromPointer(event);
        }}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onWheel={(event) => {
          if (!showCamera || showSdf || showStepper) return;
          event.preventDefault();
          setCamera((current) => ({
            ...current,
            distance: Math.min(5.4, Math.max(3.4, current.distance + event.deltaY * 0.002)),
          }));
        }}
      />
      <div className="lab-controls">
        {showCamera && !showSdf && !showStepper && (
          <label>
            Camera yaw: {camera.yaw.toFixed(2)}
            <input
              type="range"
              min={-0.72}
              max={0.72}
              step={0.02}
              value={camera.yaw}
              onChange={(event) =>
                setCamera((current) => ({ ...current, yaw: Number(event.target.value) }))
              }
            />
          </label>
        )}
        {showSdf && (
          <label>
            Sample X: {samplePoint.x.toFixed(2)}
            <input
              type="range"
              min={-2.4}
              max={0.4}
              step={0.01}
              value={samplePoint.x}
              onChange={(event) =>
                setSamplePoint((current) => ({ ...current, x: Number(event.target.value) }))
              }
            />
          </label>
        )}
        {showStepper && (
          <label>
            Ray X: {rayFraction.toFixed(2)}
            <input
              type="range"
              min={0.05}
              max={0.95}
              step={0.01}
              value={rayFraction}
              onChange={(event) => setRayFraction(Number(event.target.value))}
            />
          </label>
        )}
        {(showStepper || showNormal) && (
          <label>
            Maximum steps: {settings.maximumSteps}
            <input
              type="range"
              min={16}
              max={160}
              step={16}
              value={settings.maximumSteps}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  maximumSteps: Number(event.target.value),
                }))
              }
            />
          </label>
        )}
        {(showStepper || showNormal) && (
          <label>
            Hit epsilon: {settings.hitEpsilon.toFixed(4)}
            <input
              type="range"
              min={0.0005}
              max={0.01}
              step={0.0005}
              value={settings.hitEpsilon}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  hitEpsilon: Number(event.target.value),
                }))
              }
            />
          </label>
        )}
        {showPrimitives && (
          <label>
            <input
              type="checkbox"
              checked={includeSphere}
              onChange={(event) => setIncludeSphere(event.target.checked)}
            />
            Sphere SDF
          </label>
        )}
        {showPrimitives && (
          <label>
            <input
              type="checkbox"
              checked={includeBox}
              onChange={(event) => setIncludeBox(event.target.checked)}
            />
            Box SDF
          </label>
        )}
        {showPrimitives && (
          <label>
            <input
              type="checkbox"
              checked={includeTorus}
              onChange={(event) => setIncludeTorus(event.target.checked)}
            />
            Torus SDF
          </label>
        )}
        {showValidation && (
          <label>
            Debug view
            <select
              value={debugView}
              onChange={(event) => setDebugView(Number(event.target.value))}
            >
              <option value={0}>Beauty</option>
              <option value={1}>Steps</option>
              <option value={2}>Hit mask</option>
              <option value={3}>Normal</option>
            </select>
          </label>
        )}
        {showShadow && (
          <button type="button" onClick={() => setPaused((current) => !current)}>
            {paused ? "Chạy đèn" : "Tạm dừng"}
          </button>
        )}
        {showShadow && (
          <button
            type="button"
            onClick={() => {
              setElapsedSeconds((current) => current + 0.1);
              setPaused(true);
            }}
          >
            Tiến 0,1 giây
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <LabReadout
        items={[
          ...(mode === "raymarch-screen"
            ? [
                {
                  label: "Fragment pixel / UV / NDC",
                  value: `${Math.round(selectedPixel.x * size.width)}, ${Math.round(selectedPixel.y * size.height)} · (${selectedPixel.x.toFixed(3)}, ${selectedPixel.y.toFixed(3)}) · (${(selectedPixel.x * 2 - 1).toFixed(3)}, ${(1 - selectedPixel.y * 2).toFixed(3)})`,
                },
              ]
            : []),
          ...(showCamera
            ? [
                {
                  label: "Camera position / center ray",
                  value: `${formatVector(cameraPosition(camera))} · ${formatVector(centerRay.direction)} · |dir| ${length(centerRay.direction).toFixed(6)}`,
                },
              ]
            : []),
          ...(showSdf
            ? [
                {
                  label: "Sphere signed distance",
                  value: `${sdfValue.toFixed(5)} · ${sdfValue < -settings.hitEpsilon ? "bên trong" : Math.abs(sdfValue) <= settings.hitEpsilon ? "trên bề mặt" : "bên ngoài"}`,
                },
              ]
            : []),
          ...(showStepper
            ? [
                {
                  label: "Trace step / distance / traveled",
                  value: lastTrace
                    ? `${lastTrace.step} · ${lastTrace.distance.toFixed(5)} · ${lastTrace.traveled.toFixed(5)}`
                    : "chưa có sample",
                },
              ]
            : []),
          ...(showNormal
            ? [
                {
                  label: "Center hit / material / work",
                  value: `${centerResult.hit ? "hit" : "miss"} · material ${centerResult.materialId} · ${centerResult.steps}/${settings.maximumSteps} steps · t=${centerResult.traveled.toFixed(3)}`,
                },
                {
                  label: "Numerical normal",
                  value: `${formatVector(centerNormal)} · |n| ${length(centerNormal).toFixed(5)}`,
                },
              ]
            : []),
          ...(showMaterials
            ? [
                {
                  label: "Điều kiện của scene",
                  value: `sphere ${includeSphere ? "1" : "tắt"} · box ${includeBox ? "2" : "tắt"} · torus ${includeTorus ? "3" : "tắt"} · room 4`,
                },
              ]
            : []),
          ...(showValidation
            ? [
                {
                  label: "Kết quả kiểm tra",
                  value: validationPassed
                    ? `${Object.keys(validation).length}/${Object.keys(validation).length} checks đạt`
                    : Object.entries(validation)
                        .filter(([, passed]) => !passed)
                        .map(([name]) => name)
                        .join(", "),
                },
              ]
            : []),
          {
            label: "Khối lượng mô phỏng / con trỏ",
            value: `${sampleWidth}×${sampleHeight} camera samples · tối đa ${settings.maximumSteps} primary steps${showShadow ? " + 48 shadow steps" : ""} · ${capturing ? "đang capture" : "đã nhả"}`,
          },
          {
            label: "Mô tả thay thế",
            value: showNormal
              ? `Center ray ${centerResult.hit ? `hit material ${centerResult.materialId}` : "miss"} sau ${centerResult.steps} bước; camera yaw ${camera.yaw.toFixed(2)}, pitch ${camera.pitch.toFixed(2)}, distance ${camera.distance.toFixed(2)}.`
              : `Mô phỏng đang ở stage ${mode ?? "final"}; pointer ${capturing ? "đang được giữ" : "đã được nhả"}.`,
          },
        ]}
      />
      <p className="lab-hint">
        {mode === "raymarch-screen" && "Kéo để chọn fragment và đọc Pixel → UV → NDC."}
        {showSdf && " Kéo sample qua lát cắt để đọc dấu của SDF."}
        {showStepper && " Kéo ngang để chọn ray; mỗi vòng tròn là khoảng cách an toàn ở một step."}
        {showCamera &&
          !showSdf &&
          !showStepper &&
          " Kéo để orbit, cuộn để zoom; phím mũi tên trái/phải đổi yaw."}
        {showShadow && " Space chạy/dừng đèn; N tiến 0,1 giây."}
        {showValidation && " D đổi debug view."} R reset; [ và ] đổi step budget.
      </p>
    </>
  );
}
