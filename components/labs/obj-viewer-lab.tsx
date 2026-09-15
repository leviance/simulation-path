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
  OBJ_PRESETS,
  buildObjScene,
  normalizeObjMesh,
  objBoundsCenter,
  objBoundsMaxExtent,
  objMeshBounds,
  parseObjSource,
  type ObjPreset,
} from "@/lib/labs/obj-viewer";
import { renderZTriangles, zFrameDifference } from "@/lib/labs/z-buffer";
import {
  LabReadout,
  canvasPoint,
  drawLine,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const BUFFER_WIDTH = 72;
const BUFFER_HEIGHT = 48;

function presetForMode(mode?: InteractiveLabMode): ObjPreset {
  if (mode === "obj-indices") return "slash";
  if (mode === "obj-triangulation") return "negative";
  if (mode === "obj-validation") return "malformed";
  return "rocket";
}

function startsSolid(mode?: InteractiveLabMode) {
  return mode === "obj-shading" || mode === "obj-render" || mode === "obj-validation";
}

function formatVector(value: { x: number; y: number; z: number } | null | undefined) {
  if (!value) return "—";
  return `(${value.x.toFixed(2)}, ${value.y.toFixed(2)}, ${value.z.toFixed(2)})`;
}

export default function ObjViewerLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const initialPreset = presetForMode(mode);
  const [preset, setPreset] = useState<ObjPreset>(initialPreset);
  const [draft, setDraft] = useState<string>(OBJ_PRESETS[initialPreset]);
  const [source, setSource] = useState<string>(OBJ_PRESETS[initialPreset]);
  const [angle, setAngle] = useState({ x: -0.35, y: 0.65 });
  const [solid, setSolid] = useState(startsSolid(mode));
  const [cullBackfaces, setCullBackfaces] = useState(mode === "obj-shading");
  const [reverseOrder, setReverseOrder] = useState(false);
  const [showBounds, setShowBounds] = useState(mode === "obj-normalize");
  const [selectedTriangle, setSelectedTriangle] = useState(0);
  const [paused, setPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const drag = useRef<{
    pointerX: number;
    pointerY: number;
    angleX: number;
    angleY: number;
  } | null>(null);

  const parsed = useMemo(() => parseObjSource(source), [source]);
  const normalization = useMemo(() => normalizeObjMesh(parsed.mesh), [parsed.mesh]);
  const mesh = normalization?.mesh ?? parsed.mesh;
  const scene = useMemo(
    () => buildObjScene(mesh, BUFFER_WIDTH, BUFFER_HEIGHT, angle.x, angle.y, cullBackfaces),
    [angle, cullBackfaces, mesh],
  );
  const frame = useMemo(
    () =>
      renderZTriangles(scene.triangles, BUFFER_WIDTH, BUFFER_HEIGHT, {
        reverseOrder,
      }),
    [reverseOrder, scene.triangles],
  );
  const reversedFrame = useMemo(
    () =>
      renderZTriangles(scene.triangles, BUFFER_WIDTH, BUFFER_HEIGHT, {
        reverseOrder: !reverseOrder,
      }),
    [reverseOrder, scene.triangles],
  );
  const difference = zFrameDifference(frame, reversedFrame);
  const selected = parsed.mesh.triangles[selectedTriangle];
  const selectedScene = scene.triangles.find(
    (triangle) => triangle.sourceFace === selected?.sourceFace,
  );
  const originalBounds = objMeshBounds(parsed.mesh);
  const normalizedBounds = objMeshBounds(mesh);

  useEffect(() => {
    if (paused || reducedMotion) return;
    let previous = performance.now();
    let request = 0;
    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setAngle((current) => ({ ...current, y: current.y + deltaSeconds * 0.45 }));
      request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [paused, reducedMotion]);

  const layout = useMemo(() => {
    const cell = Math.max(
      3,
      Math.floor(Math.min((size.width - 36) / BUFFER_WIDTH, (size.height - 36) / BUFFER_HEIGHT)),
    );
    return {
      cell,
      left: Math.round((size.width - cell * BUFFER_WIDTH) / 2),
      top: Math.round((size.height - cell * BUFFER_HEIGHT) / 2),
    };
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);

    const toCanvas = (point: { x: number; y: number }) => ({
      x: layout.left + point.x * layout.cell,
      y: layout.top + point.y * layout.cell,
    });

    if (solid) {
      for (let y = 0; y < BUFFER_HEIGHT; y += 1) {
        for (let x = 0; x < BUFFER_WIDTH; x += 1) {
          const color = frame.colors[y * BUFFER_WIDTH + x];
          context.fillStyle = `rgb(${color.red} ${color.green} ${color.blue})`;
          context.fillRect(
            layout.left + x * layout.cell,
            layout.top + y * layout.cell,
            layout.cell + 0.25,
            layout.cell + 0.25,
          );
        }
      }
    } else {
      for (const triangle of scene.triangles) {
        const a = toCanvas(triangle.a);
        const b = toCanvas(triangle.b);
        const c = toCanvas(triangle.c);
        drawLine(context, a, b, "#70d6ff", 1.25);
        drawLine(context, b, c, "#70d6ff", 1.25);
        drawLine(context, c, a, "#70d6ff", 1.25);
      }
    }

    if (mode === "obj-vertices" || mode === "obj-faces" || mode === "obj-indices") {
      scene.projectedPositions.forEach((point, index) => {
        const canvasPoint = toCanvas(point);
        context.beginPath();
        context.arc(canvasPoint.x, canvasPoint.y, 4, 0, Math.PI * 2);
        context.fillStyle = "#ffd166";
        context.fill();
        context.fillStyle = "#f5f7ff";
        context.font = "700 10px ui-monospace";
        context.fillText(String(index + 1), canvasPoint.x + 6, canvasPoint.y - 5);
      });
    }

    if (selectedScene) {
      const a = toCanvas(selectedScene.a);
      const b = toCanvas(selectedScene.b);
      const c = toCanvas(selectedScene.c);
      drawLine(context, a, b, "#ffbe52", 3);
      drawLine(context, b, c, "#ffbe52", 3);
      drawLine(context, c, a, "#ffbe52", 3);
    }

    if (showBounds && scene.projectedPositions.length > 0) {
      const xs = scene.projectedPositions.map((point) => point.x);
      const ys = scene.projectedPositions.map((point) => point.y);
      const minimum = toCanvas({ x: Math.min(...xs), y: Math.min(...ys) });
      const maximum = toCanvas({ x: Math.max(...xs), y: Math.max(...ys) });
      context.strokeStyle = "#c792ea";
      context.lineWidth = 2;
      context.setLineDash([6, 4]);
      context.strokeRect(minimum.x, minimum.y, maximum.x - minimum.x, maximum.y - minimum.y);
      context.setLineDash([]);
    }

    context.strokeStyle = "#344564";
    context.lineWidth = 1;
    context.strokeRect(
      layout.left - 0.5,
      layout.top - 0.5,
      BUFFER_WIDTH * layout.cell + 1,
      BUFFER_HEIGHT * layout.cell + 1,
    );

    if (parsed.diagnostics.length > 0) {
      context.fillStyle = "#ff7b86";
      context.font = "700 13px ui-monospace";
      context.textAlign = "center";
      context.fillText(
        `Parser dừng an toàn: ${parsed.diagnostics.length} diagnostic`,
        size.width / 2,
        size.height / 2,
      );
      context.textAlign = "start";
    }
  }, [
    frame,
    layout,
    mode,
    parsed.diagnostics.length,
    scene,
    selectedScene,
    showBounds,
    size,
    solid,
  ]);

  const applyPreset = (next: ObjPreset) => {
    setPreset(next);
    setDraft(OBJ_PRESETS[next]);
    setSource(OBJ_PRESETS[next]);
    setSelectedTriangle(0);
    setPaused(true);
  };

  const reset = () => {
    setDraft(OBJ_PRESETS[preset]);
    setSource(OBJ_PRESETS[preset]);
    setAngle({ x: -0.35, y: 0.65 });
    setSolid(startsSolid(mode));
    setCullBackfaces(mode === "obj-shading");
    setReverseOrder(false);
    setShowBounds(mode === "obj-normalize");
    setSelectedTriangle(0);
    setPaused(true);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    drag.current = {
      pointerX: point.x,
      pointerY: point.y,
      angleX: angle.x,
      angleY: angle.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setCapturing(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const point = canvasPoint(event, event.currentTarget);
    setAngle({
      x: drag.current.angleX + (point.y - drag.current.pointerY) * 0.008,
      y: drag.current.angleY + (point.x - drag.current.pointerX) * 0.008,
    });
    setPaused(true);
  };

  const stopPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drag.current = null;
    setCapturing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (key === "r") reset();
    if (key === "w") setSolid((current) => !current);
    if (key === "c") setCullBackfaces((current) => !current);
    if (key === "o") setReverseOrder((current) => !current);
    if (key === "n") {
      setAngle((current) => ({ ...current, y: current.y + 0.08 }));
      setPaused(true);
    }
    if (event.key === " ") {
      event.preventDefault();
      setPaused((current) => !current);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setSelectedTriangle((current) => {
        const count = Math.max(1, parsed.mesh.triangles.length);
        return (current + direction + count) % count;
      });
    }
  };

  const diagnosticText = parsed.diagnostics[0]
    ? `line ${parsed.diagnostics[0].line}: ${parsed.diagnostics[0].message}`
    : "không có";
  const selectedIndices = selected
    ? selected.indices.map((index) => `${index + 1}→${index}`).join(" · ")
    : "—";
  const beforeCenter = originalBounds ? objBoundsCenter(originalBounds) : null;
  const afterCenter = normalizedBounds ? objBoundsCenter(normalizedBounds) : null;

  return (
    <div className="lab-stack">
      <div className="lab-controls">
        <label>
          OBJ mẫu
          <select
            aria-label="OBJ mẫu"
            value={preset}
            onChange={(event) => applyPreset(event.target.value as ObjPreset)}
          >
            <option value="rocket">Rocket nhiều face</option>
            <option value="slash">Quad có v/vt/vn</option>
            <option value="negative">Pentagon index âm</option>
            <option value="malformed">Input có lỗi</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={solid}
            onChange={(event) => setSolid(event.target.checked)}
          />
          Solid
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={cullBackfaces}
            onChange={(event) => setCullBackfaces(event.target.checked)}
          />
          Back-face culling
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={reverseOrder}
            onChange={(event) => setReverseOrder(event.target.checked)}
          />
          Đảo draw order
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showBounds}
            onChange={(event) => setShowBounds(event.target.checked)}
          />
          Xem bounds
        </label>
        <button type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? "Cho model quay" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAngle((current) => ({ ...current, y: current.y + 0.08 }));
            setPaused(true);
          }}
        >
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>

      <label className="lab-source-editor">
        Nguồn OBJ đang thử
        <textarea
          aria-label="Nguồn OBJ"
          value={draft}
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setSource(draft);
            setSelectedTriangle(0);
            setPaused(true);
          }}
        >
          Nạp source vào parser
        </button>
      </label>

      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="OBJ mesh được parse, chuẩn hóa và render bằng CPU Z-buffer"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopPointer}
        onPointerCancel={stopPointer}
        onLostPointerCapture={() => {
          drag.current = null;
          setCapturing(false);
        }}
      />

      <LabReadout
        items={[
          {
            label: "Lines / diagnostic",
            value: `${parsed.lineCount} / ${parsed.diagnostics.length}`,
          },
          {
            label: "Position / source face",
            value: `${parsed.mesh.positions.length} / ${parsed.mesh.sourceFaceCount}`,
          },
          { label: "Triangle sau fan", value: String(parsed.mesh.triangles.length) },
          { label: "OBJ index → vector index", value: selectedIndices },
          {
            label: "Center trước → sau",
            value: `${formatVector(beforeCenter)} → ${formatVector(afterCenter)}`,
          },
          {
            label: "Max extent / uniform scale",
            value: `${originalBounds ? objBoundsMaxExtent(originalBounds).toFixed(3) : "—"} / ${normalization?.uniformScale.toFixed(3) ?? "—"}`,
          },
          {
            label: "Normal / intensity",
            value: `${formatVector(selectedScene?.normal)} / ${selectedScene?.intensity.toFixed(3) ?? "—"}`,
          },
          {
            label: "Fragment pass / reject",
            value: `${frame.passedCount} / ${frame.rejectedCount}`,
          },
          {
            label: "Chênh lệch khi đảo order",
            value: `${difference.colorPixels} color · ${difference.depthPixels} depth`,
          },
          { label: "Diagnostic đầu tiên", value: diagnosticText },
          { label: "pointer capture", value: capturing ? "đang kéo" : "đã nhả" },
        ]}
      />
      <p className="sr-only">
        Parser đọc {parsed.mesh.positions.length} position, {parsed.mesh.sourceFaceCount} source
        face và tạo {parsed.mesh.triangles.length} triangle. {diagnosticText}.
      </p>
    </div>
  );
}
