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
  type ReactNode,
} from "react";
import {
  defaultSettings,
  detectorRay,
  makeScene,
  measure,
  materialLength,
  objectBeam,
  brightness,
  audit,
  wrapAngle,
} from "@/lib/labs/xray-detector";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { drawDetector, pickPixel } from "./xray-detector/draw";
function Experiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [settings, setSettings] = useState({ ...defaultSettings }),
    [pixel, setPixel] = useState({ x: 40, y: 30 }),
    [paused, setPaused] = useState(true),
    [auditResult, setAuditResult] = useState("Chưa kiểm"),
    [error, setError] = useState("");
  const [shown, setShown] = useState(0);
  const previewReady = useRef(false);
  const [preview, setPreview] = useState({ image: new Uint8ClampedArray(40 * 30 * 4), rows: 0 });
  const scene = useMemo(() => makeScene(settings.preset, stage), [settings.preset, stage]);
  const beam = useMemo(() => detectorRay((pixel.x + 0.5) / 80, (pixel.y + 0.5) / 60), [pixel]);
  const result = useMemo(
    () => (stage >= 4 ? measure(beam, scene, settings, stage, true) : null),
    [beam, scene, settings, stage],
  );
  const pointer = useRef<number | null>(null);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  const restart = () => {
    stop();
    setShown(0);
  };
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
  useEffect(() => {
    let row = 0,
      frame = 0,
      cancelled = false;
    previewReady.current = false;
    const image = new Uint8ClampedArray(40 * 30 * 4);
    const batch = () => {
      try {
        const begin = performance.now();
        let count = 0;
        while (row < 30 && count < 3 && performance.now() - begin < 10) {
          for (let x = 0; x < 40; x++) {
            const gray = Math.round(brightness(x, row, 40, 30, scene, settings, stage) * 255),
              i = 4 * (x + row * 40);
            image[i] = gray;
            image[i + 1] = gray;
            image[i + 2] = gray;
            image[i + 3] = 255;
          }
          row++;
          count++;
        }
        if (row === 30) previewReady.current = true;
        if (!cancelled) setPreview({ image: new Uint8ClampedArray(image), rows: row });
        if (row < 30 && !cancelled) frame = requestAnimationFrame(batch);
      } catch (e) {
        setError(String(e));
      }
    };
    frame = requestAnimationFrame(batch);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [scene, settings, stage]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx)
      drawDetector(
        ctx,
        size,
        preview.image,
        preview.rows,
        beam,
        scene,
        settings,
        pixel,
        stage,
        result?.profile.slice(0, shown) ?? [],
      );
  }, [size, preview, beam, scene, settings, pixel, stage, result, shown]);
  useEffect(() => {
    if (paused || reduced || stage < 3) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      // Finish one bounded preview before asking for another angle.
      if (now - previous >= 250 && previewReady.current) {
        const dt = Math.min(0.5, (now - previous) / 1000);
        previous = now;
        previewReady.current = false;
        setShown(0);
        setSettings((s) => ({ ...s, angle: wrapAngle(s.angle + 0.25 * dt) }));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage]);
  const reset = () => {
    restart();
    setSettings({ ...defaultSettings });
    setPixel({ x: 40, y: 30 });
    setAuditResult("Chưa kiểm");
    setError("");
  };
  const pick = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(e, e.currentTarget),
      target = pickPixel(p.x, p.y, size);
    if (target) {
      setShown(0);
      setPixel(target);
    }
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || e.button !== 0 || pointer.current !== null) return;
    const p = canvasPoint(e, e.currentTarget);
    if (!pickPixel(p.x, p.y, size)) return;
    stop();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
    pick(e);
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) release();
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
      e.preventDefault();
    if (e.key.toLowerCase() === "r") reset();
    if (stage >= 2 && e.key.startsWith("Arrow")) {
      restart();
      setPixel((p) => ({
        x: Math.max(
          0,
          Math.min(79, p.x + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0)),
        ),
        y: Math.max(
          0,
          Math.min(59, p.y + (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0)),
        ),
      }));
    }
    if (stage >= 5 && e.key.toLowerCase() === "m" && !e.repeat && settings.numeric) {
      stop();
      setShown((n) => Math.min(result?.profile.length ?? 0, n + 1));
    }
    if (stage >= 3 && e.key === " " && !e.repeat && !reduced) setPaused((p) => !p);
  };
  const readout: { label: string; value: ReactNode }[] = [
    {
      label: "Pixel detector / target",
      value: pixel.x + ", " + pixel.y + " / 80×60 (preview 40×30)",
    },
  ];
  if (stage >= 2)
    readout.push({
      label: "Ray direction / chiều dài",
      value: beam.direction.map((x) => x.toFixed(5)).join("; ") + " / " + beam.maximum.toFixed(6),
    });
  if (stage >= 3)
    readout.push({
      label: "Chiều dài qua từng box",
      value: scene
        .map((m) => materialLength(objectBeam(beam, settings.angle), m).toFixed(6))
        .join("; "),
    });
  if (result) {
    readout.push(
      {
        label: "Tau low",
        value: result.depth.low.toFixed(7),
      },
      { label: "I / I0 = T", value: result.ratio.toFixed(8) },
      { label: "I raw / I0", value: result.intensity.toFixed(4) + " / " + settings.exposure },
    );
    if (stage >= 5) readout.push({ label: "Số mẫu midpoint", value: result.depth.samples });
    if (stage >= 6)
      readout.push({
        label: "p = -ln(T)",
        value: result.logProjection.toFixed(8) + (result.logClamped ? " (clamped)" : ""),
      });
    if (stage >= 7) readout.push({ label: "Tau high", value: result.depth.high.toFixed(7) });
  }
  if (stage >= 5 && settings.numeric) {
    const sample = result?.profile[Math.min(shown, result.profile.length) - 1];
    readout.push(
      { label: "Mẫu đang xem / tổng", value: shown + " / " + (result?.profile.length ?? 0) },
      {
        label: "t / ds / muLow / tauLow",
        value: sample
          ? [sample.t, sample.ds, sample.muLow, sample.low].map((x) => x.toFixed(7)).join(" / ")
          : "Chưa tiến mẫu",
      },
    );
  }
  if (stage >= 8) readout.push({ label: "Audit gần nhất", value: auditResult });
  return (
    <>
      <p id={help}>
        Click/kéo ảnh detector hoặc mũi tên để chọn pixel. M xem một mẫu midpoint. Sơ đồ XZ là hình
        chiếu của tia 3D, không phải lát cắt y=0. Space quay/dừng vật thể, R reset; reduced motion
        chỉ cho điều chỉnh thủ công. Ảnh CPU 40×30 được tính tối đa ba hàng mỗi frame; không WebGL,
        không thiết bị X-ray thật.
      </p>
      <div className="lab-controls">
        <label>
          Scene{" "}
          <select
            aria-label="Scene"
            disabled={stage < 4}
            value={settings.preset}
            onChange={(e) => {
              restart();
              setSettings((s) => ({ ...s, preset: Number(e.target.value) }));
            }}
          >
            <option value="0">Một slab</option>
            <option value="1">Các lớp tách rời</option>
            <option value="2">Overlap cộng mu</option>
          </select>
        </label>
        <label>
          Góc vật thể{" "}
          <input
            aria-label="Góc vật thể"
            disabled={stage < 3}
            type="range"
            min={-Math.PI}
            max={Math.PI}
            step="0.02"
            value={settings.angle}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, angle: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          Strength ({settings.strength.toFixed(1)}){" "}
          <input
            aria-label="Strength"
            disabled={stage < 4}
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={settings.strength}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, strength: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          <input
            aria-label="Midpoint sampling"
            disabled={stage < 5}
            type="checkbox"
            checked={settings.numeric}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, numeric: e.target.checked }));
            }}
          />{" "}
          Midpoint thay exact
        </label>
        <label>
          Step{" "}
          <select
            aria-label="Step"
            disabled={stage < 5}
            value={settings.stepLength}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, stepLength: Number(e.target.value) }));
            }}
          >
            {[0.05, 0.1, 0.2, 0.4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            aria-label="Ảnh log"
            disabled={stage < 6}
            type="checkbox"
            checked={settings.logView}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, logView: e.target.checked }));
            }}
          />{" "}
          Ảnh log (range 4)
        </label>
        <label>
          <input
            aria-label="Đảo palette"
            disabled={stage < 6}
            type="checkbox"
            checked={settings.invert}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, invert: e.target.checked }));
            }}
          />{" "}
          Đảo palette
        </label>
        <label>
          I0 ({settings.exposure}){" "}
          <input
            aria-label="I0"
            disabled={stage < 6}
            type="range"
            min="1000"
            max="50000"
            step="1000"
            value={settings.exposure}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, exposure: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          <input
            aria-label="Phổ hai năng lượng"
            disabled={stage < 7}
            type="checkbox"
            checked={settings.spectral}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, spectral: e.target.checked }));
            }}
          />{" "}
          Phổ hai năng lượng
        </label>
        <label>
          Low weight ({settings.lowWeight.toFixed(2)}){" "}
          <input
            aria-label="Low weight"
            disabled={stage < 7}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.lowWeight}
            onChange={(e) => {
              stop();
              setSettings((s) => ({ ...s, lowWeight: Number(e.target.value) }));
            }}
          />
        </label>
        <button type="button" disabled={stage < 3 || reduced} onClick={() => setPaused((p) => !p)}>
          {paused ? "Quay vật thể" : "Dừng"}
        </button>
        <button
          type="button"
          disabled={stage < 5 || !settings.numeric || shown >= (result?.profile.length ?? 0)}
          onClick={() => {
            stop();
            setShown((n) => Math.min(result?.profile.length ?? 0, n + 1));
          }}
        >
          Xem một mẫu
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        <button
          type="button"
          disabled={stage < 8}
          onClick={() => {
            stop();
            setAuditResult("PASS — max tau error " + audit().toFixed(7));
          }}
        >
          Kiểm slab và biên
        </button>
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="X-ray Detector Lab"
        aria-describedby={help}
        style={{ touchAction: "none" }}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) pick(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <LabReadout items={readout} />
      {error && <p role="alert">{error}</p>}
      <p>
        Intensity lý tưởng, không photon noise, scatter, đáp ứng detector hay hệ số vật liệu đã hiệu
        chuẩn. Đảo palette/ảnh log không đổi các phép đo thô. Overlap cộng mu; chương trình không
        suy luận vật liệu nào thay thế vật liệu nào.
      </p>
    </>
  );
}
export default function XrayDetectorLab({ mode = "xray55-8" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(8, Number(mode.match(/^xray55-(\d)$/)?.[1] ?? 8)));
  return <Experiment key={stage} stage={stage} />;
}
