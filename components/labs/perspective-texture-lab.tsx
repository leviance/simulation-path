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
  checkerTextureIsLight,
  clipTextureTriangleNearPlane,
  inspectTextureTriangles,
  makeTextureQuad,
  nearestTextureTexel,
  projectTextureVertex,
  textureDepthPresets,
  type TextureAddressMode,
  type TextureInterpolationMode,
  type TextureQuad,
  type TextureTriangle,
  type TextureVec2,
  type TextureVertex,
} from "@/lib/labs/perspective-texture";
import { LabReadout, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

type PresetName = keyof typeof textureDepthPresets;
type ViewMode = TextureInterpolationMode | "compare";

interface Panel {
  x: number;
  y: number;
  width: number;
  height: number;
  interpolation: TextureInterpolationMode;
  label: string;
}

const rasterWidth = 220;
const rasterHeight = 160;

function faceVertices(quad: TextureQuad, face: readonly [number, number, number]) {
  return face.map((index) => quad.vertices[index]) as [TextureVertex, TextureVertex, TextureVertex];
}

function clippedTriangles(quad: TextureQuad) {
  const output: TextureTriangle[] = [];
  for (const face of quad.faces) {
    const polygon = clipTextureTriangleNearPlane(faceVertices(quad, face), 1);
    for (let index = 1; index + 1 < polygon.length; index += 1) {
      output.push([polygon[0], polygon[index], polygon[index + 1]]);
    }
  }
  return output;
}

function renderTexturePanel(
  ctx: CanvasRenderingContext2D,
  panel: Panel,
  triangles: readonly TextureTriangle[],
  addressMode: TextureAddressMode,
  selectedPoint: TextureVec2,
  colors: {
    background: string;
    light: string;
    dark: string;
    border: string;
    text: string;
    accent: string;
  },
) {
  const offscreen = document.createElement("canvas");
  offscreen.width = rasterWidth;
  offscreen.height = rasterHeight;
  const offscreenContext = offscreen.getContext("2d");
  if (!offscreenContext) return;
  offscreenContext.fillStyle = colors.background;
  offscreenContext.fillRect(0, 0, rasterWidth, rasterHeight);

  for (let y = 0; y < rasterHeight; y += 1) {
    for (let x = 0; x < rasterWidth; x += 1) {
      const inspection = inspectTextureTriangles(
        triangles,
        { x: x + 0.5, y: y + 0.5 },
        rasterWidth,
        rasterHeight,
      );
      const uv = panel.interpolation === "affine" ? inspection?.affineUv : inspection?.correctedUv;
      if (!uv) continue;
      offscreenContext.fillStyle = checkerTextureIsLight(uv, 8, addressMode)
        ? colors.light
        : colors.dark;
      offscreenContext.fillRect(x, y, 1, 1);
    }
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, panel.x, panel.y, panel.width, panel.height);
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);

  const scaleX = panel.width / rasterWidth;
  const scaleY = panel.height / rasterHeight;
  for (const vertices of triangles) {
    const projected = vertices.map((vertex) =>
      projectTextureVertex(vertex, rasterWidth, rasterHeight),
    );
    if (!projected[0] || !projected[1] || !projected[2]) continue;
    ctx.beginPath();
    ctx.moveTo(panel.x + projected[0].x * scaleX, panel.y + projected[0].y * scaleY);
    ctx.lineTo(panel.x + projected[1].x * scaleX, panel.y + projected[1].y * scaleY);
    ctx.lineTo(panel.x + projected[2].x * scaleX, panel.y + projected[2].y * scaleY);
    ctx.closePath();
    ctx.strokeStyle = colors.border;
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = "600 11px ui-monospace";
  ctx.fillText(panel.label, panel.x + 10, panel.y + 17);
  const markerX = panel.x + selectedPoint.x * panel.width;
  const markerY = panel.y + selectedPoint.y * panel.height;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(markerX - 6, markerY);
  ctx.lineTo(markerX + 6, markerY);
  ctx.moveTo(markerX, markerY - 6);
  ctx.lineTo(markerX, markerY + 6);
  ctx.stroke();
}

export default function PerspectiveTextureLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [preset, setPreset] = useState<PresetName>(mode === "texture-clip" ? "near" : "medium");
  const [nearDepth, setNearDepth] = useState<number>(
    textureDepthPresets[mode === "texture-clip" ? "near" : "medium"].near,
  );
  const [farDepth, setFarDepth] = useState<number>(
    textureDepthPresets[mode === "texture-clip" ? "near" : "medium"].far,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    mode === "texture-affine" ? "affine" : mode === "texture-correct" ? "perspective" : "compare",
  );
  const [addressMode, setAddressMode] = useState<TextureAddressMode>("clamp");
  const [selectedPoint, setSelectedPoint] = useState<TextureVec2>({ x: 0.5, y: 0.52 });
  const [selectedUv, setSelectedUv] = useState<TextureVec2>({ x: 0.62, y: 0.38 });
  const [paused, setPaused] = useState(true);
  const dragStart = useRef<{
    x: number;
    y: number;
    nearDepth: number;
    farDepth: number;
    moved: boolean;
  } | null>(null);
  const direction = useRef(1);
  const previousFrame = useRef<number | null>(null);

  const quad = useMemo(() => makeTextureQuad(nearDepth, farDepth), [farDepth, nearDepth]);
  const triangles = useMemo(() => clippedTriangles(quad), [quad]);
  const narrow = size.width < 620;
  const panels = useMemo<Panel[]>(() => {
    if (viewMode !== "compare") {
      return [
        {
          x: 20,
          y: 18,
          width: size.width - 40,
          height: size.height - 36,
          interpolation: viewMode,
          label: viewMode === "affine" ? "AFFINE UV" : "PERSPECTIVE-CORRECT UV",
        },
      ];
    }
    if (narrow) {
      const panelHeight = (size.height - 54) / 2;
      return [
        {
          x: 20,
          y: 18,
          width: size.width - 40,
          height: panelHeight,
          interpolation: "affine",
          label: "AFFINE UV",
        },
        {
          x: 20,
          y: 36 + panelHeight,
          width: size.width - 40,
          height: panelHeight,
          interpolation: "perspective",
          label: "PERSPECTIVE-CORRECT UV",
        },
      ];
    }
    const panelWidth = (size.width - 54) / 2;
    return [
      {
        x: 20,
        y: 18,
        width: panelWidth,
        height: size.height - 36,
        interpolation: "affine",
        label: "AFFINE UV",
      },
      {
        x: 34 + panelWidth,
        y: 18,
        width: panelWidth,
        height: size.height - 36,
        interpolation: "perspective",
        label: "PERSPECTIVE-CORRECT UV",
      },
    ];
  }, [narrow, size.height, size.width, viewMode]);

  const inspection = useMemo(
    () =>
      mode === "texture-sampling"
        ? undefined
        : inspectTextureTriangles(
            triangles,
            { x: selectedPoint.x * rasterWidth, y: selectedPoint.y * rasterHeight },
            rasterWidth,
            rasterHeight,
          ),
    [mode, selectedPoint, triangles],
  );
  const shownUv =
    mode === "texture-sampling" ? selectedUv : (inspection?.correctedUv ?? selectedUv);
  const texel = nearestTextureTexel(shownUv, 64, 64, addressMode);

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
      setFarDepth((current) => {
        let next = current + direction.current * deltaTime * 0.8;
        if (next > 8 || next < Math.max(nearDepth + 0.2, 2)) {
          direction.current *= -1;
          next = Math.max(Math.max(nearDepth + 0.2, 2), Math.min(8, next));
        }
        return next;
      });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [nearDepth, paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setupCanvas(ctx, size);
    const styles = getComputedStyle(document.documentElement);
    const colors = {
      background: styles.getPropertyValue("--navy").trim() || "#11192c",
      light: styles.getPropertyValue("--surface").trim() || "#fbfaf6",
      dark: styles.getPropertyValue("--surface-2").trim() || "#1a2235",
      border: styles.getPropertyValue("--line").trim() || "#273149",
      text: styles.getPropertyValue("--ink").trim() || "#f4f6fb",
      accent: styles.getPropertyValue("--orange").trim() || "#ef7d42",
    };

    if (mode === "texture-sampling") {
      const panel = panels[0];
      const cells = 8;
      const cellWidth = panel.width / cells;
      const cellHeight = panel.height / cells;
      for (let y = 0; y < cells; y += 1) {
        for (let x = 0; x < cells; x += 1) {
          ctx.fillStyle = (x + y) % 2 === 0 ? colors.light : colors.dark;
          ctx.fillRect(panel.x + x * cellWidth, panel.y + y * cellHeight, cellWidth, cellHeight);
        }
      }
      ctx.strokeStyle = colors.border;
      ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
      const addressed = nearestTextureTexel(selectedUv, 64, 64, addressMode);
      const addressedU = (addressed.x + 0.5) / 64;
      const addressedV = (addressed.y + 0.5) / 64;
      const markerX = panel.x + addressedU * panel.width;
      const markerY = panel.y + addressedV * panel.height;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(markerX - 7, markerY - 7, 14, 14);
      return;
    }

    for (const panel of panels) {
      renderTexturePanel(ctx, panel, triangles, addressMode, selectedPoint, colors);
    }

    if (mode === "texture-quad") {
      const panel = panels[0];
      for (const [index, vertex] of quad.vertices.entries()) {
        const point = projectTextureVertex(vertex, panel.width, panel.height);
        if (!point) continue;
        ctx.fillStyle = colors.text;
        ctx.font = "600 11px ui-monospace";
        ctx.fillText(
          `${index}: (${vertex.uv.x.toFixed(0)},${vertex.uv.y.toFixed(0)})`,
          panel.x + point.x + 6,
          panel.y + point.y - 6,
        );
      }
    }
  }, [addressMode, mode, panels, quad, selectedPoint, selectedUv, size, triangles]);

  const applyPreset = (name: PresetName) => {
    setPreset(name);
    setNearDepth(textureDepthPresets[name].near);
    setFarDepth(textureDepthPresets[name].far);
    setPaused(true);
    direction.current = 1;
  };

  const reset = () => {
    const initial: PresetName = mode === "texture-clip" ? "near" : "medium";
    applyPreset(initial);
    setViewMode(
      mode === "texture-affine" ? "affine" : mode === "texture-correct" ? "perspective" : "compare",
    );
    setAddressMode("clamp");
    setSelectedPoint({ x: 0.5, y: 0.52 });
    setSelectedUv({ x: 0.62, y: 0.38 });
  };

  const step = () => {
    setFarDepth((current) => Math.min(8, current + direction.current * 0.12));
    setPaused(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      nearDepth,
      farDepth,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPaused(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    if (Math.hypot(deltaX, deltaY) > 4) dragStart.current.moved = true;
    if (mode === "texture-sampling") {
      const canvas = event.currentTarget.getBoundingClientRect();
      setSelectedUv({
        x: (event.clientX - canvas.left) / canvas.width,
        y: (event.clientY - canvas.top) / canvas.height,
      });
      return;
    }
    setFarDepth(Math.max(1.1, Math.min(9, dragStart.current.farDepth + deltaX * 0.02)));
    setNearDepth(Math.max(0.35, Math.min(6, dragStart.current.nearDepth + deltaY * 0.01)));
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const start = dragStart.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (start && !start.moved && mode !== "texture-sampling") {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const panel = panels.find(
        (candidate) =>
          point.x >= candidate.x &&
          point.x <= candidate.x + candidate.width &&
          point.y >= candidate.y &&
          point.y <= candidate.y + candidate.height,
      );
      if (panel) {
        setSelectedPoint({
          x: (point.x - panel.x) / panel.width,
          y: (point.y - panel.y) / panel.height,
        });
      }
    }
    dragStart.current = null;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const names: PresetName[] = ["front", "medium", "steep", "near"];
    if (event.key >= "1" && event.key <= "4") {
      applyPreset(names[Number(event.key) - 1]);
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "a" || event.key === "ArrowLeft") {
      event.preventDefault();
      setFarDepth((current) => Math.max(1.1, current - 0.12));
      setPaused(true);
    } else if (key === "d" || event.key === "ArrowRight") {
      event.preventDefault();
      setFarDepth((current) => Math.min(9, current + 0.12));
      setPaused(true);
    } else if (key === "w" || event.key === "ArrowUp") {
      event.preventDefault();
      setNearDepth((current) => Math.max(0.35, current - 0.08));
      setPaused(true);
    } else if (key === "s" || event.key === "ArrowDown") {
      event.preventDefault();
      setNearDepth((current) => Math.min(6, current + 0.08));
      setPaused(true);
    } else if (key === "m") {
      setViewMode((current) => {
        if (current === "affine") return "perspective";
        if (current === "perspective") return "compare";
        return "affine";
      });
    } else if (key === "t") {
      setAddressMode((current) => (current === "clamp" ? "repeat" : "clamp"));
    } else if (event.key === " ") {
      event.preventDefault();
      if (!reducedMotion) setPaused((current) => !current);
    } else if (key === "r") {
      reset();
    }
  };

  const weightsText = inspection
    ? `${inspection.weights.a.toFixed(3)} / ${inspection.weights.b.toFixed(3)} / ${inspection.weights.c.toFixed(3)}`
    : "ngoài vùng được vẽ";
  const affineText = inspection
    ? `(${inspection.affineUv.x.toFixed(3)}, ${inspection.affineUv.y.toFixed(3)})`
    : "—";
  const correctedText = inspection
    ? `(${inspection.correctedUv.x.toFixed(3)}, ${inspection.correctedUv.y.toFixed(3)})`
    : "—";

  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Tình huống
          <select
            aria-label="Độ nghiêng của quad texture"
            value={preset}
            onChange={(event) => applyPreset(event.target.value as PresetName)}
          >
            <option value="front">1 · Front</option>
            <option value="medium">2 · Medium</option>
            <option value="steep">3 · Steep</option>
            <option value="near">4 · Near clip</option>
          </select>
        </label>
        {mode !== "texture-sampling" && (
          <label>
            Hiển thị
            <select
              aria-label="Cách nội suy texture"
              value={viewMode}
              onChange={(event) => setViewMode(event.target.value as ViewMode)}
            >
              <option value="affine">Affine</option>
              <option value="perspective">Perspective-correct</option>
              <option value="compare">So sánh</option>
            </select>
          </label>
        )}
        {(mode === "texture-sampling" || mode === "texture-validation") && (
          <label>
            Address
            <select
              aria-label="Texture address mode"
              value={addressMode}
              onChange={(event) => setAddressMode(event.target.value as TextureAddressMode)}
            >
              <option value="clamp">Clamp</option>
              <option value="repeat">Repeat</option>
            </select>
          </label>
        )}
        {mode !== "texture-sampling" && (
          <label>
            Far Z
            <input
              aria-label="Độ sâu cạnh xa"
              type="range"
              min="1.1"
              max="9"
              step="0.05"
              value={farDepth}
              onChange={(event) => {
                setFarDepth(Number(event.target.value));
                setPaused(true);
              }}
            />
            <output>{farDepth.toFixed(2)}</output>
          </label>
        )}
        {mode === "texture-sampling" && (
          <>
            <label>
              U
              <input
                aria-label="Tọa độ U để lấy mẫu"
                type="range"
                min="-0.5"
                max="1.5"
                step="0.01"
                value={selectedUv.x}
                onChange={(event) =>
                  setSelectedUv((current) => ({ ...current, x: Number(event.target.value) }))
                }
              />
              <output>{selectedUv.x.toFixed(2)}</output>
            </label>
            <label>
              V
              <input
                aria-label="Tọa độ V để lấy mẫu"
                type="range"
                min="-0.5"
                max="1.5"
                step="0.01"
                value={selectedUv.y}
                onChange={(event) =>
                  setSelectedUv((current) => ({ ...current, y: Number(event.target.value) }))
                }
              />
              <output>{selectedUv.y.toFixed(2)}</output>
            </label>
          </>
        )}
        <button
          type="button"
          disabled={reducedMotion || mode === "texture-sampling"}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Chạy thay đổi tilt" : "Tạm dừng"}
        </button>
        <button type="button" disabled={mode === "texture-sampling"} onClick={step}>
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
        aria-label="Quad nghiêng với texture affine và perspective-correct"
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
          { label: "Near Z / far Z", value: `${nearDepth.toFixed(2)} / ${farDepth.toFixed(2)}` },
          { label: "λA / λB / λC", value: weightsText },
          { label: "Affine UV", value: affineText },
          { label: "Corrected UV", value: correctedText },
          {
            label: "1/z denominator / error",
            value: inspection
              ? `${inspection.denominator.toFixed(5)} / ${inspection.error.toFixed(5)}`
              : "—",
          },
          { label: "Texel", value: `(${texel.x}, ${texel.y}) · ${addressMode}` },
        ]}
      />
      <p className="sr-only">
        Quad có cạnh gần ở Z {nearDepth.toFixed(2)} và cạnh xa ở Z {farDepth.toFixed(2)}. Sai số UV
        tại sample là {inspection?.error.toFixed(5) ?? "không xác định"}.
      </p>
    </div>
  );
}
