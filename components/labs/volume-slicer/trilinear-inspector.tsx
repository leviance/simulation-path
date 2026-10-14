"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Volume, linearStencil, worldCoordinate, type Point } from "@/lib/labs/volume-slicer";
import { setupCanvas, useCanvasSize } from "../lab-shared";

function teachingCell() {
  const cell = new Volume({ count: [2, 2, 2], spacing: [1, 1, 1] });
  for (let i = 0; i < 8; i++) cell.values[i] = (i + 1) / 10;
  return cell;
}

export function TrilinearInspector({ volume, point }: { volume: Volume; point: Point }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvas);
  const cell = useMemo(teachingCell, []);
  const [mode, setMode] = useState("example");
  const [fraction, setFraction] = useState<Point>([0.25, 0.5, 0.75]);
  const probe = fraction.map((f, a) => worldCoordinate(cell.grid, a, f)) as Point;
  const trace = linearStencil(
    mode === "example" ? cell : volume,
    mode === "example" ? probe : point,
  )!;

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const scale = Math.min(size.width / 4, (size.height - 75) / 2.4);
    const project = (p: Point) => ({
      x: size.width / 2 + (p[0] - p[1]) * scale,
      y: size.height * 0.65 + (p[0] + p[1]) * scale * 0.35 - p[2] * scale,
    });
    const line = (a: Point, b: Point) => {
      const p = project(a),
        q = project(b);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
    };
    ctx.strokeStyle = "#66718a";
    for (const c of trace.corners) {
      for (let a = 0; a < 3; a++) {
        if (c.bits[a] !== 0) continue;
        const end: Point = [...c.bits];
        end[a] = 1;
        line(c.bits, end);
      }
    }
    ctx.font = "12px sans-serif";
    for (const c of trace.corners) {
      const p = project(c.bits);
      ctx.fillStyle = "#61afef";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + 12 * c.weight, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#d4dfef";
      ctx.fillText(c.index.join(",") + " · w=" + c.weight.toFixed(3), p.x + 8, p.y - 7);
    }
    const p = project(trace.fraction);
    ctx.fillStyle = "#e5c07b";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#d4dfef";
    ctx.fillText(
      "Vàng: điểm lấy mẫu · bán kính xanh theo trọng số · ô không theo physical spacing",
      12,
      22,
    );
  }, [size, trace]);

  return (
    <section aria-label="Tám voxel và trọng số trilinear">
      <h3>Tám voxel đóng góp bao nhiêu?</h3>
      <p>
        Ô mẫu dùng tám giá trị 0.1–0.8. Dời điểm vàng bằng các slider, rồi đối chiếu từng hạng trong
        tổng. Chế độ theo cursor đọc đúng volume ở ảnh trên; không sửa dữ liệu ấy.
      </p>
      <div className="lab-controls">
        <label>
          Ô nội suy{" "}
          <select aria-label="Ô nội suy" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="example">Ô mẫu 2×2×2 — tính tay</option>
            <option value="cursor">Theo cursor của volume</option>
          </select>
        </label>
        {fraction.map((f, a) => (
          <label key={a}>
            f{"xyz"[a]} = {f.toFixed(2)}{" "}
            <input
              aria-label={"Trilinear f" + "xyz"[a]}
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={f}
              disabled={mode !== "example"}
              onChange={(e) =>
                setFraction(
                  (old) => old.map((v, i) => (i === a ? Number(e.target.value) : v)) as Point,
                )
              }
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => {
            setMode("example");
            setFraction([0.25, 0.5, 0.75]);
          }}
        >
          Đặt lại ô mẫu
        </button>
      </div>
      <canvas ref={canvas} className="lab-canvas" aria-label="Ô trilinear tám góc">
        Tám góc và trọng số được liệt kê trong bảng bên dưới.
      </canvas>
      <table>
        <caption>Giá trị × trọng số = đóng góp vào kết quả</caption>
        <thead>
          <tr>
            <th>Voxel x,y,z</th>
            <th>Giá trị</th>
            <th>Trọng số</th>
            <th>Đóng góp</th>
          </tr>
        </thead>
        <tbody>
          {trace.corners.map((c, i) => (
            <tr key={i}>
              <td>{c.index.join(", ")}</td>
              <td>{c.value.toFixed(5)}</td>
              <td>{c.weight.toFixed(5)}</td>
              <td>{c.contribution.toFixed(5)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Tổng trọng số = {trace.corners.reduce((s, c) => s + c.weight, 0).toFixed(5)}; kết quả
        trilinear = <output aria-label="Kết quả ô trilinear">{trace.value.toFixed(5)}</output>. Các
        index có thể trùng ở biên do replicate.
      </p>
    </section>
  );
}
