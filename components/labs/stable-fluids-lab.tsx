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
  addImpulse,
  beginPressure,
  computeDivergence,
  defaultSettings,
  dt,
  fromScreen,
  initialPreset,
  jacobiIteration,
  makeGrid,
  measure,
  paintDisk,
  paintStroke,
  planSteps,
  pressureResidual,
  rms,
  step,
  validateFluid,
  type Layer,
  type Preset,
  type Settings,
  type Vec2,
  type JacobiTrace,
} from "@/lib/labs/stable-fluids";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { drawFluid } from "./stable-fluids/draw";
import { JacobiReadout } from "./stable-fluids/jacobi-readout";
function initialLayer(stage: number): Layer {
  if (stage === 5) return "pressure";
  if (stage === 4 || stage === 6) return "divergence";
  return "smoke";
}
function FluidExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    helpId = useId();
  const [initial] = useState(() => {
    const value = makeGrid(24, initialPreset(stage), stage);
    if (stage >= 4) computeDivergence(value);
    return value;
  });
  const grid = useRef(initial),
    [snapshot, setSnapshot] = useState(() => structuredClone(initial));
  const [preset, setPreset] = useState<Preset>(() => initialPreset(stage)),
    [resolution, setResolution] = useState(24);
  const [settings, setSettings] = useState<Settings>(() => ({ ...defaultSettings }));
  const [jacobiTrace, setJacobiTrace] = useState<JacobiTrace | null>(null);
  const [layer, setLayer] = useState<Layer>(() => initialLayer(stage)),
    [arrows, setArrows] = useState(true);
  const [cursor, setCursor] = useState({ x: 12, y: 12 }),
    [radius, setRadius] = useState(2),
    [brush, setBrush] = useState(1),
    [stir, setStir] = useState(true);
  const [paused, setPaused] = useState(true),
    [fps, setFps] = useState(30),
    [dropped, setDropped] = useState(0),
    [report, setReport] = useState("Chưa chạy");
  const accumulator = useRef(0),
    pointer = useRef<number | null>(null),
    previous = useRef<Vec2 | null>(null);
  const publish = useCallback(() => {
    if (stage >= 4) computeDivergence(grid.current);
    setSnapshot(structuredClone(grid.current));
  }, [stage]);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    previous.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    accumulator.current = 0;
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const rebuild = (n: number, nextPreset: Preset) => {
    stop();
    grid.current = makeGrid(n, nextPreset, stage);
    setResolution(n);
    setPreset(nextPreset);
    setCursor(nextPreset === "dipole" ? { x: n / 2 - 1, y: n / 2 - 1 } : { x: n / 2, y: n / 2 });
    setJacobiTrace(null);
    setDropped(0);
    setReport("Chưa chạy");
    publish();
  };
  const reset = () => {
    rebuild(24, initialPreset(stage));
    setSettings({ ...defaultSettings });
    setLayer(initialLayer(stage));
    setArrows(true);
    setRadius(2);
    setBrush(1);
    setStir(true);
    setFps(30);
  };
  const changeSettings = (patch: Partial<Settings>) => {
    stop();
    setSettings((old) => ({ ...old, ...patch }));
    setReport("Chưa chạy");
  };
  const singleStep = () => {
    if (stage < 3) return;
    stop();
    setJacobiTrace(null);
    step(grid.current, settings, stage);
    publish();
  };
  const toggle = () => {
    if (stage < 10 || reducedMotion) return;
    accumulator.current = 0;
    setPaused((value) => !value);
  };
  const jacobiStep = () => {
    if (stage < 5 || (grid.current.pressureReady && grid.current.pressureIterations >= 160)) return;
    stop();
    if (!grid.current.pressureReady) beginPressure(grid.current);
    setJacobiTrace(jacobiIteration(grid.current, cursor.x, cursor.y));
    publish();
  };
  const restartPressure = () => {
    stop();
    beginPressure(grid.current);
    setJacobiTrace(null);
    publish();
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
    if (paused || reducedMotion || stage < 10) return;
    let frame = 0,
      last = performance.now();
    const animate = (time: number) => {
      if (time - last >= 1000 / fps - 0.5) {
        const plan = planSteps(accumulator.current, (time - last) / 1000);
        last = time;
        accumulator.current = plan.remainder;
        for (let i = 0; i < plan.steps; i++) step(grid.current, settings, stage);
        if (plan.dropped > 0) setDropped((value) => value + plan.dropped);
        if (plan.steps > 0) publish();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, fps, settings, publish]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawFluid(ctx, size, snapshot, layer, arrows, cursor, stage);
  }, [size, snapshot, layer, arrows, cursor, stage]);
  const cursorPoint = () => ({
    x: (cursor.x + 0.5) * grid.current.h,
    y: (cursor.y + 0.5) * grid.current.h,
  });
  const impulse = (delta: Vec2) => {
    if (stage < 9) return;
    addImpulse(grid.current, cursorPoint(), delta);
    publish();
  };
  const eventWorld = (event: PointerEvent<HTMLCanvasElement>) =>
    fromScreen(size.width, size.height, canvasPoint(event, event.currentTarget));
  const selectPoint = (p: Vec2) =>
    setCursor({
      x: Math.min(grid.current.n - 1, Math.floor(p.x * grid.current.n)),
      y: Math.min(grid.current.n - 1, Math.floor(p.y * grid.current.n)),
    });
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || event.button !== 0 || pointer.current !== null) return;
    const p = eventWorld(event);
    if (!p) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    previous.current = p;
    selectPoint(p);
    paintDisk(grid.current, p, radius, brush);
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2) return;
    const p = eventWorld(event);
    if (p) selectPoint(p);
    if (pointer.current !== event.pointerId) return;
    if (!p) {
      previous.current = null;
      return;
    }
    if (previous.current) {
      paintStroke(grid.current, previous.current, p, radius, brush);
      if (stage >= 9 && stir)
        addImpulse(grid.current, p, { x: p.x - previous.current.x, y: p.y - previous.current.y });
    } else paintDisk(grid.current, p, radius, brush);
    previous.current = p;
    publish();
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (stage >= 2 && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      let { x, y } = cursor;
      if (event.key === "ArrowLeft") x--;
      if (event.key === "ArrowRight") x++;
      if (event.key === "ArrowUp") y++;
      if (event.key === "ArrowDown") y--;
      setCursor({
        x: Math.max(0, Math.min(snapshot.n - 1, x)),
        y: Math.max(0, Math.min(snapshot.n - 1, y)),
      });
    }
    if (event.key === "Enter" && stage >= 2) {
      event.preventDefault();
      paintDisk(grid.current, cursorPoint(), radius, brush);
      publish();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    if (event.key.toLowerCase() === "n" && !event.repeat) singleStep();
    if (event.key.toLowerCase() === "j" && !event.repeat) jacobiStep();
    if (stage >= 9 && !event.repeat) {
      if (event.key.toLowerCase() === "w") impulse({ x: 0, y: 0.05 });
      if (event.key.toLowerCase() === "s") impulse({ x: 0, y: -0.05 });
      if (event.key.toLowerCase() === "a") impulse({ x: -0.05, y: 0 });
      if (event.key.toLowerCase() === "d") impulse({ x: 0.05, y: 0 });
    }
  };
  const n = snapshot.n,
    i = cursor.y * n + cursor.x,
    stats = measure(snapshot);
  const readout = [
    { label: "Ô đang chọn", value: "(" + cursor.x + "; " + cursor.y + ") · index " + i },
    { label: "Concentration", value: snapshot.density[i].toFixed(6) },
    {
      label: "Min / max / tổng scalar",
      value:
        stats.minimum.toFixed(4) + " / " + stats.maximum.toFixed(4) + " / " + stats.sum.toFixed(6),
    },
  ];
  if (stage >= 3) readout.push({ label: "Tick", value: String(snapshot.tick) });
  if (stage >= 4)
    readout.push(
      {
        label: "u trái / phải",
        value:
          snapshot.u[cursor.y * (n + 1) + cursor.x].toFixed(5) +
          " / " +
          snapshot.u[cursor.y * (n + 1) + cursor.x + 1].toFixed(5),
      },
      {
        label: "v dưới / trên",
        value:
          snapshot.v[cursor.y * n + cursor.x].toFixed(5) +
          " / " +
          snapshot.v[(cursor.y + 1) * n + cursor.x].toFixed(5),
      },
      {
        label: "Divergence ô / RMS",
        value: snapshot.div[i].toFixed(6) + " / " + rms(snapshot.div).toExponential(3),
      },
      { label: "Chỉ số Courant", value: stats.courant.toFixed(4) },
    );
  if (stage >= 5)
    readout.push({
      label: "Pressure ô / residual RMS",
      value: snapshot.pressure[i].toFixed(6) + " / " + pressureResidual(snapshot).toExponential(3),
    });
  if (stage >= 6)
    readout.push({
      label: "Lần projection gần nhất: trước / sau",
      value: snapshot.projection
        ? snapshot.projection.before.toExponential(3) +
          " / " +
          snapshot.projection.after.toExponential(3)
        : "Chưa có",
    });
  if (stage >= 8)
    readout.push({ label: "Chỉ số năng lượng vận tốc", value: stats.energy.toExponential(4) });
  if (stage >= 10)
    readout.push({
      label: "Thời gian mô phỏng / bỏ qua",
      value: (snapshot.tick * dt).toFixed(3) + " s / " + dropped.toFixed(3) + " s",
    });
  if (stage >= 11) readout.push({ label: "Ca chuẩn riêng", value: report });
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu{" "}
          <select
            value={preset}
            disabled={stage < 2}
            onChange={(e) => {
              const nextPreset = e.target.value as Preset;
              rebuild(nextPreset === "dipole" ? 8 : resolution === 8 ? 24 : resolution, nextPreset);
            }}
          >
            <option value="plume">Đám khói thấp</option>
            <option value="compressing">Nén và giãn</option>
            <option value="vortex">Dòng xoáy</option>
            <option value="empty">Trống</option>
            {stage >= 5 && <option value="dipole">Ca Jacobi 8×8</option>}
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Bút{" "}
              <select value={brush} onChange={(e) => setBrush(Number(e.target.value))}>
                <option value={1}>Đặt khói: 1</option>
                <option value={0}>Xóa: 0</option>
              </select>
            </label>
            <label>
              Bán kính: {radius} ô{" "}
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </label>
          </>
        )}
        {stage >= 4 && (
          <>
            <label>
              Lớp hiển thị{" "}
              <select value={layer} onChange={(e) => setLayer(e.target.value as Layer)}>
                <option value="smoke">Khói</option>
                {stage >= 5 && <option value="pressure">Pressure</option>}
                <option value="divergence">Divergence</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={arrows}
                onChange={(e) => setArrows(e.target.checked)}
              />{" "}
              Vector vận tốc
            </label>
          </>
        )}
        {stage >= 5 && (
          <label>
            Vòng lặp pressure{" "}
            <select
              value={settings.iterations}
              onChange={(e) => changeSettings({ iterations: Number(e.target.value) })}
            >
              <option value={40}>40</option>
              <option value={80}>80</option>
              <option value={160}>160</option>
            </select>
          </label>
        )}
        {stage >= 8 && (
          <label>
            Độ nhớt ν{" "}
            <select
              value={settings.viscosity}
              onChange={(e) => changeSettings({ viscosity: Number(e.target.value) })}
            >
              <option value={0}>0</option>
              <option value={0.0005}>0,0005</option>
              <option value={0.003}>0,003</option>
            </select>
          </label>
        )}
        {stage >= 9 && (
          <>
            <label>
              Lực nổi{" "}
              <select
                value={settings.buoyancy}
                onChange={(e) => changeSettings({ buoyancy: Number(e.target.value) })}
              >
                <option value={0}>0</option>
                <option value={0.8}>0,8</option>
                <option value={1.6}>1,6</option>
              </select>
            </label>
            <label>
              <input type="checkbox" checked={stir} onChange={(e) => setStir(e.target.checked)} />{" "}
              Khuấy khi kéo
            </label>
            <button type="button" onClick={() => impulse({ x: -0.05, y: 0 })}>
              Khuấy trái
            </button>
            <button type="button" onClick={() => impulse({ x: 0.05, y: 0 })}>
              Khuấy phải
            </button>
            <button type="button" onClick={() => impulse({ x: 0, y: 0.05 })}>
              Khuấy lên
            </button>
            <button type="button" onClick={() => impulse({ x: 0, y: -0.05 })}>
              Khuấy xuống
            </button>
          </>
        )}
        {stage >= 10 && (
          <>
            <label>
              Độ phân giải{" "}
              <select
                value={resolution}
                disabled={preset === "dipole"}
                onChange={(e) => rebuild(Number(e.target.value), preset)}
              >
                {resolution === 8 && <option value={8}>8 × 8 · ca Jacobi</option>}
                <option value={24}>24 × 24</option>
                <option value={32}>32 × 32</option>
              </select>
            </label>
            <label>
              FPS hiển thị tối đa{" "}
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
          </>
        )}
        <button type="button" disabled={stage < 10 || reducedMotion} onClick={toggle}>
          {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button type="button" disabled={stage < 3} onClick={singleStep}>
          Tiến một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 5 && (
          <>
            <button
              type="button"
              disabled={snapshot.pressureReady && snapshot.pressureIterations >= 160}
              onClick={jacobiStep}
            >
              Tiến một vòng Jacobi
            </button>
            <button type="button" onClick={restartPressure}>
              Bắt đầu lại pressure
            </button>
          </>
        )}
        {stage >= 11 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const result = validateFluid();
              setReport(
                (result.passed ? "PASS" : "FAIL") +
                  " · N=16, 160 vòng · Div: " +
                  result.report.before.toExponential(2) +
                  " → " +
                  result.report.after.toExponential(2) +
                  " · Scalar hằng: " +
                  result.constantError.toExponential(2) +
                  " · Độ nhớt làm giảm năng lượng: " +
                  (result.afterEnergy < result.beforeEnergy ? "PASS" : "FAIL"),
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
        aria-label="Mô phỏng khói Stable Fluids"
        aria-describedby={helpId}
        style={{ touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={keyDown}
      >
        Khói được lưu bằng scalar trong hộp vuông. Bảng số đọc concentration, vận tốc trên bốn cạnh,
        pressure và divergence ở ô được chọn.
      </canvas>
      <p id={helpId} className="lab-note">
        World y hướng lên. Mũi tên chọn ô; Enter đặt bút từ bài 2; N tiến 1/60 s từ bài 3; WASD
        khuấy từ bài 9; Space chạy/dừng từ bài 10. Bút đặt khói khi click/rê, không tự phát khói khi
        giữ chuột đứng yên.
      </p>
      {stage === 3 && (
        <p className="lab-note">
          Bài 3 dùng vận tốc cho trước (0,2; 0), chỉ để học advection scalar. Biên sampler lặp mẫu
          sát mép; chưa có velocity solver cho hộp kín.
        </p>
      )}
      {stage >= 4 && (
        <p className="lab-note">
          Lưới MAC: chấm xanh là u trên cạnh dọc, chấm vàng là v trên cạnh ngang. Hộp kín chặn vận
          tốc pháp tuyến, cho trượt tiếp tuyến. Khói không phải density của toàn bộ khí.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Màu pressure cố định ±4, divergence ±2; xanh âm, cam dương. Inspector đọc số chưa bão hòa.
          Weighted Jacobi có ngân sách hữu hạn, residual khác 0 nghĩa pressure chưa giải chính xác.
          J chỉ cập nhật pressure một vòng, không đổi velocity, scalar hoặc tick. “Bắt đầu lại
          pressure” lập lại RHS từ velocity hiện có; giới hạn 160 vòng mỗi lần giải.
        </p>
      )}
      {stage >= 6 && (
        <p className="lab-note">
          Ở đây RMS(div sau projection) ≈ dt × residual RMS. Ca chuẩn riêng đạt không thay thế số đo
          của cấu hình hiện tại.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Semi-Lagrangian giữ giá trị scalar trong khoảng mẫu nhưng có diffusion số và không bảo
          toàn tổng scalar chính xác. Chỉ số Courant càng lớn, backtrace càng dài; ổn định không
          đồng nghĩa chính xác.
        </p>
      )}
      {stage >= 10 && (
        <p className="lab-note">
          Pipeline: lực → độ nhớt → project → advect velocity → project → advect khói. Tối đa bốn
          tick/frame; đổi lưới dựng lại cảnh, đổi tham số chỉ dừng để bạn đo tiếp.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: dùng nút từng bước thay cho chạy liên tục.
        </p>
      )}
      <LabReadout items={readout} />
      {stage >= 5 && (
        <JacobiReadout grid={snapshot} x={cursor.x} y={cursor.y} trace={jacobiTrace} />
      )}
    </>
  );
}
export default function StableFluidsLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(11, Number(mode?.match(/^fluid-(\d{1,2})$/)?.[1] ?? 11)));
  return <FluidExperiment key={stage} stage={stage} />;
}
