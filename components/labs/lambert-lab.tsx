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
  lambertAdd,
  lambertFaceCentroid,
  lambertFaceNormal,
  lambertFaceVertices,
  lambertIsFrontFacing,
  lambertLightingSample,
  lambertNormalize,
  lambertScale,
  lambertTetrahedron,
  projectLambertVertex,
  shadeLambertColor,
  transformLambertMesh,
  type LambertColor,
  type LambertVec3,
} from "@/lib/labs/lambert";
import { LabReadout, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type LightPreset = "front" | "top" | "side" | "back";

const lightPresets: Record<LightPreset, LambertVec3> = {
  front: { x: 0, y: 0, z: -1 },
  top: { x: 0, y: 1, z: -0.25 },
  side: { x: 1, y: 0.15, z: -0.25 },
  back: { x: 0, y: 0, z: 1 },
};

function cssColor(color: LambertColor, alpha = 1) {
  return `rgb(${Math.round(color.red)} ${Math.round(color.green)} ${Math.round(color.blue)} / ${alpha})`;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 9 * Math.cos(angle - 0.5), end.y - 9 * Math.sin(angle - 0.5));
  ctx.lineTo(end.x - 9 * Math.cos(angle + 0.5), end.y - 9 * Math.sin(angle + 0.5));
  ctx.closePath();
  ctx.fill();
}

