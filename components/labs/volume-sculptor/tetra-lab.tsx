"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { defaultCamera, orbit, zoom } from "@/lib/labs/shared/orthographic-camera";
import {
  polygonizeTetra,
  surfaceVertices,
  teachingTetra,
} from "@/lib/labs/volume-sculptor/topology";
import { modeQuestions } from "@/lib/labs/volume-sculptor/view";
import { canvasPoint, LabReadout, useCanvasSize } from "../lab-shared";
import { paintMesh, sceneBackground, type RasterLayer } from "./paint";
import { useClientReady } from "../../use-client-ready";

export function TetraLab() {
  const ready = useClientReady();
  const canvasRef = useRef<HTMLCanvasElement>(null),
    layerRef = useRef<RasterLayer | null>(null),
    dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const size = useCanvasSize(canvasRef),
    hintId = useId();
  const [values, setValues] = useState([-1, 1, 1, 1]),
    [isovalue, setIsovalue] = useState(0),
    [paused, setPaused] = useState(false);
  const [camera, setCamera] = useState(() => ({
    ...defaultCamera(),
    target: { x: 0, y: 0, z: 0 },
    zoom: 1.65,
  }));
  const corners = teachingTetra(values),
    surface = polygonizeTetra(corners, isovalue);
  const uniqueEdges = [
    ...new Map(
      surface.triangles.flatMap((triangle) =>
        triangle.map((edge) => [edge.key.join("–"), edge] as const),
      ),
    ).entries(),
  ];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const tetra = teachingTetra(values),
        triangles = polygonizeTetra(tetra, isovalue);
      const vertices = surfaceVertices(null, triangles.triangles).vertices;
      const project = sceneBackground(ctx, size, camera, size.width);
      layerRef.current = paintMesh(
        ctx,
        size,
        size.width,
        { vertices, indices: vertices.map((_, index) => index) },
        camera,
        true,
        layerRef.current,
      );
      ctx.font = "13px system-ui";
      for (let a = 0; a < 4; ++a)
        for (let b = a + 1; b < 4; ++b) {
          const start = project(tetra[a].point),
            end = project(tetra[b].point);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = "#9fb8cf88";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      for (const corner of tetra) {
        const point = project(corner.point);
        ctx.fillStyle = corner.value < isovalue ? "#f3b36d" : "#6cc9ee";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(
          `${String.fromCharCode(65 + corner.id)}: ${corner.value.toFixed(2)}`,
          point.x + 10,
          point.y - 10,
        );
      }
      for (const edge of triangles.triangles.flat()) {
        const point = project(edge.point);
        ctx.fillStyle = "#fff0a4";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#c1d4e7";
      ctx.fillText("Một tetra · cam: trong / xanh: ngoài / vàng: giao điểm", 16, 25);
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, isovalue, size, values]);

  const release = useCallback((owner?: number) => {
    const drag = dragRef.current;
    if (!drag || (owner !== undefined && drag.id !== owner)) return;
    dragRef.current = null;
    if (canvasRef.current?.hasPointerCapture(drag.id))
      canvasRef.current.releasePointerCapture(drag.id);
  }, []);
  useEffect(() => {
    const blur = () => {
      release();
      setPaused(true);
    };
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("blur", blur);
      release();
      layerRef.current = null;
    };
  }, [release]);
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current || event.button !== 0) return;
    const point = canvasPoint(event, event.currentTarget);
    dragRef.current = { id: event.pointerId, ...point };
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  return (
    <div data-volume-mode="tetra" data-ready={ready}>
      <p className="lab-fallback">{modeQuestions.tetra}</p>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: 390, touchAction: "none" }}
        tabIndex={ready ? 0 : -1}
        aria-disabled={!ready}
        aria-label="Bốn scalar của một tetra tạo triangle nội suy"
        aria-describedby={hintId}
        onPointerDown={pointerDown}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== event.pointerId) return;
          const point = canvasPoint(event, event.currentTarget);
          setCamera((current) => orbit(current, point.x - drag.x, point.y - drag.y));
          drag.x = point.x;
          drag.y = point.y;
        }}
        onPointerUp={(event) => release(event.pointerId)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => release(event.pointerId)}
        onBlur={() => release()}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.altKey || event.metaKey) return;
          const arrows: Record<string, [number, number]> = {
            ArrowLeft: [-12, 0],
            ArrowRight: [12, 0],
            ArrowUp: [0, -12],
            ArrowDown: [0, 12],
          };
          if (arrows[event.key]) setCamera((current) => orbit(current, ...arrows[event.key]));
          else if (["+", "=", "-"].includes(event.key))
            setCamera((current) => zoom(current, event.key === "-" ? -1 : 1));
          else if (event.key === " " && !event.repeat) setPaused((current) => !current);
          else return;
          event.preventDefault();
        }}
      />
      <p id={hintId} className="lab-fallback">
        Kéo hoặc dùng mũi tên để xoay góc nhìn; +/− để zoom. Đỉnh nằm đúng isovalue thuộc phía
        ngoài. Pause khóa thay đổi scalar, không khóa camera; không có animation tự chạy. Mặt phẳng
        tô màu được trích từ bốn scalar thật.
      </p>
      <fieldset
        disabled={!ready}
        aria-label="Điều khiển tetra"
        style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
      >
        <div className="lab-controls">
          {values.map((value, index) => (
            <label key={index}>
              F({String.fromCharCode(65 + index)}): {value.toFixed(2)}
              <input
                aria-label={`Scalar ${String.fromCharCode(65 + index)}`}
                disabled={paused}
                type="range"
                min={-2}
                max={2}
                step={0.05}
                value={value}
                onChange={(event) => {
                  const next = [...values];
                  next[index] = event.currentTarget.valueAsNumber;
                  setValues(next);
                }}
              />
            </label>
          ))}
          <label>
            Isovalue: {isovalue.toFixed(2)}
            <input
              aria-label="Tetra isovalue"
              disabled={paused}
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={isovalue}
              onChange={(event) => setIsovalue(event.currentTarget.valueAsNumber)}
            />
          </label>
          <button
            type="button"
            disabled={paused}
            onClick={() => {
              setValues([-1, -1, 1, 1]);
              setIsovalue(0);
            }}
          >
            Hai đỉnh trong
          </button>
          <button
            type="button"
            disabled={paused}
            onClick={() => {
              setValues([-1, 0, -1, -1]);
              setIsovalue(0);
            }}
          >
            Giao điểm suy biến
          </button>
          <button
            type="button"
            aria-pressed={paused}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Tiếp tục chỉnh" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => {
              release();
              setValues([-1, 1, 1, 1]);
              setIsovalue(0);
              setPaused(false);
              setCamera({ ...defaultCamera(), target: { x: 0, y: 0, z: 0 }, zoom: 1.65 });
            }}
          >
            Reset lab
          </button>
        </div>
      </fieldset>
      <LabReadout
        items={[
          {
            label: "Đỉnh trong / ngoài",
            value: `${values.filter((value) => value < isovalue).length} / ${values.filter((value) => value >= isovalue).length}`,
          },
          {
            label: "Triangle / suy biến bỏ qua",
            value: `${surface.triangles.length} / ${surface.degenerate}`,
          },
          { label: "Giao điểm edge khác nhau", value: uniqueEdges.length },
        ]}
      />
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Edge ID chuẩn</th>
              <th>t = (iso − Fa) / (Fb − Fa)</th>
              <th>Giao điểm (x; y; z)</th>
            </tr>
          </thead>
          <tbody>
            {uniqueEdges.map(([key, edge]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{edge.t.toFixed(4)}</td>
                <td>
                  {[edge.point.x, edge.point.y, edge.point.z]
                    .map((value) => value.toFixed(4))
                    .join("; ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
