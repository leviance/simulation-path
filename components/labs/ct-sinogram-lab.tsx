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
  acquireOne,
  advance,
  audit,
  chordLength,
  defaultSettings,
  detectorRay,
  makeScan,
  makeScene,
  project,
  viewAngle,
  type Settings,
} from "@/lib/labs/ct-sinogram";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { draw, pickCell } from "./ct-sinogram/draw";

function initialScan() {
  const scan = makeScan(defaultSettings);
  acquireOne(scan);
  return scan;
}
function Experiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvas);
  const reduced = useReducedMotion();
  const help = useId();
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [selection, setSelection] = useState({ row: 0, column: 64 });
  const [paused, setPaused] = useState(true);
  const [version, setVersion] = useState(0);
  const [displayRange, setDisplayRange] = useState(2);
  const [invert, setInvert] = useState(false);
  const [trace, setTrace] = useState(false);
  const [auditResult, setAuditResult] = useState("Chưa kiểm");
  const [error, setError] = useState("");
  const scan = useRef<ReturnType<typeof makeScan> | null>(null);
  if (!scan.current) scan.current = initialScan();
  const pointer = useRef<number | null>(null);
  const running = useRef(false);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    running.current = false;
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
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
  }, [release, stop]);
  const scene = useMemo(() => makeScene(settings.preset), [settings.preset]);
  const angle = viewAngle(selection.row, settings.views);
  const preview = useMemo(
    () => (stage >= 4 ? project(angle, scene, settings.strength) : []),
    [angle, scene, settings.strength, stage],
  );
  const beam = detectorRay(angle, (selection.column + 0.5) / 128);
  const measurement = preview[selection.column];
  const replace = (next: Settings) => {
    stop();
    scan.current = makeScan(next);
    setSettings(next);
    setSelection((s) => ({ ...s, row: 0 }));
    setVersion((v) => v + 1);
  };
  const reset = () => {
    replace({ ...defaultSettings });
    setSelection({ row: 0, column: 64 });
    setDisplayRange(2);
    setInvert(false);
    setTrace(false);
    setAuditResult("Chưa kiểm");
    setError("");
  };
  const step = () => {
    stop();
    if (scan.current && acquireOne(scan.current)) {
      const row = scan.current.acquired - 1;
      setSelection((s) => ({ ...s, row }));
      setVersion((v) => v + 1);
    }
  };
  useEffect(() => {
    if (paused || reduced || stage < 6) return;
    let frame = 0;
    running.current = true;
    const tick = () => {
      if (!running.current || !scan.current) return;
      try {
        advance(scan.current, 2);
        const row = Math.max(0, scan.current.acquired - 1);
        setSelection((s) => ({ ...s, row }));
        setVersion((v) => v + 1);
        if (scan.current.acquired === scan.current.settings.views) {
          stop();
          return;
        }
        frame = requestAnimationFrame(tick);
      } catch (e) {
        setError(String(e));
        stop();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      running.current = false;
      cancelAnimationFrame(frame);
    };
  }, [paused, reduced, stage, stop]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && scan.current)
      draw(ctx, size, scan.current, scene, selection, preview, stage, displayRange, invert, trace);
  }, [size, scene, selection, preview, stage, displayRange, invert, trace, version]);
  const pick = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(e, e.currentTarget);
    const cell = pickCell(p.x, p.y, size, settings.views);
    if (cell) setSelection(cell);
    return cell;
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 5 || e.button !== 0 || pointer.current !== null) return;
    if (!pick(e)) return;
    stop();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) release();
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
      e.preventDefault();
    if (e.key.toLowerCase() === "r") reset();
    if (stage >= 2 && e.key.startsWith("Arrow")) {
      stop();
      setSelection((s) => ({
        column: Math.max(
          0,
          Math.min(127, s.column + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0)),
        ),
        row: Math.max(
          0,
          Math.min(
            settings.views - 1,
            s.row + (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0),
          ),
        ),
      }));
    }
    if (stage >= 5 && e.key.toLowerCase() === "n" && !e.repeat) step();
    if (stage >= 6 && e.key === " " && !e.repeat && !reduced) setPaused((p) => !p);
  };
  const current = scan.current;
  const stored = current.values[selection.column + 128 * selection.row];
  const items = [
    {
      label: "Góc / detector",
      value: ((angle * 180) / Math.PI).toFixed(1) + "° / " + selection.column,
    },
  ];
  if (stage >= 3)
    items.push({
      label: "Chiều dài từng đĩa",
      value: scene.map((d) => chordLength(beam, d).toFixed(6)).join(" / "),
    });
  if (measurement)
    items.push({
      label: "Preview p / T",
      value: measurement.projection.toFixed(7) + " / " + measurement.ratio.toFixed(7),
    });
  if (stage >= 5)
    items.push(
      { label: "Hàng đã đo", value: current.acquired + " / " + settings.views },
      {
        label: "Giá trị đã lưu",
        value: Number.isFinite(stored) ? stored.toFixed(7) : "Chưa đo — preview không ghi dữ liệu",
      },
      { label: "Bước góc", value: (360 / settings.views).toFixed(1) + "°; không lặp hàng 360°" },
    );
  if (stage >= 9) items.push({ label: "Oracle hình tròn", value: auditResult });
  return (
    <>
      <p id={help}>
        Lát cắt XY, dữ liệu tự tạo. Chọn góc bằng thanh trượt; mũi tên chọn góc/pixel khi focus
        Canvas. Từ Bài 05, click/kéo sinogram để đọc ô, N đo một hàng. Space quét/dừng, R đặt lại.
        Xanh là chưa đo; đường hồng chỉ là dự đoán vị trí điểm, không phải dữ liệu detector.
      </p>
      <div className="lab-controls">
        <label>
          Phantom{" "}
          <select
            aria-label="Phantom CT"
            disabled={stage < 4}
            value={settings.preset}
            onChange={(e) => replace({ ...settings, preset: Number(e.target.value) })}
          >
            <option value="0">Đĩa tròn ở tâm</option>
            <option value="1">Đĩa nhỏ lệch tâm</option>
            <option value="2">Nền và hai insert cộng mu</option>
          </select>
        </label>
        <label>
          Góc đang xem{" "}
          <input
            aria-label="Góc CT"
            disabled={stage < 2}
            type="range"
            min="0"
            max={settings.views - 1}
            step="1"
            value={selection.row}
            onChange={(e) => {
              stop();
              setSelection((s) => ({ ...s, row: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          Pixel detector{" "}
          <input
            aria-label="Pixel detector CT"
            disabled={stage < 2}
            type="range"
            min="0"
            max="127"
            step="1"
            value={selection.column}
            onChange={(e) => {
              stop();
              setSelection((s) => ({ ...s, column: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          Strength ({settings.strength.toFixed(1)}){" "}
          <input
            aria-label="Strength CT"
            disabled={stage < 4}
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.strength}
            onChange={(e) => replace({ ...settings, strength: Number(e.target.value) })}
          />
        </label>
        <label>
          Số góc{" "}
          <select
            aria-label="Số góc CT"
            disabled={stage < 8}
            value={settings.views}
            onChange={(e) => replace({ ...settings, views: Number(e.target.value) })}
          >
            {[30, 60, 120].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Display range{" "}
          <select
            aria-label="Display range CT"
            disabled={stage < 5}
            value={displayRange}
            onChange={(e) => setDisplayRange(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            aria-label="Đảo palette CT"
            disabled={stage < 5}
            type="checkbox"
            checked={invert}
            onChange={(e) => setInvert(e.target.checked)}
          />{" "}
          Đảo palette
        </label>
        <label>
          <input
            aria-label="Vệt điểm CT"
            disabled={stage < 7}
            type="checkbox"
            checked={trace}
            onChange={(e) => setTrace(e.target.checked)}
          />{" "}
          Vệt điểm (0.65; 0.3)
        </label>
        <button
          type="button"
          disabled={stage < 5 || current.acquired === settings.views}
          onClick={step}
        >
          Đo một hàng
        </button>
        <button
          type="button"
          disabled={stage < 6 || reduced || current.acquired === settings.views}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Quét tiếp" : "Dừng quét"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        <button
          type="button"
          disabled={stage < 9}
          onClick={() => {
            stop();
            try {
              setAuditResult("PASS — max error " + audit().toExponential(2));
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Kiểm phantom tròn
        </button>
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        style={{ touchAction: "none" }}
        tabIndex={0}
        aria-label="CT Sinogram Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) pick(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <LabReadout items={items} />
      {error && <p role="alert">{error}</p>}
      <p>
        Sinogram chứa p=-ln(I/I0), không phải ảnh lát cắt đã tái dựng. Mỗi frame đo tối đa 2 hàng ×
        128 tia; không benchmark, không WebGL hay dữ liệu y khoa. Reduced motion chỉ cho đo từng
        hàng. Đổi phantom, strength hoặc số góc xóa lượt quét; đổi góc xem/palette không sửa số đo.
      </p>
    </>
  );
}
export default function CtSinogramLab({ mode = "ct56-9" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode.match(/^ct56-([1-9])$/)?.[1] ?? 9)));
  return <Experiment key={stage} stage={stage} />;
}
