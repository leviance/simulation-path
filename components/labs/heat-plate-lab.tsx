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
  applyBoundary,
  defaultSettings,
  diffuse,
  heatColor,
  makeField,
  measure,
  paintDisk,
  paintStroke,
  planSteps,
  pointerCell,
  ratios,
  sample,
  stable,
  validatePlate,
  viewport,
  type HeatSettings,
} from "@/lib/labs/heat-plate";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";

function PlateExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const helpId = useId();
  const [initial] = useState(() => makeField());
  const field = useRef(initial);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initial));
  const [settings, setSettings] = useState(defaultSettings);
  const [paused, setPaused] = useState(true);
  const [preset, setPreset] = useState(0);
  const [brush, setBrush] = useState(1);
  const [radius, setRadius] = useState(2);
  const [fps, setFps] = useState(60);
  const [cursor, setCursor] = useState({ x: 32, y: 24 });
  const [dropped, setDropped] = useState(0);
  const [report, setReport] = useState("Chưa chạy");
  const accumulator = useRef(0);
  const pointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const publish = useCallback(() => setSnapshot(structuredClone(field.current)), []);
  const release = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    previous.current = null;
    if (active !== null && canvasRef.current?.hasPointerCapture(active))
      canvasRef.current.releasePointerCapture(active);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    accumulator.current = 0;
    release();
  }, [release]);
  const reset = (nextPreset = preset) => {
    stop();
    field.current = makeField(nextPreset);
    if (stage >= 5) applyBoundary(field.current, settings);
    setPreset(nextPreset);
    setDropped(0);
    setReport("Chưa chạy");
    publish();
  };
  const changeSettings = (patch: Partial<HeatSettings>) => {
    stop();
    const next = { ...settings, ...patch };
    setSettings(next);
    if (stage >= 5) applyBoundary(field.current, next);
    publish();
  };
  const accepted = stable(settings, stage);
  const singleStep = () => {
    if (stage < 3 || !accepted) return;
    stop();
    diffuse(field.current, settings, stage);
    publish();
  };
  const toggle = () => {
    if (stage < 6 || reducedMotion || !accepted) return;
    accumulator.current = 0;
    setPaused((value) => !value);
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
    if (paused || reducedMotion || !accepted || stage < 6) return;
    let frame = 0,
      last = performance.now();
    const animate = (time: number) => {
      if (time - last >= 1000 / fps - 0.5) {
        const plan = planSteps(accumulator.current, (time - last) / 1000, settings.dt);
        last = time;
        accumulator.current = plan.remainder;
        for (let step = 0; step < plan.steps; step++) diffuse(field.current, settings, stage);
        if (plan.dropped > 0) setDropped((value) => value + plan.dropped);
        if (plan.steps > 0) publish();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, accepted, stage, settings, fps, publish]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const view = viewport(size.width, size.height);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 64; x++) {
        ctx.fillStyle = "rgb(" + heatColor(sample(snapshot, x, y)).join(",") + ")";
        ctx.fillRect(
          view.x + x * view.scale,
          view.y + y * view.scale,
          view.scale + 0.25,
          view.scale + 0.25,
        );
      }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      view.x + cursor.x * view.scale,
      view.y + cursor.y * view.scale,
      view.scale,
      view.scale,
    );
  }, [snapshot, size, cursor]);
  const paint = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    paintStroke(field.current, from.x, from.y, to.x, to.y, radius, brush);
    if (stage >= 5) applyBoundary(field.current, settings);
    publish();
  };
  const eventCell = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(event, event.currentTarget);
    return pointerCell(size.width, size.height, p.x, p.y);
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || pointer.current !== null) return;
    const cell = eventCell(event);
    if (!cell) return;
    event.currentTarget.focus();
    setCursor(cell);
    if (stage < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    previous.current = cell;
    paint(cell, cell);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const cell = eventCell(event);
    if (cell) setCursor(cell);
    if (pointer.current !== event.pointerId) return;
    if (!cell) {
      previous.current = null;
      return;
    }
    paint(previous.current ?? cell, cell);
    previous.current = cell;
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      let { x, y } = cursor;
      if (event.key === "ArrowLeft") x--;
      if (event.key === "ArrowRight") x++;
      if (event.key === "ArrowUp") y--;
      if (event.key === "ArrowDown") y++;
      setCursor({ x: Math.max(0, Math.min(63, x)), y: Math.max(0, Math.min(47, y)) });
    }
    if (event.key === "Enter" && stage >= 2) {
      event.preventDefault();
      paintDisk(field.current, cursor.x, cursor.y, radius, brush);
      if (stage >= 5) applyBoundary(field.current, settings);
      publish();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    if (event.key.toLowerCase() === "n" && !event.repeat) singleStep();
  };
  const stats = measure(snapshot),
    { rx, ry } = ratios(settings, stage),
    center = sample(snapshot, cursor.x, cursor.y);
  const readout = [
    {
      label: "Ô đang chọn",
      value: "(" + cursor.x + ", " + cursor.y + ") · index " + (cursor.y * 64 + cursor.x),
    },
    { label: "Nhiệt độ θ", value: center.toFixed(6) },
    { label: "Tick", value: String(snapshot.tick) },
  ];
  if (stage >= 3)
    readout.push(
      { label: "Hệ số rx / ry", value: rx.toFixed(3) + " / " + ry.toFixed(3) },
      {
        label: "Trái / phải",
        value:
          sample(snapshot, cursor.x - 1, cursor.y).toFixed(4) +
          " / " +
          sample(snapshot, cursor.x + 1, cursor.y).toFixed(4),
      },
    );
  if (stage >= 4)
    readout.push({
      label: "Trên / dưới",
      value:
        sample(snapshot, cursor.x, cursor.y - 1).toFixed(4) +
        " / " +
        sample(snapshot, cursor.x, cursor.y + 1).toFixed(4),
    });
  if (stage >= 6) readout.push({ label: "Thời gian bỏ qua", value: dropped.toFixed(3) + " s" });
  if (stage >= 7)
    readout.push(
      { label: "Min / max", value: stats.minimum.toFixed(6) + " / " + stats.maximum.toFixed(6) },
      { label: "Trung bình", value: stats.mean.toFixed(6) },
      { label: "Tổng θ", value: stats.sum.toFixed(9) },
    );
  if (stage >= 8) readout.push({ label: "Kiểm chứng", value: report });
  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu{" "}
          <select value={preset} onChange={(e) => reset(Number(e.target.value))}>
            <option value={0}>Vùng nóng ở giữa</option>
            {stage >= 8 && (
              <>
                <option value={1}>Đồng đều 0,4</option>
                <option value={2}>Ô nóng lạnh xen kẽ</option>
              </>
            )}
            <option value={3}>Tấm lạnh</option>
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Bút nhiệt{" "}
              <select value={brush} onChange={(e) => setBrush(Number(e.target.value))}>
                <option value={1}>Nóng: θ = 1</option>
                <option value={0}>Lạnh: θ = 0</option>
              </select>
            </label>
            <label>
              Bán kính: {radius} ô{" "}
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </label>
          </>
        )}
        {stage >= 5 && (
          <label>
            Điều kiện biên{" "}
            <select
              value={settings.boundary}
              onChange={(e) =>
                changeSettings({ boundary: e.target.value as HeatSettings["boundary"] })
              }
            >
              <option value="insulated">Cách nhiệt</option>
              <option value="cold">Giữ vành ngoài ở 0</option>
            </select>
          </label>
        )}
        {stage >= 6 && (
          <>
            <label>
              Hệ số khuếch tán α{" "}
              <select
                value={settings.diffusivity}
                onChange={(e) => changeSettings({ diffusivity: Number(e.target.value) })}
              >
                <option value={3}>3</option>
                <option value={6}>6</option>
                <option value={12}>12</option>
              </select>
            </label>
            <label>
              Bước thời gian{" "}
              <select
                value={settings.dt}
                onChange={(e) => changeSettings({ dt: Number(e.target.value) })}
              >
                <option value={1 / 30}>1/30 s</option>
                <option value={1 / 60}>1/60 s</option>
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
        <button type="button" disabled={stage < 6 || reducedMotion || !accepted} onClick={toggle}>
          {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button type="button" disabled={stage < 3 || !accepted} onClick={singleStep}>
          Tiến một bước
        </button>
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
        {stage >= 8 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const result = validatePlate();
              setReport(
                "Tổng θ: " +
                  (result.conserved ? "PASS" : "FAIL") +
                  " · Min/max: " +
                  (result.bounded ? "PASS" : "FAIL") +
                  " · Biên lạnh: " +
                  (result.coldEdges ? "PASS" : "FAIL") +
                  " · Sai số tổng lớn nhất: " +
                  result.maxSumError.toExponential(2),
              );
            }}
          >
            Kiểm chứng tấm chuẩn
          </button>
        )}
      </div>
      {!accepted && (
        <p role="status" className="lab-note">
          Không chạy: rx + ry = {(rx + ry).toFixed(3)} vượt 0,5. Giảm α hoặc giảm dt; solver không
          kẹp nhiệt độ để che lỗi.
        </p>
      )}
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Tấm kim loại dẫn nhiệt"
        aria-describedby={helpId}
        style={{ touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={keyDown}
      >
        Lưới nhiệt độ 64 × 48: xanh đậm là θ = 0, vàng là θ = 1. Bảng số bên dưới cho biết giá trị
        thật.
      </canvas>
      <p id={helpId} className="lab-note">
        Thang màu cố định: xanh đậm 0 → vàng 1. Mũi tên chọn ô; Enter đặt nhiệt độ từ bài 2; N tiến
        một bước từ bài 3; Space chạy/dừng từ bài 6. Brush chỉ đặt nhiệt độ khi click/rê, không phải
        nguồn giữ nóng liên tục.
      </p>
      {stage === 3 && (
        <p className="lab-note">
          Bài 3 chỉ truyền nhiệt theo hàng ngang; các hàng chưa trao đổi nhiệt với nhau.
        </p>
      )}
      {stage < 3 && (
        <p className="lab-note">Chưa chạy solver: nhiệt độ chỉ đổi khi đặt bút hoặc chọn cảnh.</p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Biên cách nhiệt không trao đổi qua mặt ngoài. Biên lạnh cố định cả vành ô ngoài ở 0, kể cả
          khi tô lên vành.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: dùng nút từng bước thay cho chạy liên tục.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Tổng θ chỉ được kỳ vọng giữ nguyên khi biên cách nhiệt và không vẽ. Đó là đại lượng tỉ lệ
          với nhiệt lượng, chưa phải Joule.
        </p>
      )}
      <LabReadout items={readout} />
    </>
  );
}
export default function HeatPlateLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(8, Number(mode?.match(/^heat-(\d)$/)?.[1] ?? 8)));
  return <PlateExperiment key={stage} stage={stage} />;
}
