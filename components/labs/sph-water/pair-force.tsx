"use client";
import { useEffect, useRef, useState } from "react";
import {
  inspectPair,
  defaultPair,
  defaultSettings,
  type PairParameters,
} from "@/lib/labs/sph-water";
import { LabReadout, useCanvasSize } from "../lab-shared";
export function PairForceExperiment({ stage }: { stage: number }) {
  const [ready, setReady] = useState(false);
  const [parameters, setParameters] = useState<PairParameters>({ ...defaultPair }),
    [settings, setSettings] = useState({ ...defaultSettings, alpha: stage >= 6 ? 0.3 : 0 });
  const ref = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(ref),
    value = inspectPair(parameters, settings);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.fillStyle = "#09121f";
    ctx.fillRect(0, 0, size.width, size.height);
    const left = size.width * 0.3,
      right = size.width * 0.7,
      y = size.height * 0.5;
    for (const x of [left, right]) {
      ctx.fillStyle = "#3cbdf0";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.fill();
    }
    const arrow = (x: number, force: number, color: string) => {
      const end = x + Math.sign(force) * Math.min(100, Math.abs(force) * 0.1);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(end, y);
      ctx.lineTo(end - Math.sign(force) * 10, y - 7);
      ctx.moveTo(end, y);
      ctx.lineTo(end - Math.sign(force) * 10, y + 7);
      ctx.stroke();
    };
    arrow(left, value.pressureForce, "#8ce1ff");
    arrow(right, -value.pressureForce, "#8ce1ff");
    ctx.fillStyle = "#c4d8e8";
    ctx.font = "14px monospace";
    ctx.fillText("A", left - 4, y + 44);
    ctx.fillText("B", right - 4, y + 44);
    ctx.fillText("Density cho trước; không chạy bể, gravity hoặc wall.", 16, 24);
  }, [size, value.pressureForce]);
  return (
    <div data-sph-pair-ready={ready ? "true" : "false"}>
      <fieldset
        disabled={!ready}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-label="Điều khiển cặp hạt"
      >
        <div className="lab-controls">
          <label>
            Density A{" "}
            <select
              aria-label="Density A"
              value={parameters.densityA}
              onChange={(e) => setParameters({ ...parameters, densityA: Number(e.target.value) })}
            >
              {[900, 1100, 1200].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Density B{" "}
            <select
              aria-label="Density B"
              value={parameters.densityB}
              onChange={(e) => setParameters({ ...parameters, densityB: Number(e.target.value) })}
            >
              {[900, 1100, 1200].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {stage >= 6 && (
            <label>
              Chuyển động tương đối{" "}
              <select
                aria-label="Chuyển động tương đối"
                value={parameters.approaching ? "approach" : "separate"}
                onChange={(e) =>
                  setParameters({ ...parameters, approaching: e.target.value === "approach" })
                }
              >
                <option value="approach">Tiến lại gần</option>
                <option value="separate">Tách ra</option>
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setParameters({ ...defaultPair });
              setSettings({ ...defaultSettings, alpha: stage >= 6 ? 0.3 : 0 });
            }}
          >
            Đặt lại cặp hạt
          </button>
        </div>
      </fieldset>
      <canvas
        ref={ref}
        className="lab-canvas"
        aria-label="Lực trên cặp hạt cho trước"
        style={{ height: 270 }}
      >
        Hai hạt có cùng khối lượng: pressure tạo lực ngược chiều; viscosity chỉ tiêu tán khi tiến
        lại gần.
      </canvas>
      <LabReadout
        items={[
          {
            label: "Pressure A / B",
            value: `${value.pressureA.toFixed(3)} / ${value.pressureB.toFixed(3)} N/m`,
          },
          { label: "Tổng lực nội", value: "0.000000 N" },
          {
            label: "Lực pressure A / B",
            value: `${value.pressureForce.toFixed(6)} / ${(-value.pressureForce).toFixed(6)} N`,
          },
          { label: "Pi của cặp", value: value.pi.toFixed(9) },
          { label: "Công suất viscosity", value: value.power.toFixed(9) + " W" },
        ]}
      />
      <p className="lab-note">
        Thí nghiệm tĩnh, không có chuyển động cần pause. m=4,9 kg, khoảng cách h=0,091 m. Đổi
        density để tách luật lực khỏi phép tính density trong bể.
      </p>
    </div>
  );
}