export default function LambertLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [pitch, setPitch] = useState(-0.28);
  const [yaw, setYaw] = useState(0.55);
  const [preset, setPreset] = useState<LightPreset>("front");
  const [selectedFace, setSelectedFace] = useState(0);
  const [ambient, setAmbient] = useState(0.16);
  const [diffuseStrength, setDiffuseStrength] = useState(0.84);
  const [lightingEnabled, setLightingEnabled] = useState(mode !== "lambert-mesh");
  const [showNormal, setShowNormal] = useState(mode !== "lambert-mesh");
  const [paused, setPaused] = useState(true);
  const dragStart = useRef<{ x: number; y: number; pitch: number; yaw: number } | null>(null);
  const previousFrame = useRef<number | null>(null);

  const surfaceToLight = useMemo(() => lambertNormalize(lightPresets[preset]), [preset]);
  const mesh = useMemo(() => transformLambertMesh(lambertTetrahedron, pitch, yaw), [pitch, yaw]);
  const faces = useMemo(
    () =>
      mesh.faces.map((face, index) => {
        const vertices = lambertFaceVertices(mesh, face);
        const normal = lambertFaceNormal(vertices);
        const lighting = lambertLightingSample(normal, surfaceToLight, ambient, diffuseStrength);
        return {
          face,
          index,
          vertices,
          normal,
          centroid: lambertFaceCentroid(vertices),
          frontFacing: lambertIsFrontFacing(vertices),
          lighting,
        };
      }),
    [ambient, diffuseStrength, mesh, surfaceToLight],
  );
  const selected = faces[selectedFace];
  const visibleCount = faces.filter((face) => face.frontFacing).length;

  useEffect(() => {
    if (paused || reducedMotion) {
      previousFrame.current = null;
      return;
    }
    let frame = 0;
    const animate = (time: number) => {
      const previous = previousFrame.current ?? time;
      const deltaTime = Math.min((time - previous) / 1000, 0.05);
      previousFrame.current = time;
      setYaw((current) => current + deltaTime * 0.65);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);

    const panel = {
      x: 20,
      y: 18,
      width: size.width - 40,
      height: size.height - 36,
    };
    ctx.strokeStyle = "#263451";
    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
    ctx.fillStyle = "#111a2e";
    ctx.fillRect(panel.x + 1, panel.y + 1, panel.width - 2, panel.height - 2);

    const projectedFaces = faces
      .filter((face) => face.frontFacing)
      .map((face) => ({
        ...face,
        points: face.vertices.map((vertex) =>
          projectLambertVertex(vertex, size.width, size.height),
        ),
      }));

    for (const face of projectedFaces) {
      if (face.points.some((point) => !point)) continue;
      const points = face.points as Array<{ x: number; y: number }>;
      let color = face.face.baseColor;
      if (lightingEnabled) color = shadeLambertColor(color, face.lighting.intensity);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.fillStyle = cssColor(color);
      ctx.fill();
      ctx.strokeStyle = face.index === selectedFace ? "#ffffff" : "#31415f";
      ctx.lineWidth = face.index === selectedFace ? 2.5 : 1.25;
      ctx.stroke();
    }

    if (showNormal) {
      const normalEnd = lambertAdd(selected.centroid, lambertScale(selected.normal, 0.9));
      const start = projectLambertVertex(selected.centroid, size.width, size.height);
      const end = projectLambertVertex(normalEnd, size.width, size.height);
      if (start && end) drawArrow(ctx, start, end, "#f7f9ff");
    }

    const lightOrigin = { x: panel.x + 58, y: panel.y + 58 };
    const lightEnd = {
      x: lightOrigin.x + surfaceToLight.x * 42,
      y: lightOrigin.y - surfaceToLight.y * 42 + surfaceToLight.z * 20,
    };
    drawArrow(ctx, lightOrigin, lightEnd, "#ffca64");
    ctx.fillStyle = "#ffca64";
    ctx.font = "600 11px ui-monospace";
    ctx.fillText("surfaceToLight", lightOrigin.x - 38, lightOrigin.y + 30);

    ctx.fillStyle = "#dbe6ff";
    ctx.font = "500 12px ui-monospace";
    ctx.fillText(
      `face ${selectedFace} · N·L ${selected.lighting.dotValue.toFixed(3)}`,
      panel.x + 16,
      panel.y + panel.height - 16,
    );
  }, [faces, lightingEnabled, selected, selectedFace, showNormal, size, surfaceToLight]);

  const reset = () => {
    setPitch(-0.28);
    setYaw(0.55);
    setPreset("front");
    setSelectedFace(0);
    setAmbient(0.16);
    setDiffuseStrength(0.84);
    setLightingEnabled(mode !== "lambert-mesh");
    setShowNormal(mode !== "lambert-mesh");
    setPaused(true);
  };

  const step = () => {
    setYaw((current) => current + 0.08);
    setPaused(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY, pitch, yaw };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    setYaw(dragStart.current.yaw + (event.clientX - dragStart.current.x) * 0.01);
    setPitch(
      Math.max(
        -1.4,
        Math.min(1.4, dragStart.current.pitch + (event.clientY - dragStart.current.y) * 0.01),
      ),
    );
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (event.key >= "1" && event.key <= "4") {
      const names: LightPreset[] = ["front", "top", "side", "back"];
      setPreset(names[Number(event.key) - 1]);
    } else if (key === "a" || event.key === "ArrowLeft") {
      event.preventDefault();
      setYaw((current) => current - 0.08);
      setPaused(true);
    } else if (key === "d" || event.key === "ArrowRight") {
      event.preventDefault();
      setYaw((current) => current + 0.08);
      setPaused(true);
    } else if (key === "w" || event.key === "ArrowUp") {
      event.preventDefault();
      setPitch((current) => Math.max(-1.4, current - 0.08));
      setPaused(true);
    } else if (key === "s" || event.key === "ArrowDown") {
      event.preventDefault();
      setPitch((current) => Math.min(1.4, current + 0.08));
      setPaused(true);
    } else if (event.key === "Tab") {
      event.preventDefault();
      setSelectedFace((current) => (current + 1) % 4);
    } else if (key === "l") {
      setLightingEnabled((current) => !current);
    } else if (key === "n") {
      setShowNormal((current) => !current);
    } else if (event.key === " ") {
      event.preventDefault();
      if (!reducedMotion) setPaused((current) => !current);
    } else if (key === "r") {
      reset();
    }
  };

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Hướng đèn
          <select
            aria-label="Preset hướng đèn"
            value={preset}
            onChange={(event) => setPreset(event.target.value as LightPreset)}
          >
            <option value="front">1 · Front</option>
            <option value="top">2 · Top</option>
            <option value="side">3 · Side</option>
            <option value="back">4 · Back</option>
          </select>
        </label>
        <label>
          Face
          <select
            aria-label="Face đang theo dõi"
            value={selectedFace}
            onChange={(event) => setSelectedFace(Number(event.target.value))}
          >
            {[0, 1, 2, 3].map((face) => (
              <option key={face} value={face}>
                Face {face}
              </option>
            ))}
          </select>
        </label>
        {(mode === "lambert-material" || mode === "lambert-validation") && (
          <>
            <label>
              Ambient
              <input
                aria-label="Cường độ ambient"
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={ambient}
                onChange={(event) => setAmbient(Number(event.target.value))}
              />
              <output>{ambient.toFixed(2)}</output>
            </label>
            <label>
              Diffuse
              <input
                aria-label="Cường độ diffuse"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={diffuseStrength}
                onChange={(event) => setDiffuseStrength(Number(event.target.value))}
              />
              <output>{diffuseStrength.toFixed(2)}</output>
            </label>
          </>
        )}
        <button type="button" onClick={() => setLightingEnabled((current) => !current)}>
          Lighting {lightingEnabled ? "bật" : "tắt"}
        </button>
        <button type="button" onClick={() => setShowNormal((current) => !current)}>
          Normal {showNormal ? "bật" : "tắt"}
        </button>
        <button
          type="button"
          disabled={reducedMotion}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Chạy xoay" : "Tạm dừng"}
        </button>
        <button type="button" onClick={step}>
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Tetrahedron flat-shaded với face normal và hướng surface-to-light"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          dragStart.current = null;
        }}
      />
      <LabReadout
        items={[
          {
            label: "surfaceToLight",
            value: `(${surfaceToLight.x.toFixed(2)}, ${surfaceToLight.y.toFixed(2)}, ${surfaceToLight.z.toFixed(2)})`,
          },
          {
            label: "Normal length",
            value: Math.hypot(selected.normal.x, selected.normal.y, selected.normal.z).toFixed(4),
          },
          {
            label: "dot → diffuse",
            value: `${selected.lighting.dotValue.toFixed(3)} → ${selected.lighting.diffuse.toFixed(3)}`,
          },
          {
            label: "Ambient / strength",
            value: `${ambient.toFixed(2)} / ${diffuseStrength.toFixed(2)}`,
          },
          { label: "Intensity", value: selected.lighting.intensity.toFixed(3) },
          { label: "Visible / culled", value: `${visibleCount} / ${4 - visibleCount}` },
        ]}
      />
      <p className="sr-only">
        Face {selectedFace} có dot {selected.lighting.dotValue.toFixed(3)}, diffuse{" "}
        {selected.lighting.diffuse.toFixed(3)} và intensity {selected.lighting.intensity.toFixed(3)}
        . Có {visibleCount} face hướng về camera.
      </p>
    </div>
  );
}
