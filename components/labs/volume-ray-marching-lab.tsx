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
  boxInterval,
  at,
  cameraRay,
  defaultCamera,
  defaultSettings,
  makeVolume,
  march,
  pixel,
  sampleDensity,
  type Camera,
  type Result,
} from "@/lib/labs/volume-ray-marching";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import { drawFog, encode } from "./volume-ray-marching/draw";
const empty: Result = { color: [0, 0, 0], transmittance: 1, samples: 0, profile: [] };
function FogExperiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [camera, setCamera] = useState<Camera>({ ...defaultCamera }),
    [settings, setSettings] = useState({ ...defaultSettings }),
    [preset, setPreset] = useState(0),
    [uv, setUv] = useState({ u: 0.5, v: 0.5 }),
    [shown, setShown] = useState(0),
    [paused, setPaused] = useState(true);
  const [preview, setPreview] = useState({ image: new Uint8ClampedArray(48 * 36 * 4), rows: 0 }),
    [error, setError] = useState("");
  const volume = useMemo(() => (stage >= 4 ? makeVolume(preset) : null), [preset, stage]);
  const ray = useMemo(() => cameraRay(camera, uv.u, uv.v, 4 / 3), [camera, uv]);
  const interval = stage >= 3 ? boxInterval(ray) : null;
  const trace = useMemo(
    () => (stage >= 6 && volume ? march(ray, volume, settings, stage) : empty),
    [stage, ray, volume, settings],
  );
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const release = useCallback(() => {
    const p = pointer.current;
    pointer.current = null;
    if (p && canvas.current?.hasPointerCapture(p.id)) canvas.current.releasePointerCapture(p.id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const restart = () => {
    stop();
    setShown(0);
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
    let frame = 0,
      row = 0,
      cancelled = false;
    const image = new Uint8ClampedArray(48 * 36 * 4);
    const batch = () => {
      try {
        const begin = performance.now();
        let count = 0;
        while (row < 36 && count < 2 && performance.now() - begin < 10) {
          for (let x = 0; x < 48; x++) {
            const color = encode(
                pixel(camera, volume, settings, (x + 0.5) / 48, (row + 0.5) / 36, stage),
              ),
              offset = 4 * (x + row * 48);
            image[offset] = color[0];
            image[offset + 1] = color[1];
            image[offset + 2] = color[2];
            image[offset + 3] = 255;
          }
          row++;
          count++;
        }
        if (!cancelled) setPreview({ image: new Uint8ClampedArray(image), rows: row });
        if (row < 36 && !cancelled) frame = requestAnimationFrame(batch);
      } catch (failure) {
        setError(String(failure));
      }
    };
    frame = requestAnimationFrame(batch);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [camera, volume, settings, stage]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx)
      drawFog(ctx, size, preview.image, preview.rows, uv.u, uv.v, trace, shown, stage, interval);
  }, [size, preview, uv, trace, shown, stage, interval]);
  useEffect(() => {
    if (paused || reduced || stage < 6) return;
    const timer = window.setInterval(
      () => setShown((n) => Math.min(trace.profile.length, n + 1)),
      100,
    );
    return () => clearInterval(timer);
  }, [paused, reduced, stage, trace]);
  useEffect(() => {
    if (paused || shown < trace.profile.length) return;
    const frame = requestAnimationFrame(stop);
    return () => cancelAnimationFrame(frame);
  }, [shown, trace, paused, stop]);
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || e.button !== 0 || pointer.current) return;
    e.currentTarget.focus();
    restart();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    setCamera((c) => ({
      ...c,
      yaw: c.yaw + (e.clientX - p.x) * 0.005,
      pitch: Math.max(-1.2, Math.min(1.2, c.pitch - (e.clientY - p.y) * 0.005)),
    }));
    pointer.current = { id: p.id, x: e.clientX, y: e.clientY };
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === e.pointerId) release();
  };
  const reset = () => {
    restart();
    setCamera({ ...defaultCamera });
    setSettings({ ...defaultSettings });
    setPreset(0);
    setUv({ u: 0.5, v: 0.5 });
    setError("");
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key))
      e.preventDefault();
    if (e.key.toLowerCase() === "r") reset();
    if (stage >= 2 && e.key.startsWith("Arrow")) {
      restart();
      setCamera((c) => ({
        ...c,
        yaw: c.yaw + (e.key === "ArrowRight" ? 0.1 : e.key === "ArrowLeft" ? -0.1 : 0),
        pitch: Math.max(
          -1.2,
          Math.min(1.2, c.pitch + (e.key === "ArrowUp" ? 0.1 : e.key === "ArrowDown" ? -0.1 : 0)),
        ),
      }));
    }
    if (e.key.toLowerCase() === "n" && stage >= 6 && !e.repeat) {
      stop();
      setShown((n) => Math.min(trace.profile.length, n + 1));
    }
    if (e.key === " " && !e.repeat && stage >= 6 && !reduced && shown < trace.profile.length)
      setPaused((v) => !v);
  };
  const sample = shown > 0 ? trace.profile[Math.min(shown, trace.profile.length) - 1] : null;
  const readout = [
    {
      label: "Origin / direction",
      value:
        ray.origin.map((x) => x.toFixed(4)).join("; ") +
        " / " +
        ray.direction.map((x) => x.toFixed(4)).join("; "),
    },
  ];
  if (stage >= 3)
    readout.push({
      label: "Entry / exit",
      value: interval ? interval.entry.toFixed(6) + " / " + interval.exit.toFixed(6) : "MISS",
    });
  if (stage >= 4)
    readout.push({
      label: "Texture tương đương",
      value: "64×48×40 / 480 KiB R32F — Canvas chỉ CPU",
    });
  if (stage >= 5)
    readout.push({
      label: "Sigma / step length",
      value: settings.sigma.toFixed(2) + " / " + settings.stepLength.toFixed(2),
    });
  if (stage === 5) {
    const density =
      interval && volume ? sampleDensity(volume, at(ray, (interval.entry + interval.exit) / 2)) : 0;
    const length = interval ? interval.exit - interval.entry : 0;
    readout.push({
      label: "Midpoint density / length / T",
      value: [density, length, Math.exp(-settings.sigma * density * length)]
        .map((x) => x.toFixed(7))
        .join(" / "),
    });
  }
  if (stage >= 6)
    readout.push(
      { label: "Mẫu đã xem / tổng", value: shown + " / " + trace.samples },
      {
        label: "T hiện tại / cuối",
        value: (sample?.transmittance ?? 1).toFixed(7) + " / " + trace.transmittance.toFixed(7),
      },
      {
        label: "Density / ds / alpha của mẫu",
        value: sample
          ? [sample.density, sample.ds, sample.alpha].map((x) => x.toFixed(7)).join(" / ")
          : "Chưa tiến mẫu",
      },
      {
        label: "C tuyến tính hiện tại",
        value: (sample?.color ?? [0, 0, 0]).map((x) => x.toFixed(7)).join("; "),
      },
    );
  return (
    <>
      <p id={help}>
        Kéo Canvas hoặc mũi tên để orbit. N tiến một mẫu, Space chạy/dừng profile, R reset. Preview
        CPU 48×36 dựng tối đa hai hàng mỗi frame; không chạy shader/GPU và không phải benchmark. Đồ
        thị bên phải đọc density và transmittance của tia chọn.
      </p>
      <div className="lab-controls">
        <label>
          Dataset{" "}
          <select
            aria-label="Dataset"
            value={preset}
            disabled={stage < 4}
            onChange={(e) => {
              restart();
              setPreset(Number(e.target.value));
            }}
          >
            <option value="0">Phantom</option>
            <option value="1">Ramp</option>
            <option value="2">Medium hằng 0.25</option>
          </select>
        </label>
        <label>
          <input
            aria-label="Camera trong volume"
            type="checkbox"
            checked={camera.inside}
            disabled={stage < 3}
            onChange={(e) => {
              restart();
              setCamera((c) => ({ ...c, inside: e.target.checked }));
            }}
          />{" "}
          Camera trong volume
        </label>
        <label>
          Sigma ({settings.sigma.toFixed(1)}){" "}
          <input
            aria-label="Sigma"
            type="range"
            min="0"
            max="8"
            step="0.1"
            value={settings.sigma}
            disabled={stage < 5}
            onChange={(e) => {
              restart();
              setSettings((s) => ({ ...s, sigma: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          Step length{" "}
          <select
            aria-label="Step length"
            value={settings.stepLength}
            disabled={stage < 6}
            onChange={(e) => {
              restart();
              setSettings((s) => ({ ...s, stepLength: Number(e.target.value) }));
            }}
          >
            {[0.02, 0.04, 0.08, 0.16].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            aria-label="Transfer màu warm"
            type="checkbox"
            checked={settings.warm}
            disabled={stage < 7}
            onChange={(e) => {
              restart();
              setSettings((s) => ({ ...s, warm: e.target.checked }));
            }}
          />{" "}
          Transfer warm
        </label>
        <label>
          <input
            aria-label="Early termination"
            type="checkbox"
            checked={settings.early}
            disabled={stage < 8}
            onChange={(e) => {
              restart();
              setSettings((s) => ({ ...s, early: e.target.checked }));
            }}
          />{" "}
          Early termination T≤0.001
        </label>
        <label>
          Ray u{" "}
          <input
            aria-label="Ray u"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={uv.u}
            disabled={stage < 2}
            onChange={(e) => {
              restart();
              setUv((p) => ({ ...p, u: Number(e.target.value) }));
            }}
          />
        </label>
        <label>
          Ray v{" "}
          <input
            aria-label="Ray v"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={uv.v}
            disabled={stage < 2}
            onChange={(e) => {
              restart();
              setUv((p) => ({ ...p, v: Number(e.target.value) }));
            }}
          />
        </label>
        <button
          type="button"
          disabled={stage < 6 || shown >= trace.samples}
          onClick={() => {
            stop();
            setShown((n) => Math.min(trace.samples, n + 1));
          }}
        >
          Tiến một mẫu
        </button>
        <button
          type="button"
          disabled={stage < 6 || reduced || shown >= trace.samples}
          onClick={() => setPaused((v) => !v)}
        >
          {paused ? "Chạy" : "Dừng"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Volume Ray Marching Lab"
        aria-describedby={help}
        style={{ touchAction: "none" }}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <LabReadout items={readout} />
      {error && <p role="alert">{error}</p>}
      {reduced && (
        <p>Reduced motion tắt tự chạy profile; bạn vẫn tiến từng mẫu hoặc orbit bằng tay.</p>
      )}
      <p>
        Màu là transfer function để quan sát scalar, không phải mô phỏng scattering/lighting chính
        xác. Opacity có ds; tăng số mẫu không được tự tăng độ đặc của medium hằng.
      </p>
    </>
  );
}
export default function VolumeRayMarchingLab({ mode = "fog54-9" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode.match(/^fog54-(\d)$/)?.[1] ?? 9)));
  return <FogExperiment key={stage} stage={stage} />;
}
