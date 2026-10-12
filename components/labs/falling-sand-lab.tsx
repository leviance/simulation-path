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
  Cell,
  cellAt,
  checksum,
  countMaterials,
  gridViewport,
  makeScene,
  paintDisk,
  paintStroke,
  planSteps,
  pointerCell,
  stepGrid,
  validateScene,
  type Material,
} from "@/lib/labs/falling-sand";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
} from "./lab-shared";

const colors = ["#0b1020", "#77849d", "#e5c07b", "#61afef"];
const names = ["Trống", "Tường", "Cát", "Nước"];

function SandExperiment({ stage }: { stage: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const helpId = useId();
  const [initial] = useState(() => makeScene(stage));
  const gridRef = useRef(initial);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initial));
  const [paused, setPaused] = useState(true);
  const [material, setMaterial] = useState<Material>(Cell.Sand);
  const [radius, setRadius] = useState(2);
  const [preset, setPreset] = useState(0);
  const [cursor, setCursor] = useState({ x: 48, y: 10 });
  const [fps, setFps] = useState(60);
  const [dropped, setDropped] = useState(0);
  const [report, setReport] = useState("Chưa chạy");
  const pointer = useRef<number | null>(null);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const accumulator = useRef(0);

  const publish = useCallback(() => setSnapshot(structuredClone(gridRef.current)), []);
  const reset = (nextPreset = preset) => {
    const activePointer = pointer.current;
    if (activePointer !== null && canvasRef.current?.hasPointerCapture(activePointer)) {
      canvasRef.current.releasePointerCapture(activePointer);
    }
    gridRef.current = makeScene(stage, nextPreset);
    accumulator.current = 0;
    pointer.current = null;
    previous.current = null;
    setPreset(nextPreset);
    setPaused(true);
    setDropped(0);
    setReport("Chưa chạy");
    publish();
  };
  const singleStep = () => {
    if (stage < 3) return;
    setPaused(true);
    accumulator.current = 0;
    stepGrid(gridRef.current, stage);
    publish();
  };
  const toggleRun = () => {
    if (stage < 6 || reducedMotion) return;
    accumulator.current = 0;
    setPaused((current) => !current);
  };

  useEffect(() => {
    const loseFocus = () => {
      setPaused(true);
      accumulator.current = 0;
      const activePointer = pointer.current;
      if (activePointer !== null && canvasRef.current?.hasPointerCapture(activePointer)) {
        canvasRef.current.releasePointerCapture(activePointer);
      }
      pointer.current = null;
      previous.current = null;
    };
    const visibility = () => {
      if (document.hidden) loseFocus();
    };
    window.addEventListener("blur", loseFocus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", loseFocus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || stage < 6) return;
    let frame = 0;
    let last = performance.now();
    const animate = (time: number) => {
      if (time - last >= 1000 / fps - 0.5) {
        const plan = planSteps(accumulator.current, (time - last) / 1000);
        last = time;
        accumulator.current = plan.remainder;
        for (let step = 0; step < plan.steps; step += 1) stepGrid(gridRef.current, stage);
        if (plan.dropped > 0) setDropped((current) => current + plan.dropped);
        if (plan.steps > 0) publish();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reducedMotion, stage, fps, publish]);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    setupCanvas(context, size);
    const view = gridViewport(size.width, size.height);
    for (let y = 0; y < snapshot.height; y += 1) {
      for (let x = 0; x < snapshot.width; x += 1) {
        const value = cellAt(snapshot, x, y);
        if (value === Cell.Empty) continue;
        context.fillStyle = colors[value];
        context.fillRect(view.x + x * view.scale, view.y + y * view.scale, view.scale, view.scale);
      }
    }
    context.strokeStyle = "#63708d";
    context.lineWidth = 1;
    context.strokeRect(view.x, view.y, snapshot.width * view.scale, snapshot.height * view.scale);
    context.strokeStyle = "#fff";
    context.strokeRect(
      view.x + cursor.x * view.scale,
      view.y + cursor.y * view.scale,
      view.scale,
      view.scale,
    );
  }, [snapshot, size, cursor]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    return pointerCell(size.width, size.height, point.x, point.y);
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || pointer.current !== null) return;
    const cell = pointFromEvent(event);
    if (!cell) return;
    event.currentTarget.focus();
    setCursor(cell);
    if (stage < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    previous.current = cell;
    paintDisk(gridRef.current, cell.x, cell.y, radius, material);
    publish();
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const cell = pointFromEvent(event);
    if (cell) setCursor(cell);
    if (pointer.current !== event.pointerId) return;
    if (!cell) {
      previous.current = null;
      return;
    }
    const origin = previous.current ?? cell;
    paintStroke(gridRef.current, origin.x, origin.y, cell.x, cell.y, radius, material);
    previous.current = cell;
    publish();
  };
  const endPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    previous.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      let { x, y } = cursor;
      if (event.key === "ArrowLeft") x -= 1;
      if (event.key === "ArrowRight") x += 1;
      if (event.key === "ArrowUp") y -= 1;
      if (event.key === "ArrowDown") y += 1;
      setCursor({ x: Math.max(0, Math.min(95, x)), y: Math.max(0, Math.min(63, y)) });
    }
    if (event.key === "Enter" && stage >= 2) {
      event.preventDefault();
      paintDisk(gridRef.current, cursor.x, cursor.y, radius, material);
      publish();
    }
    if (event.key === " ") {
      event.preventDefault();
      if (!event.repeat) toggleRun();
    }
    if (event.key.toLowerCase() === "n" && !event.repeat) singleStep();
  };
  const counts = countMaterials(snapshot);
  const index = cursor.y * snapshot.width + cursor.x;
  const readout = [
    { label: "Lưới", value: "96 × 64 ô" },
    {
      label: "Ô đang chọn",
      value: `(${cursor.x}, ${cursor.y}) · index ${index} · ${names[cellAt(snapshot, cursor.x, cursor.y)]}`,
    },
    { label: "Số ô cát / nước", value: `${counts[Cell.Sand]} / ${counts[Cell.Water]}` },
    { label: "Tick", value: String(snapshot.tick) },
  ];
  if (stage >= 6) readout.push({ label: "Thời gian bỏ qua", value: `${dropped.toFixed(3)} s` });
  if (stage >= 7) {
    readout.push({ label: "Checksum", value: String(checksum(snapshot)) });
    readout.push({ label: "Kiểm chứng 120 tick", value: report });
  }

  return (
    <>
      <div className="lab-controls">
        <label>
          Cảnh mẫu{" "}
          <select value={preset} onChange={(event) => reset(Number(event.target.value))}>
            <option value={0}>Cát trên bệ</option>
            {stage >= 7 && <option value={1}>Phễu cát</option>}
            <option value={2}>Lưới trống</option>
          </select>
        </label>
        {stage >= 2 && (
          <>
            <label>
              Vật liệu{" "}
              <select
                value={material}
                onChange={(event) => setMaterial(Number(event.target.value) as Material)}
              >
                <option value={Cell.Sand}>Cát</option>
                <option value={Cell.Wall}>Tường</option>
                {stage >= 5 && <option value={Cell.Water}>Nước</option>}
                <option value={Cell.Empty}>Tẩy</option>
              </select>
            </label>
            <label>
              Bán kính bút: {radius} ô{" "}
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
              />
            </label>
          </>
        )}
        {stage >= 6 && (
          <label>
            FPS hiển thị tối đa{" "}
            <select
              value={fps}
              onChange={(event) => {
                accumulator.current = 0;
                setFps(Number(event.target.value));
              }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </label>
        )}
        <button type="button" disabled={stage < 6 || reducedMotion} onClick={toggleRun}>
          {paused || reducedMotion ? "Chạy" : "Tạm dừng"}
        </button>
        <button type="button" disabled={stage < 3} onClick={singleStep}>
          Tiến một tick
        </button>
        <button type="button" onClick={() => reset()}>
          Đặt lại
        </button>
        {stage >= 7 && (
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              accumulator.current = 0;
              const result = validateScene();
              setReport(
                `Bảo toàn: ${result.conserved ? "PASS" : "FAIL"} · Lặp lại: ${result.deterministic ? "PASS" : "FAIL"} · Tường: ${result.wallsFixed ? "PASS" : "FAIL"}`,
              );
            }}
          >
            Kiểm chứng cảnh chuẩn
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Hộp cát ô lưới"
        aria-describedby={helpId}
        style={{ touchAction: "none" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onKeyDown={keyDown}
      >
        Lưới 96 × 64: vàng là cát, xanh là nước, xám là tường. Dùng bộ điều khiển và bảng số bên
        dưới để theo dõi.
      </canvas>
      <p id={helpId} className="lab-note">
        Mũi tên chọn ô; Enter đặt vật liệu; N tiến một tick; Space chạy/dừng từ bài 6. Kéo chuột để
        vẽ. Pause chỉ dừng mô phỏng, vẫn cho phép sửa lưới.
      </p>
      {stage < 3 && (
        <p className="lab-note">
          Bài này chỉ vẽ lưới{stage === 2 ? " và đặt vật liệu" : ""}; chưa cập nhật chuyển động.
        </p>
      )}
      {stage >= 3 && stage < 6 && (
        <p className="lab-note">
          Hãy bấm “Tiến một tick” để theo dõi từng lần cập nhật. Chế độ chạy liên tục được thêm ở
          bài 6.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">Reduced motion đang bật: mô phỏng chỉ tiến bằng nút từng tick.</p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Nước ở đây chỉ rơi và lan sang ô trống; chưa có áp suất, vận tốc hay bảo toàn động lượng.
          Chỉ xét bảo toàn số ô khi không vẽ hoặc tẩy.
        </p>
      )}
      <LabReadout items={readout} />
    </>
  );
}

export default function FallingSandLab({ mode }: { mode?: string }) {
  const parsed = Number(mode?.match(/^sand-(\d)$/)?.[1] ?? 7);
  const stage = Math.max(1, Math.min(7, parsed));
  return <SandExperiment key={stage} stage={stage} />;
}
