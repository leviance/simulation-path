"use client";
import { useEffect, useRef, useState } from "react";
import { spline3 } from "@/lib/labs/sph-water-gpu/spline";
import { setupCanvas, useCanvasSize } from "../lab-shared";

// A static mathematical plot: changing q does not start animation or physics.
export function SplinePlot() {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  const [q, setQ] = useState(0.8);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const { width: w, height: h } = size;
    ctx.fillStyle = "#101f31";
    ctx.fillRect(0, 0, w, h);
    const x = (value: number) => 45 + ((w - 65) * value) / 2;
    const y = (value: number) => h - 35 - ((h - 55) * value) / 1.3;
    ctx.strokeStyle = "#52657c";
    ctx.beginPath();
    ctx.moveTo(x(0), y(1.3));
    ctx.lineTo(x(0), y(0));
    ctx.lineTo(x(2), y(0));
    ctx.stroke();
    for (const radial of [false, true]) {
      ctx.strokeStyle = radial ? "#f5b75a" : "#52caef";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const t = i / 100,
          f = Math.PI * spline3(t, 1),
          value = radial ? 4 * t * t * f : f;
        if (i === 0) ctx.moveTo(x(t), y(value));
        else ctx.lineTo(x(t), y(value));
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "#e4edf5";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x(q), 20);
    ctx.lineTo(x(q), y(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#e4edf5";
    ctx.font = "12px sans-serif";
    ctx.fillText("0", x(0) - 4, h - 13);
    ctx.fillText("1", x(1) - 4, h - 13);
    ctx.fillText("2 · q = r/h", x(2) - 65, h - 13);
  }, [q, size]);
  const f = Math.PI * spline3(q, 1);
  return (
    <section>
      <h4>Kernel tại một điểm và đóng góp của cả lớp cầu</h4>
      <label>
        Khoảng cách q = {q.toFixed(2)}
        <input
          aria-label="Khoảng cách kernel q"
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={q}
          onChange={(e) => setQ(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={() => setQ(0.8)}>
        Đặt lại q
      </button>
      <canvas
        ref={canvas}
        className="lab-canvas"
        style={{ height: 220 }}
        aria-label="Đồ thị cubic spline 3D"
      >
        Đường xanh là f(q) = πh³W; đường cam là 4q²f(q), đóng góp của cả lớp cầu trong tích phân 3D.
      </canvas>
      <p>
        Xanh: f(q) = {f.toFixed(4)}. Cam: 4q²f(q) = {(4 * q * q * f).toFixed(4)}. Kernel lớn nhất ở
        tâm, nhưng lớp cầu có diện tích tăng theo r²; diện tích dưới đường cam từ 0 tới 2 bằng 1.
        Thanh q dùng được bằng bàn phím và không thay đổi state nước.
      </p>
    </section>
  );
}
