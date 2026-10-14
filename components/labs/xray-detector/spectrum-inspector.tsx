"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { defaultSettings, transmission, type Depth } from "@/lib/labs/xray-detector";
import { setupCanvas, useCanvasSize } from "../lab-shared";

export function SpectrumInspector({ depth, weight }: { depth: Depth; weight: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvas);
  const [example, setExample] = useState(true);
  const [scale, setScale] = useState(1);
  const base = example ? { low: 1, high: 0.2, samples: 0 } : depth;
  const w = example ? 0.6 : weight;
  const settings = { ...defaultSettings, spectral: true, lowWeight: w };
  const points = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => {
        const x = i / 20;
        const ratio = transmission(
          { low: base.low * x, high: base.high * x, samples: 0 },
          { ...defaultSettings, spectral: true, lowWeight: w },
        );
        return {
          x,
          mixed: -Math.log(Math.max(1e-12, ratio)),
          averaged: x * (w * base.low + (1 - w) * base.high),
        };
      }),
    [base.low, base.high, w],
  );
  const low = w * Math.exp(-scale * base.low);
  const high = (1 - w) * Math.exp(-scale * base.high);
  const T = transmission({ low: scale * base.low, high: scale * base.high, samples: 0 }, settings);
  const p = -Math.log(Math.max(1e-12, T));
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const left = 45,
      right = size.width - 20,
      top = 40,
      bottom = size.height - 40;
    const maximum = Math.max(1, points.at(-1)!.averaged);
    const x = (value: number) => left + (value / 3) * (right - left);
    const y = (value: number) => bottom - (value / maximum) * (bottom - top);
    ctx.strokeStyle = "#66718a";
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.stroke();
    for (const [key, color] of [
      ["mixed", "#64e1b4"],
      ["averaged", "#e5b65c"],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(x(point.x), y(point[key]));
        else ctx.lineTo(x(point.x), y(point[key]));
      });
      ctx.stroke();
    }
    ctx.fillStyle = "#64e1b4";
    ctx.beginPath();
    ctx.arc(x(scale), y(p), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4dfef";
    ctx.font = "12px sans-serif";
    ctx.fillText(
      "Xanh: log của tổng intensity · cam: trung bình tau (không phải detector)",
      12,
      22,
    );
    ctx.fillText("p: 0.." + maximum.toFixed(2), left, top - 4);
    ctx.fillText("0", left, bottom + 22);
    ctx.fillText("3 × chiều dài", right - 100, bottom + 22);
  }, [size, points, scale, p]);
  return (
    <section aria-label="Phổ hai thành phần theo độ dày">
      <h3>Vì sao ảnh log không tăng tuyến tính?</h3>
      <div className="lab-controls">
        <label>
          <input type="checkbox" checked={example} onChange={(e) => setExample(e.target.checked)} />{" "}
          Dùng ví dụ tauLow=1, tauHigh=0.2, w=0.6
        </label>
        <label>
          Hệ số chiều dài: {scale.toFixed(2)}{" "}
          <input
            aria-label="Hệ số chiều dài phổ"
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setExample(true);
            setScale(1);
          }}
        >
          Đặt lại ví dụ phổ
        </button>
      </div>
      <p>
        Tắt ô ví dụ để dùng tau của ray đang chọn. Đồ thị nhân chiều dài của mọi chord cùng một hệ
        số, không xoay vật thể hay sửa ảnh detector. Không áp dụng log floor này như một phép đo vật
        liệu thật.
      </p>
      <canvas ref={canvas} className="lab-canvas" aria-label="Log detector theo hệ số chiều dài">
        Các giá trị tại điểm được chọn có ở dòng bên dưới.
      </canvas>
      <p>
        Low: {low.toFixed(6)}; high: {high.toFixed(6)}; T = {T.toFixed(6)}; p = {p.toFixed(6)}; tỉ
        lệ high sau vật thể = {T > 0 ? ((100 * high) / T).toFixed(2) : "—"}%.
      </p>
    </section>
  );
}
