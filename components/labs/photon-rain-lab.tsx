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
  advance,
  audit,
  firstFlight,
  makeExperiment,
  sampleFirst,
  settingsForStage,
  tracePhoton,
  wilson,
  expectedBallistic,
  type Settings,
  type Trace,
} from "@/lib/labs/photon-rain";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { draw, timelineVertex } from "./photon-rain/draw";
import { ConvergencePlot } from "./photon-rain/convergence-plot";

const statusText = {
  alive: "Chưa phân loại tương tác",
  absorbed: "Hấp thụ",
  escaped: "Thoát",
  censored: "Chạm giới hạn — chưa biết kết cục",
};
const eventText = {
  emission: "Phát photon",
  candidate: "Ứng viên tương tác",
  absorption: "Hấp thụ",
  scatter: "Tán xạ",
  escape: "Thoát",
};
function preview(settings: Settings, id: number, stage: number): Trace {
  if (stage >= 4) return tracePhoton(settings, id, stage);
  const position = stage >= 2 ? sampleFirst(settings, id).photon.position : ([-1.5, 0] as const);
  const trace: Trace = {
    vertices: [{ position, event: "emission" }],
    status: "alive",
    collisions: 0,
    scatters: 0,
  };
  if (stage >= 3) {
    const flight = firstFlight(settings, id);
    trace.vertices.push({
      position: flight.endpoint,
      event: flight.escaped ? "escape" : "candidate",
    });
    if (flight.escaped) trace.status = "escaped";
  }
  return trace;
}
function ExperimentLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    reduced = useReducedMotion(),
    help = useId();
  const [settings, setSettings] = useState(() => settingsForStage(stage));
  const [id, setId] = useState(0),
    [shown, setShown] = useState(65),
    [paused, setPaused] = useState(true);
  const [version, setVersion] = useState(0),
    [auditResult, setAuditResult] = useState("Chưa kiểm"),
    [error, setError] = useState("");
  const experiment = useRef<ReturnType<typeof makeExperiment> | null>(null);
  if (!experiment.current) experiment.current = makeExperiment(settings);
  const pointer = useRef<number | null>(null),
    running = useRef(false);
  const trace = useMemo(() => preview(settings, id, stage), [settings, id, stage]);
  const visible = Math.min(shown, trace.vertices.length - 1);
  const release = useCallback(() => {
    const p = pointer.current;
    pointer.current = null;
    if (p !== null && canvas.current?.hasPointerCapture(p)) canvas.current.releasePointerCapture(p);
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
  }, [stop, release]);
  const replace = (next: Settings) => {
    stop();
    experiment.current = makeExperiment(next);
    setSettings(next);
    setId(0);
    setShown(65);
    setVersion((v) => v + 1);
  };
  const reset = () => {
    replace(settingsForStage(stage));
    setAuditResult("Chưa kiểm");
    setError("");
  };
  const step = (budget: number) => {
    stop();
    const current = experiment.current;
    if (current && advance(current, budget) > 0) {
      const last = current.counts.completed - 1;
      setId(last);
      setShown(65);
      setVersion((v) => v + 1);
    }
  };
  useEffect(() => {
    if (paused || reduced || stage < 8) return;
    let frame = 0;
    running.current = true;
    const tick = () => {
      if (!running.current || !experiment.current) return;
      try {
        const current = experiment.current;
        advance(current, 32);
        const last = Math.max(0, current.counts.completed - 1);
        setId(last);
        setShown(65);
        setVersion((v) => v + 1);
        if (current.counts.completed === current.settings.count) {
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
    if (ctx && experiment.current)
      draw(ctx, size, settings, experiment.current, trace, id, visible, stage);
  }, [size, settings, trace, id, visible, stage, version]);
  const select = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(e, e.currentTarget),
      vertex = timelineVertex(p.x, p.y, size, trace.vertices.length);
    if (vertex !== null) setShown(vertex);
    return vertex;
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 5 || e.button !== 0 || pointer.current !== null || select(e) === null) return;
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
    if (stage >= 2 && ["ArrowUp", "ArrowDown"].includes(e.key)) {
      stop();
      setId((i) => Math.max(0, Math.min(settings.count - 1, i + (e.key === "ArrowUp" ? 1 : -1))));
      setShown(65);
    }
    if (stage >= 5 && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      stop();
      setShown(
        Math.max(
          0,
          Math.min(trace.vertices.length - 1, visible + (e.key === "ArrowRight" ? 1 : -1)),
        ),
      );
    }
    if (stage >= 6 && e.key.toLowerCase() === "n" && !e.repeat) step(1);
    if (stage >= 8 && e.key === " " && !e.repeat && !reduced) setPaused((p) => !p);
  };
  const current = experiment.current,
    counts = current.counts;
  const readout = [
    {
      label: "Photon đang xem",
      value:
        id +
        (id < counts.completed ? " — đã tính vào thống kê" : " — preview, chưa tính vào thống kê"),
    },
  ];
  if (stage >= 2) {
    const sample = sampleFirst(settings, id);
    readout.push({
      label: "U / S đầu tiên",
      value:
        sample.u.toFixed(9) +
        " / " +
        (Number.isFinite(sample.distance) ? sample.distance.toFixed(6) : "∞ (chân không)"),
    });
  }
  if (stage >= 3) readout.push({ label: "Kết cục của preview", value: statusText[trace.status] });
  if (stage >= 5)
    readout.push(
      {
        label: "Đỉnh đang xem",
        value:
          visible +
          " / " +
          (trace.vertices.length - 1) +
          " — " +
          eventText[trace.vertices[visible].event],
      },
      { label: "Tương tác / tán xạ của photon", value: trace.collisions + " / " + trace.scatters },
    );
  if (stage >= 6)
    readout.push(
      { label: "Đã tính", value: counts.completed + " / " + settings.count },
      {
        label: "Hấp thụ / thoát / chưa biết",
        value: counts.absorbed + " / " + counts.escaped + " / " + counts.censored,
      },
      {
        label: "Photon từng tán xạ / số lần tán xạ",
        value: counts.scatteredPhotons + " / " + counts.scatterEvents,
      },
    );
  if (stage >= 7) {
    readout.push({
      label: "P không tương tác lý thuyết",
      value: expectedBallistic(settings).toFixed(7),
    });
    if (counts.completed > 0) {
      const interval = wilson(counts.ballistic, counts.completed);
      readout.push(
        {
          label: "Ước lượng / Wilson 95%",
          value:
            (counts.ballistic / counts.completed).toFixed(7) +
            " / [" +
            interval.map((x) => x.toFixed(7)).join("; ") +
            "]",
        },
        {
          label: "Khoảng kết cục thoát do giới hạn",
          value:
            "[" +
            (counts.escaped / counts.completed).toFixed(5) +
            "; " +
            ((counts.escaped + counts.censored) / counts.completed).toFixed(5) +
            "] — không phải CI",
        },
      );
    } else readout.push({ label: "Ước lượng / Wilson 95%", value: "Chưa có dữ liệu" });
  }
  if (stage >= 8) readout.push({ label: "Audit hấp thụ thuần", value: auditResult });
  return (
    <>
      <p id={help}>
        Chọn seed và photon ID để xem lại cùng một đường đi. Up/Down chọn photon; từ Bài 05,
        Left/Right hoặc kéo thanh dưới Canvas để xem từng đỉnh đã ghi. N thêm một photon vào thống
        kê từ Bài 06; Space chạy/dừng từ Bài 08. R đặt lại. Mở paused, không tự chạy benchmark.
      </p>
      <div className="lab-controls">
        <label>
          Preset{" "}
          <select
            aria-label="Preset photon"
            disabled={stage < 2}
            value=""
            onChange={(e) => {
              const p = Number(e.target.value);
              replace({
                ...settings,
                muA: p === 0 || p === 3 ? 0 : 0.4,
                muS: p === 2 ? 0.9 : p === 3 ? 2 : 0,
              });
            }}
          >
            <option value="" disabled>
              Chọn cấu hình
            </option>
            <option value="0">Chân không</option>
            <option value="1">Hấp thụ thuần</option>
            {stage >= 5 && (
              <>
                <option value="2">Hấp thụ và tán xạ</option>
                <option value="3">Chỉ tán xạ</option>
              </>
            )}
          </select>
        </label>
        <label>
          muA ({settings.muA.toFixed(1)}){" "}
          <input
            aria-label="muA photon"
            disabled={stage < 2}
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={settings.muA}
            onChange={(e) => replace({ ...settings, muA: Number(e.target.value) })}
          />
        </label>
        <label>
          muS ({settings.muS.toFixed(1)}){" "}
          <input
            aria-label="muS photon"
            disabled={stage < 5}
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={settings.muS}
            onChange={(e) => replace({ ...settings, muS: Number(e.target.value) })}
          />
        </label>
        <label>
          Seed{" "}
          <select
            aria-label="Seed photon"
            disabled={stage < 2}
            value={settings.seed}
            onChange={(e) => replace({ ...settings, seed: Number(e.target.value) })}
          >
            {[42, 2026, 1].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Photon ID{" "}
          <input
            aria-label="ID photon"
            disabled={stage < 2}
            type="range"
            min="0"
            max={settings.count - 1}
            step="1"
            value={id}
            onChange={(e) => {
              stop();
              setId(Number(e.target.value));
              setShown(65);
            }}
          />
        </label>
        <label>
          Giới hạn tương tác{" "}
          <select
            aria-label="Giới hạn tương tác photon"
            disabled={stage < 5}
            value={settings.eventLimit}
            onChange={(e) => replace({ ...settings, eventLimit: Number(e.target.value) })}
          >
            {[1, 8, 64].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Số photon{" "}
          <select
            aria-label="Số photon"
            disabled={stage < 6}
            value={settings.count}
            onChange={(e) => replace({ ...settings, count: Number(e.target.value) })}
          >
            {[512, 2048, 8192].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={stage < 6 || counts.completed === settings.count}
          onClick={() => step(1)}
        >
          Thêm 1 photon
        </button>
        <button
          type="button"
          disabled={stage < 6 || counts.completed === settings.count}
          onClick={() => step(32)}
        >
          Thêm 32 photon
        </button>
        <button
          type="button"
          disabled={stage < 8 || reduced || counts.completed === settings.count}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "Chạy tiếp" : "Dừng"}
        </button>
        <button
          type="button"
          disabled={stage < 5}
          onClick={() => {
            stop();
            setShown(0);
          }}
        >
          Về điểm phát
        </button>
        <button
          type="button"
          disabled={stage < 5 || visible === trace.vertices.length - 1}
          onClick={() => {
            stop();
            setShown(visible + 1);
          }}
        >
          Xem đỉnh kế
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        <button
          type="button"
          disabled={stage < 8}
          onClick={() => {
            stop();
            try {
              setAuditResult("PASS — error " + audit().toFixed(7));
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Kiểm hấp thụ thuần
        </button>
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        style={{ touchAction: "none" }}
        tabIndex={0}
        aria-label="Photon Rain Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) select(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <LabReadout items={readout} />
      {stage >= 7 && (
        <ConvergencePlot samples={current.convergence} expected={expectedBallistic(settings)} />
      )}
      {error && <p role="alert">{error}</p>}
      <p>
        Hồng: hấp thụ; xanh: thoát; tím: chạm giới hạn, chưa biết kết cục. Đường mờ là tối đa 24
        photon gần nhất, không phải toàn bộ mẫu. Tán xạ đều góc trong 2D không phải đẳng hướng trên
        mặt cầu 3D. Mỗi frame thêm tối đa 32 photon × 64 tương tác, cộng một preview hữu hạn. Đổi
        seed/hệ số/giới hạn/số photon xóa lượt cũ; xem photon hoặc đỉnh không sửa thống kê. Reduced
        motion chỉ cho thêm mẫu thủ công.
      </p>
    </>
  );
}
export default function PhotonRainLab({ mode = "photon57-8" }: { mode?: string }) {
  const stage = Number(mode.match(/^photon57-([1-8])$/)?.[1] ?? 8);
  return <ExperimentLab key={stage} stage={stage} />;
}
