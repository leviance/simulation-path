"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  defaultCamera,
  defaultSettings,
  evaluate,
  length,
  subtract,
  makeParticles,
  makePlan,
  step,
  type Camera,
  type Particle,
  type Settings,
} from "@/lib/labs/sph-water-gpu";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import { drawWater } from "./sph-water-gpu/draw";

function WaterExperiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    helpId = useId(),
    reducedMotion = useReducedMotion();
  const [side, setSide] = useState(4),
    plan = useMemo(() => makePlan(side), [side]);
  const [particles, setParticles] = useState<Particle[]>(() => makeParticles(makePlan(4))),
    state = useRef(particles);
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings }),
    [camera, setCamera] = useState<Camera>({ ...defaultCamera });
  const [selected, setSelected] = useState(0),
    [paused, setPaused] = useState(true),
    [slice, setSlice] = useState(false);
  const [tick, setTick] = useState(0),
    [time, setTime] = useState(0),
    [lastDt, setDt] = useState(0),
    [error, setError] = useState("");
  const [plannedSide, setPlannedSide] = useState(8),
    largePlan = makePlan(plannedSide);
  const [validation, setValidation] = useState("Chưa chạy");
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const release = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    if (active && canvas.current?.hasPointerCapture(active.id))
      canvas.current.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const report = useMemo(
    () => evaluate(plan, particles, settings, stage),
    [plan, particles, settings, stage],
  );
  const advance = useCallback(
    (steps: number) => {
      if (stage < 7) return;
      try {
        let elapsed = 0,
          dt = 0;
        for (let i = 0; i < steps; i++) {
          const result = step(plan, state.current, settings, stage);
          state.current = result.particles;
          elapsed += result.dt;
          dt = result.dt;
        }
        setParticles(state.current);
        setTick((v) => v + steps);
        setTime((v) => v + elapsed);
        setDt(dt);
      } catch (failure) {
        stop();
        setError(String(failure));
      }
    },
    [stage, plan, settings, stop],
  );
  const reset = (nextSide = side) => {
    stop();
    setSide(nextSide);
    const value = makeParticles(makePlan(nextSide));
    state.current = value;
    setParticles(value);
    setSelected(0);
    setTick(0);
    setTime(0);
    setDt(0);
    setError("");
    setValidation("Chưa chạy");
    setCamera({ ...defaultCamera });
  };
  const change = (patch: Partial<Settings>) => {
    stop();
    setSettings((old) => ({ ...old, ...patch }));
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, [stop, release]);
  useEffect(() => {
    if (paused || reducedMotion || stage < 10 || error) return;
    let frame = 0,
      last = performance.now();
    const animate = (now: number) => {
      if (now - last >= 50) {
        last = now;
        advance(4);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, error, advance]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawWater(ctx, size, plan, particles, report.density, selected, camera, stage, slice);
  }, [size, plan, particles, report, selected, camera, stage, slice]);
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || pointer.current) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const old = pointer.current;
    if (!old || old.id !== event.pointerId) return;
    setCamera((c) => ({
      ...c,
      yaw: c.yaw + (event.clientX - old.x) * 0.005,
      pitch: Math.max(-1.2, Math.min(1.2, c.pitch - (event.clientY - old.y) * 0.005)),
    }));
    pointer.current = { id: old.id, x: event.clientX, y: event.clientY };
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === event.pointerId) release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key))
      event.preventDefault();
    if (event.key === "ArrowLeft")
      setSelected((i) => (i + particles.length - 1) % particles.length);
    if (event.key === "ArrowRight") setSelected((i) => (i + 1) % particles.length);
    if (event.key === "ArrowUp") setCamera((c) => ({ ...c, pitch: Math.min(1.2, c.pitch + 0.1) }));
    if (event.key === "ArrowDown")
      setCamera((c) => ({ ...c, pitch: Math.max(-1.2, c.pitch - 0.1) }));
    if (event.key.toLowerCase() === "n" && !event.repeat) {
      stop();
      advance(1);
    }
    if (event.key === " " && !event.repeat && stage >= 10 && !reducedMotion && !error)
      setPaused((v) => !v);
  };
  const p = particles[selected],
    vector = (v: { x: number; y: number; z: number }) =>
      `(${v.x.toFixed(6)}; ${v.y.toFixed(6)}; ${v.z.toFixed(6)})`;
  const readout = [
    {
      label: "Số hạt CPU / tổng mass",
      value: particles.length + " / " + (particles.length * plan.mass).toFixed(6) + " kg",
    },
    { label: "Position hạt chọn", value: vector(p.position) },
    { label: "Velocity hạt chọn", value: vector(p.velocity) },
    { label: "Tick", value: String(tick) },
    { label: "Thời gian / dt", value: time.toFixed(6) + " / " + lastDt.toFixed(9) + " s" },
  ];
  if (stage >= 4)
    readout.push({
      label: "h / support",
      value: plan.h.toFixed(6) + " / " + plan.support.toFixed(6) + " m",
    });
  if (stage >= 5)
    readout.push({
      label: "Density / pressure hạt chọn",
      value: report.density[selected].toFixed(6) + " / " + report.pressure[selected].toFixed(6),
    });
  if (stage >= 6)
    readout.push({ label: "Acceleration hạt chọn", value: vector(report.acceleration[selected]) });
  if (stage >= 8)
    readout.push(
      { label: "Ứng viên đã duyệt", value: String(report.candidates) },
      {
        label: "Cell ID / offset / count",
        value: (() => {
          const id = Math.min(
            plan.cells - 1,
            Math.floor(p.position.x / plan.support) +
              plan.cellsAxis *
                (Math.floor(p.position.y / plan.support) +
                  plan.cellsAxis * Math.floor(p.position.z / plan.support)),
          );
          return id + " / " + report.csr.offsets[id] + " / " + report.csr.counts[id];
        })(),
      },
    );
  if (stage >= 11)
    readout.push({
      label: "Kế hoạch GPU — không cấp phát",
      value:
        largePlan.count.toLocaleString("en-US") +
        " hạt · " +
        (largePlan.residentBytes / 1024 ** 2).toFixed(2) +
        " MiB",
    });
  if (stage >= 12) readout.push({ label: "Oracle CSR CPU", value: validation });
  return (
    <>
      <p>
        Canvas là oracle CPU nhỏ, tối đa 216 hạt. Chương trình C++ tải về mới thực thi compute
        shader và giữ state trên GPU. Đổi camera hoặc bật lát cắt không đổi physics.
      </p>
      <div className="lab-controls">
        <label>
          Cảnh CPU{" "}
          <select value={side} onChange={(e) => reset(Number(e.target.value))}>
            <option value={4}>4³ = 64 hạt</option>
            <option value={6}>6³ = 216 hạt</option>
          </select>
        </label>
        <label>
          Hạt chọn{" "}
          <input
            type="range"
            min={0}
            max={particles.length - 1}
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          />
        </label>
        <label>
          Yaw{" "}
          <input
            type="range"
            min={-3.14}
            max={3.14}
            step={0.01}
            value={camera.yaw}
            onChange={(e) => setCamera((c) => ({ ...c, yaw: Number(e.target.value) }))}
          />
        </label>
        <label>
          Zoom{" "}
          <input
            type="range"
            min={0.4}
            max={2}
            step={0.1}
            value={camera.zoom}
            onChange={(e) => setCamera((c) => ({ ...c, zoom: Number(e.target.value) }))}
          />
        </label>
        <label>
          <input type="checkbox" checked={slice} onChange={(e) => setSlice(e.target.checked)} />
          Lát z qua hạt chọn
        </label>
        {stage >= 6 && (
          <>
            <label>
              Sound speed c{" "}
              <select
                value={settings.soundSpeed}
                onChange={(e) => change({ soundSpeed: Number(e.target.value) })}
              >
                {[8, 12, 20].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Artificial viscosity alpha{" "}
              <select
                value={settings.alpha}
                onChange={(e) => change({ alpha: Number(e.target.value) })}
              >
                {[0, 0.15, 0.3].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {stage >= 8 && (
          <label>
            Search{" "}
            <select
              value={settings.grid ? "grid" : "brute"}
              onChange={(e) => change({ grid: e.target.value === "grid" })}
            >
              <option value="grid">CSR 3D</option>
              <option value="brute">All-pairs oracle</option>
            </select>
          </label>
        )}
        {stage >= 11 && (
          <label>
            Kế hoạch GPU{" "}
            <select value={plannedSide} onChange={(e) => setPlannedSide(Number(e.target.value))}>
              {[8, 32, 48, 100].map((n) => (
                <option key={n} value={n}>
                  {n}³ hạt
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={stage < 10 || reducedMotion || !!error}
          onClick={() => setPaused((v) => !v)}
        >
          {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={stage < 7 || !!error}
          onClick={() => {
            stop();
            advance(1);
          }}
        >
          Tiến một tick
        </button>
        <button
          type="button"
          disabled={stage < 7 || !!error}
          onClick={() => {
            stop();
            advance(20);
          }}
        >
          Tiến 20 tick
        </button>
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
        {stage >= 12 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const grid = evaluate(plan, particles, { ...settings, grid: true }),
                brute = evaluate(plan, particles, { ...settings, grid: false });
              const mismatch = grid.lists.some(
                (list, i) => list.join(",") !== brute.lists[i].join(","),
              );
              const forceError = Math.max(
                0,
                ...grid.acceleration.map((a, i) => length(subtract(a, brute.acceleration[i]))),
              );
              setValidation(
                (!mismatch && Number.isFinite(forceError) && forceError < 1e-9 ? "PASS" : "FAIL") +
                  " · max acceleration error=" +
                  forceError.toExponential(3) +
                  " · không phải kiểm GPU",
              );
            }}
          >
            Kiểm oracle CPU
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="SPH3D CPU oracle"
        aria-describedby={helpId}
        style={{ touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={key}
      >
        Khối hạt trong hộp 3D; tọa độ và các số đo được ghi dưới Canvas.
      </canvas>
      <p id={helpId}>
        Kéo để orbit; trái/phải chọn hạt, lên/xuống đổi pitch. N tiến một tick từ bài 7, Space chạy
        từ bài 10. Bản CPU dùng double; bản GPU dùng float nên so với tolerance, không đòi khớp từng
        bit.
      </p>
      {stage >= 4 && (
        <p>
          Vòng tím là hình chiếu của support sphere 2h. Hai hạt nhìn gần nhau trên màn hình vẫn có
          thể cách xa theo z; bảng density dùng khoảng cách 3D, không dùng khoảng cách pixel.
        </p>
      )}
      {stage >= 10 && (
        <p>
          Mỗi frame tối đa bốn tick CPU, hiển thị tối đa 20 FPS. Đây là chế độ chạy theo ngân sách
          work, không bù wall-clock time; đọc thời gian mô phỏng riêng. Reduced motion tắt không tự
          chạy lại.
        </p>
      )}
      {error && <p role="alert">{error} · Đặt lại để tiếp tục.</p>}
      <LabReadout items={readout} />
    </>
  );
}
export default function SphWaterGpuLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(12, Number(mode?.match(/^sph3-(\d{1,2})$/)?.[1] ?? 12)));
  return <WaterExperiment key={stage} stage={stage} />;
}
