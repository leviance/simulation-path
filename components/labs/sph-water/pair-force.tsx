"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  defaultPair,
  defaultSettings,
  inspectPair,
  length,
  type PairParameters,
} from "@/lib/labs/sph-water";
import { LabReadout, setupCanvas, useCanvasSize } from "../lab-shared";

export function PairForceExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    helpId = useId();
  const [parameters, setParameters] = useState<PairParameters>({ ...defaultPair });
  const [soundSpeed, setSoundSpeed] = useState(12),
    [alpha, setAlpha] = useState(0.15);
  const report = inspectPair(parameters, { ...defaultSettings, soundSpeed, alpha }, stage);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const largest = Math.max(
      1,
      ...report.pressureForce.map(length),
      ...report.viscosityForce.map(length),
    );
    const scale = Math.min(100, size.width / 5) / largest,
      y = size.height / 2;
    const arrow = (x: number, row: number, value: number, color: string) => {
      const end = x + value * scale;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, row);
      ctx.lineTo(end, row);
      if (Math.abs(value) > 1e-12) {
        const sign = Math.sign(value);
        ctx.moveTo(end - 6 * sign, row - 4);
        ctx.lineTo(end, row);
        ctx.lineTo(end - 6 * sign, row + 4);
      }
      ctx.stroke();
    };
    ctx.font = "13px sans-serif";
    for (let i = 0; i < 2; i++) {
      const x = size.width * (0.35 + 0.3 * i);
      ctx.fillStyle = "#61afef";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d5dcea";
      ctx.fillText(i === 0 ? "A · x=0.47" : "B · x=0.53", x - 36, y + 24);
      arrow(x, y - 32, report.pressureForce[i].x, "#61afef");
      if (stage >= 6) arrow(x, y + 50, report.viscosityForce[i].x, "#e5c07b");
    }
    ctx.fillStyle = "#d5dcea";
    ctx.fillText("Xanh: pressure · cam: viscosity · cùng thang độ dài", 16, 24);
    ctx.fillText("Vị trí giữ nguyên; không có gravity hoặc wall", 16, 45);
  }, [report, size, stage]);
  const vector = (p: { x: number; y: number }) =>
    "(" + p.x.toFixed(6) + "; " + p.y.toFixed(6) + ")";
  const reset = () => {
    setParameters({ ...defaultPair });
    setSoundSpeed(12);
    setAlpha(0.15);
  };
  const readout = [
    {
      label: "Pressure A / B",
      value: report.state.particles.map((p) => p.pressure.toFixed(6)).join(" / "),
    },
    { label: "Gradient W theo A", value: vector(report.gradient) },
    {
      label: "Lực pressure A / B",
      value: vector(report.pressureForce[0]) + " / " + vector(report.pressureForce[1]),
    },
    { label: "Tổng lực nội", value: vector(report.netForce) },
  ];
  if (stage >= 6)
    readout.push(
      { label: "Pi của cặp", value: report.pi.toFixed(9) },
      {
        label: "Lực viscosity A / B",
        value: vector(report.viscosityForce[0]) + " / " + vector(report.viscosityForce[1]),
      },
      { label: "Công suất viscosity", value: report.viscosityPower.toFixed(9) },
    );
  return (
    <>
      <p>
        Đây là phép tính lực tại một thời điểm, với density cho trước. Nó không thay thế bước
        summation density của bể nước và không tích phân vị trí.
      </p>
      <div className="lab-controls">
        {(["densityA", "densityB"] as const).map((key) => (
          <label key={key}>
            Density {key === "densityA" ? "A" : "B"}{" "}
            <select
              value={parameters[key]}
              onChange={(e) => setParameters((p) => ({ ...p, [key]: Number(e.target.value) }))}
            >
              {[900, 1100, 1200].map((rho) => (
                <option key={rho} value={rho}>
                  {rho}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Sound speed cặp{" "}
          <select value={soundSpeed} onChange={(e) => setSoundSpeed(Number(e.target.value))}>
            {[8, 12, 20].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {stage >= 6 && (
          <>
            <label>
              Chuyển động tương đối{" "}
              <select
                value={parameters.approaching ? "approach" : "separate"}
                onChange={(e) =>
                  setParameters((p) => ({ ...p, approaching: e.target.value === "approach" }))
                }
              >
                <option value="approach">Tiến lại gần</option>
                <option value="separate">Tách ra</option>
              </select>
            </label>
            <label>
              Alpha cặp{" "}
              <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value))}>
                {[0, 0.15, 0.3].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="button" onClick={reset}>
          Đặt lại cặp hạt
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        aria-label="Lực của cặp hạt SPH"
        aria-describedby={helpId}
      >
        Hai hạt tại x=0.47 và 0.53; mũi tên biểu diễn lực pressure và viscosity.
      </canvas>
      <p id={helpId}>
        Đổi density bằng các control bàn phím được. Với alpha=0, viscosity phải bằng 0. Khi tách ra,
        Pi và công suất viscosity bằng 0 dù pressure vẫn có thể đẩy.
      </p>
      <LabReadout items={readout} />
    </>
  );
}
