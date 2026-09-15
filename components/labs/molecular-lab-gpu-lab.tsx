"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advancePipeline,
  auditPipeline,
  cancelPipeline,
  createPipeline,
  kineticEnergy,
  memoryPlan,
  momentum,
  phases,
} from "@/lib/labs/molecular-lab-gpu";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";
import { drawMolecularGpu } from "./molecular-lab-gpu-render";

function MolecularGpu({ mode }: { mode: string }) {
  const stage = Math.max(1, Math.min(10, Number(mode.split("-").at(-1)) || 10));
  const [model, setModel] = useState(() => createPipeline());
  const [paused, setPaused] = useState(true);
  const [count, setCount] = useState(64);
  const [selected, setSelected] = useState(0);
  const [reuse, setReuse] = useState(true);
  const [plannedCount, setPlannedCount] = useState(100000);
  const [audit, setAudit] = useState<ReturnType<typeof auditPipeline> | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useRef<Array<{ x: number; y: number }>>([]);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const plan = useMemo(() => memoryPlan(plannedCount), [plannedCount]);
  const step = useCallback(() => {
    setAudit(null);
    setModel((current) => {
      const next = structuredClone(current);
      advancePipeline(next, reuse && stage >= 7);
      return next;
    });
  }, [reuse, stage]);

  useEffect(() => {
    if (paused || reducedMotion || stage < 6 || model.error) return;
    let frame = 0;
    let previous = 0;
    const tick = (time: number) => {
      if (time - previous >= 160) {
        previous = time;
        step();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, step, model.error]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    points.current = drawMolecularGpu(ctx, size, model, selected, stage, pan, zoom);
  }, [size, model, selected, stage, pan, zoom]);

  const reset = (nextCount = count) => {
    setPaused(true);
    setCount(nextCount);
    setModel(createPipeline(nextCount));
    setSelected(0);
    setAudit(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };
  const cancel = () => {
    setPaused(true);
    setModel((current) => {
      const next = structuredClone(current);
      cancelPipeline(next);
      return next;
    });
  };

  const particle = model.system.particles[selected];
  const totalMomentum = momentum(model.system);
  const kinetic = kineticEnergy(model.system);
  const readout = [
    { label: "Hạt i", value: String(selected) },
    {
      label: "Position.xy",
      value: `${particle.position.x.toFixed(4)}, ${particle.position.y.toFixed(4)}`,
    },
  ];
  if (stage >= 2) {
    readout.push({
      label: "Velocity.xy",
      value: `${particle.velocity.x.toFixed(4)}, ${particle.velocity.y.toFixed(4)}`,
    });
    readout.push({ label: "Byte đầu của vec4[i]", value: String(selected * 16) });
  }
  if (stage >= 4)
    readout.push({
      label: "Force.xy",
      value: `${model.force.forces[selected].x.toFixed(6)}, ${model.force.forces[selected].y.toFixed(6)}`,
    });
  if (stage >= 5)
    readout.push({ label: "Ô đông nhất", value: `${model.grid.maximumOccupancy}/16` });
  if (stage >= 6)
    readout.push({ label: "Bank / bước đã nhận", value: `${model.bank} / ${model.steps}` });
  if (stage >= 7) {
    readout.push({ label: "Số lần dựng grid", value: String(model.rebuilds) });
    readout.push({ label: "D / ngưỡng", value: `${model.displacement.toFixed(6)} / 0.2` });
  }
  if (stage >= 8) {
    readout.push({
      label: "K / U",
      value: `${kinetic.toFixed(6)} / ${model.force.potential.toFixed(6)}`,
    });
    readout.push({ label: "E", value: (kinetic + model.force.potential).toFixed(6) });
    readout.push({
      label: "Px / Py",
      value: `${totalMomentum.x.toExponential(2)} / ${totalMomentum.y.toExponential(2)}`,
    });
  }

  return (
    <div className="lab-body space-y-4 p-4">
      <p className="text-sm text-slate-400">
        Đây là Canvas 2D chạy CPU với 64 hoặc 144 hạt, không phải benchmark GPU. Bản C++ tải về mới
        dùng OpenGL compute. Mỗi lần bấm chỉ đi qua một pha; hạt màu xanh vẫn thuộc bank đã được
        chấp nhận.
      </p>
      <div className="lab-controls">
        <label>
          Số hạt minh họa{" "}
          <select
            aria-label="Số hạt minh họa"
            value={count}
            onChange={(event) => reset(Number(event.target.value))}
          >
            <option value="64">64</option>
            <option value="144">144</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          disabled={stage < 6 || reducedMotion || Boolean(model.error)}
        >
          {paused || reducedMotion ? "Chạy chậm từng pha" : "Tạm dừng"}
        </button>
        <button type="button" onClick={step} disabled={stage < 6 || Boolean(model.error)}>
          Pha tiếp theo
        </button>
        <button type="button" onClick={cancel}>
          Hủy bước đang tính
        </button>
        <button type="button" onClick={() => reset()}>
          Reset
        </button>
        {stage >= 7 && (
          <label>
            <input
              type="checkbox"
              checked={reuse}
              onChange={(event) => {
                cancel();
                setReuse(event.target.checked);
              }}
            />{" "}
            Tái sử dụng grid khi chưa chạm skin/2
          </label>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas w-full rounded-xl border border-slate-700"
        style={{ height: 380, touchAction: "none" }}
        tabIndex={0}
        role="img"
        aria-label="Hệ hạt tuần hoàn. Click chọn hạt, kéo để pan. Phím mũi tên đổi hạt, dấu cộng trừ để zoom, Enter đi một pha."
        onKeyDown={(event) => {
          if (["ArrowRight", "ArrowLeft", "+", "-", "Enter"].includes(event.key))
            event.preventDefault();
          if (event.key === "ArrowRight") setSelected((value) => (value + 1) % count);
          if (event.key === "ArrowLeft") setSelected((value) => (value + count - 1) % count);
          if (event.key === "+") setZoom((value) => Math.min(4, value * 1.2));
          if (event.key === "-") setZoom((value) => Math.max(0.5, value / 1.2));
          if (event.key === "Enter" && stage >= 6) step();
        }}
        onPointerDown={(event) => {
          const p = canvasPoint(event, event.currentTarget);
          const nearest = points.current.findIndex(
            (point) => Math.hypot(point.x - p.x, point.y - p.y) < 10,
          );
          if (nearest >= 0) setSelected(nearest);
          pointer.current = { id: event.pointerId, ...p };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.focus();
        }}
        onPointerMove={(event) => {
          const previous = pointer.current;
          if (!previous || previous.id !== event.pointerId) return;
          const p = canvasPoint(event, event.currentTarget);
          setPan((value) => ({ x: value.x + p.x - previous.x, y: value.y + p.y - previous.y }));
          pointer.current = { id: event.pointerId, ...p };
        }}
        onPointerUp={(event) => {
          pointer.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
      />
      <label>
        Zoom{" "}
        <input
          aria-label="Zoom mô phỏng"
          type="range"
          min="0.5"
          max="4"
          step="0.1"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </label>
      {stage >= 6 && (
        <ol className="grid gap-2 text-sm sm:grid-cols-5" aria-label="Các pha của một bước GPU">
          {phases.map((phase, i) => (
            <li
              key={phase}
              className={`rounded border p-2 ${i === model.phase ? "border-cyan-400 text-cyan-300" : "border-slate-700 text-slate-400"}`}
              aria-current={i === model.phase ? "step" : undefined}
            >
              {i + 1}. {phase}
            </li>
          ))}
        </ol>
      )}
      <LabReadout items={readout} />
      {model.error && (
        <p role="alert" className="text-rose-400">
          {model.error} Bấm Reset để tạo lại hệ.
        </p>
      )}
      {stage >= 4 && (
        <div className="lab-controls">
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              setAudit(auditPipeline(model));
            }}
          >
            Đối chiếu lực với mọi cặp
          </button>
          {audit && (
            <p role="status">
              Sai số lực {audit.forceError.toExponential(2)}; sai số U{" "}
              {audit.potentialError.toExponential(2)}. Số lượt kiểm: grid {audit.gridChecks}, mọi
              cặp {audit.bruteChecks}. Đây là số phép kiểm, không phải thời gian GPU.
            </p>
          )}
        </div>
      )}
      {stage >= 9 && (
        <div className="lab-controls rounded-xl border border-slate-700">
          <label>
            Chỉ ước tính bộ nhớ, không tạo hạt:{" "}
            <select
              aria-label="Preset ước tính GPU"
              value={plannedCount}
              onChange={(event) => setPlannedCount(Number(event.target.value))}
            >
              {[100000, 500000, 1000000, 5000000].map((value) => (
                <option key={value} value={value}>
                  {value.toLocaleString("vi-VN")}
                </option>
              ))}
            </select>
          </label>
          <p>
            {(plan.residentBytes / 1048576).toFixed(1)} MiB buffer; block lớn nhất{" "}
            {(plan.largestBlock / 1048576).toFixed(1)} MiB. Chưa gồm driver và framebuffer. Khi thay
            preset, peak còn gồm bộ cũ. Vượt khả năng phần cứng hoặc ô chứa hơn 16 hạt phải từ chối
            chạy.
          </p>
        </div>
      )}
      <p className="text-sm text-slate-400">
        Văn bản thay thế: Drift ghi bank ứng viên; grid được kiểm tra trước Force; Kick hoàn tất vận
        tốc; Reduction hợp lệ mới đổi bank. Ô tô xanh là stencil quanh vị trí lúc dựng grid, không
        phải ô hiện tại của hạt.{" "}
        {reducedMotion
          ? "Reduced motion đang bật: dùng nút Pha tiếp theo."
          : "Mô phỏng bắt đầu ở trạng thái tạm dừng."}
      </p>
    </div>
  );
}

export default function MolecularLabGpu({ mode = "gpu-md-10" }: { mode?: string }) {
  return <MolecularGpu key={mode} mode={mode} />;
}
