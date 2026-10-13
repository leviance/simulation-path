"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  advanceFrame,
  buildNeighbors,
  computeDensity,
  computePressure,
  defaultSettings,
  length,
  makeState,
  measure,
  pour,
  prepare,
  restDensity,
  spacing,
  step,
  subtract,
  validateWater,
  type Preset,
  type Settings,
  type Vec2,
} from "@/lib/labs/sph-water";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { drawWater, fromScreen } from "./sph-water/draw";
import { PairForceExperiment } from "./sph-water/pair-force";

function WaterExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    helpId = useId();
  const [initial] = useState(() => {
    const state = makeState("dam", stage);
    if (stage >= 4) computeDensity(state, buildNeighbors(state, stage >= 7));
    if (stage >= 5) computePressure(state, 12);
    return state;
  });
  const state = useRef(initial),
    [snapshot, setSnapshot] = useState(() => structuredClone(initial));
  const [preset, setPreset] = useState<Preset>("dam"),
    [settings, setSettings] = useState<Settings>({ ...defaultSettings });
  const [selected, setSelected] = useState(0),
    [nozzle, setNozzle] = useState<Vec2>({ x: 0.6, y: 0.7 });
  const [showWalls, setShowWalls] = useState(stage >= 4),
    [densityColor, setDensityColor] = useState(stage >= 4);
  const [paused, setPaused] = useState(true),
    [pouring, setPouring] = useState(false),
    [fps, setFps] = useState(60);
  const [dropped, setDropped] = useState(0),
    [error, setError] = useState(""),
    [report, setReport] = useState("Chưa chạy");
  const pointer = useRef<number | null>(null),
    accumulator = useRef(0);
  const emitter = useRef({ pouring, nozzle });
  useEffect(() => {
    emitter.current = { pouring, nozzle };
  }, [pouring, nozzle]);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
    setPouring(false);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    accumulator.current = 0;
    release();
  }, [release]);
  const publish = useCallback(
    (nextSettings = settings) => {
      if (stage >= 4)
        computeDensity(
          state.current,
          buildNeighbors(state.current, stage >= 7 && nextSettings.useGrid),
        );
      if (stage >= 5) computePressure(state.current, nextSettings.soundSpeed);
      setSnapshot(structuredClone(state.current));
    },
    [settings, stage],
  );
  const rebuild = (nextPreset: Preset) => {
    stop();
    state.current = makeState(nextPreset, stage);
    setPreset(nextPreset);
    setSelected(0);
    setDropped(0);
    setError("");
    setReport("Chưa chạy");
    publish();
  };
  const reset = () => {
    rebuild("dam");
    setSettings({ ...defaultSettings });
    setNozzle({ x: 0.6, y: 0.7 });
    setShowWalls(stage >= 4);
    setDensityColor(stage >= 4);
    setFps(60);
    publish(defaultSettings);
  };
  const changeSettings = (patch: Partial<Settings>) => {
    stop();
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);
    setReport("Chưa chạy");
    publish(nextSettings);
  };
  const singleStep = () => {
    if (stage < 2 || error) return;
    stop();
    try {
      step(state.current, settings, stage);
      publish();
    } catch (failure) {
      setError(String(failure));
    }
  };
  const emit = () => {
    if (stage >= 8) {
      pour(state.current, nozzle);
      publish();
    }
  };
  const toggle = () => {
    if (stage >= 9 && !reducedMotion && !error) {
      accumulator.current = 0;
      setPaused((value) => !value);
    }
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
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    if (paused || reducedMotion || stage < 9 || error) return;
    let frame = 0,
      last = performance.now();
    const animate = (time: number) => {
      if (time - last >= 1000 / fps - 0.5) {
        try {
          const plan = advanceFrame(
            state.current,
            settings,
            accumulator.current,
            (time - last) / 1000,
            emitter.current.pouring,
            emitter.current.nozzle,
          );
          last = time;
          accumulator.current = plan.remainder;
          setDropped((value) => value + plan.dropped);
          publish();
        } catch (failure) {
          stop();
          setError(String(failure));
          return;
        }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, error, fps, settings, publish, stop]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawWater(ctx, size, snapshot, selected, stage, showWalls, densityColor, nozzle);
  }, [size, snapshot, selected, stage, showWalls, densityColor, nozzle]);
  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) =>
    fromScreen(canvasPoint(event, event.currentTarget), size);
  const inside = (p: Vec2) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 0.8;
  const selectAt = (p: Vec2) => {
    let best = Infinity,
      index = 0;
    state.current.particles.forEach((value, i) => {
      const d = length(subtract(value.position, p));
      if (d < best) {
        best = d;
        index = i;
      }
    });
    setSelected(index);
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 3 || event.button !== 0 || pointer.current !== null) return;
    const p = pointerPosition(event);
    if (!inside(p)) return;
    event.currentTarget.focus();
    selectAt(p);
    if (stage >= 8) {
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setNozzle(p);
      setPouring(true);
      pour(state.current, p);
      publish();
    }
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== event.pointerId) return;
    const p = pointerPosition(event);
    if (!inside(p)) {
      release();
      return;
    }
    setNozzle(p);
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(event.key))
      event.preventDefault();
    if (event.repeat) return;
    if (event.key === " ") toggle();
    if (event.key.toLowerCase() === "n") singleStep();
    if (stage >= 8) {
      const p = { ...nozzle };
      if (event.key === "ArrowLeft") p.x -= spacing;
      if (event.key === "ArrowRight") p.x += spacing;
      if (event.key === "ArrowUp") p.y += spacing;
      if (event.key === "ArrowDown") p.y -= spacing;
      setNozzle({
        x: Math.max(spacing / 2, Math.min(1 - spacing / 2, p.x)),
        y: Math.max(spacing / 2, Math.min(0.8 - spacing / 2, p.y)),
      });
      if (event.key === "Enter") emit();
    } else if (stage >= 3 && snapshot.particles.length) {
      if (event.key === "ArrowRight") setSelected((selected + 1) % snapshot.particles.length);
      if (event.key === "ArrowLeft")
        setSelected((selected + snapshot.particles.length - 1) % snapshot.particles.length);
    }
  };
  const stats = measure(snapshot),
    inspected = snapshot.particles[selected];
  const neighbors = buildNeighbors(snapshot, stage >= 7 && settings.useGrid);
  let nextDt = "—";
  if (stage >= 9 && !error) {
    try {
      nextDt = prepare(structuredClone(snapshot), settings, stage).dt.toFixed(7);
    } catch {
      nextDt = "Cần đặt lại";
    }
  }
  const readout = [
    {
      label: "Số hạt / khối lượng",
      value: snapshot.particles.length + " / " + stats.mass.toFixed(4) + " kg",
    },
    { label: "Thời gian mô phỏng", value: snapshot.time.toFixed(6) + " s" },
    {
      label: "Hạt đang chọn",
      value: inspected
        ? selected +
          " · (" +
          inspected.position.x.toFixed(4) +
          "; " +
          inspected.position.y.toFixed(4) +
          ")"
        : "Không có hạt",
    },
  ];
  if (stage >= 4)
    readout.push(
      {
        label: "Density / rho0",
        value: inspected ? (inspected.density / restDensity).toFixed(6) : "—",
      },
      { label: "Nén lớn nhất", value: (100 * stats.maxCompression).toFixed(3) + "%" },
    );
  if (stage >= 5)
    readout.push({ label: "Pressure đang chọn", value: inspected?.pressure.toFixed(6) ?? "—" });
  if (stage >= 7)
    readout.push({
      label: "Ứng viên / hàng xóm",
      value: neighbors.candidates + " / " + (neighbors.lists[selected]?.length ?? 0),
    });
  if (stage >= 8)
    readout.push({
      label: "Đổ thành công / từ chối",
      value: snapshot.emitted + " / " + snapshot.rejected,
    });
  if (stage >= 9)
    readout.push({
      label: "Dt kế tiếp / thời gian bỏ qua",
      value: nextDt + " / " + dropped.toFixed(6) + " s",
    });
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu{" "}
          <select value={preset} onChange={(e) => rebuild(e.target.value as Preset)}>
            <option value="dam">Cột nước bên trái</option>
            <option value="pool">Lớp nước thấp</option>
            <option value="pair">Hai hạt tiến lại gần</option>
            <option value="empty">Bể trống</option>
          </select>
        </label>
        {stage >= 3 && (
          <label>
            Chọn hạt{" "}
            <input
              type="range"
              min={0}
              max={Math.max(0, snapshot.particles.length - 1)}
              value={selected}
              disabled={!snapshot.particles.length}
              onChange={(e) => setSelected(Number(e.target.value))}
            />
          </label>
        )}
        {stage >= 4 && (
          <>
            <label>
              <input
                type="checkbox"
                checked={showWalls}
                onChange={(e) => setShowWalls(e.target.checked)}
              />{" "}
              Mẫu tường
            </label>
            <label>
              <input
                type="checkbox"
                checked={densityColor}
                onChange={(e) => setDensityColor(e.target.checked)}
              />{" "}
              Màu theo density
            </label>
          </>
        )}
        {stage >= 5 && (
          <label>
            Sound speed{" "}
            <select
              value={settings.soundSpeed}
              onChange={(e) => changeSettings({ soundSpeed: Number(e.target.value) })}
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
            </select>
          </label>
        )}
        {stage >= 6 && (
          <label>
            Artificial viscosity α{" "}
            <select
              value={settings.alpha}
              onChange={(e) => changeSettings({ alpha: Number(e.target.value) })}
            >
              <option value={0}>0</option>
              <option value={0.15}>0,15</option>
              <option value={0.3}>0,3</option>
            </select>
          </label>
        )}
        {stage >= 7 && (
          <label>
            Tìm hàng xóm{" "}
            <select
              value={settings.useGrid ? "grid" : "brute"}
              onChange={(e) => changeSettings({ useGrid: e.target.value === "grid" })}
            >
              <option value="grid">Spatial grid</option>
              <option value="brute">All-pairs</option>
            </select>
          </label>
        )}
        {stage >= 8 && (
          <>
            <button type="button" onClick={emit} disabled={!!error}>
              Đổ một hạt
            </button>
            {stage >= 9 && (
              <label>
                <input
                  type="checkbox"
                  checked={pouring}
                  onChange={(e) => setPouring(e.target.checked)}
                />{" "}
                Đổ liên tục khi chạy
              </label>
            )}
          </>
        )}
        {stage >= 9 && (
          <label>
            FPS hiển thị{" "}
            <select
              value={fps}
              onChange={(e) => {
                stop();
                setFps(Number(e.target.value));
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </label>
        )}
        <button type="button" onClick={singleStep} disabled={stage < 2 || !!error}>
          Tiến một bước
        </button>
        <button type="button" onClick={toggle} disabled={stage < 9 || reducedMotion || !!error}>
          {paused ? "Chạy" : "Dừng"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 10 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const checks = validateWater();
              setReport(
                checks
                  .map(
                    (value) =>
                      (value.pass ? "PASS " : "FAIL ") +
                      value.label +
                      ": " +
                      value.value.toExponential(3),
                  )
                  .join(" · "),
              );
            }}
          >
            Kiểm chứng ca chuẩn
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng nước SPH 2D"
        aria-describedby={helpId}
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        Các hạt mang vị trí, vận tốc, density và pressure. Vòng tròn quanh hạt được chọn là miền
        kernel bán kính 2h.
      </canvas>
      <p id={helpId}>
        {stage >= 8
          ? "Chuột kéo vòi; phím mũi tên chuyển vòi, Enter đổ một hạt."
          : "Chọn hạt bằng chuột, thanh chọn hoặc phím trái/phải từ Bài 03."}{" "}
        N tiến một bước. Space chạy/dừng từ Bài 09. Mất focus sẽ dừng.{" "}
        {reducedMotion && "Reduced motion: chỉ cho tiến từng bước."}
      </p>
      <LabReadout items={readout} />
      {error && <p role="alert">Mô phỏng đã dừng: {error}. Đặt lại để bắt đầu lại.</p>}
      {stage >= 10 && (
        <p role="status">
          Ca chuẩn riêng: {report}. PASS không đảm bảo density luôn gần rho0 ở mọi cảnh.
        </p>
      )}
    </>
  );
}
export default function SphWaterLab({ mode }: { mode?: string }) {
  const match = mode?.match(/^sph-(\d+)$/),
    stage = match ? Math.max(1, Math.min(10, Number(match[1]))) : 10;
  return <WaterLesson key={stage} stage={stage} />;
}

function WaterLesson({ stage }: { stage: number }) {
  const [experiment, setExperiment] = useState("tank");
  return (
    <>
      {stage >= 5 && (
        <div className="lab-controls">
          <label>
            Thí nghiệm{" "}
            <select value={experiment} onChange={(e) => setExperiment(e.target.value)}>
              <option value="tank">Bể nước</option>
              <option value="pair">Cặp hạt độc lập</option>
            </select>
          </label>
        </div>
      )}
      {experiment === "pair" ? (
        <PairForceExperiment stage={stage} />
      ) : (
        <WaterExperiment stage={stage} />
      )}
    </>
  );
}
